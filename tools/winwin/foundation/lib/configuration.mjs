// Foundation Gate 6B pre-start configuration tooling. No runtime, shell, network, SQL or environment access.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { CONFIG, effectiveInputs } from './auditors.mjs';
import { ContractError, demand, hash, object, parseJSON, projectId, shape } from './contracts.mjs';
import { foundationReservationService } from './reservations.mjs';

export const CONFIG_CONTRACT_SCHEMA_VERSION = '1';
export const CONFIG_CONTRACT_PURPOSE = 'IA-3A_SCHEMA_RUNTIME_VALIDATION';
export const CONFIG_FORMAT_ID = 'FOUNDATION_MINIMAL_SUPABASE_TOML_V1';
export const CONFIG_RELATIVE_PATH = 'project/supabase/config.toml';
export const CONFIG_SOURCE_RELATIVE_PATH = 'evidence-private/config-materialization.source.toml';

export const I17_EXIT_CODES = Object.freeze({
  PASS: 0,
  MISSING: 31,
  DUPLICATE_OR_CONFLICTING: 32,
  LEXICAL_MALFORMED: 33,
  ENCODING_INVALID: 34,
  ID_INVALID: 35,
  BYTE_MISMATCH: 36,
});

export function i17ExitCode(error) {
  const code = error?.code;
  if (code === 'I17_PROJECT_ID_MISSING') return I17_EXIT_CODES.MISSING;
  if (code === 'I17_PROJECT_ID_DUPLICATE') return I17_EXIT_CODES.DUPLICATE_OR_CONFLICTING;
  if (code === 'I17_PROJECT_ID_LEXICAL') return I17_EXIT_CODES.LEXICAL_MALFORMED;
  if (code === 'I17_ENCODING_INVALID' || code === 'I17_INPUT') return I17_EXIT_CODES.ENCODING_INVALID;
  if (code === 'I17_PROJECT_ID_INVALID') return I17_EXIT_CODES.ID_INVALID;
  if (code === 'I17_PROJECT_ID_MISMATCH') return I17_EXIT_CODES.BYTE_MISMATCH;
  return null;
}

const CONTRACT_URL = new URL('../contracts/planned-config-contract.json', import.meta.url);
const SCOPE_BRAND = Symbol('foundation-config-scope');
const TEST_ROOT_PREFIX = 'winwin-foundation-config-test.';
const STATIC_KEYS = Object.freeze(Object.keys(CONFIG));
const FORBIDDEN_SOURCES = Object.freeze(['REPOSITORY_TRACKED_CONFIG', 'ENVIRONMENT', 'DOTENV', 'REMOTE_LINK', 'HISTORICAL_SESSION', 'FOREIGN_SESSION']);
const SECRET_CAPABLE = /(password|secret|token|jwt|credential|database_url|connection_string|service_role|anon_key|access_key)/i;

const canonical = value => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
};
const mode = stat => stat.mode & 0o777;
const same = (actual, expected, code) => demand(JSON.stringify(actual) === JSON.stringify(expected), code);
const exact = (value, keys, code) => {
  demand(object(value), code);
  try { shape(value, keys); } catch { throw new ContractError(code); }
  return value;
};
const copy = value => JSON.parse(JSON.stringify(value));

function noSecretCapableFields(value) {
  if (Array.isArray(value)) value.forEach(noSecretCapableFields);
  else if (object(value)) for (const [key, child] of Object.entries(value)) {
    demand(!SECRET_CAPABLE.test(key), 'CONFIG_SECRET_CAPABLE_FIELD');
    noSecretCapableFields(child);
  }
}

function safeDirectory(directory, expectedMode = 0o700) {
  try {
    const stat = fs.lstatSync(directory);
    demand(stat.isDirectory() && !stat.isSymbolicLink() && mode(stat) === expectedMode, 'CONFIG_DIRECTORY_SAFETY');
    demand(fs.realpathSync(directory) === directory, 'CONFIG_DIRECTORY_CANONICAL');
  } catch (error) {
    if (error instanceof ContractError) throw error;
    throw new ContractError('CONFIG_DIRECTORY_SAFETY');
  }
}

