# WINWIN Foundation OCI Platform Variant Reconciliation Closure

Status: `FOUNDATION OCI PLATFORM VARIANT RECONCILIATION PARTIAL`

This artifact closes the standards/runtime meaning of an omitted OCI ARM64 variant and records the single authorized AUTH metadata verification. It does not authorize full image resolution, image acquisition, Docker mutation, Supabase start, PostgreSQL, SQL, migrations, deployment, approval materialization, or push.

## Frozen baseline

- branch: `codex/foundation-spike-design-correction`
- starting checkpoint: `dcdcf8c2dfd755c8f7913fd6764de8b3feaf0de7`
- parent: `b2ef1cf9ef31cb30a35e6790cc48b8076e095d4d`
- starting worktree: clean
- migrations 001–009: unchanged
- migration 009 SHA-256: `919b093f414219c5591f4d7722235e6d489ee5076d2c4f5feedf86c12ca00bf8`
- Foundation session: `wwfnd-20260830t060320z-b10f6599de24`
- reservation: `ACTIVE=1`, `ENDED=0`
- config SHA-256: `dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684`
- config hard link at preflight: inode `24451523`, link count `2`
- Effective Start Profile: `PASS`
- Effective Start Profile SHA-256: `68fa1b17a24ef293af6dedeea831664f13eead394a3866e0df47416b1bc511ab`

## Original blocker and root cause

The previous resolver required byte-level equality among all three descriptor fields and therefore rejected `linux/arm64` when the requested runtime requirement was `linux/arm64/v8`. AUTH stopped at `REGISTRY_PLATFORM_MISSING`.

Root cause: `FOUNDATION MATCHER TOO STRICT`.

The requested runtime requirement and registry descriptor serialization are distinct. Representation inequality is not, by itself, runtime incompatibility.

## OCI semantics

The [OCI Image Index specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md) makes the descriptor `platform` object optional, requires `architecture` and `os` inside a present platform object, and makes `variant` optional. Its platform table identifies ARM64 variants as `v8`, `v8.1`, and later values. OCI does not state that omission universally means default, v8, or compatibility with every requested variant. Omission is therefore absence of serialized variant evidence under OCI alone, and consumer matching remains a deliberate implementation policy.

