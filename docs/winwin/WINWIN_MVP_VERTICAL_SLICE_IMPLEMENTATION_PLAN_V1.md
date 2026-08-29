# WinWin MVP Vertical Slice Implementation Plan V1

Status: **Application implementation plan — no implementation authorization**

Date: 2026-08-29

Primary slice: **Login → Case → Care Update → Action → exact Identity assignment → Accept → Start → Complete → responsibility/activity/read-cursor projection**

## A. Preflight

Planning baseline:

- repository root: the repository containing this artifact;
- branch: `codex/foundation-spike-design-correction`;
- HEAD: `5a683c2e3a90c7e84b58f04ce032efeb8c1fe25a` (`docs: design winwin backend authorization model`);
- initial staged changes: none;
- initial untracked files: none;
- initial unstaged change: only `docs/winwin/WINWIN_PRODUCT_BACKEND_RECORD_AUTHORIZATION_DESIGN_V1.md`;
- the existing Batch 2 design modification is expected drift named by the work order. This planning work must not modify, restore, stage or commit it;
- no other unknown drift was present, so planning may proceed in isolation.

Recent commits at preflight were `5a683c2`, `fd55371`, `33e4ec9`, `8c361eb`, `831d0b4`, `c2d2580`, `0f5c5b6`, and `e4084d8`.

Migration 001–008 SHA-256 fingerprints at entry:

| Migration | SHA-256 |
|---|---|
| `20260823022521_remote_schema.sql` | `64d3cdd9047c7a716dd031a51d1e55cdeef6b2ab7bc4409887e4c864fa493361` |
| `20260823030000_ownership_and_integrity.sql` | `8b165af587111b1e961b55b5ec6836b9a5a3186a758198204c0aa05d8da3a7e6` |
| `20260823040000_auth_identity_lifecycle.sql` | `4618316d35a014ace64457fc6ace15a242032901cacd678af95e3f120e04e70b` |
| `20260823050000_rls_and_access_control.sql` | `7f8234ee1377d9b0a89fce5f07b6163d5da7dd2fbe17facb7a05d22b08f6bf40` |
| `20260823060000_backup_assignment_semantics.sql` | `c5b673b56adeb8a7440b4de5cc828aca7931c4a56e2eb117c33587df293d2209` |
| `20260823070000_task_handoffs.sql` | `fa10edfae8327e942e75238b771f8f2151bc87f14a9f5e44e33f9e7cf26c5f08` |
| `20260824220000_v2_access_foundation.sql` | `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389` |
| `20260825090000_v2_identity_grant_alignment.sql` | `e54ee8d571672243454b60e70cac86a6c909a2f19c05bf498492736072521e8d` |

The modified Batch 2 design file had entry fingerprint `0c3e20bd53e9d499f96d11af6230840143971be992d331e121a52bbcdb361480`. It is a protected worktree baseline, not an artifact of this plan.

During closeout, a separate concurrent task checkpointed that expected Batch 2 work as commit `f5ef29915e844cebb2385f8081fd5d24da1eb723` (`docs: correct winwin batch 2 backend design`). The branch HEAD therefore advanced after this plan's preflight. The checkpoint changed only the already-known protected design file; this planning work neither edited nor staged it. Its committed SHA-256 is `a9f095f2cf64ad9cefeb80e80dae869b287c963d27365cfb3e4bfe50b1a29369`. No other drift appeared. The final Batch 2 decision register and MVP boundary were re-reviewed before this plan was committed.

## B. Current frontend inventory

### Classification

