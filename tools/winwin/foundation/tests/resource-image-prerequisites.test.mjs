import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { LABELS, validateSchemaDocumentHeader } from '../lib/contracts.mjs';
import {
  IMAGE_APPROVAL_SET_TYPE, PREREQUISITE_PURPOSE,
  compareApprovedImage, compareResourceExpectation, deriveEffectiveStartProfile,
  foundationPrerequisiteService, planImagePreparation, produceResourceExpectationInstance,
  validateImageApprovalSet, validateResourceExpectationContract, validateResourceExpectationInstance,
} from '../lib/resource-image-prerequisites.mjs';

const P = 'wwfnd-20000101t000000z-000000000001';
const OTHER = 'wwfnd-20000101t000000z-000000000002';
const H = character => character.repeat(64);
const clone = structuredClone;
const rejects = (fn, code = undefined) => assert.throws(fn, code ? error => error?.code === code : undefined);
const load = relative => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const contract = () => load('../contracts/resource-expectation-contract.json');
const preparation = () => load('../contracts/image-preparation-contract.json');
const config = () => ({
  project_id: P, 'db.port': 59322, 'db.shadow_port': 59320, 'api.port': 59321, 'studio.port': 59323,
  'local_smtp.port': 59324, 'local_smtp.smtp_port': 59325, 'local_smtp.pop3_port': 59326,
  'analytics.port': 59327, 'edge_runtime.inspector_port': 59328, 'db.pooler.port': 59329,
  'db.migrations.enabled': false, 'db.migrations.schema_paths': [], 'db.seed.enabled': false,
  'db.seed.sql_paths': [], 'analytics.enabled': false, 'experimental.pgdelta.enabled': false,
});
const profile = (value = contract(), input = config()) => deriveEffectiveStartProfile({
  contract: value, config: input, projectId: input.project_id, configSha256: H('a'), configContractSha256: H('b'), resourceContractSha256: H('c'),
});
const resolvedContract = () => {
  const value = contract();
  for (const row of [...value.roles, ...value.volumes, ...value.networks]) {
    if (row.reachability.kind === 'UNRESOLVED_EFFECTIVE_INPUT') row.reachability = { kind: 'ALWAYS_FRESH', evidence: 'SYNTHETIC_RESOLVED_SOURCE_MODEL' };
  }
  return value;
};
const approval = (role, reference, volume = []) => ({
  role, source_reference: reference,
  approved_registry_manifest_digest: `registry.example/${role.toLowerCase()}@sha256:${H('d')}`,
  approved_platform_child_digest: `sha256:${H('e')}`,
  approved_config_digest: `sha256:${H('f')}`,
  required_repo_digest: `registry.example/${role.toLowerCase()}@sha256:${H('d')}`,
  platform: { os: 'linux', architecture: 'arm64', variant: '' },
  selected_config_sha256: H('1'), declared_volumes: volume,
  entrypoint_policy: 'REVIEWED_STRUCTURAL_ENTRYPOINT',
  provenance: { independent: true, source_class: 'REVIEWED_REGISTRY_METADATA', source_record_sha256: H('2'), resolver_id: 'SYNTHETIC_REGISTRY_METADATA_V1', approved_at_utc: '2000-01-01T00:00:00.000Z' },
  schema_version: '1',
});
const approvalSet = p => {
  const model = resolvedContract();
  const byRole = new Map(model.roles.map(row => [row.image_role, row]));
  return {
    schema_version: '1', approval_set_type: IMAGE_APPROVAL_SET_TYPE, purpose: PREREQUISITE_PURPOSE,
    profile_sha256: p.profile_sha256,
    independent_source_policy: { resolver_id: 'SYNTHETIC_REGISTRY_METADATA_V1', source_class: 'REVIEWED_REGISTRY_METADATA', credentials: 'FORBIDDEN', layer_download: 'FORBIDDEN' },
    approvals: p.reachable_image_roles.map(role => {
      const row = byRole.get(role);
      return approval(role, row.image_reference, []);
    }),
  };
};
const resolved = () => {
  const model = resolvedContract(), p = profile(model), approvals = approvalSet(p);
  const instance = produceResourceExpectationInstance({ contract: model, profile: p, config: config(), configSha256: H('a'), approvalSet: approvals, producerSha256: H('9') });
  return { model, p, approvals, instance };
};
const candidate = expectation => ({
  candidate_id: `candidate-${expectation.expectation_id.toLowerCase()}`,
  role_id: expectation.role_id, matched_expectation_ids: [expectation.expectation_id], resource_class: expectation.resource_class, lifecycle: expectation.lifecycle,
  labels: Object.fromEntries(LABELS.map(label => [label, { present: true, value: P }])),
  image_role: expectation.image_role, relationships: clone(expectation.relationships), ports: clone(expectation.ports),
  health_policy: expectation.health_policy, disposition: 'CANDIDATE_FOR_EXPECTATION',
});

