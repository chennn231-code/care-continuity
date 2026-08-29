// Pure bounded auditors. Actual materialized config remains Gate 6B.
import { demand, shape, object, verdict, projectId, safeText } from './contracts.mjs';

export const SQL_INPUTS = ['roles', 'migrations', 'seed', 'seedPaths', 'declarative', 'vault', 'storageBuckets', 'storageObjects', 'functions', 'imports', 'customSQL'];
export function sqlExclusion(input) {
  shape(input, SQL_INPUTS);
  const rows = SQL_INPUTS.map(key => {
    const v = input[key]; shape(v, ['present', 'reachable', 'proof']);
    demand(typeof v.present === 'boolean' && (typeof v.reachable === 'boolean' || v.reachable === null));
    demand(v.proof === null || ['FIXED_READER_DISABLED', 'COMPLETE_PATH_METADATA'].includes(v.proof), 'PROOF_TYPE');
    const result = !v.present && v.proof === 'COMPLETE_PATH_METADATA' ? 'ABSENT'
      : v.present && v.reachable === false && v.proof === 'FIXED_READER_DISABLED' && key !== 'roles' ? 'PRESENT-BUT-PROVABLY-DISABLED'
        : v.present && v.reachable === true ? 'PRESENT-AND-REACHABLE' : 'REACHABILITY-UNKNOWN';
    return { key, result };
  });
  return { result: rows.every(r => ['ABSENT', 'PRESENT-BUT-PROVABLY-DISABLED'].includes(r.result)) ? 'PASS' : 'BLOCKED', rows };
}