| Area | Current implementation | Classification | Planned treatment |
|---|---|---|---|
| Product routing | `app/src/App.tsx` mounts the v2 Prototype and guarded Case child routes | REUSABLE | Keep route structure; add the smallest missing route only if an Action detail cannot remain a section/anchor |
| Login | legacy `AuthProvider`, `AuthPage`, and `RequireAuth` use Supabase, but explicitly belong to the old product; v2 has no WinWin login boundary | NEEDS ADAPTER | Introduce a WinWin session/demo-login adapter; do not import the legacy product flow into v2 |
| Case list/workspace | `PrototypeCasesPage`, `PrototypeWorkspacePage`, access-aware search and Case cards | REUSABLE | Use workspace as the formal Case List; adapt actor/session and unread fields |
| Case access guard | `PrototypeCaseAccessGuard` gives a non-enumerating denial | REUSABLE | Keep UX; make service/backend authorization authoritative later |
| Case overview | `PrototypeCaseHomePage` summarizes activity, assigned work and Care Circle | REUSABLE | Replace role comparisons with identity-aware selectors and add real unread summary |
| Timeline | `PrototypeTimelinePage`, `TimelineCard`, `caseActivityForCurrentActor` | NEEDS ADAPTER | Keep presentation; replace role visibility and client-time sorting with authorized activity DTOs carrying server sequence |
| Create Care Update | `PrototypeNewUpdatePage` and `addCareUpdate` | NEEDS ADAPTER | Keep form shell; split Action creation into a deliberate second step and remove role-valued assignee |
| Action list/status UI | `PrototypeActionsPage` already expresses accept/start/complete sequencing | NEEDS ADAPTER | Bind CTA to returned authorization decisions for the exact current assignee; add responsibility summary/history |
| Action detail | Action cards and anchors exist; no distinct detail route | REUSABLE | Expand card/section first; create a page only if mobile density or history requires it |
| Assigned-to-me | Case home and workspace count visible actions, but there is no identity-scoped cross-Case queue | MODIFY | Add a focused section/filter in Workspace; avoid a new global page for MVP |
| Responsibility history | `responsibilityHistory` only covers service-expiry/revocation examples | NEEDS REPLACEMENT | Use full immutable cycle fixtures/DTOs including assigned, accepted, started, completed and end facts |
| Activity history | derived from timeline, record versions and action status history | NEEDS ADAPTER | Preserve the projection approach; use typed domain activity events and server order rather than audit rows or display roles |
| Read cursor | hard-coded Case card copy; Case home explicitly says cursor is absent | NEW | Add per Identity+Membership+Case cursor demo fixture and application operation |
| Identity fixtures | `identities` already distinguish accounts and exact identities | REUSABLE | Add display name and stable fixture references as needed; never infer authority from labels |
| Membership/grant fixtures | `memberships`, `roleGrants`, `currentActorGrantPaths` | NEEDS ADAPTER | Formalize Relationship and single-Grant-path fixtures; server/demo session selects actor context, not `activeRole` |
| Care Circle / invitation | substantial access UI exists | DEFER | Keep only the eligible-assignee data needed by this slice; invitation workflow is not a dependency |
| Professional record/correction | separate forms, versions and tests exist | DEFER | Do not pull professional record or correction into the first slice |
| Question flow | prototype links Question and Action | DEFER | First slice creates an Action from a Care Update directly; no ask/answer/resolve dependency |
| Local state | `PrototypeProvider` directly exposes many in-memory mutations | NEEDS ADAPTER | Put the selected slice behind one application service/repository seam; leave unrelated prototype state intact |
| Authorization contract | `domainAuthorizationContract.ts` models exact actor paths, record visibility, cycles and cursor | REUSABLE | Reconcile physical-pointer differences with reviewed Batch 2 design before implementation; reuse pure decisions, not its demo-only storage assumptions |
| Tests | v2 unit tests cover visibility, transitions, immutable linkage, revocation examples and cursor contract | REUSABLE | Add component and slice integration coverage; retain existing regression suite |

### Important current semantic debt

`DemoRole` currently acts as more than presentation:

- participant: `TimelineEntry.participantRoles`, activity `participantRoles`, and `rolesForScope`;
- assignee: `PrototypeAction.assigneeRole`, `NewUpdateInput.assigneeRole`, and assignee option selectors;
- visibility subject: `canRoleViewEntry`, `currentActorCanViewScope`, team/participant comparisons, and activity filtering;
- authorization subject: `activeRole`, `currentActorGrantPaths` role filtering, `transitionAction`, `resolveQuestion`, and CTA checks;
- activity actor: `PrototypeActionStatusHistory.actorRole` and projected labels.

This is acceptable only as old presentation scaffolding. The selected slice must not call those role-based decisions as formal authority. Existing role-based helpers become compatibility-only and are deleted or deprecated only after the migrated slice has parity tests.

## C. First vertical slice

The only primary target is:

```text
WinWin login/session
  → authorized Case List
  → Case Overview and recent Care Updates
  → publish one Care Update
  → create one Action from that update
  → assign one exact eligible Identity+Membership
  → assignee sees the Action
  → ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED
  → immutable Responsibility Cycle and audit truth retained
  → authorized Case activity projection updated
  → actor-specific Case read cursor advances from a server boundary
```

It validates multi-person care information, explicit responsibility, handoff and information continuity. Question, delegation, reassignment, supervisor override, notifications, organization hierarchy, correction, clinical records and analytics are not dependencies.

## D. User story

Actor A is **林怡君（長者家屬、照顧資訊提供者與 Action 建立者）**. Actor B is **王明哲（該 Case 中具有有效日照服務關係的照顧協作者）**. Names are fictional fixture display names; authority is bound to their distinct Identity and Membership IDs.

A logs in to WinWin and opens the Case for 林奶奶 from the Cases visible to A. A reviews recent authorized Care Updates, records a new observation with its source and occurred time, and publishes it. After publication A chooses “建立處理事項”, describes what must be done and why, and selects the concrete eligible person 王明哲; “日照服務人員” appears only as a secondary relationship label. WinWin shows that the Action is assigned but not yet accepted.

B logs in under B's own account and Identity, opens “指派給我的處理事項”, sees the Case, originating Care Update, reason, assigner, due time, current responsibility state and the one next permitted action. B accepts, starts, and completes the Action in order. A later reopens the Case and sees that B accepted, started and completed it, including server-recorded times and the preserved responsibility trail. Neither a same-role person nor an Identity without current Case access can see or operate the Action.

### User-visible success

A can see the Care Update author and publication time; Action creator; exact assignee name and relationship label; whether and when it was assigned, accepted, started and completed; current status; and a concise responsibility history. B can see which Case and Action require attention, the source Care Update, reason and due time, who assigned it, whether B currently has authority, and exactly one valid next CTA. Authorization failure is represented without exposing hidden records or raw security details.

