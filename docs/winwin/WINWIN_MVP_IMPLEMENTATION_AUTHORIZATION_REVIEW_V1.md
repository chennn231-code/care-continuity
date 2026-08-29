# WinWin MVP Implementation Authorization Review V1

> **Status: IMPLEMENTATION AUTHORIZATION REVIEW V1 — review passed for separate bounded gates; no implementation authorized**
> Date: 2026-08-29
> Authoritative baseline: `codex/foundation-spike-design-correction` at `1e692ed96be6231c684224d447cb372e13d2d6a6`
> This artifact authorizes no source, migration, SQL, RLS, RPC, runtime, integration, deployment, remote or Production action.

## A. Preflight

Preflight passed before review:

- branch was exactly `codex/foundation-spike-design-correction`;
- HEAD was exactly `1e692ed96be6231c684224d447cb372e13d2d6a6`;
- staged, unstaged and untracked sets were empty;
- Migration 001–008 fingerprints matched the frozen values;
- protected Foundation and Product artifacts had no worktree drift;
- no reset, restore, stash, clean, checkout, merge, rebase, fetch, pull or push occurred.

This is a Markdown-only design review. It does not execute tests or runtimes whose behavior could mutate repository or environment state.

## B. Authoritative inputs

Inputs were reviewed in this order:

1. `WINWIN_PRODUCT_AUTHORIZATION_DOMAIN_CONTRACT_V1.md`, SHA-256 `4f1e5c0e625b8fd4bd40e226809c7517d08277969ecc67fcb627defd06806338`;
2. `WINWIN_PRODUCT_BACKEND_RECORD_AUTHORIZATION_DESIGN_V1.md`, SHA-256 `a9f095f2cf64ad9cefeb80e80dae869b287c963d27365cfb3e4bfe50b1a29369`;
3. `WINWIN_PRODUCT_AUTHORIZATION_WORKFLOW_DECISIONS_V1.md`, SHA-256 `b2e4864d81474842535a63cb47208d0b11b4df158463c503fcfa0355409a184c`;
4. `WINWIN_MVP_VERTICAL_SLICE_IMPLEMENTATION_PLAN_V1.md`, SHA-256 `57e641f17e12a72d9ec2cbd1159ff70f28b12531be10ec0fe390ca49d39adf0a`.

No frozen Product decision is reopened. Where the Plan or existing TypeScript names differ from the later frozen vocabulary/derived-current design, this review marks a bounded adapter requirement rather than changing an authoritative input.

## C. Frozen product decisions

Implementation must preserve:

- exact Identity reassignment authorized only by `ACTION_REASSIGN` on one complete current path;
- exact assignee decline/relinquish as independent audited operations, never replacement selection;
- Question resolution independent from Action completion;
- Care Update correction as original-author-limited, capability-gated immutable successor lineage;
- canonical `RECORD_VIEW` plus independent Record Visibility;
- canonical Grant target scopes `CASE` and `RECORD`;
- `FAMILY_TEAM`, `PROFESSIONAL_TEAM` and `EXPLICIT_GRANT` audience policies deferred;
- no current visibility from historical assignment alone;
- revocation immediately denies authority, ends the affected effective cycle, preserves history and derives `NEEDS_REASSIGNMENT` without auto-replacement;
- new Membership lifecycle instance means a new Read Cursor;
- delegation, supervisor completion and notification infrastructure deferred.

The first UI slice remains A creates/publishes/assigns, B accepts/starts/completes, and A sees responsibility/activity and advances a cursor. The frozen domain rules outside that UI path constrain safe schema and commands but do not enlarge the first-slice UI.

## D. `RECORD_VIEW` semantics

`RECORD_VIEW` is an operation capability ceiling, not a visibility policy. `CASE`/`RECORD` scope is a target boundary, not a capability. Typed Record Visibility is the final record-specific audience decision, not a Grant.

Read is allowed if and only if all predicates are satisfied at one authoritative database/server time:

1. the account is authenticated and resolves through a current account link;
2. the Runtime Actor Context selects one valid Logical Identity;
3. the exact Membership lifecycle instance is active/current for the Case;
4. the exact Relationship lifecycle instance is valid and same-Identity/same-Case;
5. one candidate Grant is active, current, unrevoked and attached to those exact instances;
6. that same Grant contains `RECORD_VIEW`;
7. that same Grant has `CASE` scope for the Case or `RECORD` scope covering the exact typed target;
8. the typed record's visibility policy admits the exact Identity+Membership under its approved participant source;
9. all purpose, expiry, revocation and object-lifecycle predicates pass.

