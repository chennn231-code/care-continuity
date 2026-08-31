import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  candidateHealthcheckEvidence, canonicalHealthcheck, compareCandidateHealthcheck, createHealthcheckLayerProjection,
  deriveEffectiveHealthcheck, projectCandidateHealthcheckConfiguration, validateHealthcheckLayerProjection,
} from '../lib/effective-healthcheck.mjs';

const load = relative => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const policy = () => load('../contracts/resource-expectation-contract.json').healthcheck_binding_policy;
const H = character => character.repeat(64);
const absent = () => createHealthcheckLayerProjection();
const timing = value_nanoseconds => ({ present: true, value_nanoseconds });
const retries = value => ({ present: true, value });
const executable = (source = {}) => createHealthcheckLayerProjection({
  state: 'EXECUTABLE', test_form: source.test_form ?? 'CMD', executable: true,
  argv_element_count: (source.test_form ?? 'CMD') === 'CMD' ? (source.argv_element_count ?? 1) : null,
  payload_sha256: source.payload_sha256 ?? H('a'), payload_byte_length: source.payload_byte_length ?? 8,
  interval: source.interval, timeout: source.timeout, start_period: source.start_period, start_interval: source.start_interval, retries: source.retries,
});
const partial = fields => createHealthcheckLayerProjection({ state: 'PARTIAL', ...fields });
const disabled = fields => createHealthcheckLayerProjection({ state: 'DISABLED', test_form: 'NONE', ...fields });
const derive = (image = absent(), runtime = absent()) => deriveEffectiveHealthcheck(image, runtime, policy());

