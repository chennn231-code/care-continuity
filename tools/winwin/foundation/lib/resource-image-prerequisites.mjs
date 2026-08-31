// Foundation Resource Expectation and immutable image prerequisite tooling.
// Pure comparison plus fixed-scope repository/session readers. No Docker, shell,
// network, environment, image acquisition, Supabase, SQL or writer.
import fs from 'node:fs';

import { CURRENT_BASELINE, readCurrentFoundationBaseline, validateCurrentBaselineBinding, assertStartModelUnchanged, verifyCurrentProfile } from './current-baseline.mjs';
import { LOST_SESSION } from './durable-evidence.mjs';
import { ContractError, demand, exactSet, hash, object, ownership, parseJSON, projectId, safeText, shape } from './contracts.mjs';
import {
  HEALTHCHECK_BEHAVIOR_FIELDS, HEALTHCHECK_BINDING_VERSION, compareCandidateHealthcheck,
  deriveEffectiveHealthcheck, validateEffectiveHealthcheck, validateHealthcheckBindingPolicy, validateHealthcheckLayerProjection,
} from './effective-healthcheck.mjs';

export const PREREQUISITE_SCHEMA_VERSION = '1';
export const RESOURCE_EXPECTATION_SCHEMA_VERSION = '2';
export const PREREQUISITE_PURPOSE = 'IA-3A_SCHEMA_RUNTIME_VALIDATION';
export const RESOURCE_CONTRACT_TYPE = 'FOUNDATION_RESOURCE_EXPECTATION_MODEL';
export const PROFILE_TYPE = 'FOUNDATION_EFFECTIVE_START_PROFILE';
export const EXPECTATION_INSTANCE_TYPE = 'FOUNDATION_RESOURCE_EXPECTATION_INSTANCE';
export const IMAGE_APPROVAL_SET_TYPE = 'FOUNDATION_IMAGE_APPROVAL_SET';
export const IMAGE_PREPARATION_CONTRACT_TYPE = 'FOUNDATION_IMAGE_PREPARATION_CONTRACT';

const RESOURCE_URL = new URL('../contracts/resource-expectation-contract.json', import.meta.url);
const PREPARATION_URL = new URL('../contracts/image-preparation-contract.json', import.meta.url);
const DESIGN_URL = new URL('../../../../docs/winwin/WINWIN_FOUNDATION_SECURITY_CONCURRENCY_FEASIBILITY_SPIKE_DESIGN.md', import.meta.url);
const RESEARCH_URL = new URL('../../../../docs/winwin/WINWIN_FOUNDATION_RESOURCE_ACCEPTANCE_EVIDENCE_RESEARCH_V2.md', import.meta.url);
const ENGINE_EVIDENCE_URL = new URL('../../../../docs/winwin/WINWIN_FOUNDATION_HELPER_IMPLEMENTATION_PRESTART_EVIDENCE_REPORT.md', import.meta.url);
const MODULE_URL = new URL(import.meta.url);
const LABELS = ['com.supabase.cli.project', 'com.docker.compose.project'];
const CLASSES = ['CONTAINER', 'VOLUME', 'NETWORK', 'TRANSIENT_JOB'];
const STATES = ['REACHABLE', 'UNREACHABLE', 'UNRESOLVED'];
const LIFECYCLES = ['PERSISTENT', 'TRANSIENT'];
const sha256 = value => hash(Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8'));
const canonical = value => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
};
const copy = value => JSON.parse(JSON.stringify(value));
const exact = (value, keys, code) => {
  demand(object(value), code);
  try { shape(value, keys); } catch { throw new ContractError(code); }
  return value;
};
const digest = (value, code = 'DIGEST') => demand(typeof value === 'string' && /^sha256:[0-9a-f]{64}$/.test(value), code);
const sha = (value, code = 'SHA256') => demand(typeof value === 'string' && /^[0-9a-f]{64}$/.test(value), code);
const roleId = value => demand(typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(value), 'ROLE_ID');
const utc = value => demand(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value), 'UTC');
const sourceReference = value => demand(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]{0,200}:[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value), 'IMAGE_REFERENCE');

function loadJSON(url) {
  const bytes = fs.readFileSync(url);
  return { value: parseJSON(bytes), bytes, sha256: hash(bytes) };
}

function validateCardinality(value) {
  exact(value, ['minimum', 'maximum'], 'CARDINALITY');
  demand(Number.isSafeInteger(value.minimum) && value.minimum >= 0, 'CARDINALITY_MIN');
  demand(Number.isSafeInteger(value.maximum) && value.maximum >= value.minimum, 'CARDINALITY_MAX');
  return value;
}

