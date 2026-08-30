# WINWIN Foundation Registry Protected-Header Reconciliation Closure

Status: `FOUNDATION REGISTRY PROTECTED-HEADER RECONCILIATION PARTIAL`

This closure records the single-reference research, bounded parser correction, deterministic tests, and single-reference live verification authorized by the protected-header reconciliation gate. It does not authorize the ten-image resolution pass, image acquisition, Docker mutation, Supabase start, PostgreSQL, SQL, migration execution, deployment, or push.

## Frozen baseline

- branch: `codex/foundation-spike-design-correction`
- starting checkpoint: `ea28e105e8aa524fc16e253146a22198c015d001`
- parent: `2a9a977c1fa42526a72d8042d153cdbb807b26fe`
- session: `wwfnd-20260830t060320z-b10f6599de24`
- reservation: `ACTIVE=1`, `ENDED=0`
- config SHA-256: `dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684`
- Effective Start Profile: frozen `PASS`
- profile SHA-256: `68fa1b17a24ef293af6dedeea831664f13eead394a3866e0df47416b1bc511ab`

## Selected reference and diagnostic requests

The sole selected image reference was `supabase/postgres:17.6.1.159`.

Two header-only runtime representation comparisons were made for each stage required to locate the defect. Both used Node `v24.18.0`, no credentials, `redirect=manual`/rejected, no response body consumption, and no persistence:

1. `GET https://registry-1.docker.io/v2/supabase/postgres/manifests/17.6.1.159`
2. `GET https://auth.docker.io/token?service=registry.docker.io&scope=repository%3Asupabase%2Fpostgres%3Apull`

The first request returned `401` with exactly one raw `WWW-Authenticate` field line:

`Bearer realm="https://auth.docker.io/token",service="registry.docker.io",scope="repository:supabase/postgres:pull"`

Raw count, Node `IncomingMessage.headers`, and Fetch `Headers` each represented that challenge as one value. It was not the source of `REGISTRY_HEADER_DUPLICATE`.

The anonymous token endpoint returned `200` with exactly one raw `Set-Cookie` field line. Because a cookie value is secret-capable and forbidden from persistence, its value was not logged. Its safe projection for the Node probe was:

- raw field name: `set-cookie`
- raw occurrence count: `1`
- cookie name: `__cf_bm`
- byte length: `294`
- value SHA-256: `8be038060cd2ab78f9f2364200edf777c4abc643eb90d77f2e2a369ea44c541d`
- attribute names: `httponly`, `secure`, `path`, `domain`, `expires`

Within that response there was only one value, so byte identity/conflict between occurrences is not applicable. No comma joining occurred in the raw response.

## Runtime representation comparison

| Layer | `Set-Cookie` representation |
|---|---|
| Raw `IncomingMessage.rawHeaders` | one separate field line |
| Node `IncomingMessage.headers` | array of length one |
| Fetch `Headers.getSetCookie()` | array of length one |
| Fetch `Headers.get('set-cookie')` | one string value for its separate request |
| Previous resolver | treated any array as evidence of multiple conflicting occurrences |
| Corrected resolver | uses `rawHeaders` only for multiplicity; emits only `PRESENT_REJECTED`, then fails `REGISTRY_COOKIE` |

The Node and Fetch observations were separate requests and their Cloudflare cookie values therefore differed; they are not evidence of conflicting values within one response. Each raw response contained one cookie field line.

## Root cause classification

**C — NODE/FETCH REPRESENTATION ARTIFACT**

Node intentionally exposes `set-cookie` through an array representation even when the raw HTTP response contains one field line. The previous resolver incorrectly treated the JavaScript container type as raw multiplicity. There was no raw server duplicate, no conflicting challenge, no resolver double insertion, and no evidence of proxy duplication.

## Standards and registry semantics

HTTP field names are case-insensitive, but field values are not generally interchangeable after arbitrary case or whitespace normalization. HTTP permits combining repeated field lines only when the field definition defines a compatible list syntax. `Set-Cookie` is not safely comma-combinable because its syntax and semantics require distinct field lines.

`WWW-Authenticate` carries one or more authentication challenges. Commas can separate authentication parameters or challenges and can occur inside quoted strings, so naïve comma splitting or joining is unsafe. Docker Registry v2 anonymous authentication is accepted only when a strictly parsed single Bearer challenge proves all of:

- realm: exact HTTPS `auth.docker.io/token`;
- service: exact `registry.docker.io`;
- scope: exact `repository:<requested-repository>:pull`;
- no unknown parameter, extra scheme, conflicting realm/service/scope, malformed quoted string, or ambiguous challenge.

Semantically equivalent duplicate Bearer field lines may collapse only after grammar-aware quoted-string parsing yields the same exact realm, service, and scope. The first occurrence is never selected without comparison.

## Frozen protected-header rules

Multiplicity authority is now exclusively Node `IncomingMessage.rawHeaders`. The normalized `headers` object is forbidden as multiplicity authority.

| Protected header | Rule |
|---|---|
| `content-type` | `SINGLETON_EXACT` |
| `docker-content-digest` | `BYTE_IDENTICAL_DUPLICATE_COLLAPSIBLE` |
| `www-authenticate` | `SEMANTICALLY_EQUIVALENT_CHALLENGE_COLLAPSIBLE` |
| `location` | `DUPLICATE_FORBIDDEN` |
| `set-cookie` | `MULTI_VALUE_ALLOWED_RESPONSE_REJECTED` |
| unknown protected policy | `DUPLICATE_FORBIDDEN` / contract rejection |

Header names are canonicalized case-insensitively. Digest values differing by one byte, case, or whitespace conflict. Already comma-coalesced digest strings are not split and fail digest syntax. Conflicting or malformed authentication challenges fail closed. Cookie values are never copied into the resolver response; presence becomes the fixed marker `PRESENT_REJECTED`, and response validation stops with `REGISTRY_COOKIE`.

Rejected alternatives include using the first value, generic duplicate allowance, comma joining, normalized-object array length as raw count, trimming/case-folding protected values, ignoring cookies, or preserving raw cookie values.

## Contract and implementation correction

- contract: `tools/winwin/foundation/contracts/registry-digest-resolver-contract.json`
- corrected contract SHA-256: `aea60081f49ba17bfd4e5b65dbf2b936990c8ccf0d4ea6a294988f120223b511`
- schema: `tools/winwin/foundation/schemas/registry-digest-resolver.schema.json`
- implementation: `tools/winwin/foundation/lib/registry-digest-resolver.mjs`
- implementation SHA-256 used for live verification: `dafb3f66e70ca1126b303088f5cb7ccee513674f039cae84d781b77158505596`

Redirect, credential, anonymous scope, token retention, platform, digest, timeout, body-size, retry, fallback, tag-substitution, config-metadata, and layer-download boundaries are unchanged.

## Deterministic validation

Focused resolver/profile tests passed `130/130`. The added cases cover singleton headers, exact and conflicting duplicates, case/whitespace differences, auth realm/service/scope conflict, semantic Bearer equivalence, quoted commas, multiple schemes, malformed challenge, digest duplicate equality/mismatch, header-name casing, already coalesced input, raw separate lines, no double-processing, cookie non-retention/rejection, and unknown policy rejection.

## Single-reference live verification

Result: `BLOCKED`

- registry: `registry-1.docker.io`
- repository: `supabase/postgres`
- tag: `17.6.1.159`
- anonymous challenge: reached and strictly validated
- anonymous token endpoint: reached
- previous false result `REGISTRY_HEADER_DUPLICATE`: resolved
- corrected result: `REGISTRY_COOKIE`
- authenticated manifest metadata: not reached
- filesystem layers: not requested or downloaded
- token: not accepted, logged, or persisted
- retry: none

This is the gate-required immediate stop on receipt of a cookie. The protected-header representation is no longer ambiguous, but the registry response remains incompatible with the frozen cookie policy.

## Remaining boundary

Full production digest-resolution readiness is `NOT READY`.

The only remaining blocker after this gate is the exact policy for receiving—but never storing or replaying—the anonymous token endpoint's `Set-Cookie`. That question requires a separate reviewed authorization/contract decision. This gate does not silently ignore the cookie and does not perform the ten-image resolution pass.

Next-gate recommendation: `BLOCKED — NEW RESOLVER ISSUE DISCOVERED`.
