# WinWin MVP First Vertical Slice Product / UX Specification V1

Status: **PRODUCT / UX REVIEW DRAFT — no frontend, backend, Foundation, database, runtime, or deployment authorization**

Date: 2026-08-30

Baseline: `f9e070c766a07cc6b250f28f6f60fffc0859f8f7`

## 1. Executive product decision

### Decision

**KEEP the current first vertical slice as the minimum coherent WinWin product loop, with one bounded interaction adjustment and several screen merges.**

```text
Login
→ authorized Case List
→ Case Home: changes since last view
→ view or publish a Care Update
→ explicitly create and assign an Action when handling is needed
→ exact assignee Accepts
→ exact assignee Starts
→ exact assignee Completes with a bounded handling summary
→ authorized participants see the preserved responsibility and activity history
```

This remains the smallest slice that tests WinWin's product thesis: a meaningful care change is not merely recorded; it can be connected to one named current responsible participant, explicit acceptance, work, completion, and a traceable handoff history.

The bounded adjustment is:

```text
OLD: Complete Action by status transition alone
→
NEW: Complete Action with a short required handling summary
```

Problem → a bare checkbox proves a transition but gives the next participant little usable handoff context.

Reason → the product is about continuity, not task-count closure.

Adjustment → require a concise handling summary (recommended 1–300 characters) when completing. This is not a diagnosis, clinical outcome, or declaration that the originating care issue is resolved.

This adjustment is student-buildable, adds one bounded text fact to the completion event, and does not add a new object or workflow.

### Product-fit assessment

| Criterion | Assessment | Decision consequence |
|---|---|---|
| Product core fit | Strong: tests information continuity plus explicit responsibility | KEEP the full publish → assign → accept → start → complete chain |
| Long-term-care workflow value | Plausible and direct: family and formal-care participants can share a change and make the next handling step explicit | KEEP; validate language and workflow with users |
| Care-continuity value | Stronger than a feed because current responsibility and gaps are visible | KEEP responsibility history and continuity-gap projection |
| Student-project feasibility | Bounded if onboarding, Question, correction controls, notifications, organization administration, and reassignment controls remain out | MERGE screens; DEFER adjacent workflows |
| Technical dependency | Depends on the adopted actor/grant seam, immutable publication, Action commands, activity projection, and cursor; not on full platform administration | Keep one adapter boundary; do not couple UI to database entities |
| User burden | Moderate; source, visibility, assignment, and three explicit transitions add friction | Use progressive disclosure and one valid next CTA |
| Privacy | Manageable only with explicit visibility, data minimization, and fail-closed loss-of-access behavior | No default broad audience and no hidden-record leakage |
| Expansion risk | High if invitations, Questions, clinical records, alerts, or organization features enter the slice | Strictly defer them |

### Evidence boundary

