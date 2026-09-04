# WinWin MVP First Vertical Slice Frontend Implementation Plan V1

Status: **FINAL — FROZEN — ADOPTED**

Date: 2026-09-04

## 1. Document Control

| Field | Value |
|---|---|
| Document | WinWin MVP First Vertical Slice Frontend Implementation Plan V1 |
| Planning branch | `codex/product-mvp-ux-spec` |
| Planning baseline | `c1330d6be4a195a5e4ee4163d63f74251267b232` |
| Adoption status | `FINAL — FROZEN — ADOPTED` |
| Adopted implementation baseline | WinWin Competition-Ready MVP First Vertical Slice |
| Adopted baseline parent HEAD | `c1330d6be4a195a5e4ee4163d63f74251267b232` |
| Pre-adoption Plan SHA-256 | `dc312bee997e205e3ef46701df6afbdd9df9ca9a26e96771f4f27c3d8512daf4` |
| Frozen Screen Contract | `docs/winwin/WINWIN_MVP_FIRST_VERTICAL_SLICE_FRONTEND_SCREEN_CONTRACT_V1.md` |
| Frozen Screen Contract SHA-256 | `89e5ed73ac192f81bf1aaad4784c181f6b179d7292b079345d5b270b65ba8feb` |
| Frozen Product / UX source | `docs/winwin/WINWIN_MVP_FIRST_VERTICAL_SLICE_PRODUCT_UX_SPEC_V1.md` |
| Frozen Product / UX source SHA-256 | `94ac540686d8d71a482628412b52150c32a4bd05e0b99016eaf6bafa28f68f86` |
| Delivery target | Competition-ready, research-backed, production-oriented MVP; not a classroom-only demo or full commercial product |
| Authority | Adopted implementation baseline only; no frontend, backend, Foundation, database, runtime, deployment, or push authorization |

This adopted document is the implementation baseline for the WinWin Competition-Ready MVP First Vertical Slice. It does not change either frozen source and does not authorize implementation; each implementation checkpoint below requires a separate bounded gate.

## 2. Purpose

This plan defines how to implement the frozen first vertical slice without building presentation first and retrofitting authorization later. The target is a competition-ready, research-backed, production-oriented MVP: bounded enough to deliver, but credible in its authorization, privacy, continuity, reliability, accessibility, and later-backend path. It is not optimized merely as a classroom demo and does not attempt a full commercial product.

Complexity is justified only where it materially improves exact responsibility ownership, continuity-gap truth, authorization/privacy safety, mutation reliability, Read Cursor correctness, access-loss handling, accessibility, traceable history, research observability, or later backend integration. Generic framework elegance, speculative extension points, placeholder adapters, unnecessary route duplication, one-use component extraction, and premature pagination do not justify complexity.

The intended product loop is:

```text
session resolution
  → authorized Case list
  → Case Home
  → Timeline / changes since last view
  → immutable Care Update publication
  → optional separate Create Action step
  → exact eligible assignee
  → Action Detail
       ├─ Accept → Start → Complete
       └─ Currently unable to take over
            → current unaccepted Responsibility Cycle ends
            → derived continuity gap
  → responsibility and Product Activity history
```

The implementation must not automatically reassign responsibility or become a generic task-management product.

The finished fictional-data slice must support a coherent competition demonstration in which a reviewer can follow a Care Update into an exactly assigned Action, see either acceptance/work/completion or a truthful cannot-take-over response, inspect preserved responsibility history, and understand that an unresolved care need currently has no confirmed holder. The UI must communicate this without exposing internal authorization mechanics.

The same observable states and interactions must support later usability research into current-holder comprehension, continuity-gap recognition, cannot-take-over wording, handoff clarity, Case Home salience, and historical-versus-current responsibility. No research-only product feature is added for that purpose.

## 3. Authoritative Inputs

### 3.1 Frozen product authorities

1. `WINWIN_MVP_FIRST_VERTICAL_SLICE_FRONTEND_SCREEN_CONTRACT_V1.md` is the screen, state, copy, accessibility, cursor, and frontend-seam authority.
2. `WINWIN_MVP_FIRST_VERTICAL_SLICE_PRODUCT_UX_SPEC_V1.md` is the product-scope and UX authority when a matter is not further constrained by the Screen Contract.

### 3.2 Compatibility references

The following existing documents were inspected only to avoid contradicting established authorization/backend direction:

| Document | SHA-256 | Use in this plan |
|---|---|---|
| `WINWIN_PRODUCT_AUTHORIZATION_DOMAIN_CONTRACT_V1.md` | `4f1e5c0e625b8fd4bd40e226809c7517d08277969ecc67fcb627defd06806338` | Single complete Grant Path, exact Actor Context, record visibility, responsibility, cursor reference |
| `WINWIN_PRODUCT_BACKEND_RECORD_AUTHORIZATION_DESIGN_V1.md` | `a9f095f2cf64ad9cefeb80e80dae869b287c963d27365cfb3e4bfe50b1a29369` | Trusted projection/server-command boundary, safe errors, idempotency, concurrency reference |
| `WINWIN_PRODUCT_AUTHORIZATION_WORKFLOW_DECISIONS_V1.md` | `b2e4864d81474842535a63cb47208d0b11b4df158463c503fcfa0355409a184c` | Exact-assignee decline and derived-gap compatibility reference |
| `WINWIN_MVP_VERTICAL_SLICE_IMPLEMENTATION_PLAN_V1.md` | `57e641f17e12a72d9ec2cbd1159ff70f28b12531be10ec0fe390ca49d39adf0a` | Existing vertical-slice sequencing and adapter boundary reference |
| `WINWIN_MVP_IMPLEMENTATION_AUTHORIZATION_REVIEW_V1.md` | `ffb02f20318e570695c390fb017230d659327b5abca66b0fc1e8eb17b545d365` | Current cross-layer risk and authority boundary reference |

These references do not override the two frozen product authorities. SQL, RPC, RLS, persistence identifiers, and backend transport are not designed here.

## 4. Frozen Product Constraints

Implementation must preserve all of the following:

- exactly nine product surfaces represented by screens, merged states, or bounded substates;
- Action Detail, not a general Actions List, task inbox, generic queue, or Kanban surface;
- immutable published Care Update version 1 and a separate optional Action-creation intent;
- no preselected visibility or assignee;
- an exact eligible Identity+Membership assignee, never a role-only or free-text assignee;
- Action lifecycle `ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED`;
- Responsibility Cycle as a separate lifecycle object;
- exact current assignee and complete current `ACTION_DECLINE + RECORD` decision for cannot-take-over while `ASSIGNED`;
- decline ends the current unaccepted cycle and derives a continuity gap; `DECLINED` and `NEEDS_REASSIGNMENT` are not later Action statuses;
- no automatic reassignment, manager takeover, fallback assignee, or supervisor completion;
- responsibility/activity history remains visible only to currently authorized viewers;
- server-issued Read Cursor boundaries and monotonic maximum behavior;
- lookup-before-retry for uncertain mutations;
- non-enumerating no-access/revoked-access behavior;
- provisional, unvalidated 1–300-character completion result without clinical, legal, or long-term-care-standard claims;
- the frozen accessibility requirements; and
- the frozen MVP, Phase 2, and Future boundaries.

## 5. Existing Frontend Inventory

### 5.1 Runtime and framework

