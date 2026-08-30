# WINWIN Foundation Registry Config Redirect Reconciliation Closure

Status: `FOUNDATION REGISTRY CONFIG REDIRECT RECONCILIATION PASS`

This artifact closes the AUTH config-blob redirect blocker with one bounded metadata-only live flow. It does not authorize resolving another image, downloading a filesystem layer, materializing an Image Approval Set or Resource Expectation instance, acquiring an image, starting Docker or Supabase, using PostgreSQL or SQL, executing a migration, deploying, or pushing.

## Frozen baseline and session

- branch: `codex/foundation-spike-design-correction`
- starting HEAD: `3d0a519c8eca681f4cfbef4d1d27d2ced2a53ced`
- parent: `dcdcf8c2dfd755c8f7913fd6764de8b3feaf0de7`
- starting worktree: clean
- migrations 001–009: unchanged
- migration 009 SHA-256: `919b093f414219c5591f4d7722235e6d489ee5076d2c4f5feedf86c12ca00bf8`
- session: `wwfnd-20260830t060320z-b10f6599de24`
- reservation: `ACTIVE=1`, `ENDED=0`
- source and materialized config SHA-256: `dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684`
- config hard link: inode `24451523`, link count `2`, mode `0600`
- Effective Start Profile: `PASS`, SHA-256 `68fa1b17a24ef293af6dedeea831664f13eead394a3866e0df47416b1bc511ab`

The reservation, config, and hard link were read only and remain unchanged.

## Original blocker

The prior AUTH flow verified the top-level index and reached the selected child manifest, then stopped when the exact config descriptor request returned a redirect under the global `redirects=REJECT` rule. The terminal code was `REGISTRY_UNEXPECTED_REDIRECT`. The prior run did not retain sufficient presence-aware evidence to distinguish descriptor variant omission from explicit null and could not verify the immutable config bytes.

## Standards findings

The current [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md) defines `GET /v2/<name>/blobs/<digest>`, describes a successful response as `200`, and leaves verification that returned bytes match the requested digest to the client. It does not define a general redirect-following entitlement.

