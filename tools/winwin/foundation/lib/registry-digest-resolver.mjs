// Bounded public-registry metadata resolver. It never reads Docker state,
// credentials, credential helpers, environment variables, or filesystem layers.
import fs from 'node:fs';
import https from 'node:https';
import net from 'node:net';

import { ContractError, demand, hash, object, parseJSON, safeText, shape } from './contracts.mjs';

export const REGISTRY_RESOLVER_TYPE = 'FOUNDATION_PUBLIC_REGISTRY_METADATA_RESOLVER';
export const REGISTRY_RESOLVER_ID = 'WINWIN_PUBLIC_REGISTRY_METADATA_V1';
const CONTRACT_URL = new URL('../contracts/registry-digest-resolver-contract.json', import.meta.url);
const MODULE_URL = new URL(import.meta.url);
const SHA = /^sha256:[0-9a-f]{64}$/;
const BEARER_TOKEN = /^[A-Za-z0-9._~+\/-]+=*$/;
const REPOSITORY = /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)+$/;
const TAG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const PROTECTED_HEADER_RULES = Object.freeze({
  'content-type': 'SINGLETON_EXACT',
  'docker-content-digest': 'BYTE_IDENTICAL_DUPLICATE_COLLAPSIBLE',
  'www-authenticate': 'SEMANTICALLY_EQUIVALENT_CHALLENGE_COLLAPSIBLE',
  location: 'DUPLICATE_FORBIDDEN',
  'set-cookie': 'RECEIVE_NON_PARTICIPATING_RESPONSE_ONLY',
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
  exact(contract, ['schema_version', 'contract_type', 'purpose', 'resolver_id', 'resolver_version', 'target_platform', 'platform_selection_policy', 'healthcheck_policy', 'approved_sources', 'network_policy', 'config_blob_redirect_policy', 'protected_header_policy', 'response_cookie_policy', 'token_response_policy', 'layer_policy', 'attempt_policy', 'bounds', 'media_types', 'evidence_policy'], 'REGISTRY_CONTRACT');
  demand(contract.schema_version === '1' && contract.contract_type === REGISTRY_RESOLVER_TYPE && contract.resolver_id === REGISTRY_RESOLVER_ID && contract.resolver_version === '1.0.0', 'REGISTRY_CONTRACT_TYPE');
  exact(contract.target_platform, ['os', 'architecture', 'variant'], 'REGISTRY_PLATFORM');
  demand(contract.target_platform.os === 'linux' && contract.target_platform.architecture === 'arm64' && contract.target_platform.variant === 'v8', 'REGISTRY_PLATFORM_VALUE');
  const platformPolicy = exact(contract.platform_selection_policy, ['mode', 'runtime_semantics', 'arm64_v8_omitted_variant', 'descriptor_null_variant', 'config_null_variant', 'explicit_variant', 'conflicting_explicit_arm64_variant', 'other_architecture_missing_variant', 'executable_descriptor_media_types', 'non_runtime_descriptors', 'uniqueness', 'zero_matches', 'multiple_matches', 'config_cross_check'], 'REGISTRY_PLATFORM_POLICY');
  demand(platformPolicy.mode === 'RUNTIME_COMPATIBILITY_EXACT_UNIQUE' && platformPolicy.runtime_semantics === 'CONTAINERD_PLATFORMS_NORMALIZE', 'REGISTRY_PLATFORM_POLICY_MODE');
  demand(platformPolicy.arm64_v8_omitted_variant === 'COMPATIBLE_WITH_V8' && platformPolicy.descriptor_null_variant === 'EXCLUDE' && platformPolicy.config_null_variant === 'EQUIVALENT_TO_OMITTED' && platformPolicy.explicit_variant === 'EXACT', 'REGISTRY_PLATFORM_POLICY_VARIANT');
  demand(platformPolicy.conflicting_explicit_arm64_variant === 'AMBIGUOUS_IF_OMITTED_CANDIDATE_SELECTED' && platformPolicy.other_architecture_missing_variant === 'NO_IMPLICIT_COMPATIBILITY', 'REGISTRY_PLATFORM_POLICY_SCOPE');
  demand(platformPolicy.executable_descriptor_media_types === 'CONTRACT_MANIFEST_MEDIA_TYPES_ONLY' && platformPolicy.non_runtime_descriptors === 'EXCLUDE', 'REGISTRY_PLATFORM_POLICY_EXECUTABLE');
  demand(platformPolicy.uniqueness === 'EXACTLY_ONE' && platformPolicy.zero_matches === 'REGISTRY_PLATFORM_MISSING' && platformPolicy.multiple_matches === 'REGISTRY_PLATFORM_AMBIGUOUS' && platformPolicy.config_cross_check === 'SAME_PLATFORM_COMPATIBILITY_REQUIRED', 'REGISTRY_PLATFORM_POLICY_UNIQUENESS');
  const healthcheck = exact(contract.healthcheck_policy, ['source_semantics', 'oci_status', 'allowed_keys', 'test_forms', 'empty_test', 'none_arity', 'cmd_minimum_arity', 'cmd_shell_arity', 'timing_unit', 'timing_minimum_nonzero', 'zero_timing', 'retries', 'unknown_keys', 'command_projection', 'raw_command_persistence', 'runtime_effect_authority'], 'REGISTRY_HEALTHCHECK_POLICY');
  demand(healthcheck.source_semantics === 'DOCKER_IMAGE_SPEC_EXTENSION' && healthcheck.oci_status === 'RESERVED_COMPATIBILITY_FIELD', 'REGISTRY_HEALTHCHECK_SEMANTICS');
  demand(canonical(healthcheck.allowed_keys) === canonical(['Test', 'Interval', 'Timeout', 'Retries', 'StartPeriod', 'StartInterval']) && canonical(healthcheck.test_forms) === canonical(['NONE', 'CMD', 'CMD-SHELL']), 'REGISTRY_HEALTHCHECK_FIELDS');
  demand(healthcheck.empty_test === 'REJECT' && healthcheck.none_arity === 1 && healthcheck.cmd_minimum_arity === 2 && healthcheck.cmd_shell_arity === 2, 'REGISTRY_HEALTHCHECK_TEST_POLICY');
  demand(healthcheck.timing_unit === 'NANOSECONDS' && healthcheck.timing_minimum_nonzero === 1000000 && healthcheck.zero_timing === 'ENGINE_DEFAULT_OR_INHERIT', 'REGISTRY_HEALTHCHECK_TIMING_POLICY');
  demand(healthcheck.retries === 'NON_NEGATIVE_SAFE_INTEGER_ZERO_DEFAULT_OR_INHERIT' && healthcheck.unknown_keys === 'REJECT', 'REGISTRY_HEALTHCHECK_VALUE_POLICY');
  demand(healthcheck.command_projection === 'FORM_COUNT_SHA256_BYTE_LENGTH' && healthcheck.raw_command_persistence === 'FORBIDDEN' && healthcheck.runtime_effect_authority === 'SEPARATE_FROZEN_RUNTIME_CONFIGURATION', 'REGISTRY_HEALTHCHECK_EVIDENCE_POLICY');
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
  const redirect = exact(contract.config_blob_redirect_policy, ['mode', 'object_type', 'source_host', 'source_endpoint', 'accepted_statuses', 'method', 'maximum_hops', 'target_scheme', 'target_host_policy', 'target_port_policy', 'location_handling', 'location_maximum_bytes', 'redirect_request_headers', 'authorization', 'cookie', 'bearer_token', 'registry_credentials', 'logging', 'query_values', 'body_limit', 'digest_verification', 'json', 'second_redirect', 'filesystem_layers'], 'REGISTRY_CONFIG_REDIRECT_POLICY');
  demand(redirect.mode === 'CONFIG_BLOB_ONE_HOP_CAPABILITY_REDIRECT' && redirect.object_type === 'EXACT_CHILD_CONFIG_DESCRIPTOR_ONLY' && redirect.source_host === 'registry-1.docker.io' && redirect.source_endpoint === 'EXACT_REPOSITORY_BLOB_DIGEST', 'REGISTRY_CONFIG_REDIRECT_SOURCE');
  demand(JSON.stringify(redirect.accepted_statuses) === JSON.stringify([307]) && redirect.method === 'GET_PRESERVED' && redirect.maximum_hops === 1, 'REGISTRY_CONFIG_REDIRECT_BOUND');
  demand(redirect.target_scheme === 'HTTPS_ONLY' && redirect.target_host_policy === 'AUTHENTICATED_REGISTRY_CAPABILITY_URL' && redirect.target_port_policy === 'DEFAULT_OR_443_ONLY', 'REGISTRY_CONFIG_REDIRECT_TARGET');
  demand(redirect.location_handling === 'BYTE_EXACT_MEMORY_ONLY' && redirect.location_maximum_bytes === 8192 && JSON.stringify(redirect.redirect_request_headers) === JSON.stringify(['accept']), 'REGISTRY_CONFIG_REDIRECT_LOCATION');
  demand(redirect.authorization === 'STRIP_ALWAYS' && redirect.cookie === 'FORBIDDEN' && redirect.bearer_token === 'FORBIDDEN' && redirect.registry_credentials === 'FORBIDDEN', 'REGISTRY_CONFIG_REDIRECT_CREDENTIALS');
  demand(redirect.logging === 'SAFE_STRUCTURAL_PROJECTION_ONLY' && redirect.query_values === 'FORBIDDEN' && redirect.body_limit === 'CONFIG_BODY_BYTES' && redirect.digest_verification === 'EXACT_CONFIG_DESCRIPTOR_DIGEST', 'REGISTRY_CONFIG_REDIRECT_CONTENT');
  demand(redirect.json === 'STRICT_DUPLICATE_KEYS_REJECTED' && redirect.second_redirect === 'REJECT' && redirect.filesystem_layers === 'FORBIDDEN_PRE_NETWORK', 'REGISTRY_CONFIG_REDIRECT_RESULT');
  const protectedHeaders = exact(contract.protected_header_policy, ['multiplicity_authority', 'normalized_headers_object', 'unknown_policy', 'headers'], 'REGISTRY_HEADER_POLICY');
  demand(protectedHeaders.multiplicity_authority === 'NODE_INCOMING_MESSAGE_RAW_HEADERS' && protectedHeaders.normalized_headers_object === 'FORBIDDEN_AS_MULTIPLICITY_AUTHORITY' && protectedHeaders.unknown_policy === 'DUPLICATE_FORBIDDEN', 'REGISTRY_HEADER_POLICY_VALUE');
  exact(protectedHeaders.headers, Object.keys(PROTECTED_HEADER_RULES), 'REGISTRY_HEADER_RULES');
  demand(Object.entries(PROTECTED_HEADER_RULES).every(([name, rule]) => protectedHeaders.headers[name] === rule), 'REGISTRY_HEADER_RULE_VALUE');
  const cookies = exact(contract.response_cookie_policy, ['mode', 'allowed_host', 'allowed_endpoint', 'allowed_request_purpose', 'request_credentials', 'outbound_cookie_header', 'cookie_jar', 'replay', 'persistence', 'logging', 'trust', 'low_level_audit_projection', 'higher_level_visibility', 'all_other_contexts'], 'REGISTRY_COOKIE_POLICY');
  demand(cookies.mode === 'RECEIVE_NON_PARTICIPATING_RESPONSE_ONLY' && cookies.allowed_host === 'auth.docker.io' && cookies.allowed_endpoint === '/token' && cookies.allowed_request_purpose === 'ANONYMOUS_TOKEN', 'REGISTRY_COOKIE_CONTEXT');
  demand(cookies.request_credentials === 'NONE' && cookies.outbound_cookie_header === 'FORBIDDEN' && cookies.cookie_jar === 'FORBIDDEN' && cookies.replay === 'FORBIDDEN', 'REGISTRY_COOKIE_REQUEST_POLICY');
  demand(cookies.persistence === 'FORBIDDEN' && cookies.logging === 'FORBIDDEN' && cookies.trust === 'FORBIDDEN' && cookies.low_level_audit_projection === 'PRESENCE_COUNT_ONLY' && cookies.higher_level_visibility === 'NONE' && cookies.all_other_contexts === 'REJECT', 'REGISTRY_COOKIE_DATA_POLICY');
  const tokens = exact(contract.token_response_policy, ['mode', 'content_type', 'accepted_fields', 'coexistence', 'value_type', 'minimum_length', 'maximum_length', 'whitespace', 'control_characters', 'duplicate_json_keys', 'allowed_metadata_fields', 'expires_in', 'issued_at', 'unknown_fields', 'token_interpretation', 'persistence'], 'REGISTRY_TOKEN_POLICY');
  demand(tokens.mode === 'TOKEN_AND_ACCESS_TOKEN_EQUIVALENT_ALLOWED' && tokens.content_type === 'APPLICATION_JSON' && JSON.stringify(tokens.accepted_fields) === JSON.stringify(['token', 'access_token']) && tokens.coexistence === 'BYTE_IDENTICAL_REQUIRED', 'REGISTRY_TOKEN_FIELD_POLICY');
  demand(tokens.value_type === 'OPAQUE_RFC6750_B64TOKEN_STRING' && tokens.minimum_length === 1 && tokens.maximum_length === 16384 && tokens.whitespace === 'FORBIDDEN' && tokens.control_characters === 'FORBIDDEN', 'REGISTRY_TOKEN_VALUE_POLICY');
  demand(tokens.duplicate_json_keys === 'REJECT_ALL_DEPTHS' && JSON.stringify(tokens.allowed_metadata_fields) === JSON.stringify(['expires_in', 'issued_at']) && tokens.expires_in === 'OPTIONAL_SAFE_INTEGER_MINIMUM_60' && tokens.issued_at === 'OPTIONAL_RFC3339_UTC_STRING', 'REGISTRY_TOKEN_METADATA_POLICY');
  demand(tokens.unknown_fields === 'REJECT' && tokens.token_interpretation === 'OPAQUE_NO_DECODE' && tokens.persistence === 'IN_MEMORY_ONLY', 'REGISTRY_TOKEN_HANDLING_POLICY');
  const layers = exact(contract.layer_policy, ['filesystem_layers', 'config_blob', 'config_blob_requests_per_role'], 'REGISTRY_LAYERS');
  demand(layers.filesystem_layers === 'FORBIDDEN' && layers.config_blob === 'ALLOWED_AS_NON_FILESYSTEM_METADATA_BY_EXACT_CHILD_DESCRIPTOR' && layers.config_blob_requests_per_role === 1, 'REGISTRY_LAYER_POLICY');
  const attempts = exact(contract.attempt_policy, ['logical_attempts_per_role', 'initial_manifest_requests', 'anonymous_token_exchanges', 'authenticated_manifest_requests', 'child_manifest_requests', 'config_blob_requests', 'config_blob_redirect_requests', 'retry', 'tag_substitution', 'fallback_registry'], 'REGISTRY_ATTEMPTS');
  demand(['logical_attempts_per_role','initial_manifest_requests','anonymous_token_exchanges','authenticated_manifest_requests','child_manifest_requests','config_blob_requests','config_blob_redirect_requests'].every(key => attempts[key] === 1), 'REGISTRY_ATTEMPT_COUNT');
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

export function projectProtectedResponseHeaders(rawHeaders, contract) {
  validateRegistryResolverContract(contract);
  demand(Array.isArray(rawHeaders) && rawHeaders.length % 2 === 0 && rawHeaders.every(value => typeof value === 'string' && !/[\r\n]/.test(value)), 'REGISTRY_RAW_HEADERS');
  const grouped = new Map(Object.keys(PROTECTED_HEADER_RULES).map(name => [name, []]));
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index].toLowerCase();
    if (grouped.has(name)) grouped.get(name).push(rawHeaders[index + 1]);
  }
  const headers = {}, responseCookie = { present: false, raw_occurrence_count: 0 };
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
    } else if (rule === 'RECEIVE_NON_PARTICIPATING_RESPONSE_ONLY') {
      demand(values.every(value => /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+=/.test(value)), 'REGISTRY_COOKIE_MALFORMED');
      responseCookie.present = true;
      responseCookie.raw_occurrence_count = values.length;
    } else throw new ContractError('REGISTRY_HEADER_RULE_UNKNOWN');
  }
  return { headers, response_cookie: responseCookie };
}

