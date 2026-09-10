# WinWin Care Coverage Product Decisions V1

Status: **PRODUCT DECISION REVISION — PENDING BLOCKING VALIDATION — NOT FROZEN**

Baseline: `18d4442286ece8fcaed8d96e212936afdf59edaa`

## 1. Purpose

Define the smallest truthful product model that lets a family see which important care activities have confirmed responsibility and where a concrete interruption may occur. This draft reconnects the closed Responsibility Recovery slice to care continuity without claiming clinical assessment, service availability, or production readiness.

## 2. Scope

The proposed slice begins with approximately five important recurring, one-time, or as-needed Care Activities for one Case, assigns a daypart or exact date context, records a responsibility arrangement, derives explicit coverage semantics, and shows concrete gaps. Five to ten remains a usability hypothesis rather than a quota or completeness claim. It is product-definition work only.

## 3. Problem Definition

Responsibility Recovery repairs an already-known Action whose responsible person declines. It does not reveal the full set of care that must continue. Care Coverage answers: “For the care activities we have assessed in this period, which have confirmed responsibility, which await consent, and which lack a confirmed arrangement?” It does not predict clinical harm or prove that all care needs have been captured.

## 4. Terminology

- **Care Need:** a functional or support need of the older adult, such as assistance with toileting.
- **Care Activity:** a recurring, one-time, or as-needed activity intended to meet a Care Need in a bounded time context.
- **Care Task:** user-facing shorthand only; not a new authoritative entity in V1.
- **Action:** an operational piece of work with the existing lifecycle. An Action may be created to resolve a specific activity issue, but is not the recurring activity itself.
- **Responsibility:** who ensures an activity is handled; this need not mean personally performing physical care.
- **Care Coverage:** a derived statement about confirmed responsibility for one assessed Care Activity in one evaluation period.
- **Backup Person/Arrangement:** an explicitly recorded alternative arrangement. A known person is not automatically a backup.
- **Care Gap:** an assessed, required Care Activity in the evaluation period with no confirmed responsibility arrangement.
- **Availability:** evidence about whether an arrangement can operate in a relevant period; V1 does not collect detailed personal schedules.
- **Capability:** suitability or competence to perform care. V1 does not assess it clinically.
- **Confirmed Responsibility:** explicit acceptance by the exact internal responsible actor. A family-reported formal-service arrangement is not platform-verified coverage in the Minimum Slice.

## 5. Care Activity Model

Minimum fields:

| Field | Why / interruption value | Privacy burden | MVP decision |
|---|---|---|---|
| Activity ID | Stable reference, audit and future scenario composition | Low, opaque | Include |
| Case ID | Associates activity with the older adult | Protected relationship | Include, server-derived context |
| Label | Identifies what must continue | May reveal care routine | Include, short free text |
| Category | Helps scanning and setup prompts | Can become clinical taxonomy | Include a small non-diagnostic set plus Other |
| Timing | Locates where care may stop | Reveals routine | Include daypart; exact time optional |
| Recurrence | Determines evaluated occurrences | Reveals routine | Include daily, selected days, weekly, one-time, as-needed |
| Required in period | Prevents optional items becoming false alarms | Low | Include boolean/derived applicability |
| Responsibility arrangement | Basis for coverage state | Identifies collaborators | Include by opaque reference and safe display projection |
| Confirmation status | Separates listed from accepted | Low | Include authoritative lifecycle reference |
| Source | Distinguishes family-reported facts | Low | Include bounded source type/display |
| Version/update time | Stale-state and audit safety | Low | Include server version/time |

Exclude assistance-detail scales, diagnoses, precise family locations, work schedules, transportation details, and suitability scores.

## 6. Coverage Semantics

Use four states:

| State | Exact meaning | Suggested UI wording |
|---|---|---|
| `NOT_ASSESSED` | Required coverage information has not been completed | 尚未確認照顧安排 |
| `PENDING_CONFIRMATION` | One arrangement is proposed/assigned but consent is not confirmed | 等待確認接手 |
| `CONFIRMED_COVERAGE` | The exact internal responsible actor explicitly accepted and a valid current confirmation exists | 目前有人確認負責 |
| `NO_CONFIRMED_COVERAGE` | The activity is assessed and required in-period, but no confirmed arrangement exists | 目前沒有確認的照顧安排 |

