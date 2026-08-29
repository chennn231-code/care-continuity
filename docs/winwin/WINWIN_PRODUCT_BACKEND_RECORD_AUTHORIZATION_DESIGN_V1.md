# WinWin Product Backend / Record-Level Authorization Design V1

> **Status: BATCH 2 DESIGN REVIEW — design and static review only**
> Date: 2026-08-29
> Starting baseline: `codex/foundation-spike-design-correction` at `fd55371c1ef4219e51dd4de1d41c69c92e040982`
> No migration, SQL, RLS policy, server function, Supabase execution, Docker operation, runtime Gate work, push, remote or Production action is authorized by this document.

## 1. Authority and review boundary

The work package records Foundation Gate 5 as **PASS** while Foundation runtime remains **PAUSED / NOT AUTHORIZED**. Repository status documents at the starting commit preserve the earlier pre-Gate-5 snapshot; this design uses the newer work-package checkpoint without rewriting those historical files.

The frozen Product Batch 1 authorization chain remains:

```text
Actor
→ Identity
→ Case Membership
→ Relationship
→ one complete Single Grant Path
→ Record Visibility / Responsibility Cycle
→ operation-specific Capability
→ Audit Event
```

`DemoRole`, role labels, membership existence and “any grant exists” are never Production authorization primitives. All user-supplied identity, authorship, time, capability, grant validity and transition status are untrusted requests until resolved and checked by the server.

This is a target design for a future additive schema after an explicit authority/cutover decision. Names are candidates, not approved SQL identifiers.

## 2. Design decisions and rejected shortcuts

### 2.1 Selected physical direction

Use normalized identity/access facts, a common record-authorization envelope, typed domain tables, append-only published versions/events/audit, and narrow mutable current pointers guarded by server transitions. Do not implement full event sourcing and do not store authoritative permission or domain state in free-form JSON.

The common `winwin_records` envelope is justified despite being an extra table: Care Update, Question and Action all require the same case, author, visibility, participant and server-time RLS inputs. One envelope prevents three drifting visibility implementations and gives RLS one fail-closed entry point. Typed tables retain domain-specific invariants.

### 2.2 Explicitly rejected

- role-based access, role-based participants or role-based assignees;
- capability/scope union across grant rows;
- direct client writes to published versions, Action/cycle state, invitations, grants or audit;
- destructive correction or mutable audit history;
- a polymorphic participant table without an authoritative record FK;
- `EXPLICIT_GRANT` as a second standalone permission system;
- dual-write between `v2_*` and `winwin_*`;
- client-clock ordering, last-write-wins workflow transitions or hidden retry-created duplicates.

## 3. MVP authoritative entity model

### 3.1 Entity disposition

