# WinWin Product Authorization Workflow Decisions V1

Status: **Product authorization and care-responsibility rules frozen for Implementation Authorization Review; implementation is not authorized**

Date: 2026-08-29

Baseline: `codex/foundation-spike-design-correction` at `231fa6b265124d10971297d765ec0df6553d6d50`

## A. Preflight

The authoritative preflight passed:

- branch was exactly `codex/foundation-spike-design-correction`;
- HEAD was exactly `231fa6b265124d10971297d765ec0df6553d6d50`;
- staged, unstaged and untracked sets were empty;
- no protected Foundation drift existed;
- no reset, restore, stash, clean, checkout, merge, rebase, pull, fetch or push was performed.

Migration 001–008 SHA-256 fingerprints at entry:

| Migration | SHA-256 |
|---|---|
| `20260823022521_remote_schema.sql` | `64d3cdd9047c7a716dd031a51d1e55cdeef6b2ab7bc4409887e4c864fa493361` |
| `20260823030000_ownership_and_integrity.sql` | `8b165af587111b1e961b55b5ec6836b9a5a3186a758198204c0aa05d8da3a7e6` |
| `20260823040000_auth_identity_lifecycle.sql` | `4618316d35a014ace64457fc6ace15a242032901cacd678af95e3f120e04e70b` |
| `20260823050000_rls_and_access_control.sql` | `7f8234ee1377d9b0a89fce5f07b6163d5da7dd2fbe17facb7a05d22b08f6bf40` |
| `20260823060000_backup_assignment_semantics.sql` | `c5b673b56adeb8a7440b4de5cc828aca7931c4a56e2eb117c33587df293d2209` |
| `20260823070000_task_handoffs.sql` | `fa10edfae8327e942e75238b771f8f2151bc87f14a9f5e44e33f9e7cf26c5f08` |
| `20260824220000_v2_access_foundation.sql` | `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389` |
| `20260825090000_v2_identity_grant_alignment.sql` | `e54ee8d571672243454b60e70cac86a6c909a2f19c05bf498492736072521e8d` |

## B. Authoritative input review

Inputs were reviewed in this precedence order:

1. `WINWIN_PRODUCT_AUTHORIZATION_DOMAIN_CONTRACT_V1.md`, SHA-256 `4f1e5c0e625b8fd4bd40e226809c7517d08277969ecc67fcb627defd06806338`;
2. `WINWIN_PRODUCT_BACKEND_RECORD_AUTHORIZATION_DESIGN_V1.md`, SHA-256 `a9f095f2cf64ad9cefeb80e80dae869b287c963d27365cfb3e4bfe50b1a29369`;
3. `WINWIN_MVP_VERTICAL_SLICE_IMPLEMENTATION_PLAN_V1.md`, SHA-256 `57e641f17e12a72d9ec2cbd1159ff70f28b12531be10ec0fe390ca49d39adf0a`.

No frozen authorization conflict exists. This closure keeps the normalized lifecycle instances, Logical Identity, single-Grant proof, independent Question/Action truth, immutable Care Update versions, derived responsibility/content heads, server authority, audit atomicity and fail-closed access rules.

The Batch 1 TypeScript names and the plan's provisional names remain design adapters rather than persistence authority. This closure finalizes product vocabulary without modifying those inputs.

### PLAN ADAPTER REQUIRED

The future implementation must:

- replace typed view candidates with canonical `RECORD_VIEW`;
- separate Grant target scope (`CASE` or `RECORD`) from record visibility policy (`AUTHOR_ONLY`, `DIRECT_PARTICIPANTS`, `CASE_SHARED`);
- add exact-Identity decline/relinquish domain operations and continuity-gap projection, while their full UI stays second stage;
- make current responsibility derived from the sole effective cycle, never a client or Action pointer;
- ensure prior assignee history does not remain an implicit participant/visibility path;
- keep Question, correction, reassignment and revocation-continuity UI outside the first slice while preserving their frozen domain rules.

## C. Reassignment authority

### Frozen MVP rule

An Identity may reassign an unfinished Action only when all of the following are true:

1. the server derives its current Runtime Actor Context;
2. one complete, current Single Grant Path for that Identity and Membership covers the target and contains `ACTION_REASSIGN`;
3. the Action is currently visible through a separately valid record-visibility decision;
4. the current responsibility facts and expected version are current;
5. the selected replacement is one concrete eligible Identity plus Membership lifecycle instance in the same Case.

The original assigner is eligible only if that Identity still satisfies the same rule. Original-assigner history grants no exception. Any other Identity satisfying the rule is equally eligible. Family, professional, manager, same-team, same-organization, Membership existence, Relationship label, current assignment or historical responsibility never grants reassignment authority.

The current assignee cannot choose a successor merely because it is the current assignee. It may reassign only through its own independently valid `ACTION_REASSIGN` path.

### Result

Reassignment ends the old effective Responsibility Cycle with reason `REASSIGNED`, preserves its assignee, assigner, states and server times, and creates one new `ASSIGNED` cycle for the replacement. The new assignee must Accept, Start and Complete in order. No Action `current_assignee_id` or `current_responsibility_cycle_id` is written as authority.

The operation is server-authoritative, idempotent and audited as `ACTION_REASSIGNED`. Full reassignment UI is Second Stage; this domain rule is frozen now because assignment/revocation safety depends on it.

## D. Decline / relinquish

“I cannot take/continue this responsibility” is distinct from “I choose the next caregiver.” Neither operation selects or creates a replacement.

### Before acceptance

The exact current assignee may decline an `ASSIGNED` cycle only with a complete current path containing `ACTION_DECLINE`. The server ends that cycle with reason `DECLINED`, records who declined and when, and derives `NEEDS_REASSIGNMENT`. The Action is not completed.

### Accepted but not started

The exact current assignee may relinquish an `ACCEPTED` cycle only with a complete current path containing `ACTION_RELINQUISH`. The server ends it with reason `RELINQUISHED`, preserves acceptance history, and derives `NEEDS_REASSIGNMENT`.

### Work already started

An `IN_PROGRESS` cycle cannot use simple decline. If the exact assignee can no longer continue, an `ACTION_RELINQUISH` operation records reason `CANNOT_CONTINUE_AFTER_START`, ends the cycle without completion, preserves the started history and creates the same continuity gap. Urgency/escalation and delivery notifications are not inferred.

All three outcomes require server state validation and audit. None grants `ACTION_REASSIGN`; none auto-selects a caregiver. Their domain semantics are MVP-frozen, while decline/relinquish UI is Second Stage and is not a first-slice prerequisite.

## E. Question resolution

Question and Action remain independent. A Question may be resolved by:

- the exact asker Identity, if it still has a complete current Single Grant Path containing `QUESTION_RESOLVE`; or
- another Identity with a complete current Single Grant Path containing `QUESTION_RESOLVE`.

Authorship identifies an eligible product subject but does not bypass current authorization or the operation capability. The Question must be visible and unresolved at server time. Resolution appends a server-ordered decision and audit; it does not overwrite the Question.

An answer does not resolve a Question. Action completion does not resolve a Question. Case Membership, family/professional/manager label or general record visibility does not grant resolution. Full Question UI and workflow are Second Stage, but this authority rule is frozen.

## F. Published Care Update correction

Published Care Update content cannot be edited, deleted or replaced destructively. A correction is an immutable successor version that points to the derived current lineage head and carries a bounded correction reason.

For MVP semantics, only the original author Identity may publish a correction, and only while it has:

- current valid Case access through one complete Single Grant Path;
- `CARE_UPDATE_CORRECT` on that same path;
- current visibility of the Care Update;
- the expected server-derived lineage head/ordinal.

Authorship alone never bypasses current authorization. Correction preserves the original version, original author and all prior timestamps; the successor records the correcting actor and server time. It is audited and receives Case activity order.

Third-party correction is deferred. If introduced later, it requires an explicitly approved product workflow, `CARE_UPDATE_CORRECT`, one complete path and the same append-only lineage. It can never rewrite original authorship. Correction UI is Second Stage.

