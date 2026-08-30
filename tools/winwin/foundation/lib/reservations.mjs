// Foundation Gate 6A reservation persistence. No Docker, Supabase, shell, SQL or cleanup.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ContractError, demand, hash, object, parseJSON, projectId, shape } from './contracts.mjs';

export const RESERVATION_PURPOSE = 'IA-3A_SCHEMA_RUNTIME_VALIDATION';
export const RESERVATION_SCHEMA_VERSION = '1';
export const PRODUCTION_RESERVATION_PARENT = '/private/tmp';
export const PRODUCTION_INDEX_ROOT = '/private/tmp/winwin-foundation-reservation-index-v1';

const PURPOSE_FILE = 'ia-3a-schema-runtime-validation.json';
const SESSION_PREFIX = 'winwin-fnd-spike.';
const TEST_ROOT_PREFIX = 'winwin-foundation-reservation-test.';
const EVIDENCE_FILES = Object.freeze({
  identity: 'session-identity.json',
  reservation: 'session-reservation.json',
  collision: 'collision.json',
});
const SECRET_KEY = /(password|secret|token|jwt|key|credential|database_url|connection_string)/i;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SCOPE_BRAND = Symbol('foundation-reservation-scope');

const canonical = value => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
};
const jsonBytes = value => Buffer.from(canonical(value) + '\n', 'utf8');
const mode = stat => stat.mode & 0o777;
const timestamp = value => {
  demand(typeof value === 'string' && ISO_UTC.test(value) && new Date(value).toISOString() === value, 'RESERVATION_TIMESTAMP');
  return value;
};
const exactKeys = (value, keys, code) => {
  demand(object(value), code);
  try { shape(value, keys); } catch { throw new ContractError(code); }
  return value;
};
const noSecretKeys = value => {
  if (Array.isArray(value)) value.forEach(noSecretKeys);
  else if (object(value)) for (const [key, child] of Object.entries(value)) {
    demand(!SECRET_KEY.test(key), 'SECRET_CAPABLE_EVIDENCE_FIELD');
    noSecretKeys(child);
  }
};
const safePurpose = value => demand(value === RESERVATION_PURPOSE, 'RESERVATION_PURPOSE');

function makeScope(reservationParent, indexRoot, kind) {
  demand(path.isAbsolute(reservationParent) && path.isAbsolute(indexRoot), 'RESERVATION_SCOPE_ABSOLUTE');
  demand(path.dirname(indexRoot) === reservationParent, 'RESERVATION_INDEX_PARENT');
  return Object.freeze({ reservationParent, indexRoot, kind, [SCOPE_BRAND]: true });
}

const PRODUCTION_SCOPE = makeScope(PRODUCTION_RESERVATION_PARENT, PRODUCTION_INDEX_ROOT, 'PRODUCTION');

function validateScope(scope) {
  demand(scope?.[SCOPE_BRAND] === true, 'UNAPPROVED_RESERVATION_SCOPE');
  if (scope.kind === 'PRODUCTION') demand(scope === PRODUCTION_SCOPE, 'PRODUCTION_SCOPE_SUBSTITUTION');
  else {
    demand(scope.kind === 'SYNTHETIC_TEST', 'RESERVATION_SCOPE_KIND');
    const testRoot = path.dirname(scope.reservationParent);
    demand(fs.realpathSync(path.dirname(testRoot)) === fs.realpathSync(os.tmpdir()), 'SYNTHETIC_SCOPE_PARENT');
    demand(path.basename(testRoot).startsWith(TEST_ROOT_PREFIX), 'SYNTHETIC_SCOPE_NAME');
  }
}

function safeDirectory(directory, expectedMode = 0o700) {
  try {
    const stat = fs.lstatSync(directory);
    demand(stat.isDirectory() && !stat.isSymbolicLink() && mode(stat) === expectedMode, 'RESERVATION_DIRECTORY_SAFETY');
    demand(fs.realpathSync(directory) === directory, 'RESERVATION_DIRECTORY_CANONICAL');
  } catch (error) {
    if (error instanceof ContractError) throw error;
    throw new ContractError('RESERVATION_DIRECTORY_SAFETY');
  }
}

