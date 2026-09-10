# WinWin Care Coverage MVP Implementation Readiness V1

Status: **IMPLEMENTATION READINESS REVISION — BLOCKING VALIDATION REQUIRED — NO IMPLEMENTATION AUTHORITY**

Product draft: `WINWIN_CARE_COVERAGE_PRODUCT_DECISIONS_V1.md`

Baseline: `18d4442286ece8fcaed8d96e212936afdf59edaa`

## 1. Readiness Purpose

Assess whether a bounded Care Coverage slice is coherent, testable, privacy-minimized, and feasible for a student project. This document proposes future work only; it is not a file-level implementation plan and authorizes no edits.

## 2. Existing Architecture Reuse

Reuse Case authorization, minimized frontend projections, server-derived allowed operations, operation keys, stale/access-loss handling, Product Activity separation, Action Detail, immutable Responsibility Cycles, and exact Accept/Decline consent. Do not reuse Action as the Care Activity entity or introduce role-based shortcuts.

## 3. Proposed Minimum Slice

For one Case, a scoped family coordinator begins with approximately five important Care Activities using category, short label, semantic daypart/optional time, lightweight recurrence, and required/applicability context. Five to ten remains a usability hypothesis, not a quota or completeness claim. Each activity shows `NOT_ASSESSED`, `PENDING_CONFIRMATION`, `CONFIRMED_COVERAGE`, or `NO_CONFIRMED_COVERAGE`. A daypart timeline highlights concrete gaps. An applicable gap may explicitly open the existing Responsibility Recovery path; no candidate remains unresolved.

Recommendation: **modify the broad concept to this bounded slice before implementation**. Do not include caregiver-removal simulation yet.

## 4. Proposed IA

Add one Case-level destination named **照顧安排**. It is not a global dashboard or new primary app section. Case Home may summarize “尚有 N 項需要確認” and link into it. Action Detail remains the owner of Responsibility Recovery.

## 5. Screen Inventory

| Surface | Purpose | Primary user | Core information | Primary action | Important states |
|---|---|---|---|---|---|
| Care Arrangement setup | Create/edit the bounded activity set | Scoped family coordinator | Label, category, daypart, recurrence | Save reviewed activities | Empty, draft, validation, stale, unavailable |
| Coverage timeline | See where care is confirmed or unresolved | Authorized Case participant | Daypart groups, activity status, gap summary | Open one activity | Not assessed, pending, confirmed, gap, read failure |
| Activity detail | Understand one activity and arrangement | Authorized participant | Definition, timing, source, responsibility/history | Propose/confirm arrangement or create follow-up | Pending, confirmed, no confirmed arrangement, stale |
| Gap detail panel | Explain a concrete gap and bounded next steps | Authorized coordinator | Activity/time, why status derives, current options | Arrange internal responsibility when eligible | RR available, no candidate, unavailable |

No standalone risk dashboard, calendar, marketplace, or provider screen.

## 6. User Flows

**Flow A — Initial activities:** Case Home → 照顧安排 → choose from a short checklist/add Other → begin with approximately five important activities → select daypart and recurrence → review → save. Unanswered responsibility stays `NOT_ASSESSED`; the product does not claim the list is complete.

**Flow B — Review coverage:** Open Coverage timeline → scan daypart groups → read explicit status text → filter “需要確認” if desired → open activity detail.

**Flow C — Identify uncovered activity:** Open `NO_CONFIRMED_COVERAGE` item → see specific activity/time and neutral gap explanation → no risk score or certainty claim.

**Flow D — Connect to RR:** If an activity-linked Action has a declined/no-effective cycle and viewer has `ACTION_REASSIGN`, choose “安排接手” → existing RR candidate/confirmation/Accept-or-Decline flow. No automatic invocation.

**Flow E — No internal candidate:** Show unresolved gap and “目前沒有可重新詢問的接手者”; stop. Future support exploration is not implemented.

## 7. State Model

Stored authoritative activity lifecycle: `ACTIVE` or `ARCHIVED`; definition changes create a new version rather than rewriting audit history. Occurrences for the selected period are derived from active version plus recurrence.

Stored arrangement lifecycle reuses explicit proposal/assignment and acceptance facts; do not store a mutable `covered` boolean.

Derived coverage:

```text
not assessed responsibility facts -> NOT_ASSESSED
current proposed/ASSIGNED arrangement -> PENDING_CONFIRMATION
current explicitly accepted arrangement -> CONFIRMED_COVERAGE
assessed + required in period + no confirmed arrangement -> NO_CONFIRMED_COVERAGE
not applicable in period -> omitted / NOT_REQUIRED derived condition
```

Loading, read error, unauthorized, stale, and mutation uncertainty are UI/service-result states, not coverage states.

