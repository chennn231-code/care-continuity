// Private append-only Foundation evidence. No network, subprocess, deletion or repair.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demand, hash, object, projectId, shape } from './contracts.mjs';

export const ACCEPTED_CHECKPOINT = 'f2f1505a2a950a4270d6616b1196288e163f23f5';
export const LOST_SESSION = 'wwfnd-20260830t060320z-b10f6599de24';
export const HISTORICAL_CONFIG_SHA256 = 'dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684';
export const HISTORICAL_PROFILE_SHA256 = '68fa1b17a24ef293af6dedeea831664f13eead394a3866e0df47416b1bc511ab';
export const RESERVED_PORTS = Object.freeze([59320,59321,59322,59323,59324,59325,59326,59327,59328,59329]);
const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
export const PROVENANCE_PATHS = Object.freeze([
  'tools/winwin/foundation/lib/durable-evidence.mjs',
  'tools/winwin/foundation/lib/reservations.mjs',
  'tools/winwin/foundation/lib/configuration.mjs',
  'tools/winwin/foundation/lib/contracts.mjs',
  'tools/winwin/foundation/lib/auditors.mjs',
  'tools/winwin/foundation/lib/resource-image-prerequisites.mjs',
  'tools/winwin/foundation/establish-baseline.mjs',
  'tools/winwin/foundation/schemas/durable-evidence.schema.json',
  'tools/winwin/foundation/contracts/planned-config-contract.json',
  'tools/winwin/foundation/contracts/resource-expectation-contract.json',
  'docs/winwin/WINWIN_FOUNDATION_SECURITY_CONCURRENCY_FEASIBILITY_SPIKE_DESIGN.md',
  'docs/winwin/WINWIN_FOUNDATION_RESOURCE_ACCEPTANCE_EVIDENCE_RESEARCH_V2.md',
]);
export const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
  : object(value) ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}' : JSON.stringify(value);
export const canonicalBytes = value => Buffer.from(canonical(value) + '\n');
const digest = value => demand(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), 'DURABLE_DIGEST');
const utc = value => demand(typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && new Date(value).toISOString() === value, 'DURABLE_TIMESTAMP');
const equal = (a, b, code) => demand(canonical(a) === canonical(b), code);
export function sealWitness(payload) {
  demand(object(payload) && !Object.hasOwn(payload, 'witness_sha256'), 'DURABLE_PAYLOAD');
  return { ...payload, witness_sha256: hash(canonicalBytes(payload)) };
}
export function toolFingerprints() {
  return Object.fromEntries(PROVENANCE_PATHS.map(name => [name, hash(fs.readFileSync(path.join(REPO, name)))]));
}
export function historicalLoss() {
  return { project_id: LOST_SESSION, state: 'CONTINUITY_LOST', config_sha256: HISTORICAL_CONFIG_SHA256,
    basis: 'FILESYSTEM_ARTIFACTS_MISSING_AFTER_REBOOT_BYTES_REPRODUCIBLE_CONTINUITY_UNPROVEN' };
}

