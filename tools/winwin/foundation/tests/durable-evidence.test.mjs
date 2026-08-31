import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { syntheticReservationHarness } from '../lib/reservations.mjs';
import { syntheticReservedConfigService, renderPlannedConfig } from '../lib/configuration.mjs';
import { ACCEPTED_CHECKPOINT, LOST_SESSION, HISTORICAL_CONFIG_SHA256, historicalLoss, canonicalBytes, sealWitness, validateWitness } from '../lib/durable-evidence.mjs';
import { baselinePayload, verifyNewProfile, historicalProfile } from '../establish-baseline.mjs';

const TIME = '2000-01-01T00:00:00.000Z';
const ID = 'wwfnd-20000101t000000z-000000000001';
const NEXT_ID = 'wwfnd-20000101t000000z-000000000002';
const H = 'a'.repeat(64);
const rejects = (fn, code) => assert.throws(fn, code ? error => error.code === code : undefined);
function harness(t, options = {}) {
  const value = syntheticReservationHarness({ withDurability: true, clock: () => new Date(TIME),
    randomBytes: size => size === 6 ? Buffer.from('000000000001', 'hex') : Buffer.from('00000001','hex'), ...options });
  t.after(() => fs.rmSync(value.root, { recursive: true, force: true }));
  return value;
}
function decision(value) {
  const index = value.service.readIndex();
  return { checked_at_utc: TIME, freshness_result: 'FRESH-QUALIFIED', collision_result: 'PASS', expected_entry_count: index.entry_count, expected_index_sha256: index.index_sha256 };
}
function reserve(value) { return value.service.reserve(value.service.generateCandidate(), decision(value)); }
function complete(t) {
  const value = harness(t, { history: [historicalLoss()] });
  const reservation = reserve(value), config = syntheticReservedConfigService(value);
  config.materialize(ID);
  const inspected = config.readAndVerify(ID), profile = verifyNewProfile(inspected);
  const baseline = value.durable.publishBaseline(baselinePayload(inspected, profile, TIME));
  return { ...value, reservation, config, inspected, profile, baseline };
}
const history = state => [{ project_id: ID, state, config_sha256: H, basis: 'HISTORICAL_ATTESTATION' }];

