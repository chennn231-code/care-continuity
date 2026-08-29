# WinWin Product Backend / Record-Level Authorization Design V1

> **Status: BATCH 2 BOUNDED ARCHITECTURE CORRECTION — stable design checkpoint; Product Decision Closure remains separate**
> Date: 2026-08-29
> Starting baseline: `codex/foundation-spike-design-correction` at `fd55371c1ef4219e51dd4de1d41c69c92e040982`
> Correction baseline: `codex/foundation-spike-design-correction` at `5a683c2e3a90c7e84b58f04ce032efeb8c1fe25a`
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

Use the frozen normalized core plus append-only histories: Foundation actor/account mapping, immutable Membership/Relationship/Grant lifecycle instances, a Care Update Source Envelope with immutable Content Versions, independent Question/Action tables, append-only responsibility/decision/audit facts, and current meaning derived from those facts. Do not implement full event sourcing and do not store authoritative permission or domain state in free-form JSON.

This review **does not** introduce a generic authoritative `winwin_records` supertype. Phase 3 and the frozen Physical Model only establish a common source envelope for Care Update content, not inheritance across Care Update, Question and Action. Shared authorization columns may use a reviewed reusable schema pattern, but each typed entity retains real FKs and its own lifecycle. If implementation later proves a generic record envelope materially safer, that is a bounded Physical Model correction Gate, not a silent Batch 2 change.

### 2.2 Lifecycle-instance terminology

Where prior design material uses “Generation”, this design means **one immutable lifecycle instance with its own opaque identifier**. Rejoin, replacement or regrant creates a new instance; the ended instance remains historical and can never become effective again. An additional numeric generation counter is not an MVP authorization prerequisite and is deferred unless a separate ordering requirement proves it necessary.

### 2.3 Identity and Actor terminology

- **Runtime Actor Context** is the authenticated context for one request/operation: account mapping, selected logical Identity and the exact authorization path used.
- **Logical Identity** is the stable authorization subject referenced by Membership, Relationship, Grant, authorship, participant and assignee facts.
- **Physical storage** may reuse the Foundation stable Actor/account reference to represent that logical Identity in the MVP. Physical reuse does not eliminate the logical Identity layer.

In the rest of this document, “Identity” means the stable authorization subject. “Actor Context” means the per-operation context. A persistent Foundation `actor_ref_id` may physically back `identity_id`, but must not be confused with the runtime Actor Context.

### 2.4 Explicitly rejected

- role-based access, role-based participants or role-based assignees;
- capability/scope union across grant rows;
- direct client writes to published versions, Action/cycle state, invitations, grants or audit;
- destructive correction or mutable audit history;
- a polymorphic visibility/participant table without an authoritative typed FK;
- `EXPLICIT_GRANT` as a second standalone permission system;
- dual-write between `v2_*` and `winwin_*`;
- client-clock ordering, last-write-wins workflow transitions or hidden retry-created duplicates.

## 3. MVP authoritative entity model

### 3.1 Entity disposition

