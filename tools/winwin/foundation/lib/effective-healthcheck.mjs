// Pure Foundation Healthcheck binding semantics. No network, Docker, shell,
// environment, filesystem or writer access.
import { ContractError, demand, hash, object, shape } from './contracts.mjs';

export const HEALTHCHECK_BINDING_VERSION = '1';
export const HEALTHCHECK_PROVENANCE = Object.freeze(['IMAGE', 'RUNTIME', 'ENGINE_DEFAULT', 'DISABLED']);
export const HEALTHCHECK_BEHAVIOR_FIELDS = Object.freeze(['enabled', 'test', 'interval', 'timeout', 'start_period', 'start_interval', 'retries']);

const TIMING_FIELDS = Object.freeze(['interval', 'timeout', 'start_period', 'start_interval']);
const PROJECTION_KEYS = Object.freeze(['state', 'test_form', 'executable', 'argv_element_count', 'payload_sha256', 'payload_byte_length', 'interval', 'timeout', 'start_period', 'start_interval', 'retries', 'unknown_keys', 'projection_sha256']);
const sha = (value, code = 'HEALTHCHECK_SHA256') => demand(typeof value === 'string' && /^[0-9a-f]{64}$/.test(value), code);
const exact = (value, keys, code) => {
  demand(object(value), code);
  try { shape(value, keys); } catch { throw new ContractError(code); }
  return value;
};
export const canonicalHealthcheck = value => {
  if (Array.isArray(value)) return '[' + value.map(canonicalHealthcheck).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalHealthcheck(value[key])).join(',') + '}';
  return JSON.stringify(value);
};
const hashProjection = value => hash(Buffer.from(canonicalHealthcheck(value), 'utf8'));
const copy = value => structuredClone(value);
const absentTiming = () => ({ present: false, value_nanoseconds: null });
const absentRetries = () => ({ present: false, value: null });

export function createHealthcheckLayerProjection(input = {}) {
  demand(object(input) && Object.keys(input).every(key => PROJECTION_KEYS.includes(key) && key !== 'projection_sha256'), 'HEALTHCHECK_INPUT_FIELD');
  const field = (key, fallback) => input[key] === undefined ? fallback : input[key];
  const projection = {
    state: field('state', 'ABSENT'), test_form: field('test_form', null), executable: field('executable', false),
    argv_element_count: field('argv_element_count', null), payload_sha256: field('payload_sha256', null),
    payload_byte_length: field('payload_byte_length', 0),
    interval: copy(field('interval', absentTiming())), timeout: copy(field('timeout', absentTiming())),
    start_period: copy(field('start_period', absentTiming())), start_interval: copy(field('start_interval', absentTiming())),
    retries: copy(field('retries', absentRetries())), unknown_keys: copy(field('unknown_keys', [])),
  };
  projection.projection_sha256 = hashProjection(projection);
  return validateHealthcheckLayerProjection(projection, { runtime: true });
}

function validateTiming(value, code) {
  exact(value, ['present', 'value_nanoseconds'], code);
  demand(typeof value.present === 'boolean', code);
  demand(value.present
    ? Number.isSafeInteger(value.value_nanoseconds) && value.value_nanoseconds >= 0 && (value.value_nanoseconds === 0 || value.value_nanoseconds >= 1000000)
    : value.value_nanoseconds === null, code);
}

function validateRetries(value) {
  exact(value, ['present', 'value'], 'HEALTHCHECK_RETRIES');
  demand(typeof value.present === 'boolean' && (value.present ? Number.isSafeInteger(value.value) && value.value >= 0 : value.value === null), 'HEALTHCHECK_RETRIES');
}

