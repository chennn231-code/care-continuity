// Bounded public-registry metadata resolver. It never reads Docker state,
// credentials, credential helpers, environment variables, or filesystem layers.
import fs from 'node:fs';
import https from 'node:https';

import { ContractError, demand, hash, object, parseJSON, safeText, shape } from './contracts.mjs';

export const REGISTRY_RESOLVER_TYPE = 'FOUNDATION_PUBLIC_REGISTRY_METADATA_RESOLVER';
export const REGISTRY_RESOLVER_ID = 'WINWIN_PUBLIC_REGISTRY_METADATA_V1';
const CONTRACT_URL = new URL('../contracts/registry-digest-resolver-contract.json', import.meta.url);
const MODULE_URL = new URL(import.meta.url);
const SHA = /^sha256:[0-9a-f]{64}$/;
const REPOSITORY = /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)+$/;
const TAG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const PROTECTED_HEADER_RULES = Object.freeze({
  'content-type': 'SINGLETON_EXACT',
  'docker-content-digest': 'BYTE_IDENTICAL_DUPLICATE_COLLAPSIBLE',
  'www-authenticate': 'SEMANTICALLY_EQUIVALENT_CHALLENGE_COLLAPSIBLE',
  location: 'DUPLICATE_FORBIDDEN',
  'set-cookie': 'MULTI_VALUE_ALLOWED_RESPONSE_REJECTED',
});
const canonical = value => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
};
const sha256 = bytes => `sha256:${hash(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, 'utf8'))}`;
const exact = (value, keys, code) => {
  demand(object(value), code);
  try { shape(value, keys); } catch { throw new ContractError(code); }
  return value;
};
const header = (headers, name) => {
  const value = headers?.[name.toLowerCase()];
  demand(value === undefined || typeof value === 'string', 'REGISTRY_HEADER_SHAPE');
  return value;
};
const body = (response, maximum, code) => {
  demand(Buffer.isBuffer(response?.body), code);
  demand(response.body.length > 0 && response.body.length <= maximum, code);
  return response.body;
};
const mediaType = value => typeof value === 'string' ? value.split(';', 1)[0].trim() : '';

