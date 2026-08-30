import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { hash } from '../lib/contracts.mjs';
import {
  canonicalizeProtectedHeaders, parseAnonymousBearerChallenge, parseApprovedSourceReference, resolveRegistryDigest,
  parseRegistryTokenResponse, projectProtectedResponseHeaders, selectExactPlatform, validateRegistryResolverContract, validateResponseCookieNonParticipation,
} from '../lib/registry-digest-resolver.mjs';

const load = () => JSON.parse(fs.readFileSync(new URL('../contracts/registry-digest-resolver-contract.json', import.meta.url), 'utf8'));
const clone = structuredClone;
const H = character => character.repeat(64);
const digest = bytes => `sha256:${hash(bytes)}`;
const json = value => Buffer.from(JSON.stringify(value), 'utf8');
const code = expected => error => error?.code === expected;
const platform = { os: 'linux', architecture: 'arm64', variant: 'v8' };
const source = () => load().approved_sources.find(row => row.role === 'AUTH');
const raw = (...pairs) => pairs.flat();
const challenge = ({ realm='https://auth.docker.io/token', service='registry.docker.io', scope='repository:supabase/gotrue:pull', separator=',' }={}) => `Bearer realm="${realm}"${separator}service="${service}"${separator}scope="${scope}"`;
const tokenPath = '/token?service=registry.docker.io&scope=repository%3Asupabase%2Fgotrue%3Apull';
const cookieContext = (responseCookie, overrides={}) => ({ contract:load(), host:'auth.docker.io', path:tokenPath, purpose:'ANONYMOUS_TOKEN', requestHeaders:{accept:'application/json'}, cookieJar:'FORBIDDEN', responseStatusCode:200, responseCookie, ...overrides });

function response(bytes, type, digestValue = digest(bytes), status = 200, extra = {}) {
  return { status, headers: { 'content-type': type, 'docker-content-digest': digestValue, ...extra }, body: bytes };
}