## G. Final capability vocabulary

Capability names describe operations, never roles. Unknown capabilities deny. Each authorization decision uses capability facts from the same Grant instance that satisfies the required target scope; capabilities from multiple Grants are never combined.

Canonical names use object-first, operation-second form.

| Capability candidate | Decision | Canonical outcome / reason | First slice? |
|---|---|---|---|
| `CARE_UPDATE_VIEW` | MERGE | Merge into `RECORD_VIEW`; typed visibility remains a separate predicate | Yes, through `RECORD_VIEW` |
| `CARE_UPDATE_CREATE` | KEEP | Publish immutable Care Update version 1 | Yes |
| `CARE_UPDATE_CORRECT` | KEEP | Append correction successor; original-author rule applies | No, Second Stage UI |
| `ACTION_VIEW` | MERGE | Merge into `RECORD_VIEW` | Yes, through `RECORD_VIEW` |
| `ACTION_CREATE` | KEEP | Create an Action linked to a visible source when present | Yes |
| `ACTION_ASSIGN` | KEEP | Create the first exact-Identity Responsibility Cycle | Yes |
| `ACTION_ACCEPT` | KEEP | Exact current assignee accepts `ASSIGNED` | Yes |
| `ACTION_DECLINE` | KEEP | Exact current assignee declines before acceptance | No UI; domain frozen |
| `ACTION_START` | KEEP | Exact current assignee starts `ACCEPTED` | Yes |
| `ACTION_COMPLETE` | KEEP | Exact current assignee completes `IN_PROGRESS` | Yes |
| `ACTION_RELINQUISH` | KEEP | Exact assignee reports inability to continue after acceptance | No UI; domain frozen |
| `ACTION_REASSIGN` | KEEP | End old cycle and create a new exact-Identity cycle | No UI; domain frozen |
| `ACCESS_INVITE` | DEFER | Invitation workflow is not a first-slice dependency; name reserved for later closure | No |
| `ACCESS_GRANT` | DEFER | Direct grant/governance workflow is outside the slice | No |
| `ACCESS_REVOKE` | KEEP | Current access owner may revoke within separately validated issuer authority | No UI; continuity rule frozen |
| `QUESTION_VIEW` | MERGE | Merge into `RECORD_VIEW` | No, Question is Second Stage |
| `QUESTION_ASK` | DEFER | Question workflow is Second Stage | No |
| `QUESTION_ANSWER` | DEFER | Answer facts are Second Stage | No |
| `QUESTION_RESOLVE` | DEFER | Name and authority rule are frozen; implementation/UI are Second Stage | No |
| `RECORD_VIEW` | KEEP | One general read operation capability, always combined with current target scope and typed visibility | Yes |

`RECORD_VIEW` is necessary and is not a duplicate of visibility. The complete decision requires three distinct truths:

1. the Grant scope covers the target boundary;
2. the same Grant contains `RECORD_VIEW`;
3. the record's visibility policy admits the exact Identity+Membership.

Scope answers “where may this Grant operate?”, capability answers “which operation?”, and visibility answers “which record may this actor see?”. Removing any one would weaken a frozen boundary.

For a combined first-slice create-and-assign server operation, one Grant instance must contain both `ACTION_CREATE` and `ACTION_ASSIGN`; separate partial Grants cannot be stitched. Equivalent separately committed operations each require their own complete single-Grant proof and must not expose an unsafe partial result.

No `FAMILY_CAN_*`, `PROFESSIONAL_CAN_*`, `MANAGER_CAN_*` or `CAREGIVER_CAN_*` capability exists.

## H. Final scope vocabulary

Final MVP Grant target scopes are exactly `CASE` and `RECORD`.