- React 19, React Router 7, Vite 7, TypeScript strict mode, and Vitest are installed.
- `app/src/App.tsx` owns one route tree containing `/v2/prototype` and lazy-loaded legacy routes.
- `app/src/main.tsx` installs `BrowserRouter` and imports one global `styles.css`.
- No external client-state library is present. State is currently React context plus `useState`.
- Existing tests emphasize pure TypeScript functions and server-rendered React markup through `react-dom/server` and `MemoryRouter`.
- No DOM interaction/accessibility test dependency is currently declared.

### 5.2 Legacy boundary

- Legacy auth imports the Supabase singleton through `AuthProvider`.
- `App.tsx` lazy-loads the legacy route chain so the current WinWin prototype does not initialize Supabase.
- `RootEntryRoute` preserves authentication callback bytes and otherwise redirects to `/v2/prototype`.
- The legacy application is a separate product/history boundary and must not be used as the First Slice authorization or domain implementation.

### 5.3 Current v2 prototype

- `PrototypeProvider` contains one large in-memory aggregate and exposes direct mutation functions.
- `PrototypeShell` provides useful brand, skip-link, focus, responsive, and demo-warning patterns, but exposes role-oriented demo controls and navigation to out-of-scope flows.
- `PrototypeCaseAccessGuard` demonstrates a generic non-enumerating unavailable surface, while correctly stating that it is not a security boundary.
- `domainAuthorizationContract.ts` contains useful exact Actor Context, single-path, immutable-version, Responsibility Cycle, and cursor concepts. Its current branch version does not contain the complete frozen decline model and includes vocabulary beyond this slice.
- `prototypeState.ts` and `types/prototype.ts` contain incompatible first-slice semantics: `PENDING_ACCEPTANCE`, `DECLINED`, and `NEEDS_REASSIGNMENT` appear in one Action status union; reassignment is a transition; demo state carries role/grant internals.
- `PrototypeNewUpdatePage` combines Care Update and Action creation, permits Question, preselects a visibility value, and pre-fills an assignee-related due time. This conflicts with the frozen Screen Contract.
- `PrototypeActionsPage` is a general Action list, lacks cannot-take-over handling, includes Question resolution, and displays declined/reassignment as Action states. It cannot be the new Action Detail implementation.
- `PrototypeCaseHomePage` contains Question, Care Circle, and professional-record entry points and does not implement the frozen cursor behavior.
- `PrototypeWorkspacePage` contains invitations, professional records, private tags, and manager-reassignment presentation outside the First Slice.
- `TimelineCard` has useful structural markup and localized time formatting but exposes prototype roles, Question state, and current prototype vocabulary.
- `styles.css` already contains a scoped v2 visual language, visible focus rules, responsive breakpoints, and reduced-motion handling; it is monolithic and also contains legacy/out-of-scope styles.
- Existing v2 tests provide valuable pure authorization/state fixtures and SSR route patterns, but they test the current prototype rather than the frozen First Slice.

## 6. Reuse / Adapt / Replace Decisions

| Existing artifact | Decision | Reason and boundary |
|---|---|---|
| React, React Router, Vite, strict TypeScript, Vitest | REUSE | Appropriate, installed, and sufficient for the base architecture |
| `App.tsx` route composition | ADAPT | Add one isolated First Slice route tree; preserve legacy and existing prototype routes until separately retired |
| Legacy lazy-load/Supabase isolation pattern | REUSE | Prevents mock frontend work from implying runtime/backend readiness |
| `RootEntryRoute` | ADAPT | Root destination and callback ownership need a later route-entry decision; do not break raw callback preservation |
| `PrototypeShell` | ADAPT | Reuse brand/skip-link/layout ideas, not role selector or out-of-scope navigation |
| `PrototypeCaseAccessGuard` | ADAPT | Replace local access inference with service-projected access state and centralized protected-cache clearing |
| `TimelineCard` | ADAPT | Retarget to minimized `TimelineEntryView`; remove role, Question, and internal-state coupling |
| `domainAuthorizationContract.ts` | REUSE AS REFERENCE | Do not import Grant evaluation into components; backend remains authoritative; frozen decline vocabulary needs a separately adopted contract source before production adapter work |
| `PrototypeProvider` | REPLACE FOR NEW SLICE | Large mutable aggregate and direct commands do not model async projections, uncertainty, or access loss safely |
| `types/prototype.ts` | DO NOT USE FOR NEW VIEW MODELS | Carries role/grant/internal domain state and an incompatible Action status union |
| `prototypeState.ts` mutation/state machine | DO NOT USE FOR FROZEN WORKFLOW | Couples demo authority and incompatible Action/decline/reassignment semantics |
| `caseCollaborationSelectors.ts` | ADAPT AS TEST REFERENCE | Useful minimization and exact-reference examples; new UI must consume trusted projections rather than grant inventories |
| `mockData.ts` | REPLACE FOR NEW SLICE | Create a smaller deterministic fixture containing only frozen surfaces and states |
| `PrototypeWorkspacePage` | REPLACE FOR NEW SLICE | Invitations, manager reassignment, professional records, and private organization exceed scope |
| `PrototypeCaseHomePage` | REPLACE FOR NEW SLICE | Question/Care Circle/professional-record content and missing cursor contract conflict |
| `PrototypeTimelinePage` | ADAPT | Structural list/empty patterns are reusable; add boundary, divider, cursor acknowledgment, and state matrix |
| `PrototypeNewUpdatePage` | REPLACE | Care Update and Action creation must be separate and neither visibility nor assignee may default |
| `PrototypeActionsPage` | REPLACE | New surface is Action Detail, not a list; frozen cannot-take-over/gap semantics are absent |
| Registration, invitation, Circle, Question, professional-record pages/state | DEFER | Explicitly outside the First Slice |
| Existing `.v2-*` CSS values/patterns | ADAPT | Reuse bounded tokens and proven focus/responsive patterns in an isolated `.winwin-*` scope |
| Existing v2 tests | REUSE FOR REGRESSION | Keep passing, but do not treat prototype behavior as authority for new tests |
| Legacy task/handoff/scenario modules | DO NOT USE | Different product model and explicitly out of scope |

No existing file is retired in the first implementation sequence. Retirement of the broad prototype is a separate decision after the new slice is accepted.

## 7. Target Frontend Architecture

```text
React route/screen
  ↓ reads explicit ScreenState<T>
WinWinAppProvider / screen-local hooks
  ↓ calls typed interface only
VerticalSliceService
  ├─ DemoVerticalSliceService       FRONTEND IMPLEMENTABLE NOW
  └─ future production transport    REQUIRES AUTHORITATIVE BACKEND SEAM LATER
       ↓
trusted server/application projection and commands
```

### 7.1 Layer rules

1. **Contracts:** frontend-safe DTOs, screen states, public results, operation-status outcomes, and the service interface. No React and no database rows.
2. **Adapters:** deterministic demo adapter now; production transport adapter later. Both must satisfy the same contract tests.
3. **Application provider:** injects the service, owns resolved session/Actor-context generation, and broadcasts bounded protected-context invalidation. It does not own every screen request or evaluate Grants.
4. **Pure safety machines:** define mutation-outcome and cursor-save transitions without React or transport side effects.
5. **Screen-local state/hooks:** own route projection requests, safe drafts, and concrete mutation instances. They consume the service and pure machines; they do not duplicate provider-owned session state.
6. **Screens:** render view models and dispatch intents. They do not import Supabase, persistence types, `DemoRole`, Grant inventories, or prototype mutable state.
7. **Shared primitives:** small accessibility/state primitives justified by repeated semantics, not a new design system.
8. **Tests:** contract/view-model tests below components; route and interaction tests above components; production integration only after the backend seam exists.