| Candidate entity | Purpose and authoritative owner | Minimum fields | Immutable / mutable | FK, uniqueness and lifecycle | Sensitivity | Phase |
|---|---|---|---|---|---|---|
| Foundation `winwin_actor_references` + account mapping | Resolve authenticated account to stable actor; Foundation-owned | Existing Foundation minimum only | Actor attribution immutable; mapping generations controlled | Exactly one current account→actor mapping; never grants Case access | Auth/pseudonymous identity | Upstream prerequisite |
| `winwin_identities` | Stable actor persona used by product authorization and attribution | identity ID, actor ref, type/subtype codes, status, created time | ID/actor immutable; retirement controlled | Actor FK; active identity uniqueness rules must not imply access | Identity/professional classification | MVP required |
| Foundation `winwin_cases` | Stable Case authority root | existing Case ID/lifecycle/creator facts | Case ID/creator immutable; lifecycle controlled | Product content requires an implementation-authorized collaborative lifecycle, not DRAFT alone | Case existence | Upstream prerequisite |
| `winwin_case_memberships` | Bind exact identity to Case participation | membership ID, identity ID, Case ID, relationship ID, status, valid from/until, source, created time, row version | identity/Case/source immutable; lifecycle/period only controlled | FK identity/Case; relationship same identity+Case; no membership-only access | Participation history | MVP required |
| `winwin_relationships` | Context of identity relative to Case; never a capability | relationship ID, identity ID, Case ID, type code, label/code, service period, status | identity/Case/type lineage immutable; end facts controlled | Composite same-scope uniqueness; membership references exact relationship | Relationship/service context | MVP required |
| `winwin_access_grants` | One auditable authorization proof unit | grant ID, grantee identity, membership, relationship, Case, purpose, one scope code, capability-code set, valid from/until, status, issuer, source, generation, created/revoked time, row version | grantee/path/source/generation immutable; revoke/end via controlled transition | Composite path FKs; source uniqueness; no partial-grant aggregation | Security-critical | MVP required |
| `winwin_invitations` | Typed, single-use proposal that can materialize relationship/membership/grant | invitation ID, recipient binding, Case, issuer/grant proof, proposed relationship/purpose/scope/capabilities, acceptance window, service period, status, credential hash/reference, consumed IDs, idempotency key | proposal immutable after issue; terminal state controlled | One credential; one successful consumption; consumed FKs unique | Access invitation; contact/token metadata | MVP required |
| `winwin_records` | Common record-level RLS and activity envelope | record ID, Case, record type, author identity/membership, visibility policy, server created/published times, last activity sequence, lifecycle, row version | Case/type/author/times immutable after publish; lifecycle/version only controlled | Author membership must match identity+Case; typed table 1:1 | Reveals content existence/author | MVP required |
| `winwin_record_access_designations` | Identity/membership-aware DIRECT_PARTICIPANTS or EXPLICIT_GRANT designation | record ID, identity ID, membership ID, designation kind, added by, server time | Append-only for published record; removal is a new controlled end fact if later needed | Unique record+identity+membership+kind; same Case via composite integrity | Participant association | MVP for direct participants; explicit designation may stage later |
| `winwin_care_updates` | Stable Care Update root and current published-version pointer | update/record ID, category, current version ID, version counter | category stable after publish; pointer/counter controlled | 1:1 record FK; current version must belong to update | Care collaboration metadata | MVP required |
| `winwin_care_update_versions` | Immutable published body/correction lineage | version ID, update ID, version number, body with bounded schema/text, occurred-at claim, server recorded time, author identity/membership, corrects version, reason, idempotency | Entire published row immutable | Unique update+version; linear predecessor; one idempotent publication result | Potential health/care content | MVP base; correction operation can stage second |
| `winwin_questions` | Stable Question and current state projection independent of Action | question/record ID, optional source update, status, row version, resolved time | source/asker inherited from record immutable; state controlled | 1:1 record; source same Case | Care content | Second-stage implementation; schema compatibility planned now |
| `winwin_question_events` | Append-only answer/resolution/reopen domain facts | event ID, question, event type, actor identity/membership, bounded answer text when applicable, previous/new state refs, server time, idempotency | Append-only | Unique question+idempotency; event payload allowed only for relevant type | Answer content | Second stage |
| `winwin_actions` | Stable Action, current workflow state and current-cycle pointer | action/record ID, optional source update/question, state, current cycle ID, row version, server created/updated times | sources/creator immutable; state/pointer only server-controlled | 1:1 record; source same Case; composite current-cycle integrity | Responsibility/work metadata | MVP required |
| `winwin_responsibility_cycles` | Exact assignee history for an Action | cycle ID, Action, assignee identity/membership, assigned-by identity/membership, status, assigned/accepted/started/completed/ended times, end reason, row version, idempotency | assignment facts immutable; ordered timestamps/status controlled | One open/current cycle per Action; same Case membership; no overlapping current cycle | Work attribution | MVP required |
| `winwin_read_cursors` | Since-last-view boundary per identity+membership+Case | identity, membership, Case, last visible sequence, server recorded time, row version | ownership immutable; sequence/time advance only | Unique identity+membership+Case; membership same identity+Case | Behavioral metadata | MVP required |
| `winwin_audit_events` | Minimum append-only security/domain mutation evidence and activity sequence source | event ID, Case, actor identity/membership, operation, target type/ID, optional cycle/grant proof, previous/new state refs, server time, correlation/idempotency, monotonic sequence | Fully append-only | Unique operation correlation/idempotency; target refs validated by transition | Security metadata; may reveal object existence | MVP required |

The model deliberately does not persist a Care Circle: it is a viewer-specific projection from current authorized Membership/Relationship/Grant facts.

### 3.2 Why the larger-looking set is still bounded

Question tables are not required for the first Action vertical slice, but their boundary is designed now because Actions may reference Questions and Batch 1 freezes their independence. Question implementation can be deferred. Care Update versioning is included from the start so the first published row does not create an overwrite-shaped schema that later needs destructive conversion. A generic IAM policy engine, organization hierarchy, delegation graph, notification system, clinical record system and read-receipt-per-record table are excluded.

## 4. Care Update persistence

### 4.1 Option review

