# WINWIN Foundation Effective Profile and Digest Resolution Closure

Status: `FOUNDATION EFFECTIVE PROFILE PASS / DIGEST APPROVAL PARTIAL`

This artifact closes the deterministic Effective Start Profile work and records the fail-closed result of the independently bounded registry-metadata attempt. It does not authorize image acquisition, Docker mutation, Supabase start, PostgreSQL, SQL, migration execution, deployment, or push.

## Frozen inputs

- Foundation session: `wwfnd-20260830t060320z-b10f6599de24`
- Supabase CLI: `2.115.0`
- reviewed source commit: `18ae43a34a2257458197b62f74e2a97e2b5cf7f9`
- installed binary SHA-256: `06179215a136f183ed24841e177e605fe15bf3e1ac1b6edac8312da71e835014`
- source-research SHA-256: `a0a693664ad689bb3cfca404f5e2c5cd57bb4dda0be61fb167675bc13aada331`
- config SHA-256: `dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684`
- start binding: `supabase start --workdir <FROZEN_PROJECT_ROOT>`
- excluded services: none
- preview: false
- environment service overrides: forbidden

The authoritative local source boundary is the accepted CLI package/binary evidence. Generic product documentation and local Docker image state are not runtime or digest authority.

## Closed CLI default and reachability semantics

The command gate is `apps/cli/src/legacy/commands/start/start.gates.ts::FD6`; orchestration is `apps/cli/src/legacy/commands/start/start.handler.ts::Qq6`; configuration default decoding is rooted at `apps/cli/src/next/config/cli-config.ts::_i6`.

| Role | Source/default gate | Effective value | Classification |
|---|---|---:|---|
| KONG | `FD6`; included when the command exclusion set is empty | excluded=false | REACHABLE |
| MAILPIT | `cli-config.ts::dNA -> FD6` | omitted `local_smtp.enabled` defaults true | REACHABLE |
| REST | `cli-config.ts::$NA -> FD6` | omitted `api.enabled` defaults true | REACHABLE |
| PG_META | `cli-config.ts::oNA -> FD6` | omitted `studio.enabled` defaults true | REACHABLE |
| STUDIO | `cli-config.ts::oNA -> FD6` | omitted `studio.enabled` defaults true | REACHABLE |
| IMGPROXY | `cli-config.ts::nNA -> FD6`; depends on Storage and image transformation | omitted `storage.image_transformation.enabled` defaults false | UNREACHABLE |
| EDGE | `cli-config.ts::fNA -> FD6` | omitted `edge_runtime.enabled` defaults true | REACHABLE |
| POOLER | `cli-config.ts::bNA.pooler -> FD6` | omitted `db.pooler.enabled` defaults false | UNREACHABLE |
| AUTH | `cli-config.ts::yNA -> FD6` | omitted `auth.enabled` defaults true | REACHABLE |
| REALTIME | `cli-config.ts::lNA -> FD6` | omitted `realtime.enabled` defaults true | REACHABLE |
| STORAGE | `cli-config.ts::nNA -> FD6` | omitted `storage.enabled` defaults true | REACHABLE |

The already-frozen `analytics.enabled=false` keeps ANALYTICS and VECTOR unreachable. Project migrations, seed, and pgdelta remain disabled and are distinct from the platform jobs below.

## Volumes and transient platform jobs

| Role | Source/function | Creation condition and semantics | Classification |
|---|---|---|---|
| EDGE_VOLUME | `apps/cli/src/shared/functions/functions-docker.ts::ensureDockerNamedVolume` | persistent named cache volume; depends on reachable EDGE; consumer/mount is bound by Edge serve setup | REACHABLE |
| STORAGE_VOLUME | `apps/cli/src/legacy/commands/start/services/storage.service.ts::sD6` | persistent named volume mounted at `/mnt`; depends on reachable STORAGE; IMGPROXY only shares it when reachable | REACHABLE |
| AUTH_MIGRATION_JOB | `apps/cli/src/legacy/shared/db-bootstrap/db-setup.ts::initSchema15` | one-shot `run --rm`; fresh PostgreSQL 15+ and reachable AUTH; uses effective `db.major_version=17` | REACHABLE |
| REALTIME_BOOTSTRAP_JOB | `apps/cli/src/legacy/shared/db-bootstrap/db-setup.ts::initSchema15` | one-shot `run --rm`; fresh PostgreSQL 15+ and reachable REALTIME; uses effective `db.major_version=17` | REACHABLE |
| STORAGE_MIGRATION_JOB | `apps/cli/src/legacy/shared/db-bootstrap/db-setup.ts::initSchema15` | one-shot `run --rm`; fresh PostgreSQL 15+ and reachable STORAGE; uses effective `db.major_version=17` | REACHABLE |

These three jobs are platform/bootstrap lifecycle objects that may be observable during start. They are not controlled by project-level `db.migrations.enabled=false` or `db.seed.enabled=false`.

## Final Effective Start Profile

Result: `PASS`

- profile SHA-256: `68fa1b17a24ef293af6dedeea831664f13eead394a3866e0df47416b1bc511ab`
- resource model SHA-256: `1f5cdeaaca979a148585b02b940912e0c373f8906b4b21fb8bd9572a008a34d2`
- reachable roles: AUTH, AUTH_MIGRATION_JOB, DB_VOLUME, EDGE, EDGE_VOLUME, FOUNDATION_NETWORK, KONG, MAILPIT, PG_META, POSTGRES, REALTIME, REALTIME_BOOTSTRAP_JOB, REST, STORAGE, STORAGE_MIGRATION_JOB, STORAGE_VOLUME, STUDIO
- unreachable roles: ANALYTICS, IMGPROXY, POOLER, VECTOR
- unresolved roles: none
- deterministic regeneration: PASS