function safeFile(file, expectedMode = 0o600) {
  try {
    const stat = fs.lstatSync(file);
    demand(stat.isFile() && !stat.isSymbolicLink() && mode(stat) === expectedMode && stat.size <= 65536, 'RESERVATION_FILE_SAFETY');
  } catch (error) {
    if (error instanceof ContractError) throw error;
    throw new ContractError('RESERVATION_FILE_SAFETY');
  }
}

function validateSessionRoot(scope, sessionRoot, requireExisting) {
  demand(typeof sessionRoot === 'string' && path.isAbsolute(sessionRoot), 'SESSION_ROOT_PATH');
  demand(path.dirname(sessionRoot) === scope.reservationParent, 'SESSION_ROOT_PARENT');
  demand(new RegExp('^' + SESSION_PREFIX.replace('.', '\\.') + '[A-Za-z0-9]{8}$').test(path.basename(sessionRoot)), 'SESSION_ROOT_NAME');
  if (requireExisting) {
    safeDirectory(sessionRoot);
    for (const child of ['project', 'evidence-private', 'evidence-sanitized', 'bin']) safeDirectory(path.join(sessionRoot, child));
  }
  return sessionRoot;
}

function validateIdentityEvidence(value) {
  exactKeys(value, ['ascii', 'byte_count', 'candidate_state', 'evidence_type', 'format', 'generated_at_utc', 'project_id', 'purpose', 'schema_version'], 'IDENTITY_EVIDENCE_SCHEMA');
  demand(value.schema_version === RESERVATION_SCHEMA_VERSION && value.evidence_type === 'FOUNDATION_SESSION_IDENTITY', 'IDENTITY_EVIDENCE_TYPE');
  safePurpose(value.purpose); projectId(value.project_id); timestamp(value.generated_at_utc);
  demand(value.byte_count === 35 && value.ascii === true && value.format === 'FROZEN_35_BYTE_ASCII' && value.candidate_state === 'VALIDATED_NOT_RESERVED', 'IDENTITY_EVIDENCE_VALUE');
  noSecretKeys(value); return value;
}

function validateReservationEvidence(value, scope) {
  exactKeys(value, ['acceptance_authority', 'created_at_utc', 'evidence_type', 'project_id', 'purpose', 'requested_state', 'schema_version', 'session_root'], 'RESERVATION_EVIDENCE_SCHEMA');
  demand(value.schema_version === RESERVATION_SCHEMA_VERSION && value.evidence_type === 'FOUNDATION_SESSION_RESERVATION', 'RESERVATION_EVIDENCE_TYPE');
  safePurpose(value.purpose); projectId(value.project_id); timestamp(value.created_at_utc);
  validateSessionRoot(scope, value.session_root, true);
  demand(value.requested_state === 'ACTIVE' && value.acceptance_authority === 'ACTIVE_INDEX_ENTRY_REQUIRED', 'RESERVATION_EVIDENCE_VALUE');
  noSecretKeys(value); return value;
}

function validateCollisionEvidence(value) {
  exactKeys(value, ['checked_at_utc', 'collision_result', 'decision', 'evidence_type', 'freshness_result', 'metadata_entry_count', 'metadata_index_sha256', 'project_id', 'purpose', 'schema_version'], 'COLLISION_EVIDENCE_SCHEMA');
  demand(value.schema_version === RESERVATION_SCHEMA_VERSION && value.evidence_type === 'FOUNDATION_SESSION_COLLISION', 'COLLISION_EVIDENCE_TYPE');
  safePurpose(value.purpose); projectId(value.project_id); timestamp(value.checked_at_utc);
  demand(value.freshness_result === 'FRESH-QUALIFIED' && value.collision_result === 'PASS' && value.decision === 'RESERVATION_ALLOWED', 'COLLISION_EVIDENCE_VALUE');
  demand(Number.isSafeInteger(value.metadata_entry_count) && value.metadata_entry_count >= 0 && /^[0-9a-f]{64}$/.test(value.metadata_index_sha256), 'COLLISION_EVIDENCE_INDEX');
  noSecretKeys(value); return value;
}

