# WinWin Release Readiness

## Decision summary

| Gate | Current status |
|---|---|
| Frontend Prototype MVP | `FROZEN / VERIFIED for Prototype scope` |
| Migration 007 local verification | `PASS — 71/71` |
| Migration 008 local verification | `PASS — 35/35` |
| Production backup key-handling design | `DESIGN APPROVED` |
| Production recovery key | `NOT CREATED` |
| Encrypted Production backup | `NOT CREATED` |
| Auth backup coverage | `NOT VERIFIED` |
| Storage coverage | `NOT VERIFIED` |
| Fresh isolated restore rehearsal | `NOT STARTED` |
| Migration 007 Remote Apply | `BLOCKED / NOT AUTHORIZED` |
| Migration 008 Remote Apply | `BLOCKED; depends on verified Remote 007` |
| WinWin v2 Production release | `BLOCKED` |

## Local verified state

### Frontend

- Latest known full Vitest result: 236/236 PASS at Browser UX Gate commit `4ec30e4`.
- TypeScript: PASS at the same Gate.
- Production build: PASS at the same Gate.
- Browser validation: `PASS — UX SUFFICIENT FOR MVP`.
- Rerun during this documentation session: No.

The committed frontend after `4ec30e4` changed only through database/documentation commits, so no later committed frontend diff is known. This is evidence continuity, not a new test run.

### Migration 007

- File: `supabase/migrations/20260824220000_v2_access_foundation.sql`
- SHA-256: `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389`
- Fresh isolated apply and repository harness: 71/71 PASS.
- Formal file is committed and pushed.
- Remote apply: No.

### Migration 008

- File: `supabase/migrations/20260825090000_v2_identity_grant_alignment.sql`
- SHA-256: `e54ee8d571672243454b60e70cac86a6c909a2f19c05bf498492736072521e8d`
- Empty DB, legacy DB, and rollback verification: 35/35 PASS.
- Verified checkpoint: `f87f21dc14d7ae2d4909d5474cf7829870464e33`.
- Remote apply: No.

## Remote actual state

Latest read-only audit:

- target ref: `nisrzmtzdacpapqhgosi`;
- name: `care-continuity-mvp`;
- region: `ap-southeast-1`;
- migration history: exactly 001–006;
- v1 public tables: 10;
- Migration 007 objects: absent;
- Migration 008 objects: absent;
- Remote mutation during readiness and preservation work: No.

The existing project is treated as Production in project documentation, but its name does not independently prove environment purpose. Confirm target identity again immediately before any operation.

## Migration inventory

| Timestamp/file | Purpose | Git | Local apply evidence | Remote |
|---|---|---|---|---|
| `20260823022521_remote_schema.sql` | v1 schema baseline | Committed/pushed | Included in fresh-chain runs | Applied |
| `20260823030000_ownership_and_integrity.sql` | v1 ownership/integrity | Committed/pushed | Included in fresh-chain runs | Applied |
| `20260823040000_auth_identity_lifecycle.sql` | Auth/profile lifecycle | Committed/pushed | Included in fresh-chain runs | Applied |
| `20260823050000_rls_and_access_control.sql` | v1 RLS/access | Committed/pushed | Included in fresh-chain runs | Applied |
| `20260823060000_backup_assignment_semantics.sql` | Backup semantics | Committed/pushed | Included in fresh-chain runs | Applied |
| `20260823070000_task_handoffs.sql` | Task handoff | Committed/pushed | Included in fresh-chain runs | Applied |
| `20260824220000_v2_access_foundation.sql` | v2 Access Foundation | Committed/pushed | 71/71 PASS | Not applied |
| `20260825090000_v2_identity_grant_alignment.sql` | Identity/Grant alignment | Committed/pushed | 35/35 PASS | Not applied |

No historical migration may be rewritten after Remote apply. Corrections must use a new timestamped additive migration.

## Recovery readiness

Approved design:

- manual encrypted logical artifact set;
- age recipient-key mode;
- primary and secondary separated recovery copies;
- encrypted artifact, manifest, and SHA-256 inventory;
- fresh isolated restore rehearsal before Migration 007 Apply.

