# WINWIN Foundation Resource Expectation and Image Prerequisite Closure

Status: `PARTIAL — ENVIRONMENT START BLOCKED`

This checkpoint closes the bounded design, implementation, and deterministic-test portion of the Resource Expectation and image prerequisite gate. It does not assert that the effective start profile is complete, does not materialize a session Resource Expectation instance, and does not create image approval values.

## 1. Boundary and preflight

- Starting branch: `codex/foundation-spike-design-correction`
- Starting HEAD: `bf5ebe7037dd8141c6e6dfb37228318db1ea83d1`
- Starting parent: `1d5aaaf915900c058bad82dd0bffa44e67f8081d`
- Starting worktree: clean
- Migrations 001–009: byte-unchanged at preflight
- Migration 009 SHA-256: `919b093f414219c5591f4d7722235e6d489ee5076d2c4f5feedf86c12ca00bf8`
- Frozen project/session ID: `wwfnd-20260830t060320z-b10f6599de24`
- Session root: `/private/tmp/winwin-fnd-spike.2e8c9584`
- Reservation state at preflight: `ACTIVE=1`, `ENDED=0`
- Frozen config SHA-256: `dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684`
- Config hard-link identity at preflight: intact

No Docker, Supabase, PostgreSQL, SQL, migration, deployment, remote-mutation, or image-acquisition operation was used to derive this checkpoint.

## 2. Authoritative inputs

The implementation is bounded to repository and frozen-session readers. It reviewed and reconciled:

- Foundation spike design, SHA-256 `2d72a26ebbe799fd6e5d830f8e352ab1f306402888a8fc019e074cd5f5ce92c6`
- Environment Start runbook draft, SHA-256 `19500f3b40fac3ab465abe706870815bb179e0ad408d53e745a806cab4fe64f6`
- Intrinsic side-effects correction, SHA-256 `408182da89564529a3603be94b8255e5eeb7b81441e032688dd38672e58f94d5`
- Resource Acceptance Research v2, SHA-256 `a0a693664ad689bb3cfca404f5e2c5cd57bb4dda0be61fb167675bc13aada331`
- Helper implementation pre-start evidence report, SHA-256 `6adc11757a248e3179bd1c721cd66ded40d6f5c53581bf0b4d747b6f142ea5aa`
- Gate 6B configuration tooling closure, SHA-256 `1198013fa3a69db86162fd959b593222ac9d622620fe9abfd6b2a68042f6bdac`
- Planned Config Contract, SHA-256 `74e1ed25a8d435cf5e857197e400ead215010758b69860f6dcfcb532c072cfd3`
- Configuration reader/module, SHA-256 `2056f130ba4ed6d23a38602184671cab131a92b2c49930286008c38c6240a96b`
- Supabase CLI `2.115.0`, source commit `18ae43a34a2257458197b62f74e2a97e2b5cf7f9`, installed binary SHA-256 `06179215a136f183ed24841e177e605fe15bf3e1ac1b6edac8312da71e835014`

No direct logical contradiction was found. The ownership contract remains unchanged: exact config project ID plus both exact ownership labels; names are hints only, and the retired CLI-reported ownership ID is not authority.

## 3. Effective start profile

The deterministic profile binds the frozen project ID, config hash, config-contract hash, resource-contract hash, exact CLI/source evidence, and per-role reachability reasons. Its current result is `BLOCKED`, with profile SHA-256 `1276deee926ee8aabae52fd6ed5d9c375628640df4ecae96aba38bf470c0741c`.

Exact proven reachable roles:

- `POSTGRES` — persistent container — `supabase/postgres:17.6.1.159`
- `DB_VOLUME` — persistent volume
- `FOUNDATION_NETWORK` — persistent network

Exact proven unreachable roles:

- `ANALYTICS` — `analytics.enabled=false` — `supabase/logflare:1.50.2`
- `VECTOR` — disabled with Analytics — `timberio/vector:0.53.0-alpine`

The frozen project inputs explicitly establish migrations, seed, analytics, Vector, and pgdelta as disabled. Project migrations and seed are distinct from the platform bootstrap jobs below.

Unresolved persistent roles and image references:

| Role | Image reference | Missing effective input class |
| --- | --- | --- |
| `KONG` | `library/kong:2.8.1` | exclude set, API gate, TLS branch |
| `MAILPIT` | `axllent/mailpit:v1.30.2` | SMTP enable/default and exclude set |
| `REST` | `postgrest/postgrest:v16.1` | API gate, exclude set, major-dependent pin |
| `PG_META` | `supabase/postgres-meta:v0.98.0` | Studio gate, exclude set, version pin |
| `STUDIO` | `supabase/studio:2026.08.17-sha-0c1da8f` | Studio gate, exclude set, version/function inputs |
| `IMGPROXY` | `darthsim/imgproxy:v3.8.0` | Storage/transformation gates and exclude set |
| `EDGE` | `supabase/edge-runtime:v1.74.3` | Edge gate, exclude set, version/workload inputs |
| `POOLER` | `supabase/supavisor:2.9.7` | Pooler gate/mode, exclude set, version pin |
| `AUTH` | `supabase/gotrue:v2.195.0` | Auth/provider/hook gates, exclude set, version pin |
| `REALTIME` | `supabase/realtime:v2.129.0` | Realtime gate, exclude set, version pin |
| `STORAGE` | `supabase/storage-api:v1.69.11` | Storage gate/backend, exclude set, version pin |

`STORAGE_VOLUME` and `EDGE_VOLUME` are unresolved with their parent service and image declared-volume coverage. `AUTH_MIGRATION_JOB`, `REALTIME_BOOTSTRAP_JOB`, and `STORAGE_MIGRATION_JOB` are unresolved transient jobs because their parent platform roles are unresolved. They are not disabled by `db.migrations.enabled=false` or `db.seed.enabled=false`.

No silent default inclusion or exclusion is performed.

## 4. Resource Expectation model

The reusable contract is `tools/winwin/foundation/contracts/resource-expectation-contract.json`. Strict schemas cover the reusable contract and frozen instance separately:

- `tools/winwin/foundation/schemas/resource-expectation.schema.json`
- `tools/winwin/foundation/schemas/resource-expectation-instance.schema.json`

`tools/winwin/foundation/lib/resource-image-prerequisites.mjs` provides the deterministic producer, strict instance reader, and candidate comparator.

The model distinguishes `CONTAINER`, `VOLUME`, `NETWORK`, and `TRANSIENT_JOB`; persistent and transient lifecycle; explicit minimum/maximum cardinality; image role; mount/network relationships; frozen 59320–59329 port projection; loopback-only HostIP policy; and health/lifecycle requirements. Resource names are discovery hints only.

Every candidate entering candidate scope must carry an explicit disposition and its complete discovery match set. Missing, duplicate, unexpected, ambiguous, malformed, unclassified, foreign/mixed-ownership, relationship, port, image-role, lifecycle, and cardinality conditions fail closed. Unrelated pre-existing resources remain outside session scope unless collision or discovery evidence makes them candidates.

Every accepted persistent container, volume, and network requires both `com.supabase.cli.project` and `com.docker.compose.project`, each byte-equal to the exact frozen project ID.

## 5. Frozen instance status

`NOT MATERIALIZED`

Materialization is correctly blocked by two authoritative input gaps:

1. the effective profile remains unresolved for eleven persistent service roles, two dependent volumes, and three transient jobs; and
2. no complete independent immutable image approval set exists for the eventual exact reachable image set.

The producer requires a `PASS` profile and complete profile-bound approvals. Synthetic tests prove deterministic generation and regeneration without weakening the production boundary.

## 6. Immutable image approval model

`tools/winwin/foundation/schemas/image-approval.schema.json` defines a strict approval set. No production approval-set artifact was created.

Each record binds role, exact source reference, approved registry manifest/RepoDigest, approved platform child digest, approved config/image digest, OS, architecture, variant, reviewed safe Config projection hash, declared volumes, structural entrypoint policy, independent resolver identity, independent source-record hash, and non-authoritative approval timestamp.

Only a separately reviewed, bounded, credential-free, layer-free registry metadata resolver may produce approval inputs. A local image or locally pulled result cannot self-approve. No such reviewed resolver is currently implemented, so no digest value is recorded.