export function validateRegistryResolverContract(contract) {
  exact(contract, ['schema_version', 'contract_type', 'purpose', 'resolver_id', 'resolver_version', 'target_platform', 'approved_sources', 'network_policy', 'protected_header_policy', 'layer_policy', 'attempt_policy', 'bounds', 'media_types', 'evidence_policy'], 'REGISTRY_CONTRACT');
  demand(contract.schema_version === '1' && contract.contract_type === REGISTRY_RESOLVER_TYPE && contract.resolver_id === REGISTRY_RESOLVER_ID && contract.resolver_version === '1.0.0', 'REGISTRY_CONTRACT_TYPE');
  exact(contract.target_platform, ['os', 'architecture', 'variant'], 'REGISTRY_PLATFORM');
  demand(contract.target_platform.os === 'linux' && contract.target_platform.architecture === 'arm64' && contract.target_platform.variant === 'v8', 'REGISTRY_PLATFORM_VALUE');
  demand(Array.isArray(contract.approved_sources) && contract.approved_sources.length > 0, 'REGISTRY_SOURCES');
  const roles = [], references = [];
  for (const source of contract.approved_sources) {
    exact(source, ['role', 'source_reference', 'registry_host', 'repository', 'tag'], 'REGISTRY_SOURCE');
    demand(/^[A-Z][A-Z0-9_]{1,63}$/.test(source.role), 'REGISTRY_ROLE'); roles.push(source.role);
    demand(source.registry_host === 'registry-1.docker.io' && REPOSITORY.test(source.repository) && TAG.test(source.tag), 'REGISTRY_SOURCE_VALUE');
    demand(source.source_reference === `${source.repository}:${source.tag}`, 'REGISTRY_SOURCE_REFERENCE'); references.push(source.source_reference);
  }
  demand(new Set(roles).size === roles.length && new Set(references).size === references.length, 'REGISTRY_SOURCE_DUPLICATE');
  const network = exact(contract.network_policy, ['registry_hosts', 'anonymous_auth_hosts', 'redirects', 'credentials', 'docker_auth_config', 'credential_helpers', 'environment_proxy', 'anonymous_scope'], 'REGISTRY_NETWORK');
  demand(JSON.stringify(network.registry_hosts) === JSON.stringify(['registry-1.docker.io']) && JSON.stringify(network.anonymous_auth_hosts) === JSON.stringify(['auth.docker.io']), 'REGISTRY_HOSTS');
  demand(network.redirects === 'REJECT' && network.credentials === 'FORBIDDEN' && network.docker_auth_config === 'FORBIDDEN' && network.credential_helpers === 'FORBIDDEN' && network.environment_proxy === 'FORBIDDEN' && network.anonymous_scope === 'EXACT_REPOSITORY_PULL_METADATA_ONLY', 'REGISTRY_NETWORK_POLICY');
  const protectedHeaders = exact(contract.protected_header_policy, ['multiplicity_authority', 'normalized_headers_object', 'unknown_policy', 'headers'], 'REGISTRY_HEADER_POLICY');
  demand(protectedHeaders.multiplicity_authority === 'NODE_INCOMING_MESSAGE_RAW_HEADERS' && protectedHeaders.normalized_headers_object === 'FORBIDDEN_AS_MULTIPLICITY_AUTHORITY' && protectedHeaders.unknown_policy === 'DUPLICATE_FORBIDDEN', 'REGISTRY_HEADER_POLICY_VALUE');
  exact(protectedHeaders.headers, Object.keys(PROTECTED_HEADER_RULES), 'REGISTRY_HEADER_RULES');
  demand(Object.entries(PROTECTED_HEADER_RULES).every(([name, rule]) => protectedHeaders.headers[name] === rule), 'REGISTRY_HEADER_RULE_VALUE');
  const layers = exact(contract.layer_policy, ['filesystem_layers', 'config_blob', 'config_blob_requests_per_role'], 'REGISTRY_LAYERS');
  demand(layers.filesystem_layers === 'FORBIDDEN' && layers.config_blob === 'ALLOWED_AS_NON_FILESYSTEM_METADATA_BY_EXACT_CHILD_DESCRIPTOR' && layers.config_blob_requests_per_role === 1, 'REGISTRY_LAYER_POLICY');
  const attempts = exact(contract.attempt_policy, ['logical_attempts_per_role', 'initial_manifest_requests', 'anonymous_token_exchanges', 'authenticated_manifest_requests', 'child_manifest_requests', 'config_blob_requests', 'retry', 'tag_substitution', 'fallback_registry'], 'REGISTRY_ATTEMPTS');
  demand(['logical_attempts_per_role','initial_manifest_requests','anonymous_token_exchanges','authenticated_manifest_requests','child_manifest_requests','config_blob_requests'].every(key => attempts[key] === 1), 'REGISTRY_ATTEMPT_COUNT');
  demand(attempts.retry === 'FORBIDDEN' && attempts.tag_substitution === 'FORBIDDEN' && attempts.fallback_registry === 'FORBIDDEN', 'REGISTRY_ATTEMPT_POLICY');
  exact(contract.bounds, ['timeout_ms', 'token_body_bytes', 'manifest_body_bytes', 'config_body_bytes'], 'REGISTRY_BOUNDS');
  demand(contract.bounds.timeout_ms === 10000 && contract.bounds.token_body_bytes === 65536 && contract.bounds.manifest_body_bytes === 4194304 && contract.bounds.config_body_bytes === 2097152, 'REGISTRY_BOUND_VALUES');
  exact(contract.media_types, ['indexes', 'manifests', 'configs'], 'REGISTRY_MEDIA_TYPES');
  demand(contract.media_types.indexes.length === 2 && contract.media_types.manifests.length === 2 && contract.media_types.configs.length === 2, 'REGISTRY_MEDIA_TYPE_VALUES');
  const evidence = exact(contract.evidence_policy, ['raw_headers', 'authorization', 'tokens', 'cookies', 'safe_response_hashes', 'timestamp'], 'REGISTRY_EVIDENCE');
  demand(evidence.raw_headers === 'FORBIDDEN' && evidence.authorization === 'FORBIDDEN' && evidence.tokens === 'IN_MEMORY_ONLY' && evidence.cookies === 'FORBIDDEN' && evidence.safe_response_hashes === 'REQUIRED' && evidence.timestamp === 'NON_AUTHORITATIVE_METADATA', 'REGISTRY_EVIDENCE_POLICY');
  return contract;
}

