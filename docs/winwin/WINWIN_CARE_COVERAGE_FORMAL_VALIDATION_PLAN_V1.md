# WinWin Care Coverage Formal Validation Plan V1

Status: **FORMAL VALIDATION PLAN — PLANNING COMPLETE / EXECUTION NOT AUTHORIZED**

Baseline: `18d4442286ece8fcaed8d96e212936afdf59edaa`

Planning inputs: `CC-VAL-PILOT-V4`, `SC-V2`, `DP-V2`, `CN-V4`, `CAT-V3`, PILOT-01 (`P01-C`), PILOT-02 (`P02-A`), and the PILOT-02 Evidence Review (`R2`). This document adds a validation plan only. It does not change Product Decisions, lock research materials, recruit participants, execute validation, or authorize implementation.

## 1. Purpose and evidence boundary

The study asks whether intended users can understand the proposed Care Coverage states, timing and recurrence representation, bounded responsibility-acceptance meaning, and non-diagnostic activity organization, and whether they can use the prototype structure to describe approximately five important fictional care activities.

It is qualitative usability/comprehension research with descriptive counts. It is not clinical, diagnostic, medical-device, risk-score, caregiver-suitability, LTC-eligibility, population-validity, statistical-reliability, care-interruption-prevention, or product-effectiveness validation. The design must permit a finding of M2, M3, or insufficient evidence; thresholds must not be changed after results are seen to obtain a pass.

Pilot responses test the instrument and remain outside formal aggregates. PILOT-01 and PILOT-02 are historical design evidence only.

## 2. Authoritative boundary

The seven existing Care Coverage documents remain authoritative inputs and unchanged. In particular:

- Care Activity and Action remain separate.
- Coverage uses `NOT_ASSESSED`, `PENDING_CONFIRMATION`, `CONFIRMED_COVERAGE`, and `NO_CONFIRMED_COVERAGE`.
- Missing information and pending consent are not Care Gaps.
- Confirmed responsibility is not proof of delivered care and need not mean personal performance.
- Daypart plus optional exact time and lightweight recurrence remain prototype candidates.
- No automatic Responsibility Recovery, Backup Care, service matching, eligibility, booking, or referral is introduced.
- Current activity organization is non-diagnostic research material, not a clinical taxonomy.

## 3. Participant stratification

### Group A — ordinary/family-care users

Eligible participants are adults who understand ordinary Traditional Chinese and have not studied WinWin specifications, answer keys, pilot findings, or the research team’s intended classifications. Current or previous experience helping an older family member is preferred where feasible but is recorded only as a bounded category: `CURRENT`, `PREVIOUS`, `NONE`, or `PREFER_NOT_TO_SAY`. Do not require professional experience.

Group A supplies primary evidence for B-01 state comprehension, B-02 timing/recurrence comprehension, B-03 responsibility comprehension, B-04 ordinary-language use, the five-activity exercise, and burden/usability.

### Group B — LTC practice reviewers

Eligible reviewers have genuine current or recent elder/LTC practice experience, such as care management, social work in elder/LTC practice, home-care supervision, direct care work, or day-care practice. Record only role-family, years band (`<1`, `1–3`, `4–7`, `8+`, or `PREFER_NOT_TO_SAY`), practice setting category, and whether work is current/recent. Employer and client identities are prohibited.

Group B supplies B-04 language/content plausibility, missing-domain, overlap, workflow-realism, and product-semantic evidence. They do not certify clinical validity.

### Group C — LTC-related students

Students are an optional, separately coded exploratory group. They cannot substitute for Group A ordinary users or Group B practitioners and are excluded from both groups’ closure denominators. Their findings may generate hypotheses or training-material observations only.

## 4. Sample strategy

The minimum practical target is **8 completed formal participants: 6 Group A and 2 Group B**. The preferred target is **10: 7 Group A and 3 Group B**. This reconciles the existing approximately 6–10 participant protocol with mandatory professional review while keeping the study feasible for a student project.