V1 has no fifth authoritative `UNKNOWN` coverage state. Incomplete responsibility information is `NOT_ASSESSED`; an unavailable authoritative read is a non-coverage UI/service state. `NOT_REQUIRED` is a derived period applicability condition and is omitted from the coverage summary rather than presented as coverage.

## 7. Care Gap Definition

A Care Gap exists only when a Care Activity is active, assessed as required inside the selected evaluation period, and derives `NO_CONFIRMED_COVERAGE`. It must reference the specific activity and time/daypart. Preferred copy: “這個時段目前沒有確認的照顧安排，可能有照顧空窗。” Do not say interruption is certain, dangerous, or clinically high-risk.

`NOT_ASSESSED` and `PENDING_CONFIRMATION` are attention states, not Care Gaps. They remain visible and distinct.

## 8. Time / Recurrence Decision

Use semantic dayparts—morning, midday, afternoon, evening, night—with optional exact time. Any clock boundaries used in a prototype are **PROTOTYPE CANDIDATES — NOT YET DOMAIN-VALIDATED** and remain separate from user-facing labels. Recurrence candidates are daily, selected days, weekly, one-time, and as-needed. As-needed activities appear in a separate “需要時” group and never generate artificial timed gaps. Overnight support may span midnight and remains one semantic night period for prototype testing rather than being silently split at 00:00.

## 9. Relationship to Action

Choose **Option C with explicit opt-in linkage**: Care Activity is a stable care-plan item; an Action is a finite operational instance created only when follow-up work is needed. Do not automatically create Actions for every recurrence. This preserves recurring semantics, existing lifecycle/audit clarity, student feasibility, and future scenario generation.

## 10. Relationship to Responsibility Recovery

Responsibility Recovery applies when an activity-linked Action has an internal Responsibility Cycle that becomes unfilled after decline and a currently eligible candidate can be explicitly asked. A Care Gap caused by `NOT_ASSESSED`, absent collaborators, service uncertainty, or missing activity definition does not automatically invoke RR. The user chooses a bounded “安排接手” action only where authorization and eligibility exist.

## 11. Relationship to Backup Care

Future handoff condition: an assessed required activity has no confirmed coverage, internal recovery is unavailable or exhausted, and the user explicitly asks to explore alternatives. V1 stops at the unresolved gap. It does not match, book, verify eligibility for, or refer to formal services.

## 12. User / Actor Model

- Primary MVP user: family caregiver coordinating the Case.
- Activity creation/edit: separately authorized family coordinator; not inferred from relationship label.
- Arrangement confirmation: exact proposed responsible actor.
- Coverage viewing: separately authorized Case participants through minimized projections.
- Recovery initiation: existing complete `ACTION_REASSIGN` authority only.
- Older adult: accessible summary and consent-aware visibility where separately authorized; no assumption of incapacity.
- Professionals: view or contribute only through explicit scoped authority; no family-wide default access.

## 13. Consent Semantics

A coordinator may propose “請哥哥確認” but cannot record “哥哥會負責” as confirmed. Internal arrangements move proposed → pending → confirmed only through the exact actor's acceptance. Decline is legitimate, neutral, and needs no reason. Family-reported existing formal service arrangements may be preserved only as “家屬回報的既有安排”; they do not independently derive `CONFIRMED_COVERAGE` and are not verified booking or delivery.

## 14. Privacy

Minimum necessary dataset: Case reference; short activity label; non-diagnostic category; daypart/optional time; recurrence; required/applicability flag; safe responsible-arrangement reference/display; confirmation state; bounded source; version and server time. Do not collect diagnoses, full medical records, precise caregiver location, detailed personal availability, employment data, contact details, decline reasons, or cross-Case data.

## 15. Safety / Ethics