| Option | Assessment |
|---|---|
| A. Stable update + separate immutable version table | **Selected.** Clear identity, linear correction history, simple current projection and student-MVP queries |
| B. Every correction is a replacement update row | Preserves append history but fragments stable links from Questions/Actions and complicates current-record resolution |
| C. Full event model | Auditable but requires replay/projection correctness beyond MVP needs |

### 4.2 Selected contract

Publication atomically creates `winwin_records`, `winwin_care_updates`, version 1 and an audit event. The server supplies author identity/membership, publication time and activity sequence. Client `occurred_at` is a bounded user claim and never replaces server time.

Correction locks the update, verifies the expected current version and `row_version`, inserts version N+1 pointing to N, advances the root pointer/counter, updates the record activity sequence and appends audit. Version rows are never updated or deleted. Family-authored and professional-authored published updates use the same integrity rule; UI templates may differ, but role does not weaken history.

Content should use a small reviewed column set or bounded text fields appropriate to the selected category. Do not copy a complete medical record, use unbounded JSON as truth, or make professional free text visible merely because an actor is professional.

## 5. Record visibility persistence

`winwin_records.visibility_policy_code` is one controlled policy value. Candidate vocabulary remains subject to Product review:

| Policy | Persistent auxiliary rows | Read rule |
|---|---|---|
| `AUTHOR_ONLY` | None | exact author identity+membership plus one matching grant path |
| `DIRECT_PARTICIPANTS` | participant designation rows | exact author or active designated identity+membership, plus one matching grant path |
| `CASE_SHARED` | None | complete Case grant with `CASE_SHARED` scope and `VIEW_RECORD` capability |
| `FAMILY_TEAM` | None | family relationship prerequisite plus complete matching grant |
| `PROFESSIONAL_TEAM` | None | professional-service relationship prerequisite plus complete matching grant |
| `EXPLICIT_GRANT` | explicit-grantee designation rows | exact designated identity+membership plus complete grant whose scope is `EXPLICIT_GRANT` |

The designation row is record targeting, not permission. `EXPLICIT_GRANT` still uses the ordinary `winwin_access_grants` path, so no second grant truth exists. AUTHOR_ONLY never requires a participant row. Participant identity and membership are server-derived/validated and must share the record Case; the client cannot spoof them through direct insert.

Visibility answers only `canView(record)`. Every mutation separately checks its operation capability, current record state and responsibility conditions.

## 6. Single Grant Path database mapping

A future private authorization helper may return one proof row containing `grant_id` rather than a boolean assembled from independent subqueries. Its logical pattern is:

```text
for one candidate grant G
  join exactly G.membership M
  join exactly G.relationship R
  require G.grantee_identity = authenticated selected identity
  require M.identity = G.grantee_identity = R.identity
  require G.case = M.case = R.case = target.case
  require M/R/G current at one server timestamp
  require G.status active and not revoked
  require G.purpose satisfies the operation/record purpose
  require G.scope satisfies the record policy
  require required capability is contained by G itself
return G.grant_id as proof
```

Scope and capability predicates must be correlated to the same `G` alias. It is forbidden to ask “does any grant have scope X?” and independently “does any grant have capability Y?”. If capability codes use an array for MVP compactness, membership is tested on that one grant row. If a later normalized capability table is adopted, the capability row must join through the same `grant_id`; query grouping must never union grants.

Unknown scope/capability/purpose, missing validity, unresolved identity, inactive/future membership, ended relationship or no complete path is deny. A successful decision supplies the exact grant ID to the transition and audit event.

## 7. RLS versus server-transition boundary

RLS remains defense in depth on every exposed table. High-risk writes revoke direct authenticated table privileges and require controlled server operations.

