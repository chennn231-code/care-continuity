# WinWin Technical Handoff

## Current handoff overlay — 2026-08-29

Current Repository baseline at the start of Product Batch 0 is `codex/foundation-spike-design-correction` at `8c361eb8786b1ce78d31d398b7b38e848f939404`, with a clean working tree and byte-identical Migration 001–008 fingerprints.

- Foundation Pre-start Helper Final Closure：PASS，294/294 synthetic tests。
- Gate 5：ready for pre-authorization review；Gate 5 itself has not passed。
- Gate 6A／6B／6C、Environment Start、Supabase／Docker mutation、SQL／Migration execution：not authorized。
- Earlier Docker diagnostic and intermediate helper blockers：historical evidence，**SUPERSEDED BY FOUNDATION FINAL CLOSURE CHECKPOINT** as current interpretation。
- Product Full Workspace Audit and Post-Foundation Reconciliation：complete。
- Product authority work：Batch 0＋1 authorized；Batch 2、repository migration file and runtime persistence are not authorized。
- Migration 007／008：existing v2 candidate references，not approved as future WinWin content authority。
- New `winwin_*` Foundation：future authoritative direction only；formal cutover has not occurred。

The original handoff below is a preserved snapshot of the v2 Prototype and Migration 007／008 evidence at `f87f21d`. It remains useful historical context but does not override this overlay.

## Purpose and boundaries

This handoff describes the committed WinWin v2 Prototype and database migration candidates as of branch `codex/v2-frontend-prototype` at baseline commit `f87f21dc14d7ae2d4909d5474cf7829870464e33`.

WinWin v2 is not a deployed Production system. Frontend behavior uses fictional in-memory state. Remote Supabase currently contains only Migration 001–006.

## Architecture map

### Frontend

- Application/router: `app/src/App.tsx`
- v2 shared shell: `app/src/v2/components/PrototypeShell.tsx`
- v2 case route guard: `app/src/v2/components/PrototypeCaseAccessGuard.tsx`
- root in-memory state/provider: `app/src/v2/state/PrototypeProvider.tsx`
- state transitions: `app/src/v2/state/prototypeState.ts`
- invitation/workspace selectors and transitions: `app/src/v2/state/invitationWorkspaceState.ts`
- case/content authorization projections: `app/src/v2/state/caseCollaborationSelectors.ts`
- professional record transitions: `app/src/v2/state/professionalRecordState.ts`
- domain-shaped Prototype types: `app/src/v2/types/prototype.ts`
- fictional data only: `app/src/v2/data/mockData.ts`
- v2 route definitions: `app/src/v2/data/prototypeRoutes.ts`
- tests: `app/tests/`

The frontend uses one `PrototypeState` graph. Identity, invitations, memberships, grants, cases, questions, actions, activity, and professional records must not be reintroduced as page-local competing truth.

### Database

- v1 schema and security baseline: Migration 001–006
- v2 Access Foundation: Migration 007
- v2 Identity and Grant Alignment candidate: Migration 008
- local verification orchestrator: `scripts/verification/verify-v2-access-foundation-local.sh`
- Migration 007 tests: `supabase/tests/v2-access-foundation/`
- Migration 008 tests: `supabase/tests/v2-identity-grant-alignment/`

The migrations are additive candidates in Git. Remote has not applied Migration 007 or 008.

## Core domain and authorization contracts

### Identity, Membership, and Grant

- Account identity describes who the account represents or declares.
- Identity verification does not grant case access.
- Case Membership describes an effective relationship to one case.
- Role Grant describes purpose, scope, capability, status, and validity for that Membership.
- One complete grant path must independently satisfy an operation.
- Capabilities, purpose, scope, or validity from multiple grants must never be stitched together.
- Case administration does not automatically grant visibility to all content.

### Case and content access

- Case access and content access are separate decisions.
- Frontend selectors derive the current actor and active context from shared state.
- All guarded case routes use the common case-access decision.
- Professional Record visibility applies an additional record-level projection.
- Denied routes must not reveal case name, content, hidden counts, or the specific reason for denial.
- Frontend checks demonstrate flow only; Production enforcement must come from database authorization and RLS.

### Invitation

- A link, QR representation, and code refer to one Invitation credential.
- Invitation possession does not grant access.
- Account login, confirmed-email binding, Invitation validity, Membership, and Grant creation remain separate checks.
- `PENDING_VERIFICATION` belongs to identity verification, not Invitation status.
- Acceptance before a future service start may establish a relationship but must not expose case content early.

### Question and Action

- A Question and an Action are distinct records and state machines.
- Action assignment does not equal acceptance.
- Acceptance does not equal work start.
- Action completion does not resolve the linked Question.
- An authorized actor resolves the same Question independently.
- Action retains an immutable link to its source Question.

### Reassignment

- Expiry or revocation affects only the assignee who lost effective access.
- An accepted or in-progress Action becomes `NEEDS_REASSIGNMENT`.
- The original Question, Action, assignee, and responsibility history remain traceable.
- No replacement assignee is implied until a new responsibility cycle is created and accepted.