## 8. Conceptual Data Model

### Care Activity
Purpose: versioned definition of care that must recur or occur. Key fields: opaque ID, Case reference, label, category, daypart/optional time, recurrence rule, applicability, source, version/server times. Lifecycle: active/archive with version history. Ownership: Case-scoped authority. Privacy: routine data is protected and minimized.

### Care Activity Arrangement
Purpose: associates one active activity with one proposed/confirmed internal responsibility source. Key fields: activity/version reference, opaque subject reference/safe display, lifecycle/confirmation reference, effective period, source. Lifecycle: proposed/pending/confirmed/ended. Ownership: manage authority separate from view; exact actor confirms internal arrangement. Privacy: no contact details or personal schedule. Family-reported formal service is deferred; if preserved as information, it cannot independently derive confirmed coverage.

### Coverage Projection
Purpose: derived read model for one evaluation period. Fields: activity safe projection, occurrence/daypart, derived status, bounded explanation, allowed operations. Lifecycle: none; recomputed from versioned facts. Ownership: server/service. Privacy: permission-filtered, no authority inventory.

### Care Gap Projection
Purpose: identifies one assessed required occurrence without confirmed coverage. Fields: activity/occurrence opaque references, daypart, neutral gap copy, allowed next actions. Lifecycle: derived only. Privacy: no diagnosis or probability.

### Existing Action / Responsibility Cycle
Purpose: finite operational follow-up and exact consent/recovery. Relationship: optionally linked from an activity or gap; never replaces the recurring definition. Existing immutable lifecycle remains authoritative.

## 9. Authorization Implications

Future canonical capabilities likely need separate `CARE_ACTIVITY_VIEW`, `CARE_ACTIVITY_CREATE`, `CARE_ACTIVITY_EDIT`, and `CARE_COVERAGE_MANAGE` decisions, while RR continues to use `ACTION_REASSIGN`. Names are proposals, not frozen authority. Each operation requires active Identity, same-Case Membership/Relationship, record visibility, one complete Grant path, scope, and current version. Never infer from family/professional labels or combine Grants.

## 10. Audit Implications

Audit activity creation, material definition/version changes, archive, arrangement proposal/end, and confirmation transitions. Record actor context, authorizing proof, affected opaque references, before/after version references, server time, and operation key. Product Activity uses minimized human wording. Do not duplicate care descriptions, medical detail, schedules, or authorization internals.

## 11. UX Requirements

- Timeline-first daypart groups with status text and icons/shapes, not color alone.
- Gap summary names the activity and time context; no numeric score.
- `NOT_ASSESSED`, pending, and no confirmed arrangement must be visually and semantically distinct.
- No default responsible person, automatic candidate, or coercive confirmation.
- Long names wrap; exact times remain optional; as-needed activities form a separate group.
- Stale changes refresh authoritative facts and clear obsolete drafts.

## 12. Accessibility

Semantic headings/lists; labeled checklist, time and recurrence controls; keyboard-complete setup and arrangement flow; status announced without color; focus moves to validation/result headings; removed stale controls do not retain focus; 200% zoom and representative narrow viewport without horizontal overflow; touch targets and copy remain readable. No formal WCAG claim without separate audit.

## 13. Privacy Requirements

Transmit and render only the minimum dataset in the product draft. Candidate/arrangement reads return opaque references and safe display fields. Errors are bounded and non-enumerating. Clear protected activity, arrangement, gap, selection, and pending state on access loss. Do not cache sensitive schedules in query/local storage. Family-reported services must not expose contractual or eligibility detail.

## 14. Test Strategy

Failure-sensitive contract, screen, safety, and vertical-slice evidence should prove:

1. activity/category/time/recurrence projections are minimized and versioned;
2. no information derives `NOT_ASSESSED`, never a gap;
3. assignment without acceptance stays pending;
4. acceptance alone establishes confirmed responsibility;
5. assessed required/no-confirmed arrangement derives one specific gap;
6. non-applicable occurrences do not create gaps;
7. Care Activity does not automatically create recurring Actions;
8. eligible explicit gap-to-RR linkage reuses existing flow;
9. no candidate stops unresolved without fallback claims;
10. stale/concurrent writes do not overwrite newer definitions or arrangements;
11. access loss clears protected content and controls;
12. role/cross-grant shortcuts fail closed;
13. Product Activity and audit projections do not duplicate sensitive payloads;
14. keyboard, focus, zoom, narrow viewport and non-color states pass;
15. no scoring, ranking, notification, service booking, simulation, or AI authority appears.

## 15. Usability Test Plan