export function parseApprovedSourceReference(contract, role, sourceReference) {
  validateRegistryResolverContract(contract);
  demand(typeof sourceReference === 'string' && sourceReference.length > 0, 'REGISTRY_REFERENCE');
  const source = contract.approved_sources.find(row => row.role === role);
  demand(source && source.source_reference === sourceReference, 'REGISTRY_UNAPPROVED_SOURCE');
  demand(`${source.repository}:${source.tag}` === sourceReference, 'REGISTRY_REFERENCE_NORMALIZATION');
  return structuredClone(source);
}

function parseBearerChallenge(value) {
  demand(typeof value === 'string' && value.startsWith('Bearer '), 'REGISTRY_AUTH_CHALLENGE');
  let offset = 7;
  const fields = {};
  while (offset < value.length) {
    const key = /^[a-z]+/.exec(value.slice(offset));
    demand(key && !Object.hasOwn(fields, key[0]), 'REGISTRY_AUTH_CHALLENGE');
    offset += key[0].length;
    demand(value.slice(offset, offset + 2) === '="', 'REGISTRY_AUTH_CHALLENGE');
    offset += 2;
    let decoded = '', closed = false;
    while (offset < value.length) {
      const character = value[offset++];
      if (character === '"') { closed = true; break; }
      if (character === '\\') {
        demand(offset < value.length && /^[\x20-\x7e]$/.test(value[offset]), 'REGISTRY_AUTH_CHALLENGE');
        decoded += value[offset++];
      } else {
        demand(/^[\x20-\x21\x23-\x5b\x5d-\x7e]$/.test(character), 'REGISTRY_AUTH_CHALLENGE');
        decoded += character;
      }
    }
    demand(closed && decoded.length > 0, 'REGISTRY_AUTH_CHALLENGE');
    fields[key[0]] = decoded;
    if (offset === value.length) break;
    demand(value[offset] === ',', 'REGISTRY_AUTH_CHALLENGE');
    offset += 1;
    while (value[offset] === ' ' || value[offset] === '\t') offset += 1;
    demand(offset < value.length, 'REGISTRY_AUTH_CHALLENGE');
  }
  exact(fields, ['realm', 'service', 'scope'], 'REGISTRY_AUTH_CHALLENGE');
  return fields;
}

export function canonicalizeProtectedHeaders(rawHeaders, contract) {
  validateRegistryResolverContract(contract);
  demand(Array.isArray(rawHeaders) && rawHeaders.length % 2 === 0 && rawHeaders.every(value => typeof value === 'string' && !/[\r\n]/.test(value)), 'REGISTRY_RAW_HEADERS');
  const grouped = new Map(Object.keys(PROTECTED_HEADER_RULES).map(name => [name, []]));
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index].toLowerCase();
    if (grouped.has(name)) grouped.get(name).push(rawHeaders[index + 1]);
  }
  const headers = {};
  for (const [name, values] of grouped) {
    if (values.length === 0) continue;
    const rule = contract.protected_header_policy.headers[name];
    if (rule === 'SINGLETON_EXACT' || rule === 'DUPLICATE_FORBIDDEN') {
      demand(values.length === 1, 'REGISTRY_HEADER_DUPLICATE');
      headers[name] = values[0];
    } else if (rule === 'BYTE_IDENTICAL_DUPLICATE_COLLAPSIBLE') {
      demand(values.every(value => value === values[0]), 'REGISTRY_HEADER_CONFLICT');
      headers[name] = values[0];
    } else if (rule === 'SEMANTICALLY_EQUIVALENT_CHALLENGE_COLLAPSIBLE') {
      const parsed = values.map(parseBearerChallenge), baseline = canonical(parsed[0]);
      demand(parsed.every(value => canonical(value) === baseline), 'REGISTRY_AUTH_CONFLICT');
      headers[name] = values[0];
    } else if (rule === 'MULTI_VALUE_ALLOWED_RESPONSE_REJECTED') {
      headers[name] = 'PRESENT_REJECTED';
    } else throw new ContractError('REGISTRY_HEADER_RULE_UNKNOWN');
  }
  return headers;
}

