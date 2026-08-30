import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { ContractError } from '../lib/contracts.mjs';
import {
  compareGeneratedConfig,
  i17ExitCode,
  parseExactProjectId,
  renderPlannedConfig,
  syntheticConfigHarness,
  validatePlannedConfigContract,
} from '../lib/configuration.mjs';

const mode = file => fs.lstatSync(file).mode & 0o777;
const rejects = action => assert.throws(action, error => error instanceof ContractError);
const clone = value => JSON.parse(JSON.stringify(value));
const capture = action => {
  try { action(); } catch (error) { return error; }
  assert.fail('expected rejection');
};

function harness(t, options = {}) {
  const value = syntheticConfigHarness(options);
  t.after(() => fs.rmSync(value.ownerRoot, { recursive: true, force: true }));
  return value;
}

function materialized(t, options = {}) {
  const value = harness(t, options);
  const result = value.service.materialize(value.projectId);
  return { ...value, result };
}

function snapshot(root) {
  const rows = [];
  const visit = directory => {
    for (const name of fs.readdirSync(directory).sort()) {
      const file = path.join(directory, name);
      const stat = fs.lstatSync(file);
      const relative = path.relative(root, file);
      if (stat.isDirectory()) {
        rows.push([relative, 'directory', stat.mode & 0o777]);
        visit(file);
      } else if (stat.isSymbolicLink()) rows.push([relative, 'symlink', fs.readlinkSync(file)]);
      else rows.push([relative, 'file', stat.mode & 0o777, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);
    }
  };
  visit(root);
  return rows;
}

function comparisonInput(value, inspected = value.service.readAndVerify(value.projectId)) {
  return {
    reservation: inspected.reservation,
    requestedId: value.projectId,
    contract: value.service.contract(),
    lexical: inspected.lexical,
    materialized: inspected.materialized,
    effective: inspected.effective,
    configSha256: inspected.verification.config_sha256,
    contractSha256: inspected.verification.contract_sha256,
  };
}

function replacePublished(value, bytes) {
  fs.unlinkSync(value.configPath);
  fs.unlinkSync(value.sourcePath);
  fs.writeFileSync(value.sourcePath, bytes, { mode: 0o600 });
  fs.linkSync(value.sourcePath, value.configPath);
}

test('exact reserved identity materializes in synthetic approved scope', t => {
  const value = materialized(t);
  assert.equal(value.result.result, 'PASS');
  assert.equal(value.result.project_id, value.projectId);
  assert.equal(value.result.config_path, value.configPath);
});

test('generated output parses back to the exact raw identity', t => {
  const value = materialized(t);
  const parsed = parseExactProjectId(fs.readFileSync(value.configPath));
  assert.equal(parsed.raw_project_id, value.projectId);
  assert.equal(parsed.byte_count, 35);
  assert.equal(parsed.ascii, true);
});

test('I-17 distinguishes missing from malformed project_id', async t => {
  await t.test('missing', () => {
    const error = capture(() => parseExactProjectId(Buffer.from('[api]\nport = 59321\n')));
    assert.equal(i17ExitCode(error), 31);
  });
  await t.test('malformed', () => {
    const error = capture(() => parseExactProjectId(Buffer.from('project_id "wwfnd-20000101t000000z-000000000001"\n')));
    assert.equal(i17ExitCode(error), 33);
  });
});

test('I-17 rejects duplicate project_id', () => {
  const id = 'wwfnd-20000101t000000z-000000000001';
  rejects(() => parseExactProjectId(Buffer.from(`project_id = "${id}"\nproject_id = "${id}"\n`)));
});

test('I-24 rejects conflicting or duplicate authoritative sources', t => {
  const value = materialized(t);
  rejects(() => compareGeneratedConfig({ ...comparisonInput(value), authoritativeSourceCount: 2 }));
});

test('truncated identity fails closed', () => rejects(() => parseExactProjectId(Buffer.from('project_id = "wwfnd-20000101t000000z-00000000000"\n'))));

test('case-mutated identity fails closed', () => rejects(() => parseExactProjectId(Buffer.from('project_id = "WWFND-20000101t000000z-000000000001"\n'))));

test('authoritative-line whitespace mutation fails lexical validation', () => rejects(() => parseExactProjectId(Buffer.from('project_id  = "wwfnd-20000101t000000z-000000000001"\n'))));

test('normalization-only acceptance is forbidden', t => {
  const value = materialized(t);
  const input = comparisonInput(value);
  input.lexical = { ...input.lexical, normalization_unchanged: false };
  rejects(() => compareGeneratedConfig(input));
});

test('fallback or default project identity fails', () => rejects(() => parseExactProjectId(Buffer.from('project_id = "default"\n'))));

test('I-17 byte-exact expected identity mismatch has its distinct exit class', () => {
  const bytes = Buffer.from('project_id = "wwfnd-20000101t000000z-000000000001"\n');
  const error = capture(() => parseExactProjectId(bytes, 'wwfnd-20000101t000000z-000000000002'));
  assert.equal(i17ExitCode(error), 36);
});

test('foreign session identity cannot be materialized', t => {
  const value = harness(t);
  rejects(() => value.service.materialize('wwfnd-20000101t000000z-000000000002'));
  assert.deepEqual(fs.readdirSync(path.join(value.sessionRoot, 'project')), []);
});

test('existing target is never silently overwritten', t => {
  const value = harness(t);
  const directory = path.dirname(value.configPath);
  fs.mkdirSync(directory, { mode: 0o700 });
  fs.writeFileSync(value.configPath, 'foreign\n', { mode: 0o600 });
  const before = fs.readFileSync(value.configPath);
  rejects(() => value.service.materialize(value.projectId));
  assert.deepEqual(fs.readFileSync(value.configPath), before);
});

test('pre-publication failure leaves no accepted config target', t => {
  const value = harness(t, { beforePublish: () => { throw new Error('synthetic publication failure'); } });
  assert.throws(() => value.service.materialize(value.projectId), /synthetic publication failure/);
  assert.equal(fs.existsSync(value.configPath), false);
  assert.equal(fs.existsSync(value.sourcePath), true);
  rejects(() => value.service.readAndVerify(value.projectId));
});

test('atomic publication preserves source and target inode identity', t => {
  const value = materialized(t);
  assert.equal(fs.lstatSync(value.sourcePath).ino, fs.lstatSync(value.configPath).ino);
  assert.equal(value.result.publication, 'ATOMIC_HARD_LINK_CREATE_NEW');
});

test('materialized and source files are mode 0600', t => {
  const value = materialized(t);
  assert.equal(mode(value.configPath), 0o600);
  assert.equal(mode(value.sourcePath), 0o600);
});

test('session, project, evidence and config directories remain mode 0700', t => {
  const value = materialized(t);
  for (const directory of [value.sessionRoot, path.join(value.sessionRoot, 'project'), path.join(value.sessionRoot, 'evidence-private'), path.dirname(value.configPath)]) assert.equal(mode(directory), 0o700, directory);
});

test('planned contract rejects path traversal and absolute-path substitution', t => {
  const value = harness(t);
  const contract = value.service.contract();
  contract.destination.config_path_relative = 'project/../foreign/config.toml';
  contract.destination.config_path_absolute = path.join(value.ownerRoot, 'foreign', 'config.toml');
  rejects(() => validatePlannedConfigContract(contract));
});

test('writer rejects symlink escape without touching its target', t => {
  const value = harness(t);
  const project = path.join(value.sessionRoot, 'project');
  const foreign = path.join(value.ownerRoot, 'foreign');
  fs.mkdirSync(foreign, { mode: 0o700 });
  fs.rmdirSync(project);
  fs.symlinkSync(foreign, project);
  rejects(() => value.service.materialize(value.projectId));
  assert.deepEqual(fs.readdirSync(foreign), []);
});

test('sibling session content is never mutated', t => {
  const value = harness(t);
  const sibling = path.join(value.ownerRoot, 'winwin-fnd-spike.deadbeef');
  fs.mkdirSync(sibling, { mode: 0o700 });
  fs.writeFileSync(path.join(sibling, 'sentinel'), 'foreign\n', { mode: 0o600 });
  const before = snapshot(sibling);
  value.service.materialize(value.projectId);
  assert.deepEqual(snapshot(sibling), before);
});

test('synthetic historical session remains untouched', t => {
  const value = harness(t);
  const historical = path.join(value.ownerRoot, 'historical-session');
  fs.mkdirSync(historical, { mode: 0o700 });
  fs.writeFileSync(path.join(historical, 'sentinel'), 'historical\n', { mode: 0o600 });
  const before = snapshot(historical);
  value.service.materialize(value.projectId);
  assert.deepEqual(snapshot(historical), before);
});

test('I-17 parser output is deterministic', t => {
  const value = harness(t);
  const bytes = renderPlannedConfig(value.service.contract());
  assert.deepEqual(parseExactProjectId(bytes), parseExactProjectId(bytes));
});

test('I-24 comparator output is deterministic', t => {
  const value = materialized(t);
  const input = comparisonInput(value);
  assert.deepEqual(compareGeneratedConfig(input), compareGeneratedConfig(input));
});

test('multi-reader adapter is read-only', t => {
  const value = materialized(t);
  const before = snapshot(value.ownerRoot);
  const first = value.service.readAndVerify(value.projectId);
  const second = value.service.readAndVerify(value.projectId);
  assert.deepEqual(second.verification, first.verification);
  assert.deepEqual(snapshot(value.ownerRoot), before);
});

test('malformed encoding and structural config fail closed', async t => {
  await t.test('invalid UTF-8', () => rejects(() => parseExactProjectId(Buffer.from([0xff, 0x0a]))));
  await t.test('BOM', () => rejects(() => parseExactProjectId(Buffer.from('\uFEFFproject_id = "wwfnd-20000101t000000z-000000000001"\n'))));
  await t.test('CRLF', () => rejects(() => parseExactProjectId(Buffer.from('project_id = "wwfnd-20000101t000000z-000000000001"\r\n'))));
});

test('unsupported config keys and shapes fail the effective reader', t => {
  const value = materialized(t);
  const original = fs.readFileSync(value.configPath, 'utf8');
  const modified = Buffer.from(original + '[unsupported]\nenabled = false\n');
  replacePublished(value, modified);
  rejects(() => value.service.readAndVerify(value.projectId));
});

test('secret-capable values are not copied into generated config', t => {
  const value = harness(t);
  const text = renderPlannedConfig(value.service.contract()).toString('utf8');
  assert.doesNotMatch(text, /password|secret|token|jwt|credential|service_role|anon_key|database_url/i);
  assert.equal(value.service.contract().source_policy.copied_fields.length, 0);
});

test('diagnostics never echo secret-capable malformed input', () => {
  const marker = 'fixture-private-value-not-for-output';
  try {
    parseExactProjectId(Buffer.from(`project_id = "${marker}"\npassword = "${marker}"\n`));
    assert.fail('expected rejection');
  } catch (error) {
    assert.ok(error instanceof ContractError);
    assert.doesNotMatch(error.message, new RegExp(marker));
  }
});

test('writer source has no subprocess, shell or Docker execution path', () => {
  const source = fs.readFileSync(new URL('../lib/configuration.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /node:child_process|execFile|spawn\(|shell\s*:|docker\s+(?:run|create|start|compose)/i);
});

test('writer source has no Supabase command path', () => {
  const source = fs.readFileSync(new URL('../lib/configuration.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /supabase\s+(?:init|start|stop|link|db)/i);
});

test('writer source has no SQL or migration execution path', () => {
  const source = fs.readFileSync(new URL('../lib/configuration.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bpsql\b|migration\s+up|db\s+push|execute\s+sql/i);
});

test('contract is strict, generated-only, and binds one exact destination', t => {
  const value = harness(t);
  const contract = value.service.contract();
  assert.equal(validatePlannedConfigContract(contract), contract);
  assert.equal(contract.destination.config_path_absolute, value.configPath);
  assert.equal(contract.source_policy.mode, 'GENERATE_MINIMAL_ALLOWLIST_ONLY');
  contract.unexpected = true;
  rejects(() => validatePlannedConfigContract(contract));
});

test('rendered config and provenance hashes are deterministic', t => {
  const value = harness(t);
  const first = renderPlannedConfig(value.service.contract());
  const second = renderPlannedConfig(value.service.contract());
  assert.deepEqual(second, first);
  assert.equal(crypto.createHash('sha256').update(first).digest('hex'), crypto.createHash('sha256').update(second).digest('hex'));
});

test('foreign project content blocks materialization without mutation', t => {
  const value = harness(t);
  const file = path.join(value.sessionRoot, 'project', 'foreign');
  fs.writeFileSync(file, 'foreign\n', { mode: 0o600 });
  const before = fs.readFileSync(file);
  rejects(() => value.service.materialize(value.projectId));
  assert.deepEqual(fs.readFileSync(file), before);
});
