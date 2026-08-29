# WinWin Product Authorization / Domain Contract V1

Status: **Batch 1 design contract — ready for review; not a database or runtime authorization**  
Date: 2026-08-29  
Applies to: product implementation planning after workspace-audit reconciliation

## 1. Current truth and boundary

- Foundation Pre-start Helper Final Closure is `PASS`; Gate 5 is **ready for pre-authorization review, not passed**.
- Environment Start, Gate 6 work, Supabase access, SQL execution and Docker mutation are not authorized by this work package.
- Migrations 001–008 remain protected and unchanged.
- Migrations 007–008 are historical candidate/reference material. The future `winwin_*` Identity / Case / Governance foundation is the intended authoritative direction, but there is no approved bridge, supersession or cutover decision yet.
- Therefore this document and its TypeScript module define a product contract only. They do not claim persistence authority, RLS parity, schema readiness or production security.

Batch 1 separates four concepts that the prototype currently compresses into `DemoRole`:

```text
account session
  -> selected identity
  -> active case membership
  -> case relationship
  -> one complete, current authorization grant
  -> record/state-specific authorization decision
```

Membership is participation context, not access by itself. A role label is presentation, not proof. A decision must be supported by one complete grant path; capabilities and scopes from different grants must never be unioned into a synthetic permission.

## 2. Contract decisions

### A. Actor and access proof

An `ActorContext` identifies account, identity, membership, relationship and case. The server must derive and validate that tuple from authenticated state; the client must not choose arbitrary identifiers.

A valid proof requires all of the following on the same path:

1. actor identity owns the active membership;
2. membership, relationship and grant belong to the same case;
3. relationship belongs to the actor identity and is referenced by both membership and grant;
4. membership and grant are active at server time;
5. one grant contains the required purpose (when applicable), scope and capability;
6. record visibility and workflow-state prerequisites also pass.

Revoked, suspended, expired, future or cross-case elements break the path. The TypeScript contract returns the successful `grantId` so later API and audit code can retain the authorization proof.

### B. Viewing is not operating

`VIEW_RECORD` only permits viewing under the record's visibility policy. It does not imply answer, resolve, accept, start, complete, assign, reassign, invite or revoke capabilities.

Likewise, being able to see an Action does not make the actor its assignee. `ACCEPT`, `START` and `COMPLETE` require:

- an exact identity + membership match to the current responsibility cycle;
- the correct responsibility state;
- one complete grant containing the operation-specific capability and `DIRECT_PARTICIPANTS` scope.

There is no manager-role bypass or same-role substitution.

### C. Visibility semantics

| Policy | Identity prerequisite | Grant prerequisite |
|---|---|---|
| `AUTHOR_ONLY` | exact author identity and membership | `VIEW_RECORD` + `AUTHOR_ONLY` |
| `DIRECT_PARTICIPANTS` | exact author or listed participant identity and membership | `VIEW_RECORD` + `DIRECT_PARTICIPANTS` |
| `FAMILY_TEAM` | relationship classification is family | `VIEW_RECORD` + `FAMILY_TEAM` |
| `PROFESSIONAL_TEAM` | relationship classification is professional service | `VIEW_RECORD` + `PROFESSIONAL_TEAM` |
| `EXPLICIT_GRANT` | exact listed grantee identity and membership | `VIEW_RECORD` + `EXPLICIT_GRANT` |
| `CASE_SHARED` | valid actor path in the case | `VIEW_RECORD` + `CASE_SHARED` |

The pure module enforces exact identity boundaries for the first two policies, relationship classification for team policies, and the complete grant proof for all policies. This is intentionally not inferred from a UI role.

### D. Care Update integrity

Care Updates use one logical object regardless of whether the author is family or professional. Templates and validation may differ, but published authorship/integrity rules do not:

- draft content may be edited before publication;
- a published update is append-only;
- correction creates a new version referencing the prior version and records a reason;
- the original author identity, recorded server time and version history remain available;
- visibility is evaluated per version/record using identity-aware policy and a valid grant path.

This contract does not decide clinical signing, co-signing or regulatory retention rules.

### E. Question and Action are independent objects

A Question has its own source link, asker identity, answer events and resolution state. An Action may be linked to a Question but has its own lifecycle and responsibility cycles.

Completing an Action must not automatically resolve the linked Question. Answering a Question also must not complete an Action. Each mutation needs its own capability, state validation and audit event.

### F. Responsibility cycle

Assignment creates an `ASSIGNED` responsibility cycle; it is not acceptance. The core sequence is:

```text
ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED
```

Reassignment ends the current cycle with `REASSIGNED`, preserves it as history and creates a new `ASSIGNED` cycle for an exact identity + membership. Access revocation or service end must likewise end active responsibility with a reason and surface the Action for controlled reassignment; it must not silently transfer responsibility.

Invalid skips, edits to ended cycles and mutations by a same-role non-assignee are rejected.

