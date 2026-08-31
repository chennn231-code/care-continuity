# Foundation Resource Expectation Healthcheck Binding Correction

Status: REVALIDATION PASS; provisional implementation adopted against the new durable baseline.
Scope: implementation/contract semantics only. No production artifact materialization or runtime authorization.
Integration parent: `c71aa65bf83142e3f4d730f14fd258c1f14720d5`.
The commit containing this document is the single local adoption checkpoint; no push.

## 1. Exact provisional transfer and isolation

Source: `/Users/chenyuting/Downloads/care-continuity-mvp-engine-implementation`.
Source HEAD: `f2f1505a2a950a4270d6616b1196288e163f23f5`; branch:
`codex/foundation-spike-design-correction`; preserved state: 7 modified / 2 untracked.
Integration: `/private/tmp/winwin-healthcheck-integration.hLRxNOaX/repo`, created at the authoritative parent.
Before semantic corrections, all nine transferred files were compared byte-for-byte
with the primary files. Every equality check passed. These are transfer-time
fingerprints, not fingerprints of the corrected implementation:

| Provisional source file | SHA-256 |
| --- | --- |
| `tools/winwin/foundation/contracts/resource-expectation-contract.json` | `b4eed04a218c2807afcde0ecb3e49428dad299ddd4de42ef7ecc62498e4d1e44` |
| `tools/winwin/foundation/lib/registry-digest-resolver.mjs` | `da242146f445940ae84170d89d54c63449e82d88c78c834a250fe490e9fcdae6` |
| `tools/winwin/foundation/lib/resource-image-prerequisites.mjs` | `8df5098c641f80cdb8a61f67c24a126492613a2981902d8e9ebe91fdb0b20787` |
| `tools/winwin/foundation/schemas/resource-expectation-instance.schema.json` | `61a1dd8eff95fed2702748ff615298c3e50576139e7ea0d67a5c1c6e9fc29ee8` |
| `tools/winwin/foundation/schemas/resource-expectation.schema.json` | `06d427e282ea613e90791124391e4536dd39cd37d19ab5fe981d5c5e6102019b` |
| `tools/winwin/foundation/tests/registry-digest-resolver.test.mjs` | `719260999e5bcf025fa81df8baa38119feff6f13b8d391092223d35025e330ac` |
| `tools/winwin/foundation/tests/resource-image-prerequisites.test.mjs` | `df2a7358912b8a18af181ef22c117506f13a7b2ec2f6e79665d7ec85bfacc840` |
| `tools/winwin/foundation/lib/effective-healthcheck.mjs` | `fcb10afa4acb91dbc9c17585e2783d2ed78a7bb81fa68c187feddf9fe37f6072` |
| `tools/winwin/foundation/tests/effective-healthcheck.test.mjs` | `b2ac467bccb4ec185b359559ce8fd86c8f85f1dcdf4efe3ebc0fc13d78aa1ac5` |

Primary status and all nine content fingerprints are checked against the pre-transfer
snapshot. The original clean c71aa65 worktree is not edited. No reset, restore, stash,
clean, or branch switch is performed in the primary worktree.

## 2. Previous defect and final terminology

Resource Expectation v1 separated lifecycle health_policy from images, but did not
bind image configuration, the actual runtime override, their field-level merge,
or candidate effective configuration. A global description such as
EXECUTABLE BUT OVERRIDDEN/DISABLED incorrectly suggests whole-object replacement.
MAILPIT contradicts that description: image StartInterval survives runtime Test override.

The adopted terms are IMAGE HEALTHCHECK, RUNTIME HEALTHCHECK OVERRIDE, and
EFFECTIVE HEALTHCHECK. Provenance is exactly IMAGE, RUNTIME, ENGINE_DEFAULT, DISABLED.
Healthcheck configuration is not observed health status or proof of a healthy runtime.
The historical MAILPIT closure remains immutable engineering evidence; this document
supersedes its global classification terminology without changing its frozen inputs.

## 3. Deterministic field-level merge

The pure implementation is generic, with no MAILPIT-specific branch. It is bound to
the previously reviewed Moby/Docker Engine 29.6.2 semantics and frozen evidence
`6adc11757a248e3179bd1c721cd66ded40d6f5c53581bf0b4d747b6f142ea5aa`.
No engine executable is invoked by this gate.