| Scope candidate | Decision | Meaning | Example |
|---|---|---|---|
| `CASE` | KEEP | The Grant may perform its listed capability across the exact Case boundary, subject to purpose and object rules | `CARE_UPDATE_CREATE`, `ACTION_CREATE`, `ACTION_ASSIGN`, access governance within one Case |
| `RECORD` | KEEP | The Grant may perform its listed capability against an exact typed record in the Case, subject to visibility/state/responsibility | `RECORD_VIEW`, `CARE_UPDATE_CORRECT`, Action transitions, Question operations |
| `CARE_UPDATE` | MERGE | Redundant typed target scope; merge into `RECORD` | Care Update is selected by typed target reference and capability |
| `ACTION` | MERGE | Redundant typed target scope; merge into `RECORD` | Action is selected by typed target reference and capability |
| `ACCESS` | MERGE | Access governance remains bounded by the exact `CASE`; issuer/target rules narrow it | `ACCESS_REVOKE` within one Case |

Scope is not role, Relationship, visibility, audience, capability or responsibility. A typed target reference and operation capability provide object specificity. A `CASE` scope does not make every record visible and a `RECORD` scope does not identify which record is visible.

The existing Batch 1 union that names visibility policies as Grant scopes requires an adapter correction before implementation. This does not weaken the single-Grant invariant: one Grant must still carry the required target scope and capability, while the typed record separately carries its visibility policy.

## I. Family / Professional audience

The first vertical slice uses only:

- `AUTHOR_ONLY` for content visible only to the exact author while a current complete path still exists;
- `DIRECT_PARTICIPANTS` for exact server-controlled Identity+Membership designations;
- `CASE_SHARED` for records intentionally shared to current authorized Case participants.

`FAMILY_TEAM` and `PROFESSIONAL_TEAM` are DEFERRED. `EXPLICIT_GRANT` is also DEFERRED because the first slice does not require it. Unknown or unimplemented policies deny.

For the first Action, controlled direct participants are its creator/assigner A and its current assignee B. These are concrete Identity+Membership references, never roles. Reassignment does not keep the prior assignee as a current participant merely because of historical responsibility.

If team audiences are later introduced, they are visibility grouping only and still require a current Membership, an approved Relationship predicate, one complete matching Grant path and the record policy. They confer no create, correct, assign, reassign, resolve, revoke or other operation.

## J. Prior-assignee visibility

Historical responsibility is permanently preserved as attribution, not authorization.

After reassignment, a prior assignee loses current Action visibility derived from being the current assignee. It may view the current Action only through another independently current path admitted by the Action's visibility policy, such as an exact current designation or approved `CASE_SHARED` rule, plus `RECORD_VIEW` and `RECORD` scope on one Grant.

The default is fail closed. A historical cycle, same role, former Membership, ended Grant or old participant designation never creates permanent visibility. Audit/history may retain the prior assignee's Identity reference under its narrower access policy without exposing the current Action to that person.

## K. Active-work revocation / continuity

### Security truth

Revocation is effective immediately at the authoritative server/database-time boundary. The revoked Membership, Relationship or Grant proof supports no future read, accept, decline, start, complete, relinquish, reassign, correct, resolve or other operation. Historical authorship, completed work, responsibility and audit remain immutable.

### Care-responsibility truth

If the revoked path is required by the current effective assignee of an unfinished Action, that Responsibility Cycle ends with reason `ACCESS_REVOKED`. It does not become `COMPLETED`. Its assigned/accepted/started facts and server times remain history.

The Action then has no effective Responsibility Cycle and derives the continuity condition `NEEDS_REASSIGNMENT`. This is not a fifth core lifecycle state. The core responsibility states remain `ASSIGNED`, `ACCEPTED`, `IN_PROGRESS` and `COMPLETED`; `NEEDS_REASSIGNMENT` means no effective responsibility exists for an unfinished Action.

The system does not auto-complete, auto-reassign, select a caregiver or infer a manager. A new cycle may be created only by an Identity that independently satisfies `ACTION_REASSIGN` through a complete current path and chooses an eligible concrete Identity.

### Product invariant versus implementation mechanism

The server-authoritative result must never permit the revoked actor to continue and must never present that actor as the current responsible person after the responsibility consequence is established. Access revocation and the affected-cycle/gap facts require correlated audit evidence. Implementation Authorization Review must select the transaction/coordination boundary; this closure does not choose locks, triggers, queues, jobs or fan-out architecture. Any intermediate technical state must remain fail closed for the revoked actor and must not be projected as valid ongoing responsibility.