export const CONFIG = Object.freeze({
  project_id: 'string', 'db.port': 'number', 'db.shadow_port': 'number', 'api.port': 'number', 'studio.port': 'number',
  'local_smtp.port': 'number', 'local_smtp.smtp_port': 'number', 'local_smtp.pop3_port': 'number',
  'analytics.port': 'number', 'edge_runtime.inspector_port': 'number', 'db.pooler.port': 'number',
  'db.migrations.enabled': 'boolean', 'db.seed.enabled': 'boolean', 'db.seed.sql_paths': 'empty',
  'db.migrations.schema_paths': 'empty', 'analytics.enabled': 'boolean', 'experimental.pgdelta.enabled': 'boolean',
});
// Deliberately rejects the rest of TOML instead of guessing source-reader defaults.
// A complete materialized config requires the separate multi-reader Gate 6B adapter.
export function literalConfig(text) {
  demand(typeof text === 'string' && text.length <= 65536, 'CONFIG_LIMIT');
  const out = Object.create(null); let section = ''; const sections = new Set();
  for (let line of text.split('\n')) {
    line = line.trim(); if (!line || line.startsWith('#')) continue;
    const header = line.match(/^\[([a-z_]+(?:\.[a-z_]+)*)\]$/);
    if (header) { section = header[1]; demand(!sections.has(section), 'DUPLICATE_SECTION'); sections.add(section); continue; }
    const m = line.match(/^([a-z_]+)\s*=\s*(true|false|0|[1-9][0-9]*|"[A-Za-z0-9_-]+"|\[\])$/);
    demand(m, 'UNSUPPORTED_TOML'); const key = section ? section + '.' + m[1] : m[1];
    demand(Object.hasOwn(CONFIG, key) && !Object.hasOwn(out, key), 'CONFIG_KEY');
    const raw = m[2], v = raw === '[]' ? [] : raw.startsWith('"') ? raw.slice(1, -1) : raw === 'true' ? true : raw === 'false' ? false : Number(raw);
    demand(CONFIG[key] === 'empty' ? Array.isArray(v) && !v.length : typeof v === CONFIG[key], 'CONFIG_TYPE'); out[key] = v;
  }
  return out;
}
export function effectiveInputs(actual, expected, otherReader, environmentEvidence) {
  for (const x of [actual, expected, otherReader]) shape(x, Object.keys(CONFIG));
  projectId(actual.project_id);
  demand(environmentEvidence?.result === 'PASS', 'ENV_NOT_CLOSED');
  for (const k of Object.keys(CONFIG)) demand(JSON.stringify(actual[k]) === JSON.stringify(expected[k]) && JSON.stringify(actual[k]) === JSON.stringify(otherReader[k]), 'READER_MISMATCH');
  demand(actual['db.migrations.enabled'] === false && actual['db.seed.enabled'] === false, 'SQL_ENABLED');
  demand(actual['analytics.enabled'] === false && actual['experimental.pgdelta.enabled'] === false, 'OPTIONAL_ENABLED');
  return verdict('PASS', 'BOUNDED_PROJECTION_ONLY_NOT_FULL_CONFIG_ADAPTER');
}
export function environmentPresence(envenv) {
  demand(object(envenv));
  const dangerous = /^(?:SUPABASE_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_PASSWORD|PGPASSWORD|DATABASE_URL|AWS_.+|GOOGLE_APPLICATION_CREDENTIALS|AZURE_.+|NODE_OPTIONS|BUN_OPTIONS|BUN_INSPECT|BITBUCKET_CLONE_DIR|DOCKER_HOST|DOCKER_TLS_VERIFY|DOCKER_CERT_PATH|DOCKER_API_VERSION)$/;
  const proxies = /^(?:https?_proxy|all_proxy|no_proxy|SSL_CERT_FILE|SSL_CERT_DIR|NODE_EXTRA_CA_CERTS)$/i;
  const rows = Object.keys(envenv).filter(k => dangerous.test(k) || proxies.test(k)).sort().map(key => ({ key, present: true, policy: 'REVIEW_REQUIRED' }));
  return { result: rows.length ? 'BLOCKED' : 'PASS', rows };
}
const ENV_CONSUMERS = Object.freeze({
  HOME: 'SUPABASE_HOME_AND_PROCESS', TMPDIR: 'OS_TEMP_PARENT', SUPABASE_HOME: 'SUPABASE_HOME',
  DOCKER_CONTEXT: 'DOCKER_CLI_CONTEXT', DOCKER_CONFIG: 'DOCKER_CLI_CONFIG', DOCKER_HOST: 'DOCKER_CLI_ENDPOINT',
  DOCKER_TLS_VERIFY: 'DOCKER_CLI_TLS', DOCKER_CERT_PATH: 'DOCKER_CLI_TLS', DOCKER_API_VERSION: 'DOCKER_CLI_API',
  HTTP_PROXY: 'NETWORK_PROXY', HTTPS_PROXY: 'NETWORK_PROXY', ALL_PROXY: 'NETWORK_PROXY', NO_PROXY: 'NETWORK_PROXY',
  SUPABASE_ACCESS_TOKEN: 'REMOTE_CREDENTIAL', SUPABASE_DB_PASSWORD: 'DATABASE_CREDENTIAL', SUPABASE_SERVICE_ROLE_KEY: 'REMOTE_CREDENTIAL',
  PGPASSWORD: 'DATABASE_CREDENTIAL', DATABASE_URL: 'DATABASE_CREDENTIAL', NODE_OPTIONS: 'RUNTIME_PRELOAD', BUN_OPTIONS: 'RUNTIME_PRELOAD', BUN_INSPECT: 'RUNTIME_DEBUG',
  BITBUCKET_CLONE_DIR: 'PROJECT_CONTEXT', SUPABASE_TELEMETRY_DISABLED: 'TELEMETRY', DO_NOT_TRACK: 'TELEMETRY', SUPABASE_UPDATE_NOTIFIER: 'UPDATE_NOTIFIER',
  PGDELTA_ENABLED: 'PG_DELTA', SUPABASE_INTERNAL_IMAGE_REGISTRY: 'IMAGE_REGISTRY_OVERRIDE',
});
const SECRET_ENV = new Set(['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_SERVICE_ROLE_KEY', 'PGPASSWORD', 'DATABASE_URL']);
const KNOWN_IRRELEVANT = Object.freeze({ NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S: 'NODE_REPL_BROWSER_CLIENT_NOT_CONSUMED_OR_FORWARDED' });
export const DOCKER_CHILD_ENV = Object.freeze(['HOME', 'PATH', 'LANG', 'LC_ALL', 'DOCKER_CONTEXT', 'DOCKER_CONFIG']);
export function environmentProjection(envenv) {
  demand(object(envenv));
  const relevant = Object.keys(envenv).filter(k => Object.hasOwn(ENV_CONSUMERS, k) || Object.hasOwn(KNOWN_IRRELEVANT, k) || /^(?:SUPABASE|DOCKER|PGDELTA|HTTP_PROXY|HTTPS_PROXY|ALL_PROXY|NO_PROXY|BUN|NODE)_/i.test(k)).sort();
  const rows = relevant.map(key => ({ key, consumer: ENV_CONSUMERS[key] ?? KNOWN_IRRELEVANT[key] ?? 'UNKNOWN', state: Object.hasOwn(KNOWN_IRRELEVANT, key) ? 'KNOWN-IRRELEVANT / NOT FORWARDED' : !Object.hasOwn(ENV_CONSUMERS, key) ? 'UNKNOWN' : SECRET_ENV.has(key) ? 'SECRET-SENSITIVE' : 'EXECUTION-RELEVANT ALLOWLISTED', valueRecorded: false }));
  for (const key of Object.keys(ENV_CONSUMERS).sort()) if (!Object.hasOwn(envenv, key)) rows.push({ key, consumer: ENV_CONSUMERS[key], state: 'ABSENT', valueRecorded: false });
  return { result: rows.some(r => r.state === 'UNKNOWN') ? 'BLOCKED' : 'PASS', rows: rows.sort((a,b) => a.key.localeCompare(b.key)) };
}