export function canonicalizeProtectedHeaders(rawHeaders, contract) {
  const projected = projectProtectedResponseHeaders(rawHeaders, contract);
  if (projected.response_cookie.present) projected.headers['set-cookie'] = 'PRESENT_REJECTED';
  return projected.headers;
}

export function validateResponseCookieNonParticipation({ contract, host, path, purpose, requestHeaders, cookieJar, responseStatusCode, responseCookie }) {
  validateRegistryResolverContract(contract);
  demand(object(requestHeaders) && Object.keys(requestHeaders).every(name => name === name.toLowerCase()), 'REGISTRY_REQUEST_HEADER_NAME');
  demand(!Object.keys(requestHeaders).some(name => name.toLowerCase() === 'cookie'), 'REGISTRY_COOKIE_OUTBOUND');
  demand(cookieJar === 'FORBIDDEN', 'REGISTRY_COOKIE_JAR');
  exact(responseCookie, ['present', 'raw_occurrence_count'], 'REGISTRY_COOKIE_PROJECTION');
  demand(typeof responseCookie.present === 'boolean' && Number.isSafeInteger(responseCookie.raw_occurrence_count) && responseCookie.raw_occurrence_count >= 0 && responseCookie.present === (responseCookie.raw_occurrence_count > 0), 'REGISTRY_COOKIE_PROJECTION_VALUE');
  if (!responseCookie.present) return { present: false, raw_occurrence_count: 0, disposition: 'ABSENT' };
  demand(responseStatusCode < 300 || responseStatusCode >= 400, 'REGISTRY_COOKIE_REDIRECT');
  demand(host === contract.response_cookie_policy.allowed_host && purpose === contract.response_cookie_policy.allowed_request_purpose, 'REGISTRY_COOKIE_CONTEXT');
  let endpoint;
  try { endpoint = new URL(`https://${host}${path}`); } catch { throw new ContractError('REGISTRY_COOKIE_ENDPOINT'); }
  demand(endpoint.protocol === 'https:' && endpoint.hostname === host && endpoint.pathname === contract.response_cookie_policy.allowed_endpoint && endpoint.username === '' && endpoint.password === '' && endpoint.hash === '', 'REGISTRY_COOKIE_ENDPOINT');
  const service = endpoint.searchParams.getAll('service'), scope = endpoint.searchParams.getAll('scope');
  demand(service.length === 1 && service[0] === 'registry.docker.io' && scope.length === 1 && endpoint.searchParams.size === 2, 'REGISTRY_COOKIE_ENDPOINT_QUERY');
  const scopeMatch = /^repository:([a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)+):pull$/.exec(scope[0]);
  demand(scopeMatch && contract.approved_sources.some(source => source.repository === scopeMatch[1]), 'REGISTRY_COOKIE_SCOPE');
  demand(path === `/token?service=registry.docker.io&scope=${encodeURIComponent(scope[0])}`, 'REGISTRY_COOKIE_ENDPOINT_EXACT');
  return { present: true, raw_occurrence_count: responseCookie.raw_occurrence_count, disposition: 'RECEIVED_NON_PARTICIPATING' };
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

const omittedVariant = platform => !Object.hasOwn(platform, 'variant');

export function platformCompatible(candidate, requested, { nullIsOmitted = false } = {}) {
  if (!object(candidate) || !object(requested) || candidate.os !== requested.os || candidate.architecture !== requested.architecture) return false;
  if (requested.architecture === 'arm64' && requested.variant === 'v8' && (omittedVariant(candidate) || nullIsOmitted && candidate.variant === null)) return true;
  return Object.hasOwn(candidate, 'variant') && typeof candidate.variant === 'string' && candidate.variant === requested.variant;
}

function descriptorClassification(row, contract) {
  if (!object(row) || !contract.media_types.manifests.includes(row.mediaType)) return 'NON_RUNTIME_MEDIA_TYPE';
  if (typeof row.artifactType === 'string' && row.artifactType.length > 0) return 'NON_RUNTIME_ARTIFACT';
  if (object(row.annotations) && row.annotations['vnd.docker.reference.type'] === 'attestation-manifest') return 'NON_RUNTIME_ATTESTATION';
  if (!object(row.platform) || typeof row.platform.os !== 'string' || row.platform.os.length === 0 || typeof row.platform.architecture !== 'string' || row.platform.architecture.length === 0) return 'NON_RUNTIME_MISSING_PLATFORM';
  if (row.platform.os === 'unknown' || row.platform.architecture === 'unknown') return 'NON_RUNTIME_UNKNOWN_PLATFORM';
  if (Object.hasOwn(row.platform, 'variant') && typeof row.platform.variant !== 'string') return 'NON_RUNTIME_INVALID_VARIANT';
  return 'EXECUTABLE';
}

export function projectIndexPlatformDescriptors(index, contract) {
  validateRegistryResolverContract(contract);
  demand(object(index) && Array.isArray(index.manifests), 'REGISTRY_INDEX');
  return index.manifests.map((row, offset) => {
    const platform = object(row?.platform) ? row.platform : {};
    const annotations = object(row?.annotations) ? row.annotations : {};
    const dockerReferenceType = annotations['vnd.docker.reference.type'] === 'attestation-manifest' ? 'attestation-manifest' : null;
    const dockerReferenceDigest = typeof annotations['vnd.docker.reference.digest'] === 'string' && SHA.test(annotations['vnd.docker.reference.digest']) ? annotations['vnd.docker.reference.digest'] : null;
    const classification = descriptorClassification(row, contract);
    return {
      ordinal: offset + 1,
      media_type: typeof row?.mediaType === 'string' ? row.mediaType : null,
      os: typeof platform.os === 'string' ? platform.os : null,
      architecture: typeof platform.architecture === 'string' ? platform.architecture : null,
      variant_present: Object.hasOwn(platform, 'variant'),
      variant_json_type: Object.hasOwn(platform, 'variant') ? (platform.variant === null ? 'null' : typeof platform.variant) : 'ABSENT',
      variant_value: Object.hasOwn(platform, 'variant') && (platform.variant === null || typeof platform.variant === 'string') ? platform.variant : null,
      digest: typeof row?.digest === 'string' && SHA.test(row.digest) ? row.digest : null,
      annotations: { docker_reference_type: dockerReferenceType, docker_reference_digest: dockerReferenceDigest },
      executable_candidate: classification === 'EXECUTABLE', classification,
    };
  });
}

export function selectCompatiblePlatform(index, contract) {
  const projections = projectIndexPlatformDescriptors(index, contract);
  const executable = projections.filter(row => row.executable_candidate);
  const matches = executable.filter(row => platformCompatible({ os: row.os, architecture: row.architecture, ...(row.variant_present ? { variant: row.variant_value } : {}) }, contract.target_platform));
  const omittedArm64Match = matches.some(row => row.os === 'linux' && row.architecture === 'arm64' && (row.variant_present === false || row.variant_value === null));
  const conflictingExplicitArm64 = omittedArm64Match && executable.some(row => row.os === 'linux' && row.architecture === 'arm64' && row.variant_present && row.variant_value !== null && row.variant_value !== 'v8');
  demand(matches.length === 1 && !conflictingExplicitArm64, matches.length === 0 ? 'REGISTRY_PLATFORM_MISSING' : 'REGISTRY_PLATFORM_AMBIGUOUS');
  const selected = matches[0], descriptor = index.manifests[selected.ordinal - 1];
  demand(SHA.test(descriptor.digest) && Number.isSafeInteger(descriptor.size) && descriptor.size > 0, 'REGISTRY_PLATFORM_DESCRIPTOR');
  return { digest: descriptor.digest, media_type: descriptor.mediaType, size: descriptor.size, platform: structuredClone(contract.target_platform), descriptor_platform: structuredClone(descriptor.platform), ordinal: selected.ordinal };
}

function descriptor(value, mediaTypes, code) {
  demand(object(value) && SHA.test(value.digest) && Number.isSafeInteger(value.size) && value.size > 0 && mediaTypes.includes(value.mediaType), code);
  return value;
}

function nullableStringArray(value, code) {
  demand(value === null || value === undefined || Array.isArray(value) && value.every(item => typeof item === 'string'), code);
  return value === undefined ? null : value;
}

function optionalHealthcheckNumber(healthcheck, key, policy) {
  if (!Object.hasOwn(healthcheck, key)) return { present: false, value_nanoseconds: null };
  const value = healthcheck[key];
  demand(Number.isSafeInteger(value) && value >= 0 && (value === 0 || value >= policy.timing_minimum_nonzero), 'REGISTRY_CONFIG_HEALTHCHECK_VALUE');
  return { present: true, value_nanoseconds: value };
}

export function projectHealthcheckConfig(value, policy) {
  demand(object(policy), 'REGISTRY_HEALTHCHECK_POLICY');
  if (value === undefined || value === null) {
    const projection = { state: 'ABSENT', test_form: null, executable: false, argv_element_count: null, payload_sha256: null, payload_byte_length: 0,
      interval: { present: false, value_nanoseconds: null }, timeout: { present: false, value_nanoseconds: null },
      start_period: { present: false, value_nanoseconds: null }, start_interval: { present: false, value_nanoseconds: null },
      retries: { present: false, value: null }, unknown_keys: [] };
    return { ...projection, projection_sha256: hash(Buffer.from(canonical(projection), 'utf8')) };
  }
  demand(object(value) && Object.keys(value).every(key => policy.allowed_keys.includes(key)) && Object.hasOwn(value, 'Test'), 'REGISTRY_CONFIG_HEALTHCHECK');
  demand(Array.isArray(value.Test) && value.Test.length > 0 && value.Test.every(item => typeof item === 'string'), 'REGISTRY_CONFIG_HEALTHCHECK_TEST');
  const form = value.Test[0];
  demand(policy.test_forms.includes(form), 'REGISTRY_CONFIG_HEALTHCHECK_TEST_FORM');
  if (form === 'NONE') demand(value.Test.length === policy.none_arity, 'REGISTRY_CONFIG_HEALTHCHECK_TEST_ARITY');
  if (form === 'CMD') demand(value.Test.length >= policy.cmd_minimum_arity && value.Test[1].length > 0, 'REGISTRY_CONFIG_HEALTHCHECK_TEST_ARITY');
  if (form === 'CMD-SHELL') demand(value.Test.length === policy.cmd_shell_arity && value.Test[1].length > 0, 'REGISTRY_CONFIG_HEALTHCHECK_TEST_ARITY');
  const payload = form === 'CMD' ? Buffer.from(canonical(value.Test.slice(1)), 'utf8') : form === 'CMD-SHELL' ? Buffer.from(value.Test[1], 'utf8') : null;
  const retries = Object.hasOwn(value, 'Retries') ? (() => {
    demand(Number.isSafeInteger(value.Retries) && value.Retries >= 0, 'REGISTRY_CONFIG_HEALTHCHECK_RETRIES');
    return { present: true, value: value.Retries };
  })() : { present: false, value: null };
  const projection = {
    state: form === 'NONE' ? 'DISABLED' : 'EXECUTABLE', test_form: form, executable: form !== 'NONE',
    argv_element_count: form === 'CMD' ? value.Test.length - 1 : null,
    payload_sha256: payload === null ? null : hash(payload), payload_byte_length: payload?.length ?? 0,
    interval: optionalHealthcheckNumber(value, 'Interval', policy), timeout: optionalHealthcheckNumber(value, 'Timeout', policy),
    start_period: optionalHealthcheckNumber(value, 'StartPeriod', policy), start_interval: optionalHealthcheckNumber(value, 'StartInterval', policy),
    retries, unknown_keys: [],
  };
  return { ...projection, projection_sha256: hash(Buffer.from(canonical(projection), 'utf8')) };
}

function safeConfigProjection(config, platform, healthcheckPolicy) {
  demand(object(config) && config.os === platform.os && config.architecture === platform.architecture, 'REGISTRY_CONFIG_PLATFORM');
  demand(platformCompatible(config, platform, { nullIsOmitted: true }), 'REGISTRY_CONFIG_VARIANT');
  const selected = object(config.config) ? config.config : {};
  const entrypoint = nullableStringArray(selected.Entrypoint, 'REGISTRY_CONFIG_ENTRYPOINT');
  const cmd = nullableStringArray(selected.Cmd, 'REGISTRY_CONFIG_CMD');
  demand(selected.User === undefined || typeof selected.User === 'string', 'REGISTRY_CONFIG_USER');
  demand(selected.WorkingDir === undefined || typeof selected.WorkingDir === 'string', 'REGISTRY_CONFIG_WORKDIR');
  const volumes = selected.Volumes === undefined || selected.Volumes === null ? [] : Object.keys(selected.Volumes);
  demand(volumes.every(value => value.startsWith('/') && !value.includes('..')), 'REGISTRY_CONFIG_VOLUMES');
  const exposedPorts = selected.ExposedPorts === undefined || selected.ExposedPorts === null ? [] : Object.keys(selected.ExposedPorts);
  demand(exposedPorts.every(value => /^[0-9]{1,5}\/(tcp|udp|sctp)$/.test(value)), 'REGISTRY_CONFIG_PORTS');
  const healthcheck = projectHealthcheckConfig(selected.Healthcheck, healthcheckPolicy);
  const projection = { platform: structuredClone(platform), user: selected.User ?? '', working_dir: selected.WorkingDir ?? '', entrypoint, cmd, declared_volumes: volumes.sort(), exposed_ports: exposedPorts.sort(), healthcheck };
  return { projection, sha256: hash(Buffer.from(canonical(projection), 'utf8')) };
}

function validRfc3339Utc(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?Z$/.exec(value);
  if (!match) return false;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseRegistryTokenResponse(bytes, contract) {
  validateRegistryResolverContract(contract);
  demand(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= contract.bounds.token_body_bytes, 'REGISTRY_TOKEN_BODY');
  const value = parseJson(bytes, 'REGISTRY_TOKEN_JSON');
  demand(object(value), 'REGISTRY_TOKEN_JSON');
  const policy = contract.token_response_policy;
  const allowed = [...policy.accepted_fields, ...policy.allowed_metadata_fields];
  demand(Object.keys(value).every(key => allowed.includes(key)), 'REGISTRY_TOKEN_FIELDS');
  const present = policy.accepted_fields.filter(key => Object.hasOwn(value, key));
  demand(present.length >= 1, 'REGISTRY_TOKEN_VALUE');
  for (const key of present) demand(typeof value[key] === 'string' && value[key].length >= policy.minimum_length && value[key].length <= policy.maximum_length && BEARER_TOKEN.test(value[key]), 'REGISTRY_TOKEN_VALUE');
  if (present.length === 2) demand(value.token === value.access_token, 'REGISTRY_TOKEN_CONFLICT');
  if (Object.hasOwn(value, 'expires_in')) demand(Number.isSafeInteger(value.expires_in) && value.expires_in >= 60, 'REGISTRY_TOKEN_EXPIRES');
  if (Object.hasOwn(value, 'issued_at')) demand(validRfc3339Utc(value.issued_at), 'REGISTRY_TOKEN_ISSUED_AT');
  return value[present[0]];
}

function tokenFromResponse(response, contract) {
  responseStatus(response, 'REGISTRY_TOKEN_STATUS');
  demand(mediaType(header(response.headers, 'content-type')) === 'application/json', 'REGISTRY_TOKEN_CONTENT_TYPE');
  return parseRegistryTokenResponse(body(response, contract.bounds.token_body_bytes, 'REGISTRY_TOKEN_BODY'), contract);
}

function parseConfigRedirectTarget(location, contract) {
  const policy = contract.config_blob_redirect_policy;
  demand(typeof location === 'string' && Buffer.byteLength(location, 'utf8') > 0 && Buffer.byteLength(location, 'utf8') <= policy.location_maximum_bytes, 'REGISTRY_CONFIG_REDIRECT_LOCATION');
  demand(/^[\x21-\x7e]+$/.test(location) && !location.includes('\\'), 'REGISTRY_CONFIG_REDIRECT_LOCATION');
  demand(location.startsWith('https://'), 'REGISTRY_CONFIG_REDIRECT_TARGET');
  let target;
  try { target = new URL(location); } catch { throw new ContractError('REGISTRY_CONFIG_REDIRECT_LOCATION'); }
  demand(target.protocol === 'https:' && target.username === '' && target.password === '' && target.hash === '', 'REGISTRY_CONFIG_REDIRECT_TARGET');
  const afterScheme = location.slice('https://'.length), authorityEnd = afterScheme.search(/[/?#]/);
  const authority = afterScheme.slice(0, authorityEnd === -1 ? undefined : authorityEnd);
  const portMatch = /:([0-9]+)$/.exec(authority), explicitPort = portMatch === null ? null : portMatch[1];
  demand(explicitPort === null || explicitPort === '443', 'REGISTRY_CONFIG_REDIRECT_PORT');
  const hostname = target.hostname.toLowerCase();
  demand(net.isIP(hostname) === 0 && hostname.includes('.') && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/.test(hostname) && !hostname.includes('..'), 'REGISTRY_CONFIG_REDIRECT_HOST');
  return { target, explicitPort };
}

export function projectConfigBlobRedirect({ contract, source, requestedDigest, sourcePath, response }) {
  validateRegistryResolverContract(contract);
  demand(contract.approved_sources.some(row => canonical(row) === canonical(source)), 'REGISTRY_CONFIG_REDIRECT_SOURCE');
  demand(SHA.test(requestedDigest) && sourcePath === `/v2/${source.repository}/blobs/${requestedDigest}`, 'REGISTRY_CONFIG_REDIRECT_SOURCE_ENDPOINT');
  demand(Number.isSafeInteger(response?.status) && contract.config_blob_redirect_policy.accepted_statuses.includes(response.status), 'REGISTRY_CONFIG_REDIRECT_STATUS');
  demand(header(response.headers, 'set-cookie') === undefined, 'REGISTRY_COOKIE');
  const location = header(response.headers, 'location');
  const { target, explicitPort } = parseConfigRedirectTarget(location, contract);
  const queryParameterNames = [...target.searchParams.keys()];
  const segments = target.pathname.split('/').filter(Boolean);
  return Object.freeze({
    status: response.status,
    source_host: source.registry_host,
    source_repository: source.repository,
    requested_config_digest: requestedDigest,
    target_scheme: 'https',
    target_host: target.hostname,
    explicit_port: explicitPort,
    location_path_structure: Object.freeze({ absolute: target.pathname.startsWith('/'), segment_count: segments.length, trailing_slash: target.pathname.endsWith('/') }),
    query_parameter_names: Object.freeze(queryParameterNames),
    query_parameter_count: queryParameterNames.length,
    location_byte_length: Buffer.byteLength(location, 'utf8'),
    location_sha256: sha256(location),
    redirect_hop_count: 1,
    redirect_request_header_names: Object.freeze(['accept']),
    authorization_sent: false,
    cookie_sent: false,
  });
}

function verifiedConfigBytes(response, descriptorValue, contract) {
  responseStatus(response, 'REGISTRY_CONFIG_STATUS');
  const bytes = body(response, contract.bounds.config_body_bytes, 'REGISTRY_CONFIG_BODY');
  demand(bytes.length === descriptorValue.size, 'REGISTRY_CONFIG_SIZE_MISMATCH');
  const computedDigest = sha256(bytes);
  demand(computedDigest === descriptorValue.digest, 'REGISTRY_CONFIG_DIGEST_MISMATCH');
  const value = parseJson(bytes, 'REGISTRY_CONFIG_JSON');
  const safe = safeConfigProjection(value, contract.target_platform, contract.healthcheck_policy);
  return { bytes, computed_digest: computedDigest, safe };
}

export async function fetchImmutableConfigBlob({ contract, source, configDescriptor, layerDigests, requestedDigest, authorization = null, request, onRedirect = null }) {
  validateRegistryResolverContract(contract);
  descriptor(configDescriptor, contract.media_types.configs, 'REGISTRY_CONFIG_DESCRIPTOR');
  demand(contract.approved_sources.some(row => canonical(row) === canonical(source)), 'REGISTRY_CONFIG_REDIRECT_SOURCE');
  demand(Array.isArray(layerDigests) && layerDigests.every(value => SHA.test(value)), 'REGISTRY_LAYER_DESCRIPTORS');
  demand(SHA.test(requestedDigest) && requestedDigest === configDescriptor.digest && !layerDigests.includes(requestedDigest), 'REGISTRY_CONFIG_BLOB_NOT_CONFIG');
  demand(authorization === null || /^Bearer [A-Za-z0-9._~+\/-]+=*$/.test(authorization), 'REGISTRY_REQUEST_AUTHORIZATION');
  demand(typeof request === 'function' && (onRedirect === null || typeof onRedirect === 'function'), 'REGISTRY_RESOLVER_INPUT');
  const sourcePath = `/v2/${source.repository}/blobs/${requestedDigest}`;
  const first = await request({ host: source.registry_host, path: sourcePath, headers: { accept: configDescriptor.mediaType, ...(authorization === null ? {} : { authorization }) }, maximum_body_bytes: contract.bounds.config_body_bytes, timeout_ms: contract.bounds.timeout_ms, purpose: 'CONFIG_METADATA_BLOB' });
  if (first.status === 200) return { ...verifiedConfigBytes(first, configDescriptor, contract), redirect: null };
  if (first.status !== 307) {
    if (Number.isSafeInteger(first.status) && first.status >= 300 && first.status < 400) throw new ContractError('REGISTRY_CONFIG_REDIRECT_STATUS');
    responseStatus(first, 'REGISTRY_CONFIG_STATUS');
  }
  const projection = projectConfigBlobRedirect({ contract, source, requestedDigest, sourcePath, response: first });
  if (onRedirect !== null) onRedirect(projection);
  const location = header(first.headers, 'location');
  const redirected = await request({ url: location, headers: { accept: configDescriptor.mediaType }, maximum_body_bytes: contract.bounds.config_body_bytes, timeout_ms: contract.bounds.timeout_ms, purpose: 'CONFIG_METADATA_BLOB_REDIRECT' });
  if (Number.isSafeInteger(redirected?.status) && redirected.status >= 300 && redirected.status < 400) throw new ContractError('REGISTRY_CONFIG_REDIRECT_HOP');
  return { ...verifiedConfigBytes(redirected, configDescriptor, contract), redirect: projection };
}

export async function resolveRegistryDigest({ contract, role, sourceReference, request, resolverSha256, clock = () => new Date(), onConfigRedirect = null }) {
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
  let child = top;
  if (contract.media_types.indexes.includes(top.media_type)) {
    const selected = selectCompatiblePlatform(top.value, contract);
    const response = await request({ host: source.registry_host, path: `/v2/${source.repository}/manifests/${selected.digest}`, headers: { accept, ...(token === null ? {} : { authorization: `Bearer ${token}` }) }, maximum_body_bytes: contract.bounds.manifest_body_bytes, timeout_ms: contract.bounds.timeout_ms, purpose: 'PLATFORM_CHILD_MANIFEST' });
    child = parseManifestResponse(response, contract, selected.digest);
  }
  demand(contract.media_types.manifests.includes(child.media_type), 'REGISTRY_CHILD_MANIFEST');
  const configDescriptor = descriptor(child.value.config, contract.media_types.configs, 'REGISTRY_CONFIG_DESCRIPTOR');
  demand(Array.isArray(child.value.layers) && child.value.layers.every(layer => object(layer) && SHA.test(layer.digest) && Number.isSafeInteger(layer.size) && layer.size >= 0), 'REGISTRY_LAYER_DESCRIPTORS');
  const fetchedConfig = await fetchImmutableConfigBlob({ contract, source, configDescriptor, layerDigests: child.value.layers.map(layer => layer.digest), requestedDigest: configDescriptor.digest,
    authorization: token === null ? null : `Bearer ${token}`, request, onRedirect: onConfigRedirect });
  const configBytes = fetchedConfig.bytes, configHash = fetchedConfig.computed_digest, safe = fetchedConfig.safe;
  const resolution = {
    schema_version: '1', role, source_reference: source.source_reference, registry_host: source.registry_host,
    repository: source.repository, requested_tag: source.tag, manifest_media_type: top.media_type,
    top_level_manifest_digest: top.digest, platform_child_digest: child.digest, config_digest: configDescriptor.digest,
    required_repo_digest: `${source.repository}@${top.digest}`, platform: structuredClone(contract.target_platform),
    selected_config_sha256: safe.sha256, config_byte_length: configBytes.length, declared_volumes: safe.projection.declared_volumes, healthcheck: safe.projection.healthcheck,
    entrypoint_policy: 'REVIEWED_STRUCTURAL_ENTRYPOINT', resolver_id: contract.resolver_id,
    resolver_version: contract.resolver_version, resolver_sha256: resolverSha256,
    response_hashes: { manifest: top.response_sha256, child_manifest: child.response_sha256, config: configHash.slice(7) },
    resolved_at_utc: clock().toISOString(), network: { metadata_only: true, filesystem_layers_downloaded: false, anonymous_auth: token === null ? 'NOT_REQUIRED' : 'ANONYMOUS_BEARER' },
  };
  const authoritative = structuredClone(resolution); delete authoritative.resolved_at_utc;
  resolution.source_record_sha256 = hash(Buffer.from(canonical(authoritative), 'utf8'));
  return resolution;
}

export function createBoundedHttpsTransport(contract, { onResponseCookie = null, onRequestHeaders = null } = {}) {
  validateRegistryResolverContract(contract);
  demand(onResponseCookie === null || typeof onResponseCookie === 'function', 'REGISTRY_COOKIE_AUDIT');
  demand(onRequestHeaders === null || typeof onRequestHeaders === 'function', 'REGISTRY_REQUEST_AUDIT');
  return spec => new Promise((resolve, reject) => {
    try {
      const isConfigRedirect = spec?.purpose === 'CONFIG_METADATA_BLOB_REDIRECT';
      exact(spec, isConfigRedirect ? ['url', 'headers', 'maximum_body_bytes', 'timeout_ms', 'purpose'] : ['host', 'path', 'headers', 'maximum_body_bytes', 'timeout_ms', 'purpose'], 'REGISTRY_REQUEST');
      let responseHost, responsePath, requestTarget;
      if (isConfigRedirect) {
        const { target } = parseConfigRedirectTarget(spec.url, contract);
        responseHost = target.hostname;
        responsePath = target.pathname + target.search;
        requestTarget = spec.url;
      } else {
        demand([...contract.network_policy.registry_hosts, ...contract.network_policy.anonymous_auth_hosts].includes(spec.host), 'REGISTRY_REQUEST_HOST');
        demand(typeof spec.path === 'string' && spec.path.startsWith('/') && !spec.path.includes('..') && !spec.path.includes('\\'), 'REGISTRY_REQUEST_PATH');
        responseHost = spec.host;
        responsePath = spec.path;
        requestTarget = `https://${spec.host}${spec.path}`;
      }
      demand(Number.isSafeInteger(spec.maximum_body_bytes) && spec.maximum_body_bytes > 0 && spec.maximum_body_bytes <= contract.bounds.manifest_body_bytes, 'REGISTRY_REQUEST_BOUND');
      demand(spec.timeout_ms === contract.bounds.timeout_ms && object(spec.headers), 'REGISTRY_REQUEST_POLICY');
      demand(Object.keys(spec.headers).every(name => name === name.toLowerCase()), 'REGISTRY_REQUEST_HEADER_NAME');
      demand(!Object.hasOwn(spec.headers, 'cookie'), 'REGISTRY_COOKIE_OUTBOUND');
      const allowedHeaders = isConfigRedirect ? contract.config_blob_redirect_policy.redirect_request_headers : ['accept', 'authorization'];
      shape(spec.headers, allowedHeaders.filter(key => Object.hasOwn(spec.headers, key)));
      if (isConfigRedirect) demand(Object.keys(spec.headers).length === 1 && Object.hasOwn(spec.headers, 'accept'), 'REGISTRY_CONFIG_REDIRECT_HEADERS');
      if (spec.headers.authorization !== undefined) demand(/^Bearer [A-Za-z0-9._~+\/-]+=*$/.test(spec.headers.authorization), 'REGISTRY_REQUEST_AUTHORIZATION');
      const requestOptions = { method: 'GET', headers: spec.headers, timeout: spec.timeout_ms, agent: false };
      const request = https.request(requestTarget, requestOptions, response => {
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
          let projected;
          try {
            projected = projectProtectedResponseHeaders(response.rawHeaders, contract);
            const cookieDisposition = validateResponseCookieNonParticipation({ contract, host: responseHost, path: responsePath, purpose: spec.purpose,
              requestHeaders: spec.headers, cookieJar: 'FORBIDDEN', responseStatusCode: response.statusCode,
              responseCookie: projected.response_cookie });
            if (cookieDisposition.present && onResponseCookie !== null) onResponseCookie(Object.freeze({ host: responseHost,
              endpoint: contract.response_cookie_policy.allowed_endpoint, purpose: spec.purpose, present: true,
              raw_occurrence_count: cookieDisposition.raw_occurrence_count, disposition: cookieDisposition.disposition }));
          }
          catch (error) { reject(error); return; }
          const headers = projected.headers;
          if (typeof declaredLength === 'string') headers['content-length'] = declaredLength;
          resolve({ status: response.statusCode, headers, body: Buffer.concat(chunks) });
        });
      });
      request.on('timeout', () => request.destroy(new ContractError('REGISTRY_TIMEOUT')));
      request.on('error', error => reject(error instanceof ContractError ? error : new ContractError('REGISTRY_NETWORK')));
      request.on('finish', () => {
        if (onRequestHeaders !== null) {
          const names = request.getRawHeaderNames().map(name => name.toLowerCase()).sort();
          try { onRequestHeaders(Object.freeze({ purpose: spec.purpose, target_host: responseHost, header_names: Object.freeze(names),
            authorization_sent: names.includes('authorization'), cookie_sent: names.includes('cookie') })); }
          catch (error) { reject(error); }
        }
      });
      request.end();
    } catch (error) { reject(error); }
  });
}

export function registryResolverService() {
  const bytes = fs.readFileSync(CONTRACT_URL), contract = parseJSON(bytes);
  validateRegistryResolverContract(contract);
  return Object.freeze({ contract: () => structuredClone(contract), contractSha256: hash(bytes), resolverSha256: hash(fs.readFileSync(MODULE_URL)), createTransport: options => createBoundedHttpsTransport(contract, options) });
}