The helper returns the exact Grant instance ID as proof. It never asks independent `EXISTS` questions that could source capability, scope or prerequisite facts from different Grants. Another Grant cannot repair a missing predicate. Visibility cannot elevate scope/capability, and scope/capability cannot expand visibility.

RLS may call a private, security-reviewed helper that returns only the minimum proof/decision. Its ownership, row-security behavior, fully qualified objects, fixed `search_path`, arguments and EXECUTE ACL require the IA-4 security review.

## E. Authoritative data model mapping

Names below are reviewed candidates for later migration authoring, not created objects.

| Logical/physical candidate | Purpose and authoritative truth | First-slice necessity | Lifecycle / mutation | FK boundary and proof | Audit/privacy |
|---|---|---|---|---|---|
| Logical Identity backed by Foundation actor/account facts; evaluate `winwin_identities` | Stable authorization subject distinct from Runtime Actor Context | Required logically; no separate MVP table required when Foundation stable actor reference safely backs it | Stable reference; account-link lifecycle controlled upstream | Account link → physical actor reference backing Identity | Store opaque IDs/minimal display projection; link changes audited upstream |
| Foundation `winwin_cases` | Case authority root and lifecycle | Required | Stable Case ID; controlled lifecycle | All Product rows remain same-Case | Do not expose existence without authorization |
| `winwin_case_memberships` / reviewed lifecycle-instance name | Exact Identity participation lifecycle in one Case | Required | New immutable ID per join/rejoin; controlled end; never reactivate ended instance | Identity+Case; exact source/period | Participation history sensitive; create/end audited |
| `winwin_relationships` / reviewed lifecycle-instance name | Why the exact Membership participates; never permission | Required | New immutable instance for changed/rejoined relationship; controlled end | Exact Membership+Identity+Case composite alignment | Retain minimum service/relationship context; audit lifecycle |
| `winwin_grants` / reviewed lifecycle-instance name | One complete authorization proof lifecycle | Required | Created only active after prerequisites; revoke/end, never reactivate | Exact Identity+Membership+Relationship+Case+issuer/source | Security-critical; audit create/revoke; no raw credential |
| `winwin_grant_capabilities` or bounded immutable representation | Capabilities belonging to one exact Grant | Required logically; child table preferred candidate | Immutable with Grant instance | Grant ID + controlled capability key | Do not expose Grant inventory to ordinary clients |
| Grant target-scope representation | `CASE` or `RECORD` ceiling on the same Grant | Required | Immutable with Grant instance | Exact Grant; typed target where `RECORD` | Security-critical; never a visibility table |
| `winwin_source_envelopes` + `winwin_content_versions` (Care Update mapping) | Stable Care Update identity and immutable published content lineage | Required | Envelope stable; versions append-only; derived unique head | Case, author Identity+Membership/account link, acting Grant proof; version predecessor | Content sensitive; audit metadata only, no payload copy |
| `winwin_actions` | Stable work identity/source/creator; no current assignee/cycle authority | Required | Stable core facts; terminal meaning derived/controlled | Case, creator Identity+Membership, optional source version | Store minimum work context; creation audited |
| `winwin_responsibility_cycles` | Sole current/historical responsibility truth | Required | New row per assignment; transitions controlled; ended rows immutable | Action+Case, assigner/assignee Identity+Membership | Every assignment/transition/end audited |
| `winwin_audit_events` | Append-only security/domain mutation evidence | Required | Insert-only controlled writer | Case, Actor Context, allow-listed target, optional cycle/Grant proof | No full Care Update payload; narrower read policy |
| `winwin_read_cursors` | Since-last-view boundary for exact participation lifecycle | Required | Monotonic advance only; new Membership means new row | Identity+Membership lifecycle+Case unique key | Behavioral metadata; no per-record surveillance |

No authoritative generic `winwin_records` is introduced. Care Update, Action and later Question retain typed FKs/lifecycles while sharing reviewed authorization patterns.

## F. Database invariants

Database constraints are the final race defense, not the sole business workflow:

- lifecycle IDs are immutable; ended Membership/Relationship/Grant instances cannot reactivate;
- composite FKs keep Identity, Membership, Relationship, Grant, Case and target aligned;
- a Grant cannot exist before every activation prerequisite; the selected MVP design creates no pending Grant;
- capability and scope facts belong immutably to one Grant ID;
- validity periods are ordered and terminal facts require server timestamps;
- at most one effective/non-ended Responsibility Cycle exists per Action;
- cycle timestamps/state order is assigned ≤ accepted ≤ started ≤ completed/ended;
- ended cycles, published Content Versions and Audit Events are immutable;
- Content Versions have envelope+ordinal uniqueness and at most one successor per predecessor, producing one derived head;
- cursor ownership key is Identity+Membership-lifecycle+Case and stored boundary cannot decrease;
- operation/idempotency and audit-correlation uniqueness prevent retry duplication;
- direct authenticated mutation of authoritative actor, proof, time, version, cycle and audit fields is denied.