function validateEvidenceHashes(value) {
  exactKeys(value, ['collision_sha256', 'session_identity_sha256', 'session_reservation_sha256'], 'RESERVATION_HASH_SCHEMA');
  for (const digest of Object.values(value)) demand(typeof digest === 'string' && /^[0-9a-f]{64}$/.test(digest), 'RESERVATION_HASH');
  return value;
}

function validateActiveRecord(value, scope, verifyEvidence = true) {
  exactKeys(value, ['created_at_utc', 'evidence', 'project_id', 'purpose', 'record_type', 'reservation_state', 'schema_version', 'session_root'], 'ACTIVE_RESERVATION_SCHEMA');
  demand(value.schema_version === RESERVATION_SCHEMA_VERSION && value.record_type === 'FOUNDATION_ACTIVE_SESSION_RESERVATION' && value.reservation_state === 'ACTIVE', 'ACTIVE_RESERVATION_TYPE');
  safePurpose(value.purpose); projectId(value.project_id); timestamp(value.created_at_utc); validateEvidenceHashes(value.evidence);
  validateSessionRoot(scope, value.session_root, verifyEvidence);
  if (verifyEvidence) {
    const evidenceRoot = path.join(value.session_root, 'evidence-sanitized');
    const files = {
      session_identity_sha256: path.join(evidenceRoot, EVIDENCE_FILES.identity),
      session_reservation_sha256: path.join(evidenceRoot, EVIDENCE_FILES.reservation),
      collision_sha256: path.join(evidenceRoot, EVIDENCE_FILES.collision),
    };
    for (const [field, file] of Object.entries(files)) {
      safeFile(file);
      const bytes = fs.readFileSync(file);
      demand(hash(bytes) === value.evidence[field], 'RESERVATION_EVIDENCE_HASH_MISMATCH');
      const parsed = parseJSON(bytes);
      if (field === 'session_identity_sha256') validateIdentityEvidence(parsed);
      else if (field === 'session_reservation_sha256') validateReservationEvidence(parsed, scope);
      else validateCollisionEvidence(parsed);
      demand(parsed.project_id === value.project_id, 'RESERVATION_EVIDENCE_ID_MISMATCH');
    }
  }
  noSecretKeys(value); return value;
}

function validateEndedRecord(value, scope) {
  exactKeys(value, ['created_at_utc', 'ended_at_utc', 'end_reason', 'project_id', 'purpose', 'record_type', 'reservation_state', 'schema_version', 'session_root'], 'ENDED_RESERVATION_SCHEMA');
  demand(value.schema_version === RESERVATION_SCHEMA_VERSION && value.record_type === 'FOUNDATION_ENDED_SESSION_RESERVATION' && value.reservation_state === 'ENDED', 'ENDED_RESERVATION_TYPE');
  safePurpose(value.purpose); projectId(value.project_id); timestamp(value.created_at_utc); timestamp(value.ended_at_utc);
  demand(new Date(value.ended_at_utc) > new Date(value.created_at_utc), 'ENDED_RESERVATION_ORDER');
  demand(typeof value.end_reason === 'string' && /^[A-Z][A-Z0-9_]{0,99}$/.test(value.end_reason), 'ENDED_RESERVATION_REASON');
  validateSessionRoot(scope, value.session_root, false); noSecretKeys(value); return value;
}

function readJsonFile(file) {
  safeFile(file);
  return parseJSON(fs.readFileSync(file));
}

function emptyIndex() {
  const entries = [];
  return { result: 'PASS', index_state: 'ABSENT', active: [], ended: [], entries, entry_count: 0, index_sha256: hash(Buffer.from(canonical(entries))) };
}