The [OCI Image Configuration specification](https://github.com/opencontainers/image-spec/blob/main/config.md) likewise makes config `variant` optional and states that an optional field set to null is equivalent to absence. Config `architecture` and `os` remain required.

OCI says the first matching manifest should be used when several match. Foundation deliberately adopts the stronger security invariant of exactly one executable compatible descriptor; it never chooses the first of an ambiguous set.

## Runtime, containerd, and Docker semantics

The authoritative [containerd platforms matcher](https://github.com/containerd/platforms/blob/main/platforms.go) normalizes both requested and candidate platforms before comparing OS, architecture, and variant. Its ARM documentation says common ARM64 v8 is represented without a variant. The corresponding [normalization source](https://github.com/containerd/platforms/blob/main/database.go) normalizes `aarch64` to `arm64` and normalizes explicit ARM64 `8`, `v8`, or `v8.0` to the empty canonical variant. Thus omitted ARM64 variant and ARM64 v8 are source-backed equivalents in this matcher.

Docker/Moby imports `github.com/containerd/platforms` and uses `platforms.Only` for platform-constrained image/config selection in its [containerd image service](https://github.com/moby/moby/blob/master/daemon/containerd/image_builder.go). Local read-only inspection reported Docker client/server `29.6.2`, server `linux/arm64`, and Docker info `linux/aarch64`. No Docker state was changed.

The compatibility decision is runtime-specific and narrow. OCI alone does not authorize a global missing-variant wildcard.

## Frozen platform compatibility policy

Requested platform remains exactly `linux/arm64/v8`.

An index descriptor is executable only when:

- its media type is one of the contract's OCI/Docker image-manifest media types;
- its platform has nonempty, non-`unknown` OS and architecture;
- it is not marked as an artifact or Docker attestation manifest; and
- any present variant is a string; descriptor null is not widened into omission.

Compatibility requires exact OS and architecture. For the single requested ARM64 v8 case, descriptor variant `v8` or omission is compatible. An explicit descriptor variant otherwise requires exact equality. Missing variants do not gain implicit compatibility for ARM32, AMD64, or any other architecture family.

Exactly one executable compatible descriptor is required. Zero produces `REGISTRY_PLATFORM_MISSING`; more than one produces `REGISTRY_PLATFORM_AMBIGUOUS`. Explicit v8 plus omitted ARM64 is ambiguous. If selection would depend on an omitted ARM64 candidate while a conflicting explicit ARM64 variant also exists, the result is ambiguous.

The same narrow rule is applied independently to immutable config metadata. Config OS and architecture must be exact; config variant must be exact v8 or absent/null. A direct single-platform manifest receives no trust from the tag and must pass this config check.

## Contract and implementation correction

The resolver contract and schema now freeze the policy above. The resolver now:

- separates compatibility from serialized equality;
- projects every index descriptor through a bounded safe representation;
- excludes non-runtime descriptors before matching;
- refuses zero or ambiguous matches;
- rejects conflicting explicit ARM64 variants when an omitted candidate would be used; and
- applies the same ARM64 v8 rule to config metadata, including direct manifests.

Registry authentication, protected-header, cookie, token, digest, redirect, request-bound, and no-layer behavior are unchanged.

Changed files:

- `tools/winwin/foundation/contracts/registry-digest-resolver-contract.json`
- `tools/winwin/foundation/schemas/registry-digest-resolver.schema.json`
- `tools/winwin/foundation/lib/registry-digest-resolver.mjs`
- `tools/winwin/foundation/tests/registry-digest-resolver.test.mjs`
- this closure artifact

Final tooling fingerprints before commit:

- resolver contract SHA-256: `92e2c442ac448f22088c52edd549fd0fda764aaec465941d7ad4e13c7a00c2d2`;
- resolver implementation SHA-256: `6e14496850ead07f5333f4cf84dc13fbe4816bda5f7f599e8c4788dbf1b79b81`;
- resolver schema SHA-256: `63e79fe1d86a8137a044b5f28d63251737494be6f2df8a732d067c0b6cb06c2e`.

## Deterministic tests

The focused suite covers all twenty required cases: explicit v8, omitted ARM64 variant, incompatible explicit variant, ARM32 isolation, wrong architecture/OS, zero/one/multiple candidates, explicit-plus-omitted ambiguity, attestation exclusion, missing OS/architecture, config OS/architecture/variant contradictions, omitted config variant, direct manifest verification, no-first-match behavior, and deterministic selection.

- resolver focused tests: `115/115` passed;
- full Foundation suite: `559/559` passed;
- application tests: `309/309` passed;
- JSON/schema contract checks, JavaScript syntax, TypeScript, production build, and Git whitespace validation: passed;
- failures/skips: `0/0`.

## Single-reference AUTH live verification

Exactly one bounded network flow was attempted for `AUTH` / `supabase/gotrue:v2.195.0` after the policy and deterministic tests passed. A preceding command failed locally before making any request because of an incorrect local property invocation; it was not a registry inspection.

The actual flow established:

- top-level index: reached, digest/media-type validated, and parsed;
- executable filtering and compatibility: exactly one candidate was selected by the then-current narrow ARM64 rule, with no explicit-variant conflict;
- selected descriptor semantics retained by control flow: `linux/arm64` with variant absent or null (the safe projection was not emitted before failure, so those two representations cannot be distinguished after the fact);
- child manifest: reached and digest/media-type validated;
- config request: made only for the exact child config descriptor;
- config body: not accepted because the registry returned a redirect;
- terminal result: `REGISTRY_UNEXPECTED_REDIRECT`;
- filesystem layers downloaded: no.

The complete safe descriptor projection and immutable digests were computed in memory during the flow but were not emitted before the fail-closed exception. The one-attempt/no-retry rule forbids a second registry inspection merely to recover those report fields. Consequently, descriptor ordinals, individual descriptor digests, top-level digest, selected child digest, config digest, descriptor omission-versus-null, and config OS/architecture/variant cannot be claimed in this closure.

After the live flow, final consistency review narrowed descriptor null to `EXCLUDE`, while config null remains equivalent to omission under the OCI config rule. No second network attempt was made. Therefore the live flow proves that the original exact-serialization matcher was too strict and that one absent-or-null ARM64 candidate reached its child, but it does not prove that the candidate satisfies the final omitted-only descriptor rule. It also does not complete the mandatory immutable config cross-check. This is a partial result, not an AUTH approval.

## Remaining blocker and next gate

AUTH remains `UNRESOLVED`, and the full ten-image resolution is `NOT READY`. Current blockers are: the unretained projection cannot establish descriptor omission rather than null under the final policy, and the config-blob redirect prevents the immutable config cross-check under the unchanged redirect-prohibition contract. Redirect semantics were frozen out of scope and were not weakened or reopened here.

Next gate: `BLOCKED — NEW REGISTRY ISSUE`.

No Image Approval Set or Resource Expectation instance was materialized. No other image role was queried. No image was acquired, and no runtime or database action occurred.