function safeFile(file, expectedMode = 0o600) {
  try {
    const stat = fs.lstatSync(file);
    demand(stat.isFile() && !stat.isSymbolicLink() && mode(stat) === expectedMode && stat.size <= 65536, 'CONFIG_FILE_SAFETY');
    demand(fs.realpathSync(file) === file, 'CONFIG_FILE_CANONICAL');
  } catch (error) {
    if (error instanceof ContractError) throw error;
    throw new ContractError('CONFIG_FILE_SAFETY');
  }
}

function validateStaticValues(values, expectedProjectId) {
  exact(values, STATIC_KEYS, 'PLANNED_CONFIG_STATIC_VALUES');
  projectId(values.project_id);
  demand(values.project_id === expectedProjectId, 'PLANNED_CONFIG_ID_MISMATCH');
  const expected = {
    'db.port': 59322, 'db.shadow_port': 59320, 'api.port': 59321, 'studio.port': 59323,
    'local_smtp.port': 59324, 'local_smtp.smtp_port': 59325, 'local_smtp.pop3_port': 59326,
    'analytics.port': 59327, 'edge_runtime.inspector_port': 59328, 'db.pooler.port': 59329,
    'db.migrations.enabled': false, 'db.seed.enabled': false, 'db.seed.sql_paths': [],
    'db.migrations.schema_paths': [], 'analytics.enabled': false, 'experimental.pgdelta.enabled': false,
  };
  for (const [key, value] of Object.entries(expected)) same(values[key], value, 'PLANNED_CONFIG_STATIC_VALUE');
}