The pure comparator rejects tag-only equality, normalization, wrong or missing RepoDigest, manifest/platform-child/config digest drift, OS/architecture drift, safe Config drift, declared-volume drift, structural entrypoint drift, unapproved roles, and missing independent provenance. It never pulls, tags, repairs, or writes.

Current digest status:

- `POSTGRES`: `UNRESOLVED` — role is reachable; independent immutable digest approval is absent.
- `ANALYTICS`, `VECTOR`: `NOT REACHABLE` for the frozen config.
- `AUTH`, `EDGE`, `IMGPROXY`, `KONG`, `MAILPIT`, `PG_META`, `POOLER`, `REALTIME`, `REST`, `STORAGE`, `STUDIO`: `UNRESOLVED` because the effective profile has not proven reachability; approvals must wait for the exact reachable set.

## 7. Future image preparation contract

`tools/winwin/foundation/contracts/image-preparation-contract.json` and `tools/winwin/foundation/schemas/image-preparation.schema.json` define planning only:

- input: a `PASS` effective profile, frozen Resource Expectation instance, and complete independent approval set;
- mode: pre-cached approved immutable digest only;
- order: role ID ascending;
- attempts: one per image, no retry, stop on first failure;
- partial failure: preserve and stop;
- drift/unavailable digest/approval mismatch: fail;
- cleanup and removal of partial or unapproved local images: forbidden;
- evidence: sanitized in memory unless separately authorized;
- local acceptance: exact approved immutable identity, never tag presence.

No image preparation or acquisition occurred.

## 8. Tooling matrix

| Capability | Status |
| --- | --- |
| Resource Expectation producer | `IMPLEMENTED + TESTED` |
| Resource Expectation reader | `IMPLEMENTED + TESTED` |
| Resource comparator | `IMPLEMENTED + TESTED` |
| Effective profile derivation | `IMPLEMENTED + TESTED` — production inputs remain unresolved |
| Image approval reader | `IMPLEMENTED + TESTED` |
| Image provenance comparator | `IMPLEMENTED + TESTED` |
| Image preparation planner | `IMPLEMENTED + TESTED` |
| Image acquisition | `MISSING` |
| I-30 start-boundary inspector | `MISSING` |
| Compound launcher | `MISSING` |
| Stream redactor | `MISSING` |
| General S-12 runtime evidence writer | `MISSING` |
| Transient observer | `MISSING` |

Reservation/config-specific writers do not satisfy the general S-12 runtime evidence-writer requirement.

## 9. Validation

- Focused prerequisite tests: 67 passed, 0 failed, 0 skipped
- Full Foundation suite: 428 passed, 0 failed, 0 skipped
- Broader application suite: 309 passed, 0 failed, 0 skipped
- TypeScript: passed
- Production build: passed
- Strict schema headers and recursive object closure: passed
- JavaScript syntax: passed
- JSON parsing: 7 artifacts passed
- `git diff --check`: passed

## 10. Remaining blockers and next gate

Only the following blockers remain from this prerequisite:

1. a reviewed deterministic effective-profile input resolver for the exact CLI defaults, enable gates, exclude set, version selection, workload/function branches, and dependent volume/job reachability;
2. a reviewed bounded independent immutable registry metadata/digest resolver that uses no credentials and downloads no layers;
3. after those inputs exist, production approval-set and Resource Expectation instance materialization;
4. downstream I-30, launcher, redactor, general S-12 writer, and transient-observer tooling before Environment Start can be considered.

Next-gate recommendation:

`4. BLOCKED — SPECIFIC PREREQUISITE TOOLING REMAINS`

Classification:

`B — FOUNDATION RESOURCE EXPECTATION / IMAGE PREREQUISITE PARTIAL — TOOLING IMPLEMENTED BUT SPECIFIC DIGEST / SOURCE / START PREREQUISITE REMAINS — NO ENVIRONMENT START`

## 11. Explicit non-actions

This gate performed no image pull/build/load/tag/removal; container creation/removal; volume creation/removal; network creation/removal; Supabase start/stop; PostgreSQL start or connection; SQL; migration execution; hosted Supabase access; deployment; remote mutation; or push.