## E. Screens

| Screen/capability | Decision | Existing surface | MVP change |
|---|---|---|---|
| 1. Login | MODIFY | legacy `/auth` cannot be reused as WinWin product login | Add WinWin-specific session entry using demo identities in Phase A and the same session interface future auth will implement |
| 2. Case List | MODIFY | `/v2/prototype/workspace` | Make it the post-login landing surface; show authorized Cases and new-activity summary only |
| 3. Case Overview | MODIFY | `/v2/prototype/cases/:caseId` | Add new-activity boundary, latest Care Update and responsibility outcome |
| 4. Care Update timeline | MODIFY | `.../timeline` | Use server-sequenced application DTOs; add “上次查看後” divider |
| 5. Create Care Update | MODIFY | `.../updates/new` | Publish update only; return the new update and offer “建立處理事項” |
| 6. Create Action | NEW section/step | currently embedded in Care Update form | Prefer an inline follow-up step/modal or `actions/new?source=...`; do not add a page until routing/mobile review proves necessary |
| 7. Action Detail | MODIFY existing card | `.../actions#action-*` | Add source, exact assignee, allowed operation, timestamps and responsibility history; retain anchor-based detail for MVP |
| 8. Assigned to me | MODIFY existing workspace | workspace counts and Case cards | Add identity-scoped “指派給我” list/filter; no new global route required |
| 9. Responsibility/activity history | MODIFY existing Action/timeline surfaces | partial activity/history | Show concise user activity in Timeline and complete responsibility facts in Action detail |

No invitation, Question, professional-record, correction or organization screen enters the dependency graph.

## F. UI → Domain mapping

| UI concept | Current implementation | Formal domain concept | Adapter needed? | Future persistence |
|---|---|---|---|---|
| User/account | `currentAccountId`; legacy Supabase session elsewhere | authenticated account session | Yes | Foundation account-to-actor link/session authority |
| Actor | `activeRole` plus first matching grant path | server-derived Runtime Actor Context | Yes, mandatory | request-scoped account link + selected Logical Identity, Membership, Relationship and Grant proof |
| Identity | `PrototypeIdentity` | stable Logical Identity authorization subject | Small | Foundation actor reference may physically back Identity |
| Case member | `MockCaseMembership` plus separate display member | Membership lifecycle instance + Relationship | Yes | normalized Membership and Relationship authority |
| Care Update | `TimelineEntry` | source envelope + immutable published content version | Yes | future typed Care Update source/content persistence |
| Action | `PrototypeAction` | independent Action linked to optional Care Update source | Yes | typed Action with derived current responsibility meaning |
| Assignee | `assigneeRole` + display `assigneeName` | exact Identity+Membership reference | Replace | Responsibility Cycle assignee foreign keys |
| Action status | `PENDING_ACCEPTANCE` etc. mutable on Action | derived `ASSIGNED`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED` from effective cycle | Yes | append-only/controlled cycle transitions; rebuildable projection only |
| Responsibility Cycle | partial `responsibilityHistory` | immutable lifecycle instance containing assignee, assigner and timestamps | Replace | one effective non-ended cycle per Action, ended cycles retained |
| Audit Event | `actionStatusHistory`/success messages approximate it | append-only security/domain mutation evidence | Replace | server-written audit envelope atomic with mutations |
| Case activity | client-derived merge sorted by ISO timestamp | authorized user-facing projection of domain events | Yes | server-issued monotonic Case activity sequence |
| Read Cursor | hard-coded “3 筆新變化”; otherwise absent | Identity+Membership lifecycle+Case cursor | New | monotonic server-boundary cursor, no per-record receipt |
| Role/relationship | `DemoRole` drives behavior | secondary display label/classification only | Yes | relationship/grant descriptive fields, never authority alone |

## G. Demo Identity adapter

Phase A must preserve a runnable prototype with this fixture chain:

```text
Demo login account fixture
  → selected Demo Identity fixture
  → exact Case Membership fixture
  → exact Relationship fixture
  → one complete Grant fixture
  → ActorContext fixture
  → formal authorization/application contract
```

Recommended minimum types are `DemoAccountFixture`, `DemoIdentityFixture`, `DemoMembershipFixture`, `DemoRelationshipFixture`, `DemoGrantFixture`, and `DemoSession`. Each person has a unique opaque Identity ID and display name. Each assignment stores the Identity+Membership reference. `DemoRole` is derived as a presentation label from identity/relationship fixture data and may support the visible demo switcher, but it cannot be accepted by `canView`, `canPerform`, action mutation, participant selection or repository methods.

The demo adapter must:

- resolve the current Actor Context from a logged-in fixture account and selected Identity;
- validate one complete, active grant path without stitching grants;
- return only eligible concrete assignees already visible to the actor for this purpose;
- execute the same state prerequisites and error vocabulary planned for the future backend;
- issue deterministic server-like timestamps, operation IDs and monotonic activity sequences inside the adapter;
- keep Fixture IDs opaque and fictional;
- offer separate A, B and unauthorized C sessions for tests.

## H. Care Update flow

### Sequence

```text
Create Care Update form
  → client usability validation
  → application service resolves authenticated Actor Context
  → repository/adapter validates active Case path and one complete Grant
  → publish immutable version 1
  → assign server-recorded time and operation result
  → append audit truth and Case activity sequence atomically
  → return authorized timeline projection + cursor boundary