export function parseAnonymousBearerChallenge(value, source) {
  const fields = parseBearerChallenge(value);
  const realm = new URL(fields.realm);
  demand(realm.protocol === 'https:' && realm.hostname === 'auth.docker.io' && realm.pathname === '/token' && realm.search === '' && realm.username === '' && realm.password === '', 'REGISTRY_AUTH_REALM');
  demand(fields.service === 'registry.docker.io' && fields.scope === `repository:${source.repository}:pull`, 'REGISTRY_AUTH_SCOPE');
  return { host: 'auth.docker.io', path: `/token?service=registry.docker.io&scope=${encodeURIComponent(fields.scope)}` };
}

function responseStatus(response, code) {
  demand(Number.isSafeInteger(response?.status), code);
  demand(response.status < 300 || response.status >= 400, 'REGISTRY_UNEXPECTED_REDIRECT');
  demand(header(response.headers, 'set-cookie') === undefined, 'REGISTRY_COOKIE');
  if (response.status === 429) throw new ContractError('REGISTRY_RATE_LIMIT');
  demand(response.status === 200, code);
}

function parseJson(bytes, code) {
  try { return parseJSON(bytes); } catch { throw new ContractError(code); }
}

function parseManifestResponse(response, contract, expectedDigest = null) {
  responseStatus(response, 'REGISTRY_MANIFEST_STATUS');
  const bytes = body(response, contract.bounds.manifest_body_bytes, 'REGISTRY_MANIFEST_BODY');
  const digestHeader = header(response.headers, 'docker-content-digest');
  demand(typeof digestHeader === 'string' && SHA.test(digestHeader), 'REGISTRY_DIGEST_HEADER');
  const computed = sha256(bytes);
  demand(computed === digestHeader && (expectedDigest === null || expectedDigest === digestHeader), 'REGISTRY_DIGEST_MISMATCH');
  const declaredMediaType = mediaType(header(response.headers, 'content-type'));
  const value = parseJson(bytes, 'REGISTRY_MANIFEST_JSON');
  demand(object(value) && typeof value.mediaType === 'string' && value.mediaType === declaredMediaType, 'REGISTRY_MEDIA_TYPE_MISMATCH');
  demand(contract.media_types.indexes.includes(value.mediaType) || contract.media_types.manifests.includes(value.mediaType), 'REGISTRY_UNSUPPORTED_MEDIA_TYPE');
  return { value, digest: digestHeader, media_type: value.mediaType, response_sha256: computed.slice(7) };
}

export function selectExactPlatform(index, platform) {
  demand(object(index) && Array.isArray(index.manifests), 'REGISTRY_INDEX');
  const matches = index.manifests.filter(row => object(row) && object(row.platform) && row.platform.os === platform.os && row.platform.architecture === platform.architecture && (row.platform.variant ?? '') === platform.variant);
  demand(matches.length === 1, matches.length === 0 ? 'REGISTRY_PLATFORM_MISSING' : 'REGISTRY_PLATFORM_DUPLICATE');
  const descriptor = matches[0];
  demand(SHA.test(descriptor.digest) && Number.isSafeInteger(descriptor.size) && descriptor.size > 0, 'REGISTRY_PLATFORM_DESCRIPTOR');
  return { digest: descriptor.digest, media_type: descriptor.mediaType, size: descriptor.size, platform: structuredClone(platform) };
}

function descriptor(value, mediaTypes, code) {
  demand(object(value) && SHA.test(value.digest) && Number.isSafeInteger(value.size) && value.size > 0 && mediaTypes.includes(value.mediaType), code);
  return value;
}

function nullableStringArray(value, code) {
  demand(value === null || value === undefined || Array.isArray(value) && value.every(item => typeof item === 'string'), code);
  return value === undefined ? null : value;
}