| Risk | Why it matters | Mitigation |
|---|---|---|
| Caregiver coercion/blame | Assignment can become family pressure | Exact consent, equal decline, neutral copy, no decline reason |
| Elder autonomy | Family may define care without the elder | Explicit visibility/participation authority and usability research |
| Surveillance | Routine data can expose household patterns | Dayparts by default, minimized access, no location tracking |
| False security | A name or service label may be mistaken for delivery | Confirmed-responsibility wording; never claim care occurred |
| Clinical overclaim | Categories may imply assessment | Non-diagnostic taxonomy; no score, diagnosis, or suitability claim |
| Missing-data alarms | Incomplete setup may be treated as failure | `NOT_ASSESSED` distinct from a Care Gap |

## 16. AI Boundary

No AI is required for the MVP. Deterministic forms and rules are sufficient. A second-stage optional assistant may transform family free text into an editable draft, but nothing becomes authoritative until reviewed. AI must never score clinical risk, select caregivers, infer consent/capability, or choose services.

## 17. LTC 3.0 Alignment

Direct, defensible alignment: family support, aging in place, service-continuity awareness, smart presentation of care coordination, and future resource coordination. Future-only: verified service integration, eligibility, booking, cross-provider continuity, and public-sector workflows. This draft makes no policy-compliance claim.

## 18. MVP Boundary

One Case; approximately five important activities to start; bounded categories plus Other; daypart/optional time; lightweight recurrence; one primary internal responsibility arrangement; four coverage states; timeline-first coverage view; exact gap cards; optional explicit link to existing RR where applicable; deterministic demo/contract semantics. Five to ten remains a usability hypothesis, not a mandatory quota.

## 19. Exclusions

Clinical risk scores, burden scales, fall detection, GPS, medication dosage/adherence decisions, full scheduling, notifications, ranking, caregiver suitability, LTC booking/eligibility, emergency dispatch, 24h/72h/7d simulation, automatic backup generation, provider marketplace, availability optimization, and verified service claims.

## 20. Future Compatibility

Preserve stable activity IDs, recurrence/daypart rules, versioned activity definitions, explicit arrangement identities/types, confirmation provenance, effective periods, and occurrence derivation boundaries. Future scenario engines may project occurrences for 24h/72h/7d and remove an arrangement hypothetically without changing stored facts. Backup Care may consume unresolved gap references, never infer them from a score.

## 21. Research Questions

Blocking before implementation:

- Can family caregivers reliably distinguish `NOT_ASSESSED`, pending, and no confirmed arrangement?
- Are five dayparts sufficient to locate meaningful interruption points without a calendar?
- What minimum activity context lets a proposed caregiver give informed consent?
- Does the proposed category set avoid clinical interpretation?

Nonblocking validation:

- Which activities families prioritize first and whether 5–10 is comfortable.
- How families describe an alternative arrangement.
- How professionals describe “coverage” and contingency planning.
- How family-reported formal services should later be verified.
- Which gaps deserve future escalation, subject to validated methods.

## 22. PD-C Decisions

### PD-C1 — Activity and Action remain separate
Decision: stable Care Activities may explicitly create/link finite Actions. Reason: recurrence is not task lifecycle. Rejected: same entity; automatic Action per occurrence. Future implication: scenario projection can create proposed occurrences without mutating the care plan.

### PD-C2 — Four-state coverage model
Decision: use not assessed, pending, confirmed, and no confirmed coverage. Reason: separates missing information, consent, and actual vacancy. Rejected: binary covered/uncovered and numeric score. Future implication: new evidence states require separate validation.

### PD-C3 — Explicit consent establishes internal coverage
Decision: a named person is not confirmed until exact acceptance. Reason: prevents proxy consent. Rejected: coordinator declaration and role inference. Future implication: reuse Responsibility Cycle semantics.

### PD-C4 — Daypart-first time model
Decision: daypart plus optional exact time and lightweight recurrence. Reason: sufficient location with bounded burden. Rejected: full calendar and sequence-only model. Future implication: retain effective-period rules for scenario expansion.

### PD-C5 — Gap is specific and derived
Decision: only an assessed required activity with no confirmed arrangement is a Care Gap. Reason: avoids false alarms. Rejected: risk score and missing-data-as-gap. Future implication: gap references become future recovery/backup inputs.

