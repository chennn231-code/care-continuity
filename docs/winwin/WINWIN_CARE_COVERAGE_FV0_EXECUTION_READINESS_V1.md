# WinWin Care Coverage FV-0 Execution Readiness V1

Status: **FV-0 DOCUMENTATION / READINESS CLOSEOUT ELIGIBLE — FORMAL VALIDATION EXECUTION NOT AUTHORIZED**

Baseline: `18d4442286ece8fcaed8d96e212936afdf59edaa`

This artifact prepares formal validation operations only. It creates no participant evidence, changes no Product Decision, and authorizes no recruitment, session, freeze, implementation, commit, push, deployment, or runtime.

## 1. Formal plan and material lock

The accepted Formal Validation Plan V1 hash is `15680f34213464fd3e9b72e550508804cc6c9bad7f76266a2dc938c5b924cfff`.

No M2/M3 or participant-facing content change is required by FV-0. The formal execution material is therefore locked by reference as:

- Formal set: `CC-VAL-FORMAL-V1`
- Content-identical source: `CC-VAL-PILOT-V4`
- State copy: `SC-V2`
- Daypart: `DP-V2`
- Consent: `CN-V4`
- Categories: `CAT-V3`
- Validation Materials source SHA-256: `d463202c0404d0ad05dbe1cc318f987b7550bdbc3b41c299a8666e15895bd2b4`
- Moderator Script source SHA-256: `cbb8b092f8b4bdc43199eacf2bb5760f5fb479a73a55ee86cd6d81dd98743665`

`CC-VAL-FORMAL-V1` is an execution identifier, not a semantic revision. Any later participant-facing change invalidates this lock, requires a version increment and separate review, and must not be silently folded into formal results.

## 2. Ethics and course confirmation

### Student-confirmed school/course procedure

The student reports having confirmed the project with the teacher. Based on that confirmation, **no additional school/course procedure was identified as required** for this student prototype comprehension/usability study.

This is not evidence of IRB approval, IRB exemption, ethics-committee approval, or a formal research-ethics exemption. None of those claims may be made without separate formal evidence. If the study scope, recruitment channel, recording plan, institution, or supervisor requirements change, the student must reconfirm the applicable procedure before execution.

### Good practice

- Use plain-language information and consent.
- Avoid recruiting anyone dependent on the moderator for grades, care, employment, or services; if unavoidable, obtain supervisor guidance on coercion controls.
- Provide a contact route for study questions through the student/project supervisor where applicable.
- Separate scheduling/contact information from research responses.
- Test accessibility and offer breaks, skips, and a non-recorded option.

## 3. Eligibility lock

### Group A — ordinary/family-care

Include adults aged 18 or older who understand ordinary Traditional Chinese, can voluntarily consent, and have not seen WinWin detailed specifications, answer keys, coding targets, pilot findings, or prior versions of the formal tasks. Current/previous family-care experience is preferred for some participants but not mandatory. Record only `CURRENT`, `PREVIOUS`, `NONE`, or `PREFER_NOT_TO_SAY`.

Exclude current WinWin team members; anyone with target/answer-key exposure; anyone unable to consent voluntarily; anyone under 18; duplicate participation; and sessions where eligibility cannot be verified. Product awareness from a short neutral recruitment description alone is not prohibited exposure.

### Group B — relevant LTC practitioner

Apply all adult, language, consent, exposure, and duplicate rules above. Additionally require current or recent direct practice in at least one role-family: care management, elder/LTC social work, home-care supervision, direct care work with relevant experience, day-care practice, or another role with direct responsibility for elder/LTC care activities or coordination.

Minimum qualifying evidence is a self-reported role-family, current/recent status, years band, setting category, and one non-identifying sentence explaining direct relevance. Do not collect employer/client names or credentials beyond what classification needs. Student status, general healthcare interest, or family-care experience alone does not qualify.

### Group C — exploratory LTC student

Include consenting adults studying a relevant LTC/gerontology/care field who do not qualify for Group B and have no prohibited WinWin exposure. Group C is optional, capped at two, reported separately, and excluded from all A/B closure denominators.

## 4. Sample and participant-status lock

- Minimum complete sample: `6 Group A + 2 Group B`.
- Preferred sample: `7 Group A + 3 Group B`.
- Optional: up to `2 Group C`, supplementary only.