Recruit approximately 5–8 participants across family caregivers and LTC/care students; include one or two care workers/managers if available. Tasks: enter five activities, identify what is not assessed, distinguish pending from confirmed, locate one concrete gap, explain what would stop, and determine what happens when no candidate exists. Measures: task completion, setup time, error count, and comprehension responses. Warning signs: users call pending “covered”, interpret missing data as danger, feel pressured to assign family, cannot finish setup, or believe WinWin booked a service.

The following are **PREDEFINED STUDENT-PROJECT PROTOTYPE USABILITY TARGETS**, not clinical cutoffs, validated standards, professional standards, safety thresholds, or regulatory criteria. A severe semantic misunderstanding overrides numerical attainment:

- at least 80% correctly distinguish the three attention/coverage conditions without coaching;
- at least 80% identify the intended gap and daypart within 30 seconds;
- at least 80% explain that no candidate remains unresolved;
- median five-activity setup is at most 10 minutes in the usability sample;
- no participant interprets a pending person or family-reported service as verified delivery after clarification-free task wording.

These are prototype usability targets, not clinical validation.

## 16. Student Feasibility

The slice is feasible if limited to one Case, approximately five activities initially, five candidate semantic dayparts, lightweight recurrence, deterministic derivation, existing fictional adapter patterns, and four surfaces. Five to ten remains a usability hypothesis. Complexity is moderate: recurrence and authorization need careful contracts, but avoiding full calendar, scenarios, backend service integration, and AI keeps implementation/test burden bounded. Demo value is high because a visible timeline makes interruption points concrete.

## 17. Implementation Risks

- Coverage wording may be misunderstood as actual care delivery.
- Recurrence rules may expand into calendar complexity.
- Activity taxonomy may drift toward diagnosis.
- Families may experience setup fatigue or coercion.
- Linking activities to Actions may accidentally duplicate lifecycle facts.
- Service arrangements may be misread as verified bookings.
- Future scenario needs may tempt premature simulation fields.

Mitigate through blocking prototype research, strict invariants, minimized contracts, and checkpoint gates.

## 18. Blocking Research

Before freeze/implementation: test comprehension of the four states; validate five dayparts; establish minimum consent context; review the category seed list for non-clinical language. Failure requires product revision, not implementation workarounds.

## 19. Nonblocking Research

Validate preferred activities and setup count, alternate-arrangement language, professional coverage terminology, service verification, elder-facing views, and future escalation criteria. These inform later stages without expanding V1.

## 20. Explicit Non-Actions

No implementation, schemas, migrations, backend, Supabase, runtime, notifications, full calendar, caregiver-removal simulation, 24h/72h/7d scenarios, Backup Care, formal LTC matching/booking, clinical assessment, risk score, emergency dispatch, AI ranking, production claim, commit, or push.

## 21. Readiness Layers

### Ready concepts

- Care Activity and Action are separate entities and lifecycles.
- Coverage and Care Gap are derived, not freely selected.
- Four coverage states exclude read/system states and `NOT_REQUIRED`.
- Exact internal actor consent establishes confirmed responsibility.
- A gap alone does not invoke RR; no candidate stops unresolved.
- No AI, score, formal-service verification, Backup Care or simulation is required.

### Blocked before freeze

- B-01 state comprehension and Traditional-Chinese copy.
- B-02 daypart/recurrence sufficiency, including overnight semantics.
- B-03 minimum informed-consent context.
- B-04 non-diagnostic category taxonomy.

### Deferred

- Family-reported formal-service model and verification.
- Professional projection and elder-specific participation model.
- Optional editable AI drafting and researched notifications/escalation.
- Backup Care, formal LTC pathway and scenario simulation.

## 22. Consolidated Blocking-Validation Matrix

No validation below has been executed. Each 80% measure is a **PREDEFINED STUDENT-PROJECT PROTOTYPE USABILITY TARGET**, not a clinical, regulatory, professional, safety, or externally validated threshold. A single severe misunderstanding may override a numerical pass.