Actual state:

- Production private identity: not created;
- recovery copies: not created;
- public Production recipient: not established;
- backup artifact: not created;
- manifest/checksums: not created;
- exact source counts: not captured;
- Auth coverage: not verified;
- Storage bucket/object coverage: not verified;
- restore rehearsal: not started;
- PITR: unavailable/not enabled on the observed Free plan.

The Encrypted Production Backup Creation Gate stopped with `RECOVERY KEY PREREQUISITE NOT MET`; no partial artifact or plaintext was created.

## Conditions before Migration 007 Remote Apply

All conditions are mandatory:

- [ ] Production recovery key created outside Git/chat/logs.
- [ ] Primary recovery copy verified.
- [ ] Secondary separated recovery copy verified.
- [ ] Exact target, migration history, and Git fingerprint confirmed.
- [ ] Encrypted logical backup artifacts created.
- [ ] Public/schema/data/migration-history coverage recorded.
- [ ] Auth coverage explicitly proven.
- [ ] Storage zero-object evidence or separate object backup completed.
- [ ] Manifest and encrypted-artifact checksums verified.
- [ ] Fresh isolated restore rehearsal passed.
- [ ] Source/restored exact counts matched.
- [ ] v1 smoke and Migration 007 harness passed on restored state.
- [ ] Recovery limitations and lack of PITR explicitly accepted.
- [ ] Separate action-time Migration 007 Apply authorization received.

## Required Migration 007 post-apply checks

1. Migration history contains 001–007 only.
2. Seven v2 tables, thirteen indexes, seventeen functions, and five policies exist.
3. RLS enabled/forced is 7/7.
4. Function owner, `prosecdef`, `search_path`, and ACL match the local contract.
5. Unexpected PUBLIC EXECUTE remains zero.
6. anon/authenticated direct writes remain zero.
7. v1 10-table/38-policy inventory and exact counts remain unchanged.
8. A/B/C isolation, confirmed email, invitation replay, last-manager concurrency, Auth-delete behavior, and append-only events pass.
9. Existing v1 API/frontend smoke passes.
10. Stop and preserve evidence before considering Migration 008.

## Conditions before Migration 008 Remote Apply

- Migration 007 successfully applied and verified remotely.
- Remote Migration 007 schema/functions/security match the committed baseline.
- Aggregate Remote v2 Actor, Membership, Grant, Declaration, and Invitation data audited.
- Every legacy Grant role/purpose combination has an exact template mapping.
- Identity backfill, nullable alignment, and constraints are compatible with actual Remote data.
- A separate encrypted backup/recovery point exists for the 008 release window.
- Separate action-time Migration 008 Apply authorization received.

## Current blockers

| ID | Blocker | Required resolution |
|---|---|---|
| RR-01 | Recovery key absent | Create and verify two separated copies outside Repository and chat |
| RR-02 | Encrypted Production backup absent | Complete separately authorized backup creation |
| RR-03 | Auth coverage unknown | Prove actual backup artifact coverage and restore behavior |
| RR-04 | Storage coverage unknown | Record aggregate counts and back up physical objects if non-zero |
| RR-05 | Restore unproven | Pass fresh isolated restore rehearsal |
| RR-06 | Migration 007 not authorized remotely | Complete recovery gates and action-time readiness review |
| RR-07 | Migration 008 prerequisite absent remotely | Apply and verify 007 before re-auditing 008 |
| RR-08 | Environment naming ambiguity | Manually confirm project identity immediately before action |

## Safe next sequence

```text
Recovery key creation and two-copy verification
→ Encrypted Production backup
→ Auth/Storage coverage confirmation
→ Fresh isolated restore rehearsal
→ Migration 007 readiness re-check
→ Separately authorized Migration 007 apply
→ Remote 007 verification and v1 regression
→ Migration 008 Remote data readiness re-audit
→ Separately authorized Migration 008 apply
```

This file authorizes none of those operations.
