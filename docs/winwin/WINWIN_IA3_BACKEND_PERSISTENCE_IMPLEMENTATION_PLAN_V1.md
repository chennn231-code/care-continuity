# WinWin IA-3 Backend / Persistence Implementation Plan V1

Status: **IA-3 planning checkpoint — implementation-ready design only; no migration, SQL, RLS, runtime, deployment, or production authorization**

Date: 2026-08-30

Authoritative IA-2 application-seam checkpoint: `87a6656a792580c121ebd982f0fa1f70ef1e49b3`

Primary first slice:

```text
Login
→ Case
→ Care Update
→ Action creation and exact-participant assignment
→ Accept
→ Start
→ Complete
→ Activity / Audit
→ Read Cursor
```

## 1. Authority, inputs, and planning boundary

This plan reconciles, without reopening their product decisions:

1. `WINWIN_PRODUCT_AUTHORIZATION_DOMAIN_CONTRACT_V1.md`;
2. `WINWIN_PRODUCT_BACKEND_RECORD_AUTHORIZATION_DESIGN_V1.md`;
3. `WINWIN_MVP_VERTICAL_SLICE_IMPLEMENTATION_PLAN_V1.md`;
4. `WINWIN_PRODUCT_AUTHORIZATION_WORKFLOW_DECISIONS_V1.md`;
5. `WINWIN_MVP_IMPLEMENTATION_AUTHORIZATION_REVIEW_V1.md`;
6. the adopted IA-2 contracts and tests under `app/src/v2/**` and `app/tests/**` at `87a6656a792580c121ebd982f0fa1f70ef1e49b3`.

Later frozen workflow decisions take precedence over earlier candidate vocabulary. The authoritative target vocabulary is:

- capabilities: `RECORD_VIEW`, `CARE_UPDATE_CREATE`, `CARE_UPDATE_CORRECT`, `ACTION_*`, `QUESTION_*`, and `ACCESS_*` as frozen per operation;
- Grant target scopes: exactly `CASE` and `RECORD`;
- first-slice visibility policies: `AUTHOR_ONLY`, `DIRECT_PARTICIPANTS`, and `CASE_SHARED`;
- exact participant reference: Logical Identity plus Membership lifecycle instance;
- one complete Grant Path per authorization decision, with no cross-Grant stitching.

The existing application marker `DEMO_NON_AUTHORITATIVE` remains accurate. In particular, any demo behavior that constructs an in-memory Grant for a future-start Membership is not persistence authority. The backend design in this plan is fail closed: **no active Grant row or capability/scope mappings exist until every activation prerequisite is satisfied**.

This document chooses logical entity boundaries, minimum facts, invariant placement, command boundaries, concurrency behavior, privacy treatment, migration direction, implementation order, and future evidence. It contains no executable database definition.

## 2. Frozen backend truth model

Every protected decision follows this chain at one authoritative database/server time:

```text
authenticated Physical Actor / account link
→ selected Logical Identity
→ exact current Case Membership lifecycle instance
→ exact current Relationship lifecycle instance
→ one complete current Grant lifecycle instance
→ CASE or RECORD scope on that Grant
→ typed Record Visibility or exact effective Responsibility Cycle
→ operation-specific capability on the same Grant
→ atomic mutation and Audit Event
```

Membership, Relationship, profession, family label, manager label, current role, historical responsibility, or visibility alone never authorizes an operation. The client never supplies authoritative Identity, Membership, Grant proof, author, assignee authority, state, server time, activity order, or cursor boundary.

### 2.1 Authoritative, mutable, and derived facts

| Classification | Facts |
|---|---|
| Immutable authoritative facts | lifecycle instance IDs and bindings; Case and Identity references; Grant issuer/source/purpose/terms; capability and scope membership; published Care Update versions and correction lineage; Action creator/source; Responsibility Cycle assignment facts; transition history; invitation proposal terms; activity events; audit events; idempotency request fingerprints |
| Narrow mutable authoritative state | command receipt completion; invitation pending-to-terminal disposition; Responsibility Cycle ordered transition fields; cursor maximum boundary; controlled terminal lifecycle facts where represented by a terminal event/reference |
| Derived, never authoritative | current Membership/Relationship/Grant effectiveness at server time; current Care Update version; current responsible participant; Action workflow label; `NEEDS_REASSIGNMENT`; allowed operations; unread count; Care Circle; display roles/names; current activity boundary; Case list badges |

Membership, Relationship, and Grant lifecycle bindings are immutable. Activation, suspension, revocation, expiry, or closure is recorded as controlled lifecycle evidence; an ended instance never becomes effective again. Rejoin, replacement, or regrant creates a new opaque lifecycle instance. No numeric generation counter is required.

## 3. Authoritative entity inventory

Names are the IA-3 implementation direction. IA-4 may refine helper/function names and security ownership, but must not change these logical truths or introduce a second source of authority.

### 3.1 Identity, Case, and access entities