export function validatePlannedConfigContract(contract) {
  exact(contract, ['schema_version', 'contract_type', 'purpose', 'reservation_binding', 'destination', 'format', 'static_values', 'source_policy', 'permissions', 'publication', 'ambiguity_policy', 'provenance'], 'PLANNED_CONFIG_CONTRACT');
  demand(contract.schema_version === CONFIG_CONTRACT_SCHEMA_VERSION && contract.contract_type === 'FOUNDATION_PLANNED_CONFIG' && contract.purpose === CONFIG_CONTRACT_PURPOSE, 'PLANNED_CONFIG_CONTRACT_TYPE');

  const binding = exact(contract.reservation_binding, ['project_id', 'session_root', 'required_state', 'required_active_count', 'required_ended_count'], 'PLANNED_CONFIG_RESERVATION');
  projectId(binding.project_id);
  demand(path.isAbsolute(binding.session_root) && /^winwin-fnd-spike\.[0-9a-f]{8}$/.test(path.basename(binding.session_root)), 'PLANNED_CONFIG_SESSION_ROOT');
  demand(binding.required_state === 'ACTIVE' && binding.required_active_count === 1 && binding.required_ended_count === 0, 'PLANNED_CONFIG_RESERVATION_STATE');

  const destination = exact(contract.destination, ['project_root_relative', 'config_directory_relative', 'config_path_relative', 'config_path_absolute', 'staging_path_relative', 'allowed_project_entries', 'allowed_config_entries'], 'PLANNED_CONFIG_DESTINATION');
  demand(destination.project_root_relative === 'project' && destination.config_directory_relative === 'project/supabase' && destination.config_path_relative === CONFIG_RELATIVE_PATH && destination.staging_path_relative === CONFIG_SOURCE_RELATIVE_PATH, 'PLANNED_CONFIG_RELATIVE_PATH');
  demand(destination.config_path_absolute === path.join(binding.session_root, CONFIG_RELATIVE_PATH), 'PLANNED_CONFIG_ABSOLUTE_PATH');
  same(destination.allowed_project_entries, ['supabase'], 'PLANNED_CONFIG_PROJECT_ENTRIES');
  same(destination.allowed_config_entries, ['config.toml'], 'PLANNED_CONFIG_DIRECTORY_ENTRIES');

  const format = exact(contract.format, ['format_id', 'template_id', 'encoding', 'line_ending', 'final_newline', 'authoritative_field', 'authoritative_lexical_form'], 'PLANNED_CONFIG_FORMAT');
  demand(format.format_id === CONFIG_FORMAT_ID && format.template_id === 'GENERATED_FROM_FROZEN_CONTRACT_NO_SOURCE_COPY' && format.encoding === 'UTF-8_NO_BOM' && format.line_ending === 'LF' && format.final_newline === true && format.authoritative_field === 'project_id' && format.authoritative_lexical_form === 'project_id = "<VALUE>"', 'PLANNED_CONFIG_FORMAT_VALUE');
  validateStaticValues(contract.static_values, binding.project_id);

  const source = exact(contract.source_policy, ['mode', 'copied_fields', 'forbidden_sources'], 'PLANNED_CONFIG_SOURCE_POLICY');
  demand(source.mode === 'GENERATE_MINIMAL_ALLOWLIST_ONLY', 'PLANNED_CONFIG_SOURCE_MODE');
  same(source.copied_fields, [], 'PLANNED_CONFIG_COPIED_FIELDS');
  same(source.forbidden_sources, FORBIDDEN_SOURCES, 'PLANNED_CONFIG_FORBIDDEN_SOURCES');
  const permissions = exact(contract.permissions, ['directory_mode', 'file_mode'], 'PLANNED_CONFIG_PERMISSIONS');
  demand(permissions.directory_mode === '0700' && permissions.file_mode === '0600', 'PLANNED_CONFIG_PERMISSION_VALUE');
  const publication = exact(contract.publication, ['mode', 'overwrite', 'retry', 'partial_target_accepted'], 'PLANNED_CONFIG_PUBLICATION');
  demand(publication.mode === 'CREATE_NEW_ATOMIC_HARD_LINK' && publication.overwrite === 'FORBIDDEN' && publication.retry === 'FORBIDDEN' && publication.partial_target_accepted === false, 'PLANNED_CONFIG_PUBLICATION_VALUE');
  const ambiguity = exact(contract.ambiguity_policy, ['alternate_authoritative_sources', 'duplicate_project_id', 'unknown_key', 'symlink', 'normalization'], 'PLANNED_CONFIG_AMBIGUITY');
  demand(Object.values(ambiguity).every(value => ['FORBIDDEN', 'FAIL'].includes(value)), 'PLANNED_CONFIG_AMBIGUITY_VALUE');
  const provenance = exact(contract.provenance, ['reservation_index_required', 'contract_sha256_required', 'config_sha256_required', 'raw_project_id_line_sha256_required', 'persistence'], 'PLANNED_CONFIG_PROVENANCE');
  demand(provenance.reservation_index_required === true && provenance.contract_sha256_required === true && provenance.config_sha256_required === true && provenance.raw_project_id_line_sha256_required === true && provenance.persistence === 'IN_MEMORY_UNLESS_SEPARATELY_AUTHORIZED', 'PLANNED_CONFIG_PROVENANCE_VALUE');
  noSecretCapableFields(contract);
  return contract;
}

function loadProductionContract() {
  const bytes = fs.readFileSync(CONTRACT_URL);
  const contract = validatePlannedConfigContract(parseJSON(bytes));
  return { contract, bytes, sha256: hash(bytes) };
}

function makeScope(contractRecord, kind, reservationReader, beforePublish = null, ownerRoot = null) {
  demand(typeof reservationReader === 'function', 'CONFIG_RESERVATION_READER');
  return Object.freeze({ contractRecord, kind, reservationReader, beforePublish, ownerRoot, [SCOPE_BRAND]: true });
}