An Action's current responsibility and workflow projection is derived from its unique effective cycle. A projection/cache is rebuildable and explicitly non-authoritative.

## G. Action state machine mapping

| Operation | Current state | Capability | Identity/responsibility condition | Single Grant Path | Server validation and authoritative result | Audit |
|---|---|---|---|---|---|---|
| create + initial assign | none | `ACTION_CREATE` + `ACTION_ASSIGN` | creator current for Case/source; target eligible concrete Identity+Membership | The same Grant carries both capabilities + `CASE` scope | Atomically create stable Action and first `ASSIGNED` cycle; no visible partial unassigned result | distinct `ACTION_CREATED` + `ACTION_ASSIGNED` facts under one correlation |
| standalone assign | unassigned/nonterminal | `ACTION_ASSIGN` | target eligible; no effective cycle; operation separately authorized | Same Grant carries capability + `CASE` or exact `RECORD` scope | Lock Action and create an `ASSIGNED` cycle | `ACTION_ASSIGNED` |
| accept | `ASSIGNED` | `ACTION_ACCEPT` | exact assignee of effective cycle | Assignee's same Grant carries capability + `RECORD` scope | Expected version/state; set cycle accepted/server time | `ACTION_ACCEPTED` |
| start | `ACCEPTED` | `ACTION_START` | exact accepted assignee | Same Grant + `RECORD` | Expected version/state; set started/server time | `ACTION_STARTED` |
| complete | `IN_PROGRESS` | `ACTION_COMPLETE` | exact in-progress assignee | Same Grant + `RECORD` | Expected version/state; complete cycle; Action completion derived | `ACTION_COMPLETED` |
| decline | `ASSIGNED` | `ACTION_DECLINE` | exact unaccepted assignee | Same Grant + `RECORD` | End cycle `DECLINED`; derive continuity gap | `ACTION_DECLINED` |
| relinquish | `ACCEPTED` or `IN_PROGRESS` | `ACTION_RELINQUISH` | exact current assignee | Same Grant + `RECORD` | End with reviewed reason; preserve accepted/started facts; derive gap | `ACTION_RELINQUISHED` |
| reassign | effective nonterminal cycle or approved gap | `ACTION_REASSIGN` | authorized actor; eligible concrete successor | Same Grant + target scope | End old cycle `REASSIGNED` when present; create new `ASSIGNED` cycle | `ACTION_REASSIGNED` |
| revoke interaction | any noncompleted effective cycle whose required path is lost | `ACCESS_REVOKE` on access target | issuer authority; affected assignee loses every independently complete required path | Revoker's same Grant + `CASE`; revoked actor proof immediately denied | End affected cycle `ACCESS_REVOKED`; derive gap; no successor | access + cycle/gap correlated events |

The core sequence stays `ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED`. Decline, relinquish, reassignment and revocation end/replace a cycle; they do not become shortcuts to completion. Frontend state never writes these facts directly.

## H. Responsibility Cycle mapping

Initial assignment creates the only effective `ASSIGNED` cycle with exact assigner and assignee Identity+Membership facts. Accept/Start/Complete mutate that cycle only through guarded server commands and append audit evidence. Completion retains the cycle as immutable history.

Decline ends an unaccepted cycle. Relinquish ends accepted/in-progress responsibility with the reviewed reason. Reassignment preserves/ends the old cycle and creates a new `ASSIGNED` cycle. Revocation ends an affected cycle only when the assignee has no remaining independently complete path required for responsibility.

There is no authoritative Action assignee or cycle pointer. Action-boundary locking plus uniqueness prevents two effective cycles. Every read of “current responsible person” derives from the effective cycle at server time.

## I. Continuity condition

`NEEDS_REASSIGNMENT` is a derived continuity condition for an unfinished Action with no effective Responsibility Cycle after decline, relinquish, reassignment gap or access loss. It is not a fifth core Action lifecycle state and is not a client-writable column.

Authorized projections must show `NO_EFFECTIVE_RESPONSIBILITY`/`NEEDS_REASSIGNMENT`; they must not continue displaying a former/revoked assignee as current. The condition cannot auto-complete, auto-assign or choose a caregiver. Repair requires a new `assign_action`/`reassign_action` result authorized by `ACTION_ASSIGN` or `ACTION_REASSIGN` as applicable.

