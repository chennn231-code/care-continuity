import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { hash } from '../lib/contracts.mjs';
import {
  canonicalizeProtectedHeaders, parseAnonymousBearerChallenge, parseApprovedSourceReference, resolveRegistryDigest,
  selectExactPlatform, validateRegistryResolverContract,
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