There is one owner for each state: session/context generation in the provider; each screen projection and form draft in its screen hook; mutation/cursor transition rules in pure machines; server results in the service. No generic client cache, duplicate async-state store, or second authority layer is introduced.

### 7.2 Cache policy

- Use in-memory projection state only for the First Slice.
- Key protected projections by session/Identity context plus Case/record identifier.
- Clear affected protected entries immediately on no-access/revocation results.
- Do not persist sensitive Case data to local storage, service workers, or offline databases.
- Form drafts may remain component-local during recoverable failures and must be cleared when access is lost.

## 8. Route / Screen Mapping

The logical mapping is normative. The implementation route decision is closed for this plan: the frozen First Slice uses an isolated `/winwin` route tree.

| Frozen product surface | Logical route/state | Planned component | Notes |
|---|---|---|---|
| Login | `LOGIN` | `SessionEntryPage` | Resolves session through service; no role selector |
| Authorized Case List | `CASE_LIST` | `MyCasesPage` | Includes bounded assigned-to-me links, not a task inbox |
| Case Home | `CASE_HOME(caseId)` | `CaseHomePage` | Links directly to Timeline and relevant Action Detail |
| Care Updates / Changes Since Last View | `CASE_TIMELINE(caseId)` plus merged detail | `TimelinePage` + `CareUpdateDetail` | Divider and cursor behavior live here |
| Create Care Update | `CREATE_CARE_UPDATE(caseId)` | `CreateCareUpdatePage` | Publication only; no implicit Action |
| Create Action | merged post-publication/detail substate | `CreateActionStep` | Fixed source version and exact candidate selection |
| Action Detail | `ACTION_DETAIL(caseId, actionId)` | `ActionDetailPage` | No standalone general Actions List |
| Care Continuity Gap | Case Home summary + Action Detail state | `ContinuityGapBanner` | Opens existing Action Detail; no repair controls |
| Activity / Responsibility History | Timeline + Action Detail history | `TimelineList` + `ResponsibilityHistory` | Product Activity is not Security Audit |

The selected route candidates are `/winwin/login`, `/winwin/cases`, `/winwin/cases/:caseId`, `/winwin/cases/:caseId/timeline`, `/winwin/cases/:caseId/updates/new`, and `/winwin/cases/:caseId/actions/:actionId`. No route exists for a general Actions List, repair, reassignment, Question, invitation, or professional record.

### 8.1 Migration and authority transition

- `/winwin` is required to prevent frozen First Slice screens from importing incompatible `/v2/prototype` status, role, Question, invitation, professional-record, or manager-reassignment semantics.
- At CP-F1 acceptance, `/winwin` becomes the sole authoritative development path for the frozen MVP. All subsequent First Slice behavior is implemented there.
- `/v2/prototype` becomes historical/reference-only at CP-F1. It remains runnable for comparison/regression but receives no new First Slice features.
- Legacy routes remain an independent historical product boundary and retain their lazy Supabase isolation.
- `RootEntryRoute` continues sending ordinary root traffic to the existing prototype during F1–F9 so incomplete work is not presented as the accepted product.
- At F10, a separately reviewed cutover step may switch the ordinary root destination to `/winwin` after full vertical-slice acceptance. Callback-byte preservation must remain unchanged.
- Cleanup or retirement of `/v2/prototype` is deferred until after First Slice acceptance and must not be mixed into F0–F10 feature work.

This temporary three-tree topology does not require duplicate feature maintenance: legacy and `/v2/prototype` are frozen reference/regression surfaces, while `/winwin` is the only active MVP implementation tree.

## 9. Frontend View Models

All identifiers are opaque strings. Display labels are safe projections, not authority facts.

| View model | Minimum fields required by UI | Trusted/projected fields | Must not expose |
|---|---|---|---|
| `SessionView` | state, safe actor label/context, demo marker | resolved session disposition | token, provider payload, arbitrary Identity selector |
| `AuthorizedCaseSummary` | Case ID, safe label, relationship context, new-change summary, responsibility summary, latest visible activity, relevant Action links | visible counts and labels | hidden Case totals, Grants, unauthorized names |
| `CaseHomeView` | Case display, gap summaries, since-last-view summary, latest visible update/activity, assigned/in-progress summaries, `allowedOperations` | all visibility and operation decisions | raw membership/grant rows, security reasons |
| `TimelineView` | ordered entries, stored-boundary presentation, returned boundary, new-count/divider state, screen completeness | order, visibility, boundary ownership | global sequence, hidden gaps, audit payload |
| `TimelineEntryView` | activity ID, safe event label, safe actor label if permitted, server time, typed target link, source label | safe attribution and link | Grant proof, internal enum, copied full payload |
| `CareUpdateDetailView` | exact version ID, category, bounded content, source, occurred precision, safe author, server publication time, visibility label, linked Action summary, allowed operations | current visibility/version facts | raw audience table, hidden participants, mutable published fields |
| `EligibleAssigneeView` | opaque candidate reference, safe display name, minimum relationship/service-validity context | exact current eligibility | contact details, other Cases, role-as-authority, Grant inventory |
| `ActionDetailView` | Action ID/version, title, user-facing lifecycle state, source summary, reason/due claim, current-holder or gap view, assigner/time, completion result, history, allowed operations | current effective-cycle projection and safe history | mutable assignee pointer, hidden former actors, internal proof |
| `ResponsibilityHistoryEntryView` | understandable milestone, safe person label, server time, historical/current marker | visibility-filtered attribution | permanent visibility implication, raw audit data |
| `ContinuityGapView` | Action ID, care need/title, no-current-holder wording, prior-cycle summary when visible, follow-up-needed wording | derived gap from authoritative state | replacement recommendation, risk score, manager shortcut |
| `AllowedOperationSet` | booleans/tokens for create, accept, decline, start, complete | trusted server/application decision | capability composition inputs or explanatory Grant details |
| `OperationStatusView` | `COMMITTED`, `DEFINITELY_NOT_COMMITTED`, `UNKNOWN`, or `IDEMPOTENCY_CONFLICT`; safe current projection/result | authoritative operation outcome and key-reuse disposition | internal lock/SQL/security details |

`ActionDetailView.lifecycleState` is limited to `ASSIGNED | ACCEPTED | IN_PROGRESS | COMPLETED`. Continuity gap is a separate optional view. Ended Responsibility Cycle reasons appear only as safe history wording.

## 10. Application / Server Seams

Every seam returns an explicit success/empty/partial/no-access/error disposition as applicable. Protected absence uses `NOT_FOUND_OR_NOT_VISIBLE`. Components never receive raw backend exceptions.