### G. Typed invitation materialization

An invitation is a typed proposal containing recipient identity, case, relationship type/label, purpose, scopes, capabilities, its own acceptance window and the proposed grant validity. Acceptance materializes exactly one relationship, membership and grant from those terms. A current invitation may be accepted before a future service begins; that creates `WAITING_START` membership rather than early access.

Acceptance must not hard-code family privileges, professional privileges or manager capabilities based on a label. Professional subtypes remain data; they do not silently expand access. Declined, revoked, expired, identity-mismatched or not-yet-valid invitations materialize nothing.

### H. Since-last-view cursor

The MVP contract chooses a cursor per identity + membership + case over the actor's visible case-activity projection. It uses a server-issued monotonically increasing boundary (`sequence` plus server recorded time), not client wall-clock time.

The cursor only advances and does not establish permission. When access changes, visibility must be recalculated; the old cursor must not reveal newly unauthorized records. The persistence/index strategy awaits Batch 2.

## 3. Capability matrix

Every row below inherits the same actor prerequisite (server-derived exact identity/context), membership prerequisite (active and current for the case), relationship prerequisite (same identity/case and any policy-specific classification), and grant prerequisite (one current grant path containing the operation capability and applicable scope/purpose). The final columns add object/state/cycle requirements and minimum audit evidence.

| Object | Operation | Required capability | Additional prerequisite | Minimum audit event |
|---|---|---|---|---|
| Care Update | view | `VIEW_RECORD` | record visibility + one grant scope | access-denial telemetry policy TBD; no mandatory read audit in V1 |
| Care Update | create/publish | `CREATE_CARE_UPDATE` | case, purpose, allowed scope, server authorship/time | `RECORD_CREATED` |
| Care Update | correct | future explicit correction capability | original immutable; new version + reason | record correction event to be added before Batch 2 |
| Care Update | participate | operation-specific ask/action capability | exact listed participant or allowed record scope | audit the resulting Question/Action, not passive listing |
| Question | view | `VIEW_RECORD` | Question visibility + source visibility where required | no mandatory read audit in V1 |
| Question | ask | `ASK_QUESTION` | visible source/case | record creation event or dedicated question-created event |
| Question | answer | `ANSWER_QUESTION` | Question visible and open/answered | `QUESTION_ANSWERED` |
| Question | resolve | `RESOLVE_QUESTION` | explicit resolution authority | `QUESTION_RESOLVED` |
| Action | view | `VIEW_RECORD` | Action visibility; viewing does not establish responsibility | no mandatory read audit in V1 |
| Action | create | `CREATE_ACTION` | visible linked source when present | action-created event to be added before Batch 2 |
| Action | assign | `ASSIGN_ACTION` | target has eligible active membership | `ACTION_ASSIGNED` |
| Action | accept | `ACCEPT_ASSIGNED_ACTION` | exact current assignee; `ASSIGNED` | `ACTION_ACCEPTED` |
| Action | start | `START_ASSIGNED_ACTION` | exact current assignee; `ACCEPTED` | `ACTION_STARTED` |
| Action | complete | `COMPLETE_ASSIGNED_ACTION` | exact current assignee; `IN_PROGRESS` | `ACTION_COMPLETED` |
| Action | reassign | `REASSIGN_ACTION` | current cycle ends; new eligible exact assignee | `ACTION_REASSIGNED` |
| Access | invite | `INVITE_MEMBER` | typed terms within issuer authority | `GRANT_ISSUED` after acceptance/materialization |
| Access | accept invitation | invitation credential + recipient identity (not a pre-existing case grant) | pending/current typed invitation; exact recipient | invitation-accepted plus materialized grant evidence to be added before Batch 2 |
| Access | grant | future explicit grant-issuance capability | issuer may grant no more than approved authority | `GRANT_ISSUED` |
| Access | revoke | `REVOKE_ACCESS` | target grant/membership within issuer authority | `GRANT_REVOKED` and/or `ACCESS_REVOKED` |

The matrix names minimum evidence. Batch 2 design must add missing dedicated event enum values rather than overload unrelated events.

## 4. Minimum audit envelope

An audit event contains stable event id, case id, actor identity and membership, event type, subject type/id, server occurrence time and the authorizing grant id when applicable. It must not rely on mutable display names or role labels.

Sensitive payload snapshots, reason fields, correlation/idempotency keys, denied-operation logging and retention/export policy remain for security/privacy review. The minimum event envelope is not permission itself and must be written atomically with the mutation in a later authorized implementation.

## 5. Revocation behavior

Revocation is effective immediately at the server authorization boundary: the revoked path no longer supports record visibility or operations. Published/completed objects and their attribution remain; audit history is not deleted.

If the revoked identity holds an active responsibility cycle, the candidate V1 behavior is to end that cycle with `ACCESS_REVOKED`, preserve accepted/work history, place the Action into a visible needs-reassignment projection, and require a separately authorized actor to create the next cycle. No responsibility is transferred automatically. Exact notification/escalation timing and emergency continuity rules remain a product decision.