Six ordinary-user sessions make an 80% descriptive rule operational as at least `5/6 = 83.3%`; seven provide one additional perspective. Two professionals are the minimum for visible agreement/disagreement rather than a single-expert veto; three are preferred. Up to two Group C students may be added only after minimum A/B evidence is secured and reported separately.

Use purposive convenience recruitment and document its limitations. Seek variation in family-care experience and professional role where feasible, without demographic quota claims. No population generalization, prevalence estimate, inferential test, or statistical power claim is allowed. A withdrawal or excluded session does not count toward the completed minimum; collect only the missing stratum/evidence rather than expanding indiscriminately.

## 5. Common session controls

Before every session:

1. Confirm eligibility, participant code, group, current material lock, blank record, private setting, readable participant render, hidden moderator key, and timer.
2. Explain voluntary participation, fictional scenarios, no grades, skip/rest/stop rights, privacy minimization, and separate optional recording consent.
3. Record consent, recording choice, material/component versions, B-01 order, moderator code, and start timestamp immediately.
4. Present only one card/task at a time. Participant-facing materials remain physically or digitally separate from targets, coding, thresholds, answers, and moderator notes.

Group A sequence is consent → start timestamp → B-01 → timestamp/break check → B-02 → timestamp/break check → B-03 → timestamp/break check → B-04 → timestamp/break check → five-activity exercise when agreed → burden/debrief → end timestamp. Group B receives consent, B-04 ordinary card interaction sufficient to understand the structure, then the professional review; B-01–B-03 are not required unless a separately recorded research purpose justifies them.

No session should be advertised as having to finish within a guaranteed duration. Reserve approximately 45–60 minutes for Group A, informed by the pilot’s 40–55 minute estimate, and approximately 35–50 minutes for Group B. Actual timestamps, pauses, and incomplete sessions govern the record.

## 6. B-01 formal validation design

**Question.** Can Group A distinguish incomplete information, pending response, confirmed responsibility, and assessed/no-confirmed arrangement without converting them into delivery, urgency, capability, or service claims?

**Task.** Use the four V4 cards, neutral styling, and counterbalanced non-lifecycle orders. Obtain spontaneous interpretation first, then the standard neutral source and remaining-confirmation probes. Use special confirmation/nobody-can-care/already-done probes only when needed.

**Capture.** First response, cited clue, what remains to confirm, probe answers, selected state meaning, coaching, response fidelity, one quote, order, duration, and confusion source (`LABEL`, `EXPLANATION`, `STATE CONCEPT`, `UNCLEAR`) for every partial/incorrect response.

**Coding.** Code each card `CORRECT`, `PARTIAL`, `INCORRECT`, or `UNUSABLE`. Report raw counts by state and distinction. Critical errors are: `NOT_ASSESSED` automatically treated as a confirmed gap; pending treated as accepted; confirmed responsibility treated as completed/delivered care; or no-confirmed coverage treated as inevitable emergency/proof nobody is capable of helping.

**Descriptive threshold.** At least 80% of usable Group A participants must demonstrate each predefined core distinction without teaching. With six usable participants this is at least `5/6 = 83.3%`. Report numerator, denominator, and percentage for every distinction.

**Override.** Any critical error prevents a simple percentage-only PASS. Review its wording source, persistence after neutral probing, severity, and recurrence. An unresolved material-caused critical error is M2; a coherent contradiction in the intended product meaning is M3; isolated ambiguity may be PASS WITH M1 only when documented and non-critical.

## 7. B-02 formal validation design

**Question.** Can Group A use the five dayparts, five recurrence forms, optional exact time, event cues, as-needed semantics, and one continuous cross-midnight arrangement without treating the task as a calendar engine?