| Logical seam | Purpose and minimum input | Frontend-safe output | Authorization expectation | Loading/no-access/error behavior | Mutation safety |
|---|---|---|---|---|---|
| `resolveSession()` | Resolve the current authenticated account | `SessionView` | Server derives account→Actor→Identity context | checking, signed-out, expired, temporary failure; no protected data | None |
| `getAuthorizedCases()` | List Cases and assigned-to-me detail links | `AuthorizedCaseSummary[]` plus completeness | Current session and current complete Case paths | skeleton; authorized empty; partial suppresses dependent totals; safe error | None |
| `getCaseHome(caseId)` | Load Case orientation and priority summaries | `CaseHomeView` | Current Case path and record projections | generic unavailable on hidden/lost access | None |
| `getTimeline(caseId)` | Return the bounded initial visible Product Activity response and server Read Cursor boundary | `TimelineView` | Re-evaluate current visibility for every returned item | loading/empty/partial/offline/no-access remain distinct | None |
| `createCareUpdate(input, operationKey)` | Publish immutable version 1 | authoritative Care Update result | One complete current create path; server fixes author/time/version | validation, forbidden/no-access, stale options, temporary/unknown | Required operation key; lookup before retry |
| `getEligibleActionAssignees(caseId, sourceVersionId)` | Load exact candidates for this operation | `EligibleAssigneeView[]` | Trusted current candidate projection; source remains visible | authorized empty; target list refresh; non-enumerating failure | None |
| `createAction(input, operationKey)` | Atomically create Action and first `ASSIGNED` cycle | `ActionDetailView` | Source visibility plus complete create/assign decision; exact candidate | no partial Action; target-ineligible refresh; unknown outcome | Required operation key; lookup before retry |
| `getActionDetail(caseId, actionId)` | Load lifecycle, current responsibility, gap, and history | `ActionDetailView` | Current record visibility; operations separately projected | generic unavailable; stale refresh; no hidden attribution | None |
| `acceptAction(actionId, expectedVersion, operationKey)` | Accept current cycle | authoritative `ActionDetailView` | Exact current assignee + `ACTION_ACCEPT + RECORD` and `ASSIGNED` | stale/no-access/public safe failure | Required operation key; lookup before retry |
| `declineAction(actionId, expectedVersion, operationKey)` | End current unaccepted cycle and derive gap | authoritative `ActionDetailView` with gap | Exact current assignee + complete `ACTION_DECLINE + RECORD` and `ASSIGNED` | no replacement; stale/no-access/public safe failure | Required operation key; lookup before retry |
| `startAction(actionId, expectedVersion, operationKey)` | Start accepted work | authoritative `ActionDetailView` | Exact responsible assignee + `ACTION_START + RECORD` and `ACCEPTED` | stale/no-access/public safe failure | Required operation key; lookup before retry |
| `completeAction(actionId, expectedVersion, result, operationKey)` | Complete current cycle with provisional bounded result | authoritative `ActionDetailView` | Exact responsible assignee + `ACTION_COMPLETE + RECORD` and `IN_PROGRESS` | validation, stale/no-access/public safe failure | Required operation key; lookup before retry |
| `lookupOperationStatus(operationKey)` | Resolve interrupted/uncertain mutation outcome | `OperationStatusView` and safe current result/reference | Bound to current actor and original normalized intent | explicit `UNKNOWN`; no existence/proof leakage | Governs resubmit/no-resubmit decision |
| `advanceReadCursor(caseId, boundary)` | Persist viewed boundary after render | resulting/current server boundary | Exact Identity+Membership+Case owner and valid issued boundary | save failure leaves content visible; bounded retry | Monotonic max; same/lower is safe no-op |

Care Update detail is initially embedded in the authorized Timeline/Action source projections because it is a merged subview; a standalone `getCareUpdate` seam is deferred until a direct-refresh, deep-link, or payload-size consumer exists. Responsibility history is part of `getActionDetail`; a separate history seam is deferred unless later pagination evidence requires it. The First Slice therefore starts with fourteen logical seams.

The exact transport, URL, RPC, and SQL names remain outside this plan. A production adapter may combine transport calls when the frontend-safe DTO and authorization boundaries remain identical.

## 11. State Model

### 11.1 Shared discriminated state

Use a discriminated union rather than nullable data plus one global error:

```text
idle
loading
success(data, freshness)
empty(boundary?)
partial(safeData, retry)
recoverableError(safeDraft?, retry)
stale(revalidationRequired)
unavailable
mutationPending(operationKey)
mutationUncertain(operationKey, lookupState)
```

Only states relevant to a surface are admitted by its screen-local state. `unavailable` is the single public non-enumerating state for absent, hidden, revoked, expired, or otherwise inaccessible protected resources. An internal access-loss signal may trigger cache invalidation, but it must not create different public copy. Mutation state is nested in the relevant form/Action screen rather than multiplied across every read-only screen state.

### 11.2 Surface matrix

| Surface | Required states and special rules |
|---|---|
| Session entry | initial, checking, signed-out, authentication failure, temporary/offline, expired, success redirect |
| My Cases | loading, authorized success, authorized empty, partial with incomplete totals suppressed, recoverable error |
| Case Home | loading, success, no visible activity, partial, stale, unavailable; summary never advances cursor |
| Timeline | loading, success/new divider, authorized empty, partial, render failure, offline, unavailable, cursor-save pending/failed/saved |
| Care Update detail | loading, visible success, no linked Action, stale version, generic unavailable |
| Create Care Update | pristine, locally invalid, pending, uncertain, committed, definitely-not-committed retryable, unknown, conflict, unavailable |
| Create Action | candidate loading, no candidates, draft, target stale/ineligible, pending, uncertain outcome states, success, unavailable |
| Action Detail | loading, each lifecycle state, separate continuity-gap state, stale, mutation pending/uncertain, completed terminal, unavailable |
| History | loading, success, authorized empty, partial; missing history never fabricates a holder or completion |

## 12. Authorization Boundary

### 12.1 Prohibited frontend decisions

The frontend must never authorize from `DemoRole`, role label, membership alone, relationship alone, authorship alone, manager/family status, prior responsibility, cached CTA, or client-local workflow state.

### 12.2 Required pattern

- Screens render only service-projected `allowedOperations`.
- A visible control is an invitation to submit, not proof that the operation will succeed.
- Every mutation is reauthorized against current server state.
- Record visibility and mutation authority remain independent.
- Components never combine capability/scope facts across paths.
- Unknown operation tokens render no control.
- Same-role users and assigners cannot substitute for the exact current assignee.
- A previously visible actor/history entry does not grant current access.
- Demo adapter decisions are deterministic demonstrations and must carry `DEMO_NON_AUTHORITATIVE` metadata outside user authority logic.

## 13. Read Cursor Implementation

1. `getTimeline` returns visible entries, the stored-boundary presentation, and a valid server-issued returned boundary or explicit absence.
2. Request start and data receipt do not advance the cursor.
3. `TimelinePage` renders the authorized entries and divider/empty state.
4. `TimelinePage` assigns each accepted response a stable response identity. A `useEffect` keyed by that identity and returned boundary schedules `advanceReadCursor` only after React commits the complete success/authorized-empty UI state.
5. Partial, fatal render, no-access, authorization replacement, offline, or absent-boundary states never schedule advancement.
6. An empty result may advance only with its returned valid boundary after the authorized empty state renders. Zero items do not invent a boundary.
7. A small ref/pure helper deduplicates an in-flight attempt for the same response identity. React development-mode repeated effects may cause an equal request, which remains harmless because the server contract is idempotent.
8. Effect cleanup aborts or ignores completion after unmount, route change, or session/Actor/Case generation change.
9. A later response identity supersedes older cursor UI feedback. A late older success cannot lower the cursor because the service returns the monotonic maximum.
10. Cursor success accepts the server's resulting maximum; equal/lower requests are silent no-op success.
11. Cursor save failure is shown only while its response remains current, leaves content visible, and exposes bounded retry using the same boundary or the latest later valid returned boundary.
12. Client clocks, display timestamps, scroll position, and item count never form a boundary.
13. A later reload may show previously rendered items as new if saving failed.