function validateScope(scope) {
  demand(scope?.[SCOPE_BRAND] === true, 'UNAPPROVED_CONFIG_SCOPE');
  const contract = validatePlannedConfigContract(scope.contractRecord.contract);
  if (scope.kind === 'PRODUCTION') {
    const frozen = loadProductionContract();
    demand(scope.contractRecord.sha256 === frozen.sha256 && canonical(contract) === canonical(frozen.contract), 'PRODUCTION_CONFIG_CONTRACT_SUBSTITUTION');
  } else {
    demand(scope.kind === 'SYNTHETIC_TEST', 'CONFIG_SCOPE_KIND');
    safeDirectory(scope.ownerRoot);
    demand(fs.realpathSync(path.dirname(scope.ownerRoot)) === fs.realpathSync(os.tmpdir()) && path.basename(scope.ownerRoot).startsWith(TEST_ROOT_PREFIX), 'SYNTHETIC_CONFIG_SCOPE');
    demand(path.dirname(contract.reservation_binding.session_root) === scope.ownerRoot, 'SYNTHETIC_CONFIG_SESSION_PARENT');
  }
  return contract;
}

function pathsFor(contract) {
  const root = contract.reservation_binding.session_root;
  return Object.freeze({
    sessionRoot: root,
    projectRoot: path.join(root, 'project'),
    configDirectory: path.join(root, 'project', 'supabase'),
    configFile: path.join(root, CONFIG_RELATIVE_PATH),
    sourceFile: path.join(root, CONFIG_SOURCE_RELATIVE_PATH),
    evidencePrivate: path.join(root, 'evidence-private'),
  });
}

function validateReservation(scope, contract) {
  const index = scope.reservationReader();
  demand(object(index) && Array.isArray(index.active) && Array.isArray(index.ended) && typeof index.index_sha256 === 'string' && /^[0-9a-f]{64}$/.test(index.index_sha256), 'CONFIG_RESERVATION_INDEX');
  const id = contract.reservation_binding.project_id;
  const active = index.active.filter(record => record.project_id === id);
  const ended = index.ended.filter(record => record.project_id === id);
  demand(active.length === 1 && ended.length === 0 && index.active.length === 1, 'CONFIG_RESERVATION_CARDINALITY');
  demand(active[0].reservation_state === 'ACTIVE' && active[0].session_root === contract.reservation_binding.session_root && active[0].project_id === id, 'CONFIG_RESERVATION_BINDING');
  return { result: 'PASS', project_id: id, session_root: active[0].session_root, active_count: 1, ended_count: 0, index_sha256: index.index_sha256 };
}

export function renderPlannedConfig(contract) {
  validatePlannedConfigContract(contract);
  const id = contract.reservation_binding.project_id;
  const text = `project_id = "${id}"

[api]
port = 59321

[db]
port = 59322
shadow_port = 59320

[db.pooler]
port = 59329

[db.migrations]
enabled = false
schema_paths = []

[db.seed]
enabled = false
sql_paths = []

[studio]
port = 59323

[local_smtp]
port = 59324
smtp_port = 59325
pop3_port = 59326

[analytics]
enabled = false
port = 59327

[edge_runtime]
inspector_port = 59328

[experimental.pgdelta]
enabled = false
`;
  const bytes = Buffer.from(text, 'utf8');
  demand(!SECRET_CAPABLE.test(text), 'CONFIG_RENDER_SECRET');
  return bytes;
}