Reachable role-to-image authority:

| Image role | Exact source reference |
|---|---|
| AUTH | `supabase/gotrue:v2.195.0` |
| EDGE | `supabase/edge-runtime:v1.74.3` |
| KONG | `library/kong:2.8.1` |
| MAILPIT | `axllent/mailpit:v1.30.2` |
| PG_META | `supabase/postgres-meta:v0.98.0` |
| POSTGRES | `supabase/postgres:17.6.1.159` |
| REALTIME | `supabase/realtime:v2.129.0` |
| REST | `postgrest/postgrest:v16.1` |
| STORAGE | `supabase/storage-api:v1.69.11` |
| STUDIO | `supabase/studio:2026.08.17-sha-0c1da8f` |

## Independent registry resolver

- contract: `tools/winwin/foundation/contracts/registry-digest-resolver-contract.json`
- contract SHA-256: `305ef22824cf82c3aac3a9727d63899702aba143612f93b7aa4254122d10df27`
- implementation: `tools/winwin/foundation/lib/registry-digest-resolver.mjs`
- implementation SHA-256 used for the live attempt: `c5c23126d49f6a905138684184ecd3a1d72413aac0006eb57991029486e4b965`
- resolver identity: `WINWIN_PUBLIC_REGISTRY_METADATA_V1` version `1.0.0`
- exact target: Docker Hub `registry-1.docker.io`, with anonymous token exchange limited to `auth.docker.io`
- selected platform: OCI `linux/arm64/v8`
- redirects, fallback registry, tag substitution, retries, credentials, Docker auth config, credential helpers, cookies, environment proxies, and shell interpolation: forbidden
- attempt bound: one logical attempt per role, at most one anonymous token exchange, no retry
- body/time bounds: token 64 KiB, manifest 4 MiB, config JSON 2 MiB, 10 seconds per request
- accepted metadata: OCI index, Docker manifest list, OCI/Docker image manifest, and the exact child-described image config JSON
- filesystem layer acquisition: forbidden

The config JSON is classified as bounded non-filesystem metadata. It is fetched at most once per role using the exact config descriptor from the verified child manifest. The resolver validates its digest and retains only a deterministic safe structural projection; it excludes environment values. Layer descriptors are validated structurally but no layer blob request path exists.

The resolver fails closed on malformed JSON, unsupported or mismatched media types, missing/mismatched digest headers, missing/duplicate platform descriptors, wrong OS/architecture/variant, redirects, cookies/duplicate protected headers, non-anonymous authentication, host/repository/reference drift, rate limiting, timeout, partial body, or size-bound violation.

## Live metadata attempt

On 2026-08-30, one bounded live resolution attempt was made for each of the ten exact reachable source references. Every attempt targeted `registry-1.docker.io`; no other registry was queried. Each stopped at `REGISTRY_HEADER_DUPLICATE` before any immutable digest was accepted. The protected header value was neither logged nor persisted, and no retry was made.

| Role | Repository | Tag | Metadata-only | Filesystem layer download | Result |
|---|---|---|---:|---:|---|
| AUTH | supabase/gotrue | v2.195.0 | yes | no | UNRESOLVED — `REGISTRY_HEADER_DUPLICATE` |
| EDGE | supabase/edge-runtime | v1.74.3 | yes | no | UNRESOLVED — `REGISTRY_HEADER_DUPLICATE` |
| KONG | library/kong | 2.8.1 | yes | no | UNRESOLVED — `REGISTRY_HEADER_DUPLICATE` |
| MAILPIT | axllent/mailpit | v1.30.2 | yes | no | UNRESOLVED — `REGISTRY_HEADER_DUPLICATE` |
| PG_META | supabase/postgres-meta | v0.98.0 | yes | no | UNRESOLVED — `REGISTRY_HEADER_DUPLICATE` |
| POSTGRES | supabase/postgres | 17.6.1.159 | yes | no | UNRESOLVED — `REGISTRY_HEADER_DUPLICATE` |
| REALTIME | supabase/realtime | v2.129.0 | yes | no | UNRESOLVED — `REGISTRY_HEADER_DUPLICATE` |
| REST | postgrest/postgrest | v16.1 | yes | no | UNRESOLVED — `REGISTRY_HEADER_DUPLICATE` |
| STORAGE | supabase/storage-api | v1.69.11 | yes | no | UNRESOLVED — `REGISTRY_HEADER_DUPLICATE` |
| STUDIO | supabase/studio | 2026.08.17-sha-0c1da8f | yes | no | UNRESOLVED — `REGISTRY_HEADER_DUPLICATE` |

Anonymous authentication status is `NOT ESTABLISHED`: the fail-closed protected-header rejection occurred before a bearer result could be accepted. No bearer token or raw header was emitted.

Unreachable image roles are not queried and remain `NOT_REACHABLE`: ANALYTICS, IMGPROXY, POOLER, VECTOR.

## Materialization and next boundary

The immutable image approval set is `NOT MATERIALIZED`: all ten reachable image roles remain unresolved. The production Resource Expectation instance is therefore also `NOT MATERIALIZED`; its complete independent approval-set precondition remains unsatisfied. Neither producer precondition was weakened.

Remaining blocker: the registry response/header behavior must be reconciled under a separately reviewed resolver contract and then independently resolved without retrying under this gate's frozen attempt policy.

Exact next-gate recommendation: `BLOCKED — REGISTRY RESOLUTION CONTRACT / TOOLING INSUFFICIENT`.

No image preparation or environment start is authorized by this closure.