| Entity / planned persistence | Purpose and authority | Minimum key and facts | Immutability / lifecycle | Foreign keys and semantics | Sensitivity / deletion | Slice |
|---|---|---|---|---|---|---|
| Physical Actor and account link — Foundation `winwin_actor_references` and `winwin_account_actor_links` | Resolve the authenticated account to the stable physical subject backing a Logical Identity. Never grants Case access. | Opaque actor reference; account-link instance; provider account reference; validity/terminal facts | Stable actor attribution immutable; account-link lifecycle controlled upstream | Authenticated account must resolve through exactly one current account-link instance | Authentication metadata; never expose provider topology. Retain attribution; do not hard-delete referenced links | MUST HAVE, upstream prerequisite |
| Logical Identity — logically backed by the stable Foundation actor reference for MVP | Stable authorization subject distinct from request-scoped Actor Context | Identity ID equal to or mapped one-to-one from the controlled actor reference; minimum display projection stored separately | Stable and immutable. A separate `winwin_identities` table is not required unless Foundation mapping cannot safely express the logical layer | Referenced by Membership, Grant, author, participant, assignee, cursor, activity, and audit facts | Pseudonymous identity. Retain referential attribution; redact display data separately where policy permits | MUST HAVE logically |
| Care Receiver / Case — Foundation `winwin_cases`, `winwin_person_references`, and `winwin_care_recipient_roles` | Stable collaboration boundary and minimum receiver association | Case ID; lifecycle; creator/owner facts; one same-Case care-recipient role | Case identity immutable; lifecycle controlled. Recipient role is not authorization | All Product entities carry the same Case boundary. Care receiver is not automatically an actor or access subject | Case existence and receiver association are sensitive. Archive/close rather than cascade-delete history | MUST HAVE, upstream prerequisite |
| `winwin_case_memberships` | One exact Identity participation lifecycle instance in one Case | Membership ID; Identity ID; Case ID; source; valid-from/valid-until; created server time | Binding and validity intent immutable. Lifecycle changes are controlled and never reactivate an ended instance | Exact Identity+Case. Membership existence alone grants nothing | Participation history. Retain after closure; no cascade deletion from ordinary account removal | MUST HAVE |
| `winwin_membership_lifecycle_events` | Append-only evidence for waiting, activation, suspension, revocation, expiry, or closure | Event ID; Membership ID; event kind; server time; actor/correlation; reason category | Append-only. Current effectiveness derived from ordered events plus validity interval | Same Membership and Case through controlled writer | Security and relationship metadata. Retain with Membership; narrowly readable | MUST HAVE |
| `winwin_case_relationships` | Explain why the exact Membership participates; never a capability | Relationship ID; Membership ID; Identity ID; Case ID; controlled type/label; purpose/period | Binding immutable. Replacement/change creates a new instance | Composite alignment with Membership Identity+Case | Family/service context is sensitive. Retain minimum history; do not store unrelated family details | MUST HAVE |
| `winwin_relationship_lifecycle_events` | Append-only activation/closure evidence for the Relationship instance | Event ID; Relationship ID; event kind; server time; actor/correlation; reason category | Append-only; an ended relationship never reopens | Same Membership/Identity/Case path | Sensitive service context; restricted reads and historical retention | MUST HAVE |
| `winwin_grants` | One complete auditable authorization proof lifecycle instance | Grant ID; grantee Identity; Membership; Relationship; Case; issuer Identity/Membership where applicable; purpose; valid interval; source type/ID; created server time | Path, source, purpose, and validity intent immutable. No pending Grant is created. Regrant creates a new row | Composite same-Identity, same-Membership, same-Relationship, same-Case alignment | Security-critical. Ordinary clients receive no Grant inventory. Retain ended Grants | MUST HAVE |
| `winwin_grant_capabilities` | Immutable capability set belonging to one Grant | Grant ID + controlled capability key | Immutable with the Grant; unknown key denies | Capability predicates always correlate to this exact Grant ID | Security-critical; no ordinary broad listing | MUST HAVE |
| `winwin_grant_scopes` | Immutable `CASE` or `RECORD` target ceiling belonging to one Grant | Grant ID + scope key; optional typed target qualifier only if later proven necessary | Immutable with the Grant | Scope is not visibility, role, or capability | Security-critical; no Grant inventory exposure | MUST HAVE |
| `winwin_grant_lifecycle_events` | Append-only activation evidence and terminal revoke/suspend/expire facts | Event ID; Grant ID; event kind; server time; actor/correlation; reason category | Append-only. First event is activation; terminal instances never reactivate | Controlled access command; same Case | Security-critical. Retain for audit and historical proof | MUST HAVE |

### 3.2 Record, work, and coordination entities

| Entity / planned persistence | Purpose and authority | Minimum key and facts | Immutability / lifecycle | Foreign keys and semantics | Sensitivity / deletion | Slice |
|---|---|---|---|---|---|---|
| Record Visibility — typed columns plus typed participant rows | Narrow a protected record independently from Grant scope/capability | Visibility policy on the typed record/version; exact Identity+Membership participant rows only where `DIRECT_PARTICIPANTS` requires them | Published visibility facts immutable with the record version. Audience change requires a reviewed successor, not silent mutation | Participant refs must belong to the same Case and exact Membership lifecycle | Reveals association to care content. Restrict reads; retain with immutable record history | MUST HAVE for selected policies |
| `winwin_care_updates` | Stable logical Care Update/source envelope | Care Update ID; Case; category; source metadata; initial author Identity+Membership; optional occurred-at claim; created server time | Stable object identity and author/source facts immutable after publication | Same-Case author Membership; no generic record supertype | Care-content existence is sensitive. Archive only under later retention policy; no destructive correction | MUST HAVE |
| `winwin_care_update_versions` | Immutable published content and correction lineage | Version ID; Care Update ID; ordinal; content; visibility; author/correcting Identity+Membership; recorded server time; occurred-at claim; predecessor; reason; idempotency correlation | Entire published version append-only. Version 1 has no predecessor; correction is successor | Envelope+ordinal unique; predecessor belongs to same Care Update; at most one successor per predecessor | Potential health/care content. Payload accessible only through record authorization; never copied to audit | MUST HAVE for version 1; correction command SECOND STAGE |
| `winwin_care_update_version_participants` | Exact `DIRECT_PARTICIPANTS` audience for one immutable version | Version ID + Identity ID + Membership ID + designation kind | Append-only with the version | Same Case and lifecycle exactness | Sensitive association. No generic polymorphic audience table | MUST HAVE only when that policy is used |
| `winwin_actions` | Stable work object independent from assignee and Question | Action ID; Case; creator Identity+Membership; title/reason; optional due claim; visibility policy; optional source Care Update version; created server time; idempotency correlation | Creator, source, core work identity, and creation facts immutable. No authoritative current status, assignee, or cycle pointer | Typed optional source must be same Case. Creator is exact participant | Responsibility/work metadata. Retain after completion; future archival may hide but not erase history | MUST HAVE |
| `winwin_responsibility_cycles` | Sole authoritative current and historical responsibility truth | Cycle ID; Action; Case; assigner and assignee Identity+Membership; state; assigned/accepted/started/completed/ended server times; end reason; row version | Assignment facts immutable. State advances only through guarded commands. Ended/completed cycles immutable | Same-Case composite FKs for Action, assigner, assignee. At most one effective non-ended cycle per Action | Work attribution. Retain permanently under eventual policy; never rewrite former assignee | MUST HAVE |
| `winwin_action_transition_events` | Append-only transition/history evidence understandable without reconstructing audit internals | Event ID; Action; Cycle; transition kind; actor Identity+Membership; previous/new bounded state; server time; activity correlation | Append-only and written atomically with the cycle transition | Exact Cycle/Action/Case | Sensitive work history. Authorized Action projections only | MUST HAVE |
| `winwin_questions` | Stable Question identity independent from Action | Question ID; Case; exact asker; optional typed source; visibility; bounded question content; created server time | Published question immutable; current resolution not stored as a mutable status truth | Typed source and optional linked Action are same-Case; Action completion never changes Question | Care/family content. Protected record policy; no destructive delete | SECOND STAGE |
| `winwin_question_answers` | Immutable answer facts with exact authorship | Answer ID; Question; author Identity+Membership; content; server time | Append-only | Same Question/Case and authorized source visibility | Potential care content; minimized and protected | SECOND STAGE |
| `winwin_question_decisions` | Append-only resolve/reopen decisions | Decision ID; Question; decision kind; actor Identity+Membership; server order/time; reason category | Append-only; current resolution derived from the latest valid order | Question same-Case; independent from Action state | Sensitive workflow metadata; restricted with Question | SECOND STAGE |