| Operation | Boundary | Reason |
|---|---|---|
| Select record/update/question/action | **RLS ONLY** for row eligibility; projection may use a reviewed view | Single-grant + record-policy predicate is row-local enough; domain payload projection may still be narrower |
| Select own Membership/Relationship/Grant terms | **RLS ONLY** | Exact actor identity and minimum self-service projection |
| Create/publish Care Update | **RLS + SERVER TRANSITION** | RLS verifies Case eligibility; server fixes author/time, creates envelope/version/audit atomically |
| Create/ask Question | **RLS + SERVER TRANSITION** | Source visibility plus typed record/event/audit transaction |
| Create/assign Action | **SERVER TRANSITION REQUIRED** | Target eligibility, cycle uniqueness, Action state and audit must be atomic |
| Accept Action | **SERVER TRANSITION REQUIRED** | Exact current assignee, state CAS, grant proof and audit |
| Start Action | **SERVER TRANSITION REQUIRED** | Exact accepted responsibility and ordered transition |
| Complete Action | **SERVER TRANSITION REQUIRED** | Action/cycle state agreement, retry safety and concurrent revoke handling |
| Reassign Action | **SERVER TRANSITION REQUIRED** | End old cycle + create new cycle + pointer/audit atomically |
| Resolve Question | **SERVER TRANSITION REQUIRED** | Independent domain authority and state event; resolver policy unresolved |
| Publish correction | **SERVER TRANSITION REQUIRED** | Immutable lineage, expected-head CAS and audit |
| Accept invitation | **SERVER TRANSITION REQUIRED** | Single-use credential and multi-entity materialization transaction |
| Revoke Grant/Membership | **SERVER TRANSITION REQUIRED** | Immediate authorization loss plus active-responsibility handling |
| Advance own cursor | **RLS + SERVER TRANSITION** | Ownership via RLS; server boundary and monotonic max semantics |
| Direct insert/update Responsibility Cycle, Audit Event or published version | **Denied** | Only their owning transition may write |
| Delegated accept/complete, supervisor completion, exact resolver/reassign authority | **PRODUCT DECISION REQUIRED** | Workflow authority cannot be invented by engineering |

The future RLS helper must live behind a reviewed private boundary that avoids policy recursion. If a definer-style helper is selected, its owner/bypass properties, fixed empty or allowlisted `search_path`, fully qualified relations, EXECUTE ACL, row-security behavior and exposed arguments require explicit security review. It must resolve `auth.uid()` through the current account→actor mapping and verify that any selected identity belongs to that actor; a client header or parameter cannot become identity truth. The helper returns only the minimum decision/proof and cannot expose grant inventories or turn table-owner bypass into general client access.

## 8. Server-authoritative transition contracts

Every operation authenticates account→actor, resolves selected identity, uses one database timestamp, locks in a documented global order, proves one grant, checks expected entity version/state, performs mutation plus audit atomically, and returns either the committed result or a stable error. No partial success is visible.

| Transition | Required proof and pre-state | Mutation + audit | Failure semantics |
|---|---|---|---|
| `assign_action` | active actor path with `ASSIGN_ACTION`; Action OPEN or explicitly reassignable; eligible target identity/membership; expected Action version | create ASSIGNED cycle, set Action ASSIGNED/current cycle, audit assignment | stale version, ineligible target or current-cycle conflict: rollback/conflict |
| `accept_action` | exact current assignee identity+membership; one grant with accept capability; Action/cycle ASSIGNED | cycle ACCEPTED/time, Action ACCEPTED/version, audit | non-assignee deny; stale/reassigned conflict; same idempotency returns original |
| `start_action` | exact accepted current assignee; start capability; both ACCEPTED | cycle/Action IN_PROGRESS, server time/version, audit | skipped state deny; retry stable |
| `complete_action` | exact in-progress current assignee; complete capability still current; both IN_PROGRESS | cycle/Action COMPLETED, server time/version, audit | revoked path or stale state deny; never resolves Question |
| `reassign_action` | exact future-approved reassign capability; current cycle not terminal; eligible next assignee; expected version | end old cycle REASSIGNED, create new ASSIGNED cycle, move pointer/state, audit | authority is Product decision; cycle conflict rolls back |
| `resolve_question` | future-approved resolver rule + `RESOLVE_QUESTION`; Question visible and resolvable; expected version | append RESOLVED event, update projection, audit | Action completion is not proof; stale/already resolved handled idempotently or conflict |
| `revoke_grant` | `REVOKE_ACCESS` proof within issuer authority; target current; expected grant version | revoke/end grant, append audit, apply approved active-cycle safe default atomically or enqueue a durable governed follow-up | cannot silently leave transition half-applied; exact continuity policy required before implementation |
| `publish_correction` | approved correction authority; current visible update; expected head/version | append immutable version, move head, activity sequence, audit | head mismatch conflict; no overwrite |

Error classes should distinguish unauthenticated, no complete grant, hidden/not found, invalid state, stale version, idempotency conflict and internal atomic failure without leaking inaccessible object existence.

## 9. Responsibility Cycle persistence and invariants

`winwin_actions.current_responsibility_cycle_id` is a controlled current pointer; every cycle also holds `action_id`. This is deliberate, bounded duplication for efficient state checks, protected by:

- unique `(action_id, cycle_id)` on cycles and a composite FK candidate from the Action pointer to the same Action;
- a partial uniqueness candidate allowing at most one non-ended/current cycle per Action;
- one transaction and lock order for closing old cycle, inserting new cycle and changing the pointer;
- exact assignee identity+membership with same-Case composite integrity;
- server-recorded `assigned_at`, `accepted_at`, `started_at`, `completed_at`, `ended_at` and state-compatible checks;
- immutable ended cycles.

Action state is the workflow projection, while cycle state is responsibility history. OPEN can exist without a cycle. ASSIGNED/ACCEPTED/IN_PROGRESS must point to the one compatible current cycle. COMPLETED must point to a COMPLETED cycle. Cross-table agreement cannot be safely guaranteed by a simple row check alone; the transition owns it, while constraints prevent structurally impossible references and direct writes are denied.

## 10. Concurrency model

Use a consistent lock order: resolve/lock relevant membership+grant proof, then Action, then current cycle; invitation acceptance locks the invitation first because it has no existing Case membership proof. Within that order use row locks for multi-row invariants, expected `row_version` for stale-client detection, unique constraints for final race defense, and operation idempotency keys for retry identity.

| Race | Control and outcome |
|---|---|
| Two actors accept one Action | Lock Action/current cycle; CAS `ASSIGNED` + expected version + exact assignee. One commits; other returns same result only with same idempotency key, otherwise stale-state conflict |
| Accept versus reassign | Both lock Action/current cycle in same order. One commits; loser rechecks and fails stale state/version. No accepted old cycle after reassignment |
| Complete versus grant revoke | Both lock relevant grant/membership before Action/cycle. If revoke wins, completion has no valid proof. If completion wins, completed attribution remains and revoke applies afterward without rewriting history |
| Duplicate complete | Unique operation idempotency + locked state. Same key returns original completion; different key after terminal state returns already-completed/stale result without new audit |
| Duplicate invitation accept | Lock invitation; unique credential and source-invitation materialization constraints. Same key returns original IDs; competing identity/key cannot create another path |
| Concurrent cursor advances | Atomic upsert with `max(stored, supplied server boundary)`; regression is impossible and equal boundary is idempotent |

Long-running business work never holds a transaction open. Only each short transition is atomic. Deadlock/serialization failures are retryable only with the same idempotency key and bounded retry policy.

## 11. Idempotency contract

Invitation accept, Action assign/accept/start/complete/reassign, Question resolution, correction publication, revocation and audit creation require a client-generated opaque operation key bound server-side to actor, operation, target and normalized request fingerprint. Reusing a key with different parameters is an idempotency conflict, never “return first result”.

Cursor advancement is naturally idempotent by monotonic max and does not require a separate operation row for MVP. Audit is not independently retried: it is inserted in the owning transaction with a unique correlation to that transition. Membership, grant, cycle, version and event source/idempotency uniqueness provide final duplicate defense.

A generic idempotency table can be deferred if each owning entity/event has sufficient unique keys. Add one only when response replay across heterogeneous transitions is concretely required.

## 12. Invitation materialization

Future acceptance is one transaction:

1. authenticate actor/selected recipient identity;
2. lock invitation by credential hash/reference without exposing raw credential;
3. require PENDING status, exact recipient binding and server time inside invitation acceptance window;
4. validate proposal vocabulary and issuer authority captured at issuance;
5. idempotently create exact typed relationship;
6. create membership as `WAITING_START` when service `valid_from` is future, otherwise ACTIVE if all activation prerequisites pass;
7. create exactly the proposed purpose/scope/capabilities/validity grant linked to that membership/relationship;
8. mark invitation accepted and store materialized IDs;
9. append audit events under one correlation/idempotency reference;
10. commit all or none.

`WAITING_START` fails authorization helpers. Service activation occurs at server time when `valid_from` is reached and all current membership/relationship/grant/verification conditions pass. A scheduled status update may improve UX but cannot be the authority: authorization always compares the database clock and effective period. If activation requires a written state change, it must be idempotent and audited; missing scheduler execution must fail closed, not grant early access.

## 13. Revocation and continuity

### Safe technical default

- The revoked grant stops satisfying reads and operations immediately at the authoritative transaction/database-clock boundary.
- Published/completed content, authorship, completed responsibility and audit history remain immutable.
- If that grant is required by a current assignee, end the active cycle with `ACCESS_REVOKED`, preserve all prior timestamps, retain the Action and expose a `NEEDS_REASSIGNMENT` projection to separately authorized actors.
- Do not auto-select a replacement and do not let the former assignee mutate the Action after revocation.
- A completed cycle stays completed; revocation does not rewrite past authority.
- Notification delivery is not authorization and failure to notify cannot restore access.