## J. Care Update mapping

`create_care_update` creates one Source Envelope, immutable Content Version 1, only the typed audience facts required by the selected first-slice policy, server time/activity sequence and Audit Event atomically. It derives author Identity/Membership/account-link/Grant proof. Client `occurred_at` remains a bounded claim.

Observation is only an optional UI/category choice, not a required authoritative subtype. The first slice may store bounded Care Update text/category/source facts without creating an Observation table.

Correction is Second Stage: lock lineage, verify expected derived head/ordinal, append successor and audit. No mutable authoritative head/version pointer and no destructive edit are permitted.

## K. Identity / Membership / Relationship mapping

Authentication resolves a physical account-link instance. The Runtime Actor Context selects the stable Logical Identity backed by the controlled physical actor reference. Physical reuse does not erase the logical layer.

Membership is Case participation and Relationship explains context. Neither authorizes alone. Every request binds one exact lifecycle instance of each; replacement/rejoin creates new IDs and cannot revive or aggregate with the old lifecycle. Server responses expose only minimum display/relationship context required to identify an assignee.

## L. Single Grant Path evaluation

One candidate Grant must independently satisfy Identity, Membership, Relationship, Case, status, validity, purpose, scope and all capabilities required by the command. The command and Audit Event retain that exact Grant proof/reference.

Evaluation is correlated on one Grant alias/ID. It cannot union capabilities, use scope from another Grant, revive an ended Membership through a newer Grant, or treat audience/role as a missing predicate. Unknown capability/scope/purpose and absent validity fail closed.

## M. RLS responsibility

RLS is defense in depth and row-eligibility enforcement:

- SELECT uses the private same-Grant read decision plus typed Record Visibility;
- own access-term/cursor projections are exact Identity+Membership scoped and minimized;
- direct writes to published versions, Actions/cycles, Grants, Invitations and Audit are denied;
- inaccessible/not-found behavior is non-enumerating.

RLS does not orchestrate multi-row state machines, choose assignees, allocate activity order, implement idempotent response replay or perform large continuity fan-out. Those belong to server commands/transactions. Constraints enforce final structural/race invariants. Application projections translate authorized results for UI without becoming authority.

## N. Server command surface

| Command | Classification | Reason |
|---|---|---|
| `create_care_update` | FIRST SLICE | Required publication path |
| `create_action` | FIRST SLICE | One compound command creates the stable Action and first exact-Identity `ASSIGNED` cycle atomically; same Grant must contain `ACTION_CREATE` and `ACTION_ASSIGN` |
| `assign_action` | FIRST-SLICE PREREQUISITE | Internal reviewed primitive for the compound command; standalone exposure for a pre-existing unassigned Action is Second Stage |
| `accept_action` | FIRST SLICE | Required B transition |
| `start_action` | FIRST SLICE | Required B transition |
| `complete_action` | FIRST SLICE | Required B transition |
| `advance_read_cursor` | FIRST SLICE | Required A/B visible-activity boundary |
| `revoke_access` | FIRST-SLICE PREREQUISITE | Security/continuity tests require an authoritative revocation path; no first-slice user UI |
| `decline_action` | SECOND STAGE | Domain rule frozen; not required by A→B→A UI |
| `relinquish_action` | SECOND STAGE | Domain rule frozen; continuity UI deferred |
| `reassign_action` | SECOND STAGE | Domain rule/schema compatibility required; UI deferred |
| `correct_care_update` | SECOND STAGE | Lineage schema compatible from start; UI/command deferred |
| Question commands | SECOND STAGE | Full Question workflow deferred |
| delegation/supervisor override | FUTURE | Separate evidence/authority model required |

The first-slice application exposes one `create_action` result that atomically creates the Action and its first cycle. Its creation and assignment capabilities/domain/audit facts stay distinguishable, but the same Grant and idempotency correlation cover both. Failure commits neither object. `assign_action` may remain an internal command primitive; standalone exposure requires its later bounded authorization.

## O. Revocation boundary

`revoke_access` immediately invalidates the exact access lifecycle at server/database time. It then determines whether the effective assignee retains another independently complete path required to continue. If none remains, it ends the effective cycle with `ACCESS_REVOKED`, preserves all history and derives the continuity gap. It never stitches remaining partial paths or selects a replacement.

Product requires a correlated fail-closed result; IA-4 decides the exact transaction/coordination mechanism. No intermediate projection may authorize or present the revoked actor as current. Notification delivery is not part of the authorization result.

