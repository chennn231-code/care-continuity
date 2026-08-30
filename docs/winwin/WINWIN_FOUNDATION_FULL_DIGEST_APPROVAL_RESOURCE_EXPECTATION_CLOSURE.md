# WINWIN Foundation Full Digest Approval and Resource Expectation Closure

Status: `FOUNDATION FULL DIGEST RESOLUTION PARTIAL`

This artifact records the authorized metadata-only production digest-resolution pass. The pass stopped on the first reachable role as required. No image approval set or Resource Expectation instance was materialized, no later role was queried, and no image or runtime resource was acquired or started.

## Frozen inputs

- branch: `codex/foundation-spike-design-correction`
- starting checkpoint: `b2ef1cf9ef31cb30a35e6790cc48b8076e095d4d`
- parent: `a6245946ccbc26a187c0bbe5aef3cf855c6465b8`
- session: `wwfnd-20260830t060320z-b10f6599de24`
- reservation: `ACTIVE=1`, `ENDED=0`
- config SHA-256: `dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684`
- Effective Start Profile: `PASS`
- Effective Start Profile SHA-256: `68fa1b17a24ef293af6dedeea831664f13eead394a3866e0df47416b1bc511ab`
- resolver SHA-256: `4e02c25e546c140a2399744433f543ee6b193a8f976559972774abbbda61703a`
- resolver contract SHA-256: `a48a242b0e03d1c75bf98c8958b4983ea25043e0d2c4db7ec9a6a8c5a62428b8`
- image approval schema SHA-256: `43c51099176c84b7f5a2d0ccd8887f4ec7cac27c302b30f3dfc1be2d00a8ee3b`
- Resource Expectation contract SHA-256: `1f5cdeaaca979a148585b02b940912e0c373f8906b4b21fb8bd9572a008a34d2`
- Resource Expectation schema SHA-256: `1fd05b1e2541168f62b2d9dfd6dbb0cff56624b3a3476e056a0820b93bb82dda`
- Resource Expectation instance schema SHA-256: `b07f83da53d7c343911dffbc04cf788c0489a0af6476e6865812ec995d8e6227`
- Resource Expectation producer SHA-256: `51cda309555ea37c5d54e4b610870a547c0cd0e7325978d30de5757054a7c20b`

## Production resolution sequence

The deterministic order was `AUTH`, `EDGE`, `KONG`, `MAILPIT`, `PG_META`, `POSTGRES`, `REALTIME`, `REST`, `STORAGE`, `STUDIO`.

### AUTH

- source reference: `supabase/gotrue:v2.195.0`
- registry: `registry-1.docker.io`
- logical attempts: one
- top-level manifest: reached and validated sufficiently for exact platform selection; media type and digest were not retained in the bounded failure result
- required platform: `linux/arm64/v8`
- result: `REGISTRY_PLATFORM_MISSING`
- child manifest: not requested
- config metadata: not requested
- safe Config projection: not reached
- classification: `UNRESOLVED`

The resolver found no exact descriptor satisfying the frozen `linux/arm64/v8` selector. It failed closed. No fallback architecture, variant, tag, or registry was attempted.

### Remaining reachable roles

The following roles are `UNRESOLVED` because the required stop-on-first-failure policy prevented their logical attempts:

| Role | Frozen source reference | Outcome |
|---|---|---|
| EDGE | `supabase/edge-runtime:v1.74.3` | not attempted after AUTH stop |
| KONG | `library/kong:2.8.1` | not attempted after AUTH stop |
| MAILPIT | `axllent/mailpit:v1.30.2` | not attempted after AUTH stop |
| PG_META | `supabase/postgres-meta:v0.98.0` | not attempted after AUTH stop |
| POSTGRES | `supabase/postgres:17.6.1.159` | not attempted after AUTH stop |
| REALTIME | `supabase/realtime:v2.129.0` | not attempted after AUTH stop |
| REST | `postgrest/postgrest:v16.1` | not attempted after AUTH stop |
| STORAGE | `supabase/storage-api:v1.69.11` | not attempted after AUTH stop |
| STUDIO | `supabase/studio:2026.08.17-sha-0c1da8f` | not attempted after AUTH stop |

No retry, tag fallback, registry fallback, or query for a remaining role occurred.

## Unreachable image roles

- `ANALYTICS`: `NOT_REACHABLE`
- `IMGPROXY`: `NOT_REACHABLE`
- `POOLER`: `NOT_REACHABLE`
- `VECTOR`: `NOT_REACHABLE`

No registry query was made for any unreachable image role.

## Materialization outcome

### Image Approval Set

State: `NOT MATERIALIZED`

Exact blocker: all ten reachable roles must be approved, but `AUTH` failed exact platform selection and the other nine roles were not attempted after the mandatory stop. No partial approval artifact was accepted or written.

### Resource Expectation instance

State: `NOT MATERIALIZED`

Exact blocker: the complete immutable Image Approval Set precondition is absent. The existing producer preconditions were not weakened.

## Frozen runtime expectation summary

Expected persistent containers, without starting them:

- `AUTH`
- `EDGE`
- `KONG`
- `MAILPIT`
- `PG_META`
- `POSTGRES`
- `REALTIME`
- `REST`
- `STORAGE`
- `STUDIO`

Expected persistent volumes: `DB_VOLUME`, `EDGE_VOLUME`, `STORAGE_VOLUME`.

Expected network: `FOUNDATION_NETWORK`.

Expected transient jobs: `AUTH_MIGRATION_JOB`, `REALTIME_BOOTSTRAP_JOB`, `STORAGE_MIGRATION_JOB`.

These remain profile expectations only; no production Resource Expectation instance was generated.

## Deterministic validation

- focused registry/approval/expectation tests: `177/177` passed;
- full Foundation tests: `538/538` passed;
- application tests: `309/309` passed;
- failures/skips: `0/0`;
- schema validation, JavaScript syntax, TypeScript, production build, and Git whitespace validation: passed.

## Remaining blocker and next gate

Remaining blocker: the frozen AUTH reference `supabase/gotrue:v2.195.0` has no exact `linux/arm64/v8` platform descriptor under the accepted resolver policy. Because the sequence stopped at AUTH, all other reachable roles remain unresolved.

Next-gate recommendation: `BLOCKED — ONE OR MORE REACHABLE IMAGE DIGESTS UNRESOLVED`.