function validatePort(value) {
  exact(value, ['config_key', 'container_port', 'protocol', 'host_ip_policy'], 'PORT_CONTRACT');
  demand(typeof value.config_key === 'string' && /^[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*$/.test(value.config_key), 'PORT_CONFIG_KEY');
  demand(Number.isSafeInteger(value.container_port) && value.container_port > 0 && value.container_port <= 65535, 'PORT_CONTAINER');
  demand(value.protocol === 'tcp' && value.host_ip_policy === 'LOOPBACK_ONLY', 'PORT_POLICY');
}

function validateRelationship(value) {
  exact(value, ['network_roles', 'volume_roles', 'explicit_mount_destinations'], 'RELATIONSHIP');
  for (const key of ['network_roles', 'volume_roles']) {
    demand(Array.isArray(value[key]) && value[key].every(item => { roleId(item); return true; }), 'RELATIONSHIP_ROLES');
    demand(new Set(value[key]).size === value[key].length, 'RELATIONSHIP_DUPLICATE');
  }
  demand(Array.isArray(value.explicit_mount_destinations), 'RELATIONSHIP_MOUNTS');
  for (const destination of value.explicit_mount_destinations) demand(typeof destination === 'string' && destination.startsWith('/') && !destination.includes('..'), 'RELATIONSHIP_MOUNT');
}

function validateReachability(value) {
  demand(object(value) && ['ALWAYS_FRESH', 'CONFIG_BOOLEAN_TRUE', 'SOURCE_DEFAULT_BOOLEAN', 'DEPENDENT_CONFIG_BOOLEAN', 'DEPENDENT_ROLE', 'UNRESOLVED_EFFECTIVE_INPUT', 'DEPENDENT_PLATFORM_JOB'].includes(value.kind), 'REACHABILITY_KIND');
  if (value.kind === 'ALWAYS_FRESH') exact(value, ['kind', 'evidence'], 'REACHABILITY_ALWAYS');
  if (value.kind === 'CONFIG_BOOLEAN_TRUE') exact(value, ['kind', 'config_key', 'evidence'], 'REACHABILITY_CONFIG');
  if (value.kind === 'SOURCE_DEFAULT_BOOLEAN') exact(value, ['kind', 'config_key', 'default_value', 'source_path', 'source_function', 'evidence'], 'REACHABILITY_SOURCE_DEFAULT');
  if (value.kind === 'DEPENDENT_CONFIG_BOOLEAN') exact(value, ['kind', 'parent_role', 'config_key', 'default_value', 'source_path', 'source_function', 'evidence'], 'REACHABILITY_DEPENDENT_CONFIG');
  if (value.kind === 'DEPENDENT_ROLE') exact(value, ['kind', 'parent_role', 'source_path', 'source_function', 'evidence'], 'REACHABILITY_DEPENDENT_ROLE');
  if (value.kind === 'UNRESOLVED_EFFECTIVE_INPUT') exact(value, ['kind', 'missing_inputs', 'evidence'], 'REACHABILITY_UNRESOLVED');
  if (value.kind === 'DEPENDENT_PLATFORM_JOB') exact(value, ['kind', 'parent_role', 'fresh_pg_minimum_major', 'db_major_config_key', 'db_major_default', 'source_path', 'source_function', 'evidence'], 'REACHABILITY_JOB');
  safeText(value.evidence);
  if (value.config_key !== undefined) demand(typeof value.config_key === 'string' && /^[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*$/.test(value.config_key), 'REACHABILITY_KEY');
  if (value.db_major_config_key !== undefined) demand(value.db_major_config_key === 'db.major_version', 'REACHABILITY_DB_MAJOR_KEY');
  if (value.default_value !== undefined) demand(typeof value.default_value === 'boolean', 'REACHABILITY_DEFAULT');
  if (value.missing_inputs !== undefined) demand(Array.isArray(value.missing_inputs) && value.missing_inputs.length > 0 && value.missing_inputs.every(x => typeof x === 'string' && x.length > 0), 'REACHABILITY_INPUTS');
  if (value.parent_role !== undefined) roleId(value.parent_role);
  if (value.fresh_pg_minimum_major !== undefined) demand(Number.isSafeInteger(value.fresh_pg_minimum_major) && value.fresh_pg_minimum_major >= 1, 'PG_MAJOR');
  if (value.db_major_default !== undefined) demand(Number.isSafeInteger(value.db_major_default) && value.db_major_default >= 1, 'PG_MAJOR_DEFAULT');
  for (const key of ['source_path', 'source_function']) if (value[key] !== undefined) { demand(typeof value[key] === 'string' && value[key].length > 0, 'REACHABILITY_SOURCE'); safeText(value[key]); }
}

function validateStartInputBinding(value, installedBinarySha256) {
  exact(value, ['command', 'excluded_services', 'preview', 'environment_service_overrides', 'config_default_source', 'service_gate_source', 'orchestration_source', 'embedded_source_binary_sha256'], 'START_INPUT_BINDING');
  demand(value.command === 'supabase start --workdir <FROZEN_PROJECT_ROOT>' && Array.isArray(value.excluded_services) && value.excluded_services.length === 0 && value.preview === false, 'START_COMMAND_BINDING');
  demand(value.environment_service_overrides === 'FORBIDDEN', 'START_ENVIRONMENT_POLICY');
  for (const key of ['config_default_source', 'service_gate_source', 'orchestration_source']) { demand(typeof value[key] === 'string' && value[key].length > 0, 'START_SOURCE_BINDING'); safeText(value[key]); }
  demand(value.embedded_source_binary_sha256 === installedBinarySha256, 'START_BINARY_BINDING');
}

export function validateResourceExpectationContract(contract) {
  exact(contract, ['schema_version', 'contract_type', 'purpose', 'foundation_baseline_binding', 'start_input_binding', 'source_binding', 'identity_policy', 'candidate_policy', 'port_policy', 'healthcheck_binding_policy', 'runtime_healthcheck_overrides', 'roles', 'volumes', 'networks', 'transient_jobs'], 'RESOURCE_CONTRACT');
  demand(contract.schema_version === RESOURCE_EXPECTATION_SCHEMA_VERSION && contract.contract_type === RESOURCE_CONTRACT_TYPE && contract.purpose === PREREQUISITE_PURPOSE, 'RESOURCE_CONTRACT_TYPE');
  const source = exact(contract.source_binding, ['supabase_cli_version', 'source_commit', 'installed_binary_sha256', 'normative_design_sha256', 'source_research_sha256'], 'RESOURCE_SOURCE');
  demand(source.supabase_cli_version === '2.115.0' && /^[0-9a-f]{40}$/.test(source.source_commit), 'RESOURCE_SOURCE_VERSION');
  for (const key of ['installed_binary_sha256', 'normative_design_sha256', 'source_research_sha256']) sha(source[key], 'RESOURCE_SOURCE_HASH');
  validateStartInputBinding(contract.start_input_binding, source.installed_binary_sha256);
  const identity = exact(contract.identity_policy, ['project_id_format', 'production_project_id', 'required_labels', 'comparison', 'names_are_authority'], 'RESOURCE_IDENTITY');
  demand(identity.project_id_format === 'FROZEN_35_BYTE_ASCII' && identity.comparison === 'BYTE_EXACT' && identity.names_are_authority === false, 'RESOURCE_IDENTITY_VALUE');
  projectId(identity.production_project_id);
  validateCurrentBaselineBinding(contract.foundation_baseline_binding, identity.production_project_id);
  demand(JSON.stringify(identity.required_labels) === JSON.stringify(LABELS), 'RESOURCE_LABELS');
  const candidate = exact(contract.candidate_policy, ['complete_disposition_required', 'unexpected_candidate', 'ambiguous_role', 'unclassified_candidate', 'foreign_or_mixed_ownership', 'unrelated_preexisting'], 'CANDIDATE_POLICY');
  demand(candidate.complete_disposition_required === true && candidate.unrelated_preexisting === 'OUTSIDE_UNLESS_COLLISION_OR_CANDIDATE_SCOPE', 'CANDIDATE_POLICY_VALUE');
  demand([candidate.unexpected_candidate, candidate.ambiguous_role, candidate.unclassified_candidate, candidate.foreign_or_mixed_ownership].every(value => value === 'FAIL'), 'CANDIDATE_FAIL_CLOSED');
  const ports = exact(contract.port_policy, ['allowed_host_ports', 'host_ip_policy', 'protocol', 'unexpected_binding'], 'PORT_POLICY');
  demand(JSON.stringify(ports.allowed_host_ports) === JSON.stringify([59320,59321,59322,59323,59324,59325,59326,59327,59328,59329]) && ports.host_ip_policy === 'LOOPBACK_ONLY' && ports.protocol === 'tcp' && ports.unexpected_binding === 'FAIL', 'PORT_POLICY_VALUE');
  validateHealthcheckBindingPolicy(contract.healthcheck_binding_policy);
  demand(Array.isArray(contract.runtime_healthcheck_overrides), 'RUNTIME_HEALTHCHECK_BINDINGS');
  const overrideRoles = [];
  for (const binding of contract.runtime_healthcheck_overrides) {
    exact(binding, ['role_id', 'source_binding', 'projection'], 'RUNTIME_HEALTHCHECK_BINDING'); roleId(binding.role_id); overrideRoles.push(binding.role_id);
    const bindingSource = exact(binding.source_binding, ['authority', 'source_commit', 'source_paths'], 'RUNTIME_HEALTHCHECK_SOURCE');
    demand(['FROZEN_SUPABASE_EFFECTIVE_START_DEFINITION', 'SYNTHETIC_TEST'].includes(bindingSource.authority) && /^[0-9a-f]{40}$/.test(bindingSource.source_commit), 'RUNTIME_HEALTHCHECK_SOURCE');
    demand(Array.isArray(bindingSource.source_paths) && bindingSource.source_paths.length > 0 && bindingSource.source_paths.every(path => typeof path === 'string' && path.length > 0), 'RUNTIME_HEALTHCHECK_SOURCE');
    bindingSource.source_paths.forEach(safeText); validateHealthcheckLayerProjection(binding.projection, { runtime: true });
  }
  demand(new Set(overrideRoles).size === overrideRoles.length, 'RUNTIME_HEALTHCHECK_DUPLICATE_ROLE');
  for (const collection of ['roles', 'volumes', 'networks', 'transient_jobs']) demand(Array.isArray(contract[collection]), 'RESOURCE_COLLECTION');
  const all = [...contract.roles, ...contract.volumes, ...contract.networks, ...contract.transient_jobs];
  const ids = [];
  for (const row of all) {
    exact(row, ['role_id', 'resource_class', 'lifecycle', 'cardinality_when_reachable', 'discovery_hint', 'reachability', 'image_role', 'image_reference', 'relationships', 'ports', 'health_policy'], 'RESOURCE_ROLE');
    roleId(row.role_id); ids.push(row.role_id);
    demand(CLASSES.includes(row.resource_class) && LIFECYCLES.includes(row.lifecycle), 'RESOURCE_ROLE_CLASS');
    validateCardinality(row.cardinality_when_reachable);
    demand(typeof row.discovery_hint === 'string' && row.discovery_hint.length > 0, 'DISCOVERY_HINT'); safeText(row.discovery_hint);
    validateReachability(row.reachability);
    if (row.image_role !== null) roleId(row.image_role);
    if (row.image_reference !== null) sourceReference(row.image_reference);
    validateRelationship(row.relationships);
    demand(Array.isArray(row.ports)); row.ports.forEach(validatePort);
    demand(['RUNNING_HEALTHY', 'TRANSIENT_EXIT_ZERO_REMOVED', 'PRESENT', 'NOT_APPLICABLE'].includes(row.health_policy), 'HEALTH_POLICY');
    demand(row.resource_class === 'CONTAINER' || row.resource_class === 'TRANSIENT_JOB' ? row.image_role !== null && row.image_reference !== null : row.image_role === null && row.image_reference === null, 'RESOURCE_IMAGE_APPLICABILITY');
  }
  demand(new Set(ids).size === ids.length, 'DUPLICATE_ROLE');
  demand(overrideRoles.every(id => all.some(row => row.role_id === id && ['CONTAINER', 'TRANSIENT_JOB'].includes(row.resource_class))), 'RUNTIME_HEALTHCHECK_ROLE');
  return contract;
}

function verifyProductionSource(contract) {
  const design = fs.readFileSync(DESIGN_URL), research = fs.readFileSync(RESEARCH_URL), engineEvidence = fs.readFileSync(ENGINE_EVIDENCE_URL);
  demand(hash(design) === contract.source_binding.normative_design_sha256, 'NORMATIVE_DESIGN_DRIFT');
  demand(hash(research) === contract.source_binding.source_research_sha256, 'SOURCE_RESEARCH_DRIFT');
  demand(hash(engineEvidence) === contract.healthcheck_binding_policy.engine.evidence_sha256, 'HEALTHCHECK_ENGINE_EVIDENCE_DRIFT');
  return { normative_design_sha256: hash(design), source_research_sha256: hash(research) };
}

function roleDecision(row, config, decisions) {
  const rule = row.reachability;
  if (rule.kind === 'ALWAYS_FRESH') return { role_id: row.role_id, state: 'REACHABLE', reason: 'FROZEN_FRESH_START_SOURCE_RULE', evidence: rule.evidence };
  if (rule.kind === 'CONFIG_BOOLEAN_TRUE') {
    demand(Object.hasOwn(config, rule.config_key) && typeof config[rule.config_key] === 'boolean', 'PROFILE_CONFIG_KEY');
    return { role_id: row.role_id, state: config[rule.config_key] ? 'REACHABLE' : 'UNREACHABLE', reason: config[rule.config_key] ? 'FROZEN_CONFIG_TRUE' : 'FROZEN_CONFIG_FALSE', evidence: `${rule.config_key}=${config[rule.config_key]}` };
  }
  if (rule.kind === 'SOURCE_DEFAULT_BOOLEAN') {
    const explicit = Object.hasOwn(config, rule.config_key), effective = explicit ? config[rule.config_key] : rule.default_value;
    demand(typeof effective === 'boolean', 'PROFILE_CONFIG_DEFAULT');
    return { role_id: row.role_id, state: effective ? 'REACHABLE' : 'UNREACHABLE', reason: explicit ? 'FROZEN_CONFIG_BOOLEAN' : 'PINNED_SOURCE_DEFAULT_BOOLEAN', evidence: `${rule.config_key}=${effective};${rule.source_path}::${rule.source_function}` };
  }
  if (rule.kind === 'UNRESOLVED_EFFECTIVE_INPUT') return { role_id: row.role_id, state: 'UNRESOLVED', reason: 'EFFECTIVE_INPUT_NOT_IN_APPROVED_BOUNDED_CONFIG', evidence: rule.missing_inputs.join(',') };
  const parent = decisions.get(rule.parent_role);
  if (!parent) return null;
  if (parent.state === 'UNREACHABLE') return { role_id: row.role_id, state: 'UNREACHABLE', reason: 'PARENT_ROLE_UNREACHABLE', evidence: rule.parent_role };
  if (parent.state === 'UNRESOLVED') return { role_id: row.role_id, state: 'UNRESOLVED', reason: 'PARENT_ROLE_UNRESOLVED', evidence: rule.parent_role };
  if (rule.kind === 'DEPENDENT_CONFIG_BOOLEAN') {
    const explicit = Object.hasOwn(config, rule.config_key), effective = explicit ? config[rule.config_key] : rule.default_value;
    demand(typeof effective === 'boolean', 'PROFILE_DEPENDENT_CONFIG_DEFAULT');
    return { role_id: row.role_id, state: effective ? 'REACHABLE' : 'UNREACHABLE', reason: effective ? 'PARENT_AND_CONFIG_GATE_REACHABLE' : 'DEPENDENT_CONFIG_GATE_FALSE', evidence: `${rule.parent_role};${rule.config_key}=${effective};${rule.source_path}::${rule.source_function}` };
  }
  if (rule.kind === 'DEPENDENT_ROLE') return { role_id: row.role_id, state: 'REACHABLE', reason: 'PARENT_ROLE_REACHABLE', evidence: `${rule.parent_role};${rule.source_path}::${rule.source_function}` };
  const explicitMajor = Object.hasOwn(config, rule.db_major_config_key), major = explicitMajor ? config[rule.db_major_config_key] : rule.db_major_default;
  demand(Number.isSafeInteger(major), 'PROFILE_DB_MAJOR');
  if (major < rule.fresh_pg_minimum_major) return { role_id: row.role_id, state: 'UNREACHABLE', reason: 'POSTGRES_MAJOR_PLATFORM_BRANCH_UNREACHABLE', evidence: `${rule.db_major_config_key}=${major};minimum=${rule.fresh_pg_minimum_major}` };
  return { role_id: row.role_id, state: 'REACHABLE', reason: 'FRESH_PG_PLATFORM_JOB_REACHABLE', evidence: `${rule.parent_role};pg>=${rule.fresh_pg_minimum_major}` };
}

export function deriveEffectiveStartProfile({ contract, config, projectId: requestedId, configSha256, configContractSha256, resourceContractSha256 = requestedId === CURRENT_BASELINE.project_id ? assertStartModelUnchanged(contract) : sha256(canonical(contract)), sourceEvidence = null }) {
  validateResourceExpectationContract(contract); projectId(requestedId); sha(configSha256); sha(configContractSha256); sha(resourceContractSha256);
  demand(object(config) && config.project_id === requestedId, 'PROFILE_CONFIG_ID');
  demand(config['db.migrations.enabled'] === false && config['db.seed.enabled'] === false && config['analytics.enabled'] === false && config['experimental.pgdelta.enabled'] === false, 'PROFILE_FROZEN_FLAGS');
  if (sourceEvidence !== null) {
    exact(sourceEvidence, ['normative_design_sha256', 'source_research_sha256'], 'PROFILE_SOURCE_EVIDENCE');
    demand(sourceEvidence.normative_design_sha256 === contract.source_binding.normative_design_sha256 && sourceEvidence.source_research_sha256 === contract.source_binding.source_research_sha256, 'PROFILE_SOURCE_DRIFT');
  }
  const decisions = new Map(), allRows = [...contract.roles, ...contract.volumes, ...contract.networks, ...contract.transient_jobs], pending = [...allRows];
  while (pending.length > 0) {
    let progress = false;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const row = pending[index], decision = roleDecision(row, config, decisions);
      if (decision === null) continue;
      decisions.set(row.role_id, decision); pending.splice(index, 1); progress = true;
    }
    demand(progress, 'PROFILE_DEPENDENCY_CYCLE');
  }
  const rows = allRows.map(row => {
    const decision = decisions.get(row.role_id);
    return { ...decision, resource_class: row.resource_class, lifecycle: row.lifecycle, image_role: row.image_role, image_reference: row.image_reference, source_rule: row.reachability.kind };
  });
  const reachable = rows.filter(x => x.state === 'REACHABLE').map(x => x.role_id);
  const unreachable = rows.filter(x => x.state === 'UNREACHABLE').map(x => x.role_id);
  const unresolved = rows.filter(x => x.state === 'UNRESOLVED').map(x => x.role_id);
  const reachableImages = [...new Set(rows.filter(x => x.state === 'REACHABLE' && x.image_role !== null).map(x => x.image_role))].sort();
  const unresolvedImages = [...new Set(rows.filter(x => x.state === 'UNRESOLVED' && x.image_role !== null).map(x => x.image_role))].sort();
  const profile = {
    schema_version: PREREQUISITE_SCHEMA_VERSION, profile_type: PROFILE_TYPE, purpose: PREREQUISITE_PURPOSE,
    result: unresolved.length ? 'BLOCKED' : 'PASS', project_id: requestedId, config_sha256: configSha256,
    config_contract_sha256: configContractSha256, resource_contract_sha256: resourceContractSha256,
    source_binding: copy(contract.source_binding), start_input_binding: copy(contract.start_input_binding), decisions: rows, reachable_roles: reachable.sort(),
    unreachable_roles: unreachable.sort(), unresolved_roles: unresolved.sort(), reachable_image_roles: reachableImages,
    unresolved_image_roles: unresolvedImages,
    project_inputs: { migrations: 'DISABLED', seed: 'DISABLED', analytics: 'DISABLED', vector: 'DISABLED', pgdelta: 'DISABLED' },
    generated_at: 'NON_AUTHORITATIVE_OMITTED_FOR_DETERMINISM',
  };
  profile.profile_sha256 = sha256(canonical(profile));
  if (requestedId === CURRENT_BASELINE.project_id) verifyCurrentProfile(profile);
  return profile;
}

export function validateImageApprovalSet(set) {
  exact(set, ['schema_version', 'approval_set_type', 'purpose', 'profile_sha256', 'independent_source_policy', 'approvals'], 'APPROVAL_SET');
  demand(set.schema_version === PREREQUISITE_SCHEMA_VERSION && set.approval_set_type === IMAGE_APPROVAL_SET_TYPE && set.purpose === PREREQUISITE_PURPOSE, 'APPROVAL_SET_TYPE');
  sha(set.profile_sha256, 'APPROVAL_PROFILE_HASH');
  exact(set.independent_source_policy, ['resolver_id', 'source_class', 'credentials', 'layer_download'], 'APPROVAL_SOURCE_POLICY');
  demand(set.independent_source_policy.source_class === 'REVIEWED_REGISTRY_METADATA' && set.independent_source_policy.credentials === 'FORBIDDEN' && set.independent_source_policy.layer_download === 'FORBIDDEN', 'APPROVAL_SOURCE_POLICY_VALUE');
  demand(typeof set.independent_source_policy.resolver_id === 'string' && /^[A-Z0-9_-]+$/.test(set.independent_source_policy.resolver_id), 'APPROVAL_RESOLVER');
  demand(Array.isArray(set.approvals), 'APPROVAL_ROWS');
  const roles = [];
  for (const row of set.approvals) {
    exact(row, ['role', 'source_reference', 'registry_host', 'repository', 'requested_tag', 'manifest_media_type', 'approved_registry_manifest_digest', 'approved_platform_child_digest', 'approved_config_digest', 'required_repo_digest', 'platform', 'selected_config_sha256', 'declared_volumes', 'healthcheck', 'entrypoint_policy', 'provenance', 'schema_version'], 'IMAGE_APPROVAL');
    demand(row.schema_version === PREREQUISITE_SCHEMA_VERSION, 'IMAGE_APPROVAL_VERSION'); roleId(row.role); roles.push(row.role); sourceReference(row.source_reference);
    demand(row.registry_host === 'registry-1.docker.io' && typeof row.repository === 'string' && /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)+$/.test(row.repository), 'APPROVAL_REGISTRY');
    demand(typeof row.requested_tag === 'string' && row.source_reference === `${row.repository}:${row.requested_tag}`, 'APPROVAL_SOURCE_PARTS');
    demand(['application/vnd.oci.image.index.v1+json','application/vnd.docker.distribution.manifest.list.v2+json','application/vnd.oci.image.manifest.v1+json','application/vnd.docker.distribution.manifest.v2+json'].includes(row.manifest_media_type), 'APPROVAL_MEDIA_TYPE');
    demand(/^[A-Za-z0-9][A-Za-z0-9._/-]{0,200}@sha256:[0-9a-f]{64}$/.test(row.approved_registry_manifest_digest), 'APPROVAL_MANIFEST');
    digest(row.approved_platform_child_digest, 'APPROVAL_PLATFORM_CHILD'); digest(row.approved_config_digest, 'APPROVAL_CONFIG');
    demand(row.required_repo_digest === row.approved_registry_manifest_digest, 'APPROVAL_REPODIGEST');
    exact(row.platform, ['os', 'architecture', 'variant'], 'APPROVAL_PLATFORM');
    for (const key of ['os', 'architecture']) demand(typeof row.platform[key] === 'string' && row.platform[key].length > 0 && row.platform[key] !== 'unknown', 'APPROVAL_PLATFORM_VALUE');
    demand(typeof row.platform.variant === 'string', 'APPROVAL_VARIANT'); sha(row.selected_config_sha256, 'APPROVAL_CONFIG_PROJECTION');
    demand(Array.isArray(row.declared_volumes) && new Set(row.declared_volumes).size === row.declared_volumes.length, 'APPROVAL_VOLUMES');
    for (const destination of row.declared_volumes) demand(typeof destination === 'string' && destination.startsWith('/') && !destination.includes('..'), 'APPROVAL_VOLUME');
    validateHealthcheckLayerProjection(row.healthcheck);
    demand(['NO_NETWORK_BOOTSTRAP', 'REVIEWED_STRUCTURAL_ENTRYPOINT'].includes(row.entrypoint_policy), 'APPROVAL_ENTRYPOINT');
    exact(row.provenance, ['independent', 'source_class', 'source_record_sha256', 'resolver_id', 'resolver_version', 'resolver_sha256', 'resolver_contract_sha256', 'manifest_response_sha256', 'child_manifest_response_sha256', 'config_response_sha256', 'approved_at_utc'], 'APPROVAL_PROVENANCE');
    demand(row.provenance.independent === true && row.provenance.source_class === 'REVIEWED_REGISTRY_METADATA' && row.provenance.resolver_id === set.independent_source_policy.resolver_id, 'APPROVAL_PROVENANCE_VALUE');
    demand(row.provenance.resolver_version === '1.0.0', 'APPROVAL_RESOLVER_VERSION');
    for (const key of ['source_record_sha256','resolver_sha256','resolver_contract_sha256','manifest_response_sha256','child_manifest_response_sha256','config_response_sha256']) sha(row.provenance[key], 'APPROVAL_SOURCE_RECORD');
    utc(row.provenance.approved_at_utc);
  }
  demand(new Set(roles).size === roles.length, 'APPROVAL_DUPLICATE_ROLE');
  return set;
}