```

Client validation improves usability but never grants permission. The client sends an occurred-at claim and content; it does not send authoritative author Identity, Membership, Grant, published time, activity sequence, audit event or lifecycle state.

### Fields

| Category | Fields |
|---|---|
| Required user input | type/category from reviewed MVP vocabulary; concise content; source description; occurred date/time; sharing choice from the actor's allowed options |
| Optional user input | bounded follow-up/context note; occurred time may be “不確定” only if Product approves that representation |
| User-visible result | author display name plus relationship label; occurred time; server publication time; content; source; visibility summary; link to create Action |
| System generated | Care Update/source ID; content version ID/number; exact author Identity/Membership/account-link and authorizing Grant proof; server recorded/published time; idempotency/correlation; audit reference; Case activity sequence |

Data minimization: collect only the care change necessary for coordination. Do not add diagnosis, full medical chart, identity document, GPS, psychological profile, raw authorization evidence or copied audit payload. Published content is immutable; correction is second stage and unavailable in this slice.

Failure never creates a partial published update. A successful retry with the same operation key returns the same result rather than duplicating content.

## I. Action creation

Care Update publication and Action creation are two explicit application operations and UI steps:

```text
published Care Update
  → choose “建立處理事項”
  → enter title/reason and optional due time
  → list eligible concrete Identity+Membership candidates
  → choose one named person
  → validate source visibility, creator authority and target eligibility
  → create Action
  → create its first ASSIGNED Responsibility Cycle
  → append assignment/audit/activity facts atomically
