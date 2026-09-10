# WinWin Care Coverage Blocking Validation Protocol V1

Status: **VALIDATION PROTOCOL — NOT YET EXECUTED**

Baseline: `18d4442286ece8fcaed8d96e212936afdf59edaa`

## 1. Purpose

Provide a consistent, bounded research protocol for collecting real evidence about B-01 state comprehension, B-02 timing/recurrence, B-03 informed-consent context, and B-04 non-diagnostic category language before any Product Decision Freeze.

## 2. Research Scope

This is a student-project product/usability study. It tests whether candidate semantics are understandable enough for prototype implementation. It is not clinical, diagnostic, regulatory, psychometric, medical-device or care-outcome validation and cannot prove reduced interruption.

## 3. Current Product Status

The revised candidate is coherent but not frozen. Product Decisions remain pending blocking validation; implementation remains unauthorized. No blocker is closed by writing this protocol.

## 4. Ethical Boundary

Participant-facing statement:

> 這是一項學生原型產品研究，目的是了解畫面與文字是否容易理解。參與完全自願，你可以隨時停止或略過問題。回答只用於產品設計，不會用來作醫療或照顧決策。請避免分享不必要的健康、家庭或身分資料；研究紀錄會盡量只使用參與者代碼。

Do not claim IRB or ethics approval unless it independently exists. Audio/video recording is optional, requires separate explicit permission, and is never necessary because written notes are sufficient.

## 5. Participant Strategy

Target approximately 6–10 participants. Seek meaningful representation where feasible from family caregivers, adults who have helped an older relative, LTC students with practical knowledge, and care workers. Include some caregiver-experienced participants where practical. Convenience participants are not professional validation. For B-04, also seek at least one relevant care worker, care manager, social worker, LTC educator or comparable professional for bounded language review. Without that reviewer, B-04 remains `NOT CLOSED`.

Record only participant code, bounded experience type, and caregiving experience (`NONE`, `LIMITED`, `CURRENT`, `PREVIOUS`). Do not require names, contact details, addresses, medical information, diagnoses, family-conflict details or account identifiers.

## 6. Moderator Rules

- Do not teach definitions before the relevant task.
- Do not lead, praise a particular answer, or reveal the intended distinction.
- Begin with 「你怎麼理解這個畫面？」 and record the first interpretation verbatim or as a faithful paraphrase.
- Distinguish hesitation from incorrect understanding.
- Use neutral follow-ups such as 「可以多說一點嗎？」
- Do not correct answers until the entire task block is complete.
- After evidence capture, explanation is allowed and must be marked as post-task.

## 7. Session Structure

Recommended total: 25–40 minutes.

| Block | Approximate time |
|---|---:|
| Intro, voluntary participation and recording choice | 3–5 min |
| B-01 state comprehension | 6–8 min |
| B-02 timing and recurrence | 7–10 min |
| B-03 consent context | 5–7 min |
| B-04 category sorting | 6–8 min |
| Overall debrief | 3–5 min |

Run B-01 first so later explanations do not contaminate state comprehension.

## 8. B-01 Objective

Determine whether users can distinguish the four candidate Traditional-Chinese states without confusing incomplete information, pending consent, confirmed responsibility, actual delivery or inevitable danger.

## 9. B-01 Materials

Use four visually neutral cards without enum names and without color as the primary cue:

1. **下午｜如廁協助 — 尚未確認照顧安排**: The family entered the activity and timing but has not completed who will take responsibility.
2. **中午｜準備午餐 — 等待接手確認**: Sister was asked to confirm responsibility and has not replied.
3. **晚上｜洗澡協助 — 目前有人確認負責**: Brother explicitly accepted responsibility for the stated period; the activity is upcoming.
4. **早上｜陪同散步 — 目前沒有確認的照顧安排**: The activity and period were reviewed, but there is no current confirmed arrangement.

Use the same typography, icon weight and information density. Do not add danger symbols, completion ticks or internal state names.

## 10. B-01 Tasks

For each card, before explanation ask:

- 「你覺得現在這件照顧安排是什麼狀態？」
- 「你覺得現在有人確定會負責嗎？」
- 「這個畫面代表沒有人可以照顧嗎？」
- 「這個畫面代表照顧已經實際完成了嗎？」
- 「你覺得現在需要進一步確認什麼？」

Randomize the middle cards where practical while retaining the same script. Record first response before neutral follow-up.

## 11. B-01 Coding

Per primary state judgment: `2 = CORRECT without coaching`, `1 = PARTIAL after neutral follow-up`, `0 = MATERIALLY INCORRECT`. Separately record `CRITICAL_MISUNDERSTANDING: YES/NO`.

Critical examples include `NOT_ASSESSED` interpreted as definitely no caregiver, pending as accepted, confirmed responsibility as completed care, or no-confirmed coverage as inevitable danger. This is research coding, not a clinical score.

## 12. B-01 Decision Rule

