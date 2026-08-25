# WinWin Current Project Status

## Snapshot identity

- Snapshot date: 2026-08-25 (Asia/Taipei)
- Product: WinWin v2 — cross-role care collaboration Prototype
- Branch: `codex/v2-frontend-prototype`
- HEAD before this documentation checkpoint: `f87f21dc14d7ae2d4909d5474cf7829870464e33`
- Upstream at review time: `origin/codex/v2-frontend-prototype`, ahead 0 / behind 0
- Working tree at review start: clean
- v1 `main` baseline: `de522762bf272599b12b822ec096a0d0768f624a`
- Frontend MVP status: **Frozen for the currently approved Prototype scope**
- Production status: **NOT DEPLOYED as WinWin v2**

This snapshot describes evidence available in the Repository and the latest read-only Remote audit. It does not claim that previously recorded tests were rerun during this documentation session.

## Product status

WinWin v2 evolves from the retained 「備份心」v1 continuity and backup-planning baseline. The v2 Prototype centers collaboration on one older adult's case and separates identity, case relationship, permission, content visibility, questions, responsibility, action progress, and resolution.

The v1 Coverage Engine, Scenario, Backup, and Offline Handoff work remains on `main` as historical research and a regression baseline. WinWin v2 has not replaced `main`.

### Implemented Prototype capabilities

- primary and secondary identity registration concepts;
- identity-verification state display;
- invitation creation, privacy-preserving preview, acceptance, rejection, revocation, expiry, and resend simulation;
- multi-case workspace, safe search, and private in-memory tags;
- centralized case/content access selectors and guarded case routes;
- case home, timeline, care circle, questions, linked actions, reassignment, and traceable activity;
- professional care record creation, preview, family projection, publication, and append-only correction;
- responsive WinWin v2 shell and browser-validated MVP copy/navigation.

All v2 UI data remains fictional React in-memory state. Refresh resets the demonstration. The Prototype does not use v2 Remote persistence, and its frontend guards are not a Production security boundary.

## Frontend evidence matrix

Status vocabulary in this table is limited to `VERIFIED`, `IMPLEMENTED BUT NOT VERIFIED`, `PARTIAL`, and `NOT IMPLEMENTED`.

| Area | Status | Evidence |
|---|---|---|
| Identity and current-account semantics | `VERIFIED` | `8be4475`; identity/access integration regression tests in `app/tests/` |
| Invitation flow | `VERIFIED` | `e64cb31`, `8be4475`, `4ec30e4`; `v2InvitationWorkspace.test.ts` |
| Membership and Grant authorization simulation | `VERIFIED` | `8be4475`, `6b08df4`; centralized state/selectors and guard tests |
| Case access | `VERIFIED` | `PrototypeCaseAccessGuard.tsx`, `caseCollaborationSelectors.ts`, route/component tests |
| Content and record-level visibility | `VERIFIED` | `6b08df4`, `4ec30e4`; professional record and collaboration tests |
| Multi-case Workspace | `VERIFIED` | `e64cb31`; invitation/workspace tests and later correction commits |
| Case Home and orientation | `VERIFIED` | `6b08df4`, `4ec30e4`; Browser UX MVP Gate |
| Timeline and activity linkage | `VERIFIED` | `6b08df4`, `4ec30e4`; Question/Action linkage tests |
| Question | `VERIFIED` | Question remains independent from Action completion; collaboration tests |
| Action lifecycle | `VERIFIED` | pending → accepted → in progress → completed tests; linked Question remains independently resolved |
| Care Circle visibility | `VERIFIED` | centralized actor-aware projection in `caseCollaborationSelectors.ts` |
| Professional Records | `VERIFIED` | `951e9d2`, later authorization corrections; `v2ProfessionalRecord.test.ts` |
| Reassignment | `VERIFIED` | `8be4475`, `6b08df4`; only the losing assignee is affected and history remains |
| Browser UX | `VERIFIED` | commit `4ec30e4`; recorded Gate result `PASS — UX SUFFICIENT FOR MVP` |
| Responsive behavior | `VERIFIED` | latest recorded browser checks included desktop and mobile 390×844; not rerun in this session |
| Real Supabase Auth and v2 persistence | `NOT IMPLEMENTED` | Prototype state remains in memory; Remote has only Migration 001–006 |
| Production v2 authorization | `NOT IMPLEMENTED` | Migration 007 and 008 are not applied remotely |

## Latest known verification status

| Verification | Latest evidence | Result | Rerun this session |
|---|---|---:|---:|
| Full frontend Vitest | Browser UX Correction Gate at `4ec30e4` | 236/236 PASS | No |
| Relevant Browser UX tests | Browser UX Correction Gate at `4ec30e4` | 57/57 PASS | No |
| TypeScript check | Browser UX Correction Gate at `4ec30e4` | PASS | No |
| Production build | Browser UX Correction Gate at `4ec30e4` | PASS | No |
| Browser UX validation | Browser UX Correction Gate at `4ec30e4` | PASS | No |
| Migration 007 fresh isolated apply/harness | Repository reports and harness | 71/71 PASS | No |
| Migration 008 empty/legacy/rollback harness | commit `f87f21d`; current harness contract | 35/35 PASS | No |

