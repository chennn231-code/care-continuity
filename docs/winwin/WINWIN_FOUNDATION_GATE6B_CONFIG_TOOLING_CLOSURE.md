# WinWin Foundation — Gate 6B Config Tooling Closure

Status: A — PREREQUISITE TOOLING IMPLEMENTED AND TESTED; REAL CONFIG NOT MATERIALIZED

Date: 2026-08-30

## 1. Scope and resolved gaps

This checkpoint closes only the prerequisite implementation gaps exposed by the blocked real Gate 6B attempt: the S-05-equivalent bounded config writer, I-17 exact project-ID parser and exit classification, I-24 generated/effective config comparator, frozen Planned Config Contract, exact isolated destination, bounded read/write scope, and read-only multi-reader adapter.

The real reservation remains `wwfnd-20260830t060320z-b10f6599de24`, ACTIVE exactly once at `/private/tmp/winwin-fnd-spike.2e8c9584`. No configuration was written there. No Supabase command, Docker command, image action, SQL, migration, PostgreSQL, remote action, deployment, or Git push was performed.

## 2. Frozen Planned Config Contract

The sole authoritative pre-start config destination is:

`/private/tmp/winwin-fnd-spike.2e8c9584/project/supabase/config.toml`

Its session-relative form is fixed as `project/supabase/config.toml`; the immutable publication source is fixed as `evidence-private/config-materialization.source.toml`. Production callers cannot provide either path, substitute a root, or supply a different contract.

The authoritative field is the first, top-level, byte-exact line `project_id = "<VALUE>"`. The contract binds it to the existing reservation and freezes all ten host ports 59320–59329 plus disabled migrations, seed, analytics, and pgdelta branches. The configuration is generated deterministically from this allowlist; no repository config, environment, dotenv, remote link, historical config, foreign config, or template file is copied.

Directories must be canonical non-symlink directories with mode `0700`; the immutable source and public config must be canonical regular files with mode `0600`. Publication is create-new and atomic through a hard link from the fully written/fsynced source. Existing project content, config directory, source, or target blocks the write. There is no overwrite, repair, retry, fallback identity, cleanup, or partial-target acceptance.

Only the `supabase` entry may exist in the project root after publication, and only `config.toml` may exist in that directory. Any other authoritative source, entry, unknown key, duplicate project ID, symlink, encoding defect, normalization, case/whitespace change, truncation, source mismatch, or reservation drift fails closed.

## 3. Implementation freeze

Paths are relative to the repository root.

| File | Role | Lines | Bytes | SHA-256 |
|---|---|---:|---:|---|
| `tools/winwin/foundation/contracts/planned-config-contract.json` | Exact real reservation binding, destination, allowed static values, permissions, publication, ambiguity, and provenance contract | 85 | 2,699 | `74e1ed25a8d435cf5e857197e400ead215010758b69860f6dcfcb532c072cfd3` |
| `tools/winwin/foundation/lib/configuration.mjs` | Bounded writer, I-17 parser/exit mapping, strict full projection, I-24 comparator, and reservation/config multi-reader adapter | 406 | 23,549 | `2056f130ba4ed6d23a38602184671cab131a92b2c49930286008c38c6240a96b` |
| `tools/winwin/foundation/schemas/configuration.schema.json` | Strict JSON Schema for the Planned Config Contract | 150 | 6,553 | `8e18e947bfc983f54ebd6792da126c5578ec78a24bbe266395b697ace33fcb2c` |
| `tools/winwin/foundation/tests/configuration.test.mjs` | Synthetic contract, writer, parser, comparator, adapter, atomicity, secret, and filesystem tests | 305 | 13,185 | `b7d5f5e40e26827dfccd418451583ac3baf16277f5be807de7304c3255dc3715` |

Direct frozen dependencies remain unchanged:

- `tools/winwin/foundation/lib/auditors.mjs`: `164c892c5fded81c4640657371b02b37b8e449751c7a9492ae544ab9a299cf2c`
- `tools/winwin/foundation/lib/contracts.mjs`: `4ea30e793791be29b339c949f4163c2d933908853d7e506dd99059a848ca93fa`
- `tools/winwin/foundation/lib/reservations.mjs`: `c6791744a5472e02948093f026a9d5d56146e69c6424657caf49624e7b2571c8`