| Candidate entity | Purpose and authoritative owner | Minimum fields | Immutable / mutable | FK, uniqueness and lifecycle | Sensitivity | Phase |
|---|---|---|---|---|---|---|
| Foundation `winwin_actor_references` + `winwin_account_actor_links` | Resolve authenticated account to the stable physical reference backing Logical Identity | Existing Foundation minimum; Actor Context retains the active account-link instance | Stable attribution immutable; mapping instances controlled | Exactly one current account mapping; never grants Case access | Auth/pseudonymous identity | Upstream prerequisite |
| Foundation `winwin_cases` | Stable Case authority root | existing Case ID/lifecycle/creator facts | Case ID/creator immutable; lifecycle controlled | Product content requires an implementation-authorized collaborative lifecycle, not DRAFT alone | Case existence | Upstream prerequisite |
| Foundation `winwin_person_references` + `winwin_care_recipient_roles` | Case-scoped recipient reference and exactly one recipient role; not an access subject | Existing Foundation minimum only | Case/person scope and role attribution retained | same-Case 1:1 recipient invariant; never grants governance/content access | Recipient identifier | Upstream prerequisite |
| `winwin_membership_generations` | Bind one exact Logical Identity to one Case participation lifecycle instance | instance ID, Identity, Case, status/period, source Invitation, created/ended facts | Identity/Case/source/instance immutable; end by controlled fact, never reactivate | active-instance uniqueness as required; no Membership-only access | Participation history | MVP required; table name candidate |
| `winwin_relationship_generations` | Explain why that exact Identity participates; never a capability | instance ID, Membership instance, Identity, Case, type/code, service purpose/period, status/end facts | path identity/type instance immutable; rejoin/change creates new row | Membership/Identity/Case composite alignment | Relationship/service context | MVP required; table name candidate |
| Capability vocabulary representation | Define operation vocabulary without making roles authoritative | controlled stable key and immutable meaning | Published meaning immutable | exact representation decided after Product vocabulary closure | Low alone | Logical MVP requirement; physical table is a design candidate |
| `winwin_grant_generations` | One auditable authorization proof lifecycle instance | instance ID, grantee Identity, Membership, Relationship, Case, purpose, scope ceiling, valid interval, issuer, source, revocation facts | path/source/instance immutable; revoke/end by controlled fact | Composite path FKs; source-instance uniqueness; no partial-grant aggregation | Security-critical | MVP required; table name candidate |
| Grant capability mapping representation | Exact capability set belonging to one Grant instance | Grant instance ID + capability key/reference | Immutable with the Grant instance | every authorization query remains correlated to the same Grant ID | Security-critical | Logical MVP requirement; child table is a design candidate |
| `winwin_invitations` | Typed, single-use proposal for future Membership/Relationship/Grant instances | invitation ID, bound recipient Identity/account condition, Case, issuer proof, relationship terms, purpose/scope/capability proposal, acceptance and service intervals, status, credential digest/reference, materialized IDs, idempotency key | proposal immutable after issue; terminal facts controlled | one credential instance; one successful consumption | Access invitation; token/binding metadata | Required only when invitation onboarding enters the implementation slice |
| Invitation capability representation | Preserve the exact proposed capability set without inferring a role label | Invitation ID + capability proposal | Immutable after issue | materialization must copy the exact reviewed set | Authorization proposal | Design candidate; child table conditional on physical review |
| Professional Identity / verification representation | Keep professional declaration separate from verification and Case access | professional Identity reference and append-only verification facts | declaration stable; verification history append-only | verification alone never grants Case access | Professional evidence | Conditional/second stage unless first slice requires professional verification |
| `winwin_source_envelopes` | Stable Care Update/source identity, Case, author and Actor Context facts | envelope ID, Case, author Identity/Membership/account-link instance, content kind, occurred-at claim, recorded/published time, purpose, scope ceiling, acting Grant proof | Case/author/content kind/server time immutable after publication | exact author Membership/Case alignment | Reveals content existence/author | MVP required |
| `winwin_content_versions` | Immutable published body, visibility and correction lineage | version ID, envelope, ordinal, body with bounded schema/text, visibility policy, prior version, revision kind/reason, publisher Identity/Membership, server time, idempotency | Entire published row immutable | envelope+ordinal unique; one linear predecessor; current version derived | Potential health/care content | MVP required |
| Content visibility-subject representation | Identity/Membership-aware narrowing set for `DIRECT_PARTICIPANTS` or `EXPLICIT_GRANT` | content version, Identity, Membership instance, designation kind, creator/time | Append-only with published version | same-Case integrity; not a second grant truth | Participant association | Conditional on selected MVP visibility vocabulary; child table is a design candidate |
| Observation typed semantics | Optional typed Care Update subtype without diagnosis semantics | subtype identity/category and minimum structured facts | text remains in Content Version | exact physical representation deferred | Care/health-adjacent | DEFER / Product decision if needed; not required by first MVP slice |
| `winwin_source_references` | Pin a downstream Question or Action to a specific visible Content Version | reference ID, source version, typed downstream target, Case, creator/time | Append-only; never retarget | same-Case and allow-listed target integrity through controlled writer | Link existence can be sensitive | MVP required when source linked |
| Question persistence family | Preserve Question, answers and resolution/reopen history independently from Action | exact tables/fields remain candidates | published facts append-only; current resolution derived if implemented | Action completion never resolves Question | Care/family issue | Second stage; physical split deferred |
| `winwin_actions` | Stable work identity independent of Question and assignee | Action ID, Case, creator Identity/Membership, optional primary Question, work summary, purpose/scope/visibility, created time, terminal fact if applicable, row version | work/source/creator immutable; no current assignee or cycle pointer | primary Question 0..1, same Case | Responsibility/work metadata | MVP required |
| `winwin_responsibility_cycles` | Exact assignment/assignee lifecycle and Action completion facts | cycle ID, Action, assigner/assignee Identity+Membership, state, assigned/accepted/started/completed/ended facts, end reason, row version, operation keys | assignment facts immutable; transitions controlled; ended cycles immutable | at most one effective cycle per Action; same-Case composite integrity | Work attribution | MVP required |
| `winwin_read_cursors` | Since-last-view boundary per Identity+Membership lifecycle instance+Case | Identity, Membership instance, Case, last visible sequence, server recorded time, row version | ownership immutable; sequence/time advance only | unique Identity+Membership+Case | Behavioral metadata | MVP required |
| `winwin_audit_events` | Minimum append-only mutation evidence and server activity order | event ID, Case, Actor Context including Identity/Membership/account link, operation, allow-listed target, optional cycle/Grant proof, state refs, server time, correlation/idempotency, Case sequence | Fully append-only | unique operation correlation; controlled target and same-Case validation | Security metadata; may reveal object existence | MVP required |