## P. Audit implementation

Minimum Audit Event fields are event ID, Case, physical actor/account-link reference, Logical Identity, Membership lifecycle instance, operation, allow-listed target type/ID, optional Responsibility Cycle, authorizing Grant proof/reference, bounded previous/new state references, database server time, correlation/idempotency reference and Case activity sequence where applicable.

Audit is append-only and server-written inside the owning command. Target allow-list, existence and same-Case consistency are validated by the controlled writer. Audit failure rolls back the owning mutation. It does not copy Care Update bodies, raw credentials, broad client telemetry or unnecessary profile data.

User-facing Activity is a permission-filtered, minimized domain projection. Activity is not Audit authority, and hidden activity cannot leak through counts or sequence gaps.

## Q. Read Cursor implementation

Key: Logical Identity + Membership lifecycle instance + Case. Initial cursor is absent or an explicit zero/start boundary for that lifecycle; it never imports an old Membership boundary.

`advance_read_cursor` accepts only the newest visible boundary issued in an authorized server response and stores `max(current, supplied)`. Concurrent advances converge on the maximum. A stale/lower boundary is idempotent and cannot rewind. A boundary belonging to another Identity/Membership/Case is denied. Browser clock, client timestamps, hard-coded counts and hidden global sequence gaps never determine unread state.

Unread count/divider is computed over the actor's currently visible activity projection. Routine cursor advance requires no care-operation capability or separate Audit Event; exact ownership, current Case path and server boundary validation are the full rule.

## R. Frontend adapter mapping

| Current prototype | Target boundary | Required adapter |
|---|---|---|
| `PrototypeProvider` direct mutations | `VerticalSliceService` → repository/server commands | Migrate selected screens only; component owns form/loading, not authority |
| `DemoRole` / `activeRole` | authenticated session + Runtime Actor Context + Logical Identity | Role remains display-only and never enters formal authorization call |
| role-valued assignee/participants | exact Identity+Membership DTOs | Picker submits opaque eligible subject ID returned by server |
| role/grant selectors | server `allowedOperations` and authorized DTOs | Remove migrated use of role comparisons/grant inventories |
| mutable Action/current pointer contract | derived effective Responsibility Cycle | Render returned state/history; no direct state write |
| client-derived timestamp activity sort | server-issued Case activity sequence | Render sequence-ordered authorized projection |
| hard-coded unread count | cursor-aware server projection | Display returned count/boundary and advance only after successful render |
| in-memory audit/status history | server command result + Activity DTO | Never expose raw Audit as timeline |

Frontend may request a command, render permitted CTAs, show history/continuity warnings and present safe errors. It cannot forge Identity, Membership, Grant, capability, scope, visibility, state, Audit time or Cursor boundary.

## S. Demo versus real backend

The demo adapter remains deterministic test scaffolding. It can model exact opaque identities, lifecycle instances, one-Grant proofs, server-like time/sequences and closed errors, but it cannot claim Production authorization parity.

The real backend adapter begins only after IA-3/IA-4 designs and IA-5/IA-6 runtime execution are separately authorized and verified. Components must depend on the shared application interface, not import Supabase directly. Contract tests must prove Demo/real result and error shape parity without treating demo decisions as security evidence.

## T. Error model

Closed command errors:

- `UNAUTHENTICATED`;
- `NOT_FOUND_OR_NOT_VISIBLE`;
- `NO_COMPLETE_GRANT` / UI-safe `FORBIDDEN`;
- `TARGET_INELIGIBLE`;
- `NOT_CURRENT_ASSIGNEE`;
- `INVALID_STATE`;
- `STALE_VERSION`;
- `IDEMPOTENCY_CONFLICT`;
- `ACCESS_REVOKED`;
- `CONTINUITY_GAP` for authorized viewers;
- `TEMPORARY_FAILURE`.

The UI receives safe copy and recovery hints, not SQL/RLS details, Grant inventory, hidden-object existence or stack traces. Same idempotency key/request returns the committed result; the same key with a different normalized request returns conflict.

## U. Concurrency and stale state