test('production resource model is strict and valid', () => assert.equal(validateResourceExpectationContract(contract()).contract_type, 'FOUNDATION_RESOURCE_EXPECTATION_MODEL'));
test('resource model rejects duplicate role', () => { const x = contract(); x.roles.push(clone(x.roles[0])); rejects(() => validateResourceExpectationContract(x), 'DUPLICATE_ROLE'); });
test('resource model rejects wrong resource class', () => { const x = contract(); x.roles[0].resource_class = 'THING'; rejects(() => validateResourceExpectationContract(x)); });
test('resource model rejects weakened ownership label set', () => { const x = contract(); x.identity_policy.required_labels.pop(); rejects(() => validateResourceExpectationContract(x), 'RESOURCE_LABELS'); });
test('resource model keeps names as hints only', () => assert.equal(contract().identity_policy.names_are_authority, false));

test('effective profile is deterministic', () => assert.deepEqual(profile(), profile()));
test('effective profile binds exact identity and hashes', () => { const p = profile(); assert.equal(p.project_id, P); assert.equal(p.config_sha256, H('a')); assert.equal(p.config_contract_sha256, H('b')); assert.equal(p.resource_contract_sha256, H('c')); });
test('PostgreSQL, DB volume and network are proven reachable', () => assert.deepEqual(profile().reachable_roles, ['DB_VOLUME','FOUNDATION_NETWORK','POSTGRES']));
test('analytics and Vector are disabled by frozen config', () => assert.deepEqual(profile().unreachable_roles, ['ANALYTICS','VECTOR']));
test('seed migrations analytics Vector and pgdelta are explicitly disabled', () => assert.deepEqual(profile().project_inputs, { migrations:'DISABLED', seed:'DISABLED', analytics:'DISABLED', vector:'DISABLED', pgdelta:'DISABLED' }));
test('unknown effective gates fail profile closed', () => { const p = profile(); assert.equal(p.result, 'BLOCKED'); assert.ok(p.unresolved_roles.includes('AUTH')); assert.ok(p.unresolved_roles.includes('AUTH_MIGRATION_JOB')); });
test('analytics enabled drift is rejected', () => { const c = config(); c['analytics.enabled'] = true; rejects(() => profile(contract(), c), 'PROFILE_FROZEN_FLAGS'); });
test('independently resolved source roles become reachable', () => { const p = profile(resolvedContract()); assert.ok(p.reachable_roles.includes('KONG')); assert.ok(p.reachable_roles.includes('MAILPIT')); });
test('config identity drift fails', () => { const c = config(); c.project_id = OTHER; rejects(() => deriveEffectiveStartProfile({ contract:contract(), config:c, projectId:P, configSha256:H('a'), configContractSha256:H('b') })); });
test('config frozen flag drift fails', () => { const c = config(); c['db.seed.enabled'] = true; rejects(() => profile(contract(), c), 'PROFILE_FROZEN_FLAGS'); });
test('source version drift fails contract validation', () => { const x = contract(); x.source_binding.supabase_cli_version = '2.116.0'; rejects(() => validateResourceExpectationContract(x), 'RESOURCE_SOURCE_VERSION'); });
test('source evidence drift fails profile', () => rejects(() => deriveEffectiveStartProfile({ contract:contract(), config:config(), projectId:P, configSha256:H('a'), configContractSha256:H('b'), sourceEvidence:{normative_design_sha256:H('0'),source_research_sha256:H('0')} }), 'PROFILE_SOURCE_DRIFT'));

