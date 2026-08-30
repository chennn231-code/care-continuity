# WinWin Foundation MAILPIT Image Config Healthcheck Reconciliation Closure

Status: `MAILPIT LIVE VERIFICATION PASS / MAILPIT INDIVIDUALLY APPROVABLE / RESOURCE EXPECTATION HEALTHCHECK BINDING GAP`

This checkpoint reconciles the `REGISTRY_CONFIG_HEALTHCHECK` blocker for `axllent/mailpit:v1.30.2`. It does not materialize an Image Approval Set or Resource Expectation, resolve any other image, acquire an image or filesystem layer, start Docker or Supabase, execute SQL or migrations, deploy, or push.

## A. Preflight

- branch: `codex/foundation-spike-design-correction`
- required HEAD: `eac1d7a99a7804795988b6241c8f6f57c25ad750`
- initial worktree: clean
- session: `wwfnd-20260830t060320z-b10f6599de24`, `ACTIVE=1`, `ENDED=0`
- config SHA-256: `dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684`
- config source and target remained the same inode `24451523`, link count `2`, mode `0600`
- migration 009 SHA-256: `919b093f414219c5591f4d7722235e6d489ee5076d2c4f5feedf86c12ca00bf8`
- migrations 001–009 were unchanged

## B. Standards findings

OCI image config treats `config.Healthcheck` as an optional compatibility-reserved field rather than defining its executable shape. The Docker image-spec extension defines `Test`, `Interval`, `Timeout`, `StartPeriod`, `StartInterval`, and `Retries`; `CMD` execs argv, `CMD-SHELL` uses the container default shell, `NONE` disables the probe, and zero timing/retry values inherit or use Engine defaults. Docker documents 30-second interval and timeout, zero start period, five-second start interval, and three retries as defaults. Positive duration values below one millisecond are rejected by current Docker/Moby validation.

Primary sources:

- [OCI image configuration](https://github.com/opencontainers/image-spec/blob/main/config.md)
- [Moby Docker image-spec HealthcheckConfig](https://github.com/moby/docker-image-spec/blob/main/specs-go/v1/image.go)
- [Dockerfile HEALTHCHECK reference](https://docs.docker.com/reference/dockerfile/#healthcheck)
- [Moby runtime health monitor](https://github.com/moby/moby/blob/master/daemon/health.go)
- [Compose healthcheck override semantics](https://github.com/compose-spec/compose-spec/blob/main/spec.md#healthcheck)

Moby merges Healthcheck fields individually at container creation. An explicit runtime `Test` replaces image `Test`; zero runtime `Interval`, `Timeout`, `StartPeriod`, `StartInterval`, or `Retries` inherits the corresponding non-zero image value.

## C. MAILPIT immutable config evidence

Exactly one metadata-only MAILPIT flow completed without retry:

- source: `axllent/mailpit:v1.30.2`
- top media type: `application/vnd.oci.image.index.v1+json`
- top digest: `sha256:37a38e48e9338cd7e89dfeb487f37b02ebfcd9cb23111bed2d345e79d37d6dd6`
- selected `linux/arm64/v8` child: `sha256:60ae914dde3ad75aaf153c65cdf4a4e76cb2b89abc3720f37340c2cc8271a2f7`
- config digest: `sha256:82e20cb567b0cc4f9551c59a1eb629705d55600ab6bdc1fe303598fc6689ab97`
- config size: `2665` bytes
- safe selected-config SHA-256: `50ea1187f217750bf6f74a4b722a832543cfc0d0db5a7fcf0c724f7664e08649`
- safe source-record SHA-256: `d7615c7485edd7523a597c5cbaa2dde2b033add700ba19afdc7be5afd53ee312`
- one config-only 307 redirect went to `production.cloudfront.docker.com`; Authorization and Cookie were absent on the redirected request
- filesystem layers downloaded: `false`

The prior blocker was structural: the immutable config contains the supported Docker extension field `StartInterval`, which the old Config allowlist omitted.

## D. Healthcheck structural projection

- present/object valid: yes
- state: `EXECUTABLE`
- Test form: `CMD`
- argv elements after form marker: `2`
- canonical argv payload SHA-256: `c1d1f11300dc8eef37c6b0823445d06aa92956cb8b0a83d4a86d9a922bf60b36`
- canonical argv payload size: `21` bytes
- Interval: present, `15000000000` ns
- Timeout: absent
- StartPeriod: present, `10000000000` ns
- StartInterval: present, `1000000000` ns
- Retries: absent
- unknown keys: none
- Healthcheck projection SHA-256: `e5d544c155b705390dcde17b28c7c00283685b7e167c4dd92d046daee1823466`

No command text, environment value, token, cookie, raw redirect URL, or query value is retained by the projection.

## E. Effective runtime behavior

Classification: `B. EXECUTABLE BUT OVERRIDDEN/DISABLED`.

The frozen Supabase CLI source at commit `18ae43a34a2257458197b62f74e2a97e2b5cf7f9` supplies a MAILPIT healthcheck rather than omitting or disabling one. Its abstract service spec uses exec-form `/mailpit readyz`, interval 10 seconds, timeout 2 seconds, retries 3, and start period 10 seconds. The reviewed Docker CLI adapter represents the command as `CMD-SHELL` because `docker create --health-cmd` has no exec-form flag.

Moby field merge makes the effective runtime Healthcheck:

- Test: runtime `CMD-SHELL`; payload SHA-256 `fbcbcb277c0369deaa481679867308f3e88ec37de9b95af4920653f3bc6e9d92`, 15 bytes
- Interval: runtime, `10000000000` ns
- Timeout: runtime, `2000000000` ns
- StartPeriod: runtime, `10000000000` ns
- StartInterval: image-inherited, `1000000000` ns
- Retries: runtime, `3`
- effective projection SHA-256: `6a4a8c2437efed16e22f2076189ca1bf0a16dd7c2d535c5b5d565d25b3277f15`

The image's executable `Test` cannot run because the runtime `Test` replaces it. One image timing field remains behaviorally relevant through field-level inheritance.

Pinned runtime sources:

- [MAILPIT service definition](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/commands/start/services/mailpit.service.ts)
- [Docker create Healthcheck adapter](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/db-bootstrap/docker-create-args.ts)

## F. Foundation policy decision

Selected: `MODEL 3 — RECORD BUT MARK RUNTIME-OVERRIDDEN`.

Foundation records the exact immutable image Healthcheck safe projection and binds it into `selected_config_sha256` and the Image Approval record. It does not generically allow Healthcheck commands. The runtime command replacement is independently source-proven, while the image-provided StartInterval remains explicitly accounted for in the effective merge. Unknown keys, forms, arities, invalid timing, and invalid retries remain fail-closed.

## G. Contract and implementation changes

- added a strict Healthcheck policy to the registry resolver contract and schema;
- added `StartInterval` with Docker nanosecond/minimum semantics;
- replaced raw Healthcheck retention with form/count/hash/byte-length/timing/retry projection;
- added pure Moby-compatible image/runtime field-merge classification;
- included config byte size and safe Healthcheck projection in resolution evidence;
- extended the Image Approval schema and producer so a future production approval records immutable image Healthcheck behavior;
- kept command text, environment values, tokens, cookies, and filesystem layers out of resolver output.

## H. Resource Expectation implications

The current Resource Expectation contract is not capable of binding `IMAGE HEALTHCHECK EXPECTATION` to MAILPIT effective runtime behavior. It carries only generic `health_policy: RUNNING_HEALTHY`; it has no fields for image Healthcheck projection hash, runtime override projection hash, per-field `IMAGE/RUNTIME/ENGINE_DEFAULT` source, command form/hash, timing/retry values, or candidate-side effective Healthcheck comparison.

This gate does not correct or materialize Resource Expectation. A separate gate must extend the model before environment start can rely on this reconciliation.

## I. Tests

- Healthcheck/resolver and approval/profile focused tests: `266/266 PASS`
- full Foundation suite: `627/627 PASS`
- broader application suite: `309/309 PASS`
- TypeScript: `PASS`
- production build: `PASS`
- schema/contract validation, JavaScript syntax, and `git diff --check`: `PASS`

The deterministic coverage includes absent, `NONE`, `CMD`, `CMD-SHELL`, malformed/empty/unknown Test, unknown keys, every supported timing field, retries, invalid values, projection changes, runtime override/disable/inheritance, metadata network non-execution, and the filesystem-layer guard.

## J. MAILPIT live verification

`PASS`

Exactly one MAILPIT-only metadata flow completed without retry. It fetched no filesystem layer and did not execute the Healthcheck.

## K. MAILPIT approval readiness

`APPROVABLE`

No production Image Approval Set was created.

## L. Full ten-image readiness

`NOT READY`

Six permitted roles remain unresolved, and this gate did not authorize querying them.

## M. Session integrity

Session `wwfnd-20260830t060320z-b10f6599de24` remains the sole active reservation (`ACTIVE=1`, `ENDED=0`). The materialized config remains byte-identical at SHA-256 `dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684` and retains the frozen hard-link identity and mode recorded in preflight. Migrations 001–009 remain unchanged.

## N. Explicit non-actions

No AUTH, EDGE, KONG, PG_META, POSTGRES, REALTIME, REST, STORAGE, STUDIO, or unreachable role was queried. No filesystem layer, image, Image Approval Set, Resource Expectation instance, Docker/Supabase runtime, PostgreSQL, SQL, migration execution, deployment, or push occurred.

## O. Remaining blockers

Resource Expectation cannot yet bind the frozen image projection, runtime override, effective merged Healthcheck, or per-field provenance. Separately, six permitted image roles remain unresolved; they cannot be queried under this gate.

## P. Next gate

`4. BLOCKED — RESOURCE EXPECTATION MODEL MUST BE CORRECTED FIRST`

## Q. Repository checkpoint

This closure is intended to be committed in the single authorized local commit `fix: reconcile foundation image healthcheck semantics`. No push is authorized.

## R. Classification

`B — FOUNDATION IMAGE HEALTHCHECK RECONCILIATION PARTIAL — HEALTHCHECK SEMANTICS UNDERSTOOD BUT APPROVAL BOUNDARY NOT CLOSED — NO IMAGE ACQUISITION / ENVIRONMENT START`

## Appendix — Command content review

The immutable hash and size match the independently frozen argv `[/mailpit, readyz]`. The pinned Mailpit v1.30.2 source implements `readyz` as an in-container HTTP readiness request to the configured Mailpit `/readyz` endpoint. It executes the image binary only, does not invoke a shell in image form, reads the specific Mailpit UI bind/webroot/TLS environment inputs, performs a container-local HTTP(S) probe, and does not contain an external hostname, package manager, downloader, command substitution, filesystem mutation, or state write in the inspected path. The Supabase adapter's runtime form invokes the container shell solely to run the same fixed command string.

Mailpit sources:

- [Healthcheck endpoint semantics](https://mailpit.axllent.org/docs/integration/healthcheck/)
- [Pinned readyz command](https://github.com/axllent/mailpit/blob/v1.30.2/cmd/readyz.go)
- [Pinned healthcheck client](https://github.com/axllent/mailpit/blob/v1.30.2/internal/healthcheck/healthcheck.go)