export function produceImageApprovalSet({ profile, resolutions, resolverContract, resolverContractSha256 }) {
  demand(profile?.profile_type === PROFILE_TYPE && profile.result === 'PASS', 'APPROVAL_PROFILE_BLOCKED');
  verifyCurrentProfile(profile);
  if (profile.project_id === CURRENT_BASELINE.project_id) readCurrentFoundationBaseline(profile.project_id);
  demand(Array.isArray(resolutions) && object(resolverContract), 'APPROVAL_PRODUCER_INPUT'); sha(resolverContractSha256, 'APPROVAL_RESOLVER_CONTRACT_HASH');
  demand(resolverContract.resolver_id === 'WINWIN_PUBLIC_REGISTRY_METADATA_V1' && resolverContract.resolver_version === '1.0.0', 'APPROVAL_RESOLVER_CONTRACT');
  exactSet(resolutions.map(row => row.role).sort(), [...profile.reachable_image_roles].sort());
  const expectedReferences = new Map(profile.decisions.filter(row => row.state === 'REACHABLE' && row.image_role !== null).map(row => [row.image_role, row.image_reference]));
  const approvals = [...resolutions].sort((a,b) => a.role.localeCompare(b.role)).map(row => {
    exact(row, ['schema_version','role','source_reference','registry_host','repository','requested_tag','manifest_media_type','top_level_manifest_digest','platform_child_digest','config_digest','required_repo_digest','platform','selected_config_sha256','config_byte_length','declared_volumes','healthcheck','entrypoint_policy','resolver_id','resolver_version','resolver_sha256','response_hashes','resolved_at_utc','network','source_record_sha256'], 'APPROVAL_RESOLUTION');
    demand(Number.isSafeInteger(row.config_byte_length) && row.config_byte_length > 0, 'APPROVAL_RESOLUTION_CONFIG_SIZE');
    demand(row.schema_version === '1' && row.source_reference === expectedReferences.get(row.role), 'APPROVAL_RESOLUTION_REFERENCE');
    demand(row.resolver_id === resolverContract.resolver_id && row.resolver_version === resolverContract.resolver_version, 'APPROVAL_RESOLUTION_RESOLVER');
    demand(row.network?.metadata_only === true && row.network?.filesystem_layers_downloaded === false, 'APPROVAL_RESOLUTION_LAYER_POLICY');
    const approval = {
      role: row.role, source_reference: row.source_reference, registry_host: row.registry_host, repository: row.repository,
      requested_tag: row.requested_tag, manifest_media_type: row.manifest_media_type,
      approved_registry_manifest_digest: row.required_repo_digest, approved_platform_child_digest: row.platform_child_digest,
      approved_config_digest: row.config_digest, required_repo_digest: row.required_repo_digest,
      platform: copy(row.platform), selected_config_sha256: row.selected_config_sha256,
      declared_volumes: copy(row.declared_volumes), healthcheck: copy(row.healthcheck), entrypoint_policy: row.entrypoint_policy,
      provenance: { independent: true, source_class: 'REVIEWED_REGISTRY_METADATA', source_record_sha256: row.source_record_sha256,
        resolver_id: row.resolver_id, resolver_version: row.resolver_version, resolver_sha256: row.resolver_sha256,
        resolver_contract_sha256: resolverContractSha256, manifest_response_sha256: row.response_hashes.manifest,
        child_manifest_response_sha256: row.response_hashes.child_manifest, config_response_sha256: row.response_hashes.config,
        approved_at_utc: row.resolved_at_utc }, schema_version: '1',
    };
    return approval;
  });
  const set = { schema_version:'1', approval_set_type:IMAGE_APPROVAL_SET_TYPE, purpose:PREREQUISITE_PURPOSE,
    profile_sha256:profile.profile_sha256, independent_source_policy:{ resolver_id:resolverContract.resolver_id,
      source_class:'REVIEWED_REGISTRY_METADATA', credentials:'FORBIDDEN', layer_download:'FORBIDDEN' }, approvals };
  validateImageApprovalSet(set);
  return set;
}

