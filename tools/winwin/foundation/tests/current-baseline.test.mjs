import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { CURRENT_BASELINE, BASELINE_RESOURCE_SHA256, assertStartModelUnchanged, readCurrentFoundationBaseline, validateCurrentBaselineBinding, validateCurrentBaselineReadback, verifyCurrentProfile } from '../lib/current-baseline.mjs';
import { LOST_SESSION } from '../lib/durable-evidence.mjs';
import { syntheticReservationHarness } from '../lib/reservations.mjs';
import { foundationPrerequisiteService, deriveEffectiveStartProfile } from '../lib/resource-image-prerequisites.mjs';

const model = () => JSON.parse(fs.readFileSync(new URL('../contracts/resource-expectation-contract.json',import.meta.url)));
const fails = (fn, code) => assert.throws(fn, e=>e.code===code);
test('current durable session, config and profile are accepted without modifying baseline evidence', () => {
  const service=foundationPrerequisiteService();
  assert.deepEqual(service.baselineBinding(),CURRENT_BASELINE);
  assert.equal(service.profile().project_id,CURRENT_BASELINE.project_id);
  assert.equal(service.profile().config_sha256,CURRENT_BASELINE.config_sha256);
  assert.equal(service.profile().profile_sha256,CURRENT_BASELINE.profile_sha256);
  assert.equal(service.profile().resource_contract_sha256,BASELINE_RESOURCE_SHA256);
});
test('historical-session request fails before invoking any baseline reader', () => fails(()=>readCurrentFoundationBaseline(LOST_SESSION),'HISTORICAL_OR_FOREIGN_BASELINE'));
test('foreign-session request cannot use the current witness', () => fails(()=>validateCurrentBaselineBinding(CURRENT_BASELINE,'wwfnd-20000101t000000z-000000000001'),'HISTORICAL_OR_FOREIGN_BASELINE'));
for(const key of ['tooling_checkpoint','project_id','config_sha256','profile_sha256','active_witness_sha256','baseline_witness_sha256']) {
  test(`drift in baseline ${key} fails closed`,()=>fails(()=>validateCurrentBaselineBinding({...CURRENT_BASELINE,[key]:'invalid'}),'CURRENT_BASELINE_BINDING_MISMATCH'));
}
test('ACTIVE cardinality is never weakened to accept missing ephemeral evidence', () => {
  const result={result:'PASS',repository_checkpoint:CURRENT_BASELINE.tooling_checkpoint,project_id:CURRENT_BASELINE.project_id,active:0,ended:0,durable_witness_sha256:CURRENT_BASELINE.active_witness_sha256};
  fails(()=>validateCurrentBaselineReadback(result),'CURRENT_RESERVATION_BINDING');
});
test('ENDED history cannot masquerade as the current ACTIVE reservation',()=>{
  const result={result:'PASS',repository_checkpoint:CURRENT_BASELINE.tooling_checkpoint,project_id:CURRENT_BASELINE.project_id,active:1,ended:1,durable_witness_sha256:CURRENT_BASELINE.active_witness_sha256};
  fails(()=>validateCurrentBaselineReadback(result),'CURRENT_RESERVATION_BINDING');
});
test('new model keeps all baseline start fields unchanged',()=>assert.equal(assertStartModelUnchanged(model()),BASELINE_RESOURCE_SHA256));
test('unrelated port/source/reachability changes cannot be hidden by the healthcheck extension',()=>{
  const c=model(); c.roles[0].ports[0].container_port=1234;
  fails(()=>assertStartModelUnchanged(c),'BASELINE_START_MODEL_DRIFT');
});
test('current profile cannot use a new model checksum as the frozen start-profile source checksum',()=>{
  const p=foundationPrerequisiteService().profile(); p.resource_contract_sha256='0'.repeat(64);
  fails(()=>verifyCurrentProfile(p),'CURRENT_PROFILE_BINDING_MISMATCH');
});
test('unchanged hash label cannot conceal altered current profile content',()=>{
  const p=foundationPrerequisiteService().profile(); p.reachable_roles=[];
  fails(()=>verifyCurrentProfile(p),'CURRENT_PROFILE_INTEGRITY');
});
test('default derivation for the current session preserves the accepted profile hash',()=>{
  const {configRead}=readCurrentFoundationBaseline();
  const p=deriveEffectiveStartProfile({contract:model(),config:configRead.effective,projectId:CURRENT_BASELINE.project_id,
    configSha256:configRead.verification.config_sha256,configContractSha256:configRead.verification.contract_sha256});
  assert.equal(p.profile_sha256,CURRENT_BASELINE.profile_sha256);
});
test('missing ephemeral state under durable ACTIVE remains fail-closed in a synthetic scope',t=>{
  const value=syntheticReservationHarness({withDurability:true});
  t.after(()=>fs.rmSync(value.root,{recursive:true,force:true}));
  const before=value.service.readIndex(), candidate=value.service.generateCandidate();
  value.service.reserve(candidate,{checked_at_utc:new Date().toISOString(),freshness_result:'FRESH-QUALIFIED',collision_result:'PASS',expected_entry_count:before.entry_count,expected_index_sha256:before.index_sha256});
  assert.equal(value.durable.read().active.project_id,candidate.project_id);
  fs.rmSync(value.indexRoot,{recursive:true});
  fails(()=>value.service.readIndex(),'DURABLE_EPHEMERAL_MISSING');
  assert.equal(value.durable.read().active.project_id,candidate.project_id);
});
