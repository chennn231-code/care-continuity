import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { LABELS, validateSchemaDocumentHeader } from '../lib/contracts.mjs';
import {
  IMAGE_APPROVAL_SET_TYPE, PREREQUISITE_PURPOSE,
  compareApprovedImage, compareResourceExpectation, deriveEffectiveStartProfile,
  planImagePreparation, produceImageApprovalSet, produceResourceExpectationInstance,
  validateImageApprovalSet, validateResourceExpectationContract, validateResourceExpectationInstance,
} from '../lib/resource-image-prerequisites.mjs';

const P = 'wwfnd-20000101t000000z-000000000001';
const OTHER = 'wwfnd-20000101t000000z-000000000002';
const H = character => character.repeat(64);
const clone = structuredClone;
const rejects = (fn, code = undefined) => assert.throws(fn, code ? error => error?.code === code : undefined);
const load = relative => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const contract = () => load('../contracts/resource-expectation-contract.json');
const resolverContract = () => load('../contracts/registry-digest-resolver-contract.json');
const preparation = () => load('../contracts/image-preparation-contract.json');
const config = () => ({
  project_id: P, 'db.port': 59322, 'db.shadow_port': 59320, 'api.port': 59321, 'studio.port': 59323,
  'local_smtp.port': 59324, 'local_smtp.smtp_port': 59325, 'local_smtp.pop3_port': 59326,
  'analytics.port': 59327, 'edge_runtime.inspector_port': 59328, 'db.pooler.port': 59329,
  'db.migrations.enabled': false, 'db.migrations.schema_paths': [], 'db.seed.enabled': false,
  'db.seed.sql_paths': [], 'analytics.enabled': false, 'experimental.pgdelta.enabled': false,
});
const absentHealthcheck = () => ({ state:'ABSENT', test_form:null, executable:false, argv_element_count:null, payload_sha256:null, payload_byte_length:0,
  interval:{present:false,value_nanoseconds:null}, timeout:{present:false,value_nanoseconds:null}, start_period:{present:false,value_nanoseconds:null},
  start_interval:{present:false,value_nanoseconds:null}, retries:{present:false,value:null}, unknown_keys:[], projection_sha256:H('8') });