export function compareApprovedImage(approval, local) {
  validateImageApprovalSet({ schema_version: '1', approval_set_type: IMAGE_APPROVAL_SET_TYPE, purpose: PREREQUISITE_PURPOSE, profile_sha256: '0'.repeat(64), independent_source_policy: { resolver_id: approval?.provenance?.resolver_id ?? 'INVALID', source_class: 'REVIEWED_REGISTRY_METADATA', credentials: 'FORBIDDEN', layer_download: 'FORBIDDEN' }, approvals: [approval] });
  exact(local, ['role', 'source_reference', 'id', 'repo_digests', 'resolved_platform_child_digest', 'platform', 'selected_config_sha256', 'declared_volumes', 'entrypoint_policy'], 'LOCAL_IMAGE');
  roleId(local.role); sourceReference(local.source_reference); digest(local.id, 'LOCAL_IMAGE_ID');
  demand(Array.isArray(local.repo_digests) && local.repo_digests.every(x => typeof x === 'string'), 'LOCAL_REPODIGESTS');
  digest(local.resolved_platform_child_digest, 'LOCAL_PLATFORM_CHILD'); exact(local.platform, ['os', 'architecture', 'variant'], 'LOCAL_PLATFORM');
  sha(local.selected_config_sha256, 'LOCAL_CONFIG_PROJECTION'); demand(Array.isArray(local.declared_volumes), 'LOCAL_VOLUMES');
  demand(local.role === approval.role && local.source_reference === approval.source_reference, 'IMAGE_ROLE_REFERENCE_MISMATCH');
  demand(local.repo_digests.includes(approval.required_repo_digest), 'IMAGE_REPODIGEST_MISSING');
  demand(local.resolved_platform_child_digest === approval.approved_platform_child_digest && local.id === approval.approved_config_digest, 'IMAGE_DIGEST_MISMATCH');
  demand(JSON.stringify(local.platform) === JSON.stringify(approval.platform), 'IMAGE_PLATFORM_MISMATCH');
  demand(local.selected_config_sha256 === approval.selected_config_sha256 && local.entrypoint_policy === approval.entrypoint_policy, 'IMAGE_CONFIG_MISMATCH');
  exactSet([...local.declared_volumes].sort(), [...approval.declared_volumes].sort());
  return { result: 'PASS', reason: 'APPROVED_MANIFEST_PLATFORM_CONFIG_AND_SAFE_CONFIG_EXACT', role: approval.role, tag_authority: 'REJECTED', normalization: 'FORBIDDEN' };
}