export function validateHealthcheckLayerProjection(value, { runtime = false } = {}) {
  exact(value, PROJECTION_KEYS, runtime ? 'RUNTIME_HEALTHCHECK_PROJECTION' : 'IMAGE_HEALTHCHECK_PROJECTION');
  const states = runtime ? ['ABSENT', 'PARTIAL', 'DISABLED', 'EXECUTABLE'] : ['ABSENT', 'DISABLED', 'EXECUTABLE'];
  demand(states.includes(value.state) && [null, 'NONE', 'CMD', 'CMD-SHELL'].includes(value.test_form), 'HEALTHCHECK_STATE');
  demand(typeof value.executable === 'boolean' && Number.isSafeInteger(value.payload_byte_length) && value.payload_byte_length >= 0, 'HEALTHCHECK_PAYLOAD');
  demand(Array.isArray(value.unknown_keys) && value.unknown_keys.length === 0, 'HEALTHCHECK_UNKNOWN_FIELD');
  TIMING_FIELDS.forEach(key => validateTiming(value[key], `HEALTHCHECK_${key.toUpperCase()}`));
  validateRetries(value.retries);
  const anyScalar = TIMING_FIELDS.some(key => value[key].present) || value.retries.present;
  if (value.state === 'ABSENT') demand(value.test_form === null && value.executable === false && value.argv_element_count === null && value.payload_sha256 === null && value.payload_byte_length === 0 && !anyScalar, 'HEALTHCHECK_ABSENT');
  if (value.state === 'PARTIAL') demand(runtime && value.test_form === null && value.executable === false && value.argv_element_count === null && value.payload_sha256 === null && value.payload_byte_length === 0 && anyScalar, 'HEALTHCHECK_PARTIAL');
  if (value.state === 'DISABLED') demand(value.test_form === 'NONE' && value.executable === false && value.argv_element_count === null && value.payload_sha256 === null && value.payload_byte_length === 0, 'HEALTHCHECK_DISABLED');
  if (value.state === 'EXECUTABLE') {
    demand(['CMD', 'CMD-SHELL'].includes(value.test_form) && value.executable === true && Number.isSafeInteger(value.payload_byte_length) && value.payload_byte_length > 0, 'HEALTHCHECK_EXECUTABLE');
    sha(value.payload_sha256, 'HEALTHCHECK_PAYLOAD_HASH');
    demand(value.test_form === 'CMD' ? Number.isSafeInteger(value.argv_element_count) && value.argv_element_count >= 1 : value.argv_element_count === null, 'HEALTHCHECK_ARGV');
  }
  sha(value.projection_sha256, 'HEALTHCHECK_PROJECTION_HASH');
  const unsigned = copy(value); delete unsigned.projection_sha256;
  demand(hashProjection(unsigned) === value.projection_sha256, 'HEALTHCHECK_PROJECTION_INTEGRITY');
  return value;
}

export function validateHealthcheckBindingPolicy(policy) {
  exact(policy, ['binding_version', 'engine', 'provenance_values', 'canonical_serialization', 'candidate_comparison', 'missing_runtime_override', 'health_status_separation'], 'HEALTHCHECK_BINDING_POLICY');
  demand(policy.binding_version === HEALTHCHECK_BINDING_VERSION, 'HEALTHCHECK_BINDING_VERSION');
  const engine = exact(policy.engine, ['implementation', 'version', 'merge_semantics', 'minimum_nonzero_duration_ns', 'defaults', 'evidence_sha256'], 'HEALTHCHECK_ENGINE');
  demand(engine.implementation === 'MOBY_DOCKER_ENGINE' && engine.version === '29.6.2' && engine.merge_semantics === 'NONZERO_FIELD_MERGE_AT_CONTAINER_CREATE', 'HEALTHCHECK_ENGINE_VERSION');
  demand(engine.minimum_nonzero_duration_ns === 1000000, 'HEALTHCHECK_ENGINE_MINIMUM'); sha(engine.evidence_sha256, 'HEALTHCHECK_ENGINE_EVIDENCE');
  exact(engine.defaults, ['interval_ns', 'timeout_ns', 'start_period_ns', 'start_interval_ns', 'retries'], 'HEALTHCHECK_ENGINE_DEFAULTS');
  demand(engine.defaults.interval_ns === 30000000000 && engine.defaults.timeout_ns === 30000000000 && engine.defaults.start_period_ns === 0 && engine.defaults.start_interval_ns === 5000000000 && engine.defaults.retries === 3, 'HEALTHCHECK_ENGINE_DEFAULT_VALUES');
  demand(canonicalHealthcheck(policy.provenance_values) === canonicalHealthcheck(HEALTHCHECK_PROVENANCE), 'HEALTHCHECK_PROVENANCE_POLICY');
  demand(policy.canonical_serialization === 'UTF8_JSON_RECURSIVE_SORTED_OBJECT_KEYS_PRESERVE_ARRAY_ORDER' && policy.candidate_comparison === 'EXACT_BEHAVIOR_FIELDS_AND_SHA256', 'HEALTHCHECK_CANONICAL_POLICY');
  demand(policy.missing_runtime_override === 'FAIL_CLOSED' && policy.health_status_separation === 'CONFIGURATION_DISTINCT_FROM_RUNNING_HEALTHY_LIFECYCLE', 'HEALTHCHECK_BOUNDARY_POLICY');
  return policy;
}

function effectiveTiming(image, runtime, engineValue, key) {
  if (runtime[key].present && runtime[key].value_nanoseconds !== 0) return { value_nanoseconds: runtime[key].value_nanoseconds, provenance: 'RUNTIME' };
  if (image[key].present && image[key].value_nanoseconds !== 0) return { value_nanoseconds: image[key].value_nanoseconds, provenance: 'IMAGE' };
  return { value_nanoseconds: engineValue, provenance: 'ENGINE_DEFAULT' };
}