const FIELDS = {
  HISTORY: ['records'],
  MANIFEST: ['created_at_utc','repository_checkpoint','tooling_checkpoint','history_sha256','tool_hashes','reserved_ports'],
  INTENT: ['project_id','created_at_utc','history_sha256','manifest_sha256','state'],
  ACTIVE: ['project_id','created_at_utc','session_root','intent_sha256','ephemeral_record_sha256','filesystem_identity','state'],
  BASELINE: ['project_id','created_at_utc','active_witness_sha256','config_sha256','config_source_sha256','config_contract_sha256',
    'config_bytes','source_path','config_path','session_local_link','effective_profile_sha256','historical_profile_sha256','semantic_profile_sha256','semantic_unchanged'],
};
export function validateWitness(record) {
  demand(object(record) && Object.hasOwn(FIELDS, record.evidence_type), 'DURABLE_TYPE');
  shape(record, ['schema_version','evidence_type','witness_sha256',...FIELDS[record.evidence_type]]);
  demand(record.schema_version === '1', 'DURABLE_VERSION');
  const { witness_sha256, ...payload } = record;
  digest(witness_sha256); demand(hash(canonicalBytes(payload)) === witness_sha256, 'DURABLE_HASH_MISMATCH');
  if (record.project_id !== undefined) projectId(record.project_id);
  if (record.created_at_utc !== undefined) utc(record.created_at_utc);
  for (const [key, value] of Object.entries(record)) if (key.endsWith('_sha256')) digest(value);
  if (record.evidence_type === 'HISTORY') {
    demand(Array.isArray(record.records), 'DURABLE_HISTORY');
    const ids = new Set();
    for (const row of record.records) {
      shape(row, ['project_id','state','config_sha256','basis']); projectId(row.project_id); digest(row.config_sha256);
      demand(['CONTINUITY_LOST','ACTIVE','ENDED'].includes(row.state), 'DURABLE_HISTORY_STATE');
      demand(['HISTORICAL_ATTESTATION','FILESYSTEM_ARTIFACTS_MISSING_AFTER_REBOOT_BYTES_REPRODUCIBLE_CONTINUITY_UNPROVEN'].includes(row.basis), 'DURABLE_HISTORY_BASIS');
      demand(!ids.has(row.project_id), 'DURABLE_HISTORY_DUPLICATE'); ids.add(row.project_id);
      if (row.project_id === LOST_SESSION) equal(row, historicalLoss(), 'DURABLE_LOST_HISTORY_DRIFT');
    }
  } else if (record.evidence_type === 'MANIFEST') {
    demand(record.repository_checkpoint === ACCEPTED_CHECKPOINT && /^[a-f0-9]{40}$/.test(record.tooling_checkpoint), 'DURABLE_CHECKPOINT');
    shape(record.tool_hashes, PROVENANCE_PATHS); Object.values(record.tool_hashes).forEach(digest);
    equal(record.reserved_ports, RESERVED_PORTS, 'DURABLE_PORT_POLICY');
  } else if (record.evidence_type === 'INTENT') {
    demand(record.state === 'PREPARING', 'DURABLE_INTENT_STATE');
  } else if (record.evidence_type === 'ACTIVE') {
    demand(record.state === 'ACTIVE' && path.isAbsolute(record.session_root) && /^winwin-fnd-spike\.[a-f0-9]{8}$/.test(path.basename(record.session_root)), 'DURABLE_ACTIVE');
    shape(record.filesystem_identity, ['session_directory','active_entry']);
    for (const value of Object.values(record.filesystem_identity)) {
      shape(value, ['device','inode','birthtime_ms']);
      demand(Number.isSafeInteger(value.device) && Number.isSafeInteger(value.inode) && Number.isFinite(value.birthtime_ms) && value.birthtime_ms > 0, 'DURABLE_FILESYSTEM_IDENTITY');
    }
  } else {
    demand(record.config_sha256 === record.config_source_sha256 && record.config_bytes === 436, 'DURABLE_CONFIG_BYTES');
    demand(path.isAbsolute(record.source_path) && path.isAbsolute(record.config_path), 'DURABLE_CONFIG_PATH');
    shape(record.session_local_link, ['device','inode','link_count','mode']);
    const link = record.session_local_link;
    demand(Number.isSafeInteger(link.device) && Number.isSafeInteger(link.inode) && link.link_count === 2 && link.mode === '0600', 'DURABLE_LOCAL_LINK');
    demand(record.historical_profile_sha256 === HISTORICAL_PROFILE_SHA256 && record.semantic_unchanged === true, 'DURABLE_PROFILE_DRIFT');
  }
  return record;
}