const profile = (value = contract(), input = config()) => deriveEffectiveStartProfile({
  contract: value, config: input, projectId: input.project_id, configSha256: H('a'), configContractSha256: H('b'), resourceContractSha256: H('c'),
});
const blockedProfile = () => {
  const value = contract();
  value.roles.find(row => row.role_id === 'AUTH').reachability = { kind: 'UNRESOLVED_EFFECTIVE_INPUT', missing_inputs: ['synthetic unresolved default'], evidence: 'SYNTHETIC_BLOCKED_PROFILE' };
  return profile(value);
};
const resolvedContract = () => {
  const value = contract();
  for (const row of [...value.roles, ...value.volumes, ...value.networks]) {
    if (row.reachability.kind === 'UNRESOLVED_EFFECTIVE_INPUT') row.reachability = { kind: 'ALWAYS_FRESH', evidence: 'SYNTHETIC_RESOLVED_SOURCE_MODEL' };
  }
  return value;
};
const approval = (role, reference, volume = []) => ({
  role, source_reference: reference, registry_host: 'registry-1.docker.io',
  repository: reference.slice(0,reference.lastIndexOf(':')), requested_tag: reference.slice(reference.lastIndexOf(':')+1),
  manifest_media_type: 'application/vnd.oci.image.index.v1+json',
  approved_registry_manifest_digest: `${reference.slice(0,reference.lastIndexOf(':'))}@sha256:${H('d')}`,
  approved_platform_child_digest: `sha256:${H('e')}`,
  approved_config_digest: `sha256:${H('f')}`,
  required_repo_digest: `${reference.slice(0,reference.lastIndexOf(':'))}@sha256:${H('d')}`,
  platform: { os: 'linux', architecture: 'arm64', variant: '' },
  selected_config_sha256: H('1'), declared_volumes: volume, healthcheck: absentHealthcheck(),
  entrypoint_policy: 'REVIEWED_STRUCTURAL_ENTRYPOINT',
  provenance: { independent: true, source_class: 'REVIEWED_REGISTRY_METADATA', source_record_sha256: H('2'), resolver_id: 'SYNTHETIC_REGISTRY_METADATA_V1', resolver_version:'1.0.0', resolver_sha256:H('3'), resolver_contract_sha256:H('4'), manifest_response_sha256:H('5'), child_manifest_response_sha256:H('6'), config_response_sha256:H('7'), approved_at_utc: '2000-01-01T00:00:00.000Z' },
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
const resolutionRows = p => {
  const references = new Map(p.decisions.filter(row => row.state === 'REACHABLE' && row.image_role !== null).map(row => [row.image_role, row.image_reference]));
  return p.reachable_image_roles.map((role, index) => {
    const reference = references.get(role), separator = reference.lastIndexOf(':'), repository = reference.slice(0, separator), requestedTag = reference.slice(separator + 1);
    const character = ((index % 9) + 1).toString();
    return {
      schema_version: '1', role, source_reference: reference, registry_host: 'registry-1.docker.io', repository, requested_tag: requestedTag,
      manifest_media_type: 'application/vnd.oci.image.index.v1+json', top_level_manifest_digest: `sha256:${H(character)}`,
      platform_child_digest: `sha256:${H('a')}`, config_digest: `sha256:${H('b')}`, required_repo_digest: `${repository}@sha256:${H(character)}`,
      platform: { os: 'linux', architecture: 'arm64', variant: 'v8' }, selected_config_sha256: H('c'), config_byte_length: 1024, declared_volumes: [], healthcheck: absentHealthcheck(),
      entrypoint_policy: 'REVIEWED_STRUCTURAL_ENTRYPOINT', resolver_id: 'WINWIN_PUBLIC_REGISTRY_METADATA_V1', resolver_version: '1.0.0', resolver_sha256: H('d'),
      response_hashes: { manifest: H('e'), child_manifest: H('f'), config: H('1') }, resolved_at_utc: '2000-01-01T00:00:00.000Z',
      network: { metadata_only: true, filesystem_layers_downloaded: false, anonymous_auth: 'ANONYMOUS_BEARER' }, source_record_sha256: H('2'),
    };
  });
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
test('all exact production roles are classified with no unresolved role', () => { const p=profile(); assert.equal(p.result,'PASS'); assert.equal(p.decisions.length,21); assert.equal(p.reachable_roles.length+p.unreachable_roles.length,21); assert.deepEqual(p.unresolved_roles,[]); });
test('production reachable roles include persistent resources and platform jobs', () => assert.deepEqual(profile().reachable_roles, ['AUTH','AUTH_MIGRATION_JOB','DB_VOLUME','EDGE','EDGE_VOLUME','FOUNDATION_NETWORK','KONG','MAILPIT','PG_META','POSTGRES','REALTIME','REALTIME_BOOTSTRAP_JOB','REST','STORAGE','STORAGE_MIGRATION_JOB','STORAGE_VOLUME','STUDIO']));
test('analytics Vector Imgproxy and Pooler are unreachable', () => assert.deepEqual(profile().unreachable_roles, ['ANALYTICS','IMGPROXY','POOLER','VECTOR']));
test('seed migrations analytics Vector and pgdelta are explicitly disabled', () => assert.deepEqual(profile().project_inputs, { migrations:'DISABLED', seed:'DISABLED', analytics:'DISABLED', vector:'DISABLED', pgdelta:'DISABLED' }));
test('unresolved source default fails profile closed', () => { const p=blockedProfile(); assert.equal(p.result,'BLOCKED'); assert.ok(p.unresolved_roles.includes('AUTH')); assert.ok(p.unresolved_roles.includes('AUTH_MIGRATION_JOB')); });
test('implicit source default enables Mailpit without an explicit config key', () => { const p=profile(); const row=p.decisions.find(x=>x.role_id==='MAILPIT'); assert.equal(row.state,'REACHABLE'); assert.equal(row.reason,'PINNED_SOURCE_DEFAULT_BOOLEAN'); });
test('implicit source default disables Pooler', () => { const row=profile().decisions.find(x=>x.role_id==='POOLER'); assert.equal(row.state,'UNREACHABLE'); assert.equal(row.evidence.includes('db.pooler.enabled=false'),true); });
test('explicit enabled role overrides a source-disabled default', () => { const c=config(); c['db.pooler.enabled']=true; assert.ok(profile(contract(),c).reachable_roles.includes('POOLER')); });
test('explicit disabled role overrides a source-enabled default and gates its job', () => { const c=config(); c['auth.enabled']=false; const p=profile(contract(),c); assert.ok(p.unreachable_roles.includes('AUTH')); assert.ok(p.unreachable_roles.includes('AUTH_MIGRATION_JOB')); });
test('dependent Storage gate disables service volume and platform job together', () => { const c=config(); c['storage.enabled']=false; const p=profile(contract(),c); for(const role of ['STORAGE','STORAGE_VOLUME','STORAGE_MIGRATION_JOB','IMGPROXY']) assert.ok(p.unreachable_roles.includes(role)); });
test('Edge and Storage named volumes follow reachable owning services', () => { const p=profile(); assert.ok(p.reachable_roles.includes('EDGE_VOLUME')); assert.ok(p.reachable_roles.includes('STORAGE_VOLUME')); });
test('platform jobs remain reachable while project migrations and seed are disabled', () => { const p=profile(); for(const role of ['AUTH_MIGRATION_JOB','REALTIME_BOOTSTRAP_JOB','STORAGE_MIGRATION_JOB']) assert.ok(p.reachable_roles.includes(role)); assert.equal(p.project_inputs.migrations,'DISABLED'); assert.equal(p.project_inputs.seed,'DISABLED'); });
test('Postgres major below 15 makes PG15 platform jobs unreachable', () => { const c=config(); c['db.major_version']=14; const p=profile(contract(),c); for(const role of ['AUTH_MIGRATION_JOB','REALTIME_BOOTSTRAP_JOB','STORAGE_MIGRATION_JOB']) assert.ok(p.unreachable_roles.includes(role)); });
test('exact start command and source provenance are profile-bound', () => { const p=profile(); assert.equal(p.start_input_binding.command,'supabase start --workdir <FROZEN_PROJECT_ROOT>'); assert.deepEqual(p.start_input_binding.excluded_services,[]); assert.equal(p.start_input_binding.environment_service_overrides,'FORBIDDEN'); });
test('analytics enabled drift is rejected', () => { const c = config(); c['analytics.enabled'] = true; rejects(() => profile(contract(), c), 'PROFILE_FROZEN_FLAGS'); });
test('independently resolved source roles become reachable', () => { const p = profile(resolvedContract()); assert.ok(p.reachable_roles.includes('KONG')); assert.ok(p.reachable_roles.includes('MAILPIT')); });
test('config identity drift fails', () => { const c = config(); c.project_id = OTHER; rejects(() => deriveEffectiveStartProfile({ contract:contract(), config:c, projectId:P, configSha256:H('a'), configContractSha256:H('b') })); });
test('config frozen flag drift fails', () => { const c = config(); c['db.seed.enabled'] = true; rejects(() => profile(contract(), c), 'PROFILE_FROZEN_FLAGS'); });
test('source version drift fails contract validation', () => { const x = contract(); x.source_binding.supabase_cli_version = '2.116.0'; rejects(() => validateResourceExpectationContract(x), 'RESOURCE_SOURCE_VERSION'); });
test('start source branch or command drift fails contract validation', () => { const x=contract(); x.start_input_binding.command='supabase start --exclude storage'; rejects(() => validateResourceExpectationContract(x),'START_COMMAND_BINDING'); });
test('source evidence drift fails profile', () => rejects(() => deriveEffectiveStartProfile({ contract:contract(), config:config(), projectId:P, configSha256:H('a'), configContractSha256:H('b'), sourceEvidence:{normative_design_sha256:H('0'),source_research_sha256:H('0')} }), 'PROFILE_SOURCE_DRIFT'));

test('resolved synthetic profile is PASS', () => assert.equal(profile(resolvedContract()).result, 'PASS'));
test('resource expectation generation is deterministic', () => { const a=resolved(), b=resolved(); assert.deepEqual(a.instance,b.instance); });
test('resource expectation binds profile approval and producer', () => { const {instance,p}=resolved(); assert.equal(instance.project_id,P); assert.equal(instance.profile_sha256,p.profile_sha256); assert.equal(instance.producer_sha256,H('9')); assert.match(instance.instance_sha256,/^[0-9a-f]{64}$/); });
test('resource expectation reader validates the complete synthetic instance', () => { const {instance}=resolved(); assert.equal(validateResourceExpectationInstance(instance).instance_sha256,instance.instance_sha256); });
test('resource expectation reader rejects provenance-integrity drift', () => { const {instance}=resolved(); instance.profile_sha256=H('8'); rejects(() => validateResourceExpectationInstance(instance),'EXPECTATION_INSTANCE_INTEGRITY'); });
test('expectation generation rejects blocked profile', () => rejects(() => produceResourceExpectationInstance({contract:contract(),profile:blockedProfile(),config:config(),configSha256:H('a'),approvalSet:{},producerSha256:H('9')})));
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
test('image approval producer is deterministic and binds complete profile coverage', () => { const p=profile(), rows=resolutionRows(p), resolver=resolverContract(); const a=produceImageApprovalSet({profile:p,resolutions:rows,resolverContract:resolver,resolverContractSha256:H('4')}); assert.deepEqual(a,produceImageApprovalSet({profile:p,resolutions:rows,resolverContract:resolver,resolverContractSha256:H('4')})); assert.equal(a.profile_sha256,p.profile_sha256); assert.deepEqual(a.approvals.map(row=>row.role),[...p.reachable_image_roles].sort()); assert.equal(validateImageApprovalSet(a),a); });
test('image approval producer rejects missing reachable resolution', () => { const p=profile(), rows=resolutionRows(p); rows.pop(); rejects(() => produceImageApprovalSet({profile:p,resolutions:rows,resolverContract:resolverContract(),resolverContractSha256:H('4')})); });
test('image approval producer rejects profile reference drift', () => { const p=profile(), rows=resolutionRows(p); rows[0].source_reference='library/foreign:latest'; rejects(() => produceImageApprovalSet({profile:p,resolutions:rows,resolverContract:resolverContract(),resolverContractSha256:H('4')}),'APPROVAL_RESOLUTION_REFERENCE'); });
test('image approval producer rejects filesystem-layer acquisition', () => { const p=profile(), rows=resolutionRows(p); rows[0].network.filesystem_layers_downloaded=true; rejects(() => produceImageApprovalSet({profile:p,resolutions:rows,resolverContract:resolverContract(),resolverContractSha256:H('4')}),'APPROVAL_RESOLUTION_LAYER_POLICY'); });
test('image approval producer rejects blocked profile', () => rejects(() => produceImageApprovalSet({profile:blockedProfile(),resolutions:[],resolverContract:resolverContract(),resolverContractSha256:H('4')}),'APPROVAL_PROFILE_BLOCKED'));

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
test('image preparation rejects blocked profile', () => { const p=blockedProfile(), set={schema_version:'1',approval_set_type:IMAGE_APPROVAL_SET_TYPE,purpose:PREREQUISITE_PURPOSE,profile_sha256:p.profile_sha256,independent_source_policy:{resolver_id:'SYNTHETIC_REGISTRY_METADATA_V1',source_class:'REVIEWED_REGISTRY_METADATA',credentials:'FORBIDDEN',layer_download:'FORBIDDEN'},approvals:[]}; rejects(() => planImagePreparation({profile:p,approvalSet:set,preparationContract:preparation()}),'PREPARATION_PROFILE_BLOCKED'); });
test('image preparation rejects incomplete approval coverage', () => { const p=profile(resolvedContract()), set=approvalSet(p); set.approvals.pop(); rejects(() => planImagePreparation({profile:p,approvalSet:set,preparationContract:preparation()})); });
test('image preparation contract forbids retry cleanup and tag-only acceptance', () => { const x=preparation(); assert.equal(x.attempt_policy.retry,'FORBIDDEN'); assert.equal(x.cleanup_policy.remove_partial,'FORBIDDEN'); assert.equal(x.cleanup_policy.remove_unapproved_local,'FORBIDDEN'); assert.equal(x.acceptance_policy.tag_only,'REJECTED'); });
test('image preparation contract rejects nested extension fields', () => { const p=profile(resolvedContract()), set=approvalSet(p), x=preparation(); x.attempt_policy.unreviewed=true; rejects(() => planImagePreparation({profile:p,approvalSet:set,preparationContract:x}),'PREPARATION_ATTEMPTS'); });

test('frozen profile derives without depending on a live production reservation', () => { const derived=profile(); assert.equal(derived.result,'PASS'); assert.equal(derived.reachable_image_roles.length,10); assert.equal(derived.unresolved_roles.length,0); });
test('all new schemas are supported strict JSON Schema documents', () => { for(const [path,title] of [['../schemas/resource-expectation.schema.json','Foundation resource expectation model'],['../schemas/resource-expectation-instance.schema.json','Foundation frozen resource expectation instance'],['../schemas/effective-start-profile.schema.json','Foundation effective start profile'],['../schemas/image-approval.schema.json','Foundation immutable image approval set'],['../schemas/image-preparation.schema.json','Foundation image preparation contract'],['../schemas/registry-digest-resolver.schema.json','Foundation bounded public registry metadata resolver']]) assert.equal(validateSchemaDocumentHeader(load(path),title).result,'PASS'); });
test('every object node in the new schemas rejects additional properties', () => {
  const inspect = value => {
    if (Array.isArray(value)) return value.forEach(inspect);
    if (value && typeof value === 'object') {
      if (value.type === 'object') assert.equal(value.additionalProperties, false);
      Object.values(value).forEach(inspect);
    }
  };
  for (const path of ['../schemas/resource-expectation.schema.json','../schemas/resource-expectation-instance.schema.json','../schemas/effective-start-profile.schema.json','../schemas/image-approval.schema.json','../schemas/image-preparation.schema.json','../schemas/registry-digest-resolver.schema.json']) inspect(load(path));
});
test('tooling source has no Docker Supabase shell network environment or writer path', () => { const source=fs.readFileSync(new URL('../lib/resource-image-prerequisites.mjs',import.meta.url),'utf8'); assert.doesNotMatch(source,/node:child_process|execFile\(|spawn\(|process\.env|node:https|node:http|writeFile|appendFile|mkdir|unlink|rename|rmSync/i); });