**Task.** Administer V4 scenarios sequentially in four separately coded passes: natural daypart; recurrence; exact-time sufficiency; and the separate S3 coverage/gap fact card. Do not show clock ranges before spontaneous daypart placement. For S10 ask start/end, where it would be found, and whether it is one or multiple arrangements.

**Capture.** First daypart, recurrence label, exact-time judgment (`DAYPART_SUFFICIENT`, `EXACT_TIME_HELPFUL`, `EXACT_TIME_REQUIRED`, `UNCLEAR`), reason, event cue, S9 fixed/as-needed reasoning, S10 continuity reasoning, and S3 arrangement interpretation.

**Metrics.** Report raw numerator/denominator/percentage separately for predefined unambiguous daypart items, recurrence items, S9 as-needed meaning, S10 cross-midnight continuity, and S3 coverage meaning. Do not merge them into a weighted score. The approximately 80% rule applies to each predefined comprehension construct, not to subjective preferences about when exact time is useful.

**Critical errors.** `AS_NEEDED` treated as a fixed scheduled slot or as automatically generating a timed gap; overnight support silently split into unrelated arrangements solely at midnight; or timing text alone used to claim confirmed/no-confirmed coverage. Material-caused recurrence is M2; contradiction with frozen candidate semantics is M3; varying exact-time preferences are qualitative unless the representation becomes unusable.

## 8. B-03 formal validation design

**Question.** Does Group A understand voluntary, bounded responsibility for ensuring an activity is appropriately handled, without inferring mandatory personal performance, completed care, or permanence?

**Task.** Show only the V4 consent card, with equal unselected controls, then ask the seven fixed moderator questions without teaching.

**Capture.** Spontaneous meaning; WHAT; recurrence/time/effective period; self-versus-arranged performance; voluntary decline; delivery meaning; permanence; missing information; hierarchy/clutter; response fidelity; and exact reasoning for any personal-performance interpretation.

**Threshold.** At least 80% of usable Group A participants must independently understand each of WHAT, WHEN, accepting meaning, and choice. Report raw values separately.

**Critical closure rule.** Unresolved mandatory personal performance, coerced acceptance/decline, accepted-equals-delivered-care, or permanent/unbounded responsibility prevents PASS regardless of percentage. A material wording failure is M2; a conflict intrinsic to the proposed responsibility model is M3. Preserve V4 wording unless formal evidence supports change.

## 9. B-04 ordinary-user design

**Question.** Can Group A understand and practically use the current non-diagnostic primary-type/context structure without systematic forced fit?

**Task.** Present the current V4 reference and 16 cards sequentially. Record first primary type, zero/one/multiple contexts, alternatives, reason, `其他`, `不確定`, none-fit, and missing-context suggestions. Do not imply that `生活安排` or any boundary-card mapping is correct.

The predefined seven core cards remain A01–A05, A08, and A10. Their primary prototype expectations and denominator must be locked before collection. Nine boundary cards remain qualitative and never enter the core denominator.

**Metrics.** For every participant report core raw numerator/7 and percentage; also report aggregate matched choices over the fixed usable core denominator. Report `其他`, `不確定`, none-fit, multi-context, and missing-context counts descriptively. Do not label the result taxonomy accuracy.

**Closure.** At least 80% core prototype alignment is required as descriptive evidence, with no systematic forced fit or critical clinical interpretation. Ordinary-user results can only close this component, never B-04 as a whole.

## 10. B-04 professional review

**Question.** Are the proposed family-facing names and structure plausible for real LTC work without implying clinical assessment, hiding a major care domain, or misrepresenting responsibility workflows?

**Material.** Professionals review the V4 primary types, contexts, 16 cards, participant instructions, representative de-identified Group A themes, and bounded Care Coverage/Responsibility definitions. They must not receive participant identities or an invitation to certify clinical validity.

