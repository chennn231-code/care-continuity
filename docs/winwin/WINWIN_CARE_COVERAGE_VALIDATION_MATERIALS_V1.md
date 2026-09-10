# WinWin Care Coverage Validation Materials V1

Status: **PILOT VALIDATION MATERIALS — NOT PRODUCT IMPLEMENTATION — NOT YET PILOTED**

## 1. Purpose
Specify controlled static stimuli for a future authorized pilot and formal validation.

## 2. Status
Research stimuli only. No participant result, validation, product freeze, UI implementation or clinical claim exists.

## 3. Material Version
Material `CC-VAL-PILOT-V4`; state copy `SC-V2`; daypart `DP-V2`; consent `CN-V4`; categories `CAT-V3`; date `2026-09-09`. Only the consent card, burden scaffolding and administration rules changed after Pilot-01; this is not a formal material lock.

## 4. Research-stimulus Boundary
Participant materials omit enums, authorization/database language, hypotheses and answers. Neutral typography/borders only; no traffic-light color, warning icon, emotional illustration or completion checkmark.

## 5. Fictional Case
All cards concern fictional 「王奶奶」 and use fictional family displays. No phone, address, ID, diagnosis, account or real-family data appears.

## 6. B-01 Participant Cards
**PARTICIPANT-FACING RENDER SOURCE begins.** Exactly four cards; render only the title and participant content columns.

| ID | Participant-facing title | Participant content |
|---|---|---|
| B01-C1 | 下午｜如廁協助 | **尚未確認照顧安排**。家人已記下這項活動，但負責安排的資料還沒有整理完整。 |
| B01-C2 | 下午｜如廁協助 | **等待接手確認**。家人已提出一項負責安排，目前正在等待回覆。 |
| B01-C3 | 下午｜如廁協助 | **目前有人確認負責**。家人提出的負責安排，已由被詢問的人確認接手。 |
| B01-C4 | 下午｜如廁協助 | **目前沒有確認的照顧安排**。家人已把負責安排的資料整理清楚，目前仍沒有任何人確認接手。 |

All four render with identical borders, typography, spacing and information density; no names, checkmarks or warnings. Label similarity between C1 and C4 is an **INTENTIONAL PILOT AMBIGUITY**; their explanations must remain noncontradictory.

## 7. B-01 Presentation Orders
Order A: C2 → C4 → C1 → C3. Order B: C3 → C1 → C4 → C2. Alternate and record order; never use lifecycle order by default.

## 8. B-01 Moderator Questions
**MODERATOR-ONLY MATERIAL.** PRIMARY: 「你怎麼理解現在這項照顧安排的狀態？」 STANDARD NEUTRAL: 「你從哪裡看出來？」「你覺得現在還需要確認什麼？」 ONLY IF NEEDED after the spontaneous account: 「你覺得現在有人確定會負責嗎？」「這代表沒有人可以照顧嗎？」「這代表這件照顧已經做完了嗎？」 Never administer confirmation probes automatically after Card 1.

For every `PARTIAL` or `INCORRECT` response, add **PRIMARY CONFUSION SOURCE**: `LABEL`, `EXPLANATION`, `STATE CONCEPT`, or `UNCLEAR`. Secondary notes may use multiple sources. `LABEL_CONFUSION` means the short label is unclear or too similar; `EXPLANATION_CONFUSION` means the explanation creates or fails to resolve the error; `STATE_CONCEPT_CONFUSION` means the participant understands the words but not incomplete setup versus sufficiently reviewed/no confirmed person. Do not collapse these into a generic score.

## 9. B-01 Hidden Semantic Targets
**MODERATOR-ONLY MATERIAL.** C1: setup incomplete, no established gap. C2: requested person has not confirmed. C3: responsibility confirmed, delivery unproven. C4: assessment complete and no confirmed arrangement, without inevitable-danger inference. Never render this section on cards.

## 10. B-02 Scenario Cards
**PARTICIPANT-FACING RENDER SOURCE.** Exactly ten participant cards:

| ID | Participant-facing content |
|---|---|
| B02-S1 | 王奶奶每天起床後，需要有人協助確認當次要用的藥已依既有安排準備好。 |
| B02-S2 | 王奶奶每天用午餐前後，需要有人協助準備餐點。 |
| B02-S3 | 王奶奶每週一、三、五，在午睡醒來後需要有人協助如廁。 |
| B02-S4 | 王奶奶每週二，在準備休息前需要有人協助洗澡。 |
| B02-S5 | 王奶奶每天準備上床休息時，需要有人協助從椅子移到床邊。 |
| B02-S6 | 王奶奶每週一、四，需要有人協助整理生活用品。 |
| B02-S7 | 王奶奶每週一次，需要有人陪同到附近散步。 |
| B02-S8 | 10 月 15 日，王奶奶需要有人陪同醫院回診。 |
| B02-S9 | 王奶奶臨時需要時，可能需要有人協助如廁或短時間陪同。 |
| B02-S10 | 王奶奶入睡後可能需要協助起身；一次安排可能從 23:30 持續到隔日 01:00。 |