`README.md` still states 214/214 and is stale relative to the later 236/236 Browser UX evidence. This snapshot records the discrepancy rather than rewriting README in the same checkpoint.

## Migration status summary

| Migration | Git | Pushed on current branch | Local verification | Remote |
|---|---:|---:|---|---|
| 001–006 | Committed | Yes | Included in fresh-chain verification | Applied |
| 007 Access Foundation | Committed | Yes | 71/71 PASS | **Not applied** |
| 008 Identity and Grant Alignment | Committed | Yes | 35/35 PASS; empty, legacy, rollback scenarios | **Not applied** |

Migration 007 fingerprint:

- `supabase/migrations/20260824220000_v2_access_foundation.sql`
- 2,043 lines; 77,811 bytes
- SHA-256 `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389`

Migration 008 verified fingerprint:

- `supabase/migrations/20260825090000_v2_identity_grant_alignment.sql`
- 563 lines; 22,954 bytes
- SHA-256 `e54ee8d571672243454b60e70cac86a6c909a2f19c05bf498492736072521e8d`

## Remote Supabase status

Latest read-only evidence in this session:

- project ref: `nisrzmtzdacpapqhgosi`;
- project name: `care-continuity-mvp`;
- region: `ap-southeast-1`;
- project health observed as active/healthy;
- migration history contains exactly Migration 001–006;
- ten v1 public tables are present;
- Migration 007 and Migration 008 are absent;
- no v2 Access Foundation tables are present;
- no Remote mutation or migration apply occurred.

Existing documentation identifies this target as Production, but the project name itself does not distinguish staging from Production. Action-time target confirmation remains required.

## Backup and recovery status

| Item | Status |
|---|---|
| Backup/restore design | `DESIGN APPROVED` |
| age installation and fictional self-test | `VERIFIED` |
| Recipient-key custody model | `DESIGN APPROVED` |
| Production recovery private key | `NOT CREATED` |
| Primary recovery copy | `NOT CREATED` |
| Secondary recovery copy | `NOT CREATED` |
| Encrypted Production backup | `NOT CREATED` |
| Backup manifest | `NOT CREATED` |
| Auth backup coverage | `NOT VERIFIED` |
| Storage bucket/object coverage | `NOT VERIFIED` |
| Fresh isolated restore rehearsal | `NOT STARTED` |
| Scheduled downloadable backup | `NOT AVAILABLE on the observed Free plan` |
| PITR | `NOT AVAILABLE / NOT ENABLED` |

The prior result `READY FOR ENCRYPTED MANUAL BACKUP CREATION` is a design gate, not evidence that a backup exists. The attempted creation gate stopped correctly with `RECOVERY KEY PREREQUISITE NOT MET`.

## Current blockers

1. Production recovery key and two separated recovery copies have not been created.
2. No encrypted Production logical backup or manifest exists.
3. Auth backup coverage has not been demonstrated.
4. Storage bucket and object aggregate coverage has not been demonstrated.
5. No fresh isolated restore rehearsal has passed.
6. Migration 007 Remote Apply has not been authorized.
7. Migration 008 depends on a successfully applied and verified Remote Migration 007 baseline.
8. Staging/Production naming ambiguity requires action-time target confirmation.

## Recommended next sequence

No step below is authorized by this document:

1. Create the approved age recipient recovery key outside Git and conversation history.
2. Preserve and verify primary and secondary recovery copies.
3. Separately authorize encrypted Production logical backup creation.
4. Verify Auth coverage and Storage aggregate/object coverage.
5. Complete a fresh isolated restore rehearsal.
6. Re-run Migration 007 Remote readiness and target checks.
7. Separately authorize and apply Migration 007.
8. Verify Remote Migration 007 schema, RLS, ACL, RPC, and v1 non-regression.
9. Re-audit Migration 008 against actual Remote v2 data.
10. Separately authorize Migration 008 Remote Apply.

## Known unknowns

- Exact current Production Auth user count: `NOT VERIFIED`.
- Exact Storage bucket/object counts: `NOT VERIFIED`.
- Exact v1 table `COUNT(*)` baseline: `NOT VERIFIED`; only metadata estimates were recorded.
- Production recovery RTO/RPO: `UNKNOWN`.
- Whether a legally and operationally appropriate hosted staging environment will be created: `UNKNOWN`.
- Whether v1 Coverage/Scenario will be integrated into v2: `PENDING`.
- Formal legal, privacy, professional identity, and institutional review: `NOT VERIFIED`.