export const READER_CATEGORIES = Object.freeze(['root CLI args','workdir resolution','config.toml','dotenv readers','process.env','Docker context/host','Supabase home','version pin files','linked metadata','migrations','roles','seed','schema','vault','buckets','functions','Auth hooks/providers','SMTP','analytics/vector','pg-delta','telemetry','update notifier','image/registry resolution','proxy','temp/home paths']);
export function readerCoverage(rows) {
  demand(Array.isArray(rows));
  const allowed = ['COVERED','EXCLUDED-BY-FROZEN-CONTRACT','GATE-6B-PENDING','NOT APPLICABLE','GAP'];
  for (const r of rows) {
    shape(r, ['category','fixedSourcePath','readerFunction','inputSource','precedence','securityRelevance','helperAdapter','testCoverage','disposition']);
    demand(READER_CATEGORIES.includes(r.category) && allowed.includes(r.disposition), 'READER_COVERAGE');
    for (const k of ['fixedSourcePath','readerFunction','inputSource','precedence','securityRelevance','helperAdapter','testCoverage']) safeText(r[k]);
  }
  demand(new Set(rows.map(r => r.category)).size === READER_CATEGORIES.length && rows.length === READER_CATEGORIES.length, 'READER_CATEGORY_SET');
  return { result: rows.some(r => r.disposition === 'GAP') ? 'BLOCKED' : rows.some(r => r.disposition === 'GATE-6B-PENDING') ? 'PARTIAL' : 'PASS', rows };
}
export function fixedInputCatalog(text, sourcePathClass = 'PROTECTED_REPOSITORY_CONFIG_NOT_EXECUTION_INPUT') {
  demand(typeof text === 'string' && Buffer.byteLength(text) <= 256 * 1024, 'CONFIG_LIMIT');
  demand(/^[A-Z0-9_-]+$/.test(sourcePathClass), 'SOURCE_CLASS');
  const rows = [], seen = new Set(); let section = ''; let lineNo = 0;
  for (const raw of text.split('\n')) {
    lineNo++;
    let quoted = false, escaped = false, cut = raw.length;
    for (let i = 0; i < raw.length; i++) { const ch = raw[i]; if (escaped) { escaped = false; continue; } if (ch === '\\' && quoted) { escaped = true; continue; } if (ch === '"') quoted = !quoted; if (ch === '#' && !quoted) { cut = i; break; } }
    const line = raw.slice(0, cut).trim(); if (!line) continue;
    const header = line.match(/^\[([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\]$/);
    if (header) { section = header[1]; continue; }
    const m = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.*)$/); demand(m, 'UNSUPPORTED_TOML');
    const key = section ? `${section}.${m[1]}` : m[1]; demand(!seen.has(key), 'DUPLICATE_KEY'); seen.add(key);
    const value = m[2].trim(), lower = key.toLowerCase();
    const secret = /(?:secret|password|token|key|smtp_pass|jwt)/.test(lower) || /^env\(/.test(value);
    let category = secret ? 'PRESENT / SECRET' : /^(?:true|false)$/.test(value) ? 'BOOLEAN' : /^\d+$/.test(value) ? 'NUMBER' : /^\[.*\]$/.test(value) ? 'ARRAY' : /^".*"$/.test(value) ? 'STRING' : 'UNSUPPORTED';
    rows.push({ key, line: lineNo, category, valueRecorded: false });
  }
  return { sourcePathClass, rows, result: rows.some(r => r.category === 'UNSUPPORTED') ? 'BLOCKED' : 'PASS' };
}
export function sourceConsumerEquivalence(sources) {
  demand(Array.isArray(sources)); const groups = new Map();
  for (const s of sources) { shape(s, ['field', 'source', 'consumer', 'fingerprint']); safeText(s.field); safeText(s.source); safeText(s.consumer); safeText(s.fingerprint); const a=groups.get(s.field)??[]; a.push(s); groups.set(s.field,a); }
  const rows=[...groups].map(([field,values])=>({field,consumers:[...new Set(values.map(v=>v.consumer))].sort(),sources:[...new Set(values.map(v=>v.source))].sort(),result:new Set(values.map(v=>v.fingerprint)).size===1?'EQUIVALENT':'AMBIGUOUS PRECEDENCE'}));
  return {result:rows.every(r=>r.result==='EQUIVALENT')?'PASS':'BLOCKED',rows};
}
export function optionalQualifiers(p) {
  shape(p, ['telemetryDisabled', 'doNotTrack', 'notifierDisabled', 'debug', 'consent', 'versionEmpty', 'pgdeltaConfig', 'pgdeltaEnvironment', 'schemaPathsEmpty', 'analyticsEnabled']);
  for (const k of ['debug', 'versionEmpty', 'pgdeltaConfig', 'pgdeltaEnvironment', 'schemaPathsEmpty', 'analyticsEnabled']) demand(typeof p[k] === 'boolean', 'OPTIONAL_TYPE');
  demand(['1', null].includes(p.telemetryDisabled) && ['1', null].includes(p.doNotTrack) && ['1', null].includes(p.notifierDisabled) && ['denied', 'granted', 'unknown'].includes(p.consent), 'OPTIONAL_TYPE');
  const transmissionOff = p.telemetryDisabled === '1' || p.doNotTrack === '1' || p.consent === 'denied';
  return {
    telemetryTransmission: transmissionOff ? 'DISABLED' : 'UNKNOWN',
    telemetryState: 'WRITER_CONTAINMENT_REQUIRED',
    traces: transmissionOff && !p.debug ? 'DISABLED' : 'UNKNOWN',
    notifier: p.notifierDisabled === '1' ? 'DISABLED' : 'CONDITIONALLY EXTERNAL',
    pgdelta: p.versionEmpty && (p.pgdeltaConfig || p.pgdeltaEnvironment) ? 'CONDITIONALLY EXTERNAL' : p.schemaPathsEmpty && !p.pgdeltaConfig && !p.pgdeltaEnvironment ? 'DISABLED' : 'UNKNOWN',
    vector: p.analyticsEnabled ? 'VECTOR SOCKET EXPOSURE BLOCKER' : 'DISABLED',
    analytics: p.analyticsEnabled ? 'ENABLED' : 'DISABLED',
    dockerSocketReachable: p.analyticsEnabled,
    dependentConfiguration: p.analyticsEnabled ? 'REVIEW_REQUIRED' : 'STUDIO_ANALYTICS_FLAG_MUST_ALSO_BE_FALSE',
  };
}
export const EGRESS = ['registry', 'proxy', 'smtp', 'providers', 'hooks', 'serviceHostname', 'storageCloud', 'edgeWorkload', 'analytics', 'notifier', 'telemetry', 'packages'];
export function egress(config) {
  shape(config, EGRESS);
  const rows = EGRESS.map(key => {
    const x = config[key]; shape(x, ['enabled', 'targetClass']);
    demand(typeof x.enabled === 'boolean' && ['local', 'external', 'unknown'].includes(x.targetClass));
    return { key, result: !x.enabled ? 'DISABLED' : x.targetClass === 'local' ? 'LOCAL-ONLY CONFIGURED' : x.targetClass === 'external' ? 'CONDITIONALLY EXTERNAL' : 'UNKNOWN' };
  });
  return { result: rows.every(r => ['DISABLED', 'LOCAL-ONLY CONFIGURED'].includes(r.result)) ? 'PASS' : 'BLOCKED', assurance: 'CONFIGURATION_ONLY_NOT_RUNTIME_ZERO_EGRESS', rows };
}
export function binaryCorrespondence(observedHash, expectedHash, officialMatch = false) {
  demand(/^[0-9a-f]{64}$/.test(observedHash) && /^[0-9a-f]{64}$/.test(expectedHash));
  return verdict(observedHash !== expectedHash ? 'BLOCKED' : officialMatch ? 'SUFFICIENT' : 'PARTIAL-ACCEPTABLE', officialMatch ? 'PACKAGE_CHAIN_SEPARATELY_REVIEWED_NOT_SOURCE_EQUIVALENCE' : 'HASH_ONLY_OFFICIAL_PACKAGE_CHAIN_PENDING');
}
export function packageProvenance(facts) {
  shape(facts, ['versionMatch', 'architectureMatch', 'formulaArchiveMatch', 'receiptFormulaMatch', 'installedBinaryMatch']);
  for (const v of Object.values(facts)) demand(typeof v === 'boolean', 'PROVENANCE_FACT');
  if (!facts.versionMatch || !facts.architectureMatch || !facts.formulaArchiveMatch || !facts.receiptFormulaMatch || !facts.installedBinaryMatch) return verdict('BLOCKED', 'PACKAGE_PROVENANCE_CONTRADICTION');
  return verdict('PARTIAL-ACCEPTABLE', 'OFFICIAL_ARCHIVE_AND_PACKAGE_LINKAGE_NO_REPRODUCIBLE_BUILD_EQUIVALENCE');
}
export function endpointGuard(endpoint, allowedEndpoints) {
  safeText(endpoint); demand(Array.isArray(allowedEndpoints));
  demand(endpoint.startsWith('unix:///') && allowedEndpoints.includes(endpoint), 'UNEXPECTED_DAEMON_ENDPOINT');
  return verdict('PASS', 'EXACT_LOCAL_UNIX_ENDPOINT_ONLY');
}