Continuity urgency, escalation and delivery notification are deferred. Absence of an eligible replacement remains visibly unresolved to currently authorized actors; it is never silently repaired.

## L. Cursor replacement

A Read Cursor belongs to one exact Logical Identity + Membership lifecycle instance + Case. A new Membership lifecycle instance always starts a new cursor. It never inherits, copies or merges the old Membership cursor, even when the Logical Identity and Case are the same.

Historical Case activity remains intact and is filtered under the new current path. The new actor may see authorized historical activity, but its “last viewed” state begins fresh. The old cursor cannot reveal inaccessible activity or authorize access.

Cursor advance accepts only a server-issued visible-projection boundary and stores monotonic max. It uses client time neither for ordering nor authority. Cursor replacement needs no care-operation capability and no audit event: exact cursor ownership, current visible Case path and server boundary validation are the complete operation rule.

## M. Delegation

Delegation is DEFERRED. An assignee cannot create a Grant, delegate its responsibility capability, create a sub-assignee or allow another Identity to accept/start/complete through the assignee's authority.

Any future delegation must be explicit, time-bounded, auditable, capability-bounded and revocable, and must preserve the original and delegated responsibility chain. It requires a separate Product Decision and is not inferred from organization, family or professional role.

## N. Supervisor completion

There is no blanket supervisor completion in MVP. Manager, supervisor, senior professional, original assigner or access administrator cannot complete for another current assignee by role.

Only the exact current assignee with `ACTION_COMPLETE`, a complete current path and an `IN_PROGRESS` effective cycle may complete. If responsibility fails, the continuity/reassignment flow applies. A future override requires evidence, explicit capability, state rules and audit design.

## O. Notifications

Notification infrastructure is DEFERRED. MVP authorization/backend work does not add push, email, preference center or delivery retry systems.

Domain/audit events retain the minimum stable IDs, event type, actor/subject/cycle, Case, server time and correlation necessary for future assignment, reassignment, decline, relinquish, revocation and continuity-gap notifications. Notification delivery is not authorization, and failure to notify cannot restore access, accept responsibility or remove a continuity gap.

## P. Authorization vs responsibility truth

Authorization truth answers whether an exact current Actor Context may see or perform an operation through one complete Grant path. Care-responsibility truth answers who is or was assigned, whether that person accepted or started, and whether an effective cycle currently exists.

They are never inferred from one another:

- visibility does not make an Identity responsible;
- assignment does not grant Case access;
- responsibility does not create Membership, Relationship or Grant;
- historical responsibility does not create permanent visibility;
- revocation removes authority immediately but preserves responsibility history;
- a continuity gap may exist while authorized actors can see that no one currently holds effective responsibility.

Both truths are server-derived. UI projects them together for comprehension but does not merge them into one state field.

## Q. Long-term-care safety review

| Safety question | Frozen protection | Residual classification |
|---|---|---|
| Could assignment be mistaken for agreement? | `ASSIGNED` is distinct from `ACCEPTED`; UI and audit show both | Controlled |
| Could acceptance be mistaken for started care? | `ACCEPTED` cannot skip to completion; `IN_PROGRESS` has its own server transition | Controlled |
| Could Action completion resolve a Question? | Independent objects, capabilities, decisions and audit | Prohibited |
| Could responsibility history be overwritten? | Ended cycles and server times are immutable; reassignment creates a new cycle | Prohibited |
| Could family/professional/manager labels over-authorize? | Roles are presentation only; exact path and operation capability required | Prohibited |
| Could inability to continue be hidden? | Decline/relinquish/revocation ends the cycle and derives `NEEDS_REASSIGNMENT` | Controlled |
| Could revoked work still appear currently assigned? | Revoked proof fails immediately; effective cycle ends and projection shows a gap | Must be server-enforced; not a frontend interpretation |
| Could view access imply duty of care? | Visibility and responsibility remain separate truths | Prohibited |
| Could a prior assignee retain access forever? | History is attribution only; current visibility re-evaluates and defaults deny | Prohibited |
| Could the system silently pick a replacement? | No automatic replacement or role-based fallback exists | Prohibited |