No arbitrary timeout, visibility observer, generalized render protocol, or pagination framework is required. The effect and pure deduplication helper are tested with non-empty render, empty render, partial result, repeated render, unmount/route change, save failure, and later-boundary supersession.

## 14. Mutation / Idempotency Model

### 14.1 Pure mutation states

```text
READY
  → SUBMITTING(operationKey, normalizedIntent)
      ├─ committed response → COMMITTED(authoritative projection)
      ├─ definite failure → FAILED(public error)
      └─ interrupted/uncertain → LOOKING_UP(existing operationKey)
           ├─ COMMITTED → show server result; no resubmit
           ├─ DEFINITELY_NOT_COMMITTED → allow explicit bounded same-key retry
           ├─ UNKNOWN → show uncertainty; explicit status re-check only
           └─ IDEMPOTENCY_CONFLICT → stop replay; revalidate and show recovery
```

### 14.2 Rules

- Generate one opaque operation key per explicit user intent before the first submission.
- Bind a normalized request fingerprint in the adapter contract; changing parameters requires a new explicit intent after reconciliation.
- Disable duplicate activation while submitting or looking up.
- Never generate a replacement key automatically after uncertainty.
- Before any retry, lookup status and revalidate current resource/workflow state.
- Preserve safe form input during recoverable/uncertain failures; clear it on committed success or access loss.
- Apply the pure mutation machine to Create Care Update, Create Action, Accept, Decline, Start, and Complete.
- Committed transitions replace the whole relevant projection; the client never appends invented history.

F0 implements only the pure mutation reducer/state machine and its contract tests. React/transport integration begins with the first real consumer, Create Care Update in F3, and is then reused by later mutation screens. Each consumer supplies its own normalized intent, submit function, authoritative revalidation function, committed-result handler, and public-error mapping; the shared machine must not hide mutation-specific revalidation.

## 15. Access-Loss Handling

Implement one centralized invalidation signal around protected routes without introducing a general cache framework:

1. A `NOT_FOUND_OR_NOT_VISIBLE`, revoked session/context result, or access-loss event invalidates the affected Case and record cache entries.
2. Remove state-derived CTAs and pending authority assumptions before rendering replacement UI.
3. Cancel or ignore late responses from the invalidated context using request generation/context identity checks.
4. Clear sensitive component drafts for the inaccessible resource.
5. Replace the route with the generic unavailable surface or safe My Cases parent.
6. Do not reveal Case name, care receiver, record title, author, assignee, revoker, Grant state, hidden count, or whether the target exists.
7. Do not retain the protected body behind a modal or overlay.
8. Access restoration is not attempted by the frontend; governance is outside this slice.

The provider owns only session/Actor-context generation and a Case invalidation generation. Route screens own their protected projections and drafts. Requests use `AbortController` or generation checks so a late result from an invalidated context cannot restore protected data. This is sufficient for the First Slice; a normalized global entity cache is explicitly deferred.

## 16. Component Strategy

| Component | Why reuse is justified | Boundary |
|---|---|---|
| `WinWinAppShell` | Shared skip link, product identity, safe context, main landmark, document title | No role switch or out-of-scope nav |
| `UnavailableState` | Same non-enumerating response across protected surfaces | No protected props; justified shared safety component |
| `ContinuityGapBanner` | Same no-current-holder truth on Case Home and Action Detail | Navigation only; no repair CTA |
| `MutationStatusNotice` | Shared pending/uncertain/lookup/conflict UX | Owns no domain mutation |
| `FormField` | Shared labels, help/error associations, required/disabled/busy semantics | Avoids a broad design-system project |
| Screen-local `CaseHeader`, async/empty/partial regions, `TimelineEntry`, `ActionStatusPanel`, `ResponsibilityHistory`, and `AssigneeSelector` | Each initially has one owning surface; local code avoids speculative APIs | Extract only after a second real consumer or a safety review proves shared enforcement is necessary |

Prefer ordinary HTML semantics over a large component framework. Shared state copy may use small pure mapping functions without requiring a component file. Extract only after at least two frozen surfaces share the same behavior, except the non-enumerating unavailable state and mutation/accessibility primitives that benefit from central enforcement immediately.

## 17. Accessibility Plan

### 17.1 Implementation

- One `h1` per routed screen; ordered headings in merged substates.
- DOM order defines logical keyboard focus order.
- All interactive elements receive a visible `:focus-visible` indicator that is not a subtle color-only change.
- Every control has a programmatic label; placeholders remain examples only.
- Help and errors use stable IDs and `aria-describedby`; invalid state uses `aria-invalid` where applicable.
- Invalid submit moves focus to an error summary or first invalid field.
- Loading/busy regions expose status semantics; mutation buttons expose disabled/busy state without removing explanatory text.
- Success and routine status use non-interruptive announcements; errors and no-access replacements use appropriate alert/focus behavior.
- Dialogs have accessible names/descriptions, focus containment, Escape cancellation where safe, and focus restoration.
- Text, control boundaries, status indicators, and focus rings are checked against the accessibility target selected before production adoption; this plan claims no certification.
- Touch targets retain adequate size and spacing.
- Motion respects `prefers-reduced-motion`; no essential change is communicated only by motion or color.
- Server times render localized visible text plus machine-readable `datetime`.

### 17.2 Verification

- Static/semantic assertions for headings, labels, descriptions, status roles, and datetime.
- Keyboard interaction tests for forms, confirmation, state transitions, and no-access replacement.
- Mandatory automated verification uses semantic and interaction assertions in the frozen Vitest/jsdom/Testing Library stack; an automated accessibility scanner is not required.
- Manual narrow-screen, 200% zoom, high-contrast, reduced-motion, and screen-reader smoke checks before implementation acceptance.

### 17.3 Closed minimum test-tooling decision

Before F1, F0 installs and configures the minimum interaction stack: existing Vitest plus `jsdom`, `@testing-library/react`, `@testing-library/user-event`, and `@testing-library/jest-dom`. This is sufficient for clicks, typing, accessible queries, labels, focus, busy/disabled state, status announcements, and route interaction.

An axe-based checker is optional in F9 after a small integration review; it is not required to begin F1 and cannot prove full accessibility. Playwright, Cypress, and other browser/E2E frameworks are deferred until a concrete browser-only risk justifies them.

Accessibility is implemented and tested in every UI checkpoint from F1 onward. F9 is the final cross-screen audit, manual/design review, and correction phase—not the first accessibility pass.

## 18. Test Strategy

### 18.1 Layers

1. **Pure contracts/view models:** discriminated states, Action/gap separation, minimized DTO shapes, public-error mapping.
2. **Adapter and import boundary:** run the safe-seam behavioral suite against the demo adapter and later production adapter test double; statically prove components do not import demo fixtures, Supabase, persistence rows, Grant inventories, or prototype authority state.
3. **Pure safety state:** cursor render acknowledgment, cursor-save retry, operation-key lifecycle, and lookup outcomes.
4. **Component state:** each screen/state matrix, correct CTA visibility, forms, announcements, focus contracts.
5. **Route integration:** session redirect, safe back behavior, protected route replacement, direct Action Detail navigation.
6. **Authorization/no-access:** exact assignee, same-role C, author/manager non-shortcuts, revoked actor, non-enumerating copy.
7. **Mutation uncertainty:** all six mutation families across committed, definitely-not-committed, unknown, and conflict outcomes.
8. **Read Cursor:** request-start prohibition, render success, empty boundary, absent boundary, partial/fatal/no-access prohibition, save failure, same/later retry.
9. **Accessibility:** semantic assertions, keyboard/focus, status announcements, disabled/busy, reduced-motion CSS, contrast review.
10. **Full slice:** A publishes, creates and assigns to B; B accepts/starts/completes; alternative B declines and A sees the gap/history; C never receives B's operations.