The model deliberately does not persist a Care Circle: it is a viewer-specific projection from current authorized Membership/Relationship/Grant facts. A professional declaration or verification fact never substitutes for Logical Identity or creates Case authority.

### 3.2 Why the larger-looking set is still bounded

Question implementation, delegation, supervisor override, notifications and organization hierarchy are outside the first slice. Care Update versioning remains from the start so publication does not create an overwrite-shaped schema. Invitation-capability, visibility-subject, professional-verification and Question child tables are physical design candidates, not MVP commitments; each is created only if the selected slice and Product vocabulary require it. A generic IAM policy engine, clinical record system and per-record read-receipt system remain excluded.

## 4. Care Update persistence

### 4.1 Option review

| Option | Assessment |
|---|---|
| A. Stable Source Envelope + separate immutable Content Version table | **Selected.** Clear identity, linear correction history, derived current version and student-MVP queries |
| B. Every correction is a replacement update row | Preserves append history but fragments stable links from Questions/Actions and complicates current-record resolution |
| C. Full event model | Auditable but requires replay/projection correctness beyond MVP needs |

### 4.2 Selected contract

Publication atomically creates the Care Update Source Envelope, Content Version 1, only the audience facts required by the selected visibility policy, and an audit event. The server supplies author Identity/Membership and Actor Context, publication time and activity sequence. Client `occurred_at` is a bounded user claim and never replaces server time.

Correction locks the envelope/version lineage, verifies the expected derived head and ordinal, inserts version N+1 pointing to N, allocates the next activity sequence and appends audit. Version rows are never updated or deleted. The authoritative current version is the unique valid lineage head/highest controlled ordinal; no mutable `current_version_id` or version counter is an independent truth. A later cache/view may project it only if rebuildable and never writable by clients. Family-authored and professional-authored published updates use the same integrity rule; UI templates may differ, but role does not weaken history.

Content should use a small reviewed column set or bounded text fields appropriate to the selected category. Do not copy a complete medical record, use unbounded JSON as truth, or make professional free text visible merely because an actor is professional.

## 5. Record visibility persistence

Each published Content Version, Question and Action records one controlled visibility policy, purpose and scope ceiling within its typed table. This repeats a reviewed column pattern, not authorization state: the complete Grant Path is still required. Candidate vocabulary remains subject to Product review:

| Policy | Persistent auxiliary rows | Read rule |
|---|---|---|
| `AUTHOR_ONLY` | None | exact author Identity+Membership instance plus one matching grant path |
| `DIRECT_PARTICIPANTS` | typed content designation rows only if selected and the object does not already define participants | exact author or approved designated Identity+Membership, plus one matching grant path |
| `CASE_SHARED` | None | complete Case grant with `CASE_SHARED` scope and `VIEW_RECORD` capability |
| `FAMILY_TEAM` | None | family relationship prerequisite plus complete matching grant |
| `PROFESSIONAL_TEAM` | None | professional-service relationship prerequisite plus complete matching grant |
| `EXPLICIT_GRANT` | typed content designation rows only if this policy is selected | exact designated Identity+Membership plus complete grant whose scope is `EXPLICIT_GRANT` |

The designation fact is record targeting/narrowing, not permission. `EXPLICIT_GRANT` still uses the ordinary Grant lifecycle instance, so no second grant truth exists. AUTHOR_ONLY never requires a participant row. Participant Identity and Membership are server-derived/validated and must share the record Case; the client cannot spoof them through direct insert. A generic polymorphic audience table is rejected for MVP because it would weaken native target integrity.

`DIRECT_PARTICIPANTS` must be defined per typed object during visibility-vocabulary closure. A Content Version may use an approved typed subject representation. An Action may consider creator and the effective cycle's exact assigner/assignee, but prior-assignee visibility and the final set remain **PRODUCT DECISION REQUIRED**. Historical participation alone never authorizes. Question direct-participant semantics are second stage. Any object/policy combination without an approved typed participant source fails closed.

Visibility answers only `canView(record)`. Every mutation separately checks its operation capability, current record state and responsibility conditions.

## 6. Single Grant Path database mapping

A future private authorization helper may return one proof row containing the exact Grant lifecycle-instance ID rather than a boolean assembled from independent subqueries. Its logical pattern is:

```text
for one candidate grant G
  join exactly G.membership M
  join exactly G.relationship R
  require G.grantee_identity = authenticated selected Logical Identity
  require M.identity = G.grantee_identity = R.identity
  require G.case = M.case = R.case = target.case
  require M/R/G current at one server timestamp
  require G.status active and not revoked
  require G.purpose satisfies the operation/record purpose
  require G.scope satisfies the record policy
  evaluate capability mappings only through this exact G.id
  require required capability belongs to G itself
return G.id as proof
```