**Questions.** Ask which names are natural or misleading; whether any imply ADL/IADL or clinical assessment; whether `用藥相關協助` stays non-prescribing/non-decision-making; where categories overlap; what important care situations are structurally missing; whether primary-plus-context and multi-context behavior is realistic; whether `生活安排`, `晚上`/`夜間`, as-needed, and backup-person information are meaningful; and what neutral wording they would prefer.

**Capture.** Role-family, experience band, setting, item-by-item judgment, rationale, proposed alternative wording, disagreement, confidence (`CLEAR`, `TENTATIVE`, `OUTSIDE_SCOPE`), and finding type:

- `TERMINOLOGY_ISSUE`: wording is unnatural or misleading without changing the construct.
- `MISSING_CARE_DOMAIN`: a recurring relevant domain cannot be represented without repeated forced fit.
- `CATEGORY_OVERLAP`: boundaries produce unstable primary choices.
- `WORKFLOW_REALISM_ISSUE`: structure does not match how arrangements are understood or coordinated.
- `PRODUCT_SEMANTIC_ISSUE`: the intended product meaning conflicts with practice/consent/safety expectations.

Do not average disagreement away. Record each view and synthesize agreements, reasoned alternatives, and unresolved conflicts. B-04 is `NOT CLOSED / INSUFFICIENT PROFESSIONAL EVIDENCE` with fewer than two eligible completed reviewers. A repeated material-solvable issue may be M2; a coherent product contradiction is M3.

## 11. M1 watch-item plan

| Watch item | Evidence to collect | Revision trigger |
|---|---|---|
| `生活安排` naturalness/boundary | First choice, hesitation, alternatives, none-fit, professional rationale | Repeated unexplained forced fit across Group A plus professional concern, or inability to state a stable non-clinical meaning |
| 晚上 vs 夜間 | Spontaneous distinction, missing-context request, professional language view | Repeated material-caused confusion affecting classification or timing interpretation; do not add duplicates from one preference |
| Missing non-night time contexts | Requested descriptors and task impact | Repeated inability/hesitation that blocks otherwise natural context use |
| Event-based exact time | Sufficiency/helpfulness/requirement with reasons | Representation repeatedly prevents actionable understanding, not merely diverse preference |
| Backup-person information | Where requested in as-needed/unavailable scenarios | Repeated evidence that informed responsibility decisions cannot be made with current bounded context; route product implications separately |
| Timing capture | Timestamp completeness per session/block | Any missed required timestamp triggers moderator-process correction before the next session |
| Rendering/system interruption | Preflight result and deviation log | Material corruption that prevents fair response pauses the session; repeated delivery failure requires administration remediation |

No watch item independently authorizes a material edit. Classify evidence after blinded review as M0, M1, M2, M3, or insufficient.

## 12. Response fidelity and privacy

Every important response is marked `VERBATIM`, `NEAR-VERBATIM`, or `FACILITATOR PARAPHRASE`. Prefer the participant’s own words. Never silently rewrite facilitator interpretation as participant evidence. Written-note sessions are valid. Audio/video is optional, separately consented, and refusal has no participation consequence.

Minimum metadata: participant code; A/B/C group; bounded care-experience category or professional role-family/experience band/setting; eligibility; consent and recording choice; material versions; session/order/moderator; timestamps; responses/codes; deviations; withdrawal point; and session outcome.

Do not collect real names where codes suffice, diagnoses, medication lists, addresses, contact details, care-recipient/account identifiers, employer/client identities, decline reasons, detailed schedules, or sensitive family histories. Remove incidental disclosures from analytic notes and retain only a bounded process note when necessary.

## 13. Analysis plan

Freeze the codebook, denominators, orders, thresholds, critical-error definitions, and material versions before recruitment. Two human reviewers should independently review every critical incident and all Group B findings; for routine Group A coding, double-code at least the first two sessions and a feasible sample thereafter. Resolve disagreement by documented discussion; preserve original codes and rationale. AI is not the sole coder or adjudicator.

Analyze four streams separately:

1. descriptive counts, always raw numerator/raw denominator/percentage;
2. qualitative themes with response-fidelity labels and bounded quotes;
3. critical misunderstandings and severity/source adjudication;
4. professional findings and M1 recurrence.

Report exclusions and missing data explicitly. Do not impute, reconstruct timing, change denominators after viewing results, pool materially different versions, convert pilot data into formal data, or use inferential/statistical-reliability language.

## 14. The 80% rule

Retain approximately 80% as a **student-project prototype evidence threshold**, not a clinical or statistical validation threshold. Apply it only to predefined, interpretable comprehension constructs with a frozen denominator. Always show the actual integer requirement and raw count; for six participants, `5/6 = 83.3%`, not “80%”. Do not create weighted scores.

Critical misunderstanding, systematic forced fit, missing professional review, material corruption, or insufficient evidence overrides a numerical pass.

## 15. Predefined closure states

Each component receives exactly one status:

- `PASS`: threshold met; required qualitative evidence present; no unresolved critical error.
- `PASS WITH M1 WATCH ITEMS`: threshold met; only bounded non-critical issues remain and have an owner/next review point.
- `M2 — INSTRUMENT REVISION REQUIRED`: participant-facing material, task, moderator procedure, or record structure prevents fair/usable evidence or causes critical misunderstanding.
- `M3 — PRODUCT-SEMANTIC REVIEW REQUIRED`: participants understood the material but evidence reveals a contradiction in intended state, responsibility, timing, consent, or category meaning.
- `INSUFFICIENT EVIDENCE`: required usable participants, construct data, or professional evidence are missing.

B-01, B-02, and B-03 close only under their section rules. B-04 closes only when both ordinary-user and professional components are `PASS` or `PASS WITH M1 WATCH ITEMS`; absent professional review means B-04 is not closed. The five-activity and burden findings cannot override a failed semantic block. Blocking validation closes only when B-01–B-04 are closed, no M2/M3 remains, integrity review passes, and claims are bounded. Thresholds cannot be relaxed post hoc.

## 16. Formal evidence matrix

| Row | Research question | Group | Task | Evidence | Critical issue | Metric | Qualitative evidence | Closure | Escalation |
|---|---|---|---|---|---|---|---|---|---|
| B-01 | Four states distinguishable? | A | Four counterbalanced cards | First meaning, clues, probes | Gap/pending/delivery/capability conflation | Per-distinction raw n/N/% | Confusion source, quotes | ≥80%, no unresolved critical | M2 wording/task; M3 state meaning |
| B-02 | Time/recurrence usable? | A | Four passes over scenarios | Daypart, recurrence, sufficiency, S9/S10/S3 | Fixed as-needed, midnight split, timing-derived coverage | Per-construct raw n/N/% | Exact-time reasons | ≥80% predefined constructs; preferences qualitative | M2 representation; M3 time semantics |
| B-03 | Responsibility/choice understood? | A | V4 consent card + seven questions | WHAT/WHEN/meaning/choice | Personal-only, coercion, delivered, permanent | Per-distinction raw n/N/% | Missing info, hierarchy | ≥80%, zero unresolved critical | M2 consent material; M3 responsibility model |
| B-04 ordinary | Organization understandable? | A | 16 sequential cards | Primary/context/reason | Clinical reading, systematic forced fit | Core raw n/7 and aggregate; descriptive boundary counts | Alternatives/missing contexts | ≥80% core plus no critical; partial only | M2 structure/material; M3 intended model |
| B-04 professional | Language/content plausible? | B | Structured domain review | Typed findings/rationale | Missing domain or unsafe semantic conflict | Counts by finding type only | Agreements/disagreements | ≥2 eligible reviews; no unresolved M2/M3 | M2 terminology/structure; M3 product review |
| Five-activity | Can structure ~5 fictional activities? | A | Five stepwise prompts | Start/help/completion | Cannot begin without teaching | Completed count and assistance level | Hesitation/field confusion | Usable evidence; does not close semantics | M2 scaffold if repeated failure |
| Burden/usability | Sequential study feasible? | A/B | Observation + debrief | Duration, pauses, stop, rating | Coercion/fatigue | Raw counts by burden response | Reasons and task hotspots | Feasible with documented accommodations | Procedure redesign if systematic |
| M1 watch items | Do bounded signals recur? | A/B | Embedded probes/review | Item-specific observations | Repeated material/product issue | Raw recurrence counts | Explanations across groups | M0/M1 carry or M2/M3 escalation | Bounded revision or product review |