No unresolved HIGH product safety concern remains for the first slice. Technical enforcement, concurrency and failure-mode evidence remain mandatory for Implementation Authorization Review and later authorized testing.

## R. Vertical Slice compatibility

The A → B → A flow remains valid without `DemoRole` authorization or client-authoritative state:

| Flow point | Closure result |
|---|---|
| A logs in and opens Case | server derives A's Identity/participation path; role is display only |
| A views Care Updates | `RECORD_VIEW` + `RECORD` + typed visibility on one current path |
| A creates Care Update | `CARE_UPDATE_CREATE` + `CASE`; server fixes author/time/version/audit/activity |
| A creates and assigns Action | one Grant contains `ACTION_CREATE` + `ACTION_ASSIGN` + `CASE`; target is concrete B Identity+Membership |
| B sees assigned Action | B has `RECORD_VIEW` + `RECORD`, current visibility and exact current responsibility |
| B Accepts, Starts, Completes | exact current assignee, ordered state and `ACTION_ACCEPT`/`ACTION_START`/`ACTION_COMPLETE` |
| A sees responsibility trajectory | A's current Action visibility path admits the server-derived cycles/activity; raw audit is not required |
| Read Cursor advances | exact Identity+Membership+Case and server-issued visible boundary; never client time |
| unauthorized C attempts access | no complete path/visibility/capability means fail closed without existence leak |

Responsibility Cycle preserves full history, Audit retains server truth, and Action current responsibility is derived rather than stored in a client-controlled pointer.

### PLAN ADAPTER REQUIRED

The plan remains authoritative for application sequencing, but its future adapter must implement the vocabulary and policy separation in sections G–I. It must also model the new decline/relinquish/gap domain facts for later UI and remove any current role-based participant/assignee semantics. No change to the plan artifact is required now.

Correction, Question, reassignment, decline/relinquish and revocation-continuity UI remain outside the first slice. Their frozen domain rules do not add a first-slice dependency.

## S. Final decision matrix

| Decision | MVP rule | Required capability | Complete Single Grant Path? | Server-authoritative? | Audit required? | Deferred behavior |
|---|---|---|---|---|---|---|
| Create Care Update | publish immutable version 1 with exact author and activity order | `CARE_UPDATE_CREATE` | Yes, `CASE` | Yes | Yes | correction UI |
| Correct Care Update | original author only; append successor, never overwrite | `CARE_UPDATE_CORRECT` | Yes, `RECORD` | Yes | Yes | third-party correction and UI |
| Create Action | create independent Action from visible source | `ACTION_CREATE` | Yes, `CASE` | Yes | Yes | richer source types |
| Assign Action | choose exact eligible Identity+Membership; create `ASSIGNED` cycle | `ACTION_ASSIGN` | Yes, `CASE` | Yes | Yes | assignment UI beyond first slice |
| Accept Action | exact current assignee, `ASSIGNED → ACCEPTED` | `ACTION_ACCEPT` | Yes, `RECORD` | Yes | Yes | delegation |
| Decline assignment | exact assignee ends `ASSIGNED` as `DECLINED`; gap follows | `ACTION_DECLINE` | Yes, `RECORD` | Yes | Yes | full UI/notification |
| Relinquish accepted/started work | end without completion as `RELINQUISHED` or `CANNOT_CONTINUE_AFTER_START`; gap follows | `ACTION_RELINQUISH` | Yes, `RECORD` | Yes | Yes | full UI/escalation |
| Start Action | exact current assignee, `ACCEPTED → IN_PROGRESS` | `ACTION_START` | Yes, `RECORD` | Yes | Yes | delegation |
| Complete Action | exact current assignee, `IN_PROGRESS → COMPLETED`; Question unchanged | `ACTION_COMPLETE` | Yes, `RECORD` | Yes | Yes | supervisor override |
| Reassign Action | authorized actor ends old cycle and creates new exact-Identity `ASSIGNED` cycle | `ACTION_REASSIGN` | Yes, `RECORD`; target eligibility remains same-Case | Yes | Yes | full UI/notifications |
| Resolve Question | exact asker or another permitted Identity; both require current resolve capability | `QUESTION_RESOLVE` | Yes, `RECORD` | Yes | Yes | full Question workflow |
| Revoke access | current issuer authority revokes path immediately and identifies affected responsibility | `ACCESS_REVOKE` | Yes, `CASE` | Yes | Yes | continuity UI, delivery and escalation |
| Prior-assignee visibility | history alone gives no access; another current path must admit record | `RECORD_VIEW` when another path exists | Yes, `RECORD` | Yes | No read audit in MVP | richer historical access policy |
| Continuity gap | unfinished Action with no effective cycle derives `NEEDS_REASSIGNMENT`; no auto-replacement | none to derive; `RECORD_VIEW` to view; `ACTION_REASSIGN` to repair | Current visibility path to view; full path to repair | Yes | Gap-causing operation is audited | escalation/notification |
| Read Cursor replacement | new Membership gets a new cursor; no inheritance | none; exact cursor ownership operation | Current Case path required; cursor is not permission | Yes | No routine cursor audit | per-record receipts |