test('resolved synthetic profile is PASS', () => assert.equal(profile(resolvedContract()).result, 'PASS'));
test('resource expectation generation is deterministic', () => { const a=resolved(), b=resolved(); assert.deepEqual(a.instance,b.instance); });
test('resource expectation binds profile approval and producer', () => { const {instance,p}=resolved(); assert.equal(instance.project_id,P); assert.equal(instance.profile_sha256,p.profile_sha256); assert.equal(instance.producer_sha256,H('9')); assert.match(instance.instance_sha256,/^[0-9a-f]{64}$/); });
test('resource expectation reader validates the complete synthetic instance', () => { const {instance}=resolved(); assert.equal(validateResourceExpectationInstance(instance).instance_sha256,instance.instance_sha256); });
test('resource expectation reader rejects provenance-integrity drift', () => { const {instance}=resolved(); instance.profile_sha256=H('8'); rejects(() => validateResourceExpectationInstance(instance),'EXPECTATION_INSTANCE_INTEGRITY'); });
test('expectation generation rejects blocked profile', () => rejects(() => produceResourceExpectationInstance({contract:contract(),profile:profile(),config:config(),configSha256:H('a'),approvalSet:{},producerSha256:H('9')})));
test('expectation generation rejects config drift', () => { const x=resolved(); rejects(() => produceResourceExpectationInstance({contract:x.model,profile:x.p,config:config(),configSha256:H('0'),approvalSet:x.approvals,producerSha256:H('9')}),'EXPECTATION_INPUT_DRIFT'); });
test('uncovered image declared volume fails closed', () => { const x=resolved(); x.approvals.approvals.find(a=>a.role==='POSTGRES').declared_volumes.push('/uncovered'); rejects(() => produceResourceExpectationInstance({contract:x.model,profile:x.p,config:config(),configSha256:H('a'),approvalSet:x.approvals,producerSha256:H('9')}),'UNLABELLED_ANONYMOUS_VOLUME_RISK'); });

test('complete expected candidates pass', () => { const {instance}=resolved(); assert.equal(compareResourceExpectation(instance,instance.expectations.map(candidate)).result,'PASS'); });
test('missing expected role fails cardinality', () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); rows.pop(); rejects(() => compareResourceExpectation(instance,rows),'CARDINALITY_MISMATCH'); });
test('duplicate candidate identity fails', () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); rows.push(clone(rows[0])); rejects(() => compareResourceExpectation(instance,rows),'DUPLICATE_CANDIDATE'); });
test('unexpected candidate fails', () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); const extra=clone(rows[0]); extra.candidate_id='extra'; extra.role_id='UNKNOWN_ROLE'; extra.matched_expectation_ids=[]; rows.push(extra); rejects(() => compareResourceExpectation(instance,rows),'UNEXPECTED_CANDIDATE'); });
test('ambiguous candidate role match fails', () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); rows[0].matched_expectation_ids.push(instance.expectations[1].expectation_id); rejects(() => compareResourceExpectation(instance,rows),'AMBIGUOUS_CANDIDATE_ROLE'); });
test('wrong resource class fails', () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); rows[0].resource_class='VOLUME'; rejects(() => compareResourceExpectation(instance,rows),'UNEXPECTED_CANDIDATE'); });
test('unclassified candidate fails', () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); rows[0].disposition='UNCLASSIFIED'; rejects(() => compareResourceExpectation(instance,rows),'UNCLASSIFIED_CANDIDATE'); });
test('missing ownership label fails', () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); delete rows[0].labels[LABELS[0]]; rejects(() => compareResourceExpectation(instance,rows)); });
test('one correct and one foreign label fails', () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); rows[0].labels[LABELS[1]].value=OTHER; rejects(() => compareResourceExpectation(instance,rows),'OWNERSHIP_MISMATCH'); });
for (const [name,value] of [['truncated',P.slice(0,-1)],['case-changed',P.toUpperCase()],['normalized-looking',P.replace('ww','ｗｗ')],['space',P+' ']]) test(`ownership ${name} fails`, () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); rows[0].labels[LABELS[0]].value=value; rejects(() => compareResourceExpectation(instance,rows)); });
test('relationship mismatch fails', () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); rows.find(x=>x.role_id==='POSTGRES').relationships.volume_roles=[]; rejects(() => compareResourceExpectation(instance,rows),'CANDIDATE_RELATIONSHIP_MISMATCH'); });
test('port mismatch fails', () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); rows.find(x=>x.role_id==='POSTGRES').ports[0].host_port=59321; rejects(() => compareResourceExpectation(instance,rows),'CANDIDATE_RELATIONSHIP_MISMATCH'); });
test('image-role mismatch fails', () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); rows.find(x=>x.role_id==='POSTGRES').image_role='AUTH'; rejects(() => compareResourceExpectation(instance,rows),'CANDIDATE_SEMANTIC_MISMATCH'); });
test('persistent transient distinction is enforced', () => { const {instance}=resolved(); const rows=instance.expectations.map(candidate); rows.find(x=>x.resource_class==='TRANSIENT_JOB').lifecycle='PERSISTENT'; rejects(() => compareResourceExpectation(instance,rows),'CANDIDATE_SEMANTIC_MISMATCH'); });

