# WinWin Responsibility Recovery Product Decisions V1

Status: **FROZEN PRODUCT DECISION — RESPONSIBILITY RECOVERY V1**

Scope: **Declined-gap recovery only**

Baseline: `252ef53298039f39d7c9e33ac4c9f458a9bd2a81` (`feat: close winwin first vertical slice`)

## 1. Authority and boundary

This artifact freezes the smallest coherent responsibility-recovery product model after the closed First Vertical Slice. It is subordinate to the accepted Product Authorization Domain Contract, Backend Record Authorization Design, Authorization Workflow Decisions, First Vertical Slice Product/UX and Screen Contracts, and their implementation plans.

This decision does not authorize implementation, schema changes, runtime work, deployment, or production access. It does not claim that the WinWin MVP, Backup Care, interruption scenarios, production authentication, backend persistence, clinical validation, or long-term-care service integration is complete.

The canonical authorization capability is `ACTION_REASSIGN`. Earlier `REASSIGN_ACTION` vocabulary is an adapter name only and must not become a second capability.

## 2. Product purpose

Responsibility Recovery addresses an unfinished care-coordination Action after the person asked to take responsibility declines. Merely displaying `NEEDS_REASSIGNMENT` truthfully reveals the vacancy but does not restore responsibility. Recovery lets a separately authorized person ask one exact eligible replacement candidate, while preserving consent, authorization, history, and the fact that an assignment request is not confirmed care coverage.

This is not generic task reassignment. It prevents a care-continuity failure in which several people can see a task but nobody has explicitly agreed to ensure it is handled. It also preserves an honest unresolved state when no internal candidate can accept.

## 3. Responsibility model

An Action is not a Responsibility Cycle. The Action lifecycle remains:

```text
ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED
```

Responsibility-cycle end reasons are separate facts, including `DECLINED`, `REASSIGNED`, `RELINQUISHED`, `CANNOT_CONTINUE_AFTER_START`, and `ACCESS_REVOKED`. They are not Action lifecycle states. Ended cycles and their assigner, assignee, milestones, reasons, and server times are immutable history.

Current responsibility is derived from the sole effective, non-ended Responsibility Cycle. The Action stores no authoritative current-assignee or current-cycle pointer. `NEEDS_REASSIGNMENT` is a derived continuity condition for an unfinished Action with no effective cycle.

## 4. Coverage semantics

The product distinguishes five states:

| State | Authoritative condition | Product meaning |
|---|---|---|
| Responsibility vacancy | Unfinished Action; no effective cycle | `NEEDS_REASSIGNMENT`; nobody is currently confirmed to take over |
| Reassignment pending | New effective cycle is `ASSIGNED`; candidate has not accepted | Narrow cycle vacancy has ended, but confirmed responsibility coverage is false; say “等待 C 確認” |
| Confirmed responsibility coverage | Effective cycle is `ACCEPTED` | Candidate explicitly accepted; product may say “目前已有確定接手者” |
| Execution | Effective cycle is `IN_PROGRESS` | Responsibility was accepted and execution has started |
| Completion | Effective cycle is `COMPLETED` | The Action workflow is complete; this does not prove the broader care issue is resolved |

Candidate selection and a committed reassignment request do not establish confirmed coverage. Acceptance establishes confirmed responsibility coverage; Start is separately the beginning of execution.

## 5. Frozen product decisions

### PD-R1 — Who may reassign

Only an Identity may initiate reassignment when the server derives a valid current Actor Context and confirms an active Identity, active same-Case Membership, current Relationship, separate Action visibility, one complete current Grant path containing canonical `ACTION_REASSIGN` and the required scope, and current Action/responsibility version.

Creator, original assigner, family/professional role, manager label, `DemoRole`, current assignment, and historical responsibility confer no implicit authority. Capabilities or scopes from different Grants are never stitched.

### PD-R2 — When MVP recovery may occur

The minimum recovery slice permits reassignment only when the prior Responsibility Cycle ended `DECLINED`, the Action is unfinished, no effective Responsibility Cycle exists, and `NEEDS_REASSIGNMENT` applies.

Relinquishment after acceptance, inability to continue after Start, revocation recovery, membership-loss recovery, non-response timeout replacement, and forced reassignment remain outside this slice.

### PD-R3 — Candidate eligibility

