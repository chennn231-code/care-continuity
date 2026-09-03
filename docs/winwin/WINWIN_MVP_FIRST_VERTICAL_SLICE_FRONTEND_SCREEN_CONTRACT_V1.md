# WinWin MVP First Vertical Slice Frontend Screen Contract V1

Status: **FINAL — FROZEN — ADOPTED — no React, routing, style, authorization, Foundation, Supabase, database, runtime, or deployment implementation**

Final Freeze Verification: **PASS**

Pre-adoption verified candidate SHA-256: `a76638009a196ba10c0c1b9467ee0916e816dd6cd6708bdf8f2b7a05bc649b35`

Date: 2026-08-30

Sole Product / UX authority: `82c0ddba0e662f5bc1017889f223833e21476f5b`

Frozen source artifact: `docs/winwin/WINWIN_MVP_FIRST_VERTICAL_SLICE_PRODUCT_UX_SPEC_V1.md`

Frozen source artifact SHA-256: `94ac540686d8d71a482628412b52150c32a4bd05e0b99016eaf6bafa28f68f86`

## 1. Contract purpose and authority

This document translates the frozen first-slice Product / UX baseline into a testable frontend screen contract. It freezes:

- screen and merged-subview responsibilities;
- entry and exit conditions;
- minimum information hierarchy;
- user-facing Traditional Chinese terminology;
- state-dependent controls;
- loading, empty, partial, failure, stale, offline, no-access, and continuity-gap behavior;
- application-service inputs and outputs consumed by screens;
- cursor advancement conditions;
- mobile and accessibility behavior; and
- screen-level acceptance evidence required before real backend integration.

It does not authorize or define:

- React components, hooks, state libraries, CSS, design tokens, or visual styling;
- production URL structure;
- database tables, migrations, RLS, SQL, Supabase clients, RPCs, or server functions;
- Foundation/runtime work;
- role-based authorization;
- invitation, access administration, Question, correction, reassignment, relinquish, notification, organization, or clinical-record UI; or
- deployment, merge, or push.

If this contract conflicts with the frozen Product / UX artifact, the frozen artifact wins and this contract must stop for correction. Existing prototype behavior is reference material only and cannot override the frozen source.

## 2. Frozen screen outcome

The frontend must make both first-slice responsibility outcomes truthful and understandable:

```text
Login
→ 我的個案
→ 個案首頁 / 上次查看後的新變化
→ 照顧變化
→ 建立處理事項並指派具名協作者
→ 尚待接手
   ├─ 接受處理 → 開始處理 → 完成處理 → 簡短處理結果
   └─ 目前無法接手 → 目前沒有人確定接手 / 需要重新安排
→ 保留責任與活動歷程
```

The second branch stops at a visible continuity gap. It has no replacement picker, reassignment CTA, inferred manager, automatic recommendation, notification escalation, or “已重新指派” message.

## 3. Screen and merged-subview inventory

| ID | Contract name | Decision | Primary user question | Logical navigation target |
|---|---|---|---|---|
| `SC-01` | WinWin session entry | SCREEN | 我如何用目前身分進入 WinWin？ | `LOGIN` |
| `SC-02` | My Cases | SCREEN | 我現在可以查看哪些個案與指派？ | `CASE_LIST` |
| `SC-03` | Case Home | SCREEN | 上次查看後有什麼變化？目前責任是否清楚？ | `CASE_HOME(caseId)` |
| `SC-04` | Timeline | SCREEN | 哪些與照顧／責任有關的活動發生了？ | `CASE_TIMELINE(caseId)` |
| `SC-05` | Care Update detail | MERGED SUBVIEW | 發生了什麼、來源是什麼、是否需要處理？ | Timeline expansion or Action source panel |
| `SC-06` | Create Care Update | SCREEN | 我要讓協作者理解哪個照顧變化？ | `CREATE_CARE_UPDATE(caseId)` |
| `SC-07` | Create Action | MERGED FOLLOW-UP STEP | 這個變化需要誰接手處理？ | Post-publish or Care Update follow-up subview |
| `SC-08` | Action Detail | SCREEN + BOUNDED DISCOVERY STATE | 現在誰負責、下一個有效操作是什麼、過去發生什麼？ | `ACTION_DETAIL(caseId, actionId)` |
| `SC-09` | Protected resource unavailable | SHARED SCREEN STATE | 我現在還能安全地做什麼？ | `NO_ACCESS` or safe parent |

There is no standalone page for Since Last View, Care Update detail, Accept, Cannot Take Over, Start, Complete, or continuity gap. These are explicit states/subviews of the retained screens.