### 18.2 Mandatory behavioral cases

- No default visibility and no default assignee.
- Create Care Update does not create an Action.
- Action creation fixes the exact source version and atomically returns `ASSIGNED` responsibility.
- Only exact assignee sees Accept and Cannot Take Over.
- No manager, family, author, same-role, or prior-assignee shortcut.
- Decline ends the cycle, preserves history, and shows a gap without reassignment.
- Accept, Start, and Complete cannot be skipped or duplicated.
- Completed Action has no lifecycle mutation CTA and does not resolve the care issue.
- Cursor never advances on request or failed/partial/no-access render.
- Empty Timeline advances only with a returned boundary after render.
- Cursor-save failure retains content and may show items as new later.
- Every uncertain mutation performs status lookup before any bounded retry.
- Revocation while viewing removes protected content and controls before safe replacement.

Snapshots may supplement but never replace behavioral assertions.

## 19. Demo / Production Boundary

### 19.1 Frontend implementable now

- frontend-safe types and service interface;
- deterministic demo fixtures and adapter;
- routes, screens, components, screen-local hooks/state, pure safety machines, state matrices, cursor render acknowledgment, uncertainty UX, and access-loss cleanup;
- pure, component, route, and adapter-contract tests using synthetic data;
- accessibility implementation and local static/interaction verification that does not require Foundation runtime.

The demo adapter must be visibly marked fictional and `DEMO_NON_AUTHORITATIVE`. It may emulate server-issued boundaries, exact opaque participants, allowed operations, idempotency outcomes, and revocation, but it must not claim backend or RLS enforcement.

### 19.2 Requires authoritative backend seam later

- production session/Actor Context resolution;
- real authorized Case/Care Update/Action/activity projections;
- server-projected allowed operations and eligible assignees;
- atomic Care Update and Action/Responsibility commands;
- authoritative operation-status lookup and idempotent response replay;
- Read Cursor persistence;
- server-side access revocation and concurrency behavior;
- backend integration, RLS/security, database, and end-to-end evidence.

No component may import `app/src/lib/supabase.ts` directly. Production transport selection and runtime execution remain separately authorized work.

## 20. Implementation Phases F0–F10

The default order is retained because the repository contains presentation scaffolding but lacks a safe frontend service boundary. Pure mutation/cursor safety machines are specified in F0 and tested before their consumers; screen-local hooks/state integrate them in the prescribed later phases.

| Phase | Objective | Bounded result / exit evidence |
|---|---|---|
| F0 — Foundation inspection / adapters only | Add consolidated frontend-safe contract, service boundary, demo adapter, pure mutation/cursor helpers, and the closed DOM test stack | No screen; pure tests prove Action/gap separation, state unions, operation-key/cursor rules, and no authority internals |
| F1 — Shell, routing, session, Case context | Add `/winwin` route tree, shell, session bootstrap, My Cases, and protected Case invalidation | `/winwin` becomes authoritative MVP development path; signed-in/out/loading/unavailable, keyboard/focus, and no-Supabase-import evidence |
| F2 — Read-only Case Home + Timeline | Implement minimized projections, priority hierarchy, Timeline and merged Care Update detail | No out-of-scope dashboard; visible activity only; semantic headings/status and initial cursor-effect tests |
| F3 — Create Care Update | Implement the publication-only form, first real React mutation integration, and post-create authoritative revalidation/refresh | Explicit visibility, safe drafts, labels/errors/focus, no implicit Action, operation-key behavior; the new update appears through the existing F2 Timeline/detail projection only after authoritative revalidation |
| F4 — Create Action + exact assignee | Add merged follow-up and candidate loading/empty/stale states | Fixed source, no default/free text, keyboard/label evidence, success opens Action Detail |
| F5 — Action Detail + responsibility projection/history | Render four lifecycle states, current holder, separate gap, embedded history, and state-specific CTAs | No general list/role shortcut; completed terminal; historical/current distinction accessible |
| F6 — Accept / Decline / Start / Complete | Wire guarded intents, confirmation, provisional completion result | Exact-assignee transitions, focus/status behavior, decline gap, no duplicates |
| F7 — Continuity gap + Product Activity integration | Complete Case Home gap navigation and activity representation | Gap is perceivable without color/motion; no repair control; competition scenario remains coherent |
| F8 — Read Cursor + uncertainty hardening | Complete response-identity cursor behavior and operation lookup/retry for all mutations | Cursor and six-family uncertainty matrix plus unmount/supersession tests pass |
| F9 — No-access + cross-screen accessibility/state audit | Complete live revocation cleanup and audit all loading/empty/partial/error/focus/keyboard/contrast/motion behavior | Non-enumeration, automated checks, and bounded manual/design evidence |
| F10 — Full vertical-slice integration | Run A→B→A happy path, decline/gap path, unauthorized C, revoked actor, and regression suites | Complete fictional-data frontend evidence; backend claims remain absent |

## 21. File-Level Change Plan

Paths are proposals for separately authorized implementation gates. `CREATE` and `MODIFY` below describe future work only.