function validatePreparationContract(contract) {
  exact(contract, ['schema_version', 'contract_type', 'purpose', 'mode', 'required_inputs', 'attempt_policy', 'failure_policy', 'drift_policy', 'cleanup_policy', 'acceptance_policy'], 'PREPARATION_CONTRACT');
  demand(contract.schema_version === '1' && contract.contract_type === IMAGE_PREPARATION_CONTRACT_TYPE && contract.purpose === PREREQUISITE_PURPOSE && contract.mode === 'PRE_CACHED_APPROVED_DIGEST_ONLY', 'PREPARATION_TYPE');
  demand(JSON.stringify(contract.required_inputs) === JSON.stringify(['PASS_EFFECTIVE_PROFILE','FROZEN_RESOURCE_EXPECTATION_INSTANCE','COMPLETE_INDEPENDENT_IMAGE_APPROVAL_SET']), 'PREPARATION_INPUTS');
  const attempts = exact(contract.attempt_policy, ['attempts_per_image', 'retry', 'ordering', 'stop_on_first_failure'], 'PREPARATION_ATTEMPTS');
  demand(attempts.attempts_per_image === 1 && attempts.retry === 'FORBIDDEN' && attempts.ordering === 'ROLE_ID_ASCENDING' && attempts.stop_on_first_failure === true, 'PREPARATION_ATTEMPTS');
  const failure = exact(contract.failure_policy, ['partial_acquisition', 'evidence'], 'PREPARATION_FAILURE');
  demand(failure.partial_acquisition === 'PRESERVE_AND_STOP' && failure.evidence === 'SANITIZED_IN_MEMORY_UNLESS_SEPARATELY_AUTHORIZED', 'PREPARATION_FAILURE');
  const drift = exact(contract.drift_policy, ['tag_to_digest_change', 'digest_unavailable', 'approval_mismatch'], 'PREPARATION_DRIFT');
  demand(drift.tag_to_digest_change === 'FAIL' && drift.digest_unavailable === 'FAIL' && drift.approval_mismatch === 'FAIL', 'PREPARATION_DRIFT');
  const cleanup = exact(contract.cleanup_policy, ['remove_partial', 'remove_unapproved_local'], 'PREPARATION_CLEANUP');
  demand(cleanup.remove_partial === 'FORBIDDEN' && cleanup.remove_unapproved_local === 'FORBIDDEN', 'PREPARATION_CLEANUP');
  const acceptance = exact(contract.acceptance_policy, ['tag_only', 'local_match'], 'PREPARATION_ACCEPTANCE');
  demand(acceptance.tag_only === 'REJECTED' && acceptance.local_match === 'EXACT_APPROVED_IMMUTABLE_IDENTITY', 'PREPARATION_ACCEPTANCE');
  return contract;
}