### Professional Records

- Current Prototype template is a fictional nurse scenario, not a universal professional template.
- Observation is not a diagnosis.
- Published records cannot be overwritten.
- Corrections append a version and preserve original author, role, purpose, times, scope, and source relationship.
- Family projection shows only permitted information and must not expose hidden-item counts.
- Prototype records are not formal medical, nursing, legal, or institutional records.

## Migration sequence and invariants

| Order | File | Purpose |
|---:|---|---|
| 001 | `20260823022521_remote_schema.sql` | Original v1 schema baseline |
| 002 | `20260823030000_ownership_and_integrity.sql` | v1 owner/FK/integrity alignment |
| 003 | `20260823040000_auth_identity_lifecycle.sql` | Auth profile provisioning and lifecycle |
| 004 | `20260823050000_rls_and_access_control.sql` | v1 owner-rooted RLS and privileges |
| 005 | `20260823060000_backup_assignment_semantics.sql` | Backup-assignment invariants |
| 006 | `20260823070000_task_handoffs.sql` | v1 task handoff record and security |
| 007 | `20260824220000_v2_access_foundation.sql` | v2 Actor, Case, Invitation, Membership, Grant, events and RPC foundation |
| 008 | `20260825090000_v2_identity_grant_alignment.sql` | v2 Identity verification and Grant-template alignment |

Migration 007 local invariants recorded by the 71-test harness include:

- seven v2 tables with RLS enabled and forced;
- five SELECT policies;
- seventeen functions, eleven Definer and six Invoker;
- no unexpected PUBLIC EXECUTE;
- no anon/authenticated direct writes;
- fixed empty `search_path` for Definer functions;
- confirmed-email binding, invitation replay protection, manager concurrency, Auth-delete fail-closed behavior, append-only events, and A/B/C isolation.

Migration 008 local verification at `f87f21d` records 35/35 PASS across empty, legacy, and rollback scenarios. Its verified fingerprint is `e54ee8d571672243454b60e70cac86a6c909a2f19c05bf498492736072521e8d`.

## Verification evidence

- `docs/verification/V2_MIGRATION_007_LOCAL_DRY_RUN_REPORT.md`
- `docs/verification/V2_MIGRATION_007_REPOSITORY_HARNESS_REPORT.md`
- `docs/verification/V2_MIGRATION_007_RELEASE_CANDIDATE_VERIFICATION_REPORT.md`
- `docs/verification/V2_MIGRATION_007_REMOTE_READ_ONLY_PREFLIGHT_REPORT.md`
- `docs/verification/V2_MIGRATION_007_BACKUP_COMMAND_DRY_RUN_REVIEW.md`
- `docs/verification/V2_MIGRATION_007_BACKUP_ENCRYPTION_TOOL_READINESS_REPORT.md`
- `docs/architecture/V2_MIGRATION_007_MANUAL_BACKUP_RESTORE_REHEARSAL_DESIGN.md`

These files record evidence at their respective commits and dates. They are not proof that every test was rerun for this snapshot.

## Security boundaries

- Never treat a frontend guard as the Production authorization boundary.
- Never infer content visibility from case administration alone.
- Never accept actor, verified-email status, role, purpose, capability, or trusted scope from client claims.
- Definer functions must rederive actor identity from `auth.uid()`, use qualified objects, fixed safe `search_path`, strict ACL, row locks, and atomic transactions.
- `FORCE ROW LEVEL SECURITY` does not constrain an owner with `BYPASSRLS`; Definer input validation is part of the security boundary.
- Secrets, real invitation tokens, personal data, and care content must not enter Git or reports.

## Remote and recovery handoff

Remote read-only evidence currently shows Migration 001–006 only. Do not apply Migration 008 before Migration 007 has been applied and verified.

The approved recovery direction is age recipient-key encryption, but no Production key or backup exists. Before any Remote Apply:

1. create and separately preserve two recovery-key copies outside Git and chat;
2. create an encrypted logical artifact set under separate authorization;
3. prove Auth and Storage coverage;
4. restore into a new isolated target;
5. compare structure and exact counts;
6. run v1 smoke and the Migration 007 harness;
7. repeat target and migration-history confirmation.

If an applied migration later needs correction, create a new timestamped additive migration. Never edit an already-applied migration or repair history to conceal a failure.

## Important limitations and deferred work

- Remote v2 persistence and RLS: `NOT IMPLEMENTED`.
- Production professional identity verification: `NOT IMPLEMENTED`.
- Care Update, content revision, Question/Answer, Action responsibility, Cursor, and content Audit persistence: `PENDING future migration design`.
- Private workspace tags are in-memory preferences only.
- Formal legal, privacy, clinical, and institutional review: `NOT VERIFIED`.
- Recovery RTO/RPO and staging strategy: `UNKNOWN`.
