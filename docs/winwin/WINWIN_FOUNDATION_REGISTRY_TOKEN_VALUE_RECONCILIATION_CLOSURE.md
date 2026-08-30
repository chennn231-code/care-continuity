# WINWIN Foundation Registry Token Value Reconciliation Closure

Status: `FOUNDATION REGISTRY TOKEN SEMANTICS RECONCILIATION PASS`

This artifact closes `REGISTRY_TOKEN_VALUE` for the bounded public-registry metadata resolver. It records research, the narrow token-response contract correction, deterministic tests, and the one authorized live verification for `supabase/postgres:17.6.1.159`. It does not authorize resolving another image, producing the full approval set, acquiring an image, starting Docker or Supabase, running PostgreSQL/SQL/migrations, deploying, or pushing.

## Frozen baseline

- branch: `codex/foundation-spike-design-correction`
- starting checkpoint: `a6245946ccbc26a187c0bbe5aef3cf855c6465b8`
- parent: `fbcd0153a82348e39981d99995ac3e5a35d00f2d`
- session: `wwfnd-20260830t060320z-b10f6599de24`
- reservation: `ACTIVE=1`, `ENDED=0`
- config SHA-256: `dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684`
- Effective Start Profile: frozen `PASS`
- profile SHA-256: `68fa1b17a24ef293af6dedeea831664f13eead394a3866e0df47416b1bc511ab`
- cookie non-participation checkpoint: `a6245946ccbc26a187c0bbe5aef3cf855c6465b8`

## Previous parser mismatch

The prior parser considered `token` and `access_token` candidates only when they were non-empty strings, then required exactly one candidate. It therefore:

- accepted either non-empty string alias alone;
- rejected simultaneous aliases even when byte-identical;
- ignored `expires_in`, `issued_at`, and all other fields;
- did not validate whitespace beyond non-emptiness;
- bounded the selected value at 16,384 characters;
- used the shared bounded `parseJSON`, which already rejects duplicate object keys at every depth before object construction.

Docker Hub returned both aliases as byte-identical strings. Both became candidates, so the prior exact-one condition raised `REGISTRY_TOKEN_VALUE`. The cookie was not involved.

## Authoritative protocol semantics

The CNCF Distribution Registry v2 token authentication specification is authoritative for this GET token exchange: <https://github.com/distribution/distribution/blob/main/docs/content/spec/auth/token.md>.

It defines `token` as the opaque Bearer credential, permits the OAuth-compatible name `access_token`, requires at least one, and permits both for older-client compatibility. When both appear they should be equivalent. It also defines optional `expires_in` and `issued_at` metadata and directs clients to place the opaque credential in the subsequent Bearer `Authorization` header.

The resolver policy is narrower than the protocol where the exact anonymous context permits it: both aliases are accepted only when byte-identical; differing aliases fail closed rather than making the protocol's undefined client choice.

## Final token-response policy

Decision: `TOKEN_AND_ACCESS_TOKEN_EQUIVALENT_ALLOWED`.

- `token` alone: accepted.
- `access_token` alone: accepted.
- both aliases: accepted only when byte-identical; `token` is the deterministic selected field.
- differing aliases: rejected.
- value: one opaque RFC 6750 `b64token` string; never decoded or interpreted.
- value length: 1 through 16,384 characters.
- whitespace and control characters: rejected by the credential syntax.
- duplicate JSON keys: rejected at every depth by the bounded parser before construction.
- optional metadata: only `expires_in` and `issued_at`.
- `expires_in`: safe integer of at least 60 seconds when present.
- `issued_at`: valid RFC 3339 UTC string when present.
- all other fields, including benign-looking or credential-like fields: rejected.
- raw body, alternate alias, and diagnostics: not returned in resolver output.
- credential: held in memory only and used only for the exact challenge/request-bound registry request.

The 16,384-character maximum preserves the prior bound, is more than six times the observed 2,702-character Docker Hub credential, and remains well below the separately bounded 65,536-byte token body.

## Implementation and fingerprints

- contract: `tools/winwin/foundation/contracts/registry-digest-resolver-contract.json`
- contract SHA-256: `a48a242b0e03d1c75bf98c8958b4983ea25043e0d2c4db7ec9a6a8c5a62428b8`
- schema: `tools/winwin/foundation/schemas/registry-digest-resolver.schema.json`
- schema SHA-256: `b2ee131c957685b7d97185fecf7992d629237fe6981225fbf5690526a715dc35`
- resolver: `tools/winwin/foundation/lib/registry-digest-resolver.mjs`
- resolver SHA-256: `4e02c25e546c140a2399744433f543ee6b193a8f976559972774abbbda61703a`

The dedicated `parseRegistryTokenResponse` performs exact-field, alias-equivalence, syntax, length, and metadata validation. Cookie non-participation, protected-header multiplicity, challenge parsing, repository scope binding, redirects, platform selection, digest checks, retry policy, and filesystem-layer prohibition are unchanged.

## Deterministic validation

- resolver tests: `94/94` passed;
- focused token/resolver/profile tests: `177/177` passed;
- full Foundation tests: `538/538` passed.

The 27 added token cases cover each authorized token alias shape, equivalent/conflicting aliases, types/null/empty/whitespace/size/control failures, missing and nested credentials, duplicate raw JSON keys, metadata validation, exact unknown-field rejection, absence of logging/persistence, memory-only handling, cookie independence, challenge/request scope binding, and the exact single-string parser result.

## Single-reference live verification

Selected reference: `supabase/postgres:17.6.1.159`

Result: `PASS`

One bounded flow observed:

- challenge valid: yes;
- token response status: `200`;
- token response Content-Type: `application/json`;
- top-level fields: `token`, `access_token`, `expires_in`, `issued_at`;
- field types: string, string, number, string respectively;
- aliases byte-identical: yes;
- selected field: `token`;
- selected length: `2702` characters;
- selected SHA-256: `d1c14ffb7f11204eee808ce4d258b2881bf0285edc0ac251e0181d21869c1b15`;
- `expires_in`: `300`;
- `issued_at`: present string;
- unknown fields: none;
- response cookie: one occurrence, non-participating, not stored or replayed;
- authenticated request `Authorization` present: yes;
- authenticated request `Cookie` present: no;
- authenticated manifest status: `200`;
- authenticated metadata: OCI image index reached with a valid digest header;
- token persisted or logged: no;
- child manifest, config blob, and filesystem layers: not requested;
- new issue: none.

The live command stopped immediately after the authenticated top-level manifest metadata response.

## Readiness and next gate

The token-semantics blocker is closed. Full immutable digest resolution is `READY` only for a separately authorized pass.

Next gate: `READY FOR SEPARATELY AUTHORIZED FULL IMMUTABLE DIGEST RESOLUTION PASS`.