export function planImagePreparation({ profile, approvalSet, preparationContract }) {
  validatePreparationContract(preparationContract); validateImageApprovalSet(approvalSet);
  demand(profile?.profile_type === PROFILE_TYPE && profile.result === 'PASS', 'PREPARATION_PROFILE_BLOCKED');
  verifyCurrentProfile(profile);
  if (profile.project_id === CURRENT_BASELINE.project_id) readCurrentFoundationBaseline(profile.project_id);
  demand(approvalSet.profile_sha256 === profile.profile_sha256, 'PREPARATION_PROFILE_DRIFT');
  const expected = [...profile.reachable_image_roles].sort(), approvals = [...approvalSet.approvals].sort((a,b) => a.role.localeCompare(b.role));
  exactSet(approvals.map(x => x.role), expected);
  return { result: 'PASS', mode: preparationContract.mode, attempts_per_image: 1, retry: 'FORBIDDEN', actions: approvals.map(row => ({ role: row.role, immutable_reference: row.approved_registry_manifest_digest, expected_config_digest: row.approved_config_digest, mutation: 'REQUIRES_SEPARATE_AUTHORIZATION' })) };
}

function expectedRow(row, requestedId, config, healthcheckConfiguration) {
  const ports = row.ports.map(port => ({ ...port, host_port: config[port.config_key] }));
  ports.forEach(port => demand(Number.isSafeInteger(port.host_port) && port.host_port >= 59320 && port.host_port <= 59329, 'EXPECTATION_HOST_PORT'));
  return {
    expectation_id: row.role_id, role_id: row.role_id, resource_class: row.resource_class, lifecycle: row.lifecycle,
    cardinality: copy(row.cardinality_when_reachable), discovery_hint: row.discovery_hint,
    required_labels: Object.fromEntries(LABELS.map(label => [label, requestedId])), image_role: row.image_role,
    relationships: copy(row.relationships), ports, health_policy: row.health_policy, healthcheck_configuration: healthcheckConfiguration,
  };
}

function healthcheckConfiguration(approval, runtimeBinding, policy) {
  demand(approval, 'EXPECTATION_IMAGE_APPROVAL'); demand(runtimeBinding, 'EXPECTATION_RUNTIME_HEALTHCHECK_UNAVAILABLE');
  const effective = deriveEffectiveHealthcheck(approval.healthcheck, runtimeBinding.projection, policy);
  return {
    binding_version: HEALTHCHECK_BINDING_VERSION,
    image_healthcheck_projection: copy(approval.healthcheck),
    runtime_healthcheck_override_projection: copy(runtimeBinding.projection),
    effective_healthcheck: effective,
    candidate_verification: { comparison: 'EXACT_BEHAVIOR_FIELDS_AND_SHA256', required_fields: copy(HEALTHCHECK_BEHAVIOR_FIELDS) },
  };
}