test('clean first reservation requires explicit durable initialization and accepts exactly one ACTIVE', t => {
  const value = harness(t); const result = reserve(value);
  const index = value.service.readIndex(), state = value.durable.read();
  assert.equal(result.project_id, ID); assert.equal(index.active.length, 1); assert.equal(index.ended.length, 0);
  assert.equal(state.active.state, 'ACTIVE'); assert.equal(state.intent.state, 'PREPARING');
  assert.equal(result.durable_witness_sha256, state.active.witness_sha256);
});
test('missing durable root is not first-use state', t => {
  const value = harness(t, { initializeDurable: false });
  rejects(() => value.service.readIndex(), 'DURABLE_STATE_MISSING');
  assert.equal(fs.existsSync(value.indexRoot), false);
});
test('lost durable root cannot be silently bootstrapped again while its receipt survives', t => {
  const value = harness(t);
  fs.rmSync(value.durable.root, { recursive: true });
  rejects(() => value.service.readIndex(), 'DURABLE_STATE_MISSING');
  rejects(() => value.durable.initialize({ toolingCheckpoint: ACCEPTED_CHECKPOINT, createdAtUtc: TIME }), 'DURABLE_BOOTSTRAP_ALREADY_EXISTS');
});
test('missing durable attempt cannot be confused with an unused historical ledger', t => {
  const value = harness(t); reserve(value);
  fs.rmSync(path.join(value.durable.root, 'reservation-attempt'), { recursive: true });
  fs.rmSync(value.indexRoot, { recursive: true });
  rejects(() => value.service.readIndex(), 'DURABLE_PARTIAL_OR_UNKNOWN_ENTRY');
});
test('lost baseline witness cannot downgrade a completed baseline to pre-config state', t => {
  const value = complete(t);
  fs.unlinkSync(path.join(value.durable.root, 'reservation-attempt', 'baseline.json'));
  fs.unlinkSync(path.join(value.durable.root, 'reservation-attempt', '.baseline.json.pending'));
  rejects(() => value.service.readIndex(), 'DURABLE_PARTIAL_OR_UNKNOWN_ENTRY');
});
test('historical ACTIVE witness fails closed without ephemeral state', t => {
  const value = harness(t, { history: history('ACTIVE') });
  rejects(() => value.service.readIndex(), 'DURABLE_HISTORICAL_ACTIVE');
  rejects(() => value.durable.claim({ project_id: NEXT_ID, generated_at_utc: TIME }), 'DURABLE_HISTORICAL_ACTIVE');
  assert.equal(fs.existsSync(value.indexRoot), false);
});
test('historical ENDED witness is not reactivated and does not count as current ENDED', t => {
  const value = harness(t, { history: history('ENDED') });
  assert.equal(value.service.readIndex().durable_history_count, 1);
  rejects(() => reserve(value), 'DURABLE_ID_REUSE');
  assert.equal(value.durable.read().intent, null);
});
test('CONTINUITY_LOST witness preserves forensic state without fabricating ENDED', t => {
  const value = harness(t, { history: [historicalLoss()] });
  const state = value.durable.read();
  assert.equal(state.history.records[0].state, 'CONTINUITY_LOST');
  assert.equal(value.service.readIndex().ended.length, 0);
  rejects(() => value.durable.claim({ project_id: LOST_SESSION, generated_at_utc: TIME }), 'DURABLE_ID_REUSE');
});
test('lost ID is rejected even in an otherwise empty synthetic history', t => {
  const value = harness(t);
  rejects(() => value.durable.claim({ project_id: LOST_SESSION, generated_at_utc: TIME }), 'DURABLE_ID_REUSE');
});
test('new ID differs from all historical IDs and second attempt cannot overwrite it', t => {
  const value = harness(t, { history: [historicalLoss()] }); reserve(value);
  const before = canonicalBytes(value.durable.read());
  assert.notEqual(ID, LOST_SESSION);
  rejects(() => value.service.reserve({ project_id: NEXT_ID, generated_at_utc: TIME }, decision(value)), 'DURABLE_ATTEMPT_ALREADY_EXISTS');
  assert.deepEqual(canonicalBytes(value.durable.read()), before);
});
test('missing ephemeral index with surviving ACTIVE durable witness is not empty first use', t => {
  const value = harness(t); reserve(value);
  fs.rmSync(value.indexRoot, { recursive: true });
  rejects(() => value.service.readIndex(), 'DURABLE_EPHEMERAL_MISSING');
  assert.equal(value.durable.read().active.project_id, ID);
});
test('durable intent write failure aborts before ephemeral creation and poisons retry', t => {
  const value = harness(t, { durableFault: name => { if (name === 'intent.json') throw new Error('synthetic durable failure'); } });
  rejects(() => reserve(value)); assert.equal(fs.existsSync(value.indexRoot), false);
  rejects(() => value.service.readIndex(), 'DURABLE_PARTIAL_OR_UNKNOWN_ENTRY');
});
test('ephemeral publication failure cannot create a valid session or alternate-ID retry', t => {
  const value = harness(t, { beforeActiveLink: () => { throw new Error('synthetic ephemeral failure'); } });
  rejects(() => reserve(value)); assert.equal(value.durable.read().active, null);
  assert.equal(value.durable.read().intent.project_id, ID);
  rejects(() => value.service.readIndex(), 'DURABLE_PARTIAL_RESERVATION');
  rejects(() => syntheticReservedConfigService(value), 'DURABLE_PARTIAL_RESERVATION');
  rejects(() => value.durable.claim({ project_id: NEXT_ID, generated_at_utc: TIME }), 'DURABLE_ATTEMPT_ALREADY_EXISTS');
});
test('durable ACTIVE publication failure leaves ephemeral metadata unaccepted', t => {
  const value = harness(t, { durableFault: name => { if (name === 'active.json') throw new Error('synthetic active failure'); } });
  rejects(() => reserve(value)); assert.equal(value.durable.read().active, null);
  rejects(() => value.service.readIndex(), 'DURABLE_PARTIAL_RESERVATION');
  rejects(() => syntheticReservedConfigService(value), 'DURABLE_PARTIAL_RESERVATION');
});
test('config creation is forbidden before a valid durable reservation', t => {
  const value = harness(t);
  rejects(() => syntheticReservedConfigService(value), 'CONFIG_RESERVATION_CARDINALITY');
  assert.equal(fs.readdirSync(value.sessions).length, 0);
});
test('config/session ID mismatch rejects before any config files are created', t => {
  const value = harness(t); const reservation = reserve(value), config = syntheticReservedConfigService(value);
  rejects(() => config.materialize(NEXT_ID), 'CONFIG_REQUESTED_ID_MISMATCH');
  assert.deepEqual(fs.readdirSync(path.join(reservation.session_root, 'project')), []);
});
test('complete config baseline binds exact bytes, two links and dynamic identity', t => {
  const value = complete(t), inspected = value.config.readAndVerify(ID);
  assert.equal(inspected.lexical.raw_project_id, ID); assert.equal(inspected.effective.project_id, ID);
  assert.equal(value.baseline.config_bytes, 436); assert.equal(value.baseline.session_local_link.link_count, 2);
  assert.equal(value.baseline.config_sha256, value.baseline.config_source_sha256);
  assert.notEqual(value.baseline.config_sha256, HISTORICAL_CONFIG_SHA256);
  assert.equal(value.durable.read().baseline.witness_sha256, value.baseline.witness_sha256);
});
test('identical reconstructed config bytes do not prove original config continuity', t => {
  const value = complete(t), { sourceFile, configFile } = value.inspected.paths;
  const bytes = fs.readFileSync(sourceFile);
  // Keep original inode alive privately so this test cannot accidentally reuse its inode.
  fs.renameSync(sourceFile, sourceFile + '.original'); fs.unlinkSync(configFile);
  fs.writeFileSync(sourceFile, bytes, { mode: 0o600, flag: 'wx' }); fs.linkSync(sourceFile, configFile);
  rejects(() => value.config.readAndVerify(ID), 'CONFIG_DURABLE_CONTINUITY_LOST');
});
test('identical reconstructed active record bytes do not prove session continuity', t => {
  const value = complete(t), file = path.join(value.indexRoot, 'active', 'ia-3a-schema-runtime-validation.json');
  const bytes = fs.readFileSync(file); fs.unlinkSync(file);
  fs.writeFileSync(file, bytes, { mode: 0o600, flag: 'wx' });
  rejects(() => value.service.readIndex(), 'DURABLE_FILESYSTEM_CONTINUITY_LOST');
});
test('reboot/tmp-loss simulation preserves durable history but forbids continuity', t => {
  const value = complete(t), before = canonicalBytes(value.durable.read());
  fs.rmSync(value.sessions, { recursive: true }); fs.mkdirSync(value.sessions, { mode: 0o700 });
  assert.deepEqual(canonicalBytes(value.durable.read()), before);
  rejects(() => value.service.readIndex(), 'DURABLE_EPHEMERAL_MISSING');
  rejects(() => syntheticReservedConfigService(value), 'DURABLE_EPHEMERAL_MISSING');
});
test('no overwrite of root, baseline or existing materialized config', t => {
  const value = complete(t), before = canonicalBytes(value.durable.read());
  rejects(() => value.durable.initialize({ toolingCheckpoint: ACCEPTED_CHECKPOINT, createdAtUtc: TIME }), 'DURABLE_ROOT_EXISTS');
  rejects(() => value.durable.publishBaseline(baselinePayload(value.inspected, value.profile, TIME)), 'DURABLE_BASELINE_PRECONDITION');
  rejects(() => value.config.materialize(ID), 'CONFIG_PROJECT_NOT_EMPTY');
  assert.deepEqual(canonicalBytes(value.durable.read()), before);
});
test('witness hashing is deterministic and rejects content tampering or unknown fields', () => {
  const payload = { schema_version: '1', evidence_type: 'HISTORY', records: [historicalLoss()] };
  const first = sealWitness(payload), second = sealWitness({ records: payload.records, evidence_type: payload.evidence_type, schema_version: '1' });
  assert.deepEqual(first, second); validateWitness(first);
  rejects(() => validateWitness({ ...first, witness_sha256: H }), 'DURABLE_HASH_MISMATCH');
  rejects(() => validateWitness({ ...first, unknown: true }));
});
test('durable evidence permissions and publication links remain strictly private', t => {
  const value = complete(t);
  const visit = directory => {
    assert.equal(fs.statSync(directory).mode & 0o777, 0o700);
    for (const entry of fs.readdirSync(directory)) {
      const file = path.join(directory, entry), stat = fs.lstatSync(file);
      if (stat.isDirectory()) visit(file);
      else { assert.equal(stat.mode & 0o777, 0o600); assert.equal(stat.nlink, 2); validateWitness(JSON.parse(fs.readFileSync(file))); }
    }
  };
  visit(value.durable.root);
});
test('unpublished pending evidence makes reader fail closed', t => {
  const value = complete(t), attempt = path.join(value.durable.root, 'reservation-attempt');
  fs.unlinkSync(path.join(attempt, 'baseline.json'));
  rejects(() => value.service.readIndex(), 'DURABLE_PARTIAL_OR_UNKNOWN_ENTRY');
});
test('unexpected links and world-readable durable files fail closed', t => {
  const value = complete(t), file = path.join(value.durable.root, 'history.json');
  fs.chmodSync(file, 0o644); rejects(() => value.service.readIndex(), 'DURABLE_FILE');
});
test('profile rules are unchanged while session-bound profile digest changes', t => {
  const value = complete(t), historical = historicalProfile();
  assert.equal(value.profile.semantic_unchanged, true);
  assert.notEqual(value.profile.profile.profile_sha256, historical.profile_sha256);
  assert.equal(value.profile.profile.reachable_image_roles.length, 10);
  assert.deepEqual(value.profile.profile.decisions, historical.decisions);
});
test('profile semantic drift is rejected rather than normalized away', t => {
  const value = complete(t), changed = structuredClone(value.inspected);
  changed.effective['auth.enabled'] = false;
  rejects(() => verifyNewProfile(changed), 'PROFILE_SEMANTICS_DRIFT');
});
test('config renderer bytes are frozen apart from the new project ID', t => {
  const value = complete(t), planned = value.config.contract();
  const newBytes = renderPlannedConfig(planned);
  assert.equal(newBytes.length, 436);
  assert.deepEqual(newBytes, fs.readFileSync(value.inspected.paths.configFile));
});
test('durable schema defines five strict record families', () => {
  const schema = JSON.parse(fs.readFileSync(new URL('../schemas/durable-evidence.schema.json', import.meta.url)));
  assert.equal(schema.oneOf.length, 5);
  for (const definition of Object.values(schema.$defs)) assert.equal(definition.additionalProperties, false);
});