export function syncDirectory(directory) {
  const fd = fs.openSync(directory, fs.constants.O_RDONLY);
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function safeDirectory(directory) {
  const stat = fs.lstatSync(directory);
  demand(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700 && stat.uid === process.getuid(), 'DURABLE_DIRECTORY');
  demand(fs.realpathSync(directory) === directory, 'DURABLE_CANONICAL');
}
function mkdir(directory) {
  fs.mkdirSync(directory, { mode: 0o700 }); safeDirectory(directory); syncDirectory(path.dirname(directory));
}
function pairNames(name) { return ['.' + name + '.pending', name]; }
function publish(directory, name, payload, fault) {
  safeDirectory(directory);
  const witness = sealWitness({ schema_version: '1', ...payload }); validateWitness(witness);
  if (fault) fault(name);
  const [pending, final] = pairNames(name).map(part => path.join(directory, part));
  const fd = fs.openSync(pending, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
  try { fs.writeFileSync(fd, canonicalBytes(witness)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.linkSync(pending, final); syncDirectory(directory);
  return readPair(directory, name);
}
function readPair(directory, name) {
  const files = pairNames(name).map(part => path.join(directory, part));
  const stats = files.map(file => {
    const stat = fs.lstatSync(file);
    demand(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o600 && stat.uid === process.getuid() && stat.nlink === 2 && stat.size <= 65536, 'DURABLE_FILE');
    return stat;
  });
  demand(stats[0].ino === stats[1].ino && stats[0].dev === stats[1].dev, 'DURABLE_PUBLICATION');
  const bytes = fs.readFileSync(files[1]), record = validateWitness(JSON.parse(bytes));
  demand(bytes.equals(canonicalBytes(record)), 'DURABLE_ENCODING');
  return record;
}
function directoryEntries(directory, files, directories = []) {
  safeDirectory(directory);
  equal(fs.readdirSync(directory).sort(), [...files.flatMap(pairNames), ...directories].sort(), 'DURABLE_PARTIAL_OR_UNKNOWN_ENTRY');
}

function store(root, production, fault = null) {
  const attempt = path.join(root, 'reservation-attempt');
  const bootstrap = root + '.bootstrap';
  const receiptAttempt = path.join(bootstrap, 'reservation-attempt');
  function read() {
    // Absence is never first-use. Only explicit initialize may bootstrap.
    demand(fs.existsSync(root), 'DURABLE_STATE_MISSING');
    directoryEntries(root, ['history.json','manifest.json'], fs.existsSync(attempt) ? ['reservation-attempt'] : []);
    const history = readPair(root, 'history.json'), manifest = readPair(root, 'manifest.json');
    directoryEntries(bootstrap, ['manifest.json'], fs.existsSync(attempt) ? ['reservation-attempt'] : []);
    equal(readPair(bootstrap, 'manifest.json'), manifest, 'DURABLE_BOOTSTRAP_BINDING');
    demand(history.evidence_type === 'HISTORY' && manifest.evidence_type === 'MANIFEST', 'DURABLE_ROOT_TYPE');
    demand(history.witness_sha256 === manifest.history_sha256, 'DURABLE_HISTORY_BINDING');
    equal(manifest.tool_hashes, toolFingerprints(), 'DURABLE_TOOL_DRIFT');
    if (production) demand(history.records.some(row => row.project_id === LOST_SESSION), 'DURABLE_LOST_WITNESS_REQUIRED');
    if (!fs.existsSync(attempt)) return { history, manifest, intent: null, active: null, baseline: null };
    const hasActive = fs.existsSync(path.join(attempt, 'active.json'));
    const hasBaseline = fs.existsSync(path.join(attempt, 'baseline.json'));
    directoryEntries(attempt, ['intent.json', ...(hasActive ? ['active.json'] : []), ...(hasBaseline ? ['baseline.json'] : [])]);
    directoryEntries(receiptAttempt, ['intent.json', ...(hasActive ? ['active.json'] : []), ...(hasBaseline ? ['baseline.json'] : [])]);
    const intent = readPair(attempt, 'intent.json');
    equal(readPair(receiptAttempt, 'intent.json'), intent, 'DURABLE_RECEIPT_BINDING');
    demand(intent.evidence_type === 'INTENT' && intent.manifest_sha256 === manifest.witness_sha256 && intent.history_sha256 === history.witness_sha256, 'DURABLE_INTENT_BINDING');
    demand(intent.project_id !== LOST_SESSION && !history.records.some(row => row.project_id === intent.project_id), 'DURABLE_ID_REUSE');
    const active = hasActive ? readPair(attempt, 'active.json') : null;
    if (active) equal(readPair(receiptAttempt, 'active.json'), active, 'DURABLE_RECEIPT_BINDING');
    if (active) demand(active.evidence_type === 'ACTIVE' && active.intent_sha256 === intent.witness_sha256 && active.project_id === intent.project_id, 'DURABLE_ACTIVE_BINDING');
    const baseline = hasBaseline ? readPair(attempt, 'baseline.json') : null;
    if (baseline) equal(readPair(receiptAttempt, 'baseline.json'), baseline, 'DURABLE_RECEIPT_BINDING');
    if (baseline) demand(active && baseline.evidence_type === 'BASELINE' && baseline.project_id === active.project_id && baseline.active_witness_sha256 === active.witness_sha256 && baseline.source_path === path.join(active.session_root, 'evidence-private/config-materialization.source.toml') && baseline.config_path === path.join(active.session_root, 'project/supabase/config.toml'), 'DURABLE_BASELINE_BINDING');
    return { history, manifest, intent, active, baseline };
  }
  function assertAvailable(state, candidate) {
    demand(candidate.project_id !== LOST_SESSION && !state.history.records.some(row => row.project_id === candidate.project_id), 'DURABLE_ID_REUSE');
    demand(!state.history.records.some(row => row.state === 'ACTIVE'), 'DURABLE_HISTORICAL_ACTIVE');
    demand(!state.intent, 'DURABLE_ATTEMPT_ALREADY_EXISTS');
  }
  function verifyEphemeral(index) {
    const state = read();
    if (!state.intent) {
      demand(!state.history.records.some(row => row.state === 'ACTIVE'), 'DURABLE_HISTORICAL_ACTIVE');
      demand(index.entry_count === 0 && index.index_state === 'ABSENT', 'DURABLE_UNBOUND_EPHEMERAL');
      // This is a historical-only, non-authoritative view; never an empty first-use ledger.
      return { ...index, durable_history_sha256: state.history.witness_sha256, durable_history_count: state.history.records.length };
    }
    demand(state.active, 'DURABLE_PARTIAL_RESERVATION');
    demand(index.index_state === 'PRESENT' && index.active.length === 1 && index.ended.length === 0, 'DURABLE_EPHEMERAL_MISSING');
    const active = index.active[0];
    demand(active.project_id === state.active.project_id && active.session_root === state.active.session_root && hash(canonicalBytes(active)) === state.active.ephemeral_record_sha256, 'DURABLE_EPHEMERAL_MISMATCH');
    equal(index.filesystem_identity, state.active.filesystem_identity, 'DURABLE_FILESYSTEM_CONTINUITY_LOST');
    return { ...index, durable_witness_sha256: state.active.witness_sha256, durable_baseline: state.baseline,
      durable_history_sha256: state.history.witness_sha256, durable_history_count: state.history.records.length };
  }
  return Object.freeze({
    root, read, verifyEphemeral,
    initialize({ toolingCheckpoint, createdAtUtc, records = [historicalLoss()] }) {
      utc(createdAtUtc); demand(/^[a-f0-9]{40}$/.test(toolingCheckpoint), 'DURABLE_CHECKPOINT');
      if (production) equal(records, [historicalLoss()], 'DURABLE_BOOTSTRAP_HISTORY');
      demand(!fs.existsSync(root), 'DURABLE_ROOT_EXISTS');
      // A separate persistent bootstrap receipt prevents reinitializing a lost root.
      demand(!fs.existsSync(bootstrap), 'DURABLE_BOOTSTRAP_ALREADY_EXISTS');
      mkdir(bootstrap);
      mkdir(root);
      const history = publish(root, 'history.json', { evidence_type: 'HISTORY', records }, fault);
      const manifestPayload = { evidence_type: 'MANIFEST', created_at_utc: createdAtUtc, repository_checkpoint: ACCEPTED_CHECKPOINT,
        tooling_checkpoint: toolingCheckpoint, history_sha256: history.witness_sha256, tool_hashes: toolFingerprints(), reserved_ports: [...RESERVED_PORTS] };
      publish(root, 'manifest.json', manifestPayload, fault);
      publish(bootstrap, 'manifest.json', manifestPayload, fault);
      return read();
    },
    claim(candidate) {
      const state = read(); assertAvailable(state, candidate);
      // One durable mutex/intent, never removed or retried after partial creation.
      mkdir(receiptAttempt);
      mkdir(attempt);
      const payload = { evidence_type: 'INTENT', project_id: candidate.project_id,
        created_at_utc: candidate.generated_at_utc, history_sha256: state.history.witness_sha256, manifest_sha256: state.manifest.witness_sha256, state: 'PREPARING' };
      const witness = publish(attempt, 'intent.json', payload, fault);
      publish(receiptAttempt, 'intent.json', payload, fault);
      return witness;
    },
    publishActive(record, filesystemIdentity) {
      const state = read();
      demand(state.intent && !state.active && state.intent.project_id === record.project_id, 'DURABLE_ACTIVE_PRECONDITION');
      const payload = { evidence_type: 'ACTIVE', project_id: record.project_id, created_at_utc: record.created_at_utc,
        session_root: record.session_root, intent_sha256: state.intent.witness_sha256, ephemeral_record_sha256: hash(canonicalBytes(record)), filesystem_identity: filesystemIdentity, state: 'ACTIVE' };
      const witness = publish(attempt, 'active.json', payload, fault);
      publish(receiptAttempt, 'active.json', payload, fault);
      return witness;
    },
    publishBaseline(payload) {
      const state = read(); demand(state.active && !state.baseline && payload.project_id === state.active.project_id, 'DURABLE_BASELINE_PRECONDITION');
      const record = { ...payload, evidence_type: 'BASELINE', active_witness_sha256: state.active.witness_sha256 };
      publish(attempt, 'baseline.json', record, fault);
      publish(receiptAttempt, 'baseline.json', record, fault);
      return read().baseline;
    },
  });
}

export function productionDurableRoot() {
  demand(process.platform === 'darwin', 'DURABLE_HOST_PLATFORM');
  // OS account directory, not an environment-controlled destination.
  return path.join(os.userInfo().homedir, 'Library', 'Application Support', 'WinWin', 'Foundation', 'evidence-v1');
}
export function foundationDurableStore() { return store(productionDurableRoot(), true); }
export function initializeProductionDurableEvidence(context) {
  const root = productionDurableRoot();
  const support = path.dirname(path.dirname(path.dirname(root)));
  demand(fs.realpathSync(support) === support && fs.statSync(support).uid === process.getuid(), 'DURABLE_HOST_PARENT');
  for (const directory of [path.join(support, 'WinWin'), path.join(support, 'WinWin', 'Foundation')]) {
    if (fs.existsSync(directory)) safeDirectory(directory); else mkdir(directory);
  }
  return foundationDurableStore().initialize(context);
}
export function syntheticDurableStore(ownerRoot, fault = null) {
  safeDirectory(ownerRoot);
  demand(fs.realpathSync(path.dirname(ownerRoot)) === fs.realpathSync(os.tmpdir()) && path.basename(ownerRoot).startsWith('winwin-foundation-reservation-test.'), 'DURABLE_SYNTHETIC_SCOPE');
  return store(path.join(ownerRoot, 'durable-evidence-v1'), false, fault);
}