Do not change these targets after seeing results to obtain a pass.

- `COMPLETED PARTICIPANT`: eligible, consented, used locked material, and completed every required task for that group with usable evidence. Enters all applicable group denominators.
- `PARTIALLY USABLE PARTICIPANT`: eligible/consented with one or more uncontaminated completed blocks but a later skip, stop, corruption, or bounded deviation. Enters only the exact usable item/block denominators, never the completed-participant count.
- `EXCLUDED PARTICIPANT`: ineligible, wrong materially different version, answer-key/teaching contamination that cannot be separated, any recording contrary to the locked no-recording protocol, duplicate, or unusable evidence. Enters no semantic denominator; retain only minimized process metadata.

## 5. Descriptive 80% and denominators

Approximately 80% remains a student-project prototype descriptive acceptance criterion only. With six usable Group A responses, at least `5/6 = 83.3%` meets it where the Plan predefines its use. This is not a validated/statistical cutoff and establishes neither clinical validity nor product effectiveness.

Every result is `n/N = percentage`. `N` is eligible, consented, material-correct, item-usable evidence from the specified group—not total recruited. Skips and corrupted items are omitted only from the affected denominator and reported. Unaffected blocks from partially usable sessions may enter their exact denominators. Group C and pilots never enter A/B denominators. B-04 core uses each participant’s fixed seven core cards and an aggregate fixed usable core denominator; boundary cards remain qualitative. Critical misunderstandings override numerical pass as predefined.

## 6. B-01 counterbalancing lock

- Order A: C2 → C4 → C1 → C3.
- Order B: C3 → C1 → C4 → C2.
- A01 A; A02 B; A03 A; A04 B; A05 A; A06 B; A07 A; A08 B; A09 A; A10 B.
- Any separately authorized A11+ continues the odd=A/even=B cycle.

The participant code fixes the order before the session. Never change order based on participant characteristics or responses.

## 7. Exact formal session structure

1. Assign code and verify eligibility without collecting unnecessary identity.
2. Deliver plain-language consent; confirm participation and the locked no-audio/no-video procedure.
3. Verify `CC-VAL-FORMAL-V1`, participant-only render, hidden key and assigned order.
4. Record `START`.
5. Administer B-01 one card at a time; record `END B01`; ask rest/continue/stop.
6. Administer B-02 one scenario at a time in separate passes; record `END B02`; ask rest/continue/stop.
7. Administer B-03 without pre-teaching; record `END B03`; ask rest/continue/stop.
8. Administer B-04 sequentially; record `END B04`; ask whether to continue.
9. Where applicable and agreed, administer the five-activity task stepwise; record `END FIVE-ACTIVITY`.
10. Ask burden/debrief questions; record `SESSION END`; explain only after evidence capture.

Group B may use the bounded B-04 professional sequence defined by the Plan. Every participant may skip, rest, or stop without penalty.

## 8. Mandatory timing procedure

Open the record before the participant arrives. Keep its timing box visible only to the moderator. At each transition, record the local timestamp immediately: `START`, `END B01`, `END B02`, `END B03`, `END B04`, `END FIVE-ACTIVITY`, `SESSION END`. Also record material pauses separately.

If a timestamp is missed, write `MISSING` as soon as noticed and never reconstruct or estimate it. Before proceeding to the next block, the moderator checks that the preceding timestamp or `MISSING` is present.

## 9. Future neutral recruitment script — DO NOT SEND IN FV-0

「我們正在進行一項學生專題的照顧安排原型理解與使用測試，想了解一般文字、時間安排與活動整理方式是否容易理解。這不是醫療、照顧評估或能力測驗，也不提供 AI 照顧建議。參與完全自願，可以跳過問題或隨時停止；不需要提供私人醫療或家庭資料。過程不錄音、不錄影，以書面／文字方式記錄。去識別化的研究紀錄可能保留供本專題分析、展示或答辯、相關競賽及後續同一專題研究分析使用，不會公開參與者身分，也不會放在公開 GitHub。若你有興趣，我們會先說明時間、資料處理方式與同意內容，再由你決定是否參加。」