Scope and capability predicates must be correlated to the same `G` alias. It is forbidden to ask “does any grant have scope X?” and independently “does any grant have capability Y?”. Whether the immutable capability set is stored in a reviewed child table or another bounded physical representation remains a design choice; every capability fact must still belong to the same Grant instance. Role-template expansion at authorization time and query grouping across Grants are forbidden.

Unknown scope/capability/purpose, missing validity, unresolved identity, inactive/future membership, ended relationship or no complete path is deny. A successful decision supplies the exact grant ID to the transition and audit event.

## 7. RLS versus server-transition boundary

RLS remains defense in depth on every exposed table. High-risk writes revoke direct authenticated table privileges and require controlled server operations.

| Operation | Boundary | Reason |
|---|---|---|
| Select Content Version/Question/Action | **RLS ONLY** for row eligibility; projection may use a reviewed view | Single-grant + typed record-policy predicate is row-local enough; domain payload projection may still be narrower |
| Select own Membership/Relationship/Grant terms | **RLS ONLY** | Exact Logical Identity in the authenticated Actor Context and minimum self-service projection |
| Create/publish Care Update | **RLS + SERVER TRANSITION** | RLS is defense in depth; server fixes author/time and creates envelope/version/typed semantics/audience/audit atomically |
| Create/ask Question | **RLS + SERVER TRANSITION** | Source visibility plus typed record/event/audit transaction |
| Create/assign Action | **SERVER TRANSITION REQUIRED** | Target eligibility, cycle uniqueness, Action state and audit must be atomic |
| Accept Action | **SERVER TRANSITION REQUIRED** | Exact current assignee, state CAS, grant proof and audit |
| Start Action | **SERVER TRANSITION REQUIRED** | Exact accepted responsibility and ordered transition |
| Complete Action | **SERVER TRANSITION REQUIRED** | Action/cycle state agreement, retry safety and concurrent revoke handling |
| Reassign Action | **SERVER TRANSITION REQUIRED** | End old cycle, create new cycle and append audit atomically; current responsibility remains derived |
| Resolve Question | **SERVER TRANSITION REQUIRED** | Independent domain authority and state event; resolver policy unresolved |
| Publish correction | **SERVER TRANSITION REQUIRED** | Immutable lineage, expected-head CAS and audit |
| Accept invitation | **SERVER TRANSITION REQUIRED** | Single-use credential and multi-entity materialization transaction |
| Revoke Grant/Membership | **SERVER TRANSITION REQUIRED** | Immediate authorization loss and deterministic affected-responsibility identification; remediation remains a Product decision |
| Advance own cursor | **RLS + SERVER TRANSITION** | Ownership via RLS; server boundary and monotonic max semantics |
| Direct insert/update Responsibility Cycle, Audit Event or published version | **Denied** | Only their owning transition may write |
| Delegated accept/complete, supervisor completion, exact resolver/reassign authority | **PRODUCT DECISION REQUIRED** | Workflow authority cannot be invented by engineering |

The future RLS helper must live behind a reviewed private boundary that avoids policy recursion. If a definer-style helper is selected, its owner/bypass properties, fixed empty or allowlisted `search_path`, fully qualified relations, EXECUTE ACL, row-security behavior and exposed arguments require explicit security review. It must resolve `auth.uid()` through the current account mapping into the physical reference backing Logical Identity and build the Runtime Actor Context from controlled facts; a client header or parameter cannot become Identity truth. The helper returns only the minimum decision/proof and cannot expose grant inventories or turn table-owner bypass into general client access.

## 8. Server-authoritative transition contracts

Every operation authenticates the account, builds the Runtime Actor Context, resolves its selected Logical Identity, uses one database timestamp, locks in a documented global order, proves one Grant instance, checks expected entity version/state, performs mutation plus audit atomically, and returns either the committed result or a stable error. No partial success is visible.