```

Required input: source Care Update ID, short actionable title, reason/context, exact assignee selection. Optional input: due date/time and bounded instructions. System facts: Action ID, creator Actor Context, exact assignee Identity+Membership, assigned-by reference, `ASSIGNED` cycle ID/time, authorization proof, idempotency key, audit and activity sequence.

The assignee picker shows “王明哲” as the primary label and “日照服務人員｜服務至 2026-11-01” as secondary context. It must never submit or store only `NURSE`, `DAY_CARE`, “護理師” or “家屬”. An empty eligible list is not bypassable by free text.

## J. Action transitions

| Domain state | User label | CTA for exact current assignee | Actor/prerequisite | Other authorized viewer | Unauthorized/stale result | Audit/activity |
|---|---|---|---|---|---|---|
| `ASSIGNED` | 等待接受 | 接受任務 | exact assignee; current active path; accept capability | show “等待王明哲接受”; no enabled CTA | hide operation; if stale, refresh and explain assignment changed | `ACTION_ACCEPTED`; “王明哲已接受” |
| `ACCEPTED` | 已接受 | 開始處理 | exact assignee; same current cycle; start capability | show accepted time; no enabled CTA | refresh; never jump state | `ACTION_STARTED`; “王明哲開始處理” |
| `IN_PROGRESS` | 處理中 | 標示完成 | exact assignee; same current cycle; complete capability | show started time; no enabled CTA | refresh; duplicate completion becomes idempotent/stale success handling | `ACTION_COMPLETED`; “王明哲已完成” |
| `COMPLETED` | 已完成 | none | terminal completed cycle | show completed time and history | no mutation; repeated click resolves to current completed view | no duplicate event |

CTA policy:

- users who may view but are not the exact assignee see status and an explanatory non-action state, not a misleading enabled control;
- a disabled button is used only for a temporary prerequisite the same user can resolve, such as a pending request; lack of authority normally removes the CTA and supplies screen-reader text such as “此步驟由目前負責人操作”;
- submission has a pending state, prevents accidental duplicate taps and still relies on server idempotency;
- the service returns machine-readable `FORBIDDEN`, `ACCESS_REVOKED`, `STALE_STATE`, `NOT_CURRENT_ASSIGNEE`, `INVALID_TRANSITION`, `NOT_FOUND_OR_NOT_VISIBLE`, and `TEMPORARY_FAILURE`; UI maps these to safe copy.

## K. Responsibility UX

Do not expose the engineering term “Responsibility Cycle” as the primary heading. Use:

- section: **負責與處理紀錄**;
- current person: **目前負責人**;
- milestones: **已指派、已接受、處理中、已完成**;
- history of ended assignments, when later enabled: **負責人變更紀錄**.

For the first slice, the Action detail shows a compact ordered stepper with person and time at each milestone. Display names are snapshots for readability; links/authority use stable Identity references. Status text and icons accompany color. The original assignment and every transition remain visible after completion.

“責任轉移紀錄” may sound natural but could imply a completed handoff; use “負責人變更紀錄” until reassignment is in scope. **TERMINOLOGY RESEARCH REQUIRED** before claiming any phrase is an official Taiwanese long-term-care term. No such standards claim is made here.

## L. Timeline/activity

### Minimum user-facing projection

- A 發布照顧變化;
- A 建立處理事項;
- A 指派給 B;
- B 已接受;
- B 開始處理;
- B 已完成.

Each item has a stable activity ID, Case sequence, event type, target link, safe display actor, server time and concise summary. The UI may group “Action created + assigned” when adjacent, but must not erase either audit fact.

### Boundary

Audit truth is append-only, security-sensitive, exhaustive mutation evidence containing exact actor/proof/correlation facts. It is not directly listed to ordinary users. User-facing Case activity is a permission-filtered projection with only understandable domain milestones. Hidden activity never leaks through missing sequence numbers, counts, sorting gaps or errors. Ordering is `caseActivitySequence DESC`; timestamps are display metadata, not tie-break authority.

## M. Read Cursor UX

MVP uses one cursor per exact Identity+Membership lifecycle+Case over the visible Case activity stream.

- Case List: show a “新變化 N” badge computed by the authorized application response, not by counting hidden global sequence gaps;
- Case Overview: show the same count and the newest visible summary;
- Timeline: insert a divider labelled **上次查看後** immediately before the first visible item after the stored cursor;
- after the Timeline's visible items are successfully rendered, call `advanceReadCursor` with the server-issued visible boundary;
- “沒有新變化” means no newly visible activity for this actor, not no Case activity globally;
- a new Membership lifecycle starts with a new cursor; no inheritance in MVP;
- do not add per-message read receipts, “who has read”, presence or Messenger-style indicators.

The demo adapter may emulate server sequences. The browser must not invent sequence values or advance on a failed/unauthorized load.

## N. Error/empty states

### Errors and edges

| Condition | User message | Safe next action |
|---|---|---|
| Action was reassigned/otherwise changed | 這項處理事項已更新，請查看最新負責狀態。 | Refresh the Action; discard the stale CTA |
| current permission expired | 你目前無法執行這個操作。 | Return to authorized Case/Workspace; request access through an out-of-slice channel |
| assignee no longer has access | 這位協作者目前無法被指派，請重新選擇。 | Reload eligible assignees; do not create the Action |
| duplicate Complete | 此事項已完成，已顯示最新紀錄。 | Render current completed result; do not append another event |
| stale UI/version | 內容已被更新，請確認最新狀態後再試一次。 | Refresh without silently replaying changed intent |
| Case access revoked | 目前無法存取此個案。 | Return to “我的個案”; do not reveal existence/revocation detail |
| no eligible assignee | 目前沒有可指派的協作者。 | Save nothing; return to Action draft or contact an authorized access coordinator outside this slice |
| Care Update publish failed | 照顧變化尚未建立，請保留內容後再試一次。 | Keep draft locally in component state; retry with same operation key |
| Action succeeded but UI did not refresh | 處理事項已建立，正在重新載入最新狀態。 | Fetch by operation result/key; never create a second Action blindly |
| network/temporary failure | 連線暫時不穩定，尚未確認是否完成。 | Retry status lookup first; preserve entered content |
| record not visible/not found | 目前無法查看這項內容。 | Return to the authorized parent surface; do not distinguish absence from denial |

Raw database, RLS, SQL, stack, grant, token and policy errors never reach UI copy.

### Empty states

| Empty state | Helpful copy/action |
|---|---|
| no Care Updates | 尚未有照顧變化。若你有權新增，可記錄第一筆有來源的變化。 Show “新增照顧變化” only when allowed |
| no Actions in Case | 目前沒有需要處理的事項。 Offer creation only from a published Care Update and only when authorized |
| no assigned Actions | 目前沒有指派給你的處理事項。 Link back to visible Cases |
| no new activity | 上次查看後沒有新的可見變化。 Keep access to older timeline |
| no eligible assignee | 目前沒有可指派的協作者。 Keep Action draft and explain that a named eligible member is required |

## O. Mobile/accessibility

### Mobile implementation issues

- audit all interactive targets in the selected screens to a minimum target around 44×44 CSS px; existing `.v2-demo-role` buttons (`2.5rem`) and `.v2-private-tag-filter` buttons (`2.6rem`) are below that approximate target and must be corrected where they enter this flow;
- preserve minimum 16px form control text on mobile to avoid zoom and improve readability;
- stack dense metadata and timeline milestones; do not force a wide table;
- keep the single next Action CTA in a sticky bottom action area with safe-area padding, without covering content;
- use a full-screen sheet/page for Create Action on narrow screens if a modal cannot maintain keyboard/focus behavior;
- status chips wrap and always retain text; timeline cards reduce secondary metadata before core actor/status/time;
- Case navigation may horizontally scroll, but current location and discoverability remain clear;
- submission controls prevent double taps and announce loading.

This is a bounded slice correction, not a redesign of the entire app.

### Core accessibility acceptance

- every route, form, dialog/sheet and CTA is keyboard reachable in logical order;
- visible `:focus-visible` states have adequate contrast;
- use semantic links/buttons; never use a clickable `div`;
- all inputs have programmatic labels, required/optional cues and concise help;
- status uses text plus optional icon, never color only;
- current status and async changes use appropriate `aria-live`/status announcements without repeating the whole page;
- validation summary links/focuses the first invalid field; field errors use `aria-describedby` and `aria-invalid`;
- loading controls expose a readable busy label and prevent duplicate activation;
- Action stepper has an ordered-list/text alternative for screen readers;
- automated component checks plus keyboard-focused tests cover Login, Care Update publish, Action creation and each transition. A full WCAG audit remains outside this slice.

## P. Frontend state boundary

Use one modest seam:

```text
React screens/components
  → VerticalSliceService (application operations + result/error DTOs)
  → WinWinRepository interface
      → DemoWinWinRepository (Phase A)
      → future BackendWinWinRepository (Phase C)