The server returns exact eligible Identity plus same-Case Membership lifecycle references. The Identity, Membership, Relationship, visibility and response path must be current; revoked, expired, unrelated, role-only, team-only, or invitation-only candidates are excluded. The candidate must have the complete path needed to receive, view, and respond to the Action.

Eligibility means technically eligible to receive the request. It does not establish willingness, availability, physical presence, clinical competence, direct-care suitability, or guaranteed care delivery.

### PD-R4 — Previous decliner

A previous decliner may be asked again only if currently eligible, explicitly selected again by an authorized human, and placed in a new Responsibility Cycle with a new Accept/Decline decision. Prior decline history remains. There is no automatic retry or default selection. A future neutral history hint requires user validation and must not be punitive.

### PD-R5 — Immutable cycles

Every reassignment attempt creates a new Responsibility Cycle. It never edits or reopens an ended cycle. After Cycle 1 ends `DECLINED`, Cycle 2 may be created `ASSIGNED` for one replacement. Acceptance advances Cycle 2. Decline ends only Cycle 2 as `DECLINED`, leaves no effective cycle, and derives `NEEDS_REASSIGNMENT` again.

### PD-R6 — Vacancy and pending confirmation

`NEEDS_REASSIGNMENT` applies only while an unfinished Action has no effective cycle. Creating the new `ASSIGNED` cycle ends that narrow vacancy condition, but the product must show pending confirmation and must not claim confirmed coverage.

### PD-R7 — Acceptance and coverage

The replacement candidate's explicit Accept establishes confirmed responsibility coverage. It does not mean work has started, care has occurred, or the person will personally perform physical care.

### PD-R8 — One candidate

At most one effective candidate and one effective, non-ended Responsibility Cycle may exist for an Action. Parallel candidates, broadcast requests, first-to-accept races, and competing effective cycles are prohibited in this slice.

### PD-R9 — No automatic replacement

The system and AI must not select or assign a replacement automatically. Deterministic eligibility filtering is allowed. Candidate selection requires authorized human intent; responsibility requires candidate acceptance.

### PD-R10 — No candidate

An empty eligible set creates no cycle and leaves the Action in `NEEDS_REASSIGNMENT`. The product says:

> 目前沒有可重新安排的接手者。
>
> 這項照顧目前仍沒有人確定接手。

Bounded guidance may suggest confirming whether another person can join care collaboration or using existing support channels. It must not promise an unavailable service, fabricate a recommendation, or require choosing a family member.

### PD-R11 — Repeated declines

Each decline ends only its cycle, preserves historical facts, clears the effective holder, returns the unfinished Action to `NEEDS_REASSIGNMENT`, and never selects the next person. The UI prioritizes current truth and places older cycles in progressively disclosed responsibility history.

### PD-R12 — Action lifecycle during recovery

The core lifecycle remains unchanged. A new assignment attempt projects `ASSIGNED`. Neither `REASSIGNED` nor `NEEDS_REASSIGNMENT` becomes an Action lifecycle state.

### PD-R13 — Audit

The minimum reassignment audit includes Case ID, Action ID, initiating Runtime Actor Context, initiating Identity and Membership, the complete authorizing Grant proof, operation, prior Responsibility Cycle and end reason, new Responsibility Cycle, selected candidate Identity and Membership, expected/current state references, authoritative server time, idempotency/correlation reference, and resulting responsibility condition.

Audit is atomic with the mutation. It does not duplicate the protected Care Update body, detailed family information, or other unnecessary personal data. Product Activity remains a separately permission-filtered projection.

### PD-R14 — Concurrency invariant

For each unfinished Action there is at most one effective, non-ended Responsibility Cycle. Concurrent recovery attempts are serialized at the authoritative Action/cycle boundary: one may commit; the loser receives a stale/conflict result. Client hiding and disabled controls are not the invariant.

### PD-R15 — Stale state

If another actor already created a cycle, a stale recovery mutation is rejected without overwrite. The client refreshes the authoritative Action, removes the obsolete recovery control, shows the latest responsibility state, and requires renewed intent. Recommended bounded wording is “這項處理事項已更新，請查看最新負責狀態。” The original request is not replayed automatically.

### PD-R16 — Mutation uncertainty

Recovery reuses the existing operation-key framework: `COMMITTED`, `DEFINITELY_NOT_COMMITTED`, `UNKNOWN`, and `IDEMPOTENCY_CONFLICT`. `UNKNOWN` triggers status lookup rather than blind resubmission. An identical retry reuses its key; a changed request requires a new explicit intent and key. No second mutation framework is created.