For Group B add: 「我們希望聽取具高齡或長照實務經驗者對家庭用語、活動範圍與實務合理性的意見；不是請你認證臨床效度或替產品背書。」

## 10. Future consent introduction — execution requires separate authorization

「謝謝你考慮參與。這是學生專題的原型理解與使用研究，目的是測試文字、情境與整理方式，不是在測驗你，也沒有標準成績。內容使用虛構案例；不需要分享真實姓名、地址、病歷、用藥、聯絡方式或家庭衝突。參與完全自願，你可以跳過任何題目、休息或隨時停止，不需要說明原因。過程不錄音、不錄影，研究者只以書面／文字方式記錄回答，並以 A01、B01 等參與者代碼取代姓名。若你不小心說出可識別或不必要的敏感資訊，研究紀錄會避免保留不必要的部分。去識別化研究紀錄會存放在學生控制的非公開儲存裝置／USB，不會放在公開 GitHub；僅限適當的專題或審查人員在需要時存取。去識別化紀錄可能保留供本專題分析、專題展示或答辯、相關競賽，以及後續同一專題研究分析使用，不會公開你的身分，也不會擴張為商業使用、公開資料集、AI 模型訓練、第三方資料共享或臨床研究。目前依學生向老師確認的資訊，沒有識別出校方規定的固定保存年限。預留時間約為一般使用者 45–60 分鐘、專業者 35–50 分鐘，實際可依需要休息或提前停止。你可以先詢問任何問題，再決定是否參加。」

## 11. One-page moderator rules

### DO

- Capture spontaneous interpretation before probing.
- Use only neutral probes such as「你從哪裡看出來？」「可以再說說嗎？」
- Mark `VERBATIM`, `NEAR-VERBATIM`, or `FACILITATOR PARAPHRASE`.
- Record every required timestamp or immediate `MISSING`.
- Present one stimulus at a time and preserve assigned order.
- Allow rest, skip, and stop; document deviations without blame.
- Preserve raw responses and flag critical misunderstandings for human review.

### DO NOT

- Teach, hint, correct before capture, or praise a target answer.
- Reveal the answer key, semantic targets, thresholds, or future cards.
- Fill missing responses or infer participant intent.
- Pressure completion or request a decline reason.
- Collect unnecessary personal/medical/workplace information or record audio/video.
- Silently repair corrupted material or continue as if unaffected.
- Use AI as sole coder or adjudicator.

## 12. Render-integrity controls

Before every session, two checks are recorded: moderator visual check and, where feasible, a second-person or static-reference comparison. Confirm exact formal version/hash; all 4/10/1/16 cards; correct Traditional Chinese; no truncation, mixed-language corruption, answer key, moderator note, hypothesis, or preselection; equal accept/decline styling; one stimulus at a time; readable size/spacing/contrast; and a functioning static/paper fallback.

If corruption appears, pause immediately, capture a bounded description/screenshot only if privacy rules permit, replace nothing silently, and decide whether the affected item is unusable while preserving unrelated prior blocks. Resume only with the same locked content and document the deviation; otherwise stop.

## 13. Critical misunderstanding lock

Frozen B-01 critical errors:

- `NOT_ASSESSED` automatically treated as a confirmed Care Gap.
- `PENDING_CONFIRMATION` treated as accepted responsibility.
- `CONFIRMED_COVERAGE` treated as completed/delivered care.
- `NO_CONFIRMED_COVERAGE` treated as inevitable emergency or proof nobody is capable of helping.

Frozen B-03 critical errors:

- responsibility treated as mandatory personal performance every time;
- decline treated as unavailable, illegitimate, or requiring justification;
- acceptance treated as proof care already occurred;
- responsibility treated as permanent/unbounded beyond displayed activity/time/period.

Do not add or remove critical definitions after formal outcomes are seen. Pause the study and restart affected validation under a new approved lock if a change becomes necessary.

## 14. Coding and session status

First-pass coding preserves raw wording and response-fidelity labels. A second human reviews every critical incident and professional finding; double-code at least the first two routine Group A sessions and a feasible sample thereafter. Resolve disagreement through documented discussion while retaining original codes and rationale. AI may organize human-reviewed notes but is never authoritative.