| Blocker | Hypothesis | Prototype material | Participants | Task | Failure signal | Prototype target | Qualitative override | Decision after failure | Expected evidence artifact |
|---|---|---|---|---|---|---|---|---|---|
| B-01 State comprehension | Families distinguish four states without treating them as delivery/risk claims | Four-state cards and neutral scenarios | Approx. 5–8; include family caregivers where feasible, supplemented by LTC students/care workers | Classify scenarios, identify gaps, explain delivery meaning | Missing data called gap; pending called confirmed; confirmed called completed delivery; no-confirmed called inevitable danger | At least 80% correct per core distinction without coaching | Any severe false-security, danger or coercion interpretation triggers revision | Revise labels/explanations/presentation, then retest | Versioned script/cards, anonymized response matrix, serious-error log, decision record |
| B-02 Daypart/recurrence | Five semantic dayparts plus optional time locate meaningful interruptions without full-calendar burden | Ten required scenario cards, including overnight | Same bounded mix | Place activities, locate uncovered period, state need/burden of exact time | Important meaning lost, inconsistent overnight placement, exact time routinely required or burdensome | At least 80% consistent core placement/interpretation | Severe overnight or recurrence ambiguity triggers revision | Revise labels/rules/examples, not a full calendar, then retest | Scenario set, placement matrix, ambiguity notes, decision record |
| B-03 Consent context | Minimum consent card supports informed, non-coercive Accept/Decline | Consent card containing only required/optional fields | Proposed responsible actors from bounded sample | Explain what/when/extent, refusal, delivery and duration | Cannot explain duty/time; assumes physical performance, permanence, prior delivery or inability to decline | At least 80% correct on every core question | Any coercive or permanent-duty misunderstanding triggers revision | Revise context/copy/data minimization, then retest | Card version, responses, error taxonomy, decision record |
| B-04 Category taxonomy | Small ordinary-language list organizes common activities without clinical interpretation | Seed categories plus representative activity cards | Caregiver/LTC sample plus one available relevant professional language reviewer | Categorize, explain overlap, use Other, identify missing common activity | Persistent overlap, missing common case, diagnostic interpretation, unusable Other | At least 80% consistent representative-card placement | Any unresolved clinical implication triggers revision | Merge/rename/remove or minimally add categories, then retest/review | Card set, category matrix, overlap log, genuine domain-language notes, decision record |

## 23. Testability Mapping

| Invariant | Future evidence required |
|---|---|
| CI-1 Listed person != confirmed coverage | Contract + screen + integration + B-01 usability |
| CI-2 Proposed/assigned != confirmed coverage | Contract + screen + integration + B-01 usability |
| CI-3 `NOT_ASSESSED` != Care Gap | Contract + screen + integration + B-01 usability |
| CI-4 Read/system failure != coverage/gap | Contract + screen + integration |
| CI-5 Gap identifies activity and time/applicability | Contract + screen + integration + B-02 usability |
| CI-6 Confirmed responsibility != delivered care | Screen + B-01 and B-03 usability |
| CI-7 Activity coverage != Case continuity | Screen + integration + B-01 usability |
| CI-8 Care Activity != Action | Contract + integration |
| CI-9 Gap alone does not trigger RR | Contract + screen + integration |
| CI-10 No candidate remains unresolved | Contract + screen + integration + usability |
| CI-11 No arbitrary clinical score | Contract + screen + domain review |
| CI-12 Family report != verified service/delivery | Contract + screen + integration + usability |
| CI-13 Consent is bounded and decline is legitimate | Contract + screen + integration + B-03 usability |
| CI-14 `AS_NEEDED` produces no timed gap | Contract + screen + integration + B-02 usability |

These are mappings for a future authorized test phase; no tests are written by this revision.

## 24. Revised Scope

**REVISED CANDIDATE MVP NEXT — PENDING BLOCKING VALIDATION:** one Case; approximately five important activities; bounded daypart/recurrence; internal responsibility proposal; exact actor confirmation; authoritative derived coverage; timeline of concrete gaps; explicit existing RR linkage only where its Action/Cycle prerequisites exist; truthful unresolved end state when no candidate exists.

**SECOND STAGE:** family-reported formal-service model, professional projections, elder-specific participation, optional editable AI drafting, and researched notification/escalation.

**FUTURE:** Backup Care; formal LTC matching, eligibility and booking; provider/public-sector integration; 24h/72h/7d and long-term interruption simulation; validated interruption-risk or care-resilience methodology.

## 25. Revised Student Feasibility

The revised candidate remains feasible for a student prototype because it avoids a full calendar engine, clinical ontology, provider API, real-time availability, large-scale service integration, complex AI and validated risk model. Its bounded complexity is deterministic projection, exact consent, version/stale handling and four UI surfaces. The four research protocols are small enough to conduct separately but must not be replaced by invented evidence.

## 26. Readiness Classification

**B — PRODUCT REVISION PREPARED; BLOCKING VALIDATION REQUIRED; NO IMPLEMENTATION AUTHORITY.** The semantics, boundaries and validation protocols are now operationalized, but none of the four blocking validations has been executed or accepted. Product Decision Freeze requires a separate evidence review and freeze gate.

The narrow innovation claim remains: **WinWin represents care continuity as specific, time-contextual confirmed-responsibility gaps and connects applicable internal gaps to an explicit consent-preserving recovery path.** This is a defensible prototype differentiator from generic todos/calendars; it is not a claim of clinical novelty or validated resilience prediction.