```

The service owns orchestration and maps repository results to UI-safe DTOs. The repository owns retrieval/mutation contracts, not UI state. Components own temporary form, focus and loading state. Authorization helpers may decide presentation from server/demo decision facts but do not become a security boundary.

### Transition phases

- Phase A — formal demo fixtures: introduce exact identities, memberships, relationships, grants, cycles, activity sequences and cursors behind the interface; keep all data in memory.
- Phase B — repository/service abstraction: migrate only selected slice screens away from `PrototypeProvider` mutations; unrelated prototype features remain untouched.
- Phase C — real backend adapter: implement the same application interface after Product Decision Closure, backend/cutover approval, RLS/API design and runtime authorization. UI contains no direct Supabase calls.

Avoid generic event buses, dependency-injection frameworks, global stores or separate use-case classes per button. One service and one focused repository interface are sufficient until complexity proves otherwise.

## Q. Future application operations

Names describe application intent, not REST endpoints, RPCs or database functions:

```ts
resolveSession(): Promise<SessionActorSummary>
listCases(): Promise<CaseListResult>
getCaseOverview(caseId: CaseId): Promise<CaseOverviewResult>
getCaseActivity(caseId: CaseId, cursor?: ActivityCursor): Promise<CaseActivityResult>
listAssignedActions(filter?: AssignedActionFilter): Promise<AssignedActionResult>
getAction(actionId: ActionId): Promise<ActionDetailResult>
listEligibleAssignees(caseId: CaseId, purpose: ActionPurpose): Promise<EligibleAssigneeResult>
createCareUpdate(command: CreateCareUpdateCommand): Promise<CreateCareUpdateResult>
createAction(command: CreateActionCommand): Promise<CreateActionResult>
acceptAction(command: TransitionActionCommand): Promise<ActionDetailResult>
startAction(command: TransitionActionCommand): Promise<ActionDetailResult>
completeAction(command: TransitionActionCommand): Promise<ActionDetailResult>
advanceReadCursor(command: AdvanceReadCursorCommand): Promise<ReadCursorResult>
```

All mutation commands carry an opaque idempotency/operation key and expected version/boundary where relevant, but not client-selected actor, grant, server timestamp or authoritative next state. Results include safe display data, authorization-aware `allowedOperations`, version, and server activity boundary. Error types are closed and UI-safe.

## R. Test plan

### Pure unit

- exact Actor Context resolution from each demo login;
- no Membership-only access and no capability/scope stitching;
- same-role distinct Identity cannot view/operate by substitution;
- eligible assignee returns exact Identity+Membership only;
- Care Update validation and immutable publication result;
- Action creation makes exactly one first `ASSIGNED` cycle;
- `ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED`, no skips;
- exact current assignee only; revoked/stale path denied;
- retry idempotency and operation-key mismatch conflict;
- audit/activity mapping and server sequence order;
- cursor only advances to server boundary and never leaks hidden gaps;
- selectors preserve hidden-data non-enumeration.

### Component

- Login fixture choice resolves A/B/C without role authority;
- Case List and Timeline render only authorized DTOs;
- Care Update fields, validation, loading, error preservation and success link;
- assignee picker primary label is a named Identity, role is secondary;
- each status renders the correct one CTA for B;
- A and unauthorized C never receive an enabled transition CTA;
- stale, revoked, duplicate, partial-refresh and empty states use safe copy;
- responsibility stepper text, timestamps and completed history;
- unread badge/divider/cursor loading;
- keyboard, focus, semantic label, live status and color-independent assertions.

### Future integration

Run with real server/RLS authority after prerequisites:

1. Identity A publishes a Care Update and creates/assigns an Action to B;
2. Identity B reads, accepts, starts and completes;
3. A reloads and sees completion, responsibility history and ordered activity;
4. same-role Identity C cannot discover content or mutate;
5. direct persistence writes and forged actor/role/time/status inputs fail;
6. concurrent accept/complete and retry cases preserve one outcome/audit chain.

### Future E2E

One browser flow switches real authenticated sessions A → B → A and verifies the complete user-visible outcome on mobile and desktop viewports. Add C denial as a separate security E2E. E2E supplements, not replaces, server authorization tests.

## S. Acceptance criteria

- **AC-01:** A can publish one valid Care Update and receive a stable result; failed publication creates no partial record.
- **AC-02:** the published version retains A's exact author Identity/Membership and server publication time; UI shows safe author/time labels.
- **AC-03:** A can create an Action from that Care Update and assign exact eligible Identity B, never a role-only subject.
- **AC-04:** only exact current assignee B with one valid grant path can Accept the `ASSIGNED` cycle.
- **AC-05:** B can Start only after Accept.
- **AC-06:** B can Complete only after Start; retry does not duplicate completion.
- **AC-07:** A, same-role C and any non-assignee cannot perform assignee transitions; UI does not show them an enabled CTA and authority rejects forged requests.
- **AC-08:** A re-enters the Case and sees B's latest completed status and server times.
- **AC-09:** the complete first Responsibility Cycle and its assignment/transition milestones remain available after completion and are not overwritten.
- **AC-10:** user activity follows server-authoritative Case sequence; client time and hidden gaps do not control order/count.
- **AC-11:** the migrated UI/application path does not pass `DemoRole` into formal `canView`/`canPerform`/repository authorization decisions.
- **AC-12:** unauthorized identities cannot see Case, Care Update, Action, assignee, counts, activity gaps or denial details that reveal existence.
- **AC-13:** Timeline shows an “上次查看後” boundary and advances only the exact Identity+Membership+Case cursor to a server-issued boundary.
- **AC-14:** Action UI shows exact assignee, reason, assigner, status, permitted next step and milestone times in understandable language.
- **AC-15:** selected mobile controls meet the approximate 44×44 target, core flows are keyboard operable, and state/error is not color-only.
- **AC-16:** Action completion does not resolve or claim resolution of any Question.
- **AC-17:** only the selected MVP objects/operations enter implementation; no migration, SQL, direct Supabase UI binding or out-of-scope workflow is introduced.

## T. Implementation phases

These are future controlled batches; this plan does not execute them.

| Phase | Likely files/areas | Dependencies | Tests | Stop condition |
|---|---|---|---|---|
| 1. Frontend/domain adapter reconciliation | new focused `app/src/v2/application/*`, fixture types/data; narrow changes to `prototype.ts`, provider/selectors | approve slice capability/scope vocabulary used by the selected operations; reconcile Batch 1 pointer contract with Batch 2 derived-cycle model | pure actor/path/identity parity; existing v2 suite | stop if role-based authority remains in any migrated operation or formal contract conflicts with reviewed backend design |
| 2. Care Update vertical path | `PrototypeNewUpdatePage`, Timeline/Case pages, demo repository/service | Phase 1; selected Care Update visibility policy and create capability disposition | unit + component publish/failure/idempotency/activity | stop when A can publish and reload via interface with immutable authorship and no Action coupling |
| 3. Action creation + Identity assignment | new Action-create section/component; Actions page; eligible-assignee repository methods | Phase 2; exact target eligibility rule and `CREATE_ACTION`/`ASSIGN_ACTION` vocabulary disposition | picker, no-eligible, identity-not-role, first-cycle atomicity | stop when Action plus exactly one `ASSIGNED` cycle is returned and visible without role semantics |
| 4. Accept/Start/Complete | Actions page/detail and service operations | Phase 3; exact current-assignee rules are already safe, final capability names still require closure before backend authority | CTA matrix, skips, non-assignee, stale, duplicate and loading | stop when B completes in order and A/C cannot mutate |
| 5. Responsibility/activity projection | Action detail/card, TimelineCard/selectors, demo activity mapper | Phase 4; user-facing activity vocabulary | history preservation, safe grouping, sequence sort, screen-reader text | stop when A can understand the complete responsibility trail without viewing raw audit |
| 6. Read Cursor | Case List/Home/Timeline and cursor repository methods | Phase 5; MVP uses new cursor per Membership; final backend projection contract reviewed | count/divider/advance/no-hidden-gap/failure | stop when A/B independent cursors advance only from server-like boundaries |
| 7. Backend adapter integration | future adapter only; no component Supabase imports | Product Decision Closure; approved backend schema/API/RLS/cutover; Foundation authority; separate implementation/runtime authorization | contract tests, RLS allow/deny, concurrency/idempotency, atomic audit/activity | stop on any client-authoritative fact, direct-write path, grant stitching or RLS parity gap |
| 8. Security/E2E verification | test harness/config and evidence docs | Phase 7 deployed only to authorized non-production environment | A→B→A, C denial, forged requests, mobile/a11y | stop unless all ACs and threat cases pass with protected artifacts unchanged |

Every phase is a separately reviewable diff. Do not mix Foundation, migrations, deployment or unrelated prototype cleanup into these batches.

## U. Product-decision dependencies

### Can proceed before full Product Decision Closure as isolated demo/application work

- screen/component inventory and presentation DTOs;
- exact demo Identity/Membership/Relationship/Grant fixtures;
- service/repository seam;
- Care Update and Action form usability against explicitly provisional, closed fixture vocabulary;
- exact-assignee state machine and CTA presentation;
- responsibility/activity/read-cursor UI using server-like fixtures;
- unit/component tests and accessibility/mobile corrections.

This work cannot claim backend authorization parity or production readiness.

### BLOCKED BY PRODUCT DECISION / backend prerequisites

- backend implementation of any grant/RLS rule: blocked by final capability and scope vocabulary;
- the first slice's selected visibility audience: must explicitly choose reviewed MVP policy; team audiences cannot be inferred from role/relationship labels;
- prior-assignee Action visibility: fail closed; not needed for the first unchanged cycle;
- reassignment authority and UI: blocked and excluded;
- active-work revocation continuity/state: blocked; immediate future access loss, preserved history and no auto-transfer remain the safe boundary;
- published correction: blocked/second stage;
- Question resolution: blocked/deferred;
- Foundation/007–008 cutover, schema/API/RLS and runtime integration: blocked by their own design and authorization gates;
- real backend adapter: blocked until the application contract maps to approved authoritative operations and RLS.

### Explicitly deferred

Delegation, supervisor completion, notification delivery, organization hierarchy, advanced verification, correction, Question workflow, automatic reassignment, offline sync, advanced conflict UI and analytics. For the MVP, only the exact current assignee may accept/start/complete; a supervisor cannot complete for another identity; a replacement Membership gets a fresh cursor.

## V. MVP scope assessment

The slice directly tests all four WinWin core claims:

| Core claim | Slice evidence |
|---|---|
| 多人照顧資訊 | A publishes a sourced Care Update that an authorized B can understand |
| 明確責任 | Action names exact B and separates assignment, acceptance, work and completion |
| 照顧交接 | B receives context from the Care Update and explicitly accepts responsibility |
| 資訊連續性 | A later sees immutable responsibility milestones, ordered Case activity and new-since-last-view state |

Login and Case List are enabling surfaces. Audit, identity-aware authorization, activity sequence and cursor preserve trust/continuity. Question, invitation, correction, hierarchy, notification and analytics do not add proof to this first path and remain outside it.

## W. Artifact

This file is the sole artifact authorized for this planning round:

`docs/winwin/WINWIN_MVP_VERTICAL_SLICE_IMPLEMENTATION_PLAN_V1.md`

It is a PRODUCT/APPLICATION implementation plan. It creates no frontend implementation, backend code, database object, migration, SQL, RLS, RPC, Supabase operation, Docker operation, Foundation change, deployment or production action.

## X. Validation

Required closeout procedure:

1. run `git diff --check` on the worktree;
2. review this artifact against sections A–AA and the fixed A→B→A slice;
3. scan this artifact for machine-specific absolute paths;
4. scan for secrets, tokens, credentials, private keys and accidental sensitive real-person data;
5. recompute Migration 001–008 SHA-256 fingerprints and compare with section A;
6. verify no Foundation file changed;
7. verify any protected Batch 2 change is attributable only to the separately checkpointed commit described in section A and that this plan never staged it;
8. verify Git status contains only this new artifact after that external checkpoint;
9. after precise commit, verify no staged, unstaged or untracked change remains and no unrelated file entered this plan's commit.

Closeout results before precise staging: `git diff --check` passed; all A–AA sections were present; absolute-path and sensitive-information scans returned no finding; Migration 001–008 matched the entry fingerprints; the concurrent commit changed only the known Batch 2 design; no Foundation file changed; and the only remaining worktree item was this untracked artifact.

## Y. Commit

If validation passes, create at most one local commit named:

`docs: plan winwin mvp vertical slice`

Stage only this artifact by exact path. Never use `git add .`. Do not stage the modified Batch 2 design. Do not push.

## Z. Final Git state

Expected final state after the optional local commit, accounting for the isolated concurrent checkpoint described in section A:

- branch remains `codex/foundation-spike-design-correction`;
- this plan's commit is a child of `f5ef29915e844cebb2385f8081fd5d24da1eb723` and contains only this artifact;
- `docs/winwin/WINWIN_PRODUCT_BACKEND_RECORD_AUTHORIZATION_DESIGN_V1.md` is clean and tracked by the separate `f5ef299` checkpoint, never by this plan's commit;
- no staged files, new untracked files or changes to migrations/Foundation;
- no push or deployment.

## AA. Authorization boundary

Frontend visibility and CTA decisions prevent misleading interaction but are not the security boundary. Production authority must derive, validate and lock the exact chain:

```text
authenticated account
  → Runtime Actor Context / Logical Identity
  → active Membership lifecycle instance
  → same-Case Relationship lifecycle instance
  → one complete, current Grant lifecycle instance
  → record visibility or exact current Responsibility Cycle
  → required capability + state prerequisite
  → atomic mutation + audit + Case activity sequence at server time
```

The client cannot choose or prove actor, assignee authority, Grant, server time, activity order or next state. Membership alone is not access. Roles and relationship labels are not authority. Grants are never stitched. Viewing is not operating. Same-role identities are not interchangeable. Assignment is not acceptance. Completion does not resolve a Question. Audit is not the user activity feed. A read cursor is not permission. Denials fail closed without existence leaks.

The existing TypeScript domain contract is reusable design evidence, not runtime enforcement. Before controlled application implementation reaches a real backend, reconcile it with the reviewed backend direction where current responsibility and content heads are derived rather than client-writable authoritative pointers.

## Final classification

**A — MVP VERTICAL SLICE IMPLEMENTATION PLAN PASS — READY FOR CONTROLLED APPLICATION IMPLEMENTATION AFTER PRODUCT DECISION / BACKEND PREREQUISITES**

This classification approves the plan's bounded sequence only. It does not grant implementation, migration, runtime, deployment or production authority.