| Race | Database/transaction | Version/idempotency | Server command outcome |
|---|---|---|---|
| B and C operate one Action | Lock Action/effective cycle; same-Case uniqueness | Expected cycle/row version; exact assignee; operation key | One valid exact assignee transition; other denied/stale |
| Reassign vs Complete | Common lock hierarchy through Grant→Action→cycle | Recheck capability/state/version after lock | One commits; loser observes ended/completed/stale state; no rewritten history |
| Revoke vs Complete | Common Case/Grant/Action/cycle order or equivalent serializable coordination | Re-evaluate Grant proof at one server time | If revoke wins, completion denied and gap recorded; if complete wins, history stays completed then access revokes |
| Concurrent cursor advance | Unique cursor key + atomic max-upsert | Boundary bound to Identity+Membership+Case | Maximum visible boundary persists; no rewind |
| Concurrent Care Update correction | Lock envelope/lineage; unique ordinal/predecessor-successor | Expected derived head/ordinal + idempotency | One successor commits; competing stale correction conflicts |

No command uses last-client-write-wins as its safety model. Deadlock/serialization retry is bounded and reuses the same idempotency key.

## V. Test authorization matrix

| Scenario | Expected evidence | Required layers |
|---|---|---|
| A creates Care Update | immutable version 1, exact author/path, audit/activity | Unit, DB, server, integration, frontend |
| A creates Action and assigns B | exact B Identity+Membership and one `ASSIGNED` cycle | Unit, DB, server, integration |
| B Accepts→Starts→Completes | ordered exact-assignee transitions, no duplicates | Unit, DB, server, integration, E2E |
| A sees trajectory/activity and advances cursor | minimized sequence projection and exact cursor boundary | Server, integration, frontend, E2E |
| C attempts B operation | non-assignee deny without existence leak | Unit, RLS, server, integration |
| B reassigns without capability | deny; no new cycle | Unit, server, RLS defense |
| historical assignee reads current Action | deny unless another complete current visibility path exists | Unit, RLS, integration |
| revoked actor completes | deny; affected cycle ended/gap exposed | DB, server, integration |
| expired Membership uses old Grant | deny; no lifecycle aggregation | Unit, RLS, server |
| capability/scope split across Grants | deny and query-shape regression | Unit, RLS/helper, integration |
| `DemoRole` substituted | grants nothing | Unit, frontend adapter |
| client forges Identity/state/time | server ignores/denies; authoritative fields unchanged | Server, integration, security E2E |
| old Membership cursor updates new cursor | deny by ownership key | DB, RLS, server |
| revocation continuity | old cycle historical, no replacement, derived gap | DB, server, integration |
| valid authorized reassignment | new cycle; old cycle immutable | Unit, DB, server |

## W. Test-layer split

- **Unit/domain:** same-Grant predicates, state eligibility, visibility vocabulary, continuity derivation, error mapping.
- **DB invariant:** composite FKs, immutability, unique effective cycle, lineage, monotonic cursor, idempotency/audit uniqueness.
- **RLS:** read allow/deny, existence non-enumeration, same-Grant helper, exact own cursor/access projections, direct-write denial.
- **Server command:** authentication derivation, locks/version checks, multi-row atomicity, audit, stable errors/retries.
- **Integration:** full command→database→projection behavior with concurrency and revocation.
- **Frontend adapter:** no role authority/direct writes, CTA/result mapping, safe errors, cursor rendering.
- **E2E:** A→B→A happy path plus C/revoked denial in an authorized non-Production runtime.

## X. Implementation phases

| Phase | Objective / expected categories | Prerequisite and allowed mutation | Tests / stop condition | Recovery / runtime / authorization |
|---|---|---|---|
| 0. Contract/adapter seam cleanup | Focused application interfaces, final DTO/error vocabulary, demo fixtures/selectors; `app/src/v2/application/*` and narrow tests | IA-2; source/tests only, no backend/schema | Unit/component; stop if migrated path accepts `DemoRole`, mutable pointers or client authority | Revert bounded source commit; no runtime; separate IA-2 required |
| 1. Authoritative schema authoring | One new additive migration draft plus schema/security test drafts; no 001–008 edits | IA-3 after exact names/FKs/cutover prerequisites; authoring only | Static/DB-design review; stop on generic record, pending Grant, lifecycle/pointer conflict | Drop unexecuted draft commit; no runtime/execution; separate IA-3 |
| 2. RLS authoring | Private same-Grant helper, typed SELECT policies, direct-write denial, threat tests | IA-4 design; may edit new migration/test drafts only | Query-shape and policy review; stop on recursion/bypass/grant stitching/existence leak | Revert unexecuted policy draft; no runtime unless separately IA-5/6 |
| 3. Server commands | First-slice commands, revocation prerequisite, idempotency/version/locks/audit | IA-4; source/functions and tests only under bounded authorization | Command/unit/concurrency review; stop on client-authoritative fields/partial success | Revert unexecuted source; local static tests only unless separately authorized |
| 4. Audit + Read Cursor | Append-only writer/projection/cursor contract and tests | IA-4 authoring; IA-6 for DB execution | Audit atomicity, cursor ownership/max/gap tests; stop on payload duplication/rewind | Revert drafts; runtime requires IA-5 then IA-6 |
| 5. Frontend real-backend adapter | Implement repository adapter and migrate selected screens; no component Supabase imports | IA-7 after verified schema/RLS/commands | Contract/component/integration tests; stop on demo/real parity or authority leak | Feature switch back to demo adapter; authorized runtime required |
| 6. Vertical Slice integration/E2E | A→B→A and C/revoked security evidence | IA-8 after IA-5–7 evidence | Full matrix; stop on any deny, history, cursor, accessibility or care-safety failure | Disable real adapter/cutover; authorized non-Production runtime only |