| Transition | Required proof and pre-state | Mutation + audit | Failure semantics |
|---|---|---|---|
| `assign_action` | active Identity path with `ASSIGN_ACTION`; Action has no effective cycle and is not terminal; eligible target Identity/Membership; expected Action version | create the sole effective ASSIGNED cycle and audit assignment | stale version, ineligible target or current-cycle conflict: rollback/conflict |
| `accept_action` | exact current assignee Identity+Membership; one grant with accept capability; effective cycle ASSIGNED | cycle ACCEPTED/time/version and audit | non-assignee deny; stale/reassigned conflict; same idempotency returns original |
| `start_action` | exact accepted current assignee; start capability; effective cycle ACCEPTED | cycle IN_PROGRESS/time/version and audit | skipped state deny; retry stable |
| `complete_action` | exact in-progress current assignee; complete capability still current; effective cycle IN_PROGRESS | cycle COMPLETED/time/version and audit; Action completion is derived from the completed effective cycle | revoked path or stale state deny; never resolves Question |
| `reassign_action` | exact future-approved reassign capability; current cycle not terminal; eligible next assignee; expected versions | end old cycle REASSIGNED, create the sole new ASSIGNED cycle, audit | authority is Product decision; cycle conflict rolls back |
| `resolve_question` | future-approved resolver rule + `RESOLVE_QUESTION`; Question visible and currently unresolved by derived decision order | append a resolution decision with next database-controlled Question order and audit | Action completion is not proof; stale/order conflict rolls back; same key returns original |
| `revoke_grant` | `REVOKE_ACCESS` proof within issuer authority; target current; expected grant version | revoke/end the Grant instance and append audit atomically; identify any affected active responsibility without prescribing its lifecycle mutation | revoked proof is unusable immediately; continuity remediation is a separate fail-closed operation whose trigger and transaction boundary are **PRODUCT DECISION REQUIRED** |
| `publish_correction` | approved correction authority; current visible update; expected derived lineage head/ordinal | append the immutable successor version, activity sequence and audit; no mutable head pointer | lineage/ordinal mismatch conflict; no overwrite |

Error classes should distinguish unauthenticated, no complete grant, hidden/not found, invalid state, stale version, idempotency conflict and internal atomic failure without leaking inaccessible object existence.

## 9. Responsibility Cycle persistence and invariants

`winwin_actions` does **not** persist an authoritative current assignee or `current_responsibility_cycle_id`. Every cycle holds `action_id`; the current cycle is the unique effective, non-ended cycle for that Action. This preserves one truth and aligns the frozen Physical Model:

- a partial uniqueness candidate allows at most one effective/non-ended cycle per Action;
- one Action-boundary lock and transaction close the old cycle before inserting a new cycle;
- exact assignee Identity+Membership and assigner Identity+Membership satisfy same-Case composite integrity;
- server-recorded `assigned_at`, `accepted_at`, `started_at`, `completed_at`, `ended_at` and state-compatible checks are authoritative;
- ended cycles are immutable and every reassignment creates a new row;
- current Action workflow meaning is derived from Action terminal facts plus the effective cycle; a view/cache may expose it only as a **NON-AUTHORITATIVE PROJECTION** that is rebuildable, not directly writable and never a second truth.

An Action may exist with no effective cycle; that absence is an observable continuity gap. Whether Product names or presents it `UNASSIGNED`, `NEEDS_REASSIGNMENT` or another state is **PRODUCT DECISION REQUIRED**. ASSIGNED/ACCEPTED/IN_PROGRESS/COMPLETED come from the one compatible cycle. Action Completion and Responsibility Cycle Completion therefore use the same fact, while Question resolution remains independent. Cross-table same-Case and terminal agreement still require the controlled transaction; direct cycle and Action lifecycle writes are denied.

## 10. Concurrency model

Use a consistent lock hierarchy for operations that can intersect: Case → Membership/Relationship/Grant lifecycle instances in stable ID order → Action in stable ID order → effective Responsibility Cycle. Authorization is re-evaluated at one database time after the required facts are locked. Invitation acceptance uses a separate hierarchy beginning with Invitation because the recipient may not yet have a Case path. Within those orders use row locks for multi-row invariants, expected `row_version` for stale-client detection, unique constraints for final race defense, and operation idempotency keys for retry identity.

| Race | Control and outcome |
|---|---|
| Two requests accept one Action | Follow common hierarchy and lock Action/effective cycle; CAS `ASSIGNED` + expected version + exact assignee. One commits; the other returns the same result only with the same idempotency key, otherwise stale-state conflict |
| Accept versus reassign | Both follow the same hierarchy. One commits; loser rechecks and fails stale state/version. No accepted old cycle after reassignment |
| Complete versus grant revoke | Both follow Case→Grant→Action→Cycle order. If revoke wins, completion has no valid proof. If completion wins, completed attribution remains and revoke applies afterward without rewriting history |
| Duplicate complete | Unique operation idempotency + locked state. Same key returns original completion; different key after terminal state returns already-completed/stale result without new audit |
| Duplicate invitation accept | Lock invitation; unique credential and source-invitation materialization constraints. Same key returns original IDs; competing identity/key cannot create another path |
| Concurrent cursor advances | Atomic upsert with `max(stored, supplied server boundary)`; regression is impossible and equal boundary is idempotent |

Long-running business work never holds a transaction open. Only each short transition is atomic. Deadlock/serialization failures are retryable only with the same idempotency key and bounded retry policy.

## 11. Idempotency contract

Invitation accept, Action assign/accept/start/complete/reassign, Question resolution, correction publication, revocation and audit creation require a client-generated opaque operation key bound server-side to the Runtime Actor Context/Logical Identity, operation, target and normalized request fingerprint. Reusing a key with different parameters is an idempotency conflict, never “return first result”.