- **PASS:** at least 80% of primary state judgments are correct without coaching and no unresolved repeated critical misunderstanding remains.
- **REVISE:** one or more labels, explanations or information relationships require change.
- **FAIL / RECONSIDER:** participants repeatedly cannot distinguish the underlying concepts after reasonable copy alternatives.

The 80% value is a **PREDEFINED STUDENT-PROJECT PROTOTYPE USABILITY TARGET** only—not an externally validated, clinical, professional, safety or regulatory threshold. A severe qualitative error overrides the numerical result.

## 13. B-02 Objective

Determine whether semantic dayparts and lightweight recurrence identify meaningful care timing without requiring a burdensome full calendar.

## 14. B-02 Materials

Test semantic labels first: morning, midday, afternoon, evening and night, plus optional exact time. If boundary probing is necessary, reveal only in a second pass these **PROTOTYPE CANDIDATES — NOT DOMAIN-VALIDATED**: morning 06:00–10:59, midday 11:00–13:59, afternoon 14:00–17:59, evening 18:00–21:59, night 22:00–05:59. This two-pass order prevents ranges from supplying the first answer.

Provide recurrence choices `DAILY`, `SELECTED_DAYS`, `WEEKLY`, `ONE_TIME`, and `AS_NEEDED`, using plain-language explanations rather than calendar syntax.

## 15. B-02 Scenarios

1. 每天起床後協助確認早上的藥已準備好。
2. 每天中午協助準備午餐。
3. 每週一、三、五下午協助上廁所。
4. 每週二晚上協助洗澡。
5. 每晚睡前到凌晨可能需要協助從床移位。
6. 每週一和週四協助垃圾與生活用品整理。
7. 每週六陪同散步。
8. 10 月 15 日陪同醫院回診。
9. 臨時需要時協助如廁或短時間看顧。
10. 晚上 11 點開始、凌晨 1 點結束的夜間陪同。

These are fictional, non-clinical scenarios.

## 16. B-02 Tasks

Ask participants to place each scenario into a daypart, say whether exact time is needed, explain recurrence, identify any displayed period without confirmed arrangement, and identify cases a daypart cannot represent. Record alternative placements and reasons rather than forcing agreement. Probe cross-midnight interpretation only after the initial answer.

## 17. B-02 Decision Rule

- **PASS:** at least 80% of core placements/interpretations are consistent, exact time is needed only selectively, and no severe overnight or `AS_NEEDED` misunderstanding remains.
- **REVISE:** labels, recurrence choices, optional-time guidance or overnight semantics require adjustment.
- **FAIL / RECONSIDER:** representative activities cannot be expressed without a substantially different time model.

This is a predefined prototype target, not professional scheduling validity. Repeated incompatible placement, routine demand for exact times, cross-midnight confusion, or `AS_NEEDED` interpreted as a fixed gap overrides averages.

## 18. B-03 Objective

Determine whether an exact proposed responsible actor sees the minimum information needed for informed, non-coercive Accept/Decline.

## 19. B-03 Consent Card

Test this hierarchy without extra clinical detail:

> **王奶奶｜晚上移位協助**<br>
> 每天晚上，約 10:00<br>
> 適用期間：10 月 1 日至 10 月 31 日<br>
> 陳小姐想詢問你是否願意負責確保這項照顧安排有人處理。這不一定表示所有照顧動作都必須由你親自執行。<br>
> 你可以接受或拒絕；拒絕不需要說明原因。<br>
> **接受處理**　**目前無法接手**

Required information: older-adult safe context, activity label, timing, recurrence, effective period, bounded responsibility explanation, safe requester/source, Accept and Decline. Category is optional. Exclude diagnosis, medical record/list, other schedules, contacts, previous decline reason, capability score and ranking. Do not imply legal duty.

## 20. B-03 Tasks

Without instruction ask:

- 「你按下『接受處理』後，你認為你答應了什麼？」
- 「這個責任什麼時候適用？」
- 「你是不是一定要親自做這個照顧動作？」
- 「你可以拒絕嗎？」
- 「接受之後，代表這項照顧已經完成了嗎？」
- 「你覺得這個責任是永久的嗎？」
- 「你還缺少什麼資訊才敢做決定？」

## 21. B-03 Decision Rule

- **PASS:** at least 80% correctly explain every core meaning, Accept/Decline are understood as genuine choices, and no unresolved coercion or permanence misunderstanding remains.
- **REVISE:** hierarchy, wording, period or bounded context is insufficient or excessive.
- **FAIL / RECONSIDER:** informed responsibility cannot be communicated without excessive or sensitive data.

Belief that acceptance is permanent, refusal unavailable, delivery already occurred, legal obligation exists, personal performance is mandatory, or timing/activity is unknown is critical and overrides the aggregate target.

## 22. B-04 Objective

Determine whether a small ordinary-language list organizes common Care Activities with manageable overlap and without being understood as clinical assessment.

## 23. B-04 Category List

