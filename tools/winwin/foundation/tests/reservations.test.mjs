import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ContractError } from '../lib/contracts.mjs';
import {
  RESERVATION_PURPOSE,
  reservationEvidenceFiles,
  syntheticReservationHarness,
} from '../lib/reservations.mjs';

const FIXED_TIME = '2000-01-01T00:00:00.000Z';
const ACTIVE_FILE = 'ia-3a-schema-runtime-validation.json';
const id = suffix => `wwfnd-20000101t000000z-${suffix}`;
const mode = file => fs.lstatSync(file).mode & 0o777;

function harness(t, options = {}) {
  let sessionRootSequence = 0;
  const value = syntheticReservationHarness({
    clock: () => new Date(FIXED_TIME),
    randomBytes: size => {
      if (size === 6) return Buffer.from('000000000001', 'hex');
      const bytes = Buffer.alloc(size);
      bytes.writeUInt32BE(++sessionRootSequence);
      return bytes;
    },
    ...options,
  });
  t.after(() => fs.rmSync(value.root, { recursive: true, force: true }));
  return value;
}

function decision(service) {
  const index = service.readIndex();
  return {
    checked_at_utc: FIXED_TIME,
    freshness_result: 'FRESH-QUALIFIED',
    collision_result: 'PASS',
    expected_entry_count: index.entry_count,
    expected_index_sha256: index.index_sha256,
  };
}

function reserveFresh(t, options = {}) {
  const value = harness(t, options);
  const candidate = value.service.generateCandidate();
  const accepted = value.service.reserve(candidate, decision(value.service));
  return { ...value, candidate, accepted };
}