- A 2025 scoping review found that interprofessional teams, patients, and partners-in-care may improve informational and management continuity during long-term-care transitions, but the evidence base was small and context-specific: [BMC Health Services Research](https://pmc.ncbi.nlm.nih.gov/articles/PMC12032762/).
- A 2024 rapid review found low-strength evidence for improved caregiver satisfaction from structured communication and insufficient evidence for most other outcomes: [Journal of Patient Safety and Risk Management](https://doi.org/10.1177/25160435241299112).
- Therefore, the WinWin workflow is a defensible product hypothesis, not proven clinical or service effectiveness. **UNVALIDATED PRODUCT ASSUMPTION:** explicit digital responsibility states will reduce missed handling in Taiwanese family/formal-care collaboration. **REQUIRES USER RESEARCH.**

## 2. First vertical slice definition

### In scope

The slice starts when an authenticated person enters WinWin and ends when authorized participants can understand the completed responsibility trajectory for one Action linked to one Care Update.

The reference scenario is:

1. A family caregiver notices a change and signs in.
2. The family caregiver opens an authorized Case and sees newly visible activity since the last successful view.
3. They publish a sourced Care Update using the minimum necessary content and an explicit allowed visibility choice.
4. If handling is needed, they deliberately create an Action from the published update and choose one concrete eligible Identity + Membership; there is no default assignee.
5. The selected professional care-team member sees the assignment as **waiting for acceptance**, not accepted.
6. That exact person Accepts, then Starts, then Completes with a short handling summary.
7. The family caregiver later sees who was assigned, who accepted, when work started, what was reported at completion, and the ordered history.

The same flow may run in the opposite direction when a professional publishes and a family member is the eligible assignee. Authority is never inferred from that direction or from role labels.

### Product invariants

- `ASSIGNED ≠ ACCEPTED ≠ IN_PROGRESS ≠ COMPLETED`.
- Viewing an item does not imply reading, understanding, acceptance, or responsibility.
- Assignment does not create Membership, Relationship, Grant, visibility, or acceptance.
- Completion records the assignee's handling declaration; it does not resolve a Question, prove clinical improvement, or prove the originating issue is resolved.
- Published Care Updates are immutable. A later correction is a successor version, never silent editing.
- Current responsibility is derived from the sole effective Responsibility Cycle; history is not current authority.
- `NEEDS_REASSIGNMENT` is a derived continuity condition for an unfinished Action with no effective cycle, not a fifth happy-path state.
- Access loss fails closed. Attribution remains, but lost access does not.

### Explicitly not in the first-slice interaction

Invitation/onboarding, professional verification, Question ask/answer/resolve, published correction controls, decline, relinquish, reassignment controls, access administration, notification delivery, delegation, supervisor completion, organization hierarchy, clinical signing, analytics, AI recommendations, location tracking, and full offline synchronization.

The underlying model must remain compatible with correction, decline, relinquish, reassignment, and revocation continuity. Their absence from first-slice controls must never make their resulting states display as normal or completed.

## 3. Minimum MVP user set

| Candidate user category | MVP decision | Why / contribution | Needs to see | Does not need in this slice | Data behavior |
|---|---|---|---|---|---|
| Family caregiver / family member | **RETAIN** | Often observes changes outside formal service encounters and may initiate or receive a handoff | Authorized Case changes, source/author, current responsible person, next state, history | Family chat, family directory, caregiver mental-health tools, blanket access administration | May create Care Updates and Actions or act on an Action only through operation-specific current authority |
| Professional care-team member | **RETAIN** | Can receive a named assignment, report work, and contribute service-context observations | Only authorized Cases/records; source context; assignment terms; one valid next action; history | Full clinical record, staff roster, organization dashboard, supervisor override, broad professional-team feed | May create data and/or accept/start/complete only through their own complete Grant Path |
| Care recipient / older adult | **DEFER as an interactive MVP user; retain as the Case-centered person** | The product must remain centered on their care, preferences, dignity, and visibility boundaries, but direct account use is not required to prove the first loop | No first-slice account surface is assumed | No forced login, monitoring, or proxy consent model | Their data must be minimized; whether they directly create/view/action is **REQUIRES USER RESEARCH** |
| Case manager / care manager | **DO NOT create a separate MVP permission class** | A case manager may participate as one professional Identity when a real workflow requires it | Same capability-derived surfaces as any authorized participant | No role-based manager dashboard, reassignment bypass, or completion override | May perform only operations present on their own complete Grant Path; the label grants nothing |

Minimum interactive set: **two concrete people in one Case—one family participant and one professional care-team participant.** The product test requires distinct identities, not necessarily these role directions in every scenario.

## 4. End-to-end user flow

### A. Publisher / assigner flow

1. Sign in and resolve one current Actor Context.
2. Land on **My Cases**, containing only authorized Case projections and authorized unread counts.
3. Open a Case.
4. Review the “上次查看後” summary and visible activity.
5. Open a Care Update or choose **新增照顧變化** if `CARE_UPDATE_CREATE + CASE` is currently authorized.
6. Enter category, occurred date/precision, concise change, source, and an explicit permitted visibility choice.
7. Publish. The result displays server-recorded author and publication time.
8. Choose either:
   - **目前不建立處理事項**: return to the update/timeline; or
   - **建立處理事項**: open a separate Action step.
9. Enter an actionable title, reason/context, optional due time, and select one concrete eligible person. No option is preselected.
10. Submit. The Action and first `ASSIGNED` cycle appear atomically; partial “Action created but unassigned” success is not shown.
11. See “等待 [name] 接受”. Do not show acceptance, work, or completion prematurely.
12. Later return and see the trajectory and completion summary.

### B. Assignee flow

1. Sign in under the assignee's own account/Identity.
2. See an identity-scoped **指派給我** section in My Cases.
3. Open the Action detail and review the originating Care Update, assigner, reason, due time, and visibility-safe context.
4. If `ASSIGNED`, see exactly one primary CTA: **接受這項指派**.
5. After server-confirmed acceptance, see exactly one primary CTA: **開始處理**.
6. After server-confirmed start, see **標示處理完成**.
7. Enter a bounded handling summary and confirm completion.
8. See the terminal history. No further workflow CTA appears.

### C. Failure and access-loss flow

- If a protected item is absent or not visible, show the same non-enumerating surface.
- If access is revoked while the user is viewing, remove protected cached content, stop retries that assume authority, and return to My Cases or a no-access surface.
- If a transition is stale, preserve safe draft text, refetch, and require renewed intent; never silently apply a transition to a changed cycle.
- If an unfinished Action has no effective cycle, authorized viewers see **需要重新指派** and no former participant is shown as current. First-slice UI does not offer the repair control.

## 5. Screen inventory and decisions

| Candidate screen | Decision | MVP surface |
|---|---|---|
| 1. Login | **KEEP** | WinWin session entry; not the legacy product login |
| 2. Case list / Case entry | **KEEP** | My Cases is post-login landing and contains “assigned to me” |
| 3. Case Home | **KEEP** | Case orientation, new-change summary, recent updates, current responsibility alerts |
| 4. Since Last View / New Changes | **MERGE** | Summary on Case Home; boundary/divider and full list on Timeline |
| 5. Care Update detail | **MERGE** | Expandable/detail state from Timeline and source panel in Action detail; add a route only if mobile/accessibility testing proves necessary |
| 6. Create Care Update | **KEEP** | Dedicated focused form |
| 7. Create Action | **KEEP as a separate step; MERGE routing** | Follow-up sheet/section after a published update; not embedded in the publish transaction |
| 8. Action detail | **KEEP** | Detail card/anchor in Actions for MVP; route only if density testing requires it |
| 9. Accept / Decline Action | **MERGE Accept; DEFER Decline control** | Accept is the only `ASSIGNED` CTA for the exact assignee; declined state can render, but triggering decline is Second Stage |
| 10. Start Action | **MERGE** | One state-dependent CTA in Action detail |
| 11. Complete Action | **MERGE** | One state-dependent CTA plus bounded completion-summary dialog/section |
| 12. Reassignment / Needs Reassignment | **MERGE gap display; DEFER repair control** | Warning on Case Home and Action detail; reassignment UI is Second Stage |
| 13. Timeline / Activity History | **KEEP** | Permission-filtered product activity, including the since-last-view divider |
| 14. No access / revoked access | **KEEP** | Shared non-enumerating protected-resource surface |

Screens are organized around user questions and responsibility, not one route per database entity.

## 6. Page-by-page responsibility matrix

“May” below always means the server authorizes the exact operation through the adopted chain. It never means “all family” or “all professionals.”

| Surface | Purpose / primary question | Information and CTAs | View / create / modify / workflow | Read-only and enforcement | After access loss |
|---|---|---|---|---|---|
| Login | “How do I enter under my own current identity?” | Product name, sign-in method, safe errors; CTA Sign in | Public view; session creation only | No Case existence, role switch as authority, or protected counts. Auth service derives account context | Clear protected cache; remain on login or safe session-expired state |
| My Cases | “Which Cases and assigned work may I access now?” | Authorized Case cards, new-change badge, assigned-to-me list, relationship label/validity minimum | Current Actor Context may view minimized projections; no Case creation in slice | Counts are computed from current visible projection; search cannot enumerate hidden Cases | Remove Case immediately; show generic “目前沒有可存取的個案” if empty |
| Case Home | “What changed, and is any handling responsibility unclear?” | New-change summary, latest visible update, assigned/in-progress/gap summary, links to Timeline/Actions/Create Update | View only with current Case path; create CTA only when Care Update create decision passes | No raw Grant, hidden count, broad Care Circle, Question panel, or professional-record CTA in this slice | Redirect to shared no-access surface; do not retain prior content |
| Timeline | “What relevant product activity happened, especially since I last looked?” | Visible milestones, source/actor/server time, divider, target links | View through current record/activity projection; no direct history edits | Product Activity only; Security Audit stays hidden. Cursor advances only after successful render criteria | Do not advance cursor; return to safe parent/no-access |
| Care Update detail | “What changed, who reported it, when, from what source, and is handling linked?” | Current authorized version, author, occurred precision, publication time, source, visibility summary, linked Action | View current authorized version. No published edit. Create Action CTA only with separate authority | Prior versions/correction relationship are read-only when later exposed; first slice has no correction control | Hide body and linked targets; generic unavailable result |
| Create Care Update | “What care change should collaborators understand?” | Minimum fields, explicit visibility choice, validation; CTA Publish | `CARE_UPDATE_CREATE + CASE`; server creates author/time/version/activity/audit | Author, server time, version, proof, activity order read-only/system generated | Keep only unsent local draft text temporarily; prevent publish and exit protected context |
| Create Action step | “Does this change need handling, and who is the named eligible person?” | Source summary, title, reason, due time, eligible people; CTA Create and assign | Requires complete create+assign mutation decision and separate complete source-read decision; exact target eligibility | No free-text assignee, default selection, role-only selection, partial create, or later silent source switch | Preserve local draft without protected source body; disable submit and return safely |
| Actions / Action detail | “Who currently holds responsibility, what is the one next step, and what happened before?” | Source, creator/assigner, exact current assignee, due time, stepper, completion summary, history | Visible actors may read; exact current assignee with operation capability may Accept/Start/Complete; others have no active CTA | Workflow facts, actor, times, ended cycles are read-only. Server rechecks state/cycle/path on every operation | Hide content and CTAs. A revoked/former person is never shown as current |
| Continuity-gap state | “This unfinished Action has no effective responsible person—what is true now?” | Prominent “需要重新指派”; reason category only if safe; preserved historical milestones | Authorized viewers may see. No repair CTA in first slice | Former assignee history read-only; no auto-selection or implied manager | If viewer loses access too, generic no-access replaces gap details |
| No access | “What can I safely do when this resource is unavailable?” | Generic title, return to My Cases, retry only for transient session checks | No protected operations | Does not distinguish nonexistent, invisible, revoked, expired, or ended Membership | Remain safe; access restoration requires an out-of-slice governance flow |

Authorization is enforced twice in UX terms: the client uses authorized projections to avoid misleading controls, and the server/database is the authoritative decision boundary for every read and operation. A hidden or disabled button is not a security boundary.

## 7. Family vs professional behavior

### Same rules where no evidence justifies a difference

| Concern | Family participant | Professional participant | Decision |
|---|---|---|---|
| Published authorship and correction integrity | Immutable publication; successor correction only | Same | **SAME** |
| Assignment/Accept/Start/Complete semantics | Capability and exact-cycle based | Same | **SAME** |
| Action completion | Exact current assignee only; bounded summary | Same | **SAME** |
| Timeline attribution | Exact Identity snapshot plus understandable relationship label | Same | **SAME** |
| Record visibility | One current path + typed visibility | Same | **SAME**; no family/professional blanket audience |
| Reassignment rights | `ACTION_REASSIGN` only | Same | **SAME**; no manager/professional bypass |
| Access lifecycle | Current lifecycle instances required; end fails closed | Same | **SAME** |

### Justified presentational or lifecycle differences

- Care Update templates may offer different prompts (for example “你觀察到什麼？” versus “本次服務中觀察到什麼？”) only to improve comprehension. Both publish the same logical object and minimum integrity facts.
- A professional relationship may show minimum service context/end date needed to distinguish an assignee. A family relationship may show a minimum relationship label. Neither label grants capability.
- Professional verification and invitation requirements may differ later, but they are onboarding/access-governance concerns and are **DEFERRED** from the first slice.
- Professional “correction/verification” of another person's update is not assumed. Third-party correction, co-signing, and clinical verification are **FUTURE / RESEARCH**.

**UNVALIDATED PRODUCT ASSUMPTION:** one shared object/form with prompt variants is understandable to both family and formal-care participants. **REQUIRES USER RESEARCH.**

## 8. Care Update UX contract

### Meaning

A Care Update is a relevant care change or new information that collaborators may need to understand or act upon. It is not a social post, generic diary entry, formal clinical record, diagnosis, or proof of stability.

### Creation fields

| Field | Requirement | UX / minimization rule |
|---|---|---|
| Category | Required | Small vocabulary: observation, care arrangement/change, other relevant update. Do not include Question in first slice |
| What changed | Required, bounded | Concise plain-language content; recommended 1–1,000 characters; prompt against diagnosis claims |
| Source | Required, bounded | Human-readable provenance such as direct observation or named service context; do not collect a full contact record |
| Occurred date | Required | User claim, visibly distinct from publication time |
| Occurred time precision | Required choice | Exact time, approximate time, or unknown time. Do not invent precision |
| Visibility | Required explicit choice; no preselected broad default | Show only server-allowed options with plain-language audience summaries |
| Additional context | Optional, bounded | Only details materially needed for coordination; recommended 0–500 characters |
| Attachment | Not collected | **DEFER** until content type, consent, scanning, retention, and visibility risks are reviewed |

System-generated and read-only: stable update/version ID, exact author Identity + Membership attribution, server publication time, version 1, authorization proof reference, activity sequence, idempotency/correlation, and Audit reference.

### Visibility choices

- `AUTHOR_ONLY`: “只有我目前可查看”—still requires the author's current complete path; not permanent access.
- `DIRECT_PARTICIPANTS`: “只限這筆內容指定的協作者”—exact Identity + Membership designations, never role names.
- `CASE_SHARED`: “此個案中目前有權查看共享內容的協作者”—not everyone ever associated with the Case.

No option is preselected in the first product test. `FAMILY_TEAM`, `PROFESSIONAL_TEAM`, and `EXPLICIT_GRANT` are unavailable. Unknown policies fail closed.

### Publication, correction, and Action relationship

- Draft text may be edited until Publish.
- Publish confirmation says: “發布後不會直接覆寫；若需更正，會保留原內容並建立新版本。”
- First-slice published detail is read-only. The original-author correction control is Second Stage.
- Correction later requires the original author, current visibility, `CARE_UPDATE_CORRECT + RECORD`, expected current lineage, and a bounded reason. It appends a successor version.
- “建立處理事項” appears only after successful publication and is a separate operation.
- An Action links to the exact visible Care Update version used as source. A later correction does not silently rewrite what the Action originally referenced; the UI may later indicate that a newer version exists.
- If no Action is needed, show “目前未建立處理事項”. Do not call the update resolved, stable, acknowledged, or completed.

## 9. Action / Responsibility Cycle UX contract

### Action creation

Required user input:

- source Care Update version;
- short actionable title;
- bounded reason/context explaining what needs handling;
- one concrete eligible assignee (exact Identity + Membership).

Optional user input: due date/time. Do not collect recurring schedules, location tracking, contact details, priority algorithms, or delegation chains.

The assignee picker shows a safe display name first and only enough relationship/service validity context to distinguish the person. It has no default-first assignee and no free-text fallback. An empty eligible set blocks submission without creating an Action.

### State and CTA contract

| Current responsibility truth | User label | Exact current assignee | Other authorized viewer | Historical facts retained |
|---|---|---|---|---|
| First cycle created | 等待接受 | **接受這項指派** | “等待 [name] 接受” | assigner, assignee, server assigned time |
| Accepted | 已接受 | **開始處理** | accepted person/time; no CTA | assignment + acceptance |
| In progress | 處理中 | **標示處理完成** | started person/time; no CTA | assignment + acceptance + start |
| Completion form | 完成處理 | required bounded handling summary; confirm | no CTA | all prior milestones |
| Completed | 已完成 | no workflow CTA | completion time and summary | complete cycle and all milestones |
| No effective cycle, Action unfinished | 需要重新指派 | no first-slice repair CTA | warning; no former person shown as current | ended cycle and reason remain history |

Lack of authority normally removes the workflow control and states “此步驟由目前負責人操作.” A disabled control is reserved for an in-flight submission or a prerequisite the same user can resolve.

### Decline, relinquish, reassignment, and revocation

- Decline before acceptance ends `ASSIGNED` as `DECLINED`; it does not choose a replacement.
- Relinquish after acceptance ends the cycle as `RELINQUISHED`; after start the reason is `CANNOT_CONTINUE_AFTER_START`. It does not complete the Action.
- Reassignment ends/preserves the old cycle and creates a new `ASSIGNED` cycle for one exact eligible person. The new person must Accept, Start, and Complete again.
- Revocation immediately removes authority. If no other independently complete path supports the current assignee, the cycle ends `ACCESS_REVOKED` and the Action derives `NEEDS_REASSIGNMENT`.
- Historical attribution never gives permanent current visibility.
- No operation automatically chooses a replacement, delegates, or permits supervisor completion.

The states above must render safely if encountered. Their initiating/remediation controls are Second Stage under adopted decisions.

## 10. Since-last-view UX

### User experience

- My Cases shows **新變化 N**, where N is computed from the actor's currently visible activity projection.
- Case Home shows the count and newest visible summary.
- Timeline inserts **上次查看後** immediately before the first visible item after the stored boundary.
- If none are new, show “上次查看後沒有新的可見變化” while keeping older authorized history available.
- Do not show who else has read, per-record receipts, presence, or global Case sequence numbers.

### Cursor advancement decision

Simply requesting or beginning to load the screen does **not** mark everything read.

Advance only when:

1. the visible Timeline response succeeds;
2. the client has rendered the returned visible items and the divider/boundary state;
3. no authorization replacement or fatal partial-data error occurred; and
4. the client submits the opaque server-issued visible boundary.

The cursor belongs to exact Identity + Membership lifecycle + Case and stores monotonic maximum semantics. Multiple devices may race; the greatest accepted server boundary wins, equal/lower requests are safe no-ops, and the next refresh reflects the shared authoritative cursor. Client clock, scroll time, and display timestamps never set it.

On network failure, keep the old cursor and allow a safe retry. On access change, re-evaluate visibility before returning activity; the old cursor never reveals hidden content. A new Membership lifecycle starts fresh and does not inherit the old cursor.

**UNVALIDATED PRODUCT ASSUMPTION:** advancing after successful Timeline render is an understandable proxy for “reviewed enough” without claiming each item was read. Test this language and behavior with users.

## 11. Timeline UX

### Purpose

The Timeline answers: “What meaningful care-coordination and responsibility events happened in this Case?” It supports continuity and traceability; it is not a raw database/audit/event log.

### MVP event vocabulary

- Care Update published;
- Action created;
- Action assigned;
- Action accepted;
- Action started;
- Action completed, with a safe summary indicator;
- continuity gap when product-relevant and visible.

Second-stage events: Care Update correction published, Action declined, responsibility relinquished, reassignment, and product-relevant access-end consequences.

Each item contains a stable activity ID, typed target link, safe actor display, server time, concise summary, and server order. Adjacent “Action created + assigned” may be visually grouped but both facts remain preserved. Ordering uses the server Case activity sequence; timestamp is display metadata.

### Product Activity versus Security Audit

| Product Activity | Security Audit |
|---|---|
| Understandable care/work milestones | Exhaustive mutation/security proof |
| Permission-filtered ordinary-user projection | Narrow privileged access |
| Safe actor label and target link | Exact actor/account/Grant proof/correlation references |
| No hidden counts or global gaps | May preserve security topology not suitable for ordinary users |
| No full content payload | No copied content body or raw credential |

Security denial details, Grant IDs/inventories, raw request data, SQL/RLS errors, and sensitive payloads never appear in the Timeline.

## 12. Screen-state matrix

| Surface / state | What the user sees | Available / disabled | Retry / redirect / attribution |
|---|---|---|---|
| Login — loading | Product shell and “正在確認登入狀態” | Sign-in disabled during one request | Safe retry on temporary failure |
| Login — error/offline | Plain-language authentication or network message | Retry; retain non-sensitive identifier only as appropriate | Never expose provider stack/token details |
| My Cases — loading | Skeleton cards without fake counts | Search and Case actions unavailable | Retry safely |
| My Cases — empty | “目前沒有可存取的個案” | No create/invite CTA in slice | Do not reveal revoked/hidden Case counts |
| My Cases — partial data | Cases that were safely authorized plus “部分資訊暫時無法載入” | Opening known authorized Case may remain; unread totals suppressed if incomplete | Retry projection; never compute from partial global data |
| Case Home — normal | New-change summary, latest visible update, responsibility summaries | Only authorized CTAs | Attribution visible for returned records |
| Case Home — no activity | “目前沒有可見活動” | Create Update only if allowed | Does not imply no hidden data or clinical stability |
| Protected Case/record — no access, revoked, membership ended, record not visible | Shared “目前無法查看這項內容/個案” surface | Return to My Cases; no protected CTA | Usually redirect to safe parent; do not distinguish causes; prior attribution is not shown to lost actor |
| Timeline — loading | Stable header and item skeletons | Cursor not advanced | Retry is safe |
| Timeline — empty | “目前沒有可見的個案活動” | Create Update if authorized | Cursor may advance only to a valid returned boundary, never invented locally |
| Timeline — partial/error | Last confirmed content may be visually marked stale or removed; error banner | Cursor advance disabled | Retry response; no hidden gap/count inference |
| Timeline — offline | “目前離線，尚未同步最新活動” | Read-only cached content only if policy permits and clearly stale; no mutation | Full offline cache/sync is Future; default is no sensitive persistent cache |
| Create Care Update — validation | Field-specific guidance | Publish disabled only while invalid/submitting | User may correct locally |
| Create Care Update — publish failure | “照顧變化尚未建立” | Same-key safe retry after status check; preserve local draft | Never show partial publication |
| Create Care Update — stale allowed options/access loss | Explicit visibility/authority changed message | Submit disabled | Refresh allowed options; exit on revoked access |
| Create Action — no eligible assignee | “目前沒有可指派的協作者” | Submit disabled; keep local draft | Retry candidate load; no free-text bypass |
| Create Action — target became ineligible | Safe “這位協作者目前無法被指派” | Refresh selection | No Action/cycle created |
| Create Action — uncertain network result | “尚未確認是否建立” | Duplicate submit disabled until operation-status lookup | Reuse idempotency key; do not blindly create again |
| Action — assigned to someone else | Status and current responsible display if visible | No Accept/Start/Complete control | Historical attribution visible only through current record visibility |
| Action — waiting acceptance | “等待 [name] 接受” | Exact assignee sees Accept; others none | Safe same-key retry; server rechecks cycle |
| Action — accepted | Accepted time and current person | Exact assignee sees Start | No skipped completion |
| Action — in progress | Started time and current person | Exact assignee sees Complete | Completion summary required |
| Action — completed | Complete stepper, server time, handling summary | No workflow CTA | Duplicate Complete resolves to current result; no duplicate event |
| Action — declined | “已婉拒；需要重新指派” | No first-slice repair CTA | History retained; do not show declined person as current |
| Action — needs reassignment | Prominent continuity-gap warning | No first-slice reassign CTA | No auto-selection; authorized viewer may use out-of-slice coordination |
| Action — stale/concurrent update | “處理事項已更新，請查看最新狀態” | Discard stale CTA; preserve unsubmitted note separately | Refetch, then require explicit renewed intent |
| Any mutation — offline/temporary failure | Pending/unknown result copy | Prevent duplicate taps | Status lookup, then same-key bounded retry |

Historical attribution remains visible to a currently authorized viewer when the record projection admits it. “Preserved history” never means the former or revoked actor may still view it.

## 13. Authorization-to-UX mapping

### Adopted chain

```text
Actor
→ Identity
→ Case Membership lifecycle
→ Relationship lifecycle
→ one complete current Grant Path
→ Record Visibility or exact Responsibility Cycle
→ operation-specific Capability
→ Audit Event
```

### UX consequences

| Authorization truth | UX rule |
|---|---|
| Role is presentation only | Labels can explain context but never decide a CTA or audience |
| Membership/Relationship alone are insufficient | A Case may disappear even though historical participation exists |
| One complete Grant per decision | The UI consumes a server decision/allowed-operation list; it never unions permissions |
| Record visibility is separate from operation capability | A viewer may see an Action without any workflow control |
| Create+assign and protected-source read are separate complete decisions | Action creation can fail even when the source is visible; visibility cannot repair missing mutation authority |
| Exact current assignee controls Accept/Start/Complete | Same role, same organization, assigner, or manager cannot substitute |
| Historical responsibility is attribution only | Past assignee appears in authorized history but is not current and gains no permanent access |
| Revocation fails closed | Remove content/controls immediately; do not reveal revoker or Grant detail |
| Server facts are authoritative | Client-supplied author, state, time, capability, assignee authority, sequence, or cursor is display/request data only |
| Unknown vocabulary denies | No generic fallback audience or action |

### Public error vocabulary

- `NOT_FOUND_OR_NOT_VISIBLE`: shared protected-resource unavailable state.
- `FORBIDDEN`: current operation unavailable without naming the missing capability/path.
- `STALE_VERSION` / changed responsibility: refresh and reconfirm intent.
- `TARGET_INELIGIBLE`: only for a target selected from an already authorized candidate set.
- `TEMPORARY_FAILURE`: status lookup and bounded same-key retry.
- `IDEMPOTENCY_CONFLICT`: new explicit intent/key required.
- `CONTINUITY_GAP`: only for an authorized viewer of the Action; does not reveal hidden prior responsibility.

## 14. Privacy and data-minimization matrix

| Surface / data | Necessary | Optional | Do not collect in MVP | Sensitivity / minimum visibility |
|---|---|---|---|---|
| Login | Account/session binding | None beyond provider minimum | Identity documents, copied credentials, role claim used as authority | Authentication data; self/service only |
| My Cases | Case display label, minimum relationship/service validity, authorized counts | Private local organization is not needed for this slice | Hidden Case names/counts, broad family/staff directory, unrelated contact data | Case association is sensitive; exact current actor projection |
| Case Home | Latest visible activity and responsibility/gap summary | None | Diagnosis dashboard, location, broad schedule, “stable” inference | Current Case/record-authorized participants only |
| Care Update | Bounded change, source, occurred precision, author, server time, visibility | Bounded coordination context | Full chart, medication history by default, family narrative, GPS, mental-health profile, raw documents/photos | Potential health/care content; typed record visibility plus current path |
| Action | Title, reason, source, exact assigner/assignee, due claim, states/times, completion summary | Due time | Staff performance scoring, route/location, employment details, recurring schedule | Responsibility/work data; typed visibility and exact operation rules |
| Eligible assignee list | Safe name, minimum relationship/service context and validity | Availability hint only if authoritative and necessary later | Contact info, other Cases, full credential/Grant inventory | Only candidates authorized for this exact operation |
| Timeline | Typed milestone, safe actor display, server time/order, target link | Safe compact summary | Full payload duplication, hidden sequence/counts, security denial detail | Re-evaluate each target under current visibility |
| Cursor | Max boundary for Identity+Membership+Case | None | Per-record receipts, reader list, presence, device tracking | Behavioral metadata; exact owner only |
| Audit | Stable IDs, operation, proof references, bounded state refs, server time/correlation | Reviewed reason category | Content bodies, raw credentials, broad device telemetry | Narrow privileged policy; not ordinary Case visibility |

Default client behavior should avoid persistent offline caching of sensitive content. Full retention, deletion, export, consent, legal basis, and Taiwanese professional-record obligations are outside this slice and require policy/legal review before production.

## 15. MVP / Phase 2 / Future classification

### MVP REQUIRED

- WinWin login/session seam and current Actor Context;
- authorized My Cases and identity-scoped “assigned to me” section;
- Case Home with new-change summary and continuity-gap projection;
- Timeline with server-ordered visible Product Activity and since-last-view divider;
- Care Update view and immutable version-1 publication;
- explicit permitted visibility selection;
- separate Action create+exact-assignee step linked to a visible Care Update;
- Action detail with current responsible person and ordered stepper;
- exact-assignee Accept, Start, Complete with bounded handling summary;
- preserved responsibility/activity history;
- loading, empty, failure, stale, no-access, revoked-access, and network-uncertain states;
- server-bound monotonic Read Cursor behavior;
- no-access non-enumeration and no role authority.

### PHASE 2

- original-author Care Update correction UI;
- decline and relinquish controls;
- reassignment/remediation controls and richer continuity-gap handling;
- full Question ask/answer/resolve workflow;
- invitation, delayed activation, access lifecycle, and optional professional-verification UI;
- product-relevant access-history projection;
- notification delivery only after workflow/privacy decisions;
- dedicated Care Update or Action routes only if usability testing proves merged surfaces insufficient.

### FUTURE / RESEARCH

- direct older-adult account experience and supported/proxy decision model;
- delegation/sub-assignment and supervisor override;
- organization hierarchy, role templates, administration, and staff performance views;
- broad team audiences (`FAMILY_TEAM`, `PROFESSIONAL_TEAM`) and `EXPLICIT_GRANT` unless evidence requires them;
- advanced service/resource matching and local-resource coordination;
- clinical signing/co-signing, medical-record integration, and regulated record workflows;
- large Question workflows, scenario simulation, AI-generated advice/scoring, chatbot support;
- push/email preference infrastructure, urgency/escalation automation;
- analytics, legal export, cross-Case operations, per-record read receipts, presence, and full offline sync;
- GPS, fall detection, medication reminders, and caregiver mental-health features as separate evidence-led product decisions, not automatic WinWin expansion.

## 16. WinWin versus a generic care-record app

### Strongest defensible distinction

| Generic care record | WinWin first-slice claim |
|---|---|
| Primarily records what happened | Records a meaningful care change and can connect it to one named responsibility lifecycle |
| May show that a task exists or is checked | Separates assignment, acceptance, work started, and completion |
| Often centers a chronological record | Centers the question “who currently holds responsibility, and is there a gap?” alongside history |
| May preserve author/time | Preserves source plus immutable responsibility transitions and handoff attribution |
| Access may be presented by role/team | Uses identity-, lifecycle-, visibility-, and operation-specific authorization boundaries |

The defensible product difference is **responsibility continuity attached to care-change continuity**, especially the refusal to treat visibility, assignment, acceptance, start, and completion as the same fact.

### Critical test

- Task assignment, status tracking, audit trails, and shared notes are common care-management/work-management functions. They are not individually innovative.
- WinWin has not yet demonstrated that its exact state model improves outcomes, reduces missed care, reduces caregiver burden, or outperforms existing tools.
- The most distinctive combination is a hypothesis until family/professional users show that they understand and use it in real handoffs.
- Do **not** claim “innovative,” “prevents care interruption,” “improves health outcomes,” “ensures accountability,” or “complies with long-term-care regulation” based on this specification.

Research questions:

- Do users distinguish “assigned” from “accepted” without training?
- Does the handling summary help the next participant, or become low-value documentation burden?
- When responsibility disappears, do users notice and act through their real coordination channel?
- Is explicit visibility understandable at publication time?

All are **REQUIRES USER RESEARCH**.

## 17. Long-term-care problem / value mapping

| Direct problem | Retained function | Intended value | Evidence status |
|---|---|---|---|
| Relevant change is fragmented across people/settings | Sourced Care Update and authorized Timeline | Makes minimum context and provenance available to current collaborators | Plausible continuity mechanism; local workflow effect unvalidated |
| People see a change but no one owns handling | Explicit Action and exact assignee | Makes the current responsibility proposition visible | Core product hypothesis; requires testing |
| Assignment is mistaken for agreement | Separate Assign and Accept | Records explicit acceptance rather than assuming it | Strong semantic safety; behavioral value unvalidated |
| Acceptance is mistaken for action | Separate Start | Exposes whether handling began | Strong semantic safety; user burden requires testing |
| Checkbox completion lacks handoff context | Required bounded handling summary | Gives the next participant a concise reported result | New bounded decision; requires usability testing |
| Responsibility changes or access ends | Immutable cycles and gap projection | Prevents silent overwrite and visibly represents no current holder | Direct continuity value; remediation UX is Phase 2 |
| New information is hard to find | Visible-projection Read Cursor | Surfaces new authorized changes without claiming read receipts | Useful navigation hypothesis; not a comprehension measure |
| Formal and family care transition loses context | Shared object semantics with exact authorization | Supports bidirectional information/management continuity without copying full clinical records | Literature supports the problem area, not WinWin effectiveness |

Every MVP function above contributes to information or responsibility continuity. Case chat, broad notifications, professional records, Questions, resource matching, and organization administration do not add necessary proof to this first loop and remain deferred.

## 18. Long-Term Care 3.0 relevance and verification notes

Taiwan's Ministry of Health and Welfare states that Long-Term Care 3.0 was approved on 2025-12-31 and implemented from 2026, building on community-based, person-centered, continuous care and emphasizing medical-care integration, family support, smart-care technology, and aging in place: [official Long-Term Care 3.0 overview](https://1966.gov.tw/LTC/cp-6572-85008-207.html).

| Policy connection | Relevance to this slice | Claim boundary |
|---|---|---|
| Continuity of care / medical-care integration | The slice preserves cross-participant changes, handling responsibility, and handoff history | Relevant design alignment only; WinWin is not a medical-care integration service or formal record |
| Family support | Family participants can contribute observations and receive/hold explicit responsibility under current authorization | Potential support mechanism; no claim that it reduces burden |
| Smart care | Uses digital coordination and traceability | Technology use alone does not satisfy policy outcomes or qualify as a government smart-care program |
| Aging in place | Better family/formal-care coordination may support home/community care continuity | Indirect hypothesis; no causal or eligibility claim |
| Service integration | Exact family/professional participation can bridge information across relationships | MVP does not integrate service providers, government systems, referrals, payments, or resources |
| Local resource/service coordination | Not implemented | FUTURE / RESEARCH; do not imply coverage |

The wording above was checked against the official page updated 2026-03-09. Any claim about program eligibility, procurement, reimbursement, compliance, mandated workflow, or later policy amendment is **REQUIRES CURRENT POLICY SOURCE VERIFICATION** at the time of use.

## 19. Open product questions

**No unresolved product decision blocks a bounded fictional-data implementation of the A→B→A first slice after this specification is reviewed.** This specification fixes the initial choices: completion summary is required and bounded to 1–300 characters; visibility has no preselected option; the cursor advances after successful Timeline render rather than initial load; and Action detail remains merged in the Actions surface unless accessibility/mobile evidence later requires a route.

The following are research hypotheses, not implementation blockers:

- whether the completion-summary examples prevent diagnosis/outcome overclaiming without excessive documentation burden;
- whether family and professional participants understand the three visibility choices;
- whether “上次查看後” is understood as navigation state rather than a read receipt; and
- whether the merged Action detail remains usable on small screens.

Each is **REQUIRES USER RESEARCH** during prototype usability testing. A dedicated Action route may be introduced as an evidence-led presentation adjustment without changing the domain contract.

Direct older-adult participation, professional verification, notifications, correction, Question, decline/relinquish, and reassignment workflows are explicitly deferred; they do not block the first-slice implementation.

## 20. Recommended next implementation slice

After product review—and only under a separate frontend implementation authorization—implement the application-facing happy path in this order:

1. WinWin session entry → authorized My Cases.
2. Case Home + Timeline response with visible unread count/divider and cursor advancement after successful render.
3. Immutable Care Update version-1 form/detail using an explicit visibility choice.
4. Separate Action create+assign step with no default assignee and exact candidate references.
5. Action detail projection with exact current responsibility and one permitted next CTA.
6. Accept → Start → Complete with the bounded completion summary.
7. Product Activity/history, stale-state handling, and continuity-gap/no-access projections.
8. A→B→A usability and authorization-state tests, including unauthorized C and revoked B.

Do not begin with invitation, Question, correction, professional-record, notification, reassignment controls, or a generalized design system. Do not expose raw database entities or authorize from `DemoRole`. The current IA-2 code is reference/demo scaffolding: reuse its exact-participant and cursor seam concepts, but replace its embedded Care Update+Action form coupling, role-oriented copy, Question/professional-record surfaces, incomplete history presentation, and non-production state handling in bounded frontend work.

This document authorizes no implementation. Product review must occur before frontend work, and Foundation/Supabase/database/runtime work remains outside this workstream.