## 11. B-02 Semantic-first Instructions
Use four separately coded passes: A natural daypart placement; B recurrence comprehension; C exact-time sufficiency; D coverage/gap interpretation. Failure in one pass is not failure in another. In A, the participant chooses naturally among 早上、中午、下午、晚上、夜間. Event cues intentionally influence placement but the target daypart word is absent. Do not show clock ranges first.

For D use only this separate fact card after timing answers: **「B02-S3 在本週三適用；家人已把負責安排的資料整理清楚，目前沒有任何人確認接手。」** Then ask 「你怎麼理解這個時段的安排？」 No other timing card supports a gap judgment by itself.

## 12. B-02 Exact-time Follow-up
**MODERATOR-ONLY MATERIAL.** For each relevant card ask 「只有這個時段資訊，你覺得夠嗎？」 If no, ask 「你還需要知道大概幾點嗎？」 Code `DAYPART_SUFFICIENT`, `EXACT_TIME_HELPFUL`, `EXACT_TIME_REQUIRED`, or `UNCLEAR`.

## 13. B-02 Recurrence Wording
Participant labels: 每天、每週特定幾天、每週一次、單次、需要時. Internal enum names never appear.

## 14. B-02 Overnight Scenario
For B02-S10 ask first 「請你說說這段安排大概從什麼時候開始、到什麼時候結束；如果要在畫面上找它，你會去哪裡找？」 Only if the participant does not address continuity, neutrally ask 「你會把它看成一段安排，還是分開的安排？為什麼？」

## 15. B-02 Optional Clock-range Second Pass
Moderator-only, show only after first response: **PROTOTYPE CANDIDATES — NOT DOMAIN-VALIDATED**: 早上 06:00–10:59；中午 11:00–13:59；下午 14:00–17:59；晚上 18:00–21:59；夜間 22:00–05:59.

## 16. B-03 Consent Card
**PARTICIPANT-FACING RENDER SOURCE.** Exactly one primary participant card, B03-C1:

> **要處理的事情**<br>
> 王奶奶｜移位協助<br>
> **適用時間**<br>
> 每天約 22:00，10 月 1 日至 10 月 31 日<br>
> **願意接手代表什麼**<br>
> 你要負責讓這段期間的移位協助有妥善安排。你可以自己協助，也可以安排合適的人處理；不代表每次都必須由你本人執行。<br>
> **請選擇**<br>
> 你可以自由選擇，這次不接手不需要說明原因。<br>
> **這次不接手**　**願意接手**

Render both choices with equal prominence and no preselection.

## 17. B-03 Moderator Questions
**MODERATOR-ONLY MATERIAL.** Ask exactly: 「如果你按『願意接手』，你覺得自己答應了什麼？」「這個安排什麼時候適用？」「你一定要自己親自做嗎？」「如果你這次不接手，可以直接選擇不接手嗎？」「按下願意接手後，代表這件照顧已經完成了嗎？」「你覺得這個責任會一直持續下去嗎？」「如果真的要你決定要不要接手，你還會想先知道什麼？」

## 18. B-03 Hidden Semantic Target
Participant understands bounded activity/time/recurrence/period, responsibility to ensure handling, nonmandatory personal performance, voluntary Accept/Decline, no proof of delivery and no permanence. Moderator-only.

## 19. B-04 Category Reference
**PARTICIPANT-FACING RENDER SOURCE; REVISED PILOT HYPOTHESIS — NOT FROZEN PRODUCT ARCHITECTURE.** Choose one PRIMARY ACTIVITY TYPE: 飲食、用藥相關協助、如廁、洗澡／清潔、移位／行動、生活安排（待觀察）、其他、不確定. `生活安排` is a qualitative hypothesis, not a known-correct core category. Where useful, add zero, one, or more CONTEXT descriptors: time `夜間`; recurrence/applicability `需要時`; purpose/destination `就醫`、`日照`、`一般外出`; support mode `陪同`、`交通協助`、`提醒`、`準備`. Participants may say a context is missing or the structure does not fit.

## 20. B-04 Sixteen Activity Cards
**PARTICIPANT-FACING RENDER SOURCE.** Exactly sixteen: B04-A01 早餐準備；B04-A02 確認早上的藥已準備好；B04-A03 下午協助上廁所；B04-A04 晚上協助洗澡；B04-A05 從床邊移到輪椅；B04-A06 陪同去醫院回診；B04-A07 陪同到附近散步；B04-A08 入睡後從床上起身時協助移位；B04-A09 協助搭車前往日照；B04-A10 準備晚餐；B04-A11 臨時陪同外出；B04-A12 整理洗澡用品；B04-A13 提醒準備回診資料；B04-A14 需要時陪同在家活動；B04-A15 協助穿外套後出門；B04-A16 代為聯絡日照中心確認活動資訊。 No diagnosis appears.

## 21. B-04 Sorting Instructions
「這是一個還在測試的整理方式。請先替每張卡選一個最接近的主要活動類型；若有幫助，可以不加、加一個或加多個情境描述。你也可以說沒有一個合適、需要新的情境、選『其他』或『不確定』。」 Record first primary choice, first context, additional contexts requested, alternatives and reason. Multiple contexts and rejection of the structure are valid observations.