test('image approval set validates independent immutable records', () => { const p=profile(resolvedContract()); assert.equal(validateImageApprovalSet(approvalSet(p)).approval_set_type,IMAGE_APPROVAL_SET_TYPE); });
test('duplicate image approval fails', () => { const p=profile(resolvedContract()), set=approvalSet(p); set.approvals.push(clone(set.approvals[0])); rejects(() => validateImageApprovalSet(set),'APPROVAL_DUPLICATE_ROLE'); });
test('missing independent provenance fails', () => { const p=profile(resolvedContract()), set=approvalSet(p); set.approvals[0].provenance.independent=false; rejects(() => validateImageApprovalSet(set)); });
test('tag-only approval is rejected', () => { const p=profile(resolvedContract()), set=approvalSet(p); set.approvals[0].approved_registry_manifest_digest=set.approvals[0].source_reference; rejects(() => validateImageApprovalSet(set)); });
test('conflicting required RepoDigest fails', () => { const p=profile(resolvedContract()), set=approvalSet(p); set.approvals[0].required_repo_digest=`registry.example/wrong@sha256:${H('3')}`; rejects(() => validateImageApprovalSet(set),'APPROVAL_REPODIGEST'); });

const localFor = row => ({ role:row.role, source_reference:row.source_reference, id:row.approved_config_digest, repo_digests:[row.required_repo_digest], resolved_platform_child_digest:row.approved_platform_child_digest, platform:clone(row.platform), selected_config_sha256:row.selected_config_sha256, declared_volumes:clone(row.declared_volumes), entrypoint_policy:row.entrypoint_policy });
test('approved image exact immutable comparison passes', () => { const p=profile(resolvedContract()), row=approvalSet(p).approvals[0]; assert.equal(compareApprovedImage(row,localFor(row)).result,'PASS'); });
test('manifest RepoDigest missing fails', () => { const p=profile(resolvedContract()), row=approvalSet(p).approvals[0], local=localFor(row); local.repo_digests=[]; rejects(() => compareApprovedImage(row,local),'IMAGE_REPODIGEST_MISSING'); });
test('manifest RepoDigest wrong fails', () => { const p=profile(resolvedContract()), row=approvalSet(p).approvals[0], local=localFor(row); local.repo_digests=[`registry.example/wrong@sha256:${H('4')}`]; rejects(() => compareApprovedImage(row,local),'IMAGE_REPODIGEST_MISSING'); });
test('platform child mismatch fails', () => { const p=profile(resolvedContract()), row=approvalSet(p).approvals[0], local=localFor(row); local.resolved_platform_child_digest=`sha256:${H('4')}`; rejects(() => compareApprovedImage(row,local),'IMAGE_DIGEST_MISMATCH'); });
test('config image-ID mismatch fails', () => { const p=profile(resolvedContract()), row=approvalSet(p).approvals[0], local=localFor(row); local.id=`sha256:${H('4')}`; rejects(() => compareApprovedImage(row,local),'IMAGE_DIGEST_MISMATCH'); });
test('OS mismatch fails', () => { const p=profile(resolvedContract()), row=approvalSet(p).approvals[0], local=localFor(row); local.platform.os='darwin'; rejects(() => compareApprovedImage(row,local),'IMAGE_PLATFORM_MISMATCH'); });
test('architecture mismatch fails', () => { const p=profile(resolvedContract()), row=approvalSet(p).approvals[0], local=localFor(row); local.platform.architecture='amd64'; rejects(() => compareApprovedImage(row,local),'IMAGE_PLATFORM_MISMATCH'); });
test('safe Config projection mismatch fails', () => { const p=profile(resolvedContract()), row=approvalSet(p).approvals[0], local=localFor(row); local.selected_config_sha256=H('4'); rejects(() => compareApprovedImage(row,local),'IMAGE_CONFIG_MISMATCH'); });
test('declared-volume mismatch fails', () => { const p=profile(resolvedContract()), row=approvalSet(p).approvals[0], local=localFor(row); local.declared_volumes.push('/foreign'); rejects(() => compareApprovedImage(row,local)); });
test('source tag normalization is rejected', () => { const p=profile(resolvedContract()), row=approvalSet(p).approvals[0], local=localFor(row); local.source_reference=row.source_reference.toUpperCase(); rejects(() => compareApprovedImage(row,local),'IMAGE_ROLE_REFERENCE_MISMATCH'); });
test('unapproved role is rejected', () => { const p=profile(resolvedContract()), row=approvalSet(p).approvals[0], local=localFor(row); local.role='UNAPPROVED'; rejects(() => compareApprovedImage(row,local),'IMAGE_ROLE_REFERENCE_MISMATCH'); });