// Offline evaluator for exactly the keywords used by this bounded schema.
// Unknown keywords fail: this is not advertised as a general JSON Schema engine.
function schemaAccepts(schema, value, root = schema) {
  const supported = new Set(['$schema','title','$defs','$ref','oneOf','type','additionalProperties','required','properties','items','const','enum','pattern','format','exclusiveMinimum']);
  for (const keyword of Object.keys(schema)) assert.ok(supported.has(keyword), `unsupported schema keyword ${keyword}`);
  if (schema.$ref) {
    assert.match(schema.$ref, /^#\/\$defs\/[A-Z]+$/);
    return schemaAccepts(root.$defs[schema.$ref.split('/').at(-1)], value, root);
  }
  if (schema.oneOf) return schema.oneOf.filter(branch => schemaAccepts(branch, value, root)).length === 1;
  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    if ((schema.required ?? []).some(key => !Object.hasOwn(value, key))) return false;
    for (const key of Object.keys(value)) {
      if (Object.hasOwn(schema.properties ?? {}, key)) { if (!schemaAccepts(schema.properties[key], value[key], root)) return false; }
      else if (schema.additionalProperties === false) return false;
      else assert.fail('unbounded object schema');
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) return false;
    if (schema.items && !value.every(item => schemaAccepts(schema.items, item, root))) return false;
  } else if (schema.type === 'integer') { if (!Number.isSafeInteger(value)) return false; }
  else if (schema.type === 'number') { if (!Number.isFinite(value)) return false; }
  else if (schema.type && typeof value !== schema.type) return false;
  if (schema.pattern && (typeof value !== 'string' || !new RegExp(schema.pattern).test(value))) return false;
  if (schema.format === 'date-time' && (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))) return false;
  if (schema.exclusiveMinimum !== undefined && !(value > schema.exclusiveMinimum)) return false;
  return true;
}
test('all five actual synthetic witness families satisfy the bounded JSON Schema and reject extensions', t => {
  const value = complete(t), state = value.durable.read();
  const schema = JSON.parse(fs.readFileSync(new URL('../schemas/durable-evidence.schema.json', import.meta.url)));
  for (const record of [state.history, state.manifest, state.intent, state.active, state.baseline]) {
    assert.equal(schemaAccepts(schema, record), true, record.evidence_type);
    assert.equal(schemaAccepts(schema, { ...record, unknown: 'rejected' }), false);
    const missing = structuredClone(record); delete missing.schema_version;
    assert.equal(schemaAccepts(schema, missing), false);
    const malformed = structuredClone(record); malformed.witness_sha256 = 'invalid';
    assert.equal(schemaAccepts(schema, malformed), false);
  }
});