Cursor advancement is naturally idempotent by monotonic max and does not require a separate operation row for MVP. Audit is not independently retried: it is inserted in the owning transaction with a unique correlation to that transition. Membership, grant, cycle, version and event source/idempotency uniqueness provide final duplicate defense.

A generic idempotency table can be deferred if each owning entity/event has sufficient unique keys. Add one only when response replay across heterogeneous transitions is concretely required.

## 12. Invitation materialization

Two fail-closed representations were considered:

| Option | Result |
|---|---|
| A. Delay Grant instance creation until every activation prerequisite passes | **Selected for the student MVP.** There is no pending Grant for a helper to misinterpret, and activation has one clear creation boundary |
| B. Create an explicit `PENDING`/`INACTIVE` Grant instance at acceptance | Viable only if every helper and transition proves `ACTIVE`; adds lifecycle states and negative-path surface without a first-slice need |

Invitation acceptance is one transaction:

1. authenticate the account, build the Runtime Actor Context and resolve the bound recipient Logical Identity;
2. lock the Invitation by credential digest/reference without exposing the raw credential;
3. require PENDING status, exact recipient binding and server time inside the acceptance window;
4. validate the immutable relationship, purpose, scope and capability proposal plus issuer authority captured at issuance;
5. idempotently create, or on an exact same-Invitation retry reuse, the new Membership and Relationship lifecycle instances, which may remain pending/waiting when service start, professional verification or another required activation fact is absent;
6. if and only if every activation prerequisite passes at the same server time, create one active Grant lifecycle instance with the exact proposed purpose, scope, validity and capability mappings;
7. mark the Invitation accepted, store the materialized instance identifiers and activation disposition, append audit under one correlation/idempotency reference, and commit all or none.

When any prerequisite is absent, acceptance creates **no Grant instance** and therefore no usable Single Grant Path. Later activation locks the accepted Invitation proposal and its Membership/Relationship instances, revalidates all prerequisites and issuer/proposal constraints at server time, then creates the active Grant instance, exact capability mappings and audit atomically and idempotently. A scheduler may prompt that activation operation for UX, but time alone never creates authority and missed execution remains fail closed. No separate verification subsystem is implied: if professional verification is required by the selected slice, activation consumes only the authoritative prerequisite established by its separately reviewed owner.

## 13. Revocation and continuity

### Frozen technical invariants

- The revoked grant stops satisfying reads and operations immediately at the authoritative transaction/database-clock boundary.
- Published/completed content, authorship, completed responsibility and audit history remain immutable.
- The system deterministically identifies any effective Responsibility Cycle whose current operation path depended on the revoked Grant while preserving the existing responsibility and historical attribution.
- No future transition may rely on the revoked Grant proof.
- Do not auto-select a replacement. The former assignee cannot mutate the Action through the revoked proof; any different complete Grant Path must be independently evaluated.
- A completed cycle stays completed; revocation does not rewrite past authority.
- Notification delivery is not authorization and failure to notify cannot restore access.

### Product decisions required

Before implementing revocation with active work, Product must decide whether and when the effective cycle ends, how the Action presents a continuity gap, who or what triggers reassignment, urgency/escalation and notification behavior, continuity when no eligible replacement exists, and whether remediation is atomic with revocation or a controlled follow-up transaction. Engineering must not infer these from “manager” labels.

## 14. Read Cursor persistence

One Case-level cursor per Logical Identity+Membership lifecycle instance+Case is sufficient for the MVP vertical slice. It tracks the visible Case activity projection, not every record receipt. The monotonic boundary is a server-issued Case activity sequence attached to visible domain changes; the Audit Event may carry that sequence but is not itself permission. Global sequence gaps are never exposed as hidden counts.

Cursor ownership includes the exact Membership lifecycle instance to prevent a replacement from inheriting visibility history accidentally. Safe default: a new Membership instance starts a new cursor. Whether a re-invited same Logical Identity should inherit the prior cursor remains a Product choice and can be deferred; automatic inheritance is forbidden.

The cursor update accepts only a boundary returned by the server for that Logical Identity's visible projection in the authenticated Actor Context and stores `max(current, boundary)`. RLS limits rows to exact Identity/Membership instance; the server validates the boundary and database time. Cursor deletion/rewind is not an ordinary client operation.

## 15. Audit Event persistence

`winwin_audit_events` is append-only and all direct client insert/update/delete is denied. Minimum fields are event ID, Case, Runtime Actor Context including Logical Identity/Membership/account-link instance, operation, allow-listed target type/ID, optional responsibility cycle, authorizing Grant lifecycle-instance proof, previous/new state references, server timestamp, monotonic Case activity sequence and correlation/idempotency reference.