### PD-R17 — UI ownership

Responsibility Recovery lives inside existing Action Detail as an inline recovery section with bounded candidate disclosure and a confirmation step. There is no new primary route, general Actions dashboard, or standalone reassignment application.

### PD-R18 — Minimum new input

Client mutation input is limited to Action ID, selected candidate reference, expected Action/responsibility version, and operation key. The server derives Actor Context, authorization, prior cycle, server time, audit facts, and authoritative result. No detailed decline reason, reassignment reason, family schedule, medical detail, availability calendar, or candidate score is added.

### PD-R19 — Deferred work

Deferred: relinquishment UI, revocation/membership-loss recovery UI, non-response timeout policy, forced reassignment, external notifications, decline-reason taxonomy, ranking, parallel/broadcast requests, availability scheduling, Backup Care, LTC linkage, 24h/72h/7d scenarios, risk/resilience scores, and AI caregiver selection.

### PD-R20 — Responsibility restored

Responsibility is confirmed restored only when the newly assigned candidate explicitly Accepts. Selection: no. Committed reassignment request: no. `ASSIGNED`/waiting: no. `ACCEPTED`: yes. `IN_PROGRESS`: execution started. `COMPLETED`: Action completed.

## 6. Consent and responsibility meaning

Action responsibility means responsibility for ensuring the Action is handled, not necessarily personally performing physical care. A family member may coordinate while a care worker performs. Acceptance therefore proves neither clinical capability nor actual care delivery.

The initiator uses “重新安排接手者”; review says “將請 C 確認是否接手”; pending says “等待 C 確認”; the candidate receives equally discoverable “接受處理” and “目前無法接手”; accepted says “C 已確認接手”. Avoid wording that treats a family relationship or assignment request as consent.

No decline reason or additional reassignment reason is collected in this slice. Whether an optional coarse reason materially improves recovery requires user/professional validation.

## 7. Product Activity

The minimum user-facing events are:

- reassignment request created: “已請 C 確認是否接手”;
- candidate accepted: “C 已確認接手”;
- candidate declined: “C 目前無法接手”.

Do not add a redundant gap event when the gap is completely derived from the cycle transition and current projection. Security/domain audit remains more detailed than Product Activity.

## 8. Privacy and accessibility

Candidate results expose only an opaque candidate reference, safe display name, and minimum authorized relationship/service-validity context needed to distinguish the person. They expose no other Cases, Grant inventory, contact detail, health information, schedule, or suitability score.

Recovery state is not color-only. Candidate selection is labeled, keyboard operable, and has no preselected value. Mutation requires confirmation, prevents duplicate submission while pending, announces outcomes, and moves focus to the authoritative resulting status. Stale, uncertain, no-access, and access-loss replacement must clear protected candidate state and move focus safely. Accept and Decline remain equally discoverable.

## 9. Notification and AI boundary

Notification delivery is not required. The fictional frontend may assume the candidate sees the request when entering WinWin, but must not claim that push, LINE, SMS, or email was sent.

Generative AI is unnecessary and has no responsibility authority. It may not select, rank, assign, or infer caregiver consent. Any future explanatory use requires separate design.

## 10. Future Backup-Care bridge

The model deliberately preserves this future path without implementing it:

```text
NEEDS_REASSIGNMENT
→ no eligible internal candidate
→ unresolved care gap
→ future Backup-Care assessment
→ informal/family and formal LTC options
→ coverage plan
→ 24h/72h/7d interruption scenarios
```

The current phase supports family/service coordination and continuity of responsibility. It is not a Backup Care solution, service marketplace, clinical safety system, or Long-Term Care 3.0 eligibility/booking flow.

## 11. Validation questions

The following are **REQUIRES USER / PROFESSIONAL VALIDATION**, not implementation blockers or frozen clinical truth:

- whether “重新安排接手者” and pending/coverage wording are understood;
- whether a prior-decliner hint feels informative or coercive;
- what minimum Action context candidates need before accepting;
- whether explicit acceptance matches family and professional practice;
- when families consider responsibility versus actual care coverage restored;
- how one-person households and no-candidate gaps are handled in practice;
- whether existing due-time presentation is adequate before later urgency work.

## 12. Decision result

The declined-gap, one-candidate recovery model is coherent and bounded. It is ready for a separate implementation-planning closure and later explicit implementation authority. Nothing in this artifact itself authorizes product implementation.