### PD-C6 — Timeline-first coverage UX
Decision: daypart timeline with status text and gap-focused summary. Reason: immediately shows where care may stop. Rejected: dashboard score, calendar-first, and category-only cards. Future implication: calendar may be added only if user research demonstrates need.

### PD-C7 — Family coordinator is primary, not authoritative for consent
Decision: a scoped coordinator structures activities; each responsible actor confirms their own arrangement. Reason: balances low burden and consent. Rejected: universal editor and role shortcut. Future implication: professional/elder variants need separate projection research.

### PD-C8 — No automatic RR or Backup Care
Decision: gaps expose explicit next actions only when applicable. Reason: not every gap is a declined internal responsibility. Rejected: automatic candidate selection/referral. Future implication: future backup assessment begins from an unresolved gap with new authority.

### PD-C9 — Minimum necessary care data
Decision: collect only activity/time/recurrence/arrangement/source/version fields. Reason: interruption visibility does not require medical dossiers or family schedules. Rejected: comprehensive care plan. Future implication: any added sensitive field requires necessity review.

### PD-C10 — Deterministic MVP, optional draft-only AI later
Decision: no AI in MVP. Reason: semantics and UI are rule-based. Rejected: risk prediction and caregiver ranking. Future implication: editable drafting may be researched separately.

## 23. Open Questions

Final Traditional Chinese wording, category seed list, daypart labels, treatment of as-needed activities in summaries, elder-facing participation, informed-consent context, and family-reported service expiration remain open pending bounded research.

## 24. Operational Coverage Derivation

Coverage is derived from authoritative, current product facts; a user never selects “covered”. Evaluate access/read conditions before product semantics.

| Authorized? | Authoritative read available/current? | Active? | Applicable in period? | Assessment complete? | Arrangement proposed? | Exact confirmation required? | Valid current confirmation? | Result |
|---|---|---|---|---|---|---|---|---|
| No | Any | Any | Any | Any | Any | Any | Any | `UNAUTHORIZED` / `ACCESS_LOST`, non-coverage UI state |
| Yes | No | Any | Any | Any | Any | Any | Any | `LOADING`, `READ_ERROR`, `STALE`, `NETWORK_UNAVAILABLE` or `NOT_VISIBLE`, non-coverage UI state |
| Yes | Yes | No | Any | Any | Any | Any | Any | Omitted; inactive activity |
| Yes | Yes | Yes | No | Any | Any | Any | Any | `NOT_REQUIRED`, derived applicability condition |
| Yes | Yes | Yes | Yes | No | No | Any | No | `NOT_ASSESSED` |
| Yes | Yes | Yes | Yes | No | Yes | Yes | No | `PENDING_CONFIRMATION` |
| Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | `PENDING_CONFIRMATION` |
| Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | `CONFIRMED_COVERAGE` |
| Yes | Yes | Yes | Yes | Yes | No | Any | No | `NO_CONFIRMED_COVERAGE` |

An arrangement that does not require exact internal confirmation needs a future separately authorized derivation rule; family-reported formal service is deferred and cannot take this shortcut. System/read states never derive a Care Gap. Missing information is `NOT_ASSESSED`, never `NO_CONFIRMED_COVERAGE`.

## 25. Candidate Traditional-Chinese Copy

These candidates require B-01 validation and are not validated wording.

| State | Short label | One-sentence explanation | Allowed wording | Prohibited implication |
|---|---|---|---|---|
| `NOT_ASSESSED` | 尚未確認照顧安排 | 這項活動的照顧安排資料還沒有完成。 | 尚未整理、需要補充安排 | 沒有人照顧、有人拒絕、已有空窗或高風險 |
| `PENDING_CONFIRMATION` | 等待接手確認 | 已提出接手安排，正在等待指定的人確認。 | 等待回覆、尚未確認 | 已有人負責、一定會執行 |
| `CONFIRMED_COVERAGE` | 目前有人確認負責 | 指定的人已確認在這段期間確保這項活動有人處理。 | 已確認負責 | 照顧已完成、親自執行、永久負責 |
| `NO_CONFIRMED_COVERAGE` | 目前沒有確認的照顧安排 | 這項活動已完成安排評估，但這個時段目前沒有確認的負責安排。 | 尚無確認安排、可能有照顧空窗 | 危險、一定會中斷、沒有人可以照顧 |