test('image preparation planner is deterministic and bounded', () => { const p=profile(resolvedContract()), set=approvalSet(p); const a=planImagePreparation({profile:p,approvalSet:set,preparationContract:preparation()}); assert.deepEqual(a,planImagePreparation({profile:p,approvalSet:set,preparationContract:preparation()})); assert.equal(a.attempts_per_image,1); assert.equal(a.retry,'FORBIDDEN'); });
test('image preparation rejects blocked profile', () => { const p=profile(), set={schema_version:'1',approval_set_type:IMAGE_APPROVAL_SET_TYPE,purpose:PREREQUISITE_PURPOSE,profile_sha256:p.profile_sha256,independent_source_policy:{resolver_id:'SYNTHETIC_REGISTRY_METADATA_V1',source_class:'REVIEWED_REGISTRY_METADATA',credentials:'FORBIDDEN',layer_download:'FORBIDDEN'},approvals:[]}; rejects(() => planImagePreparation({profile:p,approvalSet:set,preparationContract:preparation()}),'PREPARATION_PROFILE_BLOCKED'); });
test('image preparation rejects incomplete approval coverage', () => { const p=profile(resolvedContract()), set=approvalSet(p); set.approvals.pop(); rejects(() => planImagePreparation({profile:p,approvalSet:set,preparationContract:preparation()})); });
test('image preparation contract forbids retry cleanup and tag-only acceptance', () => { const x=preparation(); assert.equal(x.attempt_policy.retry,'FORBIDDEN'); assert.equal(x.cleanup_policy.remove_partial,'FORBIDDEN'); assert.equal(x.cleanup_policy.remove_unapproved_local,'FORBIDDEN'); assert.equal(x.acceptance_policy.tag_only,'REJECTED'); });
test('image preparation contract rejects nested extension fields', () => { const p=profile(resolvedContract()), set=approvalSet(p), x=preparation(); x.attempt_policy.unreviewed=true; rejects(() => planImagePreparation({profile:p,approvalSet:set,preparationContract:x}),'PREPARATION_ATTEMPTS'); });

test('production service fails closed without materializing an instance', () => { const service=foundationPrerequisiteService(); assert.equal(service.profile().result,'BLOCKED'); assert.equal(service.materializationReadiness().image_approval_set,'NOT_MATERIALIZED'); });
test('all new schemas are supported strict JSON Schema documents', () => { for(const [path,title] of [['../schemas/resource-expectation.schema.json','Foundation resource expectation model'],['../schemas/resource-expectation-instance.schema.json','Foundation frozen resource expectation instance'],['../schemas/effective-start-profile.schema.json','Foundation effective start profile'],['../schemas/image-approval.schema.json','Foundation immutable image approval set'],['../schemas/image-preparation.schema.json','Foundation image preparation contract']]) assert.equal(validateSchemaDocumentHeader(load(path),title).result,'PASS'); });
test('every object node in the new schemas rejects additional properties', () => {
  const inspect = value => {
    if (Array.isArray(value)) return value.forEach(inspect);
    if (value && typeof value === 'object') {
      if (value.type === 'object') assert.equal(value.additionalProperties, false);
      Object.values(value).forEach(inspect);
    }
  };
  for (const path of ['../schemas/resource-expectation.schema.json','../schemas/resource-expectation-instance.schema.json','../schemas/effective-start-profile.schema.json','../schemas/image-approval.schema.json','../schemas/image-preparation.schema.json']) inspect(load(path));
});
test('tooling source has no Docker Supabase shell network environment or writer path', () => { const source=fs.readFileSync(new URL('../lib/resource-image-prerequisites.mjs',import.meta.url),'utf8'); assert.doesNotMatch(source,/node:child_process|execFile|spawn\(|process\.env|docker\s+(?:pull|run|create|start|rm)|supabase\s+(?:start|stop|db)|node:https|node:http|writeFile|appendFile|mkdir|unlink|rename|rmSync/i); });