## 22. B-04 Answer-key Semantics
**MODERATOR-ONLY MATERIAL.** Predefined denominator: CORE cards A01–A05, A08 and A10 (7 cards). Primary expectations: A01/A10 飲食; A02 用藥相關協助; A03 如廁; A04 洗澡／清潔; A05/A08 移位／行動. The predefined student-project prototype target applies only to these seven core primary choices and must be reported as raw numerator/raw denominator plus percentage, for example `6/7 = 85.7%`. BOUNDARY cards A06, A07, A09, A11–A16 (9 cards) are qualitative and never enter that denominator. A09, A12 and A13 were removed from core because their primary type is naturally ambiguous. `生活安排` appears only as a qualitative hypothesis. Context examples: A06/A13 就醫; A07/A11/A14/A15 陪同 or 一般外出; A08 夜間; A09 日照 and 交通協助. Plausible alternatives, multiple contexts, `其他`, `不確定`, or “none fit” are recorded, not failures.

The percentage is descriptive prototype evidence only and establishes no statistical significance, population prevalence, clinical validity or professional standard. Critical semantic misunderstandings override it.

Old → revised mapping: 夜間照顧 → context `夜間`; 外出／交通 → primary `生活安排` plus destination/support context; 就醫相關安排 → primary `生活安排` plus `就醫`; 陪同／看顧 → context `陪同`; 飲食、用藥相關協助、如廁、洗澡／清潔、移位／行動、其他 retained. Reason: remove mixed time/purpose/support axes from the single primary category.

## 23. B-04 Domain-review Questions
Ask a relevant reviewer whether names imply clinical assessment or ADL/IADL; which are unnatural, overlapping or missing; whether 用藥相關協助 remains non-prescribing/non-decision-making; and what neutral family-facing wording is better. This is language review, not clinical validation.

## 24. Data-entry Burden Exercise
Fictional prompt: 「我們一步一步整理，不需要建立完整照顧計畫，也沒有標準答案。」 Repeat these five neutral prompts for up to five activities: 1.「想一件王奶奶平常需要有人處理的事情。」2.「這件事通常什麼時候發生？」3.「大概多久一次？」4.「現在有沒有人確認會負責？」5.「如果沒有，你覺得還缺什麼安排？」 Do not show a completed classified example before the spontaneous response. Later record time, hesitation, field confusion, help required and privacy discomfort; collect no result now.

## 25. Accessibility Requirements
Use readable Traditional Chinese, plain language, clear headings, adequate spacing and reasonable rendered text size; never rely on color. Materials must work on paper/static displays without keyboard interaction. Markdown alone does not establish WCAG compliance.

## 26. Participant-facing / Moderator-only Separation
Before any pilot, export/print only the explicitly marked PARTICIPANT-FACING RENDER SOURCE: B-01 card table without surrounding notes; B-02 card table and participant choice labels; B03-C1 card; B-04 primary/context reference, sixteen card texts and sorting instruction; burden prompt. Everything marked MODERATOR-ONLY—including orders, targets, scoring, mappings and second-pass ranges—must be on separate pages and must never be visible to participants. This Markdown specification itself must not be handed to participants.

## 27. Explicit Non-Claims
These are not final UI, production copy, validated UX, clinical material, formal assessment, implementation contract, implemented screen, MVP feature or evidence that Care Coverage works.

## 28. Material Change Log
| Version | Date | Component | Change | Reason/evidence | Materially different? | Formal pooling allowed? |
|---|---|---|---|---|---|---|
| CC-VAL-PILOT-V1 | 2026-09-08 | Initial set | Initial controlled Markdown stimuli | Authorized materials gate | YES | NO RESULTS EXIST |
| CC-VAL-PILOT-V2 | 2026-09-09 | SC/DP/CN/CAT | Resolved known M2 copy, leakage, construct, consent, taxonomy and separation defects | Read-only quality review | YES | NO RESULTS EXIST |
| CC-VAL-PILOT-V3 | 2026-09-09 | Analysis/CN/CAT | Separated B-01 confusion sources; neutralized refusal; corrected context dimensions/multiplicity; made 生活安排 qualitative; repaired core denominator and raw-count rule | V3 targeted remediation gate | YES | NO RESULTS EXIST |
| CC-VAL-PILOT-V4 | 2026-09-09 | CN/Admin/Burden | Shortened B-03 hierarchy and personal-performance clarification; simplified missing-information question; added neutral stepwise burden scaffolding and sequential/fidelity/timing rules | Real Pilot-01 P01-C evidence | YES | PILOT-01 REMAINS V3 PILOT DATA |

## 29. Formal Material Lock Template
Material Version:
State Copy Version:
Daypart Version:
Consent Version:
Category Version:
Date Locked:
Reviewer:
Outstanding instrument defects:
Lock decision: `PENDING`

This locks research stimuli only, never Product Decisions or implementation.

## 30. Classification
**POST-PILOT-01 REVISED MATERIAL CANDIDATE V4 — READY FOR SEPARATE PILOT-02 AUTHORIZATION REVIEW — NOT PILOTED.**
