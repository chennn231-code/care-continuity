// Read-only bridge to the immutable c71aa65 verifier. Never updates witnesses.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { demand, hash, parseJSON, shape } from './contracts.mjs';
import { PROVENANCE_PATHS, canonicalBytes, validateWitness, LOST_SESSION } from './durable-evidence.mjs';
import { renderPlannedConfig, parseExactProjectId } from './configuration.mjs';

export const CURRENT_BASELINE = Object.freeze({
  tooling_checkpoint: 'c71aa65bf83142e3f4d730f14fd258c1f14720d5',
  project_id: 'wwfnd-20260831t120908z-c0e3f4af1a3d',
  config_sha256: '3447d63e5fe674227af31184550992985052d6af74223c9372ebd8394785765a',
  profile_sha256: '565993c10026c175560c1f28dee391502e8d77ee08a5a3f36b5491f98c0c3193',
  active_witness_sha256: 'ff41152de6a9ced15b9214084e5b168cc4ea5fe5b473824872c4eb2f1cf96f66',
  baseline_witness_sha256: '8899dedbb6d399214ce3af55d7dbdbe73cfd8be09975b97757a9c4fe8f170cf5',
});
export const BASELINE_RESOURCE_SHA256 = '1f5cdeaaca979a148585b02b940912e0c373f8906b4b21fb8bd9572a008a34d2';
const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
// This is a verified code checkout, NOT session/evidence authority by path presence.
export const FROZEN_READER_ROOT = '/private/tmp/winwin-foundation-durable-worktree.9cwcxsBG/repo';
const ENV = Object.freeze({ PATH: '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin' });
const RESOURCE = 'tools/winwin/foundation/contracts/resource-expectation-contract.json';
const PLANNED = 'tools/winwin/foundation/contracts/planned-config-contract.json';
function git(args, cwd = REPO) {
  try { return execFileSync('git', args, { cwd, env: ENV, timeout: 10000, maxBuffer: 2097152, stdio: ['ignore','pipe','pipe'] }); }
  catch { demand(false, 'BASELINE_GIT_READ_FAILED'); }
}
function frozenBytes(relative) {
  demand(PROVENANCE_PATHS.includes(relative), 'BASELINE_SOURCE_PATH');
  return git(['show', CURRENT_BASELINE.tooling_checkpoint + ':' + relative]);
}
export function validateCurrentBaselineBinding(value, requestedId = CURRENT_BASELINE.project_id) {
  shape(value, Object.keys(CURRENT_BASELINE));
  demand(requestedId === CURRENT_BASELINE.project_id, 'HISTORICAL_OR_FOREIGN_BASELINE');
  demand(Object.keys(CURRENT_BASELINE).every(key => value[key] === CURRENT_BASELINE[key]), 'CURRENT_BASELINE_BINDING_MISMATCH');
  return value;
}
export function frozenResourceModel() {
  const bytes = frozenBytes(RESOURCE);
  demand(hash(bytes) === BASELINE_RESOURCE_SHA256, 'BASELINE_RESOURCE_DRIFT');
  return parseJSON(bytes);
}
export function assertStartModelUnchanged(current) {
  const previous = frozenResourceModel();
  const projected = structuredClone(current);
  delete projected.healthcheck_binding_policy; delete projected.runtime_healthcheck_overrides; delete projected.foundation_baseline_binding;
  projected.schema_version = '1';
  // Historical identity is compared only to establish unchanged source-model content.
  demand(current.identity_policy.production_project_id === CURRENT_BASELINE.project_id, 'HISTORICAL_OR_FOREIGN_BASELINE');
  projected.identity_policy.production_project_id = LOST_SESSION;
  demand(canonicalBytes(projected).equals(canonicalBytes(previous)), 'BASELINE_START_MODEL_DRIFT');
  return BASELINE_RESOURCE_SHA256;
}
export function verifyCurrentProfile(profile) {
  demand(profile.project_id !== LOST_SESSION, 'HISTORICAL_OR_FOREIGN_BASELINE');
  if (profile.project_id !== CURRENT_BASELINE.project_id) return; // explicitly synthetic callers, never production acceptance
  demand(profile.result === 'PASS' && profile.config_sha256 === CURRENT_BASELINE.config_sha256 && profile.profile_sha256 === CURRENT_BASELINE.profile_sha256 && profile.resource_contract_sha256 === BASELINE_RESOURCE_SHA256, 'CURRENT_PROFILE_BINDING_MISMATCH');
  const { profile_sha256, ...unsigned } = profile;
  // Profiles use sorted JSON without a trailing LF; durable witnesses use LF.
  const bytes = canonicalBytes(unsigned);
  demand(hash(bytes.subarray(0, -1)) === profile_sha256, 'CURRENT_PROFILE_INTEGRITY');
}
export function validateCurrentBaselineReadback(result, requestedId = CURRENT_BASELINE.project_id) {
  validateCurrentBaselineBinding(CURRENT_BASELINE, requestedId);
  demand(result.result === 'PASS' && result.repository_checkpoint === CURRENT_BASELINE.tooling_checkpoint && result.project_id === requestedId && result.active === 1 && result.ended === 0 && result.durable_witness_sha256 === CURRENT_BASELINE.active_witness_sha256, 'CURRENT_RESERVATION_BINDING');
  const baseline = validateWitness(result.baseline);
  demand(baseline.witness_sha256 === CURRENT_BASELINE.baseline_witness_sha256 && baseline.effective_profile_sha256 === CURRENT_BASELINE.profile_sha256 && baseline.config_sha256 === CURRENT_BASELINE.config_sha256, 'CURRENT_BASELINE_WITNESS');
  return baseline;
}
export function readCurrentFoundationBaseline(requestedId = CURRENT_BASELINE.project_id) {
  validateCurrentBaselineBinding(CURRENT_BASELINE, requestedId);
  demand(fs.realpathSync(FROZEN_READER_ROOT) === FROZEN_READER_ROOT, 'BASELINE_READER_PATH');
  demand(git(['rev-parse','HEAD'], FROZEN_READER_ROOT).toString().trim() === CURRENT_BASELINE.tooling_checkpoint && git(['status','--porcelain=v1'], FROZEN_READER_ROOT).length === 0, 'BASELINE_READER_CHECKPOINT');
  // Verify all frozen verifier dependencies BEFORE executing its sole read-only mode.
  for (const relative of PROVENANCE_PATHS) demand(fs.readFileSync(path.join(FROZEN_READER_ROOT, relative)).equals(frozenBytes(relative)), 'BASELINE_READER_SOURCE_DRIFT');
  let result;
  try {
    result = parseJSON(execFileSync(process.execPath, [path.join(FROZEN_READER_ROOT, 'tools/winwin/foundation/establish-baseline.mjs'), '--verify'],
      { cwd: FROZEN_READER_ROOT, env: ENV, timeout: 10000, maxBuffer: 65536, stdio: ['ignore','pipe','pipe'] }));
  } catch { demand(false, 'CURRENT_BASELINE_VERIFICATION_FAILED'); }
  const baseline = validateCurrentBaselineReadback(result, requestedId);
  const contract = parseJSON(frozenBytes(PLANNED));
  contract.reservation_binding.project_id = requestedId;
  contract.reservation_binding.session_root = path.dirname(path.dirname(path.dirname(baseline.config_path)));
  contract.destination.config_path_absolute = baseline.config_path;
  contract.static_values.project_id = requestedId;
  demand(hash(canonicalBytes(contract)) === baseline.config_contract_sha256, 'CURRENT_CONFIG_CONTRACT');
  const bytes = fs.readFileSync(baseline.config_path), source = fs.readFileSync(baseline.source_path);
  demand(bytes.equals(source) && bytes.equals(renderPlannedConfig(contract)) && hash(bytes) === CURRENT_BASELINE.config_sha256, 'CURRENT_CONFIG_BYTES');
  for (const file of [baseline.source_path, baseline.config_path]) {
    const stat = fs.lstatSync(file);
    demand(stat.isFile() && !stat.isSymbolicLink() && stat.dev === baseline.session_local_link.device && stat.ino === baseline.session_local_link.inode && stat.nlink === 2 && (stat.mode & 0o777) === 0o600, 'CURRENT_CONFIG_LINK');
  }
  return { binding: { ...CURRENT_BASELINE }, configRead: { lexical: parseExactProjectId(bytes, requestedId),
    effective: structuredClone(contract.static_values), verification: { config_sha256: baseline.config_sha256, contract_sha256: baseline.config_contract_sha256 } } };
}