## 17. Five-activity exercise and burden

The five-activity exercise tests whether Group A can begin and use stepwise prompts to express approximately five important fictional activities using activity, time/daypart, recurrence, responsibility confirmation, and a missing arrangement. Record `INDEPENDENT_START`, `MINOR_CLARIFICATION`, `SUBSTANTIAL_GUIDANCE`, or `UNABLE_TO_BEGIN`, plus completed count, time, hesitation, confused field, help, and privacy discomfort.

It does not prove that five activities are universally sufficient or that all real care needs can be captured. Burden is analyzed separately from semantic correctness using observed duration, breaks, skips, stop, repetition, and participant explanation.

## 18. Stop, exclusion, and deviation rules

Pause or stop immediately when requested, discomfort occurs, recording lacks consent, the wrong version or an answer key is exposed, the moderator substantially teaches answers, or corruption prevents fair administration. Do not pressure completion.

- `EXCLUDED`: wrong material/answer-key exposure/teaching or unconsented recording contaminates the relevant evidence beyond separation. Preserve only safe process metadata.
- `PARTIALLY USABLE`: earlier completed blocks remain uncontaminated and the stop/deviation point is exact. Use only those blocks and disclose the denominator.
- `USABLE WITH DOCUMENTED DEVIATION`: a bounded event demonstrably did not alter the response construct; retain with explicit rationale and sensitivity note.
- Voluntary skip/stop is not participant failure. Do not automatically discard uncontaminated partial data.

Any missing timestamp is written `MISSING`, never reconstructed. Use a pre-opened record, timestamp at each transition, and a visible moderator checklist. Run a render/version preflight before every session and keep a paper/static fallback when permitted.

## 19. Record structure review

The existing record template contains a useful base but will require a separately authorized planning-aligned revision before execution. Future fields must include group/eligibility; bounded metadata; material lock and order; consent/recording; response-fidelity per important response; start/block/end timestamps; construct-specific raw denominators; B-01 confusion source; B-02 four-pass codes; B-03 critical distinctions; B-04 ordinary/professional separation; professional finding type/disagreement; M1 recurrence; deviations and usability decision; exclusion/partial-use rationale; reviewer/adjudication trail; and per-component closure status.

This document does not edit the template.

## 20. Claims matrix

| Level | Claim boundary |
|---|---|
| **1 — may claim if directly supported** | In this bounded sample, participants generally distinguished the prototype states; used the prototype timing/recurrence structure; understood voluntary bounded responsibility; used the proposed organization; or completed the stepwise fictional exercise. Every claim reports sample, raw evidence, limitations, and unresolved M1 items. |
| **2 — requires additional evidence** | Care Coverage reflects common family-care workflows; categories are practically meaningful across LTC contexts; the structure is suitable for older adults or other populations; exact-time/daypart rules are broadly appropriate; professional workflows support future integration. These require relevant Group B evidence and, where applicable, broader user/usability evidence. |
| **3 — prohibited from this study** | Clinically validated; diagnostic; statistically reliable/generalizable; predicts or prevents care interruption; measures care resilience; determines caregiver capability/suitability or LTC eligibility; guarantees coverage or delivery; official LTC assessment/integration; government-endorsed; validated risk score; service booking/referral; product effectiveness. |

## 21. LTC/policy and AI boundaries