Previous/new state references are identifiers/version numbers or bounded state codes, not copied sensitive payloads. The target is a controlled polymorphic reference, so it has no native FK capable of proving every target; the internal writer must enforce an allow-list, target existence and same-Case consistency. The owning transition writes audit atomically; an audit insert failure rolls back the business mutation. Read access to audit is narrower than content visibility and must not be exposed merely to implement the cursor. Operational retention, legal export and privileged security review are later policy work.

## 16. Question persistence

The second-stage logical shape needs a stable Question identity, append-only answer facts and append-only resolution/reopen decisions. Candidate physical tables are `winwin_questions`, `winwin_question_events` and `winwin_question_decisions`, but that split remains subject to its later Physical Model review. An answer needs an independent fact because there may be multiple answers and each needs author/time/content attribution. Full event sourcing is unnecessary; if implemented, current Question meaning is derived from the highest valid database-controlled Question decision order, not a mutable status column.

The Question stores typed author/visibility/purpose/scope facts directly. Optional Source References must pin visible Content Versions in the same Case. `resolve_question` appends its own decision/audit; reopen appends a later decision and never deletes the prior resolution or reopens completed Actions. Action completion never invokes either transition implicitly.

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
| Runtime Actor Context / Logical Identity mapping | Foundation account-link lifecycle facts; physical stable Actor reference may back Identity | controlled Identity operation | exact self/minimum projection | Yes for link lifecycle | Yes |
| Membership lifecycle instance | accepted invitation/governance operation | invitation/access transition | exact own terms or authorized Case operation | Yes | Yes |
| Relationship lifecycle instance | typed invitation/governance operation | invitation/access transition | minimum needed for grant/record decision | Yes | Yes |
| Grant lifecycle instance + capability mappings | typed issuer decision/materialized invitation activation | grant/access transition | own terms + private single-path authorization helper | Yes | Yes |
| Care Update Source Envelope / Content Version | publish/correction transition | controlled domain operation | typed visibility RLS + payload projection | Yes | Yes |
| Question / answer event / decision | ask/answer/resolve/reopen transition | controlled domain operation | typed visibility RLS + visible-source rule | Yes | Yes |
| Action | Action transition | controlled domain operation | record visibility RLS | Yes | Yes |
| Responsibility Cycle | Action assignment/transition | controlled Action operation only | Action visibility + minimum assignee view | Yes, always | Yes |
| Invitation | typed issue/accept/revoke operation | controlled access operation | recipient/issuer minimum view | Yes, always | Yes |
| Read Cursor | visible-activity cursor operation | exact actor via server max-upsert | exact identity+membership | Yes for boundary validation | No separate audit for routine advance |
| Audit Event | owning transition | server transition only | privileged/minimized policy | Written inside transition | It is the audit |

## 19. RLS threat model

| Threat | Future enforcement layer |
|---|---|
| Same role, different Identity reads AUTHOR_ONLY | typed entity/content RLS exact author Identity+Membership + single grant helper |
| Same role impersonates assignee | server transition exact effective-cycle assignee Identity+Membership + RLS/direct-write denial |
| Membership exists without grant | helper requires one complete current grant row |
| Two partial grants combined | same-grant correlated query and tests; never independent EXISTS predicates |
| Expired grant | database-clock validity in helper |
| Revoked grant | status/revoked time in helper; grant transition lock |
| Future service before start | no Grant instance before activation; membership/relationship effective-time checks; pending/waiting state denied |
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

- every Membership, Relationship and Grant lifecycle instance, Content Version, designation, domain object, cycle, cursor and audit row references the same Case scope;
- Grant grantee Identity equals Membership Identity; Grant and Membership reference the exact Relationship instance for that Identity+Case;
- content/domain author Identity+Membership match; designations and assignees match Identity+Membership+Case;
- each Care Update Content Version references one matching Source Envelope; Questions and Actions retain their own typed authorization columns rather than an unapproved generic record supertype;
- update versions/corrections, Question sources and Action sources stay in the same Case;
- source references pin a specific Content Version and same-Case typed target.

### Unique/index candidates

- one current account→actor mapping under Foundation rules;
- controlled active Membership/Relationship lifecycle-instance uniqueness, without assuming one lifetime membership;
- Grant source+instance and Invitation materialization uniqueness;
- content-version+Identity+Membership+designation-kind uniqueness;
- envelope+version ordinal uniqueness and at most one successor per predecessor, producing one derived lineage head without an authoritative pointer;
- one non-ended responsibility cycle per Action;
- identity+membership+Case cursor uniqueness;
- operation target+idempotency uniqueness and audit correlation uniqueness.

### Check/immutability candidates