- Test: runtime CMD or CMD-SHELL overrides image Test; an absent runtime Test inherits
  an executable image Test. Explicit runtime NONE disables the effective Healthcheck.
  An executable runtime Test may enable an image-disabled Healthcheck.
- Interval, Timeout, StartPeriod, StartInterval and Retries: nonzero runtime value,
  otherwise nonzero image value, otherwise the version-bound engine default.
- Defaults: Interval 30s, Timeout 30s, StartPeriod 0s, StartInterval 5s, Retries 3.
- Absence and explicit zero remain distinct raw layer evidence and projection hashes.
  Zero is an inheritance/default sentinel, not a command to erase a nonzero image field.
- Runtime PARTIAL is supported only with no Test identity and at least one scalar field.
  Missing runtime evidence is rejected; it is never silently converted into ABSENT.
- Disabled behavior has enabled=false, null executable/timing/retry values, and DISABLED
  provenance for every effective field. Raw image/runtime inputs remain preserved.
- Explicit null, unknown fields, unsupported Test forms, inconsistent states, ambiguous
  partial forms, negative/non-integer/unsafe values and positive durations below 1ms fail.
  Effective Retries must be positive; only effective StartPeriod may be zero.
- Canonical projection bytes are UTF-8 JSON with recursively sorted object keys,
  preserved array order, and no trailing newline. SHA-256 is deterministic.
  Effective behavior has a separate hash from the provenance-bearing effective projection.

The constructor now rejects explicit null rather than treating it as an absent argument.
Effective candidate validation also enforces the timing/retry lower bounds.

## 4. Resource Expectation v2 and candidate boundary

Contract and instance schema_version are 2. Each image-backed CONTAINER or TRANSIENT_JOB
expectation binds the image projection, runtime projection, effective projection,
field provenance and exact candidate comparison requirements. VOLUME and NETWORK rows
must have null healthcheck_configuration. health_policy remains a separate lifecycle
requirement, including RUNNING_HEALTHY or TRANSIENT_EXIT_ZERO_REMOVED.

Producer validates projection integrity, approved role/source-reference coverage and
runtime-source binding. Missing runtime bindings fail closed. Instance validation
re-derives the effective projection rather than trusting supplied hashes/provenance.
The actual v2 contract canonical hash is bound in the instance independently from the
immutable baseline start-profile source fingerprint.

A future candidate collector must independently observe merged Config.Healthcheck and
engine identity, normalize the former under the reviewed engine defaults, and compare
all observable behavior fields plus the recomputed behavior hash. Engine mismatch,
payload/form/timing/retry/enabled mismatch, malformed evidence or unexpected fields fail.
Provenance remains an expectation-input property, not an observable Docker property.
The collector must not copy expected behavior to manufacture candidate evidence.
No collector/runtime observation is implemented or performed in this gate.
Existing ownership, relationship, port, cardinality and disposition checks remain intact.
A configuration comparison PASS does not establish RUNNING_HEALTHY or job completion.

## 5. MAILPIT frozen deterministic replay

Historical engineering input: `axllent/mailpit:v1.30.2`.
No registry request was made.

- Top manifest: `sha256:37a38e48e9338cd7e89dfeb487f37b02ebfcd9cb23111bed2d345e79d37d6dd6`.
- Selected child: `sha256:60ae914dde3ad75aaf153c65cdf4a4e76cb2b89abc3720f37340c2cc8271a2f7`.
- Config: `sha256:82e20cb567b0cc4f9551c59a1eb629705d55600ab6bdc1fe303598fc6689ab97`, 2665 bytes.
- Image projection, recomputed: `e5d544c155b705390dcde17b28c7c00283685b7e167c4dd92d046daee1823466`.
- Runtime projection, recomputed: `f9480f7b160406900e24c35dd001eedafebd99bf5ebb1f4386e0e0e8dffb4d9c`.
- Effective projection, recomputed: `84edb0dbfbda9673df4b11c8e7ab1959176e76b3baad82b600693d7a628c0dc5`.
- Effective behavior: `ccb170a084efe54b4b64cf5f6c06a2789ddcda29e7684e2e61f4cce33c7bb55f`.