function activePath(value) {
  return path.join(value.indexRoot, 'active', ACTIVE_FILE);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function replaceJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value) + '\n', { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function syntheticEnd(value, reason = 'SYNTHETIC_TEST_END') {
  const active = readJson(activePath(value));
  const ended = {
    schema_version: '1',
    record_type: 'FOUNDATION_ENDED_SESSION_RESERVATION',
    purpose: RESERVATION_PURPOSE,
    project_id: active.project_id,
    session_root: active.session_root,
    created_at_utc: active.created_at_utc,
    ended_at_utc: '2000-01-01T00:00:01.000Z',
    end_reason: reason,
    reservation_state: 'ENDED',
  };
  replaceJson(path.join(value.indexRoot, 'ended', `${active.project_id}.json`), ended);
  fs.unlinkSync(activePath(value));
  return ended;
}

function treeSnapshot(root) {
  const output = [];
  const visit = current => {
    for (const name of fs.readdirSync(current).sort()) {
      const file = path.join(current, name);
      const stat = fs.lstatSync(file);
      const relative = path.relative(root, file);
      if (stat.isDirectory()) {
        output.push([relative, 'directory', stat.mode & 0o777]);
        visit(file);
      } else {
        output.push([relative, 'file', stat.mode & 0o777, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);
      }
    }
  };
  visit(root);
  return output;
}

function assertContractError(action) {
  assert.throws(action, error => error instanceof ContractError);
}

test('candidate generation is exact ASCII and does not reserve or write metadata', t => {
  const value = harness(t);
  const candidate = value.service.generateCandidate();
  assert.deepEqual(candidate, { project_id: id('000000000001'), generated_at_utc: FIXED_TIME });
  assert.equal(Buffer.byteLength(candidate.project_id, 'ascii'), 35);
  assert.equal(value.service.readIndex().index_state, 'ABSENT');
  assert.deepEqual(fs.readdirSync(value.sessions), []);
});

test('fresh qualified candidate is atomically accepted by the active metadata index', t => {
  const value = reserveFresh(t);
  const index = value.service.readIndex();
  assert.equal(value.accepted.reservation_state, 'ACTIVE');
  assert.equal(index.active.length, 1);
  assert.equal(index.active[0].project_id, value.candidate.project_id);
  assert.equal(index.ended.length, 0);
  assert.equal(fs.statSync(activePath(value)).ino, fs.statSync(path.join(value.accepted.session_root, 'evidence-private', 'active-index-entry.pending.json')).ino);
});

test('an active reservation blocks a second candidate without overwriting accepted metadata', t => {
  const value = reserveFresh(t);
  const before = fs.readFileSync(activePath(value));
  const other = { project_id: id('000000000002'), generated_at_utc: FIXED_TIME };
  assertContractError(() => value.service.reserve(other, decision(value.service)));
  assert.deepEqual(fs.readFileSync(activePath(value)), before);
  assert.equal(value.service.readIndex().active[0].project_id, value.candidate.project_id);
});

test('same active identity cannot be reused', t => {
  const value = reserveFresh(t);
  assertContractError(() => value.service.reserve(value.candidate, decision(value.service)));
  assert.equal(value.service.readIndex().entry_count, 1);
});

test('ended reservation remains historical and cannot be resurrected', t => {
  const value = reserveFresh(t);
  syntheticEnd(value);
  const index = value.service.readIndex();
  assert.equal(index.active.length, 0);
  assert.equal(index.ended[0].project_id, value.candidate.project_id);
  assertContractError(() => value.service.reserve(value.candidate, decision(value.service)));
  assert.equal(value.service.readIndex().ended.length, 1);
});

test('active and ended lifecycle states remain distinct', t => {
  const value = reserveFresh(t);
  syntheticEnd(value);
  const other = { project_id: id('000000000002'), generated_at_utc: FIXED_TIME };
  const accepted = value.service.reserve(other, decision(value.service));
  const index = value.service.readIndex();
  assert.equal(accepted.project_id, other.project_id);
  assert.deepEqual(index.active.map(record => record.project_id), [other.project_id]);
  assert.deepEqual(index.ended.map(record => record.project_id), [value.candidate.project_id]);
});

test('mixed duplicate active and ended identity is rejected as ambiguous', t => {
  const value = reserveFresh(t);
  const active = readJson(activePath(value));
  replaceJson(path.join(value.indexRoot, 'ended', `${active.project_id}.json`), {
    schema_version: '1', record_type: 'FOUNDATION_ENDED_SESSION_RESERVATION', purpose: RESERVATION_PURPOSE,
    project_id: active.project_id, session_root: active.session_root, created_at_utc: active.created_at_utc,
    ended_at_utc: '2000-01-01T00:00:01.000Z', end_reason: 'SYNTHETIC_TEST_END', reservation_state: 'ENDED',
  });
  assertContractError(() => value.service.readIndex());
});

test('malformed JSON and missing required metadata fail closed', async t => {
  await t.test('malformed JSON', t2 => {
    const value = reserveFresh(t2);
    fs.writeFileSync(activePath(value), '{');
    assertContractError(() => value.service.readIndex());
  });
  await t.test('missing field', t2 => {
    const value = reserveFresh(t2);
    const active = readJson(activePath(value));
    delete active.reservation_state;
    replaceJson(activePath(value), active);
    assertContractError(() => value.service.readIndex());
  });
  await t.test('unknown field', t2 => {
    const value = reserveFresh(t2);
    const active = readJson(activePath(value));
    active.role = 'admin';
    replaceJson(activePath(value), active);
    assertContractError(() => value.service.readIndex());
  });
});

test('metadata index drift invalidates a previously qualified decision', t => {
  const value = harness(t);
  const candidate = value.service.generateCandidate();
  const stale = decision(value.service);
  fs.mkdirSync(value.indexRoot, { mode: 0o700 });
  assertContractError(() => value.service.reserve(candidate, stale));
  assert.equal(fs.readdirSync(value.sessions).includes('winwin-fnd-spike.'), false);
});

test('failure before active-link publication leaves no accepted reservation', t => {
  const value = harness(t, { beforeActiveLink: () => { throw new Error('synthetic publication failure'); } });
  const candidate = value.service.generateCandidate();
  assert.throws(() => value.service.reserve(candidate, decision(value.service)), /synthetic publication failure/);
  const index = value.service.readIndex();
  assert.equal(index.active.length, 0);
  assert.equal(index.entry_count, 0);
  assert.equal(fs.readdirSync(value.sessions).filter(name => name.startsWith('winwin-fnd-spike.')).length, 1);
});

test('reader is deterministic and causes no filesystem mutation', t => {
  const value = reserveFresh(t);
  const before = treeSnapshot(value.indexRoot);
  const first = value.service.readIndex();
  const second = value.service.readIndex();
  assert.deepEqual(second, first);
  assert.deepEqual(treeSnapshot(value.indexRoot), before);
});

test('bounded reader rejects path and symlink escapes', async t => {
  await t.test('session root outside approved parent', t2 => {
    const value = reserveFresh(t2);
    const active = readJson(activePath(value));
    active.session_root = fs.realpathSync(os.tmpdir());
    replaceJson(activePath(value), active);
    assertContractError(() => value.service.readIndex());
  });
  await t.test('active entry symlink', t2 => {
    const value = reserveFresh(t2);
    const foreign = path.join(value.root, 'foreign.json');
    fs.writeFileSync(foreign, '{}\n', { mode: 0o600 });
    fs.unlinkSync(activePath(value));
    fs.symlinkSync(foreign, activePath(value));
    assertContractError(() => value.service.readIndex());
  });
});

test('missing or altered evidence invalidates accepted metadata', async t => {
  await t.test('missing evidence', t2 => {
    const value = reserveFresh(t2);
    fs.unlinkSync(path.join(value.accepted.session_root, 'evidence-sanitized', reservationEvidenceFiles.collision));
    assertContractError(() => value.service.readIndex());
  });
  await t.test('hash mismatch', t2 => {
    const value = reserveFresh(t2);
    fs.appendFileSync(path.join(value.accepted.session_root, 'evidence-sanitized', reservationEvidenceFiles.identity), ' ');
    assertContractError(() => value.service.readIndex());
  });
});

test('writer leaves foreign sibling content unchanged', t => {
  const value = harness(t);
  const foreignRoot = path.join(value.sessions, 'winwin-fnd-spike.deadbeef');
  const foreign = path.join(foreignRoot, 'foreign-sibling.txt');
  fs.mkdirSync(foreignRoot, { mode: 0o700 });
  fs.writeFileSync(foreign, 'owned elsewhere\n', { mode: 0o600 });
  const before = treeSnapshot(foreignRoot);
  const candidate = value.service.generateCandidate();
  value.service.reserve(candidate, decision(value.service));
  assert.deepEqual(treeSnapshot(foreignRoot), before);
});

test('created directories are 0700 and created files are 0600', t => {
  const value = reserveFresh(t);
  for (const directory of [value.indexRoot, path.join(value.indexRoot, 'active'), path.join(value.indexRoot, 'ended'), value.accepted.session_root,
    ...['project', 'evidence-private', 'evidence-sanitized', 'bin'].map(name => path.join(value.accepted.session_root, name))]) {
    assert.equal(mode(directory), 0o700, directory);
  }
  for (const file of [path.join(value.indexRoot, 'index-manifest.json'), activePath(value),
    path.join(value.accepted.session_root, 'evidence-private', 'active-index-entry.pending.json'),
    ...Object.values(reservationEvidenceFiles).map(name => path.join(value.accepted.session_root, 'evidence-sanitized', name))]) {
    assert.equal(mode(file), 0o600, file);
  }
});

test('persisted evidence contains no secret-capable keys or secret material', t => {
  const value = reserveFresh(t);
  const files = [activePath(value), path.join(value.indexRoot, 'index-manifest.json'),
    ...Object.values(reservationEvidenceFiles).map(name => path.join(value.accepted.session_root, 'evidence-sanitized', name))];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /password|secret|token|jwt|credential|database_url|connection_string|BEGIN [A-Z ]+PRIVATE KEY/i);
  }
});

test('identity comparison is exact and malformed aliases never reserve', async t => {
  for (const project_id of [id('000000000001').replace('wwfnd', 'WWFND'), id('000000000001').replace('t', 'T'), id('000000000001') + 'x']) {
    await t.test(project_id, t2 => {
      const value = harness(t2);
      assertContractError(() => value.service.reserve({ project_id, generated_at_utc: FIXED_TIME }, decision(value.service)));
      assert.equal(value.service.readIndex().index_state, 'ABSENT');
      assert.deepEqual(fs.readdirSync(value.sessions), []);
    });
  }
});

test('schema artifact is strict and covers all persisted record families', () => {
  const file = new URL('../schemas/reservation.schema.json', import.meta.url);
  const schema = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.oneOf.length, 6);
  for (const name of ['sessionIdentity', 'sessionReservation', 'collision', 'indexManifest', 'activeReservation', 'endedReservation', 'evidenceHashes']) {
    assert.equal(schema.$defs[name].additionalProperties, false, name);
    assert.ok(schema.$defs[name].required.length > 0, name);
  }
  assert.equal(schema.$defs.purpose.const, RESERVATION_PURPOSE);
});