### 3.3 Invitation, access, cursor, activity, and audit entities

| Entity / planned persistence | Purpose and authority | Minimum key and facts | Immutability / lifecycle | Foreign keys and semantics | Sensitivity / deletion | Slice |
|---|---|---|---|---|---|---|
| `winwin_invitations` | Typed single-use proposal for future access lifecycle instances | Invitation ID; Case; exact recipient binding; issuer proof; immutable relationship/purpose/scope/capability proposal; acceptance/service windows; credential digest/reference; state; materialized IDs; idempotency correlation | Proposal immutable after issue. Pending may move once to accepted/declined/revoked/expired. Acceptance cannot be repeated | Same Case; recipient and issuer exact. Raw credential never stored | Contact/binding and security metadata. Expire credential; retain minimized proposal and terminal evidence | SECOND STAGE unless onboarding is pulled into the selected slice |
| `winwin_invitation_capabilities` and `winwin_invitation_scopes` | Preserve exact proposal terms without inferring recipient type or role | Invitation ID + proposed capability/scope | Immutable after issuance | Copied exactly into a new active Grant only after prerequisites pass | Security proposal; restricted to recipient/authorized issuer projections | SECOND STAGE |
| Access activation — transactional command, not a second authority table | Create effective Membership/Relationship/Grant lifecycle evidence from approved terms | Command receipt, created lifecycle IDs, audit references | Atomic and idempotent; no partial activation | Exact recipient and proposal; no role/type inference | Security-critical operation evidence retained through lifecycle/audit rows | SECOND STAGE; prerequisite design frozen |
| Access revocation — transactional command, not a second authority table | Immediately invalidate one exact lifecycle path and close affected active responsibility | Target lifecycle ID; revoker proof; server time; reason; correlated cycle/event IDs | Atomic; history preserved; no replacement selected | Same Case; issuer authority; affected cycles matched by exact Identity+Membership path | Security and work continuity. No hard deletion | MUST HAVE command prerequisite; UI SECOND STAGE |
| `winwin_read_cursors` | Last-view state for one exact participation lifecycle | Identity ID + Membership ID + Case ID key; maximum activity sequence; last server-recorded time; row version | Owner key immutable. Boundary only increases by atomic maximum | Membership Identity+Case composite alignment. New Membership starts a new row | Behavioral metadata. No per-record receipts; delete only under later retention policy | MUST HAVE |
| `winwin_case_activity_events` | User-facing domain activity source and authoritative Case ordering | Activity ID; Case; monotonic Case sequence; event kind; typed target ID; actor Identity+Membership; server time; minimized rendering data/reference; visibility source | Append-only. Sequence allocated by database/server transaction | Typed target same-Case; filtered through current target visibility | Can reveal care activity. Payload minimized; ordinary users never see hidden global gaps | MUST HAVE |
| `winwin_audit_events` | Append-only security/domain mutation evidence | Audit ID; Case; account-link/physical Actor; Logical Identity; Membership; operation; allow-listed target type/ID; optional version/cycle; before/after refs; server time; correlation/idempotency | Fully append-only; mutation fails if audit cannot be written | Controlled writer validates target existence and same Case | Highly sensitive security metadata. Narrower than content access; no payload copies | MUST HAVE |
| `winwin_audit_event_grant_proofs` | Preserve exact Grant proof(s), including separate mutation and linked-source-read decisions | Audit ID + proof kind + Grant ID | Append-only | Each proof is complete for its own decision; no predicate borrowing | Exposes authorization topology; privileged audit readers only | MUST HAVE |
| `winwin_command_receipts` | Enforce mutation idempotency and stable replay | Actor/Identity, operation, target or create scope, opaque operation key, normalized request hash, status, result reference, server time | Request identity/hash immutable; status completed atomically with result | Unique actor+operation+key; different hash is conflict | May reveal operation existence; no sensitive payload copy | MUST HAVE |
| `winwin_case_sequence_allocators` | Allocate authoritative monotonic activity order per Case | Case ID; next/last allocated sequence | Narrow mutable counter under transaction lock | One row per Case | Operational metadata; never exposed as global counts | MUST HAVE |

### 3.4 Explicit authority disposition

- Foundation Actor/account-link, Logical Identity, Case/care-recipient facts are **AUTHORITATIVE UPSTREAM FACTS**.
- Membership, Relationship, Grant, capability/scope mapping, lifecycle event, visibility, Care Update/version/participant, Action, Responsibility Cycle, Action transition, Question/answer/decision, Invitation/proposal, Read Cursor, Activity Event, Audit Event/proof, command receipt, and Case sequence rows are **AUTHORITATIVE PERSISTED FACTS** within their stated stage.
- Access activation and revocation are **AUTHORITATIVE TRANSACTIONAL OPERATIONS** whose results are the lifecycle, responsibility, activity, and audit facts above; they are not additional state tables.
- Current access effectiveness, current content head, current responsibility, Action state label, continuity gap, allowed operation, unread count, Care Circle, display identity/role, and user-facing feed composition are **NON-AUTHORITATIVE DERIVED DATA**.

### 3.5 Deletion and archival defaults

- Physical Actor/account-link and Case/care-recipient records follow the upstream Foundation retention policy, but Product foreign-key attribution must survive account unlinking or Case closure.
- Membership, Relationship, Grant, capability/scope, lifecycle-event, published-version, participant, Action, Responsibility Cycle, transition, Question, answer, decision, Activity, Audit, and proof rows are never hard-deleted by ordinary product operations. Closure or archival changes visibility/retention disposition without rewriting history.
- Invitation credentials expire and become unusable; the raw credential is never retained. Minimized proposal and terminal evidence remain for audit. Invitation capability/scope children remain with that evidence.
- Read Cursors and command receipts may later move to a restricted archive after an approved retention period; they are not removed while they can affect monotonicity, response replay, dispute handling, or audit correlation.
- Case sequence allocator rows remain for the life of the Case authority. Sequence values are never reused.
- Any legal erasure or exceptional purge must preserve referential and audit integrity through a separately reviewed anonymization/retention process; it is not an ordinary cascade delete.

## 4. Values that must not become authoritative fields

The following IA-2 prototype/application fields or concepts are presentation, fixture, request, or projection data only:

- `DemoRole`, `activeRole`, `actingRole`, display-role labels, and role-valued participant lists;
- `DEMO_NON_AUTHORITATIVE` decisions, demo clock values, fixture sequences, and mock Grant inventories;
- `currentAssignee`, `currentAssigneeId`, `currentResponsibilityCycleId`, or any equivalent Action pointer;
- mutable Action status when it duplicates Responsibility Cycle truth;
- `currentVersionId`, `headVersionId`, or a mutable current Care Update version pointer;
- Care Circle membership as a stored authorization source;
- browser timestamps, client sequence numbers, and display timestamps as ordering authority;
- client-supplied author, Identity, Membership, Grant, capability, scope, visibility admission, server time, or Audit Event;
- unread/new counts, current responsible-person labels, assignee display data, role labels, and allowed CTA lists;
- prior assignee as an automatically current Action participant;
- recipient type/profession as an inferred capability template;
- Question resolution inferred from Action completion;
- raw invitation credential or copied sensitive content in audit/activity.

All such values are either rejected at the trusted boundary or marked **NON-AUTHORITATIVE DERIVED DATA**.

## 5. Invariant placement

### 5.1 PostgreSQL schema constraints

The database is the final structural and race-defense layer for:

- primary keys and immutable opaque lifecycle identities;
- same-Case composite foreign-key alignment among Identity, Membership, Relationship, Grant, record, Action, Cycle, Cursor, and target facts;
- ordered validity intervals and state-compatible timestamps;
- controlled capability, scope, visibility, lifecycle-event, transition, and target vocabularies;
- Grant capability/scope ownership by one exact Grant ID;
- uniqueness of invitation consumption/materialization source;
- Care Update envelope+ordinal uniqueness and at most one successor for a predecessor;
- at most one effective, non-ended Responsibility Cycle per Action;
- unique cursor owner key Identity+Membership+Case;
- unique command idempotency key binding and Audit correlation;
- append-only published versions, lifecycle evidence, transition events, activity, and audit through privileges plus guarded writers;
- denial of direct authenticated writes to server-derived author, proof, time, lifecycle, sequence, version, cycle, and audit fields.

Cross-table workflow semantics that cannot be expressed safely as a simple constraint remain transaction responsibilities.

### 5.2 Privileged server/RPC transaction logic

Controlled commands own:

- Runtime Actor Context derivation at one database time;
- complete Single Grant Path selection and ambiguity failure;
- lock ordering, expected-version checks, and idempotency;
- eligible-assignee resolution;
- compound Care Update/Action/Cycle/event/audit writes;
- ordered Responsibility Cycle transitions;
- correction lineage head verification;
- invitation single-use activation;
- access revocation and affected-cycle closure;
- Case activity sequence allocation;
- cursor boundary verification and atomic maximum update;
- safe internal-to-public error translation.

The complete Single Grant Path decision is enforced inside the trusted database/server boundary for every command after relevant rows are locked and immediately before mutation. A command may call a private reviewed authorization helper, but the command, not the client, owns the proof result.

### 5.3 RLS

RLS is defense in depth and row-eligibility enforcement for:

- authorized SELECT of Care Update versions, Actions, and later Questions using one same-Grant `RECORD_VIEW + RECORD` proof plus typed visibility;
- minimized own Membership/Relationship/Grant-term projections;
- exact-owner Read Cursor access;
- non-enumerating Case and activity projections;
- denial of direct writes to authoritative workflow, access, content-version, sequence, and audit tables.

RLS does not orchestrate multi-row state machines, issue invitations, activate access, choose assignees, allocate sequences, close responsibility cycles, publish corrections, implement replay, or perform revocation fan-out.

### 5.4 Application projection only

The application may derive or cache, but never authorize from:

- current Care Update version;
- current responsible participant and Action status;
- `NEEDS_REASSIGNMENT`;
- eligible UI actions returned by the server;
- display names/roles and relationship labels;
- Care Circle;
- activity summaries, unread count, and last-view divider.

Every cache/view must be rebuildable from authoritative facts, non-writable by ordinary clients, and explicitly documented as **NON-AUTHORITATIVE DERIVED DATA**.

## 6. Backend authorization proof by operation

| Operation | Required complete proof and state | Enforcement / access form | Audit |
|---|---|---|---|
| Case access/list | Authenticated account resolves exact Identity; exact current Membership and Relationship; at least one complete current Grant path for the Case. Membership alone is insufficient | Derived projection read with RLS and private helper | No routine read audit |
| Protected record read / `RECORD_VIEW` | One complete Grant with `RECORD_VIEW + RECORD`, current path/purpose, plus independent typed visibility admitting exact Identity+Membership | Direct authorized row/projection read through RLS/private helper | No routine read audit |
| `CARE_UPDATE_CREATE` | One complete Grant with `CARE_UPDATE_CREATE + CASE`; selected visibility policy must be within allowed server rules | Server-mediated transactional mutation | `CARE_UPDATE_CREATED` / version publication proof |
| `CARE_UPDATE_CORRECT` | Exact original author Identity+Membership, current visible record, one complete Grant with `CARE_UPDATE_CORRECT + RECORD`, expected derived lineage head | Server-mediated transaction, SECOND STAGE | Correction/version event and proof |
| Compound `ACTION_CREATE` + initial `ACTION_ASSIGN` | Mutation decision: one complete Grant contains `ACTION_CREATE + ACTION_ASSIGN + CASE`; concrete target has eligible current Identity+Membership | Transactional compound mutation | Distinct created and assigned events under one correlation |
| Protected linked-source read during Action creation | Separate decision: one complete Grant contains `RECORD_VIEW + RECORD`; source visibility independently admits actor. It may use the same or a different Grant from mutation proof, but each decision is complete alone | Evaluated in the same command without predicate borrowing | Separate `LINKED_SOURCE_READ` proof kind retained with command audit where appropriate |
| Standalone first assignment | One complete Grant with `ACTION_ASSIGN + CASE`; no effective cycle; exact eligible target | Server-mediated transaction; exposure SECOND STAGE | Assignment event |
| `ACTION_REASSIGN` | Current Action visibility; one complete Grant with `ACTION_REASSIGN + RECORD`; expected current cycle/version; exact eligible successor | Server-mediated transaction, SECOND STAGE | End old cycle and create new assignment events |
| `ACTION_ACCEPT` | Exact current assignee Identity+Membership; effective cycle is `ASSIGNED`; one complete Grant with `ACTION_ACCEPT + RECORD` | Server-mediated transaction | Transition and audit |
| `ACTION_START` | Exact current assignee; effective cycle is `ACCEPTED`; one complete Grant with `ACTION_START + RECORD` | Server-mediated transaction | Transition and audit |
| `ACTION_COMPLETE` | Exact current assignee; effective cycle is `IN_PROGRESS`; one complete Grant with `ACTION_COMPLETE + RECORD` | Server-mediated transaction | Completion audit; Question unchanged |
| `ACTION_DECLINE` / `ACTION_RELINQUISH` | Exact current assignee, matching state, one complete Grant with the corresponding capability + `RECORD` | Server-mediated transaction, SECOND STAGE | End-reason transition and gap evidence |
| `QUESTION_CREATE` operation | Frozen capability is `QUESTION_ASK`; requires visible source when present and one complete Grant with `QUESTION_ASK + RECORD` | Server-mediated transaction, SECOND STAGE | Question-created event |
| `QUESTION_RESOLVE` | Question visible and unresolved; exact asker or another actor still requires one complete Grant with `QUESTION_RESOLVE + RECORD` | Server-mediated transaction, SECOND STAGE | Append resolution decision; never update Action |
| `ACCESS_INVITE` | One complete Grant with `ACCESS_INVITE + CASE`; proposal terms bounded by issuer authority; exact recipient binding | Server-mediated transaction, SECOND STAGE | Invitation issued; no Grant yet |
| Invitation acceptance | Credential plus exact recipient identity, current invitation, current Case and unchanged proposal terms. No pre-existing Case Grant is required from the recipient | Server-mediated transactional compound mutation | Acceptance/materialization/activation disposition |
| Access activation | Accepted proposal, exact pending lifecycle instances, all verification/start/issuer prerequisites current; create exact active Grant and mappings only now | Server-mediated transaction | Activation and Grant-issued events |
| `ACCESS_REVOKE` | One complete revoker Grant with `ACCESS_REVOKE + CASE`; issuer/target authority; exact lifecycle target | Transactional compound mutation | Access revocation plus affected-cycle evidence |
| Cursor update | Exact authenticated Identity+Membership+Case; current Case path; valid server-issued boundary owned by that tuple | Server max-upsert with exact-owner RLS | No routine audit; optional internal regression diagnostic |