### Product decisions required

Before implementing revocation with active work, Product must decide who may reassign, whether an Action remains in its prior business state or explicitly becomes `NEEDS_REASSIGNMENT`, urgency/escalation expectations, notification MVP scope, and continuity handling when no eligible replacement exists. Engineering must not infer these from “manager” labels.

## 14. Read Cursor persistence

One Case-level cursor per identity+membership+Case is sufficient for the MVP vertical slice. It tracks the visible Case activity projection, not every record receipt. The monotonic boundary is the server-issued audit/activity sequence attached to visible domain changes; global sequence gaps are harmless.

Cursor ownership includes membership to prevent a replaced membership from inheriting visibility history accidentally. Safe default: a new membership starts a new cursor. Whether a re-invited same identity should inherit the prior cursor remains a Product choice and can be deferred; automatic inheritance is forbidden.

The cursor update accepts only a boundary returned by the server for that actor's visible projection and stores `max(current, boundary)`. RLS limits rows to exact identity/membership; the server validates the boundary and database time. Cursor deletion/rewind is not an ordinary client operation.

## 15. Audit Event persistence

`winwin_audit_events` is append-only and direct client update/delete is denied. Minimum fields are event ID, Case, actor identity/membership context, operation, target type/ID, optional responsibility cycle, authorizing grant proof, previous/new state references, server timestamp, monotonic activity sequence and correlation/idempotency reference.

Previous/new state references are identifiers/version numbers or bounded state codes, not copied sensitive payloads. The owning transition writes audit atomically; an audit insert failure rolls back the business mutation. Read access to audit is narrower than content visibility and must not be exposed merely to implement the cursor. Operational retention, legal export and privileged security review are later policy work.

## 16. Question persistence

Use a stable `winwin_questions` row for source/state projection and append-only `winwin_question_events` for answer, resolution and possible reopen facts. An answer needs an event because there may be multiple answers and each needs author/time/content attribution. Full event sourcing is unnecessary: the Question row keeps the guarded current state and version.

The Question uses the common record envelope for author/visibility/participants. Optional source update must share the Case. `resolve_question` appends its own event/audit and updates only Question state. Action completion never invokes it implicitly.

## 17. Migration 007–008 authority and cutover

- Migration 001–008 remain byte-unchanged.
- Existing 007–008 `v2_*` objects are reference/candidate material and are not an expansion base for future Product authority.
- Future Product schema is additive under the separately reviewed `winwin_*` authority after Foundation prerequisites.
- Before cutover, the application must not write the same authoritative fact to both paths.
- Perform an action-time inventory of relevant legacy rows before any mapping or cutover.
- Zero relevant rows makes **no bridge** the preferred candidate.
- Existing relevant rows require a separately reviewed, one-way, idempotent, fail-closed mapping with count/semantic verification; ambiguous rows remain unmapped and unauthorized.
- Cutover selects one authoritative write/read path. Rollback disables the cutover/bridge without deleting historical source rows.

This document neither proves zero rows nor approves the bridge, schema, migration ordering or cutover.

## 18. Table / policy authority map

| Entity | Authoritative source | Writes by | Reads controlled by | Server transition? | Audit required? |
|---|---|---|---|---|---|
| Identity | account→actor + reviewed identity facts | controlled identity operation | exact actor/minimum projection | Yes for lifecycle | Yes |
| Membership | accepted invitation/governance operation | invitation/access transition | exact own terms or authorized Case operation | Yes | Yes |
| Relationship | typed invitation/governance operation | invitation/access transition | minimum needed for grant/record decision | Yes | Yes |
| Grant | typed issuer decision/materialized invitation | grant/access transition | own terms + private authorization helper | Yes | Yes |
| Record envelope | domain publish transition | Care Update/Question/Action transition | record visibility RLS | Yes for create/lifecycle | Yes |
| Care Update/version | publish/correction transition | controlled domain operation | record visibility RLS + payload projection | Yes | Yes |
| Question/event | ask/answer/resolve transition | controlled domain operation | record visibility RLS | Yes | Yes |
| Action | Action transition | controlled domain operation | record visibility RLS | Yes | Yes |
| Responsibility Cycle | Action assignment/transition | controlled Action operation only | Action visibility + minimum assignee view | Yes, always | Yes |
| Invitation | typed issue/accept/revoke operation | controlled access operation | recipient/issuer minimum view | Yes, always | Yes |
| Read Cursor | visible-activity cursor operation | exact actor via server max-upsert | exact identity+membership | Yes for boundary validation | No separate audit for routine advance |
| Audit Event | owning transition | server transition only | privileged/minimized policy | Written inside transition | It is the audit |