| Field | Image | Runtime override | Effective | Provenance |
| --- | --- | --- | --- | --- |
| enabled | true | true | true | RUNTIME |
| Test | CMD | CMD-SHELL | CMD-SHELL | RUNTIME |
| Interval | 15s | 10s | 10s | RUNTIME |
| Timeout | absent | 2s | 2s | RUNTIME |
| StartPeriod | 10s | 10s | 10s | RUNTIME |
| StartInterval | 1s | absent | 1s | IMAGE |
| Retries | absent | 3 | 3 | RUNTIME |

Image Test: argv_element_count=2, payload_byte_length=21,
payload_sha256=`c1d1f11300dc8eef37c6b0823445d06aa92956cb8b0a83d4a86d9a922bf60b36`.
Runtime/effective Test: argv_element_count=null, payload_byte_length=15,
payload_sha256=`fbcbcb277c0369deaa481679867308f3e88ec37de9b95af4920653f3bc6e9d92`.
Runtime source remains the frozen Supabase CLI source commit
`18ae43a34a2257458197b62f74e2a97e2b5cf7f9`.

## 6. New durable baseline binding

Current session: `wwfnd-20260831t120908z-c0e3f4af1a3d`; ACTIVE=1, ENDED=0.

| Authority | SHA-256 |
| --- | --- |
| Config | `3447d63e5fe674227af31184550992985052d6af74223c9372ebd8394785765a` |
| Effective Profile | `565993c10026c175560c1f28dee391502e8d77ee08a5a3f36b5491f98c0c3193` |
| Durable ACTIVE witness | `ff41152de6a9ced15b9214084e5b168cc4ea5fe5b473824872c4eb2f1cf96f66` |
| Durable baseline witness | `8899dedbb6d399214ce3af55d7dbdbe73cfd8be09975b97757a9c4fe8f170cf5` |
| Bound config contract | `fcff2784d912b2ab8f82fa4678d81116249d3b043b2465f057093f3ee29a9ca0` |
| Frozen v1 start-profile resource source | `1f5cdeaaca979a148585b02b940912e0c373f8906b4b21fb8bd9572a008a34d2` |

Old session `wwfnd-20260830t060320z-b10f6599de24` is
CONTINUITY_LOST / HISTORICAL. Its continuity is not restored. Historical profile replay
exists only for semantic source comparison; production-facing read/bind/produce/prepare
paths reject that session. Synthetic non-current test instances carry an explicit null
baseline binding and cannot pass current-production binding validation.

The six-field foundation_baseline_binding is required in the adopted contract and
current production instance schema/validator. Config/profile hash labels alone are not
accepted: the profile content hash is recomputed and the current durable evidence is
read again at production-facing boundaries.

Directly applying the provisional patch initially produced DURABLE_TOOL_DRIFT, because
the accepted manifest intentionally pins the old reader's source hashes. The correction
does NOT relax that invariant or rewrite any witness. current-baseline.mjs verifies the
clean c71aa65 reader checkout and all 12 provenance files against immutable Git bytes
BEFORE executing only its read-only establish-baseline.mjs --verify mode. The frozen
reader validates the durable manifest/history/ACTIVE/baseline chain, ephemeral reservation,
cardinality and config. Additional checks pin both accepted witnesses and source/target
bytes and filesystem identity.

Reader code location: `/private/tmp/winwin-foundation-durable-worktree.9cwcxsBG/repo`.
This is an explicit local code dependency, NOT evidence authority by path presence.
If it is missing/dirty/moved or its checkpoint/source differs, verification fails closed;
there is no automatic repair, checkout recreation or evidence reconstruction.
Durable authority resides under
`/Users/chenyuting/Library/Application Support/WinWin/Foundation/evidence-v1`
with its bootstrap marker; /private/tmp by itself never proves continuity.