function readIndex(scope) {
  validateScope(scope);
  if (!fs.existsSync(scope.indexRoot)) return emptyIndex();
  safeDirectory(scope.indexRoot);
  const allowedRootEntries = ['active', 'ended', 'index-manifest.json'];
  const rootEntries = fs.readdirSync(scope.indexRoot).sort();
  demand(JSON.stringify(rootEntries) === JSON.stringify(allowedRootEntries), 'RESERVATION_INDEX_ROOT_ENTRIES');
  const manifest = readJsonFile(path.join(scope.indexRoot, 'index-manifest.json'));
  exactKeys(manifest, ['created_at_utc', 'index_type', 'purpose', 'schema_version'], 'RESERVATION_INDEX_MANIFEST');
  demand(manifest.schema_version === RESERVATION_SCHEMA_VERSION && manifest.index_type === 'FOUNDATION_SESSION_RESERVATION_INDEX', 'RESERVATION_INDEX_MANIFEST_TYPE');
  safePurpose(manifest.purpose); timestamp(manifest.created_at_utc); noSecretKeys(manifest);
  const activeRoot = path.join(scope.indexRoot, 'active'), endedRoot = path.join(scope.indexRoot, 'ended');
  safeDirectory(activeRoot); safeDirectory(endedRoot);
  const activeNames = fs.readdirSync(activeRoot).sort();
  demand(activeNames.length <= 1 && activeNames.every(name => name === PURPOSE_FILE), 'ACTIVE_RESERVATION_AMBIGUITY');
  const active = activeNames.map(name => validateActiveRecord(readJsonFile(path.join(activeRoot, name)), scope));
  const endedNames = fs.readdirSync(endedRoot).sort();
  const ended = endedNames.map(name => {
    demand(/^wwfnd-[0-9]{8}t[0-9]{6}z-[0-9a-f]{12}\.json$/.test(name), 'ENDED_RESERVATION_FILENAME');
    const record = validateEndedRecord(readJsonFile(path.join(endedRoot, name)), scope);
    demand(name === record.project_id + '.json', 'ENDED_RESERVATION_FILENAME_MISMATCH');
    return record;
  });
  const entries = [...active, ...ended].sort((a, b) => a.project_id < b.project_id ? -1 : a.project_id > b.project_id ? 1 : 0);
  const ids = new Set(), roots = new Set();
  for (const entry of entries) {
    demand(!ids.has(entry.project_id) && !roots.has(entry.session_root), 'RESERVATION_INDEX_AMBIGUITY');
    ids.add(entry.project_id); roots.add(entry.session_root);
  }
  return { result: 'PASS', index_state: 'PRESENT', active, ended, entries, entry_count: entries.length, index_sha256: hash(Buffer.from(canonical(entries))) };
}