No operation treats role, profession, Relationship type, Membership existence, or responsibility as a substitute for its Grant proof. Invitation acceptance is the credential-bound exception because it creates, rather than consumes, the recipient's first Case authorization path.

## 7. Transaction and locking design

### 7.1 Global ordering

Commands that can intersect use this stable order:

```text
Case
→ affected Membership / Relationship / Grant lifecycle rows in stable ID order
→ typed record or Action in stable ID order
→ effective Responsibility Cycle
→ Case sequence allocator
→ command receipt / activity / audit append
```

Invitation acceptance begins with the Invitation, then recipient/Case/lifecycle rows, because the recipient may not yet possess a Case path. Cursor advancement locks only the exact cursor owner row after boundary and access validation.

Authorization is evaluated at one database time after the required authority rows are locked. Deadlock or serialization retry is bounded and reuses the same operation key. Long-running user work never holds a transaction open.

### 7.2 Required atomic command boundaries

- publish Care Update: envelope + version 1 + typed participants + activity + audit + command receipt;
- create Action and initial assignment: Action + first `ASSIGNED` cycle + transition facts + activity + audit proofs + receipt;
- each Action transition: cycle state/version + transition event + activity + audit + receipt;
- reassign: end old cycle + new `ASSIGNED` cycle + events/audit/receipt;
- correct Care Update: verify lineage head + successor version + activity + audit + receipt;
- invitation acceptance/activation: consume invitation + create/activate exact lifecycle facts + Grant mappings when eligible + audit + receipt;
- revoke access: terminate exact Grant/access lifecycle + close every affected active cycle + continuity-gap activity + audit + receipt;
- resolve Question: append decision + activity + audit + receipt;
- cursor advance: validate boundary + atomic maximum upsert.

No command exposes a partial business result.

## 8. Race and failure matrix

| Race | Required invariant | Transaction / lock / uniqueness strategy | Expected result |
|---|---|---|---|
| Two simultaneous Action accept attempts | One `ASSIGNED → ACCEPTED` transition and one audit chain | Lock Action and effective Cycle; compare expected row version/state; unique operation receipt/audit correlation | One commits. Same key replays it; different key receives `STALE_STATE`/safe invalid state |
| Duplicate effective Responsibility Cycles | At most one effective non-ended cycle per Action | Action-boundary lock plus database uniqueness as final defense | Losing insert returns conflict mapped to `STALE_STATE`; no silent first-row selection |
| Reassignment racing completion | Old cycle cannot both complete and be ended/replaced | Common Grant→Action→Cycle lock order; revalidate proof and version after lock | One commits; loser refreshes and receives `STALE_STATE` |
| Revocation racing mutation | Revoked proof cannot authorize a later commit | Common Case→Grant→Action→Cycle order; proof re-evaluated inside lock boundary | If revoke wins, mutation denies. If mutation wins first, history commits, then revoke applies without rewriting it |
| Invitation accepted twice | One terminal acceptance and one lifecycle materialization | Lock invitation; unique credential and source-invitation lifecycle constraints; idempotency receipt | Same key returns original IDs; different key/identity returns non-leaking conflict or invalid invitation |
| Duplicate Membership/Grant activation | One lifecycle set and one active Grant per invitation materialization | Lock invitation and pending lifecycle rows; unique source-invitation references; exact proposal fingerprint | One commits; duplicate replays or conflicts; never creates a second path |
| Concurrent Care Update corrections | One successor from the expected head; no fork | Lock Care Update/derived head; expected head+ordinal; unique predecessor-successor and ordinal | One successor commits; loser receives `STALE_STATE` |
| Multiple current version heads | A published lineage has one derived head | Predecessor uniqueness, ordinal uniqueness, transaction lock | Structural violation blocks commit and raises internal invariant failure |
| Cursor updates out of order | Stored boundary never decreases | Unique owner key; atomic maximum update; owner-bound signed token validation | Greater advances; equal/lower succeeds as no-op; optional internal `CURSOR_REGRESSION` |
| Action stale-state write | Transition must start from exact authoritative state/version | Row version compare-and-set under Cycle lock | No last-write-wins; return `STALE_STATE` |
| Duplicate Question resolution | One ordered decision per idempotent request; no overwrite | Lock Question/current decision order; command receipt and unique order | Same key replays; competing request becomes stale or appends only if a later reopen workflow explicitly permits it |
| Revoke access with several active Actions | Revoked path invalid and every affected current cycle ends in the same authoritative result | Lock target lifecycle then affected Actions/Cycles in stable ID order; close all and audit under one correlation | All revocation and gap facts commit or none do; no auto-reassignment |
| Two Case activity writers | Sequence remains strictly ordered | Lock per-Case sequence allocator only for allocation within each short command | Each committed visible domain event receives a unique increasing Case sequence |

## 9. Responsibility and continuity semantics

Responsibility Cycle is the only authoritative responsibility truth:

- zero effective cycles for an unfinished Action means no current responsible participant;
- one effective cycle means that exact assignee Identity+Membership is current;
- more than one effective cycle is an invariant violation, never a list from which code selects the first.

The core ordered states remain `ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED`. Decline, relinquish, reassignment, service end, and access revocation end a noncompleted cycle with a controlled reason. They do not complete it.

`NEEDS_REASSIGNMENT` is derived when an unfinished Action has zero effective cycles. It is not a stored Action state. No command chooses a replacement automatically. Historical cycles remain immutable attribution and do not create visibility.

Revocation of the exact Membership/Grant path used by a current assignee performs one atomic operation:

1. lock the target access lifecycle and affected Actions/Cycles;
2. revalidate the revoker's complete `ACCESS_REVOKE + CASE` proof;
3. make the target Grant/path terminal at database time;
4. determine whether the assignee has another independently complete path required to continue, without stitching partial Grants;
5. when no such path exists, end each affected noncompleted Cycle with `ACCESS_REVOKED`;
6. preserve assigner, assignee, accepted/started facts, and all server times;
7. append correlated access, transition, continuity activity, and audit evidence;
8. commit all or roll back all.

Completed cycles are never rewritten. The post-commit projection shows no current assignee and a continuity gap where applicable.

## 10. Care Update and correction lineage

Version 1 publication creates immutable Care Update and version facts. A published correction is an immutable successor that points to the unique derived head and records the correcting exact participant, reason, and server time.

Current version is derived from the unique lineage head/highest controlled ordinal. No mutable `currentVersionId`, head pointer, or client version becomes authority. Concurrent correction uses expected-head compare-and-set plus structural uniqueness. The original author rule is enforced by exact Identity+Membership and a current complete `CARE_UPDATE_CORRECT + RECORD` path; authorship alone is insufficient.

Professional and family-authored published records use the same integrity rule. Rich clinical signing, co-signing, and regulated retention are future policy work.

## 11. Read Cursor design

Persistent key:

```text
Logical Identity + Membership lifecycle instance + Case
```

The stored authoritative value is the maximum accepted Case activity sequence plus server update time. The client receives an opaque, integrity-protected boundary token bound to Identity, Membership, Case, visible sequence, issuance time, and signing-key identifier. The browser cannot create or alter it. Key management and token lifetime are IA-4 security details; the ownership and monotonic semantics are frozen here.

The update command verifies token integrity, exact owner, current Case access, and that the boundary came from an authorized visible-activity response. It then applies:

```text
storedBoundary = max(currentBoundary, requestedBoundary)
```

- requested greater than current: advance;
- requested equal to current: success/no-op;
- requested lower than current: success/no-op publicly; optional internal `CURSOR_REGRESSION` diagnostic;
- boundary for another Identity, Membership, or Case: deny;
- new Membership lifecycle: new cursor, with no inherited value.

Unread counts are computed over the actor's current visible activity projection, not by exposing gaps in the Case sequence. Browser time and display timestamps never order or authorize cursor state.

## 12. Product Activity and Security Audit

Product Activity and Audit are separate authoritative append-only stores.

### 12.1 Product Activity

`winwin_case_activity_events` provides stable Case ordering and typed domain milestones. It stores target references and minimized rendering data, not full sensitive payloads. Ordinary activity responses re-evaluate current visibility for every target and return a compact contiguous visible projection; hidden sequence gaps and counts are not disclosed.

Activity uses database-allocated Case sequence for ordering. Display timestamp is metadata only. Activity may group adjacent Action-created/assigned entries in the UI, but both underlying domain/audit facts remain.

### 12.2 Security / Audit Event

Audit preserves at minimum:

- authenticated account-link / physical Actor reference;
- Logical Identity and Membership lifecycle instance;
- Case;
- target entity and exact version/cycle where applicable;
- operation;
- exact authorizing Grant proof reference(s) and proof kind;
- bounded before/after state or version references;
- database server time;
- correlation/idempotency reference.

Audit never copies Care Update, Question, or Action content bodies, raw credentials, broad client telemetry, or Grant inventories. Audit read policy is narrower than ordinary Case content. An audit insert failure rolls back the owning mutation.

## 13. RLS versus trusted server boundary

| Surface | Access class | Enforcement design |
|---|---|---|
| Case list/overview | Derived projection read | RLS/private helper returns only Cases with a complete current path and minimized data |
| Care Update/Action/Question SELECT | Direct row eligibility or reviewed authorized view | RLS uses exact Actor Context, one same-Grant `RECORD_VIEW + RECORD` proof, and typed visibility |
| Own access terms | Minimized direct read | Exact Identity+Membership RLS; never expose other Grant inventories |
| Own cursor | Direct owner row plus command | Exact owner RLS; mutation only through boundary-validating max command |
| Care Update publish/correct | Server-mediated | Direct authenticated inserts/updates denied; transaction owns author/time/version/audit |
| Action create/assign/transition/reassign | Transactional compound mutation | Direct Action/Cycle state writes denied; server command owns locks/proofs/idempotency/audit |
| Invitation/access lifecycle | Transactional compound mutation | Direct lifecycle/Grant writes denied; server command owns recipient/issuer checks |
| Activity | Derived permission-filtered read | RLS/view plus current target visibility; sequence gaps not exposed |
| Audit | Privileged/minimized read | Server-only writes; ordinary Case visibility does not grant raw audit access |

The private same-Grant helper must return only a decision and exact proof ID. IA-4 must review its owner, row-security behavior, fully qualified relations, fixed search path, arguments, execute ACL, recursion resistance, and non-enumerating behavior before authoring. No definer or bypass property may become general client access.

## 14. Error semantics

| Internal diagnostic | Public/UI-safe result | Retryability | Required handling |
|---|---|---|---|
| `IDENTITY_NOT_RESOLVED` | `FORBIDDEN` | Non-retryable until account/identity state changes | Do not expose identity topology |
| `MEMBERSHIP_INACTIVE` | `FORBIDDEN` | Non-retryable on the same lifecycle | Exit protected Case context |
| `GRANT_INVALID` | `FORBIDDEN` or `NOT_FOUND_OR_NOT_VISIBLE` | Non-retryable until authority changes | Do not expose Grant existence/status |
| `CAPABILITY_DENIED` | `FORBIDDEN` | Non-retryable until authority changes | Never name missing capability publicly |
| `VISIBILITY_DENIED` | `NOT_FOUND_OR_NOT_VISIBLE` | Non-retryable until visibility changes | Hide protected record existence |
| `INVALID_TRANSITION` | `INVALID_STATE` | Retry only after authorized refresh and new intent | Do not silently replay |
| `RESPONSIBILITY_MISMATCH` | `FORBIDDEN` | Non-retryable for same intent | Do not identify another assignee |
| `STALE_STATE` | `STALE_VERSION` | Retry only after refetch and explicit confirmation | Preserve intent but require current state |
| `CURSOR_REGRESSION` | Success/no-op | No retry needed | Keep maximum boundary; diagnostic internal only |
| `NOT_FOUND` | `NOT_FOUND_OR_NOT_VISIBLE` | Navigation/context refresh only | Do not distinguish absence from hidden target |
| `CONFLICT` | Map to `STALE_VERSION`, `IDEMPOTENCY_CONFLICT`, or `TEMPORARY_FAILURE` | Depends on mapped cause | No vague proof or uniqueness details |
| `MULTIPLE_COMPLETE_GRANT_PATHS` | `FORBIDDEN`; internal security diagnostic | Non-retryable until authority data is corrected | Never select first or reveal Grant inventory |