- valid periods are ordered; terminal states require terminal server timestamps;
- capability set nonempty and vocabulary-controlled; missing/unknown is deny, never wildcard;
- visibility/designation shape is consistent (`AUTHOR_ONLY` requires no rows; participant policies require appropriate rows);
- responsibility timestamps follow assigned ≤ accepted ≤ started ≤ completed/ended;
- published versions, ended cycles and audit events are immutable;
- cycle state changes only through controlled transition; Action current responsibility meaning is derived;
- Question current resolution is derived from ordered append-only decisions, not duplicated in a mutable status column;
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
| `FAMILY_TEAM` / `PROFESSIONAL_TEAM` exact audience meaning | **MUST DECIDE BEFORE BATCH 2 IMPLEMENTATION** if either policy enters MVP | Relationship label alone is insufficient; deny until relationship subtype, purpose and audience boundary are approved |
| Prior-assignee visibility | **MUST DECIDE BEFORE BATCH 2 IMPLEMENTATION** if Action direct-participant visibility enters MVP | Historical assignment does not grant visibility; fail closed until vocabulary closure |
| Revocation state/continuity behavior | **MUST DECIDE BEFORE BATCH 2 IMPLEMENTATION** of active-work revocation | Immediate access loss; preserve history; no auto-transfer |
| Delegated responsibility | **CAN DEFER UNTIL VERTICAL SLICE** | MVP exact current assignee only; no delegation |
| Supervisor completion | **CAN DEFER UNTIL VERTICAL SLICE** | MVP exact current assignee only; supervisor cannot complete for another identity |
| Cursor membership replacement | **CAN DEFER UNTIL VERTICAL SLICE** | New membership gets new cursor; no inheritance |
| Revocation notification | **CAN DEFER UNTIL VERTICAL SLICE** | Not an authorization dependency; MVP may show reassignment queue without delivery system |
| Continuity escalation/urgency workflow | **FUTURE DEVELOPMENT** after safe revocation minimum | No inferred clinical escalation; retain visible unresolved Action for authorized users |
| Rich organization/delegation hierarchy | **FUTURE DEVELOPMENT** | Excluded from MVP IAM model |

These unresolved workflow decisions do not create an architecture conflict: the schema/transition boundaries fail closed and allow the affected operation to remain unimplemented until Product review.

Accordingly, this bounded architecture correction is complete enough for **Product Decision Closure**, where the `MUST DECIDE` items can be dispositioned operation by operation. It is not implementation authorization.

## 22. MVP / Second Stage / Future

### MVP required for first formal vertical slice

- upstream active Foundation actor/identity/Case authority;
- Membership, Relationship and single-Grant-instance path;
- Invitation acceptance/activation only if onboarding enters the selected slice; no Grant exists before all activation prerequisites pass;
- Source Envelope, Content Version and typed participant/designation support needed by selected MVP visibility policies;
- Care Update version 1 publication with derived current version; Observation semantics are deferred unless Product later selects them;
- Action and Responsibility Cycle assign/accept/start/complete;
- Case-level cursor and server activity sequence;
- append-only audit and idempotent server transitions;
- typed SELECT RLS plus direct-write denial and transition-only mutations.

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
3. table/column/constraint names, bounded Physical Model splits and private helper ownership/search path/ACL model;
4. single-grant query shape and deny-case tests;
5. server transition API, lock order, versions and idempotency semantics;
6. required Product decisions for the operations entering the slice;
7. legacy row inventory and no-bridge/one-way mapping decision;
8. RLS threat-test matrix, audit atomicity and privacy projections;
9. explicit separate authorization for migration-file creation and later runtime gates.

Until then this artifact is review input only.

## 25. Gate decision

The architecture is consistent with the frozen Actor／Identity／Membership／Relationship／single-Grant／record-or-cycle／capability／audit chain. It has no role-only authority, grant stitching, Care Circle truth, generic record authority, dual write, destructive publication correction or client-authoritative transition. “Generation” is explicitly an immutable lifecycle instance, not a required numeric counter. Responsibility and content heads are derived without authoritative mutable pointers. Invitation acceptance cannot create a usable pending Grant path, and conditional child-table representations remain design candidates rather than premature physical commitments.

Implementation authorization remains **not ready** because the selected MVP capability/scope vocabulary, team-audience and prior-assignee visibility meaning, reassignment and Question/correction authority, and active-work revocation behavior still require explicit Product dispositions. The safe positions are deny, exact current assignee only, immediate future-access loss, preserved history and no automatic responsibility transfer. Those boundaries prevent unsafe implementation but do not authorize engineering to choose care-governance workflow.

**Design status: STABLE AFTER BOUNDED ARCHITECTURE CORRECTION — READY FOR PRODUCT DECISION CLOSURE; NOT IMPLEMENTATION AUTHORIZATION.**

No migration file, SQL, RLS policy, function, RPC, API, runtime enforcement, Supabase operation, Docker operation, cutover, push, remote or Production action is created or authorized by this document.