Each phase is a separately reviewable checkpoint. A pass here makes the sequence safe to authorize; it does not authorize any phase automatically.

## Y. Foundation dependency

Foundation actor/account mapping, Case authority, lifecycle/cutover prerequisites and an authorized environment are upstream. Product design/schema authoring may proceed under separate gates without Environment Start. Real RLS/command verification, SQL execution and integration require the corresponding Foundation authorization.

No Foundation runtime operation is performed here. When required, mark **FOUNDATION AUTHORIZATION REQUIRED** and stop until its independent gate passes.

## Z. Migration strategy

Migration 001–008 are immutable reference/history and are not edited or expanded in place. Future Product authority uses one new additive migration after IA-3 approves exact physical names, composites, helper ownership and ordering.

Migration authoring is distinct from SQL execution. An unexecuted draft can be reviewed statically under IA-3/IA-4; applying it requires IA-5 environment authorization and IA-6 explicit SQL/execution authorization. Rollback is designed before execution and never deletes historical legacy rows casually.

## AA. Cutover strategy

Existing 007–008 `v2_*` objects remain candidate/reference material, not the new authority expansion base. Before cutover, inventory relevant legacy rows at action time:

- zero relevant rows selects no bridge;
- existing relevant rows require a separately reviewed one-way, idempotent, fail-closed mapping with count/semantic verification;
- ambiguous rows stay unmapped and unauthorized.

Cutover selects one authoritative read/write adapter; no dual-write. A bounded feature switch enables the real adapter only after RLS/command evidence. Rollback disables the new adapter/cutover without deleting source history. Production deployment is outside IA-8 and requires its own later authorization.

## AB. Long-term-care safety

Implementation acceptance must prove:

- `ASSIGNED` never displays as accepted;
- `ACCEPTED` never displays as work started;
- completion never resolves a Question;
- revoked/former caregivers never display as current;
- a continuity gap is explicit to authorized viewers;
- historical responsibility remains complete and distinct from current visibility;
- visibility never implies responsibility;
- family/professional/manager labels grant nothing;
- an unfinished Action with no effective assignee never appears normal/completed;
- reassignment preserves old history and creates a new acceptance lifecycle.

Any violation is a release-blocking Product Safety failure, not frontend copy discretion.

## AC. Privacy and minimization

Persist only opaque authorization references, minimum relationship/display context, bounded care-continuity content, Action/cycle facts, server times, cursor boundary and audit metadata. Assignee results expose only eligible concrete identities and enough relationship context to disambiguate them.

Do not duplicate health payload into Audit/activity, expose Grant inventories, store raw credentials, broad family profiles/directories, unnecessary professional details, location, clinical detail or client telemetry. RLS/errors/counts must avoid existence leakage.

## AD. Out-of-scope verification

The review does not authorize full Question UI, delegation, supervisor override, notifications, `FAMILY_TEAM`, `PROFESSIONAL_TEAM`, `EXPLICIT_GRANT`, organization hierarchy, clinical signing, advanced verification, AI scoring/chatbot, GPS, medication reminders, psychological support, full medical record, complex offline sync or automatic caregiver replacement.

Deferred domain compatibility is retained only where needed to prevent first-slice architecture from becoming unsafe or destructive.

## AE. Implementation authorization matrix

| Work category | Design disposition | Authorized now? | Earliest gate |
|---|---|---|---|
| Implementation design sequence | Accepted by this review | Review artifact only | IA-1 completes with checkpoint adoption |
| Contract/application seam cleanup | Safe as bounded source work | No | IA-2 |
| New additive migration authoring | Safe after exact physical review | No | IA-3 |
| RLS/helper/server command authoring | Safe after schema/security boundary review | No | IA-4 |
| Foundation/environment runtime | Independent prerequisite | No | IA-5 |
| SQL/migration execution | Requires reviewed rollback/evidence plan | No | IA-6 |
| Real frontend/backend integration | Requires verified runtime authority | No | IA-7 |
| Integration/E2E/cutover evidence | Requires authorized non-Production environment | No | IA-8 |
| Deployment/Production | Outside this gate set | No | Later explicit deployment authorization |