The deterministic in-memory rendering for the frozen real contract is 436 bytes with SHA-256 `dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684`; the authoritative raw project-ID line SHA-256 is `6714aec00d93ca4c36061b23f655e3086b54dfaa44e227cc81e7ceb770584abf`. These are planned values only; no real config file was created.

Any change to the four implementation files invalidates this freeze and requires a new review, full test run, and hashes before real materialization.

## 4. Writer, parser, comparator, and adapter behavior

The production service loads only the fixed contract above and revalidates the active reservation before any write. It accepts only the exact requested ID already present in the contract. The writer renders in memory, runs I-17 and I-24 before creating the config directory, writes and fsyncs the immutable source with create-new semantics, then atomically publishes the config and performs immediate read-back verification.

I-17 reads bytes with fatal UTF-8 handling, preserves the raw ID, requires LF/no BOM/no NUL/final newline, distinguishes missing, duplicate/conflicting, lexical, encoding, ID-format, and byte-mismatch failures, and maps them to exit classes 31–36. It performs no trim, normalization, case folding, quote repair, or fallback.

I-24 compares the reservation ID, requested ID, raw lexical ID, strict materialized projection, and independent exact-template effective projection byte-for-byte. It also invokes the existing pure `effectiveInputs` boundary for all frozen static fields and disabled branches. One and only one authoritative config source is allowed.

The adapter is read-only: it reads the reservation index, the one config path, and its immutable source; validates exact directory inventories, permissions, inode-published bytes, schemas, and hashes; then returns only allowlisted provenance and comparison results. It cannot generate an ID or mutate input state.

## 5. Validation closure

- Previous complete relevant Foundation suite: 322 passed, 0 failed.
- New config-focused suite: 39 passed, 0 failed.
- Complete relevant Foundation suite: 361 passed, 0 failed, 0 skipped, 0 cancelled.
- JavaScript syntax checks: passed.
- Contract/schema JSON parsing and strict shape checks: passed.
- Existing helper and Gate 6A reservation-tooling regressions: passed.
- Git whitespace check: passed.

Coverage includes exact synthetic write/read-back, missing/malformed/duplicate/conflicting IDs, truncation, case, whitespace, normalization, fallback/default and foreign IDs, no overwrite, partial failure, atomic publication, file/directory permissions, traversal, symlink and root substitution, sibling/historical preservation, deterministic parser/comparator/rendering, read-only adapter snapshots, invalid UTF-8/BOM/CRLF, unknown shape, secret non-copy/non-emission, no subprocess/shell/Docker/Supabase/SQL execution paths, strict contract, and foreign project blocking.

All successful writer tests used only per-test synthetic roots owned by the test process. Test cleanup removed only each exact owned synthetic root.

## 6. Real session integrity and prohibited behavior

Post-test read-only verification confirms ACTIVE=1, ENDED=0, reservation index SHA-256 `00b490c711c0456bd2d4eda42a888da72d2f9044d2ffa6fc0a6c63227f48dbb0`, and an empty real `project` directory. Gate 6A evidence hashes remain unchanged:

- active source: `01704a9e58cff2533d7612d8f8591ed24cb216ab4b5b647a7a08ab0269a404c0`
- session identity: `b712be7b6d673a29845207baa64c0169f03f5a35587aad9d051a089561c26935`
- session reservation: `23d5467a1e02b4034559a9040a457ff20e81c035a097e31b4a4e439166daefee`
- collision: `9b32f90be4615c09f7096f9dfef31e62afca400438d5d779eefc4e9ee7f4663a`

The historical root `/private/tmp/winwin-fnd-spike.H0DyenPZ` was not read for secret-capable contents, modified, adopted, renamed, removed, or reused.

This closure authorizes no real use of the writer. It does not authorize config materialization, effective verification against a real file, Supabase init/start/stop, image preparation, Docker mutation, SQL, migrations, runtime validation, remote action, deployment, cleanup, or push.

Classification:

A —
FOUNDATION GATE 6B PREREQUISITE TOOLING PASS —
CONFIG WRITER / EXACT PARSER / EFFECTIVE CONFIG COMPARATOR / CONFIG CONTRACT IMPLEMENTED AND TESTED —
REAL RESERVED SESSION UNCHANGED —
READY FOR SEPARATE REAL GATE 6B CONFIG MATERIALIZATION ATTEMPT