`SC-08` is primarily the Action Detail screen. `actionId` identifies the Action Detail state. A case-level discovery state may expose only the bounded links needed to enter an existing Action Detail; it is not an independent primary screen, task inbox, generic Action list, all-family queue, Kanban board, or task-management product. Case Home and My Cases may link directly to a relevant Action Detail. The MVP therefore remains nine product surfaces and does not create a tenth screen.

### 3.1 Nine-surface product mapping

| Baseline product surface | Screen-contract representation |
|---|---|
| 1. Login | `SC-01` dedicated screen |
| 2. Authorized Case List | `SC-02` dedicated screen |
| 3. Case Home | `SC-03` dedicated screen |
| 4. Care Updates / Changes Since Last View | `SC-03` summary + `SC-04` Timeline boundary/list + `SC-05` merged detail |
| 5. Create Care Update | `SC-06` dedicated screen |
| 6. Create Action | `SC-07` merged follow-up step |
| 7. Action Detail | `SC-08` dedicated detail screen with bounded discovery entry state |
| 8. Care Continuity Gap | `SC-03` summary + existing `SC-08` continuity-gap state |
| 9. Activity / Responsibility History | `SC-04` Product Activity + `SC-08` responsibility history |

This mapping does not require a one-to-one route or create any additional product surface.

## 4. Navigation contract

### 4.1 Normative logical navigation

| From | Event | Destination | History behavior |
|---|---|---|---|
| Session entry | successful session resolution | My Cases | Replace unauthenticated entry |
| My Cases | open authorized Case | Case Home | Push |
| My Cases / assigned-to-me | open Action | Action Detail | Push; preserve Case context |
| Case Home | view all activity | Timeline | Push |
| Case Home | open relevant Action or continuity-gap summary | Existing Action Detail / continuity-gap state | Push; no repair or reassignment screen |
| Case Home / Timeline | create update | Create Care Update | Push |
| Timeline | expand Care Update | Care Update merged detail | No required route change |
| Care Update detail | create Action | Create Action follow-up step | No standalone entity page required |
| Create Care Update | publish success | Published-result state | Replace form submission state; do not auto-create Action |
| Published result | no Action needed | Timeline focused on published update | Replace transient result state |
| Published result | create handling item | Create Action follow-up step | Preserve exact source version reference |
| Create Action | success | Action detail in `ASSIGNED` state | Replace transient create state |
| Action detail | Accept / Cannot Take Over / Start / Complete success | Same Action detail with authoritative result | Replace stale local state; do not append client-invented history |
| Any protected screen | access loss / unavailable protected target | shared unavailable state or My Cases | Replace protected route when access is lost |

Browser Back from a submitted mutation must not replay the mutation. Back may return to the previous authorized projection, never to an apparently submittable committed form.

### 4.2 Current prototype route adapter

The following mappings are compatibility candidates, not Product authority:

| Logical target | Current candidate mapping |
|---|---|
| `CASE_LIST` | `/v2/prototype/workspace` |
| `CASE_HOME(caseId)` | `/v2/prototype/cases/:caseId` |
| `CASE_TIMELINE(caseId)` | `/v2/prototype/cases/:caseId/timeline` |
| `CREATE_CARE_UPDATE(caseId)` | `/v2/prototype/cases/:caseId/updates/new` |
| `ACTION_DETAIL(caseId, actionId)` | `/v2/prototype/cases/:caseId/actions#action-…` |

`LOGIN`, Create Action follow-up, Care Update detail, and confirmation subviews require an adapter decision during separately authorized frontend work. Changing a prototype URL does not reopen this contract if navigation semantics remain unchanged.

## 5. Shared application projection contract

Screens consume application projections and operation results. They do not query authorization tables, inspect Grant inventories, select an arbitrary Identity, or infer controls from display roles.

### 5.1 Shared display facts

| Fact | Minimum screen use | Rule |
|---|---|---|
| `screenState` | normal/loading/empty/partial/error/no-access | Must be explicit; absence of data is not automatically empty |
| `actorDisplay` | safe current identity/relationship context | Presentation only; never authority |
| `caseDisplay` | safe Case label and minimum relationship context | Returned only for an authorized Case projection |
| `allowedOperations` | decide which controls render | Server/demo application decision; no client capability composition |
| `version` / `expectedVersion` | stale-safe mutations | Opaque to users; never displayed as security detail |
| `operationKey` | idempotent mutation retry | Generated per user intent; reuse only for the identical normalized request |
| `serverRecordedAt` | attribution/history display | Client time never replaces it |
| `activityBoundary` | cursor advancement | Opaque and server-issued; client must not construct it |

### 5.2 Allowed-operation tokens

The screen layer may receive named booleans/tokens such as:

- `CREATE_CARE_UPDATE`;
- `CREATE_ACTION`;
- `ACCEPT_ACTION`;
- `DECLINE_ACTION`;
- `START_ACTION`;
- `COMPLETE_ACTION`.