## 19. RLS threat model

| Threat | Future enforcement layer |
|---|---|
| Same role, different identity reads AUTHOR_ONLY | record RLS exact author identity+membership + single grant helper |
| Same role impersonates assignee | server transition exact current cycle assignee + RLS/direct-write denial |
| Membership exists without grant | helper requires one complete current grant row |
| Two partial grants combined | same-grant correlated query and tests; never independent EXISTS predicates |
| Expired grant | database-clock validity in helper |
| Revoked grant | status/revoked time in helper; grant transition lock |
| Future service before start | membership/relationship/grant effective-time checks; WAITING_START denied |
| Removed membership | status/end-time check; no historical-membership fallback |
| Participant list spoof | no direct designation writes; same-Case identity+membership composite FK/transition validation |
| Client-supplied author ID | server derives selected identity/membership; publish ignores client author |
| Client-supplied timestamp | database clock supplies recorded/published/transition time |
| Direct Action state update bypass | revoke table UPDATE privilege; controlled transition + row constraints/RLS defense |
| Direct responsibility-cycle insert | revoke direct INSERT; composite/partial uniqueness; transition only |
| Audit tampering | append-only ACL/RLS; no client UPDATE/DELETE; atomic owning transaction |
| Cursor reads another identity | exact identity+membership RLS and unique ownership key |

Design-level tests must cover each threat with at least deny/allow controls and must include query-shape regression proving no grant aggregation.

## 20. Database invariant candidates

### Foreign/composite keys

- every Membership, Relationship, Grant, Record, designation, domain object, cycle, cursor and audit row references the same Case scope;
- grant grantee identity equals membership identity; membership relationship equals exact relationship identity+Case;
- record author identity+membership match; designations and assignees match identity+membership+Case;
- typed record tables reference one record envelope of the matching type;
- update versions/corrections, Question sources and Action sources stay in the same Case;
- Action current cycle references a cycle belonging to that Action.

### Unique/index candidates

- one current account→actor mapping under Foundation rules;
- controlled active membership/relationship generation uniqueness, without assuming one lifetime membership;
- grant source+generation and invitation materialization uniqueness;
- record+identity+membership+designation-kind uniqueness;
- update+version number and linear correction-head uniqueness;
- one non-ended responsibility cycle per Action;
- identity+membership+Case cursor uniqueness;
- operation target+idempotency uniqueness and audit correlation uniqueness.

### Check/immutability candidates

- valid periods are ordered; terminal states require terminal server timestamps;
- capability set nonempty and vocabulary-controlled; missing/unknown is deny, never wildcard;
- visibility/designation shape is consistent (`AUTHOR_ONLY` requires no rows; participant policies require appropriate rows);
- responsibility timestamps follow assigned ≤ accepted ≤ started ≤ completed/ended;
- published versions, ended cycles and audit events are immutable;
- current Action/cycle state changes only through controlled transition;
- cursor boundary never decreases; database max-upsert is authoritative;
- no direct client mutation of server-derived identity, time, author, proof or version columns.

A “one active grant per identity/scope” constraint is not adopted globally: multiple grants may legitimately differ by purpose, issuer or period. Authorization must select one complete row, and overlapping-grant policy can be tightened only after real requirements.

## 21. Product Decision Register