| Path | Action | Purpose | Phase | Frozen dependency | Planned tests |
|---|---|---|---|---|---|
| `app/src/winwin/contracts/frontendContract.ts` | CREATE | Consolidated minimized DTOs, discriminated states, and public results | F0 | Screen §§5, 7–16, 19 | `winwinContracts.test.ts` |
| `app/src/winwin/contracts/verticalSliceService.ts` | CREATE | Logical read/mutation/cursor/status interface | F0 | Screen §§5, 19 | `winwinContracts.test.ts` |
| `app/src/winwin/safety/safetyState.ts` | CREATE | Pure mutation reducer plus Read Cursor acknowledgment/retry helpers | F0/F8 | Screen §§5.4, 10, 16, 20.2 | `winwinSafety.test.tsx` |
| `app/src/winwin/adapters/demo/DemoVerticalSliceService.ts` | CREATE | Deterministic adapter with minimal fictional fixtures and safe seams | F0 | Screen §19 + nine-surface scope | Contract and full-slice suites |
| `app/src/winwin/state/WinWinAppProvider.tsx` | CREATE | Service injection, session/context generations, and protected invalidation | F1 | Screen §§5, 15–16 | screen/access-loss tests |
| `app/src/winwin/routes/WinWinRoutes.tsx` | CREATE | Bounded First Slice route tree | F1 | Screen §§3–4 | `winwinScreens.test.tsx` |
| `app/src/winwin/components/WinWinAppShell.tsx` | CREATE | Product shell, safe context, skip link | F1 | Screen §6 | shell/accessibility tests |
| `app/src/winwin/components/SafetyStates.tsx` | CREATE | Shared non-enumerating unavailable UI and mutation status announcements | F1/F8/F9 | Screen §§5.4, 15–16 | screen/safety tests |
| `app/src/winwin/components/FormField.tsx` | CREATE | Label/help/error/disabled/busy associations | F3 | Screen §18 | accessibility/form tests |
| `app/src/winwin/components/ContinuityGapBanner.tsx` | CREATE | No-current-holder summary/navigation | F5/F7 | Screen §§9, 14.3 | gap/no-repair tests |
| `app/src/winwin/pages/SessionEntryPage.tsx` | CREATE | Login/session states | F1 | `SC-01` | route/session tests |
| `app/src/winwin/pages/MyCasesPage.tsx` | CREATE | Authorized Cases and bounded assigned links | F1 | `SC-02` | empty/partial/non-enumeration tests |
| `app/src/winwin/pages/CaseHomePage.tsx` | CREATE | Priority summaries and direct links | F2/F7 | `SC-03` | hierarchy/gap tests |
| `app/src/winwin/pages/TimelinePage.tsx` | CREATE | Timeline states, local entries/merged Care Update detail, and render acknowledgment | F2/F8 | `SC-04`, `SC-05` | Timeline/cursor tests |
| `app/src/winwin/pages/CreateCareUpdatePage.tsx` | CREATE | Publication-only form and result state | F3 | `SC-06` | form/idempotency tests |
| `app/src/winwin/components/CreateActionStep.tsx` | CREATE | Fixed-source exact-assignee follow-up | F4 | `SC-07` | candidate/default/stale tests |
| `app/src/winwin/pages/ActionDetailPage.tsx` | CREATE | Action state, local status/history/assignee controls, and exact CTAs | F5/F6 | `SC-08`, Screen §14 | lifecycle/CTA/history tests |
| `app/src/winwin/winwin.css` | CREATE | Scoped bounded styles, focus, responsive, contrast, reduced motion | F1–F9 | Screen §18 | CSS/static/manual checks |
| `app/src/App.tsx` | MODIFY | Mount the isolated WinWin route tree without importing Supabase | F1 | Screen §4 | route/non-initialization regression |
| `app/src/auth/RootEntryRoute.tsx` | MODIFY | Separately reviewed default-entry cutover only | F10 | Screen §4 | callback-byte and redirect regression |
| `app/package.json` | MODIFY | Add the closed minimal DOM interaction test stack | F0 | Screen §§18, 20 | install/type/test validation |
| `app/package-lock.json` | MODIFY | Lock only the adopted test dependencies | F0 | Reproducibility | clean install/build/test |
| `app/vite.config.ts` | MODIFY | Configure the bounded jsdom test environment | F0 | Closed DOM test decision | test validation |
| `app/tests/winwinContracts.test.ts` | CREATE | DTO/state minimization, Action/gap separation, service behavior, and demo/import boundaries | F0 | Screen §§5, 14, 19 | Pure/adapter/static boundary tests |
| `app/tests/winwinScreens.test.tsx` | CREATE | Routes, screen states, CTAs, forms, access loss, and accessibility | F1–F9 | Screen §§3–18 | DOM interaction tests |
| `app/tests/winwinSafety.test.tsx` | CREATE | Cursor behavior and six mutation families × four outcomes | F0/F3–F8 | Screen §§5.4, 10, 16, 20.2 | Pure/integration tests |
| `app/tests/winwinVerticalSlice.test.tsx` | CREATE | A→B→A, decline/gap, C deny, revoked actor | F10 | Screen §20 | Full fictional-data integration |

This plan names **27 meaningful files**. One-use presentation elements remain local to their screen until demonstrated reuse justifies extraction. No empty production adapter, generic cache, generalized pagination layer, or speculative abstraction is created.

## 22. Implementation Checkpoints

Each checkpoint is independently reviewable and should normally end in one local commit only after its own gate validates the bounded files.

| Checkpoint | File scope | Required evidence | Suggested commit boundary |
|---|---|---|---|
| CP-F0 | consolidated contract, service, pure safety state, demo adapter, and DOM test stack | safe DTOs contain no Grant/role authority; Action/gap, operation-key, cursor, adapter, and test-environment evidence pass | `feat: add first-slice frontend foundation` |
| CP-F1 | `/winwin` route mount, provider, shell, session, My Cases, safety components | authoritative development path, no Supabase initialization, authorized empty/unavailable routes, and baseline accessibility pass | `feat: add winwin session and case entry` |
| CP-F2 | Case Home and Timeline with local activity/detail elements | read-only hierarchy, visibility, semantic structure, and initial cursor-effect tests pass | `feat: add winwin case activity views` |
| CP-F3 | FormField and Create Care Update with mutation integration | no default visibility, no implicit Action, operation-key, accessible form, and uncertain UI pass | `feat: add immutable care update flow` |
| CP-F4 | Create Action step and local assignee control | fixed source, no default/free-text, target refresh, keyboard, and label evidence pass | `feat: add exact-assignee action creation` |
| CP-F5 | Action Detail with local status/history controls and initial gap view | four lifecycle states, allowed CTA matrix, and accessible historical/current distinction pass | `feat: add action responsibility detail` |
| CP-F6 | Accept/Decline/Start/Complete wiring | exact-assignee transitions and provisional result pass | `feat: add action responsibility transitions` |
| CP-F7 | gap navigation and Product Activity integration | decline→gap, preserved embedded history, perceivable gap, and research-observable competition scenario pass; no repair CTA | `feat: add continuity gap and history` |
| CP-F8 | cursor + all uncertainty integration | response-identity/empty/save-failure cursor and six-family uncertainty pass | `feat: harden cursor and mutation recovery` |
| CP-F9 | live access loss, full state/a11y hardening, scoped CSS | cache clearing, focus, keyboard, announcements, motion/contrast evidence | `fix: harden first-slice access and accessibility` |
| CP-F10 | full integration, regression, and separately reviewed root-entry cutover | both responsibility branches, C deny, revoked actor, competition demo path, full suite/build, and redirect regression pass | `test: verify first vertical slice` |

No checkpoint may include backend runtime, SQL, migrations, Foundation start, deployment, or unrelated prototype cleanup.

## 23. Closed and Open Implementation Decisions

### 23.1 Closed implementation decisions