function artifacts({ indexType = 'application/vnd.oci.image.index.v1+json', manifestType = 'application/vnd.oci.image.manifest.v1+json', descriptors = null, configValue = null } = {}) {
  const contract = load();
  const config = configValue ?? { architecture: 'arm64', os: 'linux', config: { User: '1000', WorkingDir: '/work', Entrypoint: ['/entrypoint'], Cmd: ['serve'], Volumes: { '/data': {} }, ExposedPorts: { '9999/tcp': {} }, Healthcheck: { Test: ['CMD','check'], Interval: 1, Timeout: 1, Retries: 1, StartPeriod: 0 } } };
  const configBytes = json(config), configDigest = digest(configBytes);
  const child = { schemaVersion: 2, mediaType: manifestType, config: { mediaType: contract.media_types.configs[0], size: configBytes.length, digest: configDigest }, layers: [{ mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip', size: 1, digest: `sha256:${H('9')}` }] };
  const childBytes = json(child), childDigest = digest(childBytes);
  const manifestRows = descriptors ?? [{ mediaType: manifestType, size: childBytes.length, digest: childDigest, platform: clone(platform) }];
  const index = { schemaVersion: 2, mediaType: indexType, manifests: manifestRows };
  const indexBytes = json(index);
  return { contract, config, configBytes, configDigest, child, childBytes, childDigest, index, indexBytes,
    indexResponse: response(indexBytes,indexType), childResponse: response(childBytes,manifestType), configResponse: { status:200,headers:{'content-type':'application/octet-stream'},body:configBytes } };
}

function anonymousQueue(a = artifacts()) {
  const challenge = `Bearer realm="https://auth.docker.io/token",service="registry.docker.io",scope="repository:supabase/gotrue:pull"`;
  return [
    { status:401,headers:{'www-authenticate':challenge},body:Buffer.from('unauthorized') },
    { status:200,headers:{'content-type':'application/json'},body:json({token:'safe.synthetic.token'}) },
    a.indexResponse, a.childResponse, a.configResponse,
  ];
}

async function resolveWith(queue, contract = load()) {
  const calls = [];
  const request = async spec => { calls.push(clone(spec)); assert.ok(queue.length > 0); return queue.shift(); };
  const result = await resolveRegistryDigest({ contract, role:'AUTH', sourceReference:'supabase/gotrue:v2.195.0', request, resolverSha256:H('a'), clock:()=>new Date('2000-01-01T00:00:00.000Z') });
  return { result, calls };
}

test('resolver contract is strict and fixed to public Docker Hub metadata', () => assert.equal(validateRegistryResolverContract(load()).resolver_id,'WINWIN_PUBLIC_REGISTRY_METADATA_V1'));
test('source reference parsing is byte exact', () => assert.deepEqual(parseApprovedSourceReference(load(),'AUTH','supabase/gotrue:v2.195.0'),source()));
test('OCI index resolves exact linux arm64 v8 child and config descriptor', async () => { const a=artifacts(), {result}=await resolveWith(anonymousQueue(a)); assert.equal(result.top_level_manifest_digest,digest(a.indexBytes)); assert.equal(result.platform_child_digest,a.childDigest); assert.equal(result.config_digest,a.configDigest); assert.deepEqual(result.platform,platform); });
test('Docker manifest list media type is supported', async () => { const a=artifacts({indexType:'application/vnd.docker.distribution.manifest.list.v2+json',manifestType:'application/vnd.docker.distribution.manifest.v2+json'}); assert.equal((await resolveWith(anonymousQueue(a))).result.manifest_media_type,a.index.mediaType); });
test('single manifest is supported when config proves exact platform', async () => { const a=artifacts({configValue:{architecture:'arm64',os:'linux',variant:'v8',config:{}}}); const queue=anonymousQueue(a); queue.splice(2,2,response(a.childBytes,a.child.mediaType)); const {result}=await resolveWith(queue); assert.equal(result.top_level_manifest_digest,result.platform_child_digest); });
test('exact platform selector rejects wrong architecture', () => { const a=artifacts(); a.index.manifests[0].platform.architecture='amd64'; assert.throws(()=>selectExactPlatform(a.index,platform),code('REGISTRY_PLATFORM_MISSING')); });
test('exact platform selector rejects wrong OS', () => { const a=artifacts(); a.index.manifests[0].platform.os='windows'; assert.throws(()=>selectExactPlatform(a.index,platform),code('REGISTRY_PLATFORM_MISSING')); });
test('exact platform selector rejects duplicate matches', () => { const a=artifacts(); a.index.manifests.push(clone(a.index.manifests[0])); assert.throws(()=>selectExactPlatform(a.index,platform),code('REGISTRY_PLATFORM_DUPLICATE')); });
test('exact platform selector rejects missing platform', () => { const a=artifacts(); delete a.index.manifests[0].platform; assert.throws(()=>selectExactPlatform(a.index,platform),code('REGISTRY_PLATFORM_MISSING')); });
test('malformed manifest JSON fails closed', async () => { const bytes=Buffer.from('{'); const queue=anonymousQueue(); queue[2]=response(bytes,'application/vnd.oci.image.index.v1+json'); await assert.rejects(()=>resolveWith(queue),code('REGISTRY_MANIFEST_JSON')); });
test('missing Docker-Content-Digest fails closed', async () => { const queue=anonymousQueue(); delete queue[2].headers['docker-content-digest']; await assert.rejects(()=>resolveWith(queue),code('REGISTRY_DIGEST_HEADER')); });
test('manifest digest mismatch fails closed', async () => { const queue=anonymousQueue(); queue[2].headers['docker-content-digest']=`sha256:${H('1')}`; await assert.rejects(()=>resolveWith(queue),code('REGISTRY_DIGEST_MISMATCH')); });
test('unsupported manifest media type fails closed', async () => { const bytes=json({schemaVersion:2,mediaType:'application/example'}); const queue=anonymousQueue(); queue[2]=response(bytes,'application/example'); await assert.rejects(()=>resolveWith(queue),code('REGISTRY_UNSUPPORTED_MEDIA_TYPE')); });
test('unexpected redirect is rejected and never followed', async () => { const queue=anonymousQueue(); queue[0]={status:302,headers:{location:'https://foreign.example/'},body:Buffer.alloc(0)}; await assert.rejects(()=>resolveWith(queue),code('REGISTRY_UNEXPECTED_REDIRECT')); });
test('credential-bearing or non-Bearer auth challenge is rejected', () => assert.throws(()=>parseAnonymousBearerChallenge('Basic realm="x"',source()),code('REGISTRY_AUTH_CHALLENGE')));
test('anonymous bearer challenge must use exact realm service and scope', () => assert.throws(()=>parseAnonymousBearerChallenge('Bearer realm="https://evil.example/token",service="registry.docker.io",scope="repository:supabase/gotrue:pull"',source()),code('REGISTRY_AUTH_REALM')));
test('one valid singleton protected header is preserved exactly', () => assert.deepEqual(canonicalizeProtectedHeaders(raw(['Content-Type','application/json']),load()),{'content-type':'application/json'}));
test('two byte-identical Docker digest lines collapse to one', () => { const value=`sha256:${H('1')}`; assert.equal(canonicalizeProtectedHeaders(raw(['Docker-Content-Digest',value],['docker-content-digest',value]),load())['docker-content-digest'],value); });
test('Docker digest duplicate differing by one byte fails', () => assert.throws(()=>canonicalizeProtectedHeaders(raw(['docker-content-digest',`sha256:${H('1')}`],['docker-content-digest',`sha256:${H('2')}`]),load()),code('REGISTRY_HEADER_CONFLICT')));
test('Docker digest duplicate differing only by case fails', () => assert.throws(()=>canonicalizeProtectedHeaders(raw(['docker-content-digest',`sha256:${H('a')}`],['docker-content-digest',`sha256:${H('A')}`]),load()),code('REGISTRY_HEADER_CONFLICT')));
test('Docker digest duplicate differing only by whitespace fails', () => assert.throws(()=>canonicalizeProtectedHeaders(raw(['docker-content-digest',`sha256:${H('1')}`],['docker-content-digest',`sha256:${H('1')} `]),load()),code('REGISTRY_HEADER_CONFLICT')));
test('conflicting duplicate auth realm fails', () => assert.throws(()=>canonicalizeProtectedHeaders(raw(['www-authenticate',challenge()],['www-authenticate',challenge({realm:'https://auth.docker.io/other'})]),load()),code('REGISTRY_AUTH_CONFLICT')));
test('conflicting duplicate auth service fails', () => assert.throws(()=>canonicalizeProtectedHeaders(raw(['www-authenticate',challenge()],['www-authenticate',challenge({service:'other'})]),load()),code('REGISTRY_AUTH_CONFLICT')));
test('conflicting duplicate auth scope fails', () => assert.throws(()=>canonicalizeProtectedHeaders(raw(['www-authenticate',challenge()],['www-authenticate',challenge({scope:'repository:supabase/other:pull'})]),load()),code('REGISTRY_AUTH_CONFLICT')));
test('semantically equivalent duplicate Bearer challenges collapse', () => { const first=challenge(), second=challenge({separator:',\t'}); assert.equal(canonicalizeProtectedHeaders(raw(['WWW-Authenticate',first],['www-authenticate',second]),load())['www-authenticate'],first); });
test('quoted commas are parsed within auth parameter values rather than split', () => { const value=challenge({realm:'https://auth.docker.io/to,ken'}); assert.equal(canonicalizeProtectedHeaders(raw(['www-authenticate',value]),load())['www-authenticate'],value); assert.throws(()=>parseAnonymousBearerChallenge(value,source()),code('REGISTRY_AUTH_REALM')); });
test('multiple auth schemes are rejected', () => assert.throws(()=>canonicalizeProtectedHeaders(raw(['www-authenticate',challenge()+', Basic realm="other"']),load()),code('REGISTRY_AUTH_CHALLENGE')));
test('malformed auth challenge is rejected', () => assert.throws(()=>canonicalizeProtectedHeaders(raw(['www-authenticate','Bearer realm="unterminated']),load()),code('REGISTRY_AUTH_CHALLENGE')));
test('protected header casing is normalized only at the field-name layer', () => { const value=`sha256:${H('1')}`; assert.equal(canonicalizeProtectedHeaders(raw(['DoCkEr-CoNtEnT-DiGeSt',value],['docker-content-digest',value]),load())['docker-content-digest'],value); });
test('already comma-coalesced Docker digest value is not split or accepted', async () => { const queue=anonymousQueue(); queue[2].headers['docker-content-digest']=`${queue[2].headers['docker-content-digest']}, ${queue[2].headers['docker-content-digest']}`; await assert.rejects(()=>resolveWith(queue),code('REGISTRY_DIGEST_HEADER')); });
test('raw separate protected lines are the sole multiplicity authority', () => { const value=`sha256:${H('1')}`; assert.deepEqual(canonicalizeProtectedHeaders(raw(['content-type','application/json'],['docker-content-digest',value]),load()),{'content-type':'application/json','docker-content-digest':value}); assert.throws(()=>canonicalizeProtectedHeaders({'docker-content-digest':[value]},load()),code('REGISTRY_RAW_HEADERS')); });
test('one runtime Set-Cookie array occurrence is represented without duplicate processing or value retention', () => { const projected=canonicalizeProtectedHeaders(raw(['set-cookie','secret-cookie=value; Secure']),load()); assert.deepEqual(projected,{'set-cookie':'PRESENT_REJECTED'}); assert.doesNotMatch(JSON.stringify(projected),/secret-cookie|value/); });
test('multiple Set-Cookie lines remain non-persisted and response-rejected', async () => { const queue=anonymousQueue(); queue[1].headers['set-cookie']='PRESENT_REJECTED'; await assert.rejects(()=>resolveWith(queue),code('REGISTRY_COOKIE')); });
test('unknown protected-header policy cannot be introduced', () => { const value=load(); value.protected_header_policy.headers['x-unknown-protected']='BYTE_IDENTICAL_DUPLICATE_COLLAPSIBLE'; assert.throws(()=>validateRegistryResolverContract(value),code('REGISTRY_HEADER_RULES')); });
test('token response without Set-Cookie has an exact absent projection', () => { const projected=projectProtectedResponseHeaders(raw(['Content-Type','application/json']),load()); assert.deepEqual(projected.response_cookie,{present:false,raw_occurrence_count:0}); assert.equal(validateResponseCookieNonParticipation(cookieContext(projected.response_cookie)).disposition,'ABSENT'); });
test('one token-endpoint Set-Cookie is received as non-participating', () => { const projected=projectProtectedResponseHeaders(raw(['Set-Cookie','__cf_bm=opaque; Secure']),load()); assert.deepEqual(projected.response_cookie,{present:true,raw_occurrence_count:1}); assert.equal(validateResponseCookieNonParticipation(cookieContext(projected.response_cookie)).disposition,'RECEIVED_NON_PARTICIPATING'); });
test('multiple token-endpoint Set-Cookie fields remain count-only', () => { const projected=projectProtectedResponseHeaders(raw(['set-cookie','a=one'],['set-cookie','b=two']),load()); assert.deepEqual(projected.response_cookie,{present:true,raw_occurrence_count:2}); assert.equal(validateResponseCookieNonParticipation(cookieContext(projected.response_cookie)).raw_occurrence_count,2); assert.doesNotMatch(JSON.stringify(projected),/one|two/); });
test('Set-Cookie from registry manifest endpoint is rejected', () => { const projected=projectProtectedResponseHeaders(raw(['set-cookie','a=one']),load()); assert.throws(()=>validateResponseCookieNonParticipation(cookieContext(projected.response_cookie,{host:'registry-1.docker.io',path:'/v2/supabase/gotrue/manifests/v2.195.0',purpose:'TOP_LEVEL_MANIFEST'})),code('REGISTRY_COOKIE_CONTEXT')); });
test('Set-Cookie from unexpected host is rejected', () => { const projected=projectProtectedResponseHeaders(raw(['set-cookie','a=one']),load()); assert.throws(()=>validateResponseCookieNonParticipation(cookieContext(projected.response_cookie,{host:'unexpected.example'})),code('REGISTRY_COOKIE_CONTEXT')); });
test('outbound Cookie header attempt is rejected', () => assert.throws(()=>validateResponseCookieNonParticipation(cookieContext({present:false,raw_occurrence_count:0},{requestHeaders:{accept:'application/json',cookie:'a=one'}})),code('REGISTRY_COOKIE_OUTBOUND')));
test('cookie jar configuration attempt is rejected', () => assert.throws(()=>validateResponseCookieNonParticipation(cookieContext({present:false,raw_occurrence_count:0},{cookieJar:'ENABLED'})),code('REGISTRY_COOKIE_JAR')));
test('cookie replay attempt remains an outbound Cookie rejection', () => assert.throws(()=>validateResponseCookieNonParticipation(cookieContext({present:true,raw_occurrence_count:1},{requestHeaders:{accept:'application/json',cookie:'replayed=one'}})),code('REGISTRY_COOKIE_OUTBOUND')));
test('redirect carrying a cookie is rejected', () => assert.throws(()=>validateResponseCookieNonParticipation(cookieContext({present:true,raw_occurrence_count:1},{responseStatusCode:302})),code('REGISTRY_COOKIE_REDIRECT')));
test('cookie value is not exposed to higher-level resolver result', async () => { const projected=projectProtectedResponseHeaders(raw(['content-type','application/json'],['set-cookie','secret-cookie=opaque']),load()); validateResponseCookieNonParticipation(cookieContext(projected.response_cookie)); const queue=anonymousQueue(); queue[1].headers=projected.headers; const {result}=await resolveWith(queue); assert.doesNotMatch(JSON.stringify(result),/secret-cookie|opaque|cookie/i); });
test('resolver cookie path has no persistence primitive', () => { const text=fs.readFileSync(new URL('../lib/registry-digest-resolver.mjs',import.meta.url),'utf8'); assert.doesNotMatch(text,/writeFile|appendFile|createWriteStream|from ['"](?:tough-cookie|fetch-cookie)|new CookieJar|\.setCookie\(/i); });
test('resolver cookie path has no logging primitive', () => { const text=fs.readFileSync(new URL('../lib/registry-digest-resolver.mjs',import.meta.url),'utf8'); assert.doesNotMatch(text,/console\.|process\.stdout|process\.stderr|logger\./i); });
test('token validation succeeds independently after approved cookie discard', async () => { const projected=projectProtectedResponseHeaders(raw(['content-type','application/json'],['set-cookie','a=one']),load()); validateResponseCookieNonParticipation(cookieContext(projected.response_cookie)); const queue=anonymousQueue(); queue[1].headers=projected.headers; assert.equal((await resolveWith(queue)).result.network.anonymous_auth,'ANONYMOUS_BEARER'); });
test('token failure remains failure despite approved cookie receipt', async () => { const projected=projectProtectedResponseHeaders(raw(['content-type','application/json'],['set-cookie','a=one']),load()); validateResponseCookieNonParticipation(cookieContext(projected.response_cookie)); const queue=anonymousQueue(); queue[1]={status:200,headers:projected.headers,body:json({message:'no token'})}; await assert.rejects(()=>resolveWith(queue),code('REGISTRY_TOKEN_FIELDS')); });
test('digest approval path cannot read cookie projection', async () => { const projected=projectProtectedResponseHeaders(raw(['content-type','application/json'],['set-cookie','a=one']),load()); validateResponseCookieNonParticipation(cookieContext(projected.response_cookie)); const queue=anonymousQueue(); queue[1].headers=projected.headers; const {result}=await resolveWith(queue); assert.deepEqual(Object.keys(result.network).sort(),['anonymous_auth','filesystem_layers_downloaded','metadata_only']); });
test('Set-Cookie field name matching is case-insensitive', () => assert.deepEqual(projectProtectedResponseHeaders(raw(['sEt-CoOkIe','a=one']),load()).response_cookie,{present:true,raw_occurrence_count:1}));
test('malformed cookie field fails low-level structural validation', () => assert.throws(()=>projectProtectedResponseHeaders(raw(['set-cookie','not-a-cookie']),load()),code('REGISTRY_COOKIE_MALFORMED')));
test('zero-length cookie value remains valid non-participating metadata', () => { const projected=projectProtectedResponseHeaders(raw(['set-cookie','empty=']),load()); assert.equal(validateResponseCookieNonParticipation(cookieContext(projected.response_cookie)).disposition,'RECEIVED_NON_PARTICIPATING'); });
test('unexpected token endpoint path is rejected', () => assert.throws(()=>validateResponseCookieNonParticipation(cookieContext({present:true,raw_occurrence_count:1},{path:'/other?service=registry.docker.io&scope=repository%3Asupabase%2Fgotrue%3Apull'})),code('REGISTRY_COOKIE_ENDPOINT')));
test('cookie projection contains presence and count only', () => { const projected=projectProtectedResponseHeaders(raw(['set-cookie','__cf_bm=opaque; Expires=never']),load()).response_cookie; assert.deepEqual(Object.keys(projected).sort(),['present','raw_occurrence_count']); assert.deepEqual(projected,{present:true,raw_occurrence_count:1}); });
test('valid token-only response selects one opaque credential', () => assert.equal(parseRegistryTokenResponse(json({token:'opaque.token'}),load()),'opaque.token'));
test('valid access_token-only response selects one opaque credential', () => assert.equal(parseRegistryTokenResponse(json({access_token:'opaque.access'}),load()),'opaque.access'));
test('byte-identical token aliases are accepted deterministically', () => assert.equal(parseRegistryTokenResponse(json({token:'same.value',access_token:'same.value'}),load()),'same.value'));
test('conflicting token aliases fail closed', () => assert.throws(()=>parseRegistryTokenResponse(json({token:'first',access_token:'second'}),load()),code('REGISTRY_TOKEN_CONFLICT')));
test('token wrong type is rejected', () => assert.throws(()=>parseRegistryTokenResponse(json({token:7}),load()),code('REGISTRY_TOKEN_VALUE')));
test('token null is rejected', () => assert.throws(()=>parseRegistryTokenResponse(json({token:null}),load()),code('REGISTRY_TOKEN_VALUE')));
test('token empty is rejected', () => assert.throws(()=>parseRegistryTokenResponse(json({token:''}),load()),code('REGISTRY_TOKEN_VALUE')));
test('token whitespace-only is rejected', () => assert.throws(()=>parseRegistryTokenResponse(json({token:'   '}),load()),code('REGISTRY_TOKEN_VALUE')));
test('token exceeding the explicit 16384-character bound is rejected', () => assert.throws(()=>parseRegistryTokenResponse(json({token:'a'.repeat(16385)}),load()),code('REGISTRY_TOKEN_VALUE')));
test('token control characters are rejected', () => assert.throws(()=>parseRegistryTokenResponse(json({token:'safe\u0001unsafe'}),load()),code('REGISTRY_TOKEN_VALUE')));
test('missing token field is rejected', () => assert.throws(()=>parseRegistryTokenResponse(json({expires_in:300}),load()),code('REGISTRY_TOKEN_VALUE')));
test('duplicate token JSON key is rejected before object construction', () => assert.throws(()=>parseRegistryTokenResponse(Buffer.from('{"token":"first","token":"second"}'),load()),code('REGISTRY_TOKEN_JSON')));
test('duplicate access_token JSON key is rejected before object construction', () => assert.throws(()=>parseRegistryTokenResponse(Buffer.from('{"access_token":"first","access_token":"second"}'),load()),code('REGISTRY_TOKEN_JSON')));
test('duplicate alias key remains rejected even beside the equivalent alias', () => assert.throws(()=>parseRegistryTokenResponse(Buffer.from('{"token":"same","access_token":"same","token":"same"}'),load()),code('REGISTRY_TOKEN_JSON')));
test('expires_in accepts a safe integer of at least sixty seconds', () => assert.equal(parseRegistryTokenResponse(json({token:'opaque',expires_in:300}),load()),'opaque'));
test('expires_in invalid type is rejected', () => assert.throws(()=>parseRegistryTokenResponse(json({token:'opaque',expires_in:'300'}),load()),code('REGISTRY_TOKEN_EXPIRES')));
test('issued_at accepts an exact RFC3339 UTC instant', () => assert.equal(parseRegistryTokenResponse(json({token:'opaque',issued_at:'2026-08-30T06:03:20.749Z'}),load()),'opaque'));
test('issued_at malformed or impossible date is rejected', () => assert.throws(()=>parseRegistryTokenResponse(json({token:'opaque',issued_at:'2026-02-30T00:00:00Z'}),load()),code('REGISTRY_TOKEN_ISSUED_AT')));
test('unknown benign metadata field is rejected by the exact field set', () => assert.throws(()=>parseRegistryTokenResponse(json({token:'opaque',note:'benign'}),load()),code('REGISTRY_TOKEN_FIELDS')));
test('unknown token-like credential field is rejected', () => assert.throws(()=>parseRegistryTokenResponse(json({token:'opaque',refresh_token:'other.credential'}),load()),code('REGISTRY_TOKEN_FIELDS')));
test('nested token object is rejected', () => assert.throws(()=>parseRegistryTokenResponse(json({token:{value:'opaque'}}),load()),code('REGISTRY_TOKEN_VALUE')));
test('token parser has no logging primitive', () => { const text=fs.readFileSync(new URL('../lib/registry-digest-resolver.mjs',import.meta.url),'utf8'); assert.doesNotMatch(text,/console\.|process\.stdout|process\.stderr|logger\./i); });
test('token parser has no persistence primitive', () => { const text=fs.readFileSync(new URL('../lib/registry-digest-resolver.mjs',import.meta.url),'utf8'); assert.doesNotMatch(text,/writeFile|appendFile|createWriteStream|localStorage|sessionStorage/i); });
test('token remains memory-only and absent from resolver output', async () => { const {result}=await resolveWith(anonymousQueue()); assert.doesNotMatch(JSON.stringify(result),/safe\.synthetic\.token/); });
test('cookie presence cannot alter token alias selection', () => { const projected=projectProtectedResponseHeaders(raw(['set-cookie','a=one']),load()); validateResponseCookieNonParticipation(cookieContext(projected.response_cookie)); assert.equal(parseRegistryTokenResponse(json({token:'same',access_token:'same'}),load()),'same'); });
test('repository scope remains challenge and request bound rather than token-payload bound', () => { assert.equal(parseRegistryTokenResponse(json({token:'opaque'}),load()),'opaque'); assert.throws(()=>parseAnonymousBearerChallenge(challenge({scope:'repository:supabase/other:pull'}),source()),code('REGISTRY_AUTH_SCOPE')); });
test('parser return is exactly one opaque string credential', () => { const selected=parseRegistryTokenResponse(json({token:'opaque',access_token:'opaque',expires_in:300,issued_at:'2026-08-30T06:03:20Z'}),load()); assert.equal(typeof selected,'string'); assert.equal(selected,'opaque'); });
test('anonymous token remains absent from result and evidence', async () => { const {result,calls}=await resolveWith(anonymousQueue()); assert.doesNotMatch(JSON.stringify(result),/safe\.synthetic\.token|authorization/i); assert.ok(calls.some(call=>typeof call.headers.authorization==='string')); });
test('timeout is surfaced without retry', async () => { let calls=0; await assert.rejects(()=>resolveRegistryDigest({contract:load(),role:'AUTH',sourceReference:'supabase/gotrue:v2.195.0',resolverSha256:H('a'),request:async()=>{calls+=1;throw Object.assign(new Error('timeout'),{code:'REGISTRY_TIMEOUT'});}})); assert.equal(calls,1); });
test('rate limit fails without retry', async () => { let calls=0; await assert.rejects(()=>resolveRegistryDigest({contract:load(),role:'AUTH',sourceReference:'supabase/gotrue:v2.195.0',resolverSha256:H('a'),request:async()=>{calls+=1;return{status:429,headers:{},body:Buffer.from('rate')};}}),code('REGISTRY_RATE_LIMIT')); assert.equal(calls,1); });
test('config body bound is enforced', async () => { const queue=anonymousQueue(); queue[4]={status:200,headers:{},body:Buffer.alloc(load().bounds.config_body_bytes+1)}; await assert.rejects(()=>resolveWith(queue),code('REGISTRY_CONFIG_BODY')); });
test('config descriptor digest relationship is exact', async () => { const queue=anonymousQueue(); queue[4].body=Buffer.from('{}'); await assert.rejects(()=>resolveWith(queue),code('REGISTRY_CONFIG_DIGEST_MISMATCH')); });
test('tag-only or digest substitution is rejected', () => assert.throws(()=>parseApprovedSourceReference(load(),'AUTH',`supabase/gotrue@sha256:${H('1')}`),code('REGISTRY_UNAPPROVED_SOURCE')));
test('registry host drift is rejected by contract', () => { const value=load(); value.approved_sources[0].registry_host='registry.example'; assert.throws(()=>validateRegistryResolverContract(value),code('REGISTRY_SOURCE_VALUE')); });
test('repository mismatch is rejected', () => assert.throws(()=>parseApprovedSourceReference(load(),'AUTH','other/gotrue:v2.195.0'),code('REGISTRY_UNAPPROVED_SOURCE')));
test('source-reference normalization attack is rejected', () => assert.throws(()=>parseApprovedSourceReference(load(),'AUTH','SUPABASE/gotrue:v2.195.0'),code('REGISTRY_UNAPPROVED_SOURCE')));
test('uppercase or malformed digest is rejected', () => { const a=artifacts(); a.index.manifests[0].digest=`sha256:${H('A')}`; assert.throws(()=>selectExactPlatform(a.index,platform),code('REGISTRY_PLATFORM_DESCRIPTOR')); });
test('duplicate role approval source is rejected', () => { const value=load(); value.approved_sources.push(clone(value.approved_sources[0])); assert.throws(()=>validateRegistryResolverContract(value),code('REGISTRY_SOURCE_DUPLICATE')); });
test('safe config projection excludes environment values and records volumes structurally', async () => { const a=artifacts({configValue:{architecture:'arm64',os:'linux',config:{Env:['SECRET=value'],Volumes:{'/safe':{}},Entrypoint:['run']}}}); const {result}=await resolveWith(anonymousQueue(a)); assert.deepEqual(result.declared_volumes,['/safe']); assert.doesNotMatch(JSON.stringify(result),/SECRET|value/); });
test('resolver module has no Docker, credential-file, environment, layer-download, shell, or writer path', () => { const text=fs.readFileSync(new URL('../lib/registry-digest-resolver.mjs',import.meta.url),'utf8'); assert.doesNotMatch(text,/node:child_process|execFile|spawn\(|process\.env|\.docker\/config|credentialHelper|docker\s+pull|writeFile|appendFile|createWriteStream|\/layers\//i); });