function safeConfigProjection(config, platform, platformProvenByIndex) {
  demand(object(config) && config.os === platform.os && config.architecture === platform.architecture, 'REGISTRY_CONFIG_PLATFORM');
  if (!platformProvenByIndex) demand((config.variant ?? '') === platform.variant, 'REGISTRY_CONFIG_VARIANT');
  if (config.variant !== undefined) demand(config.variant === platform.variant, 'REGISTRY_CONFIG_VARIANT');
  const selected = object(config.config) ? config.config : {};
  const entrypoint = nullableStringArray(selected.Entrypoint, 'REGISTRY_CONFIG_ENTRYPOINT');
  const cmd = nullableStringArray(selected.Cmd, 'REGISTRY_CONFIG_CMD');
  demand(selected.User === undefined || typeof selected.User === 'string', 'REGISTRY_CONFIG_USER');
  demand(selected.WorkingDir === undefined || typeof selected.WorkingDir === 'string', 'REGISTRY_CONFIG_WORKDIR');
  const volumes = selected.Volumes === undefined || selected.Volumes === null ? [] : Object.keys(selected.Volumes);
  demand(volumes.every(value => value.startsWith('/') && !value.includes('..')), 'REGISTRY_CONFIG_VOLUMES');
  const exposedPorts = selected.ExposedPorts === undefined || selected.ExposedPorts === null ? [] : Object.keys(selected.ExposedPorts);
  demand(exposedPorts.every(value => /^[0-9]{1,5}\/(tcp|udp|sctp)$/.test(value)), 'REGISTRY_CONFIG_PORTS');
  let healthcheck = null;
  if (selected.Healthcheck !== undefined && selected.Healthcheck !== null) {
    const allowed = ['Test', 'Interval', 'Timeout', 'Retries', 'StartPeriod'];
    demand(object(selected.Healthcheck) && Object.keys(selected.Healthcheck).every(key => allowed.includes(key)) && Object.hasOwn(selected.Healthcheck, 'Test'), 'REGISTRY_CONFIG_HEALTHCHECK');
    demand(Array.isArray(selected.Healthcheck.Test) && selected.Healthcheck.Test.every(value => typeof value === 'string'), 'REGISTRY_CONFIG_HEALTHCHECK_TEST');
    for (const key of ['Interval', 'Timeout', 'Retries', 'StartPeriod']) if (selected.Healthcheck[key] !== undefined) demand(Number.isSafeInteger(selected.Healthcheck[key]) && selected.Healthcheck[key] >= 0, 'REGISTRY_CONFIG_HEALTHCHECK_VALUE');
    healthcheck = structuredClone(selected.Healthcheck);
  }
  const projection = { platform: structuredClone(platform), user: selected.User ?? '', working_dir: selected.WorkingDir ?? '', entrypoint, cmd, declared_volumes: volumes.sort(), exposed_ports: exposedPorts.sort(), healthcheck };
  return { projection, sha256: hash(Buffer.from(canonical(projection), 'utf8')) };
}

function tokenFromResponse(response, contract) {
  responseStatus(response, 'REGISTRY_TOKEN_STATUS');
  const value = parseJson(body(response, contract.bounds.token_body_bytes, 'REGISTRY_TOKEN_BODY'), 'REGISTRY_TOKEN_JSON');
  demand(object(value), 'REGISTRY_TOKEN_JSON');
  const present = ['token', 'access_token'].filter(key => typeof value[key] === 'string' && value[key].length > 0);
  demand(present.length === 1 && value[present[0]].length <= 16384, 'REGISTRY_TOKEN_VALUE');
  return value[present[0]];
}

