// Explicit one-attempt local gate. No registry/image/runtime/SQL operations.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { demand, hash } from './lib/contracts.mjs';
import { foundationReservationService, inspectEphemeralReservationIndex } from './lib/reservations.mjs';
import { foundationConfigService, renderPlannedConfig } from './lib/configuration.mjs';
import { deriveEffectiveStartProfile } from './lib/resource-image-prerequisites.mjs';
import { ACCEPTED_CHECKPOINT, LOST_SESSION, HISTORICAL_CONFIG_SHA256, HISTORICAL_PROFILE_SHA256,
  RESERVED_PORTS, canonical, foundationDurableStore, initializeProductionDurableEvidence, productionDurableRoot } from './lib/durable-evidence.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = name => fs.readFileSync(path.join(ROOT, name));
const json = name => JSON.parse(read(name));
const PLANNED = 'tools/winwin/foundation/contracts/planned-config-contract.json';
const RESOURCE = 'tools/winwin/foundation/contracts/resource-expectation-contract.json';
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
export function historicalProfile() {
  const planned = json(PLANNED), resource = json(RESOURCE);
  demand(hash(renderPlannedConfig(planned)) === HISTORICAL_CONFIG_SHA256 && planned.reservation_binding.project_id === LOST_SESSION, 'HISTORICAL_CONFIG_DRIFT');
  const sourceEvidence = {
    normative_design_sha256: hash(read('docs/winwin/WINWIN_FOUNDATION_SECURITY_CONCURRENCY_FEASIBILITY_SPIKE_DESIGN.md')),
    source_research_sha256: hash(read('docs/winwin/WINWIN_FOUNDATION_RESOURCE_ACCEPTANCE_EVIDENCE_RESEARCH_V2.md')),
  };
  const profile = deriveEffectiveStartProfile({ contract: resource, config: planned.static_values, projectId: LOST_SESSION,
    configSha256: HISTORICAL_CONFIG_SHA256, configContractSha256: hash(read(PLANNED)), resourceContractSha256: hash(read(RESOURCE)), sourceEvidence });
  demand(profile.result === 'PASS' && profile.profile_sha256 === HISTORICAL_PROFILE_SHA256, 'HISTORICAL_PROFILE_DRIFT');
  return profile;
}
// Only session identity and its config/contract fingerprints are excluded.
// Every source rule, role/image reference, start input and dependency remains compared.
export function semanticProfile(profile) {
  const { project_id, config_sha256, config_contract_sha256, profile_sha256, ...semantics } = profile;
  return semantics;
}
export function verifyNewProfile(configRead) {
  const historical = historicalProfile();
  const current = deriveEffectiveStartProfile({ contract: json(RESOURCE), config: configRead.effective,
    projectId: configRead.lexical.raw_project_id, configSha256: configRead.verification.config_sha256,
    configContractSha256: configRead.verification.contract_sha256, resourceContractSha256: hash(read(RESOURCE)) });
  demand(current.result === 'PASS' && canonical(semanticProfile(current)) === canonical(semanticProfile(historical)), 'PROFILE_SEMANTICS_DRIFT');
  return { profile: current, semantic_profile_sha256: hash(Buffer.from(canonical(semanticProfile(current)))), semantic_unchanged: true };
}
export function baselinePayload(configRead, verifiedProfile, createdAtUtc) {
  const stat = fs.lstatSync(configRead.paths.sourceFile);
  return { project_id: configRead.lexical.raw_project_id, created_at_utc: createdAtUtc,
    config_sha256: configRead.verification.config_sha256, config_source_sha256: hash(fs.readFileSync(configRead.paths.sourceFile)),
    config_contract_sha256: configRead.verification.contract_sha256, config_bytes: configRead.config_bytes,
    source_path: configRead.paths.sourceFile, config_path: configRead.paths.configFile,
    session_local_link: { device: stat.dev, inode: stat.ino, link_count: stat.nlink, mode: (stat.mode & 0o777).toString(8).padStart(4, '0') },
    effective_profile_sha256: verifiedProfile.profile.profile_sha256, historical_profile_sha256: HISTORICAL_PROFILE_SHA256,
    semantic_profile_sha256: verifiedProfile.semantic_profile_sha256, semantic_unchanged: verifiedProfile.semantic_unchanged };
}
function checkpoint() {
  demand(git(['status','--porcelain=v1']) === '', 'EXECUTION_WORKTREE_DIRTY');
  const head = git(['rev-parse','HEAD']);
  demand(head !== ACCEPTED_CHECKPOINT && git(['rev-parse','HEAD^']) === ACCEPTED_CHECKPOINT, 'TOOLING_CHECKPOINT_PARENT');
  demand(git(['diff',ACCEPTED_CHECKPOINT,'HEAD','--','supabase/migrations']) === '', 'MIGRATION_DRIFT');
  demand(hash(read('supabase/migrations/20260830120000_winwin_authority_foundation.sql')) === '919b093f414219c5591f4d7722235e6d489ee5076d2c4f5feedf86c12ca00bf8', 'MIGRATION_009_DRIFT');
  return head;
}
function localPortPreflight() {
  const result = spawnSync('/usr/sbin/lsof', ['-nP','-iTCP:59320-59329','-sTCP:LISTEN','-Fpn'], { encoding: 'utf8', timeout: 10000 });
  demand(!result.error && result.status === 1 && result.stdout === '' && result.stderr === '', 'LOCAL_RESERVED_PORT_COLLISION_OR_UNKNOWN');
  return { result: 'NO_KNOWN_LOCAL_TCP_LISTENERS', ports: [...RESERVED_PORTS], authority: 'LOCAL_READ_ONLY_LSOF_NOT_RUNTIME_ACCEPTANCE' };
}
function createBaseline() {
  const head = checkpoint(); historicalProfile();
  demand(!fs.existsSync(productionDurableRoot()), 'DURABLE_ROOT_EXISTS');
  const ephemeral = inspectEphemeralReservationIndex();
  demand(ephemeral.index_state === 'ABSENT' && ephemeral.entry_count === 0, 'UNEXPECTED_EPHEMERAL_RESERVATION');
  const ports = localPortPreflight();
  // All preflight checks precede persistent bootstrap and the ONE real candidate.
  initializeProductionDurableEvidence({ toolingCheckpoint: head, createdAtUtc: new Date().toISOString() });
  const reservations = foundationReservationService(), index = reservations.readIndex();
  const candidate = reservations.generateCandidate();
  const reservation = reservations.reserve(candidate, { checked_at_utc: new Date().toISOString(), freshness_result: 'FRESH-QUALIFIED', collision_result: 'PASS',
    expected_entry_count: index.entry_count, expected_index_sha256: index.index_sha256 });
  const config = foundationConfigService();
  config.materialize(candidate.project_id);
  const inspected = config.readAndVerify(candidate.project_id), profile = verifyNewProfile(inspected);
  const baseline = foundationDurableStore().publishBaseline(baselinePayload(inspected, profile, new Date().toISOString()));
  config.readAndVerify(candidate.project_id); reservations.readIndex();
  return { result: 'PASS', repository_checkpoint: head, durable_root: productionDurableRoot(), ports, reservation, baseline,
    historical_session: { project_id: LOST_SESSION, state: 'CONTINUITY_LOST', reused: false }, environment_start: 'NOT_AUTHORIZED' };
}
function verifyBaseline() {
  const head = checkpoint(), store = foundationDurableStore(), state = store.read();
  demand(state.manifest.tooling_checkpoint === head && state.baseline, 'BASELINE_CHECKPOINT_OR_COMPLETION');
  const index = foundationReservationService().readIndex(), config = foundationConfigService();
  const inspected = config.readAndVerify(index.active[0].project_id), profile = verifyNewProfile(inspected);
  demand(profile.profile.profile_sha256 === state.baseline.effective_profile_sha256, 'BASELINE_PROFILE_DRIFT');
  return { result: 'PASS', repository_checkpoint: head, project_id: index.active[0].project_id, active: index.active.length, ended: index.ended.length,
    durable_root: store.root, durable_witness_sha256: state.active.witness_sha256, baseline: state.baseline, environment_start: 'NOT_AUTHORIZED' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    demand(process.argv.length === 3, 'BASELINE_COMMAND');
    const mode = process.argv[2];
    demand(['--check-profile','--create-once','--verify'].includes(mode), 'BASELINE_COMMAND');
    const result = mode === '--check-profile' ? { result: 'PASS', historical_profile_sha256: historicalProfile().profile_sha256 }
      : mode === '--create-once' ? createBaseline() : verifyBaseline();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    // No raw exception paths/commands/secret-bearing subprocess output.
    console.error(JSON.stringify({ result: 'FAIL', code: error.code ?? 'BASELINE_FAILURE', retry: 'FORBIDDEN', environment_start: 'NOT_AUTHORIZED' }));
    process.exitCode = 1;
  }
}