Prototype candidates, not frozen: 飲食、用藥相關協助、如廁、洗澡／清潔、移位／行動、外出／交通、就醫相關安排、夜間照顧、陪同／看顧、其他. “用藥相關協助” excludes prescribing, dose calculation, adherence diagnosis and medication decision support.

## 24. B-04 Sorting Task

Use 16 fictional cards: 早餐準備、確認早上的藥已準備好、下午協助上廁所、晚上協助洗澡、刷牙與簡單清潔、從床移到輪椅、陪同到醫院回診、陪同散步、晚上注意起身狀況、協助搭車去日照、準備晚餐、臨時陪同外出、整理輔具、協助穿外套、睡前陪伴、代為聯絡日照中心。 Allow `其他` and `不確定`.

Ask which categories overlap, which sound medical/professional, what common activity is missing, and which labels should merge or change. Record first placement, changes and rationale.

## 25. B-04 Domain Review

Provide the category list and representative cards to at least one available relevant professional. Ask whether labels imply assessment; resemble formal ADL/IADL classifications; sound unnatural; omit common family activities; overlap; and keep medication support non-prescribing and non-decision-making. The reviewer evaluates language only, not WinWin as a clinical tool. Record role category and review notes without unnecessary identity data.

## 26. B-04 Decision Rule

- **PASS:** at least 80% consistent representative-card placement, workable use of `其他`, no unresolved clinical interpretation, and a genuine bounded domain-language review finds no major semantic issue.
- **REVISE:** merge, rename, remove or minimally add categories and retest affected material.
- **NOT CLOSED:** no meaningful domain-language review is available.
- **FAIL / RECONSIDER:** a bounded non-clinical organizing taxonomy is not achievable.

## 27. Data-entry Burden Check

Give a fictional Case and ask the participant to create or interpret approximately five important activities. Record completion time, hesitation, skipped/misunderstood fields, requested information and privacy discomfort. Median completion within 10 minutes is a predefined student-project prototype target, not a professional standard. Do not require exhaustive care-plan entry.

## 28. Severe Error Policy

Aggregate percentages cannot hide repeated missing-data-as-gap, pending-as-confirmed, confirmed-as-delivered, coercive consent, diagnostic-category, family-report-as-platform-verified, or system-failure-as-gap interpretations. Any severe instance receives contextual review; repeated or unresolved instances force revision even when a numerical target is met.

## 29. Overall Decision Rules

- All four blockers meeting their closure requirements → `READY FOR SEPARATE PRODUCT DECISION EVIDENCE REVIEW`, not frozen and not implementation-authorized.
- Any `REVISE` → change only affected semantics/material, log the evidence, and retest that blocker.
- B-04 without a relevant domain reviewer → `NOT CLOSED`.
- Major conceptual contradiction → return to Product Revision.

## 30. Research Limitations

Predeclare convenience sampling, small sample, prototype-only interaction, student context, possible LTC-student overrepresentation, fictional scenarios, no longitudinal behavior, no real care-outcome measurement, and lack of statistical representativeness for Taiwan family caregivers. Do not make prevalence claims.

## 31. Evidence Integrity

Evidence strength labels are descriptive, not clinical levels: `LEVEL 1` single observation, `LEVEL 2` repeated usability pattern, `LEVEL 3` pattern across participant types, and `DOMAIN REVIEW` relevant professional language review. Preserve versioned materials, first responses, neutral follow-ups, decisions and revision/retest history. Never replace participant evidence with AI-generated feedback.

## 32. Blocker Closure Requirements

- **B-01:** real comprehension evidence + copy review + no unresolved critical semantic issue.
- **B-02:** representative timing/recurrence tasks + required daypart/overnight revision and retest.
- **B-03:** real consent-card comprehension + no unresolved coercion/permanence misunderstanding.
- **B-04:** real sorting evidence + bounded relevant domain-language review.

Codex/developer opinion, designer intuition, unit tests, screenshots, invented personas, AI feedback, and literature alone cannot close these blockers. Literature cannot substitute for B-01/B-03 user comprehension.

## 33. Post-validation Decision Tree

```text
All B-01–B-04 PASS
  -> separate Product Decision Evidence Review Gate
  -> possible Product Decision Freeze

One or more REVISE
  -> revise affected semantics or copy
  -> retest affected blocker

B-04 lacks domain reviewer
  -> remain NOT CLOSED

Major contradiction
  -> return to Product Revision
```

No implementation automatically follows validation or freeze review.

## 34. Explicit Non-Actions

Do not recruit or record participants in this gate; fabricate results or expert review; close blockers; freeze Product Decisions; edit app/tests/schema; create routes, SQL, migrations or APIs; implement formal services, Backup Care or scenarios; start runtime; stage, commit or push.

## 35. Classification

**VALIDATION PACKAGE CANDIDATE — READY FOR SEPARATE REVIEW — NOT EXECUTED.** Protocol materials, decision rules and evidence boundaries are complete. No participant result, blocker closure, product freeze or implementation authority is claimed.