- `USABLE`: locked material, eligible/consented participant, complete relevant evidence, no meaningful deviation.
- `USABLE WITH DOCUMENTED DEVIATION`: bounded event such as a short unrelated interruption did not affect the construct; record rationale.
- `PARTIALLY USABLE`: exact earlier blocks/items are intact but later stop, skip, or corruption prevents complete use.
- `EXCLUDED`: eligibility/consent/version failure, inseparable teaching/key exposure, recording contrary to the formal no-recording protocol, or globally unusable evidence.

Do not discard unrelated valid blocks because a later block failed.

## 15. Data handling and privacy

Use participant codes, not names, in research-response records. Store any necessary consent/contact material separately from responses. Store research data only on student-controlled, non-public storage/device or USB with reasonable access protection—not in GitHub, the product repository, or a public/shared link. Access is limited to appropriate project/review personnel where applicable. Prefer no identity-code key; if scheduling requires temporary contact information, keep it separate and remove it when no longer needed.

Formal validation uses written/text notes only and records no audio or video. De-identified research responses may be retained for project analysis, project presentation/defense, related competitions, and later analysis within the same project. They are not authorized for commercial use, a public dataset, AI model training, unrelated third-party sharing, or clinical research. Incidental identifying or unnecessary sensitive disclosure is omitted/minimized. Never require diagnoses, medication lists, addresses, phone numbers, care-recipient names, national/account identifiers, detailed family histories, or employer/client names.

**No fixed school-mandated retention duration was identified from the student's teacher confirmation.** A fixed term or deletion date is therefore not invented. The participant-facing consent states the intended continued retention and purposes of de-identified records. If school/course policy later supplies a duration, deletion requirement, or withdrawal deadline, that rule supersedes this bounded plan and must be documented before further sessions.

## 16. M1 capture lock

The formal record captures `生活安排` naturalness, 晚上/夜間 interpretation, missing time descriptors, event-based exact-time expectations, backup-person requests, and render/timing problems. These remain watch items, not automatic failures. Escalate only under the predefined repeated-evidence rules in the Formal Validation Plan.

## 17. Professional availability status

**ACCESS ROUTE IDENTIFIED.**

Two non-identifying potential Group B candidates are known through a realistic route: one day-care-center leadership practitioner with direct LTC/service experience, and one LTC-related teacher who also has actual LTC work/service experience. Candidate identification is not eligibility completion, consent, participation, or professional validation. Before any separately authorized session, each candidate must independently satisfy the locked Group B eligibility criteria and voluntarily consent. Do not record names or identifiable workplace details, and do not contact either candidate under FV-0.

## 18. GO / NO-GO checklist

| Mandatory item | Status |
|---|---|
| Formal Plan hash verified | GO |
| Participant eligibility locked | GO |
| Sample and denominators locked | GO |
| `CC-VAL-FORMAL-V1` content-identical material lock | GO |
| B-01 counterbalancing ready | GO |
| Formal record template ready | GO |
| Timing procedure/box ready | GO |
| Recruitment wording prepared but unsent | GO |
| Consent wording aligned to no recording and de-identified retention | GO |
| Moderator rules ready | GO |
| Render-integrity procedure ready | GO |
| Critical misunderstandings locked | GO |
| School/course procedure checked with teacher | GO — no additional procedure identified; no IRB/exemption claim |
| Storage/access/use/retention approach disclosed and locked | GO — no fixed school-mandated duration identified |
| Route to at least two potential eligible Group B reviewers identified | GO — eligibility/consent still required before participation |
| Separate formal-execution authorization issued | NO-GO — NOT AUTHORIZED |

FV-0 documentation/readiness prerequisites are closed. Formal execution remains **NO-GO** until a separate explicit authorization is issued. Do not recruit or execute under this Gate.

## 19. Final classification

**FV-0 DOCUMENTATION / READINESS CLOSEOUT ELIGIBLE — FORMAL VALIDATION EXECUTION NOT AUTHORIZED**

Formal evidence remains `0` completed Group A sessions and `0` completed Group B sessions. Pilot evidence is not pooled into formal denominators. Professional candidates identified does not mean professional review completed.

No human session or formal data collection was performed. No participant was contacted. No Product Decision Freeze, implementation, commit, push, runtime, backend, Supabase, SQL, migration, Docker, or deployment occurred.