Serialization/deadlock failures with no commit map to `TEMPORARY_FAILURE` and may receive a bounded retry using the same idempotency key. Reusing an idempotency key with different normalized input is `IDEMPOTENCY_CONFLICT` and is non-retryable under that key.

No public response leaks protected record existence, other-member responsibility, Grant inventory, proof IDs, SQL/RLS details, or stack traces.

## 15. Data minimization and privacy

Every field must answer: **Is it required to reduce care-continuity risk, support coordination, or enforce authorization/audit?** If not, it is excluded.

| Data group | Minimum retained | Classification and restriction | Explicit exclusions |
|---|---|---|---|
| Actor/Identity | Opaque stable references and minimum display projection | Authentication/pseudonymous; self/admin-only mapping | Identity documents, provider credentials, unrelated contact profile |
| Membership/Relationship | Case link, bounded relationship/service context, validity/lifecycle evidence | Sensitive participation/family-service metadata; exact Case policy | Family tree, unrelated relationships, schedules beyond access need |
| Grant/Invitation | Purpose, `CASE|RECORD`, capabilities, validity, issuer/source, recipient binding, credential digest | Security-critical; minimized issuer/recipient/admin projections | Raw token, role-derived capability template, full Grant inventory |
| Care Update/Question | Bounded care-continuity content, author, source, visibility, server time | Potential health/care content; typed record RLS | Full medical chart, diagnosis expansion, medication history unless later authorized, GPS, psychological profile |
| Action/Cycle | Bounded task context, exact responsibility, state/reasons, server times | Work/care responsibility; authorized Case projections | Staff performance profile, unrelated employment data, location tracking |
| Activity | Typed milestone, target, safe actor display reference, Case order | Sensitive existence metadata; visibility-filtered | Full record payload, hidden counts, global sequence gaps |
| Cursor | One maximum boundary per Identity+Membership+Case | Behavioral metadata; exact-owner only | Per-record receipts, presence, reader lists |
| Audit | IDs, operation, proof refs, bounded state refs, correlation, server time | Highly restricted security metadata | Content bodies, raw credentials, broad device/client telemetry |

Deletion defaults to retention of immutable attribution and security history with archival/minimized display projections. Legal retention, export, erasure, and Taiwanese professional obligations require a separate policy review before production.

## 16. Migration and cutover strategy

Migrations 001–008 are immutable historical/runtime candidates and must remain byte-unchanged. The new direction is additive `winwin_*` Product authority; it does not reuse 001–008 byte-for-byte or expand `v2_*` objects as the new source of truth.

Future migration principles:

1. author new tables, constraints, private helpers, and policies only under a separate implementation authorization;
2. allow new `winwin_*` tables to coexist temporarily with legacy objects while the new adapter is disabled;
3. never dual-write one authoritative fact to legacy and new paths;
4. inventory relevant legacy rows at action time before any cutover or backfill;
5. if no relevant rows exist, prefer no bridge;
6. if relevant rows exist, use a separately reviewed one-way, idempotent, fail-closed mapping with count and semantic verification;
7. leave ambiguous rows unmapped and unauthorized rather than guessing;
8. authorize cutover separately through one feature/adapter switch selecting exactly one read/write authority;
9. design rollback to disable the new adapter/cutover and preserve both historical sources; do not destructively delete source rows;
10. separate migration authoring, SQL execution, runtime verification, application integration, and production deployment into distinct gates.

This plan neither inventories runtime data nor approves a bridge, migration file, execution, or cutover.

## 17. Scope classification

### A. IA-3 MVP MUST HAVE

- upstream authenticated Physical Actor/account link, Logical Identity, Case, and care-recipient authority;
- exact Membership, Relationship, Grant lifecycle instances and lifecycle evidence;
- immutable Grant capability and `CASE|RECORD` scope mappings;
- first-slice `AUTHOR_ONLY`, `DIRECT_PARTICIPANTS`, and `CASE_SHARED` visibility representation;
- Care Update envelope and immutable version 1;
- Action and Responsibility Cycle;
- create+assign, accept, start, complete commands;
- access-revocation command prerequisite and continuity-gap compatibility, without first-slice UI;
- append-only Action transition events, Product Activity, Audit, proof references, command receipts, and Case sequence allocation;
- exact-owner monotonic Read Cursor;
- RLS/read-surface design and direct-write denial;
- safe error translation and no role authority.

### B. IA-3 SECOND STAGE

- original-author Care Update correction command and UI using the already-compatible version schema;
- Question, answer, and resolution persistence/commands/UI;
- invitation issuance, acceptance, delayed activation, and onboarding UI unless explicitly pulled forward;
- decline, relinquish, reassignment, and active-work continuity remediation UI;
- richer authorized access/audit-history projections;
- optional professional-verification prerequisite integration;
- `EXPLICIT_GRANT` or richer audience policies only after separate review;
- notification delivery after its workflow and privacy boundaries are approved.

### C. FUTURE / DEFERRED

- delegation and sub-assignment;
- supervisor completion/override;
- organization hierarchy and role templates;
- `FAMILY_TEAM` / `PROFESSIONAL_TEAM` audience policies;
- regulated clinical signing/co-signing and full clinical records;
- advanced verification, legal export/retention, analytics, AI scoring, GPS, medication reminders, psychological support;
- per-record read receipts, presence, or complex offline synchronization;
- automated caregiver selection, urgency escalation, and cross-Case operations.

## 18. Ordered implementation sequence

No phase below is executed by this plan. Each requires its own authorization.