export function parseExactProjectId(input, expectedId = undefined) {
  demand(Buffer.isBuffer(input) && input.length <= 65536, 'I17_INPUT');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(input); }
  catch { throw new ContractError('I17_ENCODING_INVALID'); }
  demand(!text.startsWith('\uFEFF') && !text.includes('\0') && !text.includes('\r') && text.endsWith('\n'), 'I17_ENCODING_INVALID');
  const lines = text.slice(0, -1).split('\n');
  const candidates = [];
  let sectionSeen = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^\[[^\]]+\]$/.test(line)) sectionSeen = true;
    if (/^[\t ]*project_id(?:[\t ]|=|$)/.test(line)) candidates.push({ line, index, sectionSeen });
  }
  demand(candidates.length > 0, 'I17_PROJECT_ID_MISSING');
  demand(candidates.length === 1, 'I17_PROJECT_ID_DUPLICATE');
  const candidate = candidates[0];
  demand(candidate.index === 0 && candidate.sectionSeen === false, 'I17_PROJECT_ID_LEXICAL');
  const match = candidate.line.match(/^project_id = "([^"\\]*)"$/);
  demand(match, 'I17_PROJECT_ID_LEXICAL');
  try { projectId(match[1]); } catch { throw new ContractError('I17_PROJECT_ID_INVALID'); }
  if (expectedId !== undefined) {
    projectId(expectedId);
    demand(Buffer.from(match[1], 'utf8').equals(Buffer.from(expectedId, 'utf8')), 'I17_PROJECT_ID_MISMATCH');
  }
  return { result: 'PASS', raw_project_id: match[1], byte_count: Buffer.byteLength(match[1], 'ascii'), ascii: /^[\x00-\x7f]+$/.test(match[1]), raw_line_sha256: hash(Buffer.from(candidate.line, 'utf8')), normalization_unchanged: match[1] === match[1].normalize('NFC') };
}

function parseEffectiveConfig(bytes, contract, lexical) {
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const materialized = Object.create(null);
  let section = '';
  for (const line of text.slice(0, -1).split('\n')) {
    if (line === '') continue;
    const header = line.match(/^\[([a-z_]+(?:\.[a-z_]+)*)\]$/);
    if (header) { section = header[1]; continue; }
    const assignment = line.match(/^([a-z][a-z0-9_]*) = (true|false|0|[1-9][0-9]*|"[A-Za-z0-9_-]+"|\[\])$/);
    demand(assignment, 'EFFECTIVE_CONFIG_TOML');
    const key = section ? `${section}.${assignment[1]}` : assignment[1];
    demand(Object.hasOwn(CONFIG, key) && !Object.hasOwn(materialized, key), 'EFFECTIVE_CONFIG_KEY');
    const raw = assignment[2];
    const value = raw === '[]' ? [] : raw.startsWith('"') ? raw.slice(1, -1) : raw === 'true' ? true : raw === 'false' ? false : Number(raw);
    materialized[key] = value;
  }
  const expectedBytes = renderPlannedConfig(contract);
  demand(bytes.equals(expectedBytes), 'EFFECTIVE_CONFIG_TEMPLATE_MISMATCH');
  const effective = copy(contract.static_values);
  effective.project_id = lexical.raw_project_id;
  return { materialized, effective };
}

export function compareGeneratedConfig({ reservation, requestedId, contract, lexical, materialized, effective, configSha256, contractSha256, authoritativeSourceCount = 1 }) {
  validatePlannedConfigContract(contract);
  projectId(requestedId);
  demand(object(reservation) && reservation.result === 'PASS', 'I24_RESERVATION');
  demand(authoritativeSourceCount === 1, 'I24_AMBIGUOUS_SOURCE');
  const expected = contract.reservation_binding.project_id;
  demand(reservation.project_id === expected && requestedId === expected && lexical.raw_project_id === expected && materialized.project_id === expected && effective.project_id === expected, 'I24_PROJECT_ID_MISMATCH');
  demand([reservation.project_id, requestedId, lexical.raw_project_id, materialized.project_id, effective.project_id].every(value => Buffer.from(value, 'utf8').equals(Buffer.from(expected, 'utf8'))), 'I24_PROJECT_ID_BYTES');
  demand(lexical.normalization_unchanged === true, 'I24_NORMALIZATION');
  demand(/^[0-9a-f]{64}$/.test(configSha256) && /^[0-9a-f]{64}$/.test(contractSha256), 'I24_HASH');
  const auditor = effectiveInputs(materialized, contract.static_values, effective, { result: 'PASS' });
  demand(auditor.result === 'PASS', 'I24_EFFECTIVE_INPUTS');
  return {
    result: 'PASS', reason: 'EXACT_RESERVED_REQUESTED_MATERIALIZED_EFFECTIVE_EQUALITY',
    project_id: expected, raw_id_equal: true, ambiguity: 'NONE', normalization: 'UNCHANGED', truncation: 'NONE',
    config_sha256: configSha256, contract_sha256: contractSha256, raw_project_id_line_sha256: lexical.raw_line_sha256,
    reservation_index_sha256: reservation.index_sha256, authoritative_source_count: 1,
  };
}