These are presentation results, not authorization proofs. `DECLINE_ACTION` corresponds to the exact current assignee's complete current `ACTION_DECLINE + RECORD` decision. Unknown operations render no control.

### 5.3 Shared public results

| Result | Screen treatment |
|---|---|
| `SUCCESS` | Replace local projection with returned authoritative projection |
| `NOT_FOUND_OR_NOT_VISIBLE` | Remove protected target and show shared unavailable behavior |
| `FORBIDDEN` | Remove operation; do not name capability, Grant, revoker, or another assignee |
| `STALE_VERSION` | Announce update, refetch, and require renewed intent |
| `TARGET_INELIGIBLE` | Refresh the authorized assignee set; keep safe local Action draft |
| `TEMPORARY_FAILURE` | Preserve safe form input; status lookup then bounded same-key retry |
| `IDEMPOTENCY_CONFLICT` | Stop; require a new explicit intent and operation key |
| `CONTINUITY_GAP` | For an authorized Action viewer, show the minimized no-current-holder projection |

Raw HTTP, SQL, RLS, stack, token, policy, Grant, and internal enum details never appear in user copy.

### 5.4 Mutation-outcome lookup and bounded recovery

Every mutation intent creates one `operationKey` before submission. If the response is interrupted or uncertain, the frontend must not create a new intent or silently submit again. It must call an application-level operation-status lookup equivalent to `lookupOperationStatus(operationKey)`, then revalidate the authoritative resource/workflow state.

This applies to Create Care Update, Create Action, Accept, Cannot Take Over/Decline, Start, and Complete. The lookup result must distinguish:

| Lookup outcome | Required screen behavior |
|---|---|
| `COMMITTED` | Show the current server-authoritative result; do not resubmit |
| `DEFINITELY_NOT_COMMITTED` | Permit a bounded retry of the identical normalized request with the same operation intent/key, subject to the backend contract and current-state revalidation |
| `UNKNOWN` | Show a bounded uncertainty state and permit explicit status re-check; do not silently resubmit |
| `IDEMPOTENCY_CONFLICT` | Do not overwrite or replay; revalidate and show bounded conflict/recovery behavior |

The lookup does not establish client-side authority. The server remains authoritative for commit state, safe key reuse, current workflow state, and every authorization decision.

## 6. Shared shell and presentation hierarchy

### 6.1 Protected shell

Protected screens use a consistent hierarchy:

1. WinWin product identity;
2. current safe identity/relationship context;
3. My Cases navigation;
4. current Case label when inside a Case;
5. page title and one-sentence purpose;
6. state/continuity alert before ordinary cards;
7. primary content;
8. state-permitted controls.

Do not show a role switch as an authorization control. A demo actor selector, if retained for fictional testing, must be visibly labeled demo-only and must resolve an exact account/Identity/Membership context before screen projections are requested.

### 6.2 Control hierarchy

- One primary intent per state, except `ASSIGNED`, which intentionally offers one positive primary action (**接受處理**) and one truthful secondary response (**目前無法接手**).
- Destructive-looking styling must not imply that cannot-take-over deletes the Action. It ends the current unaccepted responsibility cycle and preserves history.
- Lack of authority removes the control. Disabled controls are for validation or in-flight operations the same user can resolve.
- Every icon has adjacent or accessible text. Color is never the only state cue.

## 7. `SC-01` WinWin session entry

### Purpose and success

Resolve an authenticated account into the current WinWin session/Actor Context without exposing protected Case information. Success replaces this screen with My Cases.

### Required content

- WinWin name/wordmark;
- concise product purpose;
- supported sign-in control supplied by the authorized session adapter;
- privacy-safe help/error region;
- explicit fictional/demo notice when using the demo adapter.

### States

| State | Content | Controls |
|---|---|---|
| Initial | Sign-in explanation | Sign in |
| Checking session | “正在確認登入狀態” | All sign-in submissions disabled |
| Authentication failed | “目前無法登入，請確認資料後再試一次。” | Retry/edit safe account input |
| Offline/temporary | “連線暫時不穩定，請稍後再試。” | Retry |
| Session expired | “登入狀態已失效，請重新登入。” | Sign in again |

No role selection, Case count, protected name, invitation, registration, or professional-verification workflow belongs to this screen contract.

## 8. `SC-02` My Cases

### Purpose and hierarchy

Answer “我現在可以查看哪些個案，以及哪些事項正在等我回應或處理？”

Order:

1. page title **我的個案**;
2. identity-scoped **指派給我** section;
3. authorized Case cards;
4. empty/partial/error information.

### Case card contract