The accepted profile is not reissued under a new digest. assertStartModelUnchanged
compares every baseline start-model field against c71aa65, permitting only the v2
Healthcheck extension and current identity binding; it retains the frozen source hash
for that unchanged profile. Unrelated reachability/port/source changes fail.
The v2 instance separately hashes the actual extended contract. establish-baseline.mjs's
historical comparison helper follows this same source-provenance split; creation authority
and durable storage code are unchanged. No creation mode was invoked.

The former CONFIG_RESERVATION_CARDINALITY failure is resolved by consuming the actual
new durable reservation, never by permitting ACTIVE=0 or accepting an old session.
Missing ephemeral state under durable ACTIVE still fails DURABLE_EPHEMERAL_MISSING.

## 7. Validation and preservation

Final deterministic validation:

| Check | Result |
| --- | --- |
| Healthcheck focused | 52 PASS |
| Resource Expectation focused, including bounded schema instances | 98 PASS |
| New durable-baseline binding focused | 17 PASS |
| Reservation / configuration / durability focused | 97 PASS |
| Full Foundation suite | 737 PASS; 0 fail, 0 skipped |
| App suite | 309 PASS across 23 files; offline synthetic Supabase configuration |
| JavaScript syntax | 21 modules PASS |
| Foundation JSON parse | 14 artifacts PASS |
| TypeScript | PASS |
| Production build | PASS; local ignored output only, no deployment |
| git diff --check | PASS |

Schema checks use a bounded local evaluator for the keywords used by the two Resource
Expectation schemas, positive contract/synthetic instance fixtures and negative binding/
applicability/unknown-field fixtures, plus strict semantic validators. This is not a
claim of a general-purpose JSON Schema implementation or external meta-schema validation.
No schema/network dependency was installed. The broader app tests ran with the existing
offline network guard, synthetic-only URL/key, and copied local ignored dependencies.

Initial intermediate failure: DURABLE_TOOL_DRIFT, fixed through the frozen read-only
bridge. Final validation has no failures or skips. The missing-state test deletes only
its generated synthetic harness index and cleans up only that harness, never real evidence.

Original evidence snapshot covers 39 entries across reservation index, current session,
durable store and bootstrap. Compare file SHA-256 and mode/inode/link-count metadata
before and after; compare primary porcelain status and all nine provisional file hashes.
Current config source and target remain 436 bytes, mode 0600, device 16777229,
inode 24627683, link count 2.
Migrations 001–009 remain byte-identical; migration009:
`919b093f414219c5591f4d7722235e6d489ee5076d2c4f5feedf86c12ca00bf8`.
Application source, RLS/workflow/runtime and all other protected surfaces are unchanged.

## 8. Remaining blockers and strict stop

Image Approval Set: NOT MATERIALIZED.
Resource Expectation production instance: NOT MATERIALIZED.
Synthetic unit-test objects are not current-production artifacts.

Full ten-image metadata resolution against the new profile requires a separate gate.
Before later production Resource Expectation materialization, source-verified runtime
Healthcheck projections remain needed for POSTGRES, KONG, REST, PG_META, STUDIO, EDGE,
AUTH, REALTIME, STORAGE, REALTIME_BOOTSTRAP_JOB, STORAGE_MIGRATION_JOB and AUTH_MIGRATION_JOB.
Only MAILPIT's frozen production override is currently available. These are missing input
evidence, not an unsupported v2 representation; no values or absence claims are invented.
Later gates must also supply current approvals and independently collected candidate/
lifecycle evidence. Neither this model closure nor a deterministic test authorizes them.

Next gate: READY FOR SEPARATELY AUTHORIZED FULL TEN-IMAGE RESOLUTION.
Do not execute it in this gate.

No registry requests, image resolution, blob/layer retrieval, image acquisition,
Docker pull/build/load or runtime mutation, Supabase runtime, PostgreSQL, SQL,
migration execution, deployment or push. Environment Start remains NOT AUTHORIZED.

Classification: A — FOUNDATION HEALTHCHECK BINDING REVALIDATION PASS —
PROVISIONAL WORK ADOPTED AGAINST NEW DURABLE BASELINE —
RESOURCE EXPECTATION V2 HEALTHCHECK MODEL CLOSED —
NO IMAGE ACQUISITION / ENVIRONMENT START —
READY FOR SEPARATE FULL TEN-IMAGE RESOLUTION.