export function produceResourceExpectationInstance({ contract, profile, config, configSha256, approvalSet, producerSha256 }) {
  validateResourceExpectationContract(contract); validateImageApprovalSet(approvalSet); sha(producerSha256, 'PRODUCER_HASH'); sha(configSha256, 'INSTANCE_CONFIG_HASH');
  demand(profile?.profile_type === PROFILE_TYPE && profile.result === 'PASS', 'EXPECTATION_PROFILE_BLOCKED');
  verifyCurrentProfile(profile);
  demand(config?.project_id === profile.project_id, 'EXPECTATION_CONFIG_ID');
  const baselineBinding = profile.project_id === CURRENT_BASELINE.project_id ? readCurrentFoundationBaseline(profile.project_id).binding : null;
  if (baselineBinding) assertStartModelUnchanged(contract);
  demand(profile.config_sha256 === configSha256 && approvalSet.profile_sha256 === profile.profile_sha256, 'EXPECTATION_INPUT_DRIFT');
  exactSet(approvalSet.approvals.map(x => x.role).sort(), [...profile.reachable_image_roles].sort());
  const byRole = new Map([...contract.roles, ...contract.volumes, ...contract.networks, ...contract.transient_jobs].map(row => [row.role_id, row]));
  const approvalsByRole = new Map(approvalSet.approvals.map(row => [row.role, row]));
  const overridesByRole = new Map(contract.runtime_healthcheck_overrides.map(row => [row.role_id, row]));
  if (profile.project_id === contract.identity_policy.production_project_id) demand(contract.runtime_healthcheck_overrides.every(row => row.source_binding.authority === 'FROZEN_SUPABASE_EFFECTIVE_START_DEFINITION' && row.source_binding.source_commit === contract.source_binding.source_commit), 'EXPECTATION_RUNTIME_HEALTHCHECK_SOURCE');
  const expectations = profile.reachable_roles.map(id => {
    const row = byRole.get(id);
    demand(row, 'EXPECTATION_UNKNOWN_PROFILE_ROLE');
    if (row.image_role !== null) demand(approvalsByRole.get(row.image_role)?.source_reference === row.image_reference, 'EXPECTATION_IMAGE_REFERENCE');
    const healthcheck = row.image_role !== null ? healthcheckConfiguration(approvalsByRole.get(row.image_role), overridesByRole.get(row.role_id), contract.healthcheck_binding_policy) : null;
    return expectedRow(row, profile.project_id, config, healthcheck);
  });
  for (const expectation of expectations.filter(x => x.image_role !== null)) {
    const approval = approvalSet.approvals.find(x => x.role === expectation.image_role);
    demand(approval, 'EXPECTATION_IMAGE_APPROVAL');
    const uncovered = approval.declared_volumes.filter(destination => !expectation.relationships.explicit_mount_destinations.includes(destination));
    demand(uncovered.length === 0, 'UNLABELLED_ANONYMOUS_VOLUME_RISK');
  }
  const instance = {
    schema_version: RESOURCE_EXPECTATION_SCHEMA_VERSION, contract_type: EXPECTATION_INSTANCE_TYPE, purpose: PREREQUISITE_PURPOSE,
    project_id: profile.project_id, config_sha256: configSha256, resource_contract_sha256: sha256(canonical(contract)),
    foundation_baseline_binding: baselineBinding,
    producer_sha256: producerSha256, profile_sha256: profile.profile_sha256,
    image_approval_set_sha256: sha256(canonical(approvalSet)), expectations,
    healthcheck_binding_policy: copy(contract.healthcheck_binding_policy),
    candidate_policy: copy(contract.candidate_policy), generated_at: 'NON_AUTHORITATIVE_OMITTED_FOR_DETERMINISM',
  };
  instance.instance_sha256 = sha256(canonical(instance));
  return instance;
}

export function validateResourceExpectationInstance(instance) {
  exact(instance, ['schema_version', 'contract_type', 'purpose', 'project_id', 'foundation_baseline_binding', 'config_sha256', 'resource_contract_sha256', 'producer_sha256', 'profile_sha256', 'image_approval_set_sha256', 'expectations', 'healthcheck_binding_policy', 'candidate_policy', 'generated_at', 'instance_sha256'], 'EXPECTATION_INSTANCE');
  validateHealthcheckBindingPolicy(instance.healthcheck_binding_policy);
  demand(instance.schema_version === RESOURCE_EXPECTATION_SCHEMA_VERSION && instance.contract_type === EXPECTATION_INSTANCE_TYPE && instance.purpose === PREREQUISITE_PURPOSE, 'EXPECTATION_INSTANCE_TYPE');
  projectId(instance.project_id);
  demand(instance.project_id !== LOST_SESSION, 'HISTORICAL_OR_FOREIGN_BASELINE');
  if (instance.foundation_baseline_binding !== null) {
    validateCurrentBaselineBinding(instance.foundation_baseline_binding, instance.project_id);
    demand(instance.config_sha256 === CURRENT_BASELINE.config_sha256 && instance.profile_sha256 === CURRENT_BASELINE.profile_sha256, 'CURRENT_PROFILE_BINDING_MISMATCH');
  } else demand(instance.project_id !== CURRENT_BASELINE.project_id, 'CURRENT_BASELINE_BINDING_REQUIRED');
  for (const key of ['config_sha256', 'resource_contract_sha256', 'producer_sha256', 'profile_sha256', 'image_approval_set_sha256', 'instance_sha256']) sha(instance[key], 'EXPECTATION_INSTANCE_HASH');
  demand(instance.generated_at === 'NON_AUTHORITATIVE_OMITTED_FOR_DETERMINISM', 'EXPECTATION_INSTANCE_TIME');
  const candidate = exact(instance.candidate_policy, ['complete_disposition_required', 'unexpected_candidate', 'ambiguous_role', 'unclassified_candidate', 'foreign_or_mixed_ownership', 'unrelated_preexisting'], 'EXPECTATION_CANDIDATE_POLICY');
  demand(candidate.complete_disposition_required === true && candidate.unrelated_preexisting === 'OUTSIDE_UNLESS_COLLISION_OR_CANDIDATE_SCOPE', 'EXPECTATION_CANDIDATE_POLICY_VALUE');
  demand([candidate.unexpected_candidate, candidate.ambiguous_role, candidate.unclassified_candidate, candidate.foreign_or_mixed_ownership].every(value => value === 'FAIL'), 'EXPECTATION_CANDIDATE_FAIL_CLOSED');
  demand(Array.isArray(instance.expectations), 'EXPECTATION_ROWS');
  const ids = [];
  for (const row of instance.expectations) {
    exact(row, ['expectation_id', 'role_id', 'resource_class', 'lifecycle', 'cardinality', 'discovery_hint', 'required_labels', 'image_role', 'relationships', 'ports', 'health_policy', 'healthcheck_configuration'], 'EXPECTATION_ROW');
    roleId(row.expectation_id); roleId(row.role_id); demand(row.expectation_id === row.role_id, 'EXPECTATION_ROLE_ID'); ids.push(row.role_id);
    demand(CLASSES.includes(row.resource_class) && LIFECYCLES.includes(row.lifecycle), 'EXPECTATION_CLASS'); validateCardinality(row.cardinality);
    demand(typeof row.discovery_hint === 'string' && row.discovery_hint.length > 0, 'EXPECTATION_HINT'); safeText(row.discovery_hint);
    exact(row.required_labels, LABELS, 'EXPECTATION_LABELS');
    for (const label of LABELS) demand(row.required_labels[label] === instance.project_id, 'EXPECTATION_LABEL_VALUE');
    if (row.image_role !== null) roleId(row.image_role);
    demand(row.resource_class === 'CONTAINER' || row.resource_class === 'TRANSIENT_JOB' ? row.image_role !== null : row.image_role === null, 'EXPECTATION_IMAGE_APPLICABILITY');
    validateRelationship(row.relationships);
    demand(Array.isArray(row.ports), 'EXPECTATION_PORTS');
    for (const port of row.ports) {
      exact(port, ['config_key', 'container_port', 'protocol', 'host_ip_policy', 'host_port'], 'EXPECTATION_PORT');
      validatePort({ config_key: port.config_key, container_port: port.container_port, protocol: port.protocol, host_ip_policy: port.host_ip_policy });
      demand(Number.isSafeInteger(port.host_port) && port.host_port >= 59320 && port.host_port <= 59329, 'EXPECTATION_HOST_PORT');
    }
    demand(['RUNNING_HEALTHY', 'TRANSIENT_EXIT_ZERO_REMOVED', 'PRESENT', 'NOT_APPLICABLE'].includes(row.health_policy), 'EXPECTATION_HEALTH');
    if (row.image_role !== null) {
      const binding = exact(row.healthcheck_configuration, ['binding_version', 'image_healthcheck_projection', 'runtime_healthcheck_override_projection', 'effective_healthcheck', 'candidate_verification'], 'EXPECTATION_HEALTHCHECK_BINDING');
      demand(binding.binding_version === HEALTHCHECK_BINDING_VERSION, 'EXPECTATION_HEALTHCHECK_VERSION');
      validateHealthcheckLayerProjection(binding.image_healthcheck_projection); validateHealthcheckLayerProjection(binding.runtime_healthcheck_override_projection, { runtime: true }); validateEffectiveHealthcheck(binding.effective_healthcheck);
      demand(canonical(binding.effective_healthcheck) === canonical(deriveEffectiveHealthcheck(binding.image_healthcheck_projection, binding.runtime_healthcheck_override_projection, instance.healthcheck_binding_policy)), 'EXPECTATION_HEALTHCHECK_DERIVATION_MISMATCH');
      const candidateVerification = exact(binding.candidate_verification, ['comparison', 'required_fields'], 'EXPECTATION_HEALTHCHECK_CANDIDATE_POLICY');
      demand(candidateVerification.comparison === 'EXACT_BEHAVIOR_FIELDS_AND_SHA256' && canonical(candidateVerification.required_fields) === canonical(HEALTHCHECK_BEHAVIOR_FIELDS), 'EXPECTATION_HEALTHCHECK_CANDIDATE_POLICY');
    } else demand(row.healthcheck_configuration === null, 'EXPECTATION_HEALTHCHECK_APPLICABILITY');
  }
  demand(new Set(ids).size === ids.length, 'EXPECTATION_DUPLICATE_ROLE');
  const unsigned = copy(instance); delete unsigned.instance_sha256;
  demand(sha256(canonical(unsigned)) === instance.instance_sha256, 'EXPECTATION_INSTANCE_INTEGRITY');
  return instance;
}