| Topic | Closed decision | Consequence |
|---|---|---|
| Route authority | Use isolated `/winwin`; it becomes the sole authoritative MVP development path at CP-F1. `/v2/prototype` remains historical/reference-only. Root-entry cutover is separately reviewed at CP-F10. | F1 is unblocked without implying prototype cleanup or early root replacement. |
| DOM interaction stack | Use Vitest + jsdom + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom`. Axe may be considered at F9; Playwright/Cypress require separate evidence. | F0 closes the test environment before F1, and accessibility evidence begins at F1. |
| Timeline data volume | Use one bounded initial response. Do not build generalized pagination; add load-more behavior only when observed data volume requires it. | No speculative pagination abstraction. |
| Render acknowledgment | Use a simple React effect keyed by response identity and returned boundary, with dedupe and stale/unmount guards. | Cursor implementation is bounded; no timer, observer, or generalized acknowledgment protocol. |

### 23.2 Open implementation decision

### OID-1 — Production transport binding

- **Decision:** HTTP/server-function/RPC transport and exact response envelopes behind `VerticalSliceService`.
- **Why not frozen:** backend runtime and authoritative endpoints are a separate workstream.
- **Options:** reviewed server API, controlled server functions, or another adopted application boundary.
- **Recommendation:** implement only the interface and demo adapter now; bind production only after backend authority and safe-error/idempotency contracts are verified.
- **Blocks:** production integration, not fictional-data frontend implementation.

This deferred item does not block the fictional-data competition-ready frontend and does not authorize an empty production adapter. It does not reopen product semantics, exact-assignee authority, lifecycle states, gap meaning, or MVP scope.

## 24. Explicit MVP Exclusions

Do not plan or implement:

- reassignment or replacement-assignee workflow;
- relinquish after acceptance;
- Question workflow;
- notifications or escalation;
- invitation, onboarding, or access administration;
- professional verification workflow;
- delegation or supervisor completion;
- Care Update correction UI;
- 24-hour, 72-hour, or 7-day caregiver-unavailable simulations;
- LTC resource matching or respite/home-care/day-care linkage;
- advanced continuity planning;
- GPS, medication reminders, mood tracking, clinical dashboards, analytics, AI recommendations, or risk scores;
- general Actions List, task inbox, generic queue, Kanban, or generic task management;
- full offline synchronization or persistent sensitive client cache;
- SQL, migrations, RLS, Supabase runtime, Docker/Foundation start, deployment, or production claims.

The future “if tomorrow I cannot provide care” 24-hour, 72-hour, and 7-day interruption scenario remains outside this slice. The plan nevertheless preserves deterministic, independently modeled concepts for care need, current responsible person, responsibility history, uncovered care/continuity gap, and Case-level continuity summary so that later scenario work does not require redefining the First Slice. It adds no speculative scenario screen or simulation seam now.

Competition positioning does not authorize AI. Authorization, assignee eligibility/selection, responsibility and gap state, workflow transitions, and any future interruption determination remain deterministic and auditable. Possible later assistance that structures caregiver descriptions or explains already-authoritative data is outside this plan.

## 25. Acceptance Criteria

The implementation plan is satisfied only when separately authorized work demonstrates:

1. The new route tree maps exactly the nine frozen product surfaces without a tenth screen.
2. Components depend only on frontend-safe view models and `VerticalSliceService`.
3. No component imports Supabase, Grant inventories, or prototype role-authority state.
4. Session and Case projections use explicit loading/success/empty/partial states and one public non-enumerating `unavailable` state.
5. Case Home has the frozen priority order and no out-of-scope dashboard content.
6. Timeline displays only ordered visible Product Activity and advances no cursor before successful render.
7. Empty Timeline, absent boundary, cursor-save failure, and bounded retry behave exactly as frozen.
8. Care Update publication is immutable, uses explicit visibility, and never creates an Action implicitly.
9. Create Action uses a fixed source, no default, and one exact eligible candidate.
10. Action Detail shows one current lifecycle state and only currently allowed CTAs.
11. Exact assignee can Accept or Cannot Take Over only while `ASSIGNED`; same-role/manager/author C cannot substitute.
12. Decline ends the current unaccepted cycle, preserves history, and yields a separate gap without repair controls.
13. Accept→Start→Complete is ordered; completion result remains provisional and does not resolve the care issue.
14. All six mutation families use operation keys and lookup-before-retry uncertainty handling.
15. Revocation removes protected content, cached projections, and controls before generic unavailable UI.
16. Accessibility requirements have automated and manual evidence without certification claims.
17. Demo state remains labeled non-authoritative and production adapter absence is explicit.
18. `/winwin` is the sole authoritative development path from CP-F1; `/v2/prototype` remains reference-only, and root cutover occurs only at separately reviewed CP-F10.
19. The closed DOM stack is established in F0, and keyboard, focus, semantic, status, and other accessibility evidence accompanies every UI checkpoint from F1 onward.
20. The competition demonstration makes Action state, current responsibility, historical responsibility, and continuity gap separately understandable without exposing internal authority mechanics.
21. The same observable states support the named usability/research questions without adding research-only features.
22. The implementation stays within the consolidated 27-file plan, keeps one-use UI local first, and creates no empty production adapter, generic cache, or generalized pagination framework.
23. Future scenario concepts remain cleanly representable, while no scenario simulation or AI behavior enters the First Slice.
24. TypeScript, relevant tests, full tests, production build, and diff checks pass at the authorized implementation checkpoint.

## 26. Risks

| Risk | Consequence | Mitigation / stop condition |
|---|---|---|
| Reusing prototype status types | Decline/gap become linear Action states | New view models; prohibit imports from `types/prototype.ts` in new screens |
| Reusing `PrototypeNewUpdatePage` flow | Care Update silently creates Action/defaults choices | Separate publication and Create Action components; tests for no defaults/implicit creation |
| Reusing general Action page | Tenth screen/generic task-management drift | Direct Action Detail route only; route inventory test |
| UI evaluates Grants or roles | Authorization mismatch and data exposure | Service-projected operations only; static import review and C/manager tests |
| Async response arrives after revocation | Protected content reappears | Context generation tokens, cache invalidation, and late-response tests |
| Cursor advances on fetch/effect timing error | Unseen items marked viewed | Simple response-identity effect, pure dedupe helper, and failure-path tests |
| Blind mutation retry | Duplicate objects/transitions | One operation key, lookup state machine, adapter contract tests |
| Demo behavior mistaken for production | False security/runtime claim | `DEMO_NON_AUTHORITATIVE` marker, no Supabase import, explicit production adapter deferral |
| Monolithic provider grows | Coupled screens and unsafe invalidation | Keep only session/context generation and invalidation in provider; screen requests/drafts remain local |
| Existing CSS masks accessibility defects | Invisible focus/contrast/motion failures | Isolated scope, interaction tests, contrast review, manual checks |
| DOM dependency expansion grows beyond need | Slower delivery without better evidence | Freeze the minimal F0 stack; require separate evidence before browser E2E or additional tooling |
| Backend response contract diverges | Costly UI rewrite or unsafe error handling | Shared adapter contract and production DTO mapping; stop on raw-row leakage |
| Competition polish displaces safety behavior | Credible-looking demo masks responsibility/privacy defects | Treat exact authority, uncertainty, cursor, access loss, and accessibility evidence as checkpoint exits |
| Future scenario work couples to UI labels | 24/72/7-day extension requires First Slice redesign | Preserve care need, current responsibility, history, gap, and Case summary as distinct deterministic concepts |

## 27. Competition-Ready Feasibility Assessment

**Assessment: MODERATE–HIGH BUT FEASIBLE FOR A COMPETITION-READY MVP.**

The remaining complexity is concentrated in product credibility: exact-assignee authority, separate responsibility/gap truth, six-family mutation uncertainty, Read Cursor correctness, access-loss privacy, accessible state behavior, traceable history, and a safe later-backend seam. The plan removes architecture-driven fragmentation by consolidating related contracts and tests, retaining one-use UI locally, omitting an empty production adapter, avoiding generalized pagination/cache layers, and reducing the proposal from roughly 42 files to 27 meaningful files and from 12 to 11 checkpoints.

Feasibility must be reviewed at each checkpoint against implementation time and team capacity, competition demonstration quality, authorization/privacy importance, research value, production extensibility, and avoidable rework. If a gate adds abstraction without strengthening one of those outcomes, it should stop or simplify before implementation.

### 27.1 Remaining review questions

1. Are the proposed frontend-safe view-model fields sufficiently minimized for implementation, with backend-only additions deferred?
2. Is production transport work correctly blocked on a separately verified authoritative backend seam rather than Foundation Environment Start?
3. Does each CP-F0–CP-F10 checkpoint have a sufficiently bounded file scope and behavioral exit condition for the available team capacity?
4. Does the planned fictional-data evidence make the competition scenario and named research questions observable without implying production authorization or adding research-only features?

Until separately authorized implementation checkpoints address these questions, this document remains **FINAL — FROZEN — ADOPTED** as the implementation baseline.