export async function resolveRegistryDigest({ contract, role, sourceReference, request, resolverSha256, clock = () => new Date() }) {
  validateRegistryResolverContract(contract);
  demand(typeof request === 'function' && /^[0-9a-f]{64}$/.test(resolverSha256), 'REGISTRY_RESOLVER_INPUT');
  const source = parseApprovedSourceReference(contract, role, sourceReference);
  const accept = [...contract.media_types.indexes, ...contract.media_types.manifests].join(', ');
  const manifestPath = `/v2/${source.repository}/manifests/${source.tag}`;
  let token = null, initial = await request({ host: source.registry_host, path: manifestPath, headers: { accept }, maximum_body_bytes: contract.bounds.manifest_body_bytes, timeout_ms: contract.bounds.timeout_ms, purpose: 'TOP_LEVEL_MANIFEST' });
  if (initial.status === 401) {
    const auth = parseAnonymousBearerChallenge(header(initial.headers, 'www-authenticate'), source);
    const tokenResponse = await request({ host: auth.host, path: auth.path, headers: { accept: 'application/json' }, maximum_body_bytes: contract.bounds.token_body_bytes, timeout_ms: contract.bounds.timeout_ms, purpose: 'ANONYMOUS_TOKEN' });
    token = tokenFromResponse(tokenResponse, contract);
    initial = await request({ host: source.registry_host, path: manifestPath, headers: { accept, authorization: `Bearer ${token}` }, maximum_body_bytes: contract.bounds.manifest_body_bytes, timeout_ms: contract.bounds.timeout_ms, purpose: 'TOP_LEVEL_MANIFEST_AUTHENTICATED' });
  }
  const top = parseManifestResponse(initial, contract);
  let child = top, selectedByIndex = false;
  if (contract.media_types.indexes.includes(top.media_type)) {
    selectedByIndex = true;
    const selected = selectExactPlatform(top.value, contract.target_platform);
    demand(contract.media_types.manifests.includes(selected.media_type), 'REGISTRY_CHILD_MEDIA_TYPE');
    const response = await request({ host: source.registry_host, path: `/v2/${source.repository}/manifests/${selected.digest}`, headers: { accept, ...(token === null ? {} : { authorization: `Bearer ${token}` }) }, maximum_body_bytes: contract.bounds.manifest_body_bytes, timeout_ms: contract.bounds.timeout_ms, purpose: 'PLATFORM_CHILD_MANIFEST' });
    child = parseManifestResponse(response, contract, selected.digest);
  }
  demand(contract.media_types.manifests.includes(child.media_type), 'REGISTRY_CHILD_MANIFEST');
  const configDescriptor = descriptor(child.value.config, contract.media_types.configs, 'REGISTRY_CONFIG_DESCRIPTOR');
  demand(Array.isArray(child.value.layers) && child.value.layers.every(layer => object(layer) && SHA.test(layer.digest) && Number.isSafeInteger(layer.size) && layer.size >= 0), 'REGISTRY_LAYER_DESCRIPTORS');
  const configResponse = await request({ host: source.registry_host, path: `/v2/${source.repository}/blobs/${configDescriptor.digest}`, headers: { accept: configDescriptor.mediaType, ...(token === null ? {} : { authorization: `Bearer ${token}` }) }, maximum_body_bytes: contract.bounds.config_body_bytes, timeout_ms: contract.bounds.timeout_ms, purpose: 'CONFIG_METADATA_BLOB' });
  responseStatus(configResponse, 'REGISTRY_CONFIG_STATUS');
  const configBytes = body(configResponse, contract.bounds.config_body_bytes, 'REGISTRY_CONFIG_BODY');
  const configHash = sha256(configBytes);
  demand(configHash === configDescriptor.digest, 'REGISTRY_CONFIG_DIGEST_MISMATCH');
  const config = parseJson(configBytes, 'REGISTRY_CONFIG_JSON');
  const safe = safeConfigProjection(config, contract.target_platform, selectedByIndex);
  const resolution = {
    schema_version: '1', role, source_reference: source.source_reference, registry_host: source.registry_host,
    repository: source.repository, requested_tag: source.tag, manifest_media_type: top.media_type,
    top_level_manifest_digest: top.digest, platform_child_digest: child.digest, config_digest: configDescriptor.digest,
    required_repo_digest: `${source.repository}@${top.digest}`, platform: structuredClone(contract.target_platform),
    selected_config_sha256: safe.sha256, declared_volumes: safe.projection.declared_volumes,
    entrypoint_policy: 'REVIEWED_STRUCTURAL_ENTRYPOINT', resolver_id: contract.resolver_id,
    resolver_version: contract.resolver_version, resolver_sha256: resolverSha256,
    response_hashes: { manifest: top.response_sha256, child_manifest: child.response_sha256, config: configHash.slice(7) },
    resolved_at_utc: clock().toISOString(), network: { metadata_only: true, filesystem_layers_downloaded: false, anonymous_auth: token === null ? 'NOT_REQUIRED' : 'ANONYMOUS_BEARER' },
  };
  const authoritative = structuredClone(resolution); delete authoritative.resolved_at_utc;
  resolution.source_record_sha256 = hash(Buffer.from(canonical(authoritative), 'utf8'));
  return resolution;
}