export function compareResourceExpectation(instance, candidates) {
  validateResourceExpectationInstance(instance); demand(Array.isArray(candidates), 'CANDIDATES');
  if (instance.foundation_baseline_binding !== null) readCurrentFoundationBaseline(instance.project_id);
  const candidateIds = new Set();
  for (const candidate of candidates) {
    exact(candidate, ['candidate_id', 'role_id', 'matched_expectation_ids', 'resource_class', 'lifecycle', 'labels', 'image_role', 'relationships', 'ports', 'health_policy', 'healthcheck_configuration', 'disposition'], 'CANDIDATE');
    safeText(candidate.candidate_id); roleId(candidate.role_id); demand(CLASSES.includes(candidate.resource_class) && LIFECYCLES.includes(candidate.lifecycle), 'CANDIDATE_CLASS');
    demand(Array.isArray(candidate.matched_expectation_ids) && new Set(candidate.matched_expectation_ids).size === candidate.matched_expectation_ids.length, 'CANDIDATE_MATCHES');
    candidate.matched_expectation_ids.forEach(roleId);
    demand(candidate.matched_expectation_ids.length === 1, candidate.matched_expectation_ids.length > 1 ? 'AMBIGUOUS_CANDIDATE_ROLE' : 'UNEXPECTED_CANDIDATE');
    demand(candidate.matched_expectation_ids[0] === candidate.role_id, 'AMBIGUOUS_CANDIDATE_ROLE');
    demand(!candidateIds.has(candidate.candidate_id), 'DUPLICATE_CANDIDATE'); candidateIds.add(candidate.candidate_id);
    demand(candidate.disposition === 'CANDIDATE_FOR_EXPECTATION', 'UNCLASSIFIED_CANDIDATE');
    const matches = instance.expectations.filter(x => x.role_id === candidate.role_id && x.resource_class === candidate.resource_class);
    demand(matches.length === 1, matches.length ? 'AMBIGUOUS_CANDIDATE_ROLE' : 'UNEXPECTED_CANDIDATE');
    const expected = matches[0]; ownership(candidate.labels, instance.project_id);
    demand(candidate.lifecycle === expected.lifecycle && candidate.image_role === expected.image_role && candidate.health_policy === expected.health_policy, 'CANDIDATE_SEMANTIC_MISMATCH');
    demand(canonical(candidate.relationships) === canonical(expected.relationships) && canonical(candidate.ports) === canonical(expected.ports), 'CANDIDATE_RELATIONSHIP_MISMATCH');
    if (expected.image_role !== null) compareCandidateHealthcheck(expected.healthcheck_configuration.effective_healthcheck, candidate.healthcheck_configuration);
    else demand(candidate.healthcheck_configuration === null, 'CANDIDATE_HEALTHCHECK_APPLICABILITY');
  }
  const counts = [];
  for (const expected of instance.expectations) {
    const count = candidates.filter(x => x.role_id === expected.role_id && x.resource_class === expected.resource_class).length;
    demand(count >= expected.cardinality.minimum && count <= expected.cardinality.maximum, 'CARDINALITY_MISMATCH');
    counts.push({ role_id: expected.role_id, count });
  }
  return { result: 'PASS', reason: 'COMPLETE_EXPECTED_AND_CANDIDATE_DISPOSITION', candidate_count: candidates.length, counts };
}

export function foundationPrerequisiteService() {
  const resource = loadJSON(RESOURCE_URL), preparation = loadJSON(PREPARATION_URL);
  validateResourceExpectationContract(resource.value); validatePreparationContract(preparation.value);
  const sourceEvidence = verifyProductionSource(resource.value);
  const baseline = readCurrentFoundationBaseline(resource.value.identity_policy.production_project_id);
  const configRead = baseline.configRead;
  const profile = deriveEffectiveStartProfile({ contract: resource.value, config: configRead.effective, projectId: configRead.lexical.raw_project_id, configSha256: configRead.verification.config_sha256, configContractSha256: configRead.verification.contract_sha256, resourceContractSha256: assertStartModelUnchanged(resource.value), sourceEvidence });
  verifyCurrentProfile(profile);
  return Object.freeze({
    baselineBinding: () => copy(baseline.binding),
    contract: () => copy(resource.value), contractSha256: resource.sha256,
    preparationContract: () => copy(preparation.value), preparationContractSha256: preparation.sha256,
    profile: () => copy(profile), producerSha256: hash(fs.readFileSync(MODULE_URL)),
    materializationReadiness: () => ({ result: profile.result === 'PASS' ? 'BLOCKED' : 'BLOCKED', reason: profile.result === 'PASS' ? 'INDEPENDENT_IMAGE_APPROVAL_SET_MISSING' : 'EFFECTIVE_PROFILE_UNRESOLVED', unresolved_roles: [...profile.unresolved_roles], unresolved_image_roles: [...profile.unresolved_image_roles], image_approval_set: 'NOT_MATERIALIZED' }),
  });
}