The study may discuss bounded relevance to family support, care coordination, service continuity awareness, and future aging-in-place linkage. It cannot claim official LTC 3.0 integration, eligibility determination, service booking, government endorsement, or clinical decision support. Any current policy assertion must be marked for separate external-source verification before publication.

No AI is required. AI must not score participants, act as sole coder, match caregivers, infer consent/capability, or make clinical interpretations. It may later organize already human-reviewed notes, with humans retaining authority and checking source fidelity.

## 22. Student feasibility

The minimum eight-session design is feasible if recruitment is staged, sessions use the same locked kit, and coding is completed immediately after each session. Professional access is the principal constraint, so secure at least two eligible reviewers before starting Group A recruitment; otherwise B-04 cannot close. Use one trained moderator where practical and a second human reviewer for critical/professional evidence. Limit metadata and avoid transcription burden unless recording is separately consented.

If time is constrained, complete the defensible 6A+2B design rather than adding students or extra sessions. Do not reduce professional review, combine roles, reveal answer keys, or weaken denominators to save time.

## 23. Formal-validation phases

- **FV-0 — execution-readiness gate:** ethics/consent check, material and codebook lock, record-template authorization/update, renderer preflight, moderator rehearsal, recruitment plan, and professional availability. No participant contact until separately authorized.
- **FV-1 — ordinary-user sessions:** complete minimum Group A sessions using the locked sequential protocol.
- **FV-2 — professional review:** complete minimum Group B structured reviews; may follow preliminary de-identified Group A theme preparation.
- **FV-3 — coding and synthesis:** integrity screening, frozen-denominator counts, qualitative coding, double review, critical-incident adjudication, and M1 recurrence analysis.
- **FV-4 — blocking-validation closure decision:** assign predefined statuses to every component and decide PASS, M1 carry, M2 revision, M3 review, or insufficient evidence.
- **FV-5 — Product Decision Freeze eligibility review:** only if FV-4 closes all blockers; this is a separate decision and still does not authorize implementation.

No phase is executed by this plan.

## 24. Post-validation decision paths

- If B-01–B-04 pass with no open issue: proceed only to a separate Product Decision Freeze eligibility review.
- If only M1 remains: document owners/watch points and decide at closure review whether each may carry; do not silently erase it.
- If M2 occurs: stop the affected closure, perform a bounded instrument revision under separate authority, increment/log versions, and revalidate only the affected evidence needed.
- If M3 occurs: return to Care Coverage Product Decisions review; do not repair it as wording alone.
- If evidence is insufficient: collect only the missing eligible group, block, or construct under renewed execution authority.
- Even after future validation passes, implementation requires an explicit Product Freeze/Implementation Readiness gate.

## 25. Execution prerequisites and current blockers

Formal execution is **not authorized**. Before execution, a separate gate must:

1. approve the final Group A/Group B recruitment and consent procedure;
2. confirm any institutional/course ethics or instructor requirements;
3. lock formal participant-facing and moderator materials with date/reviewer/version;
4. authorize and update the record template described in §19;
5. predefine card orders, exact construct denominators, critical-incident adjudicators, and analysis tables;
6. resolve logistics for at least two eligible professionals;
7. implement timing and render-integrity controls;
8. decide whether M1 watch items remain probes without changing V4 semantics;
9. approve data retention, access, deletion, and optional-recording handling.

Current ambiguities are planning-bounded rather than M2/M3: professional access, local ethics requirements, retention duration/location, exact counterbalancing schedule, and whether the preferred 7A+3B target is feasible.

## 26. Final status

**FORMAL VALIDATION PLAN — PLANNING COMPLETE / EXECUTION NOT AUTHORIZED**

No formal validation has been executed. No participant recruitment, Product Decision Freeze, Care Coverage implementation, frontend/backend work, Supabase/SQL/migration, Docker, deployment, commit, push, or runtime is authorized or performed by this plan.