Concrete gap candidate: **「下午｜如廁協助」** followed by **「目前沒有確認的照顧安排，可能有照顧空窗。」**

## 26. Recurrence and Overnight Semantics

| Candidate | Operational meaning |
|---|---|
| `DAILY` | Applicable once in each selected semantic day/daypart |
| `SELECTED_DAYS` | Applicable on explicitly selected weekdays, without a general calendar rule engine |
| `WEEKLY` | Applicable once in a named weekday/daypart context |
| `ONE_TIME` | Applicable on one explicit date and daypart/optional time |
| `AS_NEEDED` | Conditional support shown in a separate “需要時” group; no scheduled occurrence or timed gap |

For prototype validation, an overnight activity belongs to the night period that begins on the displayed care day even when support crosses midnight. This is a semantic candidate, not a domain-validated clock boundary or timezone architecture.

## 27. Minimum Consent Context

| Field | Decision | Reason |
|---|---|---|
| Older-adult safe display context | REQUIRED FOR CONSENT | Identifies whose arrangement is being considered without exposing a dossier |
| Care Activity label | REQUIRED FOR CONSENT | States what must be handled |
| Category | OPTIONAL | Helps recognition but must not replace the label |
| Daypart / optional exact time | REQUIRED FOR CONSENT | Defines when responsibility applies |
| Recurrence | REQUIRED FOR CONSENT | Defines frequency |
| Effective period | REQUIRED FOR CONSENT | Prevents implied permanent responsibility |
| Responsibility wording | REQUIRED FOR CONSENT | Clarifies “ensure handled” versus personal physical performance |
| Request source / safe requester display | REQUIRED FOR CONSENT | Gives bounded provenance |
| Accept and Decline controls | REQUIRED FOR CONSENT | Preserves exact consent and legitimate refusal |
| Diagnosis, full medication list/record, other schedules, contact details, previous decline reason, capability score or ranking | EXCLUDE | Unnecessary, coercive or sensitive |

## 28. Prototype Category Seed List

Candidate, not domain-validated: **飲食、用藥相關協助、如廁、洗澡／清潔、移位／行動、外出／交通、就醫相關安排、夜間照顧、陪同／看顧、其他**. The list remains deliberately small. “用藥相關協助” never means prescribing, dose calculation, adherence diagnosis, or medication decision support.

## 29. Minimum Dataset Classification

| REQUIRED | OPTIONAL | DEFERRED / EXCLUDED |
|---|---|---|
| Opaque activity reference; server-derived Case reference; short label; small category; semantic daypart; recurrence; applicability; arrangement state; confirmation reference when applicable; bounded provenance; version/server time | Exact time; category clarification through `Other`; bounded effective-period end where needed for consent | Diagnosis; medical record; detailed assistance scale; location; personal schedule; contact details; decline reason; capability/risk/ranking; formal-service contract, eligibility, booking and provider data |

The setup prompt is **「先整理目前最重要、最需要持續的照顧安排」**. Begin with approximately five activities; 5–10 remains a usability hypothesis, never a completeness quota.

## 30. Blocking Validation Protocols

No protocol below has been executed. Every percentage is a **PREDEFINED STUDENT-PROJECT PROTOTYPE USABILITY TARGET**, not a clinical, regulatory, professional, safety, or externally validated threshold. One severe semantic misunderstanding can override a numerical pass.

### B-01 — State comprehension

Recruit approximately 5–8 participants, including some family caregivers where feasible and LTC students/care workers as bounded supplements. Show unlabeled scenarios and prototype cards without teaching the model. Ask participants to distinguish all four states, identify gaps, and explain whether confirmation proves delivery. Target: at least 80% correct per core distinction without coaching. Failure signals include treating missing data as a gap, pending as confirmed, confirmed as completed delivery, or no-confirmed as inevitable danger. Failure requires wording/state-presentation revision. Expected artifact: anonymized task script, response matrix, serious-error log and revision decision.

### B-02 — Daypart and recurrence