function writeExclusiveJson(file, value) {
  noSecretKeys(value);
  const bytes = jsonBytes(value);
  const descriptor = fs.openSync(file, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
  try { fs.writeFileSync(descriptor, bytes); fs.fsyncSync(descriptor); }
  finally { fs.closeSync(descriptor); }
  safeFile(file);
  return { bytes, sha256: hash(bytes) };
}

function createSessionRoot(scope, randomBytes) {
  const suffix = randomBytes(4);
  demand(Buffer.isBuffer(suffix) && suffix.length === 4, 'SESSION_ROOT_RANDOM');
  const sessionRoot = path.join(scope.reservationParent, SESSION_PREFIX + suffix.toString('hex'));
  fs.mkdirSync(sessionRoot, { mode: 0o700 });
  safeDirectory(sessionRoot);
  return sessionRoot;
}

function ensureIndex(scope, createdAtUtc) {
  if (fs.existsSync(scope.indexRoot)) return readIndex(scope);
  fs.mkdirSync(scope.indexRoot, { mode: 0o700 });
  safeDirectory(scope.indexRoot);
  fs.mkdirSync(path.join(scope.indexRoot, 'active'), { mode: 0o700 });
  fs.mkdirSync(path.join(scope.indexRoot, 'ended'), { mode: 0o700 });
  writeExclusiveJson(path.join(scope.indexRoot, 'index-manifest.json'), {
    schema_version: RESERVATION_SCHEMA_VERSION,
    index_type: 'FOUNDATION_SESSION_RESERVATION_INDEX',
    purpose: RESERVATION_PURPOSE,
    created_at_utc: createdAtUtc,
  });
  return readIndex(scope);
}

function validateCandidate(candidate) {
  exactKeys(candidate, ['generated_at_utc', 'project_id'], 'RESERVATION_CANDIDATE_SCHEMA');
  projectId(candidate.project_id); timestamp(candidate.generated_at_utc);
  const compact = candidate.generated_at_utc.replace(/[-:]/g, '').replace('T', 't').replace(/\.\d{3}Z$/, 'z');
  demand(candidate.project_id.slice(6, 22) === compact, 'RESERVATION_CANDIDATE_TIME');
  return candidate;
}

function generateCandidate(clock, randomBytes) {
  const now = clock();
  demand(now instanceof Date && Number.isFinite(now.getTime()), 'RESERVATION_CLOCK');
  const random = randomBytes(6);
  demand(Buffer.isBuffer(random) && random.length === 6, 'RESERVATION_RANDOM');
  const generatedAt = now.toISOString();
  const compact = generatedAt.replace(/[-:]/g, '').replace('T', 't').replace(/\.\d{3}Z$/, 'z');
  const candidate = { project_id: `wwfnd-${compact}-${random.toString('hex')}`, generated_at_utc: generatedAt };
  return validateCandidate(candidate);
}

function reserve(scope, candidate, decision, clock, randomBytes, beforeActiveLink = null) {
  validateScope(scope); validateCandidate(candidate);
  exactKeys(decision, ['checked_at_utc', 'collision_result', 'expected_entry_count', 'expected_index_sha256', 'freshness_result'], 'RESERVATION_DECISION_SCHEMA');
  timestamp(decision.checked_at_utc);
  demand(decision.freshness_result === 'FRESH-QUALIFIED' && decision.collision_result === 'PASS', 'RESERVATION_DECISION_REJECTED');
  demand(Number.isSafeInteger(decision.expected_entry_count) && decision.expected_entry_count >= 0 && /^[0-9a-f]{64}$/.test(decision.expected_index_sha256), 'RESERVATION_DECISION_INDEX');
  const before = readIndex(scope);
  demand(before.index_sha256 === decision.expected_index_sha256 && before.entry_count === decision.expected_entry_count, 'RESERVATION_INDEX_DRIFT');
  demand(before.active.length === 0, 'ACTIVE_RESERVATION_EXISTS');
  demand(!before.entries.some(entry => entry.project_id === candidate.project_id), 'RESERVATION_ID_REUSE');
  const createdAt = clock().toISOString(); timestamp(createdAt);
  demand(new Date(createdAt) >= new Date(candidate.generated_at_utc) && new Date(createdAt) >= new Date(decision.checked_at_utc), 'RESERVATION_TIME_ORDER');
  const initialized = ensureIndex(scope, createdAt);
  demand(initialized.active.length === 0 && !initialized.entries.some(entry => entry.project_id === candidate.project_id), 'RESERVATION_INDEX_CHANGED');
  const sessionRoot = createSessionRoot(scope, randomBytes);
  for (const child of ['project', 'evidence-private', 'evidence-sanitized', 'bin']) {
    fs.mkdirSync(path.join(sessionRoot, child), { mode: 0o700 });
    safeDirectory(path.join(sessionRoot, child));
  }
  const identityEvidence = {
    schema_version: RESERVATION_SCHEMA_VERSION, evidence_type: 'FOUNDATION_SESSION_IDENTITY', purpose: RESERVATION_PURPOSE,
    project_id: candidate.project_id, generated_at_utc: candidate.generated_at_utc, byte_count: 35, ascii: true,
    format: 'FROZEN_35_BYTE_ASCII', candidate_state: 'VALIDATED_NOT_RESERVED',
  };
  const reservationEvidence = {
    schema_version: RESERVATION_SCHEMA_VERSION, evidence_type: 'FOUNDATION_SESSION_RESERVATION', purpose: RESERVATION_PURPOSE,
    project_id: candidate.project_id, session_root: sessionRoot, created_at_utc: createdAt, requested_state: 'ACTIVE',
    acceptance_authority: 'ACTIVE_INDEX_ENTRY_REQUIRED',
  };
  const collisionEvidence = {
    schema_version: RESERVATION_SCHEMA_VERSION, evidence_type: 'FOUNDATION_SESSION_COLLISION', purpose: RESERVATION_PURPOSE,
    project_id: candidate.project_id, checked_at_utc: decision.checked_at_utc, freshness_result: decision.freshness_result,
    collision_result: decision.collision_result, metadata_index_sha256: before.index_sha256,
    metadata_entry_count: before.entry_count, decision: 'RESERVATION_ALLOWED',
  };
  validateIdentityEvidence(identityEvidence); validateReservationEvidence(reservationEvidence, scope); validateCollisionEvidence(collisionEvidence);
  const sanitizedRoot = path.join(sessionRoot, 'evidence-sanitized');
  const identity = writeExclusiveJson(path.join(sanitizedRoot, EVIDENCE_FILES.identity), identityEvidence);
  const reservation = writeExclusiveJson(path.join(sanitizedRoot, EVIDENCE_FILES.reservation), reservationEvidence);
  const collision = writeExclusiveJson(path.join(sanitizedRoot, EVIDENCE_FILES.collision), collisionEvidence);
  const activeRecord = {
    schema_version: RESERVATION_SCHEMA_VERSION, record_type: 'FOUNDATION_ACTIVE_SESSION_RESERVATION', purpose: RESERVATION_PURPOSE,
    project_id: candidate.project_id, session_root: sessionRoot, created_at_utc: createdAt, reservation_state: 'ACTIVE',
    evidence: { session_identity_sha256: identity.sha256, session_reservation_sha256: reservation.sha256, collision_sha256: collision.sha256 },
  };
  validateActiveRecord(activeRecord, scope);
  const stagingFile = path.join(sessionRoot, 'evidence-private', 'active-index-entry.pending.json');
  writeExclusiveJson(stagingFile, activeRecord);
  if (beforeActiveLink) beforeActiveLink();
  const activeFile = path.join(scope.indexRoot, 'active', PURPOSE_FILE);
  fs.linkSync(stagingFile, activeFile);
  const after = readIndex(scope);
  demand(after.active.length === 1 && after.active[0].project_id === candidate.project_id, 'RESERVATION_ACCEPTANCE_MISSING');
  return { result: 'PASS', project_id: candidate.project_id, session_root: sessionRoot, reservation_state: 'ACTIVE', created_at_utc: createdAt, index_sha256: after.index_sha256, evidence: activeRecord.evidence };
}

function service(scope, { clock = () => new Date(), randomBytes = size => crypto.randomBytes(size), beforeActiveLink = null } = {}) {
  validateScope(scope);
  return Object.freeze({
    generateCandidate: () => generateCandidate(clock, randomBytes),
    readIndex: () => readIndex(scope),
    reserve: (candidate, decision) => reserve(scope, candidate, decision, clock, randomBytes, beforeActiveLink),
  });
}

export function foundationReservationService() {
  return service(PRODUCTION_SCOPE);
}

export function syntheticReservationHarness(options = {}) {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), TEST_ROOT_PREFIX));
  fs.chmodSync(parent, 0o700);
  const sessions = path.join(parent, 'sessions');
  fs.mkdirSync(sessions, { mode: 0o700 });
  const scope = makeScope(sessions, path.join(sessions, 'reservation-index-v1'), 'SYNTHETIC_TEST');
  return Object.freeze({ root: parent, sessions, indexRoot: scope.indexRoot, service: service(scope, options) });
}

export const reservationEvidenceFiles = EVIDENCE_FILES;