export function createBoundedHttpsTransport(contract) {
  validateRegistryResolverContract(contract);
  return spec => new Promise((resolve, reject) => {
    try {
      exact(spec, ['host', 'path', 'headers', 'maximum_body_bytes', 'timeout_ms', 'purpose'], 'REGISTRY_REQUEST');
      demand([...contract.network_policy.registry_hosts, ...contract.network_policy.anonymous_auth_hosts].includes(spec.host), 'REGISTRY_REQUEST_HOST');
      demand(typeof spec.path === 'string' && spec.path.startsWith('/') && !spec.path.includes('..') && !spec.path.includes('\\'), 'REGISTRY_REQUEST_PATH');
      demand(Number.isSafeInteger(spec.maximum_body_bytes) && spec.maximum_body_bytes > 0 && spec.maximum_body_bytes <= contract.bounds.manifest_body_bytes, 'REGISTRY_REQUEST_BOUND');
      demand(spec.timeout_ms === contract.bounds.timeout_ms && object(spec.headers), 'REGISTRY_REQUEST_POLICY');
      const allowedHeaders = ['accept', 'authorization']; shape(spec.headers, allowedHeaders.filter(key => Object.hasOwn(spec.headers, key)));
      if (spec.headers.authorization !== undefined) demand(/^Bearer [A-Za-z0-9._~+\/-]+=*$/.test(spec.headers.authorization), 'REGISTRY_REQUEST_AUTHORIZATION');
      const request = https.request({ protocol: 'https:', hostname: spec.host, port: 443, method: 'GET', path: spec.path, headers: spec.headers, timeout: spec.timeout_ms, agent: false }, response => {
        const chunks = []; let length = 0;
        const declaredLength = response.headers['content-length'];
        if (declaredLength !== undefined) {
          if (Array.isArray(declaredLength) || !/^[0-9]+$/.test(declaredLength) || Number(declaredLength) > spec.maximum_body_bytes) { request.destroy(new ContractError('REGISTRY_CONTENT_LENGTH')); return; }
        }
        response.on('data', chunk => {
          length += chunk.length;
          if (length > spec.maximum_body_bytes) { request.destroy(new ContractError('REGISTRY_BODY_LIMIT')); return; }
          chunks.push(chunk);
        });
        response.on('end', () => {
          if (typeof declaredLength === 'string' && Number(declaredLength) !== length) { reject(new ContractError('REGISTRY_PARTIAL_RESPONSE')); return; }
          let headers;
          try { headers = canonicalizeProtectedHeaders(response.rawHeaders, contract); }
          catch (error) { reject(error); return; }
          if (typeof declaredLength === 'string') headers['content-length'] = declaredLength;
          resolve({ status: response.statusCode, headers, body: Buffer.concat(chunks) });
        });
      });
      request.on('timeout', () => request.destroy(new ContractError('REGISTRY_TIMEOUT')));
      request.on('error', error => reject(error instanceof ContractError ? error : new ContractError('REGISTRY_NETWORK')));
      request.end();
    } catch (error) { reject(error); }
  });
}

export function registryResolverService() {
  const bytes = fs.readFileSync(CONTRACT_URL), contract = parseJSON(bytes);
  validateRegistryResolverContract(contract);
  return Object.freeze({ contract: () => structuredClone(contract), contractSha256: hash(bytes), resolverSha256: hash(fs.readFileSync(MODULE_URL)), createTransport: () => createBoundedHttpsTransport(contract) });
}