function effectiveRetries(image, runtime, engineValue) {
  if (runtime.retries.present && runtime.retries.value !== 0) return { value: runtime.retries.value, provenance: 'RUNTIME' };
  if (image.retries.present && image.retries.value !== 0) return { value: image.retries.value, provenance: 'IMAGE' };
  return { value: engineValue, provenance: 'ENGINE_DEFAULT' };
}

export function deriveEffectiveHealthcheck(imageProjection, runtimeOverride, policy) {
  validateHealthcheckLayerProjection(imageProjection); validateHealthcheckLayerProjection(runtimeOverride, { runtime: true }); validateHealthcheckBindingPolicy(policy);
  let source = null;
  if (runtimeOverride.state === 'DISABLED') source = 'DISABLED';
  else if (runtimeOverride.state === 'EXECUTABLE') source = 'RUNTIME';
  else if (imageProjection.state === 'EXECUTABLE') source = 'IMAGE';
  else source = 'DISABLED';
  let behavior, fieldProvenance;
  if (source === 'DISABLED') {
    behavior = { enabled: false, test: { form: null, argv_element_count: null, payload_sha256: null, payload_byte_length: 0 },
      interval: { value_nanoseconds: null }, timeout: { value_nanoseconds: null }, start_period: { value_nanoseconds: null },
      start_interval: { value_nanoseconds: null }, retries: { value: null } };
    fieldProvenance = { enabled: 'DISABLED', test: 'DISABLED', interval: 'DISABLED', timeout: 'DISABLED', start_period: 'DISABLED', start_interval: 'DISABLED', retries: 'DISABLED' };
  } else {
    const selected = source === 'RUNTIME' ? runtimeOverride : imageProjection;
    const interval = effectiveTiming(imageProjection, runtimeOverride, policy.engine.defaults.interval_ns, 'interval');
    const timeout = effectiveTiming(imageProjection, runtimeOverride, policy.engine.defaults.timeout_ns, 'timeout');
    const startPeriod = effectiveTiming(imageProjection, runtimeOverride, policy.engine.defaults.start_period_ns, 'start_period');
    const startInterval = effectiveTiming(imageProjection, runtimeOverride, policy.engine.defaults.start_interval_ns, 'start_interval');
    const retries = effectiveRetries(imageProjection, runtimeOverride, policy.engine.defaults.retries);
    behavior = { enabled: true, test: { form: selected.test_form, argv_element_count: selected.argv_element_count, payload_sha256: selected.payload_sha256, payload_byte_length: selected.payload_byte_length },
      interval: { value_nanoseconds: interval.value_nanoseconds }, timeout: { value_nanoseconds: timeout.value_nanoseconds },
      start_period: { value_nanoseconds: startPeriod.value_nanoseconds }, start_interval: { value_nanoseconds: startInterval.value_nanoseconds }, retries: { value: retries.value } };
    fieldProvenance = { enabled: source, test: source, interval: interval.provenance, timeout: timeout.provenance, start_period: startPeriod.provenance, start_interval: startInterval.provenance, retries: retries.provenance };
  }
  const effective = { binding_version: HEALTHCHECK_BINDING_VERSION, engine: { implementation: policy.engine.implementation, version: policy.engine.version }, behavior, field_provenance: fieldProvenance };
  effective.behavior_projection_sha256 = hashProjection(behavior);
  effective.projection_sha256 = hashProjection(effective);
  return effective;
}

function validateBehavior(value) {
  exact(value, HEALTHCHECK_BEHAVIOR_FIELDS, 'EFFECTIVE_HEALTHCHECK_BEHAVIOR');
  demand(typeof value.enabled === 'boolean', 'EFFECTIVE_HEALTHCHECK_ENABLED');
  exact(value.test, ['form', 'argv_element_count', 'payload_sha256', 'payload_byte_length'], 'EFFECTIVE_HEALTHCHECK_TEST');
  if (value.enabled) {
    demand(['CMD', 'CMD-SHELL'].includes(value.test.form) && Number.isSafeInteger(value.test.payload_byte_length) && value.test.payload_byte_length > 0, 'EFFECTIVE_HEALTHCHECK_TEST'); sha(value.test.payload_sha256);
    demand(value.test.form === 'CMD' ? Number.isSafeInteger(value.test.argv_element_count) && value.test.argv_element_count >= 1 : value.test.argv_element_count === null, 'EFFECTIVE_HEALTHCHECK_TEST');
  } else demand(value.test.form === null && value.test.argv_element_count === null && value.test.payload_sha256 === null && value.test.payload_byte_length === 0, 'EFFECTIVE_HEALTHCHECK_DISABLED');
  for (const key of TIMING_FIELDS) { exact(value[key], ['value_nanoseconds'], 'EFFECTIVE_HEALTHCHECK_TIMING'); demand(value.enabled ? Number.isSafeInteger(value[key].value_nanoseconds) && (value[key].value_nanoseconds >= 1000000 || key === 'start_period' && value[key].value_nanoseconds === 0) : value[key].value_nanoseconds === null, 'EFFECTIVE_HEALTHCHECK_TIMING'); }
  exact(value.retries, ['value'], 'EFFECTIVE_HEALTHCHECK_RETRIES'); demand(value.enabled ? Number.isSafeInteger(value.retries.value) && value.retries.value > 0 : value.retries.value === null, 'EFFECTIVE_HEALTHCHECK_RETRIES');
}