## 6. Server-authoritative boundary

Production must derive actor identity, membership/relationship context, server time, grant status/validity, capability, authorship attribution and accepted/completed transition authority on the backend. Client-supplied role, capability, timestamps or status are requests/display data, never authorization facts. The prototype fixed clock remains test scaffolding only.

## 7. Migration authority, cutover and no-bridge default

Before cutover, 007–008 remain the existing WinWin v2 historical/runtime candidate and the new Foundation is not yet runtime authority. Cutover requires approved additive schema, action-time legacy data inventory, an explicit mapping decision if rows exist, approved RLS/API policy, no dual-write ambiguity and authorized runtime tests.

If the inventory proves there is no WinWin v2 data that must survive, the default is **no bridge**. If rows exist, review a bounded one-way mapping; do not assume absence and do not dual-write. After an approved cutover there must be one authoritative write path, and the legacy path accepts no new authoritative writes unless a separately approved migration strategy explicitly says otherwise. This Batch neither inventories runtime data nor performs cutover.

## 8. Data minimization

Proposed fields are limited to care continuity, collaboration, authorization, responsibility, handoff and minimum audit traceability. This contract does not collect full medical records, continuous location, psychological/emotional profiles or unrelated sensitive data. Content payload schemas, retention and regulated clinical data require separate product/privacy/policy review.

## 9. Prototype compatibility and deprecation path

Current v2 screens remain unchanged in Batch 1. `DemoRole`, role-based participant lists, `MockRoleGrant`, `currentActorGrantPaths`, and selectors such as `currentActorCanViewScope` continue to drive the prototype only.

The integration strategy is:

1. keep existing fixtures and UI behavior stable;
2. add a fixture adapter that maps each demo person to a distinct identity, membership, relationship and typed grant;
3. migrate one vertical slice to the new contract and server-derived actor context;
4. compare UI decisions against server/RLS decisions;
5. deprecate role-based visibility and mutation selectors only after parity evidence exists.

Role-based `DIRECT_PARTICIPANTS`, role assignees, and manager blanket visibility are **deprecation candidates**, not current production authority. Batch 1 deliberately does not delete them because that would alter prototype behavior without an authorized vertical slice.

## 10. Product decisions required before Batch 2 is finalized

The following are explicitly unresolved and must not be encoded into SQL/RLS by assumption:

1. **PRODUCT DECISION REQUIRED — delegated responsibility:** may a delegate accept/start/complete, and what explicit delegation grant and audit chain is required?
2. **PRODUCT DECISION REQUIRED — reassignment authority:** which grant holders may reassign, and may the assigner/current assignee initiate it?
3. **PRODUCT DECISION REQUIRED — supervisor completion:** can a supervisor complete for an assignee, or only end/reassign a cycle?
4. **PRODUCT DECISION REQUIRED — Question resolution:** asker-only, explicit resolver capability, or a combination?
5. **PRODUCT DECISION REQUIRED — final capability/scope vocabulary:** review names and granularity before persistence becomes authoritative.
6. **PRODUCT DECISION REQUIRED — correction authorization:** original author only, explicit correction grant, or regulated professional workflow?
7. **PRODUCT DECISION REQUIRED — cursor projection:** confirm the proposed per-identity/membership/case visible-activity stream and behavior across membership replacement.
8. **PRODUCT DECISION REQUIRED — revocation cascade:** exact Action states, notification obligations and emergency continuity behavior after access loss.

## 11. Batch 2 entry conditions

Batch 2 may design an additive backend/RLS content foundation only after:

- this contract and the decisions above receive product/security review;
- migration 007–008 versus `winwin_*` bridge/supersession/cutover authority is explicitly decided;
- table/RLS/API invariants trace to the single-grant and record/state rules here;
- audit atomicity, server time and concurrency/idempotency strategy are specified;
- adding a repository migration file is separately authorized.

Schema/SQL design may proceed as a review artifact. Creating or executing a migration is outside this Batch 1 authorization, and runtime verification must wait for the applicable Foundation Gate authorization.

## 12. Review evidence

The pure TypeScript contract is in `app/src/v2/authorization/domainAuthorizationContract.ts`. Its tests prove:

- same role does not collapse distinct identities;
- membership alone is not access;
- grants are not aggregated;
- `AUTHOR_ONLY` and `DIRECT_PARTICIPANTS` use exact identity/membership;
- only the exact current assignee can mutate responsibility;
- lifecycle transitions are ordered;
- revoked grants deny;
- reassignment preserves history;
- Action completion leaves Question resolution unchanged;
- invitation acceptance materializes typed terms;
- read cursors use a server-issued monotonic boundary.

These are design/test evidence only. They do not replace server-side enforcement, database constraints, RLS, integration tests or Gate-controlled runtime evidence.