test('no image Healthcheck plus no runtime Healthcheck is explicitly disabled', () => { const out=derive(); assert.equal(out.behavior.enabled,false); assert.equal(out.field_provenance.test,'DISABLED'); });
test('image-only Healthcheck supplies the effective Test', () => { const out=derive(executable()); assert.equal(out.behavior.enabled,true); assert.equal(out.field_provenance.test,'IMAGE'); });
test('runtime-only Healthcheck supplies the effective Test', () => { const out=derive(absent(),executable({payload_sha256:H('b')})); assert.equal(out.field_provenance.test,'RUNTIME'); assert.equal(out.behavior.test.payload_sha256,H('b')); });
test('runtime Test overrides image Test without implying whole-object replacement', () => { const out=derive(executable({payload_sha256:H('a')}),executable({payload_sha256:H('b')})); assert.equal(out.behavior.test.payload_sha256,H('b')); assert.equal(out.field_provenance.test,'RUNTIME'); });
test('absent runtime Interval inherits image Interval', () => { const out=derive(executable({interval:timing(15000000000)}),executable({payload_sha256:H('b')})); assert.equal(out.behavior.interval.value_nanoseconds,15000000000); assert.equal(out.field_provenance.interval,'IMAGE'); });
test('runtime Interval overrides image Interval', () => { const out=derive(executable({interval:timing(15000000000)}),executable({payload_sha256:H('b'),interval:timing(10000000000)})); assert.equal(out.behavior.interval.value_nanoseconds,10000000000); assert.equal(out.field_provenance.interval,'RUNTIME'); });
test('image StartInterval is inherited when runtime supplies explicit zero', () => { const out=derive(executable({start_interval:timing(1000000000)}),executable({payload_sha256:H('b'),start_interval:timing(0)})); assert.equal(out.behavior.start_interval.value_nanoseconds,1000000000); assert.equal(out.field_provenance.start_interval,'IMAGE'); });
test('runtime StartInterval nonzero value overrides image value', () => { const out=derive(executable({start_interval:timing(1000000000)}),executable({payload_sha256:H('b'),start_interval:timing(2000000000)})); assert.equal(out.behavior.start_interval.value_nanoseconds,2000000000); assert.equal(out.field_provenance.start_interval,'RUNTIME'); });
test('missing timing and retries use version-bound engine defaults with provenance', () => { const out=derive(executable()); assert.deepEqual([out.behavior.interval.value_nanoseconds,out.behavior.timeout.value_nanoseconds,out.behavior.start_period.value_nanoseconds,out.behavior.start_interval.value_nanoseconds,out.behavior.retries.value],[30000000000,30000000000,0,5000000000,3]); for(const key of ['interval','timeout','start_period','start_interval','retries']) assert.equal(out.field_provenance[key],'ENGINE_DEFAULT'); });
test('explicit image disable remains distinct from image absence', () => { const image=disabled(); assert.notEqual(image.projection_sha256,absent().projection_sha256); assert.equal(derive(image).field_provenance.test,'DISABLED'); });
test('image disabled plus runtime enabled yields runtime behavior', () => { const out=derive(disabled({interval:timing(15000000000)}),executable({payload_sha256:H('b')})); assert.equal(out.behavior.enabled,true); assert.equal(out.field_provenance.test,'RUNTIME'); assert.equal(out.field_provenance.interval,'IMAGE'); });
test('runtime disabled suppresses an executable image Test', () => { const out=derive(executable(),disabled()); assert.equal(out.behavior.enabled,false); assert.equal(out.field_provenance.test,'DISABLED'); });
test('missing and explicit zero remain distinct layers but merge to the same engine default', () => { const image=executable(), a=derive(image,absent()), b=derive(image,partial({interval:timing(0)})); assert.notEqual(absent().projection_sha256,partial({interval:timing(0)}).projection_sha256); assert.equal(a.behavior.interval.value_nanoseconds,b.behavior.interval.value_nanoseconds); assert.equal(b.field_provenance.interval,'ENGINE_DEFAULT'); });
test('negative duration is rejected', () => assert.throws(()=>derive(executable({interval:timing(-1)}),absent()),error=>error?.code==='HEALTHCHECK_INTERVAL'));
test('invalid retry count is rejected', () => assert.throws(()=>derive(executable({retries:retries(-1)}),absent()),error=>error?.code==='HEALTHCHECK_RETRIES'));
test('unsupported Test form is rejected', () => { const value=executable(); value.test_form='OTHER'; assert.throws(()=>validateHealthcheckLayerProjection(value)); });
test('unknown Healthcheck field projection is rejected', () => { const value=executable(); value.unknown_keys=['FutureField']; assert.throws(()=>validateHealthcheckLayerProjection(value),error=>error?.code==='HEALTHCHECK_UNKNOWN_FIELD'); });
test('ambiguous partial runtime projection containing Test identity is rejected', () => { const value=partial({interval:timing(1000000000)}); value.test_form='CMD'; value.payload_sha256=H('b'); value.payload_byte_length=1; assert.throws(()=>derive(executable(),value),error=>error?.code==='HEALTHCHECK_PARTIAL'); });
test('payload hash change changes effective behavior and provenance-bound hashes', () => { const a=derive(executable({payload_sha256:H('a')})),b=derive(executable({payload_sha256:H('b')})); assert.notEqual(a.behavior_projection_sha256,b.behavior_projection_sha256); assert.notEqual(a.projection_sha256,b.projection_sha256); });
test('timing change changes effective behavior and provenance-bound hashes', () => { const a=derive(executable({interval:timing(1000000000)})),b=derive(executable({interval:timing(2000000000)})); assert.notEqual(a.behavior_projection_sha256,b.behavior_projection_sha256); assert.notEqual(a.projection_sha256,b.projection_sha256); });
test('provenance change changes effective hash while identical behavior hash remains stable', () => { const image=executable({interval:timing(1000000000)}), fromImage=derive(image), fromRuntime=derive(image,partial({interval:timing(1000000000)})); assert.equal(fromImage.behavior_projection_sha256,fromRuntime.behavior_projection_sha256); assert.notEqual(fromImage.projection_sha256,fromRuntime.projection_sha256); });
test('canonical serialization ignores object insertion order and preserves array order', () => { assert.equal(canonicalHealthcheck({b:2,a:[1,2]}),canonicalHealthcheck({a:[1,2],b:2})); assert.notEqual(canonicalHealthcheck({a:[1,2]}),canonicalHealthcheck({a:[2,1]})); });
test('effective derivation regenerates deterministically', () => { const image=executable({interval:timing(1000000000)}),runtime=partial({timeout:timing(2000000000)}); assert.deepEqual(derive(image,runtime),derive(image,runtime)); });
test('candidate mismatch detection compares exact observable effective behavior', () => { const expected=derive(executable()),candidate=candidateHealthcheckEvidence(expected); candidate.behavior.retries.value=4; assert.throws(()=>compareCandidateHealthcheck(expected,candidate)); });
test('candidate from independently projected merged config matches expected behavior', () => { const p=policy(), image=executable({interval:timing(1000000000)}), expected=derive(image); const candidate=projectCandidateHealthcheckConfiguration(image,{implementation:p.engine.implementation,version:p.engine.version},p); assert.equal(compareCandidateHealthcheck(expected,candidate).result,'PASS'); });
test('candidate engine version drift fails before default normalization', () => { const p=policy(); assert.throws(()=>projectCandidateHealthcheckConfiguration(executable(),{implementation:p.engine.implementation,version:'29.6.3'},p),error=>error?.code==='CANDIDATE_HEALTHCHECK_ENGINE_MISMATCH'); });
test('candidate with valid but different behavior hash is rejected', () => { const expected=derive(executable({interval:timing(1000000000)})), actual=derive(executable({interval:timing(2000000000)})); assert.throws(()=>compareCandidateHealthcheck(expected,candidateHealthcheckEvidence(actual)),error=>error?.code==='CANDIDATE_HEALTHCHECK_MISMATCH'); });
test('empty Test identity is rejected rather than treated as absence or disable', () => { const value=executable(); value.test_form=''; assert.throws(()=>validateHealthcheckLayerProjection(value)); });
test('projection constructor rejects unknown fields instead of dropping them', () => assert.throws(()=>createHealthcheckLayerProjection({future_field:true}),error=>error?.code==='HEALTHCHECK_INPUT_FIELD'));
test('unavailable runtime projection fails rather than implying no override', () => assert.throws(()=>deriveEffectiveHealthcheck(executable(),undefined,policy())));
test('unsupported engine-default semantics fail closed', () => { const p=policy(); p.engine.defaults.retries=4; assert.throws(()=>deriveEffectiveHealthcheck(executable(),absent(),p),error=>error?.code==='HEALTHCHECK_ENGINE_DEFAULT_VALUES'); });
for (const field of ['state','executable','payload_byte_length','interval','timeout','start_period','start_interval','retries','unknown_keys']) {
  test(`explicit null ${field} is not silently converted to absent/default`, () => assert.throws(() => createHealthcheckLayerProjection({[field]:null})));
}
for (const field of ['interval','timeout','start_period','start_interval']) {
  test(`zero runtime ${field} inherits the nonzero image value`, () => {
    const out=derive(executable({[field]:timing(7000000000)}),partial({[field]:timing(0)}));
    assert.equal(out.behavior[field].value_nanoseconds,7000000000); assert.equal(out.field_provenance[field],'IMAGE');
  });
  test(`sub-millisecond ${field} is rejected`, () => assert.throws(() => derive(executable({[field]:timing(999999)}))));
}
test('zero runtime retries inherits image retries instead of resetting to engine default', () => {
  const out=derive(executable({retries:retries(5)}),partial({retries:retries(0)})); assert.equal(out.behavior.retries.value,5); assert.equal(out.field_provenance.retries,'IMAGE');
});
test('explicit zero StartPeriod does not erase a nonzero image StartPeriod', () => {
  const out=derive(executable({start_period:timing(10000000000)}),partial({start_period:timing(0)})); assert.equal(out.behavior.start_period.value_nanoseconds,10000000000);
});
test('explicit disable retains raw layer evidence but disables every effective behavior field', () => {
  const runtime=disabled({start_interval:timing(1000000000)}), out=derive(executable(),runtime);
  assert.equal(runtime.start_interval.present,true); assert.equal(out.behavior.start_interval.value_nanoseconds,null);
  assert.ok(Object.values(out.field_provenance).every(x=>x==='DISABLED'));
});
test('MAILPIT frozen three-layer derivation reproduces exact hashes and field provenance', () => {
  const image=executable({argv_element_count:2,payload_sha256:'c1d1f11300dc8eef37c6b0823445d06aa92956cb8b0a83d4a86d9a922bf60b36',payload_byte_length:21,interval:timing(15000000000),start_period:timing(10000000000),start_interval:timing(1000000000)});
  const runtime=executable({test_form:'CMD-SHELL',payload_sha256:'fbcbcb277c0369deaa481679867308f3e88ec37de9b95af4920653f3bc6e9d92',payload_byte_length:15,interval:timing(10000000000),timeout:timing(2000000000),start_period:timing(10000000000),retries:retries(3)});
  const out=derive(image,runtime);
  assert.equal(image.projection_sha256,'e5d544c155b705390dcde17b28c7c00283685b7e167c4dd92d046daee1823466'); assert.equal(runtime.projection_sha256,'f9480f7b160406900e24c35dd001eedafebd99bf5ebb1f4386e0e0e8dffb4d9c');
  assert.equal(out.behavior_projection_sha256,'ccb170a084efe54b4b64cf5f6c06a2789ddcda29e7684e2e61f4cce33c7bb55f'); assert.equal(out.projection_sha256,'84edb0dbfbda9673df4b11c8e7ab1959176e76b3baad82b600693d7a628c0dc5');
  assert.deepEqual(out.field_provenance,{enabled:'RUNTIME',test:'RUNTIME',interval:'RUNTIME',timeout:'RUNTIME',start_period:'RUNTIME',start_interval:'IMAGE',retries:'RUNTIME'});
});
