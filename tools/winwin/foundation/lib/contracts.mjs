// Pure contracts. No filesystem, subprocess, network, environment or writer.
import { createHash } from 'node:crypto';
import path from 'node:path';

export class ContractError extends Error {
  constructor(code) { super(code); this.name = 'ContractError'; this.code = code; }
}
export const demand = (ok, code = 'INVALID_SCHEMA') => { if (!ok) throw new ContractError(code); };
export const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export function shape(v, keys) {
  demand(object(v));
  demand(Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k)), 'FIELD_SET');
}
export const hash = x => createHash('sha256').update(x).digest('hex');
export const LABELS = ['com.supabase.cli.project', 'com.docker.compose.project'];
export const verdict = (result, reason) => ({ result, reason });

// Bounded recursive JSON reader: rejects duplicate keys before construction,
// invalid UTF-8, overflow, prototype keys and trailing/truncated input.
export function parseJSON(input) {
  demand(typeof input === 'string' || Buffer.isBuffer(input), 'JSON_INPUT');
  demand(Buffer.byteLength(input) <= 4 * 1024 * 1024, 'JSON_LIMIT');
  let s;
  try { s = Buffer.isBuffer(input) ? new TextDecoder('utf-8', { fatal: true }).decode(input) : input; }
  catch { throw new ContractError('JSON_UTF8'); }
  let i = 0, nodes = 0;
  const ws = () => { while (/[\t\n\r ]/.test(s[i] ?? 'x')) i++; };
  const string = () => {
    const start = i++;
    while (i < s.length) {
      if (s[i] === '\\') { i += 2; continue; }
      if (s[i++] === '"') {
        try {
          const v = JSON.parse(s.slice(start, i));
          demand(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(v), 'JSON_UNICODE');
          return v;
        } catch { throw new ContractError('JSON_STRING'); }
      }
    }
    throw new ContractError('JSON_TRUNCATED');
  };
  const value = depth => {
    demand(depth <= 40 && ++nodes < 100000, 'JSON_LIMIT'); ws();
    if (s[i] === '"') return string();
    if (s[i] === '{' || s[i] === '[') {
      const map = s[i++] === '{', end = map ? '}' : ']', out = map ? Object.create(null) : [];
      ws(); if (s[i] === end) { i++; return out; }
      while (true) {
        ws(); let k;
        if (map) {
          demand(s[i] === '"', 'JSON_KEY'); k = string();
          demand(!Object.hasOwn(out, k), 'DUPLICATE_KEY');
          demand(!['__proto__', 'prototype', 'constructor'].includes(k), 'JSON_PROTOTYPE');
          ws(); demand(s[i++] === ':', 'JSON_COLON');
        }
        const v = value(depth + 1); if (map) out[k] = v; else out.push(v);
        ws(); if (s[i] === end) { i++; return out; }
        demand(s[i++] === ',', 'JSON_SEPARATOR');
      }
    }
    for (const [word, v] of [['true', true], ['false', false], ['null', null]]) {
      if (s.startsWith(word, i)) { i += word.length; return v; }
    }
    const m = s.slice(i).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
    demand(m, 'JSON_VALUE'); i += m[0].length;
    const n = Number(m[0]); demand(Number.isFinite(n) && (!Number.isInteger(n) || Number.isSafeInteger(n)), 'JSON_NUMBER');
    return n;
  };
  const result = value(0); ws(); demand(i === s.length, 'JSON_TRAILING'); return result;
}