Use morning medication support, midday meal support, afternoon toileting, evening bathing, night transfer/support, selected-days, weekly, one-time medical-visit, as-needed, and cross-midnight scenarios. Ask participants to place each naturally, find the unresolved period, and state whether exact time is necessary or burdensome. Target: at least 80% place and interpret core scenarios consistently; no severe loss of overnight meaning. Failure requires revising labels, recurrence limits or adding bounded optional-time guidance—not building a full calendar. Expected artifact: scenario cards, placement matrix, ambiguity notes and decision record.

### B-03 — Consent context

Show the proposed consent card without instruction. Ask: what are you agreeing to, when does it apply, must you personally perform it, can you decline, has care already occurred, and is responsibility permanent? Target: at least 80% answer every core meaning correctly, with zero accepted coercive or permanent-responsibility misunderstanding. Failure requires revising displayed context or wording. Expected artifact: consent-card version, comprehension responses, error taxonomy and revision decision.

### B-04 — Category taxonomy

Give participants representative activity cards and ask them to categorize each, explain confusing overlap, use `Other`, and identify missing common activities or clinical implications. Include a bounded language review by an available care worker, care manager, social worker, LTC educator or comparable professional; do not claim it until performed. Target: at least 80% consistent placement for representative cards, practical `Other` use, and no unresolved clinical interpretation. Failure requires merging, renaming, removing or adding only necessary categories. Expected artifact: card set, categorization matrix, overlap log, domain-language notes and decision record.

## 31. Representative RR Integration

Example: “晚間洗澡協助” has a separately created linked Action. The current responsible actor declines that Action; its immutable Responsibility Cycle has no effective assignment, an eligible candidate exists, and the viewer has `ACTION_REASSIGN`. Only then may the user explicitly open RR and ask that candidate. The recurring activity itself creates no automatic Actions. If no candidate exists, the Care Gap remains unresolved and the product stops truthfully.

## 32. Strengthened Semantic Invariants

- **CI-1:** Listed person is not confirmed coverage.
- **CI-2:** Proposed or assigned is not confirmed coverage.
- **CI-3:** `NOT_ASSESSED` is not a Care Gap.
- **CI-4:** Read/system failure is not a coverage state and cannot derive a gap.
- **CI-5:** Every Care Gap identifies a specific activity and time/applicability context.
- **CI-6:** Confirmed responsibility is not proof that care was physically delivered.
- **CI-7:** Single-activity coverage is not Case-level continuity.
- **CI-8:** Care Activity is not Action.
- **CI-9:** Care Gap alone does not automatically trigger RR.
- **CI-10:** No eligible internal candidate remains unresolved.
- **CI-11:** No arbitrary clinical risk score.
- **CI-12:** Family-reported formal service is not platform-verified delivery or independently confirmed coverage.
- **CI-13:** Exact consent applies only to the displayed activity, recurrence and effective period; decline remains legitimate and reason-free.
- **CI-14:** `AS_NEEDED` does not generate an artificial timed gap.

## 33. Revised Scope Staging

- **REVISED CANDIDATE MVP NEXT — PENDING BLOCKING VALIDATION:** one Case; approximately five important activities; bounded timing/recurrence; proposed internal arrangement; exact actor confirmation; derived coverage; timeline gaps; explicit existing RR linkage where prerequisites exist; unresolved stop when no candidate exists.
- **SECOND STAGE:** family-reported formal-service model, professional projections, elder-specific participation model, optional editable AI drafting, and researched notification/escalation.
- **FUTURE:** Backup Care, formal LTC matching/eligibility/booking, provider/public-sector integration, 24h/72h/7d and long-term interruption simulation, and validated interruption-risk/resilience methods.

Stable activity identity, time/daypart, recurrence, arrangement, confirmation, effective period and version are retained only for future compatibility; no simulation is implemented or authorized.

## 34. Classification

**PRODUCT DIRECTION B — REVISION PREPARED, PENDING REAL BLOCKING VALIDATION.** Care Coverage remains the correct direction and the candidate Minimum Coverage Slice is operationally bounded. The four protocols above have not been executed; implementation and Product Decision Freeze remain unauthorized until their evidence is reviewed in a separate gate.