| Field | Required behavior |
|---|---|
| Case display label | Safe authorized label only |
| Relationship context | Minimum understandable label; presentation only |
| Service validity context | Show only when needed to understand current access |
| New-change badge | `新變化 N`, computed from current visible projection |
| Responsibility summary | Visible assigned/in-progress/gap count or concise state; no hidden totals |
| Latest visible activity | Safe summary/time or “目前沒有可見活動” |
| CTA | **開啟個案** |

### Assigned-to-me item

Shows Case label, Action title, state label, due claim when present, and one safe navigation CTA. It does not execute Accept/Decline from the list; those responses require Action context.

### States

- Loading: skeletons with no fabricated counts.
- Empty: **目前沒有可存取的個案**; no invitation/Create Case CTA.
- No assigned items: **目前沒有指派給你的處理事項**.
- Partial: show only safely authorized results; suppress unread/responsibility totals that are incomplete and announce **部分資訊暫時無法載入**.
- Search, if retained: filters only the returned authorized set and never probes server-side hidden names.
- Access loss during display: remove the affected Case/item immediately from the next projection.

## 9. `SC-03` Case Home

### Purpose and hierarchy

Answer “上次查看後有什麼新變化？目前有沒有人確定接手重要事項？”

Order:

1. Case label and minimum relationship context;
2. continuity-gap alert, when present;
3. **上次查看後** summary;
4. latest visible Care Update/activity;
5. assigned-to-me / in-progress summaries;
6. navigation to Timeline and relevant existing Action Detail states;
7. **新增照顧變化** only when allowed.

### Since-last-view summary

- `N > 0`: **上次查看後有 N 筆新變化** plus latest visible summary.
- `N = 0`: **上次查看後沒有新的可見變化**.
- Partial response: do not show a definitive count.
- The Case Home summary does not advance the cursor.

### Continuity-gap alert

User-facing title: **目前沒有人確定接手**

Supporting text: **這項處理事項需要重新安排。系統不會自動指定其他人。**

CTA: **查看處理事項** only. It opens the relevant existing Action Detail in its continuity-gap state; it does not open or create a repair screen, reassignment screen, or replacement picker.

Never show **已重新指派**, a replacement picker, or a manager/recommendation CTA.

## 10. `SC-04` Timeline

### Purpose

Present permission-filtered Product Activity, not raw Security Audit.

### Item contract

Each visible item contains:

- understandable event label/summary;
- safe actor display and relationship context when permitted;
- server-recorded display time;
- typed target link;
- source label where relevant; and
- no sequence number, hidden count, Grant proof, or audit payload.

MVP activity includes Care Update publication; Action creation/assignment; cannot-take-over; continuity gap; acceptance; start; and completion. Created+assigned may group visually, but both facts remain in the projection.

### Since-last-view divider and cursor

- Divider label: **上次查看後**.
- It appears at the boundary returned for the current Identity+Membership+Case projection.
- Merely loading/requesting does not advance the cursor.
- Advance only after the full successful visible response and divider state render.
- An empty result may advance only after the response supplies a valid server-issued boundary and the authorized empty state renders successfully, with no fatal, partial, no-access, or network uncertainty. An empty result is not the same as an absent boundary, and a zero count alone never permits advancement.
- Do not advance on partial, fatal rendering, no-access, or network failure.
- Do not advance while loading, when the boundary is absent, or from a client-generated timestamp.
- Multiple-device advancement uses the returned maximum; equal/lower updates are silent success/no-op.
- If content renders but cursor advancement fails, keep the already authorized rendered content visible and announce that the viewed position was not saved. Do not claim **已更新上次查看位置** or any semantic equivalent.
- Offer a bounded cursor-save retry using the same returned server boundary or a later valid server-issued boundary. Never invent a client timestamp. A later reload may legitimately show some already rendered items as new again.

### Empty/error states

- Empty: **目前沒有可見的個案活動**; this does not imply no hidden data or stable health. The empty state may save only a valid boundary returned with that successful authorized response.
- Partial: announce partial data; no cursor advance.
- Offline: **目前離線，尚未同步最新活動**; default contract does not require persistent sensitive caching.

## 11. `SC-05` Care Update merged detail

### Required information order

1. category;
2. concise change content;
3. source;
4. occurred date/time precision as a user claim;
5. exact safe author attribution;
6. server publication time;
7. visibility summary in plain language;
8. current-version/read-only notice;
9. linked Action state or **目前未建立處理事項**;
10. **建立處理事項** only when separately allowed.

### Integrity copy

Published content is read-only. Use:

> 這筆照顧變化已發布，不會直接覆寫。未來若需更正，會保留原內容並建立新版本。

Do not expose correction controls in this slice. Do not label no linked Action as resolved, acknowledged, stable, or completed.

If shown inside Action detail, present the minimum source context without duplicating the full Care Update payload into Action history.