## AF. Blocker matrix

| Item | Blocks what | Resolution gate | MVP blocker now? |
|---|---|---|---|
| Exact physical table/constraint/helper names | Migration/RLS authoring | IA-3/IA-4 review | No; bounded gate work |
| Foundation actor/Case lifecycle availability | Real schema integration/runtime | IA-5 | No for Phase 0; yes before IA-6/7 |
| Legacy row inventory/bridge choice | Execution/cutover | IA-6/IA-8 | No for authoring |
| Helper owner/search path/row-security/ACL | RLS authoring acceptance | IA-4 | No for Phase 0/1 |
| Transaction/lock strategy for revocation fan-out | Command implementation | IA-4 | No Product decision gap; technical gate item |
| Authorized non-Production environment | Runtime verification | IA-5 | No for static authoring |
| Product workflow/capability/scope vocabulary | All implementation | Closed at `1e692ed` | No |

There is no unresolved Product/MVP architecture blocker. Remaining items are intentionally bounded implementation/runtime gate prerequisites.

## AG. Authorization gates

| Gate | Pass condition | Current status |
|---|---|---|
| IA-1 Implementation Design Accepted | This review adopted as a clean single-artifact checkpoint | READY FOR CHECKPOINT; not self-executing |
| IA-2 Contract / Adapter Cleanup Authorized | Exact source/test scope, adapter interface and stop conditions approved | NOT AUTHORIZED |
| IA-3 Migration Authoring Authorized | Exact new migration path/names/invariants/order and no-execution boundary approved | NOT AUTHORIZED |
| IA-4 RLS / Server Command Authoring Authorized | Helper security, policies, command/lock/idempotency/audit design approved | NOT AUTHORIZED |
| IA-5 Foundation Runtime Authorized | Independent Foundation/environment gate passes | NOT AUTHORIZED |
| IA-6 SQL / Migration Execution Authorized | Reviewed migration, rollback, inventory and runtime evidence plan approved | NOT AUTHORIZED |
| IA-7 Frontend Real Backend Integration Authorized | Verified schema/RLS/commands plus adapter scope approved | NOT AUTHORIZED |
| IA-8 E2E / Cutover Authorized | Authorized environment, test matrix and cutover/rollback scope approved | NOT AUTHORIZED |

Authoring, runtime, execution, integration, cutover and deployment are never bundled into a blanket authorization.

## AH. Artifact

This is the only artifact permitted by this review:

`docs/winwin/WINWIN_MVP_IMPLEMENTATION_AUTHORIZATION_REVIEW_V1.md`

It modifies no authoritative input, Foundation artifact, Migration 001–008, source or test file.

## AI. Validation

Required closeout:

1. `git diff --check`;
2. whitespace/tab and EOF newline scans;
3. sensitive-information and machine-specific absolute-path scans;
4. Migration 001–008 fingerprint verification;
5. protected Foundation/input artifact verification;
6. confirm this new Markdown is the only worktree item;
7. after exact-path commit, confirm clean staged/unstaged/untracked state and one-file commit.

Vite, Vitest, build, Supabase and Docker are not required or authorized for this Markdown-only review.

## AJ. Commit

Only after every validation passes, at most one local commit is permitted:

`docs: review winwin mvp implementation authorization`

Stage only this artifact by exact path. `git add .` and push are prohibited.

## AK. Final Git state

Expected after the permitted commit:

- branch remains `codex/foundation-spike-design-correction`;
- commit parent is `1e692ed96be6231c684224d447cb372e13d2d6a6`;
- commit contains only this artifact;
- staged, unstaged and untracked sets are empty;
- authoritative inputs, Foundation and Migration 001–008 remain unchanged;
- no runtime, remote or deployment action occurred.

## AL. Authorization boundary

This review concludes that the implementation sequence is safe to authorize through separate bounded gates. It does not grant IA-2 through IA-8, begin implementation, create a migration, write SQL/RLS/functions, start Supabase/Docker/Foundation, integrate the frontend, run E2E, cut over, deploy or push.

**A — IMPLEMENTATION AUTHORIZATION REVIEW V1 PASS — IMPLEMENTATION PLAN IS SAFE TO AUTHORIZE IN SEPARATE BOUNDED GATES**
