# Foundation durable reservation evidence v1

## Scope and checkpoint boundary

This tooling correction starts from `f2f1505a2a950a4270d6616b1196288e163f23f5` (parent `eac1d7a99a7804795988b6241c8f6f57c25ad750`). It is implemented only in a detached isolated worktree. The primary worktree's seven modified and two untracked Healthcheck/Resource Expectation files remain PROVISIONAL / NOT VALIDATED / NOT ADOPTED and are not included.

The tooling commit must precede real reservation creation. Its exact commit ID is read from the clean isolated worktree and persisted in the durable manifest. This document does not itself claim that a production reservation has been created: the subsequent private witnesses and gate report establish that result. There is no second commit or amendment to add runtime output.

Migrations 001–009 are unchanged. Migration 009 remains SHA-256 `919b093f414219c5591f4d7722235e6d489ee5076d2c4f5feedf86c12ca00bf8`.

## Historical disposition

`wwfnd-20260830t060320z-b10f6599de24` is CONTINUITY_LOST / HISTORICAL, never ACTIVE or fabricated ENDED authority. Its historical config fingerprint is `dd1b9e1cb48857d83983c89820daa3cde057b954eeca6d98cba7c9ffe09ad684`.

Forensic basis: the original filesystem/session artifacts were missing after the observed system reboot; exact config bytes were reproducible, but original session identity/continuity could not be established. This does not attribute a proven deletion command or actor. Reproducing bytes is not restoring original evidence.

The lost ID is rejected explicitly by production reservation tooling and is also present in its required durable history. History supports ACTIVE/ENDED attestations for deterministic tests, but this gate exposes no production end, resurrection, history-import, deletion, or repair operation.

## Storage and permissions

Ephemeral execution parent: `/private/tmp`. Ephemeral index: `/private/tmp/winwin-foundation-reservation-index-v1`. New execution roots keep the accepted random `winwin-fnd-spike.<8 lowercase hex>` contract.

For this macOS account, durable evidence root:

`/Users/chenyuting/Library/Application Support/WinWin/Foundation/evidence-v1`

Separate durable bootstrap/continuity receipt:

`/Users/chenyuting/Library/Application Support/WinWin/Foundation/evidence-v1.bootstrap`

The implementation derives this fixed suffix from the OS account home, not caller paths or environment destination overrides. Neither location is in Git or an OS temporary directory. WinWin/Foundation and evidence directories are verified owned by the current user, canonical, non-symlink, mode 0700. Evidence files are mode 0600. Existing content is never chmod-repaired or overwritten.

Each file is written exclusively to a fixed pending source, fsynced, and published using a create-new hard link; parent directories are fsynced. Both link names remain, each with link count two. Unknown, incomplete, symlinked, wrong-permission or extra-link evidence fails closed. Canonical JSON is UTF-8 with a final LF. `witness_sha256` is SHA-256 of canonical JSON plus LF with that field omitted. File-byte fingerprints are distinct from this payload fingerprint.

Five strict record families are defined by `tools/winwin/foundation/schemas/durable-evidence.schema.json`: HISTORY, MANIFEST, INTENT, ACTIVE, BASELINE. The manifest binds the historical checkpoint, tooling checkpoint, creation time, fixed ports, history fingerprint and twelve relevant tool/contract/schema/source hashes. The immutable intent links manifest/history and the new ID. ACTIVE binds the intent, accepted ephemeral record hash and original filesystem identity. BASELINE binds ACTIVE, new config/source hashes, byte length, bound-config-contract hash, effective profile fingerprints and session-local link evidence.

The receipt independently preserves the manifest and each intent/ACTIVE/BASELINE record. Readers require exact agreement. A missing root cannot be reinitialized while its receipt survives; deleting only an attempt or baseline cannot silently roll state back. This is local evidence integrity and loss detection, not a signature against a malicious same-user rewrite or protection against destruction of all durable copies. Any such loss requires a separate forensic gate, not rerunning bootstrap.

## Acceptance and failure semantics