## 12. `SC-06` Create Care Update

### Field contract

| Field | Required | Input behavior |
|---|---:|---|
| Category | Yes | Server/application-provided small vocabulary; first slice excludes Question |
| What changed | Yes | Bounded plain text; prompt against diagnosis claims |
| Source | Yes | Human-readable provenance; not a full contact record |
| Occurred date | Yes | User claim |
| Time precision | Yes | Exact / approximate / unknown |
| Occurred time | Conditional | Required for exact; optional/hidden as appropriate for approximate/unknown |
| Visibility | Yes | No preselected option; show only allowed choices |
| Additional context | No | Bounded coordination context |

No attachment, medical chart, medication-history template, GPS, family narrative, psychological profile, or identity document field.

### Visibility copy

| Policy | User label | Explanation |
|---|---|---|
| `AUTHOR_ONLY` | 只有我目前可查看 | 仍需保有目前有效的個案存取權 |
| `DIRECT_PARTICIPANTS` | 只限這筆內容指定的協作者 | 依具體協作者身分，不依角色名稱 |
| `CASE_SHARED` | 此個案中目前有權查看共享內容的協作者 | 不包含曾經參與但目前已失去存取權的人 |

### Submission contract

- Primary CTA: **發布照顧變化**.
- Secondary: **取消**.
- Before submit, show: **發布後不會直接覆寫；若需更正，會保留原內容並建立新版本。**
- Pending prevents duplicate taps but still uses idempotency.
- Failure keeps the local draft and states **照顧變化尚未建立**.
- Success renders author/publication result and two choices: **目前不建立處理事項** or **建立處理事項**.
- Publish never creates an Action implicitly.

## 13. `SC-07` Create Action merged follow-up

### Entry conditions

- exact source Care Update version is currently visible;
- create/assign operation is currently allowed;
- source identity is fixed for this user intent.

### Field contract

| Field | Required | Rule |
|---|---:|---|
| Source Care Update | System-fixed | Read-only safe summary and exact source version reference |
| Action title | Yes | Short and actionable |
| Reason/context | Yes | Bounded explanation of what needs handling |
| Assignee | Yes | Exact eligible Identity+Membership; no default |
| Due date/time | No | User claim; no recurring schedule |

Assignee option order must not imply a recommended/default person. Show safe name first and minimum relationship/service-validity context second. No free-text assignee or role-only value is accepted.

### Submission and outcomes

- Primary CTA: **建立並指派**.
- Empty candidate set: **目前沒有可指派的協作者**; submit unavailable.
- Target stale/ineligible: **這位協作者目前無法被指派，請重新選擇。**
- Success atomically returns Action plus one `ASSIGNED` cycle and opens Action detail labeled **尚待接手**.
- Uncertain result: **尚未確認是否建立**; status lookup precedes same-key retry.
- No visible partial Action/unassigned success exists.

## 14. `SC-08` Action Detail

### Information hierarchy

1. Action title and current user-facing state;
2. continuity-gap alert when present;
3. **目前負責人** or **目前沒有人確定接手**;
4. source Care Update summary/link;
5. reason/context and optional due time;
6. assigner and server assignment time;
7. state-specific controls;
8. **負責與處理紀錄** stepper/history;
9. handling result after completion.

Do not use “Responsibility Cycle ID”, Grant, enum, or `NEEDS_REASSIGNMENT` in ordinary user copy.

### 14.1 State/control matrix

| Internal projection | User label | Exact current assignee controls | Other authorized viewer | Next successful projection |
|---|---|---|---|---|
| `ASSIGNED` + effective cycle | 尚待接手 | Primary **接受處理**; secondary **目前無法接手** | 等待 [name] 回應是否接手 | `ACCEPTED` or continuity gap |
| `ACCEPTED` | 已接受 | **開始處理** | [name] 已接受 | `IN_PROGRESS` |
| `IN_PROGRESS` | 處理中 | **標示處理完成** | [name] 處理中 | `COMPLETED` |
| `COMPLETED` | 已完成 | None | Completion time/result | Terminal history |
| unfinished + no effective cycle | 需要重新安排 | None | 目前沒有人確定接手 | Gap remains until out-of-slice repair |

Same-role users, assigners, managers, supervisors, prior assignees, and visible viewers receive no substitute transition control unless the application projection independently authorizes their exact operation.

### 14.2 Accept

- Button: **接受處理**.
- Pending: **正在接受…**; both `ASSIGNED` responses disabled.
- Success: announce **已接受處理** and show Start.
- It does not start or complete work.

### 14.3 Cannot Take Over

Secondary action: **目前無法接手**.

Confirmation contract:

- Title: **目前無法接手這項處理事項？**
- Body: **送出後，這項處理事項會顯示目前沒有人確定接手，需要由有權限的人另外安排。系統不會自動指定其他人。**
- Safe cancel: **返回**.
- Confirm: **確認目前無法接手**.

Pending disables both `ASSIGNED` responses. Success must:

- remove the person from **目前負責人**;
- show **目前沒有人確定接手** and **需要重新安排**;
- preserve the declined assignment in **負責與處理紀錄**;
- append understandable Product Activity;
- show no reassignment/replacement CTA; and
- never state or imply **已重新指派**.

### 14.4 Start

- Button: **開始處理**.
- Success label: **處理中**.
- It does not complete work or resolve the source issue.

### 14.5 Complete and handling result

- Button: **標示處理完成**.
- Dialog/section title: **完成這項處理事項**.
- Field label candidate: **這次做了什麼？**
- Help: **請記錄這項處理的結果；這不代表整體照顧問題已解決。**
- Confirm: **確認完成**.

For the first fictional-data prototype, the screen contract uses required 1–300 character validation so the interaction is deterministic. This is a **PROVISIONAL PROTOTYPE CONSTRAINT — NOT A VALIDATED LONG-TERM-CARE REQUIREMENT**. Whether the field should be mandatory, its limit, label, examples, and user burden are an **UNVALIDATED PRODUCT ASSUMPTION** and **REQUIRES USER RESEARCH**. The UI must not present the number as policy or professional guidance.

Success shows server completion time and the short handling result. It does not resolve the originating Care Update, Question, or broader care issue.

### 14.6 Responsibility history

Section label: **負責與處理紀錄**.

Milestones use understandable labels:

- 已指派;
- 已接受;
- 開始處理;
- 已完成;
- 目前無法接手, when applicable;
- 需要重新安排, as the current continuity condition.

Each historical milestone shows safe person attribution and server time when authorized. Ended cycles remain history but are never projected as current responsibility.

## 15. `SC-09` protected resource unavailable

### Copy and behavior

Case-level title: **目前無法存取此個案**

Record-level title: **目前無法查看這項內容**

Body: **這項內容目前無法提供。你可以返回我的個案查看仍可存取的內容。**

CTA: **返回我的個案**

This surface deliberately does not distinguish nonexistent, invisible, revoked, expired, suspended, ended Membership, or other authorization causes. It exposes no revoker, former assignee, Grant, hidden count, or Case details not present in the safe response.

On live access loss, remove protected cached content and state-derived controls before rendering this surface. Do not preserve a protected body behind an overlay.

## 16. Shared state and recovery matrix

| State | Content rule | Control rule | Recovery |
|---|---|---|---|
| Loading | Stable title/context; skeletons without fake data | Mutations unavailable | Await one request |
| Empty | Explain what is absent in the visible projection | Show create only if allowed | No hidden-data inference |
| Partial | Render only safely complete items; label partial | Suppress controls/counts dependent on missing facts | Retry projection |
| Validation error | Field-level Traditional Chinese guidance | Submit unavailable until locally valid | User correction |
| Temporary failure before confirmed commit | Preserve safe draft | Prevent duplicate submit during lookup | Status lookup; same-key bounded retry |
| Timeline rendered; cursor save failed | Keep authorized rendered content; state that the viewed position was not saved | Do not claim cursor success | Bounded retry with the same or later valid server-issued boundary |
| Stale state | Remove stale workflow CTA and announce update | No silent replay | Refetch; explicit renewed intent |
| Offline | Clearly stale/no-sync state | No mutations | Retry after connectivity; full offline sync deferred |
| No access | No protected payload | Only safe navigation | Return to My Cases |
| Access revoked while open | Clear protected state | Stop authority-assuming retries | Replace route with no-access/safe parent |
| Continuity gap | Show no current holder and preserved authorized history | No repair/replacement control | Remains visible until separately authorized repair exists |

## 17. Traditional Chinese copy contract

### Required terms

| Concept | User-facing wording |
|---|---|
| Assigned, not accepted | 尚待接手 |
| Accept | 接受處理 |
| Cannot take over | 目前無法接手 |
| Accepted | 已接受 |
| Start | 開始處理 |
| In progress | 處理中 |
| Complete | 標示處理完成 / 已完成 |
| No current holder | 目前沒有人確定接手 |
| Gap needs repair | 需要重新安排 |
| Responsibility history | 負責與處理紀錄 |
| New activity boundary | 上次查看後 |
| Care Update | 照顧變化 |
| Action | 處理事項 |

### Prohibited or restricted ordinary-user wording

- Do not show: Grant Path, capability, RLS, enum, Responsibility Cycle ID, `NEEDS_REASSIGNMENT`, SQL, policy failure, or proof ID.
- Do not say **已重新指派** after cannot-take-over.
- Do not say **問題已解決** because an Action completed.
- Do not call a Care Update a diagnosis, formal medical record, or professional verification.
- Do not use “family can…” or “professional can…” as permission explanations.