The deployed [CNCF Distribution Registry HTTP API V2](https://github.com/distribution/distribution/blob/main/docs/content/spec/api.md) explicitly documents a temporary redirect for blob retrieval: `307` for HTTP/1.1 clients and legacy `302` for clients below HTTP/1.1. The [Distribution configuration reference](https://github.com/distribution/distribution/blob/main/docs/content/about/configuration.md) records storage-backend redirection as enabled by default unless disabled. Foundation accepts only `307`; it rejects `301`, `302`, `303`, `308`, and every other 3xx. `307` preserves the original GET method, consistent with the redirect semantics summarized in [RFC 9205](https://www.rfc-editor.org/rfc/rfc9205.html).

The [OCI Image Manifest Specification](https://github.com/opencontainers/image-spec/blob/main/manifest.md) represents both `config` and `layers[]` as content descriptors. Registry transport therefore uses the same generic blob endpoint for both object classes; endpoint shape alone cannot authorize a fetch. Foundation derives authority exclusively from the already digest-verified child manifest's `config` field and rejects every `layers[*].digest` before network activity.

The [Docker Registry token authentication flow](https://github.com/distribution/distribution/blob/main/docs/content/spec/auth/token.md) binds the Bearer credential to the registry resource request. HTTP credentials are specific to their request target under [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html). Foundation does not rely on automatic client behavior: it creates a fresh redirect request and never copies Authorization, Cookie, Bearer state, registry credentials, or Docker credential state.

## Frozen redirect threat model and policy

The accepted policy is `CONFIG_BLOB_ONE_HOP_CAPABILITY_REDIRECT`, not generic blob redirect following.

- object: only the exact child manifest `config` descriptor;
- source: exact `registry-1.docker.io/v2/<approved-repository>/blobs/<config-digest>` response;
- provenance: Location must come from that authenticated approved-registry response;
- accepted status: exactly `307`;
- method: `GET`, preserved;
- hops: exactly zero or one; any target 3xx is terminal;
- target: exact HTTPS Location, byte-for-byte as received;
- host model: registry-authenticated one-hop capability URL, not a static CDN hostname allowlist;
- hostname guard: DNS hostname only, not an IP literal; credentials and fragments forbidden;
- port: omitted or explicit `443` only;
- Location size: at most 8192 bytes;
- explicit application request-header allowlist: `accept` only;
- Authorization, Cookie, registry Bearer token, registry/Docker credentials: always absent on redirected request;
- Location: memory-only and never reconstructed, joined, normalized for reuse, logged, or persisted;
- query values: never retained or reported;
- body: at most 2,097,152 bytes and exactly the descriptor's declared byte size;
- content authority: SHA-256 over exact raw response bytes must equal `childManifest.config.digest`;
- parsing: strict JSON with duplicate keys rejected;
- platform: config OS, architecture, and variant policy must independently match `linux/arm64/v8`;
- filesystem layers: structurally excluded and rejected before network activity.

The live CDN hostname is deliberately not frozen as an allowlist entry. The authenticated approved registry controls the one-hop delivery capability, while immutable digest equality—not the CDN—is the content authority. Credential stripping, the hop bound, HTTPS, URL non-rewriting, response bounds, and digest verification contain that delegated delivery mechanism.

## Variant presence policy

The [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md) makes descriptor `variant` optional but does not state that explicit null is equivalent to omission for an index descriptor. Foundation therefore retains the existing descriptor rule: `v8` or an omitted key can satisfy the narrow ARM64 v8 runtime rule; explicit null is excluded.

The [OCI Image Configuration Specification](https://github.com/opencontainers/image-spec/blob/main/config.md) states that optional config properties set to null are equivalent to absence. Config variant `v8`, omission, or null remains accepted under the independent ARM64 v8 cross-check. No platform-policy change was required in this gate.

Exactly one compatible executable descriptor remains mandatory. Zero is `REGISTRY_PLATFORM_MISSING`; more than one is `REGISTRY_PLATFORM_AMBIGUOUS`. Attestation, artifact, invalid-platform, and non-runtime descriptors remain excluded before matching.

## Contract and implementation correction

The dedicated `fetchImmutableConfigBlob(...)` path knows the exact config descriptor, requested digest, and all layer digests before its first request. It supports direct `200` or the single policy-conforming `307`, builds a fresh target request, validates raw size/digest, and returns bytes only after integrity verification. Manifest parsing retains the global redirect prohibition. The low-level transport has no automatic redirect mode.

Changed tooling:

- `tools/winwin/foundation/contracts/registry-digest-resolver-contract.json`
- `tools/winwin/foundation/schemas/registry-digest-resolver.schema.json`
- `tools/winwin/foundation/lib/registry-digest-resolver.mjs`
- `tools/winwin/foundation/tests/registry-digest-resolver.test.mjs`
- this closure artifact

Pre-commit tooling SHA-256 values:

- contract: `bbbf7eef722c4e2bdf3907afba45d32fee1e7dbc0d454efe5a41862d2269dbb6`
- resolver: `caffc36b56d99c82ef353935247f9fb4db9f44e04c6a3ae0e847a82a48c13dd1`
- schema: `308ee96ad4a9a63d8894c29e012faba01d7a7d6228b3daf335823a13623edb11`
- focused tests: `da734cc6384a82fff6357796b6c2203fb5ef05bb3953de4a6c75ec57590659bc`

Token parsing, token persistence, token scope, auth-endpoint Set-Cookie non-participation, protected-header multiplicity, and the filesystem-layer prohibition were not weakened.

## Deterministic validation

The focused suite covers direct success; approved redirect; HTTPS and port rules; missing, malformed, oversized, credential-bearing, and fragment-bearing Location values; unsupported status; second redirect and loop; explicit credential stripping; exact URL pass-through; no query-value retention; digest, size, JSON, duplicate-key, OS, architecture, and variant failures; omitted/null config behavior; pre-network layer-digest rejection; manifest redirect rejection; exact source endpoint; GET; one hop; presence-aware descriptor projection; and ambiguity.

- resolver/redirect/platform focused tests: `161/161` passed;
- full Foundation suite: `605/605` passed;
- failures/skips: `0/0` for those runs.

## Single AUTH live verification

One launcher invocation was rejected by the execution approval layer before process creation. A later local launcher invocation failed before calling `request` because it treated a resolver hash property as a function; its safe evidence showed an empty request-purpose list. Neither event contacted a registry and neither consumed the authorized live flow. The input was corrected and type-checked locally.

Exactly one actual bounded registry flow was then executed for `AUTH` / `supabase/gotrue:v2.195.0`, with no retry:

- request purposes: top-level manifest, anonymous token, authenticated top-level manifest, selected child manifest, exact config blob, one config redirect;
- top-level media type: `application/vnd.oci.image.index.v1+json`;
- top-level digest: `sha256:362659ca70eaa75ba05bbaf963caa84c1c5afe5e8fbf0777e17b830dd5f0f60a`;
- relevant executable ARM64 candidates: exactly one;
- selected candidate: ordinal `2`, `linux/arm64`, variant key absent, JSON type `ABSENT`, digest `sha256:4573d756d66c2e49feda74ab90af5f09c7917e27cbd7422c9166edb4be78cc7a`;
- selected descriptor variant: `OMITTED`;
- child media type: `application/vnd.oci.image.manifest.v1+json`;
- child digest: `sha256:4573d756d66c2e49feda74ab90af5f09c7917e27cbd7422c9166edb4be78cc7a`;
- config descriptor digest: `sha256:9635129bfe60c65b47e24a3804ecb24f2f7f4c5779a3c382bf7996070f7b8a48`;
- config descriptor size: `2337` bytes.

The exact config endpoint returned `307`. Its secret-safe projection was:

- source: `registry-1.docker.io`, repository `supabase/gotrue`;
- target scheme/host/explicit port: `https` / `production.cloudfront.docker.com` / absent;
- path structure: absolute, 9 nonempty segments, no trailing slash;
- query parameter names: `Expires`, `Signature`, `Key-Pair-Id`;
- query parameter count: `3`;
- complete Location byte length: `558`;
- complete Location SHA-256: `sha256:724697dd84be8fe39734bb39acd9683526e294731cf0d865c5b4656374e0a36b`;
- hop count: `1`;
- explicit application header names: `accept`;
- actual Node request header names: `accept`, `host`;
- Authorization sent: no;
- Cookie sent: no.

The complete Location and its signed query values existed only in process memory and were not persisted or reported.

The redirected target returned exactly 2337 bytes. SHA-256 over the raw bytes was `sha256:9635129bfe60c65b47e24a3804ecb24f2f7f4c5779a3c382bf7996070f7b8a48`, exactly equal to the child config descriptor. Strict JSON parsing passed. Config reported `linux/arm64`; its variant key was absent. The independent config compatibility check passed. No filesystem layer request occurred.

## Outcome and next gate

AUTH is `APPROVABLE`. This gate does not materialize its approval.

There is no remaining registry-contract blocker to a separately authorized full ten-image immutable digest resolution. Full-resolution readiness is `READY`, but the other nine images remain unqueried and no production Image Approval Set exists.

Next gate: `READY TO RE-RUN SEPARATELY AUTHORIZED FULL IMMUTABLE DIGEST RESOLUTION`.

Classification:

`A — FOUNDATION REGISTRY CONFIG REDIRECT RECONCILIATION PASS — CONFIG-BLOB REDIRECT SECURITY CONTRACT FROZEN — AUTH IMMUTABLE CONFIG + PLATFORM VERIFIED — NO CREDENTIAL PROPAGATION / NO FILESYSTEM LAYER RETRIEVAL — NO IMAGE ACQUISITION / ENVIRONMENT START — READY FOR SEPARATE FULL DIGEST RESOLUTION AUTHORIZATION`