function inspectConfig(scope, requestedId) {
  const contract = validateScope(scope);
  const paths = pathsFor(contract);
  const reservation = validateReservation(scope, contract);
  projectId(requestedId);
  demand(requestedId === contract.reservation_binding.project_id, 'CONFIG_REQUESTED_ID_MISMATCH');
  safeDirectory(paths.sessionRoot); safeDirectory(paths.projectRoot); safeDirectory(paths.configDirectory); safeDirectory(paths.evidencePrivate);
  same(fs.readdirSync(paths.projectRoot).sort(), contract.destination.allowed_project_entries, 'CONFIG_PROJECT_AMBIGUITY');
  same(fs.readdirSync(paths.configDirectory).sort(), contract.destination.allowed_config_entries, 'CONFIG_DIRECTORY_AMBIGUITY');
  safeFile(paths.configFile); safeFile(paths.sourceFile);
  const bytes = fs.readFileSync(paths.configFile), sourceBytes = fs.readFileSync(paths.sourceFile);
  demand(bytes.equals(sourceBytes), 'CONFIG_PUBLICATION_SOURCE_MISMATCH');
  const lexical = parseExactProjectId(bytes, requestedId);
  const readers = parseEffectiveConfig(bytes, contract, lexical);
  const verification = compareGeneratedConfig({ reservation, requestedId, contract, lexical, ...readers, configSha256: hash(bytes), contractSha256: scope.contractRecord.sha256 });
  return { result: 'PASS', paths, reservation, lexical, materialized: readers.materialized, effective: readers.effective, verification, config_bytes: bytes.length };
}