| Phase | Objective and prerequisites | Allowed future file categories | Validation gate | Stop condition |
|---|---|---|---|---|
| A — backend schema/invariant foundation | Freeze exact physical names, Foundation FK availability, lifecycle representation, typed entities, constraints, and rollback concept | One new additive migration draft and DB design tests only; never migrations 001–008 | Static schema review, FK/constraint traceability, no-execution confirmation | Stop on generic record authority, role authority, pending active Grant, mutable current pointers, lifecycle reuse, or missing rollback |
| B — authorization/storage primitives | Add same-Grant proof helper design, capabilities/scopes, visibility predicates, sequence/idempotency/audit primitives | New migration/helper draft and focused schema/security test drafts under separate IA-4 authorization | Query-shape review proving correlation to one Grant; helper ownership/search-path/ACL review | Stop on recursion/bypass, Grant stitching, unknown-as-allow, or proof inventory leakage |
| C — transactional workflows | Author first-slice commands: Care Update create, Action create+assign, accept/start/complete, revocation prerequisite, cursor; preserve second-stage compatibility | Server/RPC/function source and focused tests only under separate authorization | Transaction, lock-order, idempotency, stale-state, audit atomicity, and concurrency review | Stop on partial success, client-authoritative facts, last-write-wins, missing audit, or auto-reassignment |
| D — RLS/read surfaces | Add typed SELECT policies, minimized Case/activity/access/cursor projections, and direct-write denial | RLS/helper policy draft and security tests only | Allow/deny matrix, existence non-enumeration, same-role/different-participant and cross-Case tests | Stop on role-only access, CASE-as-record-read alternative, hidden-count leak, or direct authoritative writes |
| E — application integration | Implement real repository adapter behind the IA-2 seam and migrate only selected screens | Focused application adapter/service, DTOs, selected screen tests; no component direct Supabase imports | Demo/real contract parity, safe errors, server-authoritative DTO tests | Stop on `DemoRole` authority, direct table writes, client clock/order, mutable pointers, or broader feature expansion |
| F — E2E/security/concurrency validation | Verify A→B→A plus C/revoked denial in an authorized non-production environment | Test harness/evidence only after Foundation, SQL, and runtime gates | Full DB/RLS/server/integration/E2E matrix, mobile/accessibility, rollback drill | Stop on any isolation, history, continuity, audit, cursor, or care-safety failure |

Foundation runtime, SQL execution, integration environment, cutover, and deployment remain separately authorized gates.

## 19. Future test strategy

| Scenario | Schema / constraint | DB transaction | RLS / security | Server integration | E2E |
|---|---:|---:|---:|---:|---:|
| Identity/Membership lifecycle isolation | ✓ | ✓ | ✓ | ✓ |  |
| Same Identity, different Membership isolation | ✓ | ✓ | ✓ | ✓ | ✓ |
| Same role, different participant isolation |  |  | ✓ | ✓ | ✓ |
| One complete Grant Path | ✓ | ✓ | ✓ | ✓ |  |
| Split capability/scope across Grants denies |  | ✓ | ✓ | ✓ |  |
| Multiple complete paths fail explicitly |  | ✓ | ✓ | ✓ |  |
| No role authority |  |  | ✓ | ✓ | ✓ |
| Protected `RECORD_VIEW + RECORD + visibility` | ✓ |  | ✓ | ✓ | ✓ |
| Cross-Case isolation | ✓ | ✓ | ✓ | ✓ | ✓ |
| Care Update immutable publication | ✓ | ✓ | ✓ | ✓ | ✓ |
| Concurrent correction and unique head | ✓ | ✓ |  | ✓ |  |
| First Action assignment | ✓ | ✓ |  | ✓ | ✓ |
| Reassignment preserves old cycle | ✓ | ✓ | ✓ | ✓ |  |
| Responsibility Cycle uniqueness | ✓ | ✓ |  | ✓ |  |
| Ordered Action transitions | ✓ | ✓ |  | ✓ | ✓ |
| Concurrent accept | ✓ | ✓ |  | ✓ |  |
| Reassign versus complete stale rejection | ✓ | ✓ |  | ✓ |  |
| Revocation versus transition | ✓ | ✓ | ✓ | ✓ | ✓ |
| Invitation activation exactly once | ✓ | ✓ | ✓ | ✓ |  |
| No Grant before activation prerequisites | ✓ | ✓ | ✓ | ✓ |  |
| Duplicate Question resolution | ✓ | ✓ |  | ✓ |  |
| Question independent from Action completion |  | ✓ | ✓ | ✓ | ✓ |
| Cursor monotonic greater/equal/lower | ✓ | ✓ | ✓ | ✓ | ✓ |
| Old Membership cannot update new cursor | ✓ | ✓ | ✓ | ✓ |  |
| Historical attribution survives access loss | ✓ | ✓ | ✓ | ✓ | ✓ |
| Activity ordering uses Case sequence | ✓ | ✓ | ✓ | ✓ | ✓ |
| Hidden activity/count non-enumeration |  |  | ✓ | ✓ | ✓ |
| Audit atomicity and append-only integrity | ✓ | ✓ | ✓ | ✓ |  |
| Direct authoritative writes denied |  |  | ✓ | ✓ |  |
| Forged Identity/author/time/state rejected |  | ✓ | ✓ | ✓ | ✓ |
| Idempotent retry and key mismatch | ✓ | ✓ |  | ✓ | ✓ |
| Internal/public error privacy mapping |  |  | ✓ | ✓ | ✓ |

### 19.1 Mandatory concurrency harness

The future DB/server test harness must run real overlapping transactions, not only sequential unit simulations, for:

- concurrent accept;
- duplicate initial assignment;
- reassign versus complete;
- revoke versus complete;
- concurrent correction;
- duplicate invitation acceptance/activation;
- out-of-order cursor advance;
- concurrent Case activity allocation.

Each test proves committed row counts, immutable history, Audit correlation, safe public errors, and retry behavior.

## 20. Validation and implementation entry conditions

Before any schema/migration authoring gate begins, the next work package must name:

- the exact new migration path and ordering after 001–008;
- Foundation FK availability or a documented blocker;
- exact columns, composite keys, uniqueness/immutability strategy, and rollback plan;
- private helper owner, row-security, search-path, ACL, and recursion model;
- command signatures, lock order, expected versions, idempotency fingerprints, and error mapping;
- legacy-row inventory procedure and no-bridge/one-way mapping decision point;
- authorized file categories and explicit no-execution boundary.

Any implementation that contradicts the IA-2 exact-participant seam, frozen workflow decisions, or this plan must stop for design review rather than silently adapting the product model.

## 21. Planning gate conclusion

The first authoritative backend slice can be implemented without storing role authority, mutable Care Update heads, mutable Action assignee pointers, or browser-derived time/order. The minimum safe authority consists of exact lifecycle instances, one complete Grant proof, immutable published content/history, Responsibility Cycle truth, atomic commands, typed visibility, append-only activity/audit, and an exact-owner monotonic cursor.

This plan performs no backend runtime work and grants no implementation phase automatically.