## 18. Mobile and accessibility contract

### Mobile

- Primary content is single-column at narrow widths.
- State/continuity alert appears before supporting metadata.
- The `ASSIGNED` response pair stacks with **接受處理** first and **目前無法接手** second; both remain fully labeled.
- Long history uses progressive disclosure without hiding the current holder or gap.
- Modal/confirmation content fits without horizontal scrolling and returns focus to the invoking control on cancel.
- No essential action depends on hover, drag, swipe, or anchor precision.

### Accessibility

- Every screen has one clear `h1`; merged subviews use ordered headings.
- Every keyboard-focusable interactive element has a visible focus indicator that does not rely only on a subtle color change.
- Every form field/control has an accessible programmatic label; placeholder text alone is not a label.
- Validation errors and help text are programmatically associated with their relevant controls.
- Loading, busy, and mutation-success states use appropriate assistive-technology status semantics and are not communicated only visually; validation/errors use programmatically linked alerts.
- In-flight controls expose busy state where relevant. Disabled controls use the semantically correct disabled state and do not rely only on styling.
- Focus moves to the first error summary/field after invalid submit.
- On successful Action transition, focus moves to the updated state heading/status region.
- On stale/no-access replacement, focus moves to the new page heading.
- Dialogs trap focus, have accessible names/descriptions, support Escape for safe cancel, and restore focus.
- Status is expressed through text plus optional icon, never color alone.
- Text, essential control boundaries, status indicators, and focus indicators must meet the project's selected accessibility contrast target. If no numeric target has been frozen elsewhere, implementation acceptance must select and validate a WCAG contrast target before production adoption without claiming legal or standards compliance from this contract alone.
- If motion or animated transitions are introduced, they must respect the user's reduced-motion preference, and essential state-change information must remain available without motion.
- Touch targets and keyboard focus order follow platform accessibility expectations.
- Server times use localized visible text and machine-readable datetime values.

## 19. Frontend application seam

The future frontend should depend on a focused interface equivalent to:

| Screen need | Logical operation |
|---|---|
| Resolve session | `resolveSession` |
| My Cases | `getMyCases` |
| Case Home | `getCaseHome` |
| Timeline | `getCaseTimeline` |
| Cursor | `advanceReadCursor` |
| Care Update detail | `getCareUpdate` or embedded authorized projection |
| Publish Care Update | `createCareUpdate` |
| Eligible assignees | `getEligibleAssignees` |
| Create/assign Action | `createAction` |
| Action detail | `getActionDetail` |
| Accept | `acceptAction` |
| Cannot take over | `declineAction` |
| Start | `startAction` |
| Complete | `completeAction` |
| Mutation outcome after uncertain response | `lookupOperationStatus(operationKey)` or an equivalent application-level operation |

These names are frontend/application contract labels, not approved API, RPC, or database identifiers. Components must not import Supabase or write authoritative fields directly. Demo and future backend adapters must return the same screen semantics and safe public errors.

## 20. Screen acceptance matrix

### 20.1 Required component/screen evidence

| Scenario | Required visible evidence |
|---|---|
| A enters WinWin | My Cases contains only A-authorized Cases |
| A sees new activity | Case Home shows authorized count; Timeline divider uses returned boundary |
| Timeline render fails | Cursor is not advanced |
| A publishes Care Update | Immutable publication result with author/server time; no Action created automatically |
| A opens Action step | Source fixed; assignee empty by default |
| No assignees | Submit unavailable; no free-text bypass |
| A assigns B | Action detail says 尚待接手; does not say accepted |
| B is exact assignee | B sees 接受處理 and 目前無法接手 |
| Same-role C views/attempts | No B workflow controls; role does not substitute |
| B accepts | State becomes 已接受; Start appears; no completion shortcut |
| B starts | State becomes 處理中; Complete appears |
| B completes | Handling-result validation uses explicitly provisional 1–300 rule; result/time/history appear |
| B cannot take over | Current holder cleared; 目前沒有人確定接手 / 需要重新安排 shown; no replacement control |
| Action completed | Source issue is not labeled resolved |
| Stale Accept/Decline/Start/Complete | CTA removed, latest state refetched, intent not replayed silently |
| Revoked actor | Protected content removed; generic unavailable surface; no Grant/revoker detail |
| Prior assignee | History may remain for current authorized viewers; prior actor gains no visibility from history |

### 20.2 Required uncertain-result evidence

For each scenario below, the response becomes uncertain after submission. The frontend must keep the existing operation intent/key, call operation-status lookup, revalidate authoritative state, and apply the `COMMITTED`, `DEFINITELY_NOT_COMMITTED`, `UNKNOWN`, or `IDEMPOTENCY_CONFLICT` behavior from Section 5.4.