function writeExclusive(file, bytes) {
  const descriptor = fs.openSync(file, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
  try { fs.writeFileSync(descriptor, bytes); fs.fsyncSync(descriptor); }
  finally { fs.closeSync(descriptor); }
  safeFile(file);
}

function fsyncDirectory(directory) {
  const descriptor = fs.openSync(directory, fs.constants.O_RDONLY);
  try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
}

function materialize(scope, requestedId, clock) {
  const contract = validateScope(scope);
  const paths = pathsFor(contract);
  const reservation = validateReservation(scope, contract);
  projectId(requestedId);
  demand(requestedId === contract.reservation_binding.project_id, 'CONFIG_REQUESTED_ID_MISMATCH');
  safeDirectory(paths.sessionRoot); safeDirectory(paths.projectRoot); safeDirectory(paths.evidencePrivate);
  demand(fs.readdirSync(paths.projectRoot).length === 0, 'CONFIG_PROJECT_NOT_EMPTY');
  demand(!fs.existsSync(paths.configDirectory) && !fs.existsSync(paths.configFile) && !fs.existsSync(paths.sourceFile), 'CONFIG_TARGET_EXISTS');
  const created = clock();
  demand(created instanceof Date && Number.isFinite(created.getTime()), 'CONFIG_CLOCK');
  const materializedAt = created.toISOString();
  const bytes = renderPlannedConfig(contract);
  const lexical = parseExactProjectId(bytes, requestedId);
  const readers = parseEffectiveConfig(bytes, contract, lexical);
  compareGeneratedConfig({ reservation, requestedId, contract, lexical, ...readers, configSha256: hash(bytes), contractSha256: scope.contractRecord.sha256 });
  fs.mkdirSync(paths.configDirectory, { mode: 0o700 });
  safeDirectory(paths.configDirectory);
  writeExclusive(paths.sourceFile, bytes);
  if (scope.beforePublish) scope.beforePublish();
  fs.linkSync(paths.sourceFile, paths.configFile);
  fsyncDirectory(paths.configDirectory);
  const verified = inspectConfig(scope, requestedId);
  demand(fs.lstatSync(paths.sourceFile).ino === fs.lstatSync(paths.configFile).ino, 'CONFIG_PUBLICATION_NOT_ATOMIC');
  return {
    result: 'PASS', writer: 'FOUNDATION_CONFIG_WRITER_V1', publication: 'ATOMIC_HARD_LINK_CREATE_NEW', overwrite: 'NONE',
    project_id: requestedId, session_root: paths.sessionRoot, config_path: paths.configFile, materialized_at_utc: materializedAt,
    directory_mode: '0700', file_mode: '0600', config_sha256: verified.verification.config_sha256,
    contract_sha256: scope.contractRecord.sha256, raw_project_id_line_sha256: verified.lexical.raw_line_sha256,
    reservation_index_sha256: verified.reservation.index_sha256, verification: verified.verification,
  };
}

function service(scope, { clock = () => new Date() } = {}) {
  validateScope(scope);
  return Object.freeze({
    contract: () => copy(scope.contractRecord.contract),
    readAndVerify: requestedId => inspectConfig(scope, requestedId),
    materialize: requestedId => materialize(scope, requestedId, clock),
  });
}

export function foundationConfigService() {
  const record = loadProductionContract();
  const reader = () => foundationReservationService().readIndex();
  return service(makeScope(record, 'PRODUCTION', reader));
}

function syntheticContract(sessionRoot, syntheticId) {
  const base = copy(loadProductionContract().contract);
  base.reservation_binding.project_id = syntheticId;
  base.reservation_binding.session_root = sessionRoot;
  base.destination.config_path_absolute = path.join(sessionRoot, CONFIG_RELATIVE_PATH);
  base.static_values.project_id = syntheticId;
  validatePlannedConfigContract(base);
  const bytes = Buffer.from(canonical(base) + '\n', 'utf8');
  return { contract: base, bytes, sha256: hash(bytes) };
}

export function syntheticConfigHarness({ projectId: syntheticId = 'wwfnd-20000101t000000z-000000000001', clock = () => new Date('2000-01-01T00:00:00.000Z'), beforePublish = null } = {}) {
  projectId(syntheticId);
  const ownerRoot = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), TEST_ROOT_PREFIX));
  fs.chmodSync(ownerRoot, 0o700);
  const sessionRoot = path.join(ownerRoot, 'winwin-fnd-spike.00000001');
  fs.mkdirSync(sessionRoot, { mode: 0o700 });
  for (const child of ['project', 'evidence-private', 'evidence-sanitized', 'bin']) fs.mkdirSync(path.join(sessionRoot, child), { mode: 0o700 });
  const record = syntheticContract(sessionRoot, syntheticId);
  const reservationReader = () => ({
    active: [{ project_id: syntheticId, session_root: sessionRoot, reservation_state: 'ACTIVE' }],
    ended: [], entry_count: 1, index_sha256: hash(Buffer.from(`synthetic-index:${syntheticId}`, 'utf8')),
  });
  const scope = makeScope(record, 'SYNTHETIC_TEST', reservationReader, beforePublish, ownerRoot);
  return Object.freeze({ ownerRoot, sessionRoot, configPath: path.join(sessionRoot, CONFIG_RELATIVE_PATH), sourcePath: path.join(sessionRoot, CONFIG_SOURCE_RELATIVE_PATH), projectId: syntheticId, service: service(scope, { clock }) });
}