export function validateEffectiveHealthcheck(value) {
  exact(value, ['binding_version', 'engine', 'behavior', 'field_provenance', 'behavior_projection_sha256', 'projection_sha256'], 'EFFECTIVE_HEALTHCHECK');
  exact(value.engine, ['implementation', 'version'], 'EFFECTIVE_HEALTHCHECK_ENGINE');
  demand(value.engine.implementation === 'MOBY_DOCKER_ENGINE' && value.engine.version === '29.6.2', 'EFFECTIVE_HEALTHCHECK_ENGINE');
  demand(value.binding_version === HEALTHCHECK_BINDING_VERSION, 'EFFECTIVE_HEALTHCHECK_VERSION'); validateBehavior(value.behavior);
  exact(value.field_provenance, HEALTHCHECK_BEHAVIOR_FIELDS, 'EFFECTIVE_HEALTHCHECK_PROVENANCE');
  for (const key of HEALTHCHECK_BEHAVIOR_FIELDS) demand(HEALTHCHECK_PROVENANCE.includes(value.field_provenance[key]), 'EFFECTIVE_HEALTHCHECK_PROVENANCE');
  if (value.behavior.enabled) {
    demand(['IMAGE', 'RUNTIME'].includes(value.field_provenance.test) && value.field_provenance.enabled === value.field_provenance.test, 'EFFECTIVE_HEALTHCHECK_PROVENANCE');
    demand(TIMING_FIELDS.concat('retries').every(key => value.field_provenance[key] !== 'DISABLED'), 'EFFECTIVE_HEALTHCHECK_PROVENANCE');
  } else demand(HEALTHCHECK_BEHAVIOR_FIELDS.every(key => value.field_provenance[key] === 'DISABLED'), 'EFFECTIVE_HEALTHCHECK_PROVENANCE');
  sha(value.behavior_projection_sha256); sha(value.projection_sha256);
  demand(value.behavior_projection_sha256 === hashProjection(value.behavior), 'EFFECTIVE_HEALTHCHECK_BEHAVIOR_INTEGRITY');
  const unsigned = copy(value); delete unsigned.projection_sha256;
  demand(value.projection_sha256 === hashProjection(unsigned), 'EFFECTIVE_HEALTHCHECK_INTEGRITY');
  return value;
}

export function candidateHealthcheckEvidence(effective) {
  validateEffectiveHealthcheck(effective);
  return { engine: copy(effective.engine), behavior: copy(effective.behavior), behavior_projection_sha256: effective.behavior_projection_sha256 };
}

// Future collector boundary: merged Config.Healthcheck is projected separately
// from expectation inputs; Engine identity must be independently observed.
export function projectCandidateHealthcheckConfiguration(mergedConfigProjection, observedEngine, policy) {
  validateHealthcheckBindingPolicy(policy);
  const expectedEngine = { implementation: policy.engine.implementation, version: policy.engine.version };
  demand(canonicalHealthcheck(observedEngine) === canonicalHealthcheck(expectedEngine), 'CANDIDATE_HEALTHCHECK_ENGINE_MISMATCH');
  const normalized = deriveEffectiveHealthcheck(mergedConfigProjection, createHealthcheckLayerProjection(), policy);
  return candidateHealthcheckEvidence(normalized);
}

export function compareCandidateHealthcheck(expected, candidate) {
  validateEffectiveHealthcheck(expected);
  exact(candidate, ['engine', 'behavior', 'behavior_projection_sha256'], 'CANDIDATE_HEALTHCHECK'); validateBehavior(candidate.behavior); sha(candidate.behavior_projection_sha256);
  demand(canonicalHealthcheck(candidate.engine) === canonicalHealthcheck(expected.engine), 'CANDIDATE_HEALTHCHECK_ENGINE_MISMATCH');
  demand(hashProjection(candidate.behavior) === candidate.behavior_projection_sha256, 'CANDIDATE_HEALTHCHECK_INTEGRITY');
  demand(candidate.behavior_projection_sha256 === expected.behavior_projection_sha256 && canonicalHealthcheck(candidate.behavior) === canonicalHealthcheck(expected.behavior), 'CANDIDATE_HEALTHCHECK_MISMATCH');
  return { result: 'PASS', reason: 'EXACT_EFFECTIVE_HEALTHCHECK_BEHAVIOR' };
}