No decision in this matrix is provisional. Deferred behavior is outside the stated MVP operation/UI boundary and does not weaken the frozen rule.

## T. MVP / Second Stage / Future

### MVP product/domain boundary

- Care Update create authority and immutable publication;
- Action create and assignment to a concrete Identity+Membership;
- exact-assignee Accept, Start and Complete;
- Responsibility Cycle and complete history;
- minimum `AUTHOR_ONLY`, `DIRECT_PARTICIPANTS` and `CASE_SHARED` visibility;
- `RECORD_VIEW`, `CASE` and `RECORD` vocabulary;
- append-only audit and server Case activity order;
- per Identity+Membership+Case Read Cursor;
- reassignment authority/history domain rule;
- decline/relinquish and continuity-gap domain semantics;
- revocation fail-closed and affected-responsibility domain invariant.

Only the A → B → A create/assign/accept/start/complete path is first-slice UI scope. The other MVP domain rules prevent unsafe implementation choices but do not require their UI in that slice.

### Second Stage

- full Question ask/answer/resolve UI and persistence review;
- original-author correction UI;
- decline/relinquish and reassignment UI;
- active-work revocation/continuity remediation UI;
- delivery notifications after workflow definition;
- `EXPLICIT_GRANT` and richer team audiences if evidence requires them;
- richer audit/access history projections.

### Future

- delegation;
- supervisor override;
- organization hierarchy and policy templates;
- clinical signing/co-signing;
- advanced professional verification;
- complex notification delivery/preferences/retries;
- continuity escalation/urgency automation;
- advanced legal export, analytics and cross-Case operations.

## U. Privacy / minimization

These rules need only opaque Identity/Membership/Relationship/Grant IDs, minimum display name and relationship context, Action/Care Update identifiers, bounded care/action content, lifecycle states/reasons, server times, proof/correlation references and Case activity boundary.

The assignee picker exposes only what A needs to distinguish an eligible person: safe display name, minimum Relationship label and relevant availability/validity context. It does not expose unrelated family details, staff directory, other Cases, grant inventories, professional documents or contact data.

This closure adds no GPS, full medical record replication, psychological profiling, unnecessary family detail, raw credential, identity document, precise location, staff performance profile or copied content in audit. Hidden record counts, global sequence gaps and denial details remain non-enumerating.

## V. Contract consistency

Consistency review passed:

- Actor → Identity → Membership → Relationship → one Grant → visibility/cycle → operation capability → audit remains intact;
- no authoritative generic record parent is introduced;
- every access lifecycle uses immutable instances; no numeric generation prerequisite exists;
- Action has no authoritative current-assignee or current-cycle pointer;
- responsibility is derived from the sole effective non-ended cycle;
- published Care Update lineage is append-only with no mutable content head;
- pending/future-start access creates no usable Grant path;
- Logical Identity remains distinct even if a Foundation physical reference backs it;
- Observation is not made a mandatory Care Update subtype;
- no role-based authority, Grant stitching or cross-Membership lifecycle aggregation exists;
- visibility policy and operation scope/capability are separated;
- no destructive correction, automatic caregiver replacement or prior-assignee permanent authority exists;
- Action completion never resolves a Question;
- client identity, author, state, time, proof and sequence are never authority;
- notification and audit are not permission;
- product rules do not select SQL, RLS, trigger, lock, queue, RPC or transaction architecture.