| Mutation family | Required evidence |
|---|---|
| Create Care Update | A committed publication is shown once; an unknown outcome is not blindly republished; a definitely-not-committed identical request may use bounded same-key retry |
| Create Action | A committed Action and its initial cycle are shown once; uncertainty cannot create a duplicate Action or cycle |
| Accept | Current responsibility state is revalidated; a committed acceptance is not replayed and no duplicate transition appears |
| Cannot Take Over / Decline | Current responsibility state is revalidated; a committed ended cycle/gap is shown once and no duplicate decline/gap transition appears |
| Start | Current responsibility state is revalidated; a committed start is not replayed and no duplicate start transition appears |
| Complete | Current responsibility state is revalidated; a committed completion/result is not replayed and no duplicate completion transition appears |

For `UNKNOWN`, every family shows bounded uncertainty and an explicit status re-check without silent resubmission. For `IDEMPOTENCY_CONFLICT`, every family stops replay, revalidates, and exposes bounded recovery without overwriting server state.

### 20.3 Prohibited acceptance outcomes

The screen contract fails if any implementation:

- uses `DemoRole`, family, professional, manager, or same-team label to authorize a screen/control;
- presents assigned as accepted, accepted as started, or started as completed;
- offers only Accept while an exact `ASSIGNED` assignee has the authorized cannot-take-over response;
- treats cannot-take-over as reassigned;
- shows a replacement candidate/control in first slice;
- models continuity gap as an ordinary next Action lifecycle state;
- defaults the assignee or visibility choice;
- marks Timeline read on request/start of load;
- exposes hidden counts, Grant/security details, or raw errors;
- mutates a published Care Update;
- resolves a source issue when an Action completes; or
- presents 1–300 characters as a validated long-term-care requirement.

## 21. Traceability to frozen Product / UX baseline

| Frozen baseline section | Screen-contract coverage |
|---|---|
| Executive decision / first slice | Sections 2–4 |
| Minimum users | Shared projections and `SC-01`–`SC-03` |
| Screen inventory / responsibility matrix | Sections 3 and 7–15 |
| Family vs professional | Sections 5–6 and prohibited outcomes |
| Care Update UX | Sections 11–12 |
| Action / Responsibility Cycle | Section 14 |
| Since Last View | Sections 9–10 |
| Timeline | Section 10 |
| Screen-state matrix | Section 16 |
| Authorization-to-UX | Sections 5 and 19–20 |
| Privacy/minimization | Field and projection rules throughout |
| MVP / Phase 2 / Future | Sections 1, 2, and 22 |
| Open research assumptions | Completion-result evidence label in Section 14.5 |
| Recommended next slice | Section 23 |

## 22. Explicitly deferred screen contracts

Do not create screens, empty routes, placeholder buttons, or disabled future controls for:

- Care Update correction;
- Question ask/answer/resolve;
- relinquish after acceptance;
- reassignment/replacement selection;
- invitation/onboarding/access administration;
- professional verification;
- notifications/escalation;
- delegation/supervisor completion;
- organization/role-template administration;
- advanced service/resource matching;
- clinical signing/records;
- AI recommendations, analytics, GPS, medication reminders, presence, read receipts, or full offline sync.

Continuity-gap display is MVP; continuity-gap repair is not.

## 23. Recommended separately authorized frontend sequence

1. Define screen projection and safe-result types independent of React.
2. Add the WinWin session adapter and My Cases screen contract tests.
3. Implement Case Home and Timeline projection/cursor tests.
4. Implement immutable Care Update create/detail screen behavior.
5. Implement Create Action follow-up with exact candidate selection and no defaults.
6. Implement Action detail state/control matrix.
7. Implement Accept and Cannot Take Over confirmation/outcomes.
8. Implement Start and provisional completion-result interaction.
9. Implement history, continuity-gap, stale, offline, and no-access states.
10. Verify mobile, keyboard, focus, screen-reader, A→B→A, cannot-take-over, unauthorized C, and revoked-user evidence.

Every implementation batch must remain separately authorized. This contract itself performs and authorizes no frontend, Foundation, Supabase, database, runtime, merge, deployment, or push work.

## 24. Contract gate conclusion

The frozen Product / UX baseline can be represented by the nine screens/merged subviews and shared states in this document without expanding the MVP. The contract keeps Action lifecycle separate from responsibility continuity, adds the truthful cannot-take-over branch, preserves fail-closed authorization and history, and labels the completion-result constraint as provisional and unvalidated.

**READY FOR FRONTEND SCREEN CONTRACT REVIEW; NOT AUTHORIZED FOR REACT IMPLEMENTATION.**
