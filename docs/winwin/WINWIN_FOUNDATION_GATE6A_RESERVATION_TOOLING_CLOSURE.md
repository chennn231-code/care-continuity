# WinWin Foundation — Gate 6A Reservation Prerequisite Tooling Closure

Status: A — PREREQUISITE TOOLING IMPLEMENTED AND TESTED; GATE 6A NOT EXECUTED

Date: 2026-08-30

## 1. Scope and result

This checkpoint closes only the two tooling prerequisites that blocked the prior Foundation Gate 6A Session Identity Reservation attempt:

1. a reviewed, bounded S-12-equivalent writer for the reservation identity, collision decision, reservation record, and atomic active-index acceptance; and
2. an I-25 bounded metadata-index reader for exact active and ended reservation metadata.

No real candidate identity was generated, no production reservation root or metadata index was created, and no configuration, Docker, Supabase, PostgreSQL, migration, SQL, remote, deployment, or Git-push operation was performed. A separately authorized fresh Gate 6A attempt is still required.

## 2. Baseline and protected inputs

- Branch: `codex/foundation-spike-design-correction`
- Starting HEAD: `23a9f7a3f6fbcaad2f0a2e3f1584eccbf06147ea`
- Starting worktree: clean; staged 0; unstaged 0; untracked 0
- Migrations 001–009: unchanged
- Migration 009 SHA-256: `919b093f414219c5591f4d7722235e6d489ee5076d2c4f5feedf86c12ca00bf8`
- Foundation design SHA-256: `2d72a26ebbe799fd6e5d830f8e352ab1f306402888a8fc019e074cd5f5ce92c6`
- Foundation runbook SHA-256: `32ed22c5ccc356936d3d23118e76c9821d695148041ae9d02bd7ace48d4bc914`
- Adopted helper report SHA-256: `6adc11757a248e3179bd1c721cd66ded40d6f5c53581bf0b4d747b6f142ea5aa`
- Existing strict contract dependency SHA-256: `4ea30e793791be29b339c949f4163c2d933908853d7e506dd99059a848ca93fa`

The existing Foundation helper files and their adopted tests were not modified. The historical root `/private/tmp/winwin-fnd-spike.H0DyenPZ` was not adopted, read for evidence content, modified, removed, or reused.

## 3. Frozen implementation inventory

Paths are relative to the repository root.

| File | Role | Lines | Bytes | SHA-256 |
|---|---|---:|---:|---|
| `tools/winwin/foundation/lib/reservations.mjs` | Fixed-scope candidate generator, reservation/evidence writer, atomic active-index publisher, and bounded metadata-index reader | 342 | 20,302 | `c6791744a5472e02948093f026a9d5d56146e69c6424657caf49624e7b2571c8` |
| `tools/winwin/foundation/schemas/reservation.schema.json` | Strict machine-readable schemas for three evidence records, index manifest, active record, and ended record | 132 | 5,732 | `773cd6bcdfe9197403c8f582ebf50b28ab2970957dc263cd0d16966d0d98a231` |
| `tools/winwin/foundation/tests/reservations.test.mjs` | Synthetic approved-scope lifecycle, corruption, atomicity, path, permission, and regression tests | 311 | 13,338 | `f3b9f998f891dcd5515871e4435c40b6e15ac4004d8c0f6ad4fc403ae513f429` |

Any change to these three files invalidates this implementation freeze and requires review, tests, and new hashes before a real Gate 6A attempt.

## 4. Writer contract

Production scope is fixed in code to reservation parent `/private/tmp` and metadata root `/private/tmp/winwin-foundation-reservation-index-v1`; callers cannot supply either path. A session root is create-new with the exact `winwin-fnd-spike.` prefix and eight lowercase hexadecimal suffix characters. Its root and four bounded child directories are verified as canonical, non-symlink directories with mode `0700`.

Candidate generation implements the frozen 35-byte ASCII `wwfnd-YYYYMMDDtHHMMSSz-<12 lowercase hex>` format. Generation is memory-only and explicitly does not reserve. Reservation requires a caller-supplied fresh decision bound to the reader's exact entry count and canonical index SHA-256. It rejects index drift, an active reservation, or any exact candidate identity already present as active or ended.

The writer creates only three sanitized evidence files (`session-identity.json`, `session-reservation.json`, and `collision.json`) plus one private staged active record. Every file uses create-new and mode `0600`; every record has an exact field set and deterministic canonical JSON encoding. It does not accept raw output or arbitrary destination paths.

Acceptance occurs only when the fully written and fsynced private active record is atomically hard-linked to the one fixed active-index pathname. Existing metadata is never overwritten. A failure before publication leaves no active index entry and therefore no accepted reservation. A publication collision fails without replacement. There is no retry, reuse, resurrection, cleanup, or broad removal path in production code.

## 5. Metadata-index reader contract

The reader accepts no path input and inspects only the fixed approved index root. The root must contain exactly the manifest, active directory, and ended directory. Active accepts at most the one purpose-specific filename; ended accepts only an exact project-ID filename at one directory level. Ordering and the canonical aggregate SHA-256 are deterministic.

The reader validates exact schemas, raw byte-exact project identities, lifecycle state, timestamps, purpose, canonical session roots, directory/file types and permissions, evidence allowlist, and evidence hashes. It rejects malformed JSON, missing or unknown fields, duplicate IDs or roots, multiple active entries, mismatched filenames or evidence, unsafe symlinks, root substitution, and path escape. It distinguishes active from ended records and never infers ownership from a name alone.

The production reader contains no write, delete, subprocess, shell, network, Docker, Supabase, SQL, or environment operation. Its read-only behavior and deterministic output are covered by before/after synthetic filesystem snapshots.

## 6. Test and static validation closure

- Previous relevant Foundation helper suite: 294 passed, 0 failed.
- New reservation-focused suite: 28 passed, 0 failed.
- Complete relevant Foundation helper suite: 322 passed, 0 failed, 0 skipped, 0 cancelled.
- JavaScript syntax checks: passed.
- Reservation JSON schema parse/strict-field checks: passed.
- Existing helper regression: passed; frozen existing test file unchanged.
- Production reservation index after tests: absent.
- Tests used only per-test synthetic roots owned under the platform temporary directory and removed only their exact owned roots.

Coverage includes fresh acceptance, duplicate active and same-ID rejection, malformed/missing/unknown metadata, ambiguous active/ended duplicates, ended identity non-resurrection, no overwrite, pre-publication failure, read-only deterministic indexing, index drift, path and symlink escape, missing/altered evidence, sibling preservation, exact permissions, secret-capable material rejection, exact ID comparison, and generation-without-reservation.

Static review confirms the production module has no subprocess or shell execution, runtime call, environment access, general recursive traversal, arbitrary-path input, broad cleanup, or hard-coded real project/session identity. Test-only cleanup is limited to the exact synthetic root returned to each test.

## 7. Frozen boundary

This closure means only that the previously missing Gate 6A reservation persistence and metadata-index prerequisites are implementation-ready. It does not claim that Gate 6A passed or that a real session exists. It does not authorize use of the writer, real candidate generation, configuration materialization, Gate 6B, Docker/Supabase execution, migrations, SQL, remote mutation, deployment, cleanup, or push.

Classification:

A —
FOUNDATION GATE 6A PREREQUISITE TOOLING PASS —
RESERVATION PERSISTENCE / METADATA INDEX IMPLEMENTED AND TESTED —
NO REAL SESSION RESERVED —
READY FOR SEPARATE FRESH GATE 6A RESERVATION ATTEMPT