| Decision | Classification | Safe engineering position until decided |
|---|---|---|
| Reassignment authority | **MUST DECIDE BEFORE BATCH 2 IMPLEMENTATION** of Action reassignment/revocation | No blanket manager rule; deny reassign without explicit approved capability rule |
| Question resolution authority | **MUST DECIDE BEFORE BATCH 2 IMPLEMENTATION** of Question resolution | Resolution unavailable; answers remain independent |
| Published correction authority | **MUST DECIDE BEFORE BATCH 2 IMPLEMENTATION** of correction | Preserve version schema; do not expose correction operation |
| Final capability vocabulary | **MUST DECIDE BEFORE BATCH 2 IMPLEMENTATION** of grant/RLS schema | Batch 1 names are design candidates, unknown values deny |
| Final scope vocabulary | **MUST DECIDE BEFORE BATCH 2 IMPLEMENTATION** of record RLS schema | Implement only explicitly reviewed MVP policies |
| Revocation state/continuity behavior | **MUST DECIDE BEFORE BATCH 2 IMPLEMENTATION** of active-work revocation | Immediate access loss; preserve history; no auto-transfer |
| Delegated responsibility | **CAN DEFER UNTIL VERTICAL SLICE** | MVP exact current assignee only; no delegation |
| Supervisor completion | **CAN DEFER UNTIL VERTICAL SLICE** | MVP exact current assignee only; supervisor cannot complete for another identity |
| Cursor membership replacement | **CAN DEFER UNTIL VERTICAL SLICE** | New membership gets new cursor; no inheritance |
| Revocation notification | **CAN DEFER UNTIL VERTICAL SLICE** | Not an authorization dependency; MVP may show reassignment queue without delivery system |
| Continuity escalation/urgency workflow | **FUTURE DEVELOPMENT** after safe revocation minimum | No inferred clinical escalation; retain visible unresolved Action for authorized users |
| Rich organization/delegation hierarchy | **FUTURE DEVELOPMENT** | Excluded from MVP IAM model |

These unresolved workflow decisions do not create an architecture conflict: the schema/transition boundaries fail closed and allow the affected operation to remain unimplemented until Product review.

Accordingly, this design is complete enough for an **implementation authorization review**, but that review must close the `MUST DECIDE` items for every operation it proposes to authorize. “Design review pass” must not be read as permission to implement.

## 22. MVP / Second Stage / Future

### MVP required for first formal vertical slice

- upstream active Foundation actor/identity/Case authority;
- Membership, Relationship and single-row Grant path;
- typed invitation acceptance sufficient to create that path;
- record envelope and participant/designation support needed by selected MVP visibility policies;
- Care Update root/version 1 publication;
- Action and Responsibility Cycle assign/accept/start/complete;
- Case-level cursor and server activity sequence;
- append-only audit and idempotent server transitions;
- SELECT RLS plus direct-write denial and transition-only mutations.

### Second stage

- Care Update correction operation using the already-compatible version model;
- Question/answer/resolution implementation;
- reassign and active-work revocation after Product decisions;
- `EXPLICIT_GRANT` if not selected for the first visibility vocabulary;
- richer audit review/retention and user-facing access history;
- notification after its workflow is defined.

### Future

- delegation/supervisor hierarchy;
- organization-level administration and policy templates;
- regulated clinical signing/co-signing;
- advanced legal export/retention, analytics and cross-Case operations;
- per-stream/per-record receipts only if Case-level cursor proves insufficient.

## 23. Privacy and data minimization

| Entity group | Minimum sensitive data retained | Explicit exclusions |
|---|---|---|
| Identity/Relationship | opaque IDs, bounded display/type/service context only when operationally required | credentials, identity documents, unrelated contacts, cross-Case profiling |
| Invitation | recipient binding/credential hash, typed access terms and periods | raw token, unnecessary address book/contact replication |
| Record/Care Update/Question | care-continuity content, author/participants, source and visibility | complete external medical chart, diagnostic expansion, GPS, psychological profiling |
| Action/Cycle | responsibility identity, state, timestamps and reason category | staff performance profile, unrelated employment data, location tracking |
| Cursor | one boundary per identity+membership+Case | per-record surveillance/read-receipt history |
| Audit | IDs, operation, state/version refs, proof/correlation and server time | copied content body, raw credential, broad client/device telemetry |

RLS must prevent existence leaks through counts, joins and error messages. Operational/admin access to sensitive metadata needs narrower policy than ordinary Case content. Retention and Taiwanese legal/professional obligations require separate policy verification; this design does not invent them.

## 24. Implementation authorization entry checklist

Before any repository migration or SQL is authorized, review must freeze:

1. selected MVP capability and scope vocabulary;
2. exact upstream Foundation lifecycle/cutover prerequisites;
3. table/column/constraint names and private helper ownership/search path/ACL model;
4. single-grant query shape and deny-case tests;
5. server transition API, lock order, versions and idempotency semantics;
6. required Product decisions for the operations entering the slice;
7. legacy row inventory and no-bridge/one-way mapping decision;
8. RLS threat-test matrix, audit atomicity and privacy projections;
9. explicit separate authorization for migration-file creation and later runtime gates.

Until then this artifact is review input only.