The closure changes candidate vocabulary and closes Product rules only. It does not amend frozen artifacts or authorize implementation.

## W. Artifact

This is the only artifact created in this round:

`docs/winwin/WINWIN_PRODUCT_AUTHORIZATION_WORKFLOW_DECISIONS_V1.md`

No frontend/backend source, test, Foundation artifact, migration, SQL, RLS, RPC/function, Supabase state, Docker state, deployment, remote or Production resource is changed.

## X. Validation

Required closeout:

1. run `git diff --check`;
2. scan for trailing whitespace, tabs and missing EOF newline;
3. scan for secrets, tokens, credentials, private keys and unintended sensitive information;
4. scan for machine-specific absolute paths;
5. recompute Migration 001–008 fingerprints against section A;
6. verify protected Foundation and authoritative input files remain unchanged;
7. confirm the only new path is this artifact;
8. review sections B–V again against all three authoritative inputs;
9. precisely stage this artifact only and inspect the staged diff.

Vite, Vitest and build are intentionally not required because this is a Markdown-only Product Decision Closure with no source/test change.

Closeout before staging passed: all A–AA report sections were present; `git diff --check`, trailing-whitespace, tab and EOF-newline checks passed; the decision scan found no `TBD`, “maybe” or “likely”; absolute-path and sensitive-information scans returned no finding; the three authoritative input fingerprints and Migration 001–008 fingerprints matched their entry values; no Foundation or source/test file changed; and this artifact was the only untracked/worktree path.

## Y. Commit

After all validations pass, at most one local commit is allowed:

`docs: freeze winwin authorization workflow decisions`

Only this artifact may be staged by exact path. `git add .` and push are prohibited.

## Z. Final Git state

Expected after the permitted commit:

- branch remains `codex/foundation-spike-design-correction`;
- the commit parent is `231fa6b265124d10971297d765ec0df6553d6d50`;
- the commit contains only this artifact;
- staged, unstaged and untracked sets are empty;
- Migration 001–008 and all protected Foundation/authoritative inputs remain byte-unchanged;
- no push, remote, runtime or deployment action occurred.

## AA. Authorization boundary

Every care/access mutation remains server-authoritative through this chain:

```text
authenticated account
  → Runtime Actor Context and Logical Identity
  → exact current Membership lifecycle instance
  → exact current Relationship lifecycle instance
  → one complete current Grant lifecycle instance
  → CASE or RECORD target scope on that Grant
  → typed record visibility or exact effective Responsibility Cycle
  → operation-specific capability on the same Grant
  → server state/time validation
  → atomic domain result and append-only audit/activity evidence
```

For combined operations, all required capabilities come from the same Grant. Read requires target scope, `RECORD_VIEW` and the independent visibility policy. Exact assignee status narrows Action transitions but does not replace a Grant. Exact askership/original authorship narrows resolve/correct authority but does not bypass current capability. Read Cursor advance is the frozen ownership/boundary exception: it is not care authority, creates no permission and requires no routine audit.

Roles, Membership existence, Relationship labels, past responsibility, client state and display projections are never authorization proof. Authorization truth and care-responsibility truth stay distinct and are joined only for safe user comprehension.

## Final classification

**A — PRODUCT AUTHORIZATION WORKFLOW DECISIONS V1 PASS — MVP RULES FROZEN — READY FOR IMPLEMENTATION AUTHORIZATION REVIEW**

This classification freezes Product rules only. It does not authorize Implementation Authorization Review to begin automatically and does not authorize frontend/backend implementation, migration, SQL, RLS, Supabase, Docker, Foundation runtime, remote, Production or deployment work.