export function safeText(v) {
  demand(typeof v === 'string' && v.length <= 4096, 'UNSAFE_TEXT');
  demand(!/[\x00-\x1f\x7f]/.test(v), 'UNSAFE_TEXT');
  demand(!/-----BEGIN|AGE-SECRET-KEY|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_|(?:AKIA|ASIA)[A-Z0-9]{16}|[a-z]+:\/\/[^\s/]+:[^\s/]+@|(?:password|token|secret|api[_-]?key)\s*[:=]/i.test(v), 'SECRET_PATTERN');
  return v;
}
export function scanSafe(v) {
  if (typeof v === 'string') { safeText(v); return; }
  if (v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) return;
  if (Array.isArray(v)) { v.forEach(scanSafe); return; }
  demand(object(v), 'OUTPUT_TYPE');
  for (const [k, x] of Object.entries(v)) {
    demand(!/^(Env|password|jwt_secret|service_role_key|anon_key|raw_output|raw_error|raw_logs|credentials|auths)$/i.test(k), 'FORBIDDEN_OUTPUT_FIELD');
    safeText(k); scanSafe(x);
  }
}
export function identity(v) {
  safeText(v); demand(/^[A-Za-z0-9][A-Za-z0-9_.:/@+-]{0,255}$/.test(v), 'IDENTITY_FORMAT'); return v;
}
export function projectId(v) {
  demand(typeof v === 'string' && /^[\x00-\x7f]*$/.test(v) && Buffer.byteLength(v) === 35 && /^wwfnd-[0-9]{8}t[0-9]{6}z-[0-9a-f]{12}$/.test(v), 'PROJECT_ID'); return v;
}
export function ownership(labels, expected) {
  projectId(expected); shape(labels, LABELS);
  for (const k of LABELS) {
    shape(labels[k], ['present', 'value']);
    demand(labels[k].present === true && typeof labels[k].value === 'string', 'MISSING_LABEL');
    safeText(labels[k].value); demand(labels[k].value === expected, 'OWNERSHIP_MISMATCH');
  }
  return verdict('PASS', 'BOTH_LABELS_EXACT');
}
export function rawLabels(v) {
  shape(v, LABELS);
  for (const k of LABELS) {
    shape(v[k], ['present', 'value']); demand(typeof v[k].present === 'boolean');
    if (!v[k].present) demand(v[k].value === null, 'ABSENCE_NOT_NULL');
    else identity(v[k].value);
  }
  return v;
}
export function exactSet(actual, expected) {
  demand(Array.isArray(actual) && Array.isArray(expected));
  const a = actual.map(x => JSON.stringify(x)), e = expected.map(x => JSON.stringify(x));
  demand(new Set(a).size === a.length && new Set(e).size === e.length, 'DUPLICATE_RECORD');
  demand(a.length === e.length && a.every(x => e.includes(x)), 'SET_MISMATCH');
  return verdict('PASS', 'EXACT_SET');
}
export function uniqueRecords(records, key) {
  demand(Array.isArray(records), 'RECORDS_TYPE');
  records.forEach(r => { demand(object(r)); identity(r[key]); });
  demand(new Set(records.map(r => r[key])).size === records.length, 'DUPLICATE_RESOURCE'); return records;
}
export function ports(v) {
  demand(object(v), 'PORTS_TYPE'); const out = [];
  for (const [k, bindings] of Object.entries(v)) {
    const m = k.match(/^([1-9][0-9]{0,4})\/(tcp|udp)$/); demand(m && +m[1] <= 65535, 'PORT_KEY');
    if (bindings === null) continue; // Exposed but not published; expected-set comparison detects missing mappings.
    demand(Array.isArray(bindings) && bindings.length > 0, 'PORT_BINDINGS');
    for (const b of bindings) {
      shape(b, ['HostIp', 'HostPort']);
      demand(typeof b.HostIp === 'string' && typeof b.HostPort === 'string' && /^[1-9][0-9]{0,4}$/.test(b.HostPort) && +b.HostPort <= 65535, 'PORT_VALUE');
      out.push({ containerPort: +m[1], protocol: m[2], hostIP: b.HostIp, hostPort: +b.HostPort });
    }
  }
  return out;
}
export function comparePorts(actual, expected) {
  demand(Array.isArray(actual) && Array.isArray(expected));
  for (const p of [...actual, ...expected]) {
    shape(p, ['containerPort', 'protocol', 'hostIP', 'hostPort']);
    demand(['127.0.0.1', '::1'].includes(p.hostIP), 'NON_LOOPBACK');
    demand(p.protocol === 'tcp', 'PROTOCOL');
    demand(Number.isInteger(p.containerPort) && p.containerPort > 0 && p.containerPort <= 65535 && Number.isInteger(p.hostPort) && p.hostPort >= 59320 && p.hostPort <= 59329, 'PORT_RANGE');
  }
  return exactSet(actual, expected);
}
export function contained(root, candidate) {
  demand(typeof root === 'string' && typeof candidate === 'string', 'PATH_TYPE');
  for (const p of [root, candidate]) demand(path.isAbsolute(p) && !p.includes('\0') && !p.split(path.sep).includes('..') && !p.startsWith('//'), 'PATH_FORM');
  const r = path.relative(root, candidate);
  return r === '' || (!r.startsWith('..' + path.sep) && r !== '..' && !path.isAbsolute(r));
}
export function predictVolumes(declared, mounts) {
  demand(object(declared) && Array.isArray(mounts), 'VOLUME_INPUT');
  const destinations = mounts.map(m => { shape(m, ['destination']); demand(typeof m.destination === 'string' && path.posix.isAbsolute(m.destination), 'VOLUME_DESTINATION'); return m.destination; });
  demand(new Set(destinations).size === destinations.length, 'DUPLICATE_DESTINATION');
  const uncovered = Object.keys(declared).filter(d => {
    demand(path.posix.isAbsolute(d) && object(declared[d]) && Object.keys(declared[d]).length === 0, 'IMAGE_VOLUME_SCHEMA');
    return !destinations.includes(d);
  });
  return { result: uncovered.length ? 'FAIL' : 'PASS', uncovered };
}
export function stablePathToken(sourceCategory, original, resolved) {
  demand(['TEMP', 'HOME', 'SUPABASE_HOME', 'DAEMON_VOLUME', 'SESSION_ROOT', 'OTHER'].includes(sourceCategory), 'PATH_CATEGORY');
  for (const p of [original, resolved]) demand(typeof p === 'string' && path.isAbsolute(p) && !p.includes('\0') && !p.split(path.sep).includes('..') && !p.startsWith('//'), 'PATH_FORM');
  const originalDigest = hash(Buffer.from(original, 'utf8'));
  const resolvedDigest = hash(Buffer.from(resolved, 'utf8'));
  return {
    sourceCategory,
    originalToken: `path:${sourceCategory}:original:${originalDigest}`,
    resolvedToken: `path:${sourceCategory}:resolved:${resolvedDigest}`,
    sameCanonicalIdentity: original === resolved,
  };
}
export function daemonVolumePathProjection(mountpoint, daemonRoot) {
  demand(typeof daemonRoot === 'string', 'DAEMON_ROOT_TYPE');
  // Docker Desktop reports a daemon-VM path. Never resolve it through the host filesystem.
  if (mountpoint === undefined) return { classification: 'MISSING', identity: null };
  if (mountpoint === null) return { classification: 'NULL', identity: null };
  if (mountpoint === '') return { classification: 'EMPTY', identity: null };
  demand(typeof mountpoint === 'string', 'VOLUME_MOUNTPOINT_TYPE');
  const classification = contained(daemonRoot, mountpoint) ? 'DAEMON_STORAGE' : 'OUTSIDE_DAEMON_STORAGE';
  return { classification, identity: stablePathToken('DAEMON_VOLUME', mountpoint, mountpoint).resolvedToken };
}
const validIPv4Address = value => {
  const parts = value.split('.');
  return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255);
};
const validIPv6Address = value => {
  if (!/^[0-9A-Fa-f:]+$/.test(value) || value.includes(':::')) return false;
  const compressed = value.includes('::');
  if (compressed && value.indexOf('::') !== value.lastIndexOf('::')) return false;
  const halves = compressed ? value.split('::') : [value];
  const groups = halves.flatMap(half => half === '' ? [] : half.split(':'));
  if (!groups.every(group => /^[0-9A-Fa-f]{1,4}$/.test(group))) return false;
  return compressed ? groups.length < 8 : groups.length === 8;
};
const validIPRangeCIDR = value => {
  const parts = value.split('/');
  if (parts.length !== 2 || !/^(?:0|[1-9]\d*)$/.test(parts[1])) return false;
  const prefix = Number(parts[1]);
  return validIPv4Address(parts[0]) ? prefix <= 32 : validIPv6Address(parts[0]) && prefix <= 128;
};
export function networkAddressProjection(value, field) {
  demand(['SUBNET', 'GATEWAY', 'IP_RANGE'].includes(field), 'NETWORK_ADDRESS_FIELD');
  if (value === null) return { classification: 'NULL', token: null };
  demand(typeof value === 'string', 'NETWORK_ADDRESS_TYPE');
  if (value === '') return { classification: 'EMPTY', token: null };
  safeText(value);
  if (field === 'SUBNET') demand(validIPRangeCIDR(value), 'NETWORK_SUBNET_CIDR');
  if (field === 'IP_RANGE') demand(validIPRangeCIDR(value), 'NETWORK_IP_RANGE_CIDR');
  if (field === 'GATEWAY') demand(validIPv4Address(value) || validIPv6Address(value), 'NETWORK_GATEWAY_IP');
  const base = value.includes('/') ? value.slice(0, value.indexOf('/')) : value;
  const classification = validIPv6Address(base) ? 'IPV6' : validIPv4Address(base) ? 'IPV4' : 'OTHER_SAFE';
  return { classification, token: `network:${field.toLowerCase()}:sha256:${hash(Buffer.from(value, 'utf8'))}` };
}
export function networkAuxiliaryProjection(value) {
  if (value === undefined) return { presence: 'ABSENT', count: 0, token: null };
  if (value === null) return { presence: 'NULL', count: 0, token: null };
  demand(object(value), 'NETWORK_AUXILIARY_TYPE');
  const entries = Object.entries(value);
  for (const [key, address] of entries) {
    demand(key.length > 0 && Buffer.byteLength(key, 'utf8') <= 255, 'NETWORK_AUXILIARY_KEY');
    safeText(key);
    demand(typeof address === 'string', 'NETWORK_AUXILIARY_VALUE_TYPE');
    safeText(address);
    demand(validIPv4Address(address) || validIPv6Address(address), 'NETWORK_AUXILIARY_VALUE_IP');
  }
  const canonical = entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return {
    presence: entries.length ? 'PRESENT' : 'EMPTY',
    count: entries.length,
    token: entries.length ? `network:auxiliary_addresses:sha256:${hash(Buffer.from(JSON.stringify(canonical), 'utf8'))}` : null,
  };
}
export function validateSchemaDocumentHeader(document, expectedTitle) {
  demand(object(document), 'SCHEMA_DOCUMENT_TYPE');
  demand(document.$schema === 'https://json-schema.org/draft/2020-12/schema', 'SCHEMA_DIALECT_UNSUPPORTED');
  demand(document.title === expectedTitle && document.type === 'object', 'WRONG_SCHEMA_SELECTED');
  return verdict('PASS', 'SUPPORTED_DIALECT_AND_EXPECTED_SCHEMA');
}
export function imageProjection(v) {
  const allowed = ['id', 'repoTags', 'repoDigests', 'os', 'architecture', 'variant', 'volumes', 'user', 'workingDir', 'exposedPorts', 'entrypoint', 'cmd', 'healthcheck'];
  const required = ['id', 'os', 'architecture'];
  demand(object(v) && Object.keys(v).every(key => allowed.includes(key)) && required.every(key => Object.hasOwn(v, key)), 'IMAGE_FIELD_SET');
  demand(/^sha256:[0-9a-f]{64}$/.test(v.id), 'IMAGE_ID');
  for (const k of ['os', 'architecture']) { demand(typeof v[k] === 'string' && v[k].length > 0 && v[k].length <= 1024, 'IMAGE_FIELD'); safeText(v[k]); }
  demand(v.os !== 'unknown' && v.architecture !== 'unknown', 'UNSUPPORTED_PLATFORM');
  const has = key => Object.hasOwn(v, key);
  const state = (present, value) => !present ? 'MISSING' : value === null ? 'NULL' : (Array.isArray(value) || object(value) || typeof value === 'string') && value.length === 0 || object(value) && Object.keys(value).length === 0 ? 'EMPTY' : 'PRESENT';
  const aliases = key => {
    if (!has(key)) return { state: 'MISSING', count: 0 };
    demand(v[key] === null || Array.isArray(v[key]) && v[key].every(x => typeof x === 'string' && x.length <= 512), 'IMAGE_ALIASES');
    for (const value of v[key] ?? []) safeText(value);
    return { state: state(true, v[key]), count: (v[key] ?? []).length };
  };
  const stringField = key => {
    if (!has(key)) return { state: 'MISSING', value: null };
    demand(v[key] === null || typeof v[key] === 'string' && v[key].length <= 1024, 'IMAGE_FIELD');
    if (typeof v[key] === 'string') safeText(v[key]);
    return { state: state(true, v[key]), value: v[key] };
  };
  const argv = key => {
    if (!has(key)) return { state: 'MISSING', count: 0, executableClass: null, shellLike: false, networkBootstrapHint: false };
    const value = v[key];
    demand(value === null || Array.isArray(value) && value.every(x => typeof x === 'string' && x.length <= 4096), 'IMAGE_ARGV');
    for (const item of value ?? []) safeText(item);
    return { state: state(true, value), count: (value ?? []).length, executableClass: !value?.length ? null : path.posix.isAbsolute(value[0]) ? 'ABSOLUTE_EXECUTABLE' : /^[A-Za-z0-9_.+-]+$/.test(value[0]) ? 'BARE_EXECUTABLE' : 'COMPLEX_OR_UNKNOWN', shellLike: (value ?? []).some(y => /(?:^|\/)(?:sh|bash|ash)$/.test(y)), networkBootstrapHint: (value ?? []).some(y => /(?:curl|wget|https?:\/\/|git clone|npm install|apk add|apt-get)/i.test(y)) };
  };
  const safeKeyMap = (key, keyValidator, code) => {
    if (!has(key)) return { state: 'MISSING', keys: [] };
    demand(v[key] === null || object(v[key]), code);
    const keys = Object.keys(v[key] ?? {});
    for (const item of keys) { demand(keyValidator(item), code); demand(v[key][item] === null || object(v[key][item]) && Object.keys(v[key][item]).length === 0, code); }
    return { state: state(true, v[key]), keys: keys.sort() };
  };
  const volumes = safeKeyMap('volumes', destination => path.posix.isAbsolute(destination), 'IMAGE_VOLUMES');
  const exposedPorts = safeKeyMap('exposedPorts', port => { const match = port.match(/^([1-9][0-9]{0,4})\/(tcp|udp|sctp)$/); return Boolean(match && Number(match[1]) <= 65535); }, 'IMAGE_PORTS');
  const health = (() => {
    if (!has('healthcheck')) return { state: 'MISSING' };
    if (v.healthcheck === null) return { state: 'NULL' };
    demand(object(v.healthcheck), 'IMAGE_HEALTHCHECK');
    const allowedHealth = ['Test', 'Interval', 'Timeout', 'Retries', 'StartPeriod', 'StartInterval'];
    demand(Object.keys(v.healthcheck).every(key => allowedHealth.includes(key)), 'IMAGE_HEALTHCHECK_FIELD_SET');
    const test = !Object.hasOwn(v.healthcheck, 'Test') ? { state: 'MISSING', count: 0 } : (() => { const value = v.healthcheck.Test; demand(value === null || Array.isArray(value) && value.every(x => typeof x === 'string' && x.length <= 4096), 'IMAGE_HEALTHCHECK_TEST'); for (const item of value ?? []) safeText(item); return { state: state(true, value), count: (value ?? []).length }; })();
    const number = key => { if (!Object.hasOwn(v.healthcheck, key)) return { state: 'MISSING', value: null }; const value = v.healthcheck[key]; demand(value === null || Number.isSafeInteger(value) && value >= 0, 'IMAGE_HEALTHCHECK_NUMBER'); return { state: state(true, value), value }; };
    return { state: Object.keys(v.healthcheck).length ? 'PRESENT' : 'EMPTY', test, interval: number('Interval'), timeout: number('Timeout'), retries: number('Retries'), startPeriod: number('StartPeriod'), startInterval: number('StartInterval') };
  })();
  const repoTags = aliases('repoTags'), repoDigests = aliases('repoDigests');
  const out = {
    id: v.id, repoTagsState: repoTags.state, repoTagCount: repoTags.count, repoDigestsState: repoDigests.state, repoDigestCount: repoDigests.count,
    os: v.os, architecture: v.architecture, variant: stringField('variant'), volumesState: volumes.state, volumeDestinations: volumes.keys,
    user: stringField('user'), workingDir: stringField('workingDir'), exposedPortsState: exposedPorts.state, exposedPorts: exposedPorts.keys,
    entrypoint: argv('entrypoint'), cmd: argv('cmd'), healthcheck: health,
    rawEnvironment: 'NOT_CAPTURED', rawLabels: 'NOT_CAPTURED', unselectedNativeFields: 'NOT_CAPTURED',
  };
  scanSafe(out); return out;
}
export function imageCompatibility(v, approvedPlatform = null) {
  const p = imageProjection(v);
  if (approvedPlatform === null) return { result: 'DIGEST APPROVAL PENDING', projection: p };
  shape(approvedPlatform, ['os', 'architecture', 'variant']);
  demand([p.os, p.architecture, p.variant.value].every((x, i) => x === [approvedPlatform.os, approvedPlatform.architecture, approvedPlatform.variant][i]), 'UNSUPPORTED_PLATFORM');
  return { result: (v.repoDigests ?? []).length ? 'IMAGE-INSPECTION-CLOSED' : 'EMPTY-REPODIGESTS', projection: p };
}
export function safeStderrClass(stderr) {
  const s = Buffer.isBuffer(stderr) ? stderr.toString('utf8') : typeof stderr === 'string' ? stderr : '';
  if (!s) return 'ABSENT';
  if (/no such network|network .* not found/i.test(s)) return 'NETWORK_NOT_FOUND';
  if (/template:|can't evaluate field|executing .* at|wrong type|incompatible types|function .* not defined/i.test(s)) return 'INVALID_FORMAT_TEMPLATE';
  if (/cannot connect|is the docker daemon running|connection refused|dial unix|no such file or directory/i.test(s)) return 'DOCKER_DAEMON_UNREACHABLE';
  if (/permission denied|operation not permitted/i.test(s)) return 'PERMISSION_DENIED';
  if (/context .*not found|context not found/i.test(s)) return 'CONTEXT_NOT_FOUND';
  if (/invalid (?:docker )?endpoint|unsupported protocol|invalid host/i.test(s)) return 'INVALID_ENDPOINT';
  if (/unsupported (?:output|format)|format .* not supported/i.test(s)) return 'UNSUPPORTED_OUTPUT_FORMAT';
  if (/invalid argument|invalid reference format/i.test(s)) return 'INVALID_ARGUMENT';
  if (/unknown flag|unknown command|requires? (?:at least )?\d+ argument|usage:/i.test(s)) return 'CLI_USAGE_ERROR';
  if (/cannot unmarshal|template:|error parsing|invalid character/i.test(s)) return 'RESPONSE_PARSE_ERROR';
  if (/client version .* is too (?:old|new)|api version/i.test(s)) return 'API_VERSION_ERROR';
  return 'UNKNOWN_SAFE_CLASSIFICATION';
}
export function commandDiagnostic(stage, details = {}) {
  demand(['COMMAND_RESOLUTION', 'ARGUMENT_CONSTRUCTION', 'SUBPROCESS_SPAWN', 'DOCKER_CLI_EXIT', 'STDOUT_PARSE', 'SCHEMA_VALIDATION', 'PROJECTION', 'COMPARATOR'].includes(stage), 'DIAGNOSTIC_STAGE');
  const out = {
    stage,
    subStage: details.subStage ?? 'UNSPECIFIED',
    executableSha256: details.executableSha256 ?? null,
    argumentTemplateId: details.argumentTemplateId ?? 'UNSPECIFIED',
    exitCode: details.exitCode === undefined ? null : details.exitCode,
    signal: details.signal === undefined ? null : details.signal,
    commandClass: details.commandClass ?? 'UNKNOWN',
    argumentCategories: details.argumentCategories ?? [],
    stderrClassification: details.stderrClassification ?? 'NOT_OBSERVED',
    stdoutPresence: details.stdoutPresence ?? false,
    parserCategory: details.parserCategory ?? null,
  };
  demand(out.exitCode === null || Number.isSafeInteger(out.exitCode), 'DIAGNOSTIC_EXIT');
  demand(/^(?:D-0[1-6]|HOST-LISTENER|UNSPECIFIED)$/.test(out.subStage), 'DIAGNOSTIC_SUBSTAGE');
  demand(out.executableSha256 === null || /^[0-9a-f]{64}$/.test(out.executableSha256), 'DIAGNOSTIC_EXECUTABLE');
  demand(/^[A-Z0-9_-]+$/.test(out.argumentTemplateId), 'DIAGNOSTIC_TEMPLATE');
  demand(out.signal === null || /^[A-Z0-9]+$/.test(out.signal), 'DIAGNOSTIC_SIGNAL');
  demand(/^[A-Z0-9_-]+$/.test(out.commandClass) && Array.isArray(out.argumentCategories) && out.argumentCategories.every(x => /^[A-Z0-9_-]+$/.test(x)), 'DIAGNOSTIC_CLASS');
  demand(['NOT_OBSERVED', 'ABSENT', 'NETWORK_NOT_FOUND', 'INVALID_FORMAT_TEMPLATE', 'INVALID_ARGUMENT', 'UNSUPPORTED_OUTPUT_FORMAT', 'DOCKER_DAEMON_UNREACHABLE', 'PERMISSION_DENIED', 'CONTEXT_NOT_FOUND', 'INVALID_ENDPOINT', 'CLI_USAGE_ERROR', 'RESPONSE_PARSE_ERROR', 'API_VERSION_ERROR', 'UNKNOWN_SAFE_CLASSIFICATION'].includes(out.stderrClassification) && typeof out.stdoutPresence === 'boolean', 'DIAGNOSTIC_OUTPUT');
  demand(out.parserCategory === null || /^[A-Z0-9_-]+$/.test(out.parserCategory), 'DIAGNOSTIC_PARSER');
  return out;
}
export function collectEvidence(findings, blockers) {
  demand(Array.isArray(findings) && Array.isArray(blockers));
  const byKind = Object.create(null);
  for (const f of findings) { shape(f, ['kind', 'data']); safeText(f.kind); scanSafe(f.data); demand(!Object.hasOwn(byKind, f.kind), 'DUPLICATE_FINDING'); byKind[f.kind] = f.data; }
  blockers.forEach(safeText);
  return { byKind, blockers: [...blockers], expectedValuesChanged: false, retryPerformed: false, repairPerformed: false, cleanupPerformed: false };
}
export function h14Aggregate(sources) {
  demand(Array.isArray(sources) && sources.length === 22, 'H14_SOURCE_COUNT');
  const allowed = ['PASS','PARTIAL','BLOCKED','BLOCKED_BY_DAEMON_STAGE','PENDING phase','GATE-6B-PENDING','MISSING','DISABLED','UNKNOWN','CONDITIONALLY EXTERNAL'];
  for (const row of sources) { shape(row,['source','status']); safeText(row.source); demand(allowed.includes(row.status),'H14_STATUS'); }
  demand(new Set(sources.map(x=>x.source)).size===sources.length,'H14_DUPLICATE_SOURCE');
  const result=sources.some(x=>['BLOCKED','BLOCKED_BY_DAEMON_STAGE'].includes(x.status))?'BLOCKED':sources.some(x=>['PARTIAL','PENDING phase','GATE-6B-PENDING','MISSING','UNKNOWN','CONDITIONALLY EXTERNAL'].includes(x.status))?'PARTIAL':'PASS';
  return {result,sources:[...sources],expectedValuesChanged:false,retryPerformed:false,repairPerformed:false,cleanupPerformed:false};
}
export function provenance(actual, approved) {
  if (actual === null) return verdict('MISSING', 'IMAGE_PREPARATION_REQUIRES_SEPARATE_AUTHORIZATION');
  if (approved === null) return verdict('EXPECTED DIGEST NOT ESTABLISHED', 'NO_INDEPENDENT_APPROVAL');
  shape(approved, ['manifest', 'config', 'os', 'architecture', 'approval']);
  demand(approved.approval === 'INDEPENDENTLY_APPROVED', 'EXPECTED_AUTHORITY');
  demand(/@sha256:[0-9a-f]{64}$/.test(approved.manifest) && /^sha256:[0-9a-f]{64}$/.test(approved.config), 'DIGEST_FORMAT');
  demand(actual.id === approved.config && actual.repoDigests.includes(approved.manifest) && actual.os === approved.os && actual.architecture === approved.architecture, 'IMAGE_MISMATCH');
  // Caller still needs the separately approved Config projection and role overrides.
  return verdict('PASS', 'IDENTITY_ONLY_CONFIG_CONTRACT_STILL_REQUIRED');
}
export function freshness(capture, requested) {
  if (!capture || capture.complete !== true) return verdict('INSPECTION-ERROR', 'INCOMPLETE_BASELINE');
  if (requested === null) return verdict('AMBIGUOUS', 'SESSION_ID_NOT_RESERVED');
  projectId(requested);
  try {
    uniqueRecords(capture.containers, 'id'); uniqueRecords(capture.volumes, 'name'); uniqueRecords(capture.networks, 'id');
    const found = capture.containers.some(r => r.name === 'supabase_db_' + requested) || capture.volumes.some(r => r.name === 'supabase_db_' + requested);
    return verdict(found ? 'EXISTING' : 'FRESH-QUALIFIED', found ? 'DB_RESOURCE_EXISTS' : 'EXACT_DB_CONTAINER_AND_VOLUME_ABSENT');
  } catch { return verdict('INSPECTION-ERROR', 'INVALID_BASELINE'); }
}
export function collision(capture, requested, history) {
  demand(capture?.complete === true, 'INCOMPLETE_BASELINE');
  if (requested === null) return verdict('PARTIAL', 'SESSION_ID_NOT_RESERVED');
  projectId(requested); demand(Array.isArray(history) && history.every(x => typeof x === 'string'), 'HISTORY');
  if (history.includes(requested)) return verdict('FAIL', 'HISTORICAL_ID');
  const suffixes = ['db', 'analytics', 'vector', 'kong', 'auth', 'inbucket', 'realtime', 'rest', 'storage', 'imgproxy', 'pg_meta', 'studio', 'edge_runtime', 'pooler', 'network'];
  const expectedNames = suffixes.map(s => `supabase_${s}_${requested}`);
  const all = [...capture.containers, ...capture.volumes, ...capture.networks];
  for (const r of all) {
    rawLabels(r.labels);
    if (expectedNames.includes(r.name) || LABELS.some(k => r.labels[k].present && r.labels[k].value === requested)) return verdict('FAIL', 'NAME_OR_LABEL_COLLISION');
  }
  if (capture.containers.some(c => c.ports.some(p => p.hostPort >= 59320 && p.hostPort <= 59329))) return verdict('FAIL', 'RESERVED_PORT_COLLISION');
  return verdict('PASS', 'DOCKER_BASELINE_ONLY_HOST_LISTENERS_AND_HISTORY_COMPLETENESS_SEPARATE');
}
export function graph(actual, expected) {
  for (const g of [actual, expected]) {
    shape(g, ['containers', 'volumes', 'networks']);
    uniqueRecords(g.containers, 'id'); uniqueRecords(g.volumes, 'name'); uniqueRecords(g.networks, 'id');
    for (const c of g.containers) {
      shape(c, ['id', 'image', 'networks', 'volumes', 'binds', 'ports']); identity(c.image);
      exactSet(c.networks, c.networks); exactSet(c.volumes, c.volumes);
      demand(Array.isArray(c.binds)); c.binds.forEach(b => { shape(b, ['source', 'destination', 'rw']); demand(typeof b.rw === 'boolean'); safeText(b.source); safeText(b.destination); });
      comparePorts(c.ports, c.ports);
      c.networks.forEach(id => demand(g.networks.some(n => n.id === id && n.containers.includes(c.id)), 'MISSING_NETWORK_EDGE'));
      c.volumes.forEach(name => demand(g.volumes.some(v => v.name === name && v.consumers.includes(c.id)), 'MISSING_VOLUME_EDGE'));
    }
    for (const n of g.networks) { shape(n, ['id', 'containers']); exactSet(n.containers, n.containers); n.containers.forEach(id => demand(g.containers.some(c => c.id === id && c.networks.includes(n.id)), 'FOREIGN_NETWORK_EDGE')); }
    for (const v of g.volumes) { shape(v, ['name', 'consumers']); exactSet(v.consumers, v.consumers); v.consumers.forEach(id => demand(g.containers.some(c => c.id === id && c.volumes.includes(v.name)), 'FOREIGN_VOLUME_EDGE')); }
  }
  exactSet(actual.containers, expected.containers); exactSet(actual.volumes, expected.volumes); exactSet(actual.networks, expected.networks);
  return verdict('PASS', 'BIDIRECTIONAL_GRAPH_EXACT');
}
export function drift(before, after) {
  scanSafe(before); scanSafe(after);
  return verdict(JSON.stringify(before) === JSON.stringify(after) ? 'PASS' : 'FAIL', 'BYTE_EXACT_NO_BASELINE_UPDATE');
}
export function eventLedger(events, expectedIds) {
  demand(Array.isArray(events) && Array.isArray(expectedIds));
  const flows = new Map(); let ordinal = 0;
  for (const e of events) {
    shape(e, ['id', 'action', 'ordinal']); identity(e.id);
    demand(Number.isSafeInteger(e.ordinal) && e.ordinal > ordinal, 'EVENT_ORDER'); ordinal = e.ordinal;
    const states = flows.get(e.id) ?? [];
    demand(e.action === ['create', 'start', 'die', 'destroy'][states.length], 'EVENT_TRANSITION');
    states.push(e.action); flows.set(e.id, states);
  }
  exactSet([...flows.keys()], expectedIds); demand([...flows.values()].every(a => a.length === 4), 'EVENT_INCOMPLETE');
  return verdict('PASS', 'FIXTURE_LIFECYCLE_ONLY_LIVE_OBSERVER_DEFERRED');
}

export const FINDING_FIELDS = Object.freeze({
  source: ['hashes', 'runtime', 'runtimeSha256'], ambientPresence: ['result', 'rows'],
  supabaseBinary: ['original', 'resolved', 'sha256', 'version', 'result', 'reason'],
  tempMetadata: ['original', 'realpath', 'exists', 'mode', 'device', 'inode', 'symlinks', 'containment', 'contentsRead'],
  supabaseHomeMetadata: ['original', 'realpath', 'exists', 'mode', 'device', 'inode', 'symlinks', 'containment', 'contentsRead'],
  dockerExecutable: ['original', 'resolved', 'aliases', 'sha256', 'podmanReachable'],
  dockerContext: ['version', 'context', 'endpoint', 'socketRealpath', 'classification'],
  dockerStages: ['records'],
  networkInspections: ['records'],
  daemon: ['id', 'engine', 'os', 'architecture', 'root', 'localEndpoint', 'rootPathObserved', 'networkDefaultPolicy'],
  baseline: ['complete', 'containers', 'volumes', 'networks'], freshness: ['result', 'reason'],
  collision: ['result', 'reason', 'reservedPortCollisions'],
  images: ['images', 'approvedDigestEvidence', 'completeness', 'aliasRows'],
  imageRoles: ['roles', 'requiredPresent', 'requiredMissing', 'digestApproval'],
  graph: ['containers', 'volumes', 'networks', 'completeness'],
  listeners: ['range', 'records', 'result'],
  inputProjection: ['configSource', 'environment', 'equivalence', 'result'],
  readerCoverage: ['result', 'rows'],
  optionalControls: ['telemetry', 'notifier', 'pgdelta', 'vector', 'egress'],
  h14: ['result', 'sources', 'expectedValuesChanged', 'retryPerformed', 'repairPerformed', 'cleanupPerformed'],
  provenance: ['packageManager', 'packageVersion', 'architecture', 'formulaArchiveSha256', 'installedBinarySha256', 'sourceTapCommit', 'result', 'reason'],
  diagnostic: ['stage', 'subStage', 'executableSha256', 'argumentTemplateId', 'exitCode', 'signal', 'commandClass', 'argumentCategories', 'stderrClassification', 'stdoutPresence', 'parserCategory'],
  collection: ['findingKinds', 'blockers', 'expectedValuesChanged', 'retryPerformed', 'repairPerformed', 'cleanupPerformed'],
});
export function validateEnvelope(e) {
  shape(e, ['schema_version', 'helper_id', 'helper_sha256', 'timestamp', 'phase', 'subject', 'result', 'findings', 'error']);
  demand(e.schema_version === '1' && e.helper_id === 'FOUNDATION-PRESTART-1' && /^[0-9a-f]{64}$/.test(e.helper_sha256), 'ENVELOPE_ID');
  demand(e.phase === 'READ_ONLY_PRESTART' && e.subject === 'LOCAL_METADATA_NOT_EXECUTION_SESSION' && ['PARTIAL', 'BLOCKED'].includes(e.result), 'ENVELOPE_PHASE');
  demand(typeof e.timestamp === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(e.timestamp), 'ENVELOPE_TIME');
  demand(e.error === null || /^[A-Z][A-Z0-9_]+$/.test(e.error), 'ERROR_CODE');
  demand(Array.isArray(e.findings)); exactSet(e.findings.map(x => x.kind), e.findings.map(x => x.kind));
  for (const f of e.findings) { shape(f, ['kind', 'data']); demand(Object.hasOwn(FINDING_FIELDS, f.kind), 'UNKNOWN_FINDING'); shape(f.data, FINDING_FIELDS[f.kind]); }
  scanSafe(e); return e;
}
