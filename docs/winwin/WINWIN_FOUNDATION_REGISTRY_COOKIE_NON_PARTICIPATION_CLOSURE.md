# WINWIN Foundation Registry Cookie Non-Participation Closure

Status: `FOUNDATION REGISTRY COOKIE NON-PARTICIPATION PARTIAL`

This artifact records the bounded response-cookie research, contract correction, deterministic tests, and single-reference live verification authorized by the cookie non-participation gate. It does not authorize the other nine images, a production approval set, Resource Expectation materialization, image acquisition, Docker mutation, Supabase start, PostgreSQL, SQL, migration execution, deployment, or push.

## Frozen baseline

- branch: `codex/foundation-spike-design-correction`
- starting checkpoint: `fbcd0153a82348e39981d99995ac3e5a35d00f2d`
- parent: `ea28e105e8aa524fc16e253146a22198c015d001`
- session: `wwfnd-20260830t060320z-b10f6599de24`
- reservation: `ACTIVE=1`, `ENDED=0`
- config SHA-256: `dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684`
- Effective Start Profile: frozen `PASS`
- profile SHA-256: `68fa1b17a24ef293af6dedeea831664f13eead394a3866e0df47416b1bc511ab`

## Research conclusion

`YES`: `Set-Cookie` can be received as non-participating response metadata under the exact anonymous Docker Registry token context without creating a cookie security dependency.

Receiving the field is not the same as trusting, storing, or replaying it. The resolver uses `node:https.request` directly. It creates each request with an explicit header object and `agent:false`; it does not instantiate a cookie jar or import a cookie implementation. Node's HTTP client exposes response `Set-Cookie` fields but does not implement browser cookie storage or automatic `Cookie` replay. A later request contains a cookie only if resolver code explicitly supplies a `Cookie` request header, which the transport now rejects.

The cookie value is unnecessary for the anonymous Bearer token, registry authorization, manifest/digest validation, platform selection, or approval output. No Cloudflare cookie semantics are accepted as authority.

## Receive, trust, store, and replay distinction

| Operation | Policy |
|---|---|
| Receive response field | allowed only in the exact token context |
| Structurally observe | presence and raw occurrence count only |
| Parse cookie value for trust | forbidden |
| Return value to caller | forbidden |
| Store in memory as cookie state | forbidden |
| Persist or log | forbidden |
| Replay as `Cookie` | forbidden |
| Affect token/digest/platform/approval | forbidden |

## Exact policy boundary

- host: `auth.docker.io`
- endpoint: exact `/token` with exact `service=registry.docker.io` and an approved `repository:<repository>:pull` scope
- request purpose: `ANONYMOUS_TOKEN`
- request credentials: none
- outbound `Cookie`: forbidden, case-insensitively
- cookie jar: forbidden
- redirect carrying a cookie: rejected
- response projection: `{present, raw_occurrence_count}` only
- value, attributes, expiry, and opaque identifiers: discarded before the transport response reaches token or approval logic
- higher-level visibility: none
- all other hosts, endpoints, purposes, manifest responses, and contexts: reject

The low-level parser performs only enough structural validation to prove that each field has a cookie-name and `=` delimiter. A zero-length value remains valid non-participating metadata. Malformed fields fail closed. Multiple fields are countable in the approved context but their values are never retained.

## Contract and implementation correction

- contract: `tools/winwin/foundation/contracts/registry-digest-resolver-contract.json`
- corrected contract SHA-256: `8bcdc7a64de40d8d0e6fb2fab9e54beed0737a5cdb25fe03959143d17fad5032`
- schema: `tools/winwin/foundation/schemas/registry-digest-resolver.schema.json`
- schema SHA-256: `ad807aa43e0d7824e37335bdbe9d02a82f4ab14f13f642b0962ab6aa2eb6d157`
- implementation: `tools/winwin/foundation/lib/registry-digest-resolver.mjs`
- implementation SHA-256 used for verification: `ccdfa23a01628d31cd255e4783ff6d3d72f08cdce452a3f20d29b56919bd2ed2`

The previous `MULTI_VALUE_ALLOWED_RESPONSE_REJECTED` rule is replaced by `RECEIVE_NON_PARTICIPATING_RESPONSE_ONLY` plus an explicit `response_cookie_policy`. The protected-header raw multiplicity model, Bearer parser, redirect, credentials, token persistence, retry, platform, digest, size, timeout, registry, tag, config-metadata, and filesystem-layer policies are unchanged.

## Deterministic tests

Focused cookie/resolver/profile validation passed `150/150`. Cookie-specific cases cover:

- no cookie and one/multiple approved token-endpoint cookies;
- cookies from manifest or unexpected hosts;
- outbound cookie, jar, replay, and redirect attempts;
- value exclusion from result, persistence, and logs;
- token success independent of cookie and token failure despite cookie;
- digest path isolation;
- case-insensitive field names;
- malformed and zero-length cookie values;
- endpoint drift;
- exact presence/count projection.

## Single-reference live verification

Selected reference: `supabase/postgres:17.6.1.159`

Result: `BLOCKED`

The live flow performed one bounded attempt:

1. the exact unauthenticated manifest request returned the expected `401`;
2. the exact Bearer challenge was validated;
3. `auth.docker.io/token` was reached without credentials or an outbound cookie;
4. the response cookie passed the exact non-participation boundary and was not returned as cookie state;
5. the flow then stopped at the independent existing token-field rule with `REGISTRY_TOKEN_VALUE` before an authenticated manifest request.

Safe live conclusions:

- challenge valid: yes
- token endpoint reached: yes
- response `Set-Cookie`: received under the accepted endpoint behavior
- cookie stored: no
- cookie replayed: no
- outbound `Cookie`: no
- Bearer `Authorization` sent to the manifest endpoint: no; token validation stopped first
- authenticated manifest metadata reached: no
- filesystem layers requested/downloaded: no
- token persisted or logged: no
- retry: none

The verification runner intentionally retained neither cookie nor token values. Because execution stopped before the subsequent Bearer request, end-to-end live non-participation is not fully verified in this gate.

## Remaining boundary

Cookie policy is deterministic and narrowly frozen, but full immutable digest-resolution readiness remains `NOT READY` due to the newly exposed `REGISTRY_TOKEN_VALUE` response-field issue. This gate does not change token semantics or retry the live attempt.

Next-gate recommendation: `BLOCKED — NEW REGISTRY ISSUE DISCOVERED`.