1. Check a clean isolated tooling checkpoint, migrations, the historical deterministic profile, the absent legacy index and current local TCP listeners for 59320–59329. This is metadata/listener safety, not Docker/runtime acceptance and not an OS port lock.
2. Explicitly bootstrap durable lost-history evidence once. A missing durable root is never interpreted by readers as first use.
3. Generate exactly one candidate with the accepted 35-byte ASCII contract: `wwfnd-YYYYMMDDtHHMMSSz-<12 lowercase random hex>` (six cryptographic random bytes). No alternate ID or retry.
4. Acquire the permanent create-new durable attempt/receipt mutex and publish PREPARING intent before ephemeral writes. It is an immutable intent, not a second ACTIVE lifecycle record.
5. Use the existing ephemeral reservation writer. Publish matching durable ACTIVE evidence only after ephemeral acceptance. Readers accept only matching durable and ephemeral state, original session/entry filesystem identity and valid evidence hashes. Either-side failure is incomplete and blocks config creation and further attempts.
6. Materialize config only from that accepted reservation. Bind only project ID and session-dependent paths in a copy of the frozen planned contract; keep the tracked contract, renderer, ports, flags and template unchanged. Source and target must be exact bytes, mode 0600, same device/inode and exactly two links.
7. Publish the config baseline witness and receipt; re-read all evidence and verify the profile. Baseline loss or replacement config inode fails closed.

With only the explicit lost-history bootstrap and no new intent, the reader may expose a historical-only non-authoritative view with its nonzero history count/hash. With a new ACTIVE witness but missing ephemeral index/session, it fails closed. It never recreates the index or config, marks a session ended, or interprets durable ACTIVE alone as current execution authority.

Hard-link and inode observations are session-local evidence. Durable fingerprints survive tmp cleanup; they do not make ephemeral hard links survive reboot, nor authorize reconstructing them as continuous state.

## Profile binding

Historical Effective Start Profile SHA-256 is `68fa1b17a24ef293af6dedeea831664f13eead394a3866e0df47416b1bc511ab`; deterministic regeneration must match it before production writes. The complete profile includes `project_id`, config SHA and bound-contract SHA, so its full hash necessarily changes for the new session.

The semantic comparison excludes only those three session-binding fields and the profile's own checksum. All remaining fields, including source binding, command/options, role decisions, image references, dependency reachability and project flags, must be identical. Config validation separately preserves the static port/flag policy. Any semantic change stops the gate; no profile normalization or registry work is permitted.

The historical Resource Expectation contract and production prerequisite entrypoint still contain the old production ID. They are not rebound or adopted by this gate. A later Healthcheck revalidation gate must explicitly reconcile those consumers with this durable tooling checkpoint and new identity. Existing image approvals cannot simply be represented as bound to the new full profile hash; no approval artifacts are generated here.

## Validation

Run reservation/config focused tests, the durability suite and the complete Foundation suite with Node's test runner. Durability coverage includes all fifteen requested cases plus missing durable root/attempt/baseline, bootstrap receipt consistency, filesystem identity reconstruction, privacy, schema conformance and profile semantic drift.

The one older profile test that implicitly required a live production reservation now uses deterministic frozen synthetic inputs. It no longer requires a lost or newly created production session merely to run unit tests. New tests exercise real reservation/config readers in isolated synthetic scopes. Existing production profile implementation and the provisional Healthcheck files are not imported from the primary worktree.

Application validation uses locally copied dependencies (no install/download). A bare test invocation initially cannot load three suites because the clean worktree contains no local frontend environment file. Supplying non-secret synthetic test values, while blocking network APIs, permits the 309 application tests to run. No real credentials or environment files are copied. TypeScript and production build are also checked.

Schema checks use strict runtime witness validation and an offline evaluator for exactly the JSON Schema keywords used by this bounded artifact, including positive/negative instances for all five families. It is not a general JSON Schema conformance implementation; no package was downloaded. Syntax and `git diff --check` are required before commit.

## Execution and stop boundary

Entry point: `node tools/winwin/foundation/establish-baseline.mjs` with exactly one explicit mode:

- `--check-profile`: deterministic, read-only historical profile verification.
- `--create-once`: separately authorized single creation attempt after the clean tooling commit.
- `--verify`: read-only verification, never recovery or rematerialization.

The create command must not be retried after any partial write. Preserve partial evidence for review. Production artifacts are limited to the reservation/session, config, and their durable witnesses/receipt. Config bytes never enter Git; evidence has no registry tokens, signed URLs, passwords, service keys or database credentials.

No network/registry, image resolution/acquisition, Image Approval Set, Resource Expectation instance, Docker/Supabase runtime, PostgreSQL, SQL/migrations, deployment or push is authorized or performed by this entrypoint. Environment Start remains unauthorized. Stop for review after the baseline report; do not continue provisional Healthcheck work.
