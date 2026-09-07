# WinWin Responsibility Recovery Implementation Plan V1

Status: **IMPLEMENTATION PLAN — NOT EXECUTED**

Product authority: `WINWIN_RESPONSIBILITY_RECOVERY_PRODUCT_DECISIONS_V1.md`

Planning baseline: `252ef53298039f39d7c9e33ac4c9f458a9bd2a81`

## 1. Objective and stop boundary

Plan the minimum fictional-data frontend/domain-contract extension for:

```text
DECLINED cycle
→ NEEDS_REASSIGNMENT
→ authorized one-candidate reassignment request
→ new immutable ASSIGNED cycle
→ replacement Accept or Decline
→ confirmed coverage or renewed vacancy
```

This plan does not authorize implementation. It does not authorize backend, SQL, migration, Supabase, Docker, browser/runtime, production authentication, deployment, or push. Each checkpoint requires a separate bounded gate.

The first implementation direction is **frontend/domain-contract first using the existing fictional demo service**. This is the smallest path that proves product semantics without pretending to provide production authorization. Backend/domain persistence remains a later separately authorized adapter and transaction phase.

## 2. Existing architecture ownership

| Concern | Existing owner | Planned extension |
|---|---|---|
| Safe DTOs, operations and command results | `app/src/winwin/contracts/frontendContract.ts` | Add reassignment candidate/input/allowed-operation shapes; preserve minimized projections |
| Application service seam | `app/src/winwin/contracts/verticalSliceService.ts` | Add candidate read and reassignment mutation methods |
| Fictional deterministic behavior | `app/src/winwin/adapters/demo/DemoVerticalSliceService.ts` | Model immutable cycles, gap→pending, repeated decline, empty/stale/uncertain fixtures |
| Session/context invalidation | `app/src/winwin/state/WinWinAppProvider.tsx` | No planned API change; reuse context generation and invalidation |
| Recovery UI and lifecycle controls | `app/src/winwin/pages/ActionDetailPage.tsx` | Add gap-only recovery section and reuse mutation/currentness patterns |
| Shared form semantics | `app/src/winwin/components/FormField.tsx` | Reuse; no planned change unless a bounded accessibility defect is proven |
| Gap presentation | `app/src/winwin/components/ContinuityGapBanner.tsx` | Preserve truthful vacancy; no repair logic inside the banner |
| Responsibility history | `ActionDetailView.responsibilityHistory` and Action Detail | Project prior cycles as historical and the new pending/current cycle distinctly |
| Product Activity | `TimelineEntryView`, demo adapter, `TimelinePage.tsx` | Emit/project only request, acceptance and decline milestones; avoid duplicate gap noise |
| Mutation uncertainty | `ActionDetailPage.tsx`, `safetyState.ts`, operation-status service seam | Reuse operation key, status lookup and four outcomes; no new framework |
| Contract tests | `app/tests/winwinContracts.test.ts` | Interface, DTO minimization, import/architecture boundary |
| Screen tests | `app/tests/winwinScreens.test.tsx` | Visibility, candidate flow, confirmation, focus, stale/uncertain/access loss |
| Safety tests | `app/tests/winwinSafety.test.tsx` | Reassignment mutation family outcome matrix if a pure-state extension is needed |
| Full composition | `app/tests/winwinVerticalSlice.test.tsx` | Decline→reassign→Accept and repeated decline histories |

No new route, provider, general Actions surface, state library, or generic workflow engine is planned.

## 3. Canonical naming and adapter boundary

`ACTION_REASSIGN` is the one canonical product/domain capability. It must be the capability checked by the future authoritative adapter and represented by the safe frontend `allowedOperations` projection.

Earlier `REASSIGN_ACTION` names may appear only in a legacy adapter mapping documented at that boundary. They must never be unioned with, treated as fallback for, or persisted alongside `ACTION_REASSIGN` as a second capability. Unknown vocabulary fails closed.

Proposed TypeScript names are implementation-shape candidates, frozen for planning consistency but still subject to the relevant checkpoint review:

- `EligibleReassignmentCandidateView`;
- `ReassignActionInput`;
- `getEligibleReassignmentCandidates(actionId)`;
- `reassignAction(input, operationKey)`.

## 4. Service-contract additions

### 4.1 Candidate read

```ts
getEligibleReassignmentCandidates(
  actionId: OpaqueId
): Promise<ProjectionResult<readonly EligibleReassignmentCandidateView[]>>
```

Safe candidate projection:

```ts
type EligibleReassignmentCandidateView = Readonly<{
  candidateRef: OpaqueId;
  displayName: string;
  relationshipDisplay?: string;
  serviceValidityDisplay?: string;
  priorDeclineHint?: string;
}>;
```

`priorDeclineHint` is optional and must remain absent until wording/user validation is separately accepted. No Identity ID, Membership ID, Grant inventory, other Case, contact detail, schedule, health fact, or suitability score is exposed.

Authority assumptions: the server derives Actor Context, separately validates Action visibility and a complete `ACTION_REASSIGN` path, confirms the declined-gap state, and returns only currently eligible exact Identity+Membership candidates. `EMPTY` means no currently eligible candidate; `NOT_FOUND_OR_NOT_VISIBLE` remains non-enumerating; temporary/partial results must not permit mutation from an unconfirmed candidate set.

### 4.2 Reassignment mutation

```ts
type ReassignActionInput = Readonly<{
  actionId: OpaqueId;
  assigneeCandidateRef: OpaqueId;
  expectedVersion: string;
}>;

reassignAction(
  input: ReassignActionInput,
  operationKey: OperationKey
): Promise<CommandResult<ActionDetailView>>
```

The opaque candidate reference is resolved server-side to one eligible Identity+Membership lifecycle instance. The client does not send actor, Grant, prior cycle, timestamps, lifecycle state, audit facts, or authoritative result.

The result is an authoritative Action Detail projection with a new `ASSIGNED` cycle, pending-confirmation wording, no confirmed-holder claim, preserved historical cycles, allowed operations for the current viewer, and the relevant Product Activity boundary. Existing command failures remain sufficient: not found/not visible, forbidden, stale version, target ineligible, temporary failure with uncertainty, and idempotency conflict.

Operation-status lookup continues to return the authoritative Action Detail for a committed result. No reassignment-specific retry protocol is added.

## 5. Authoritative mutation and concurrency contract

The future production transaction must:

1. authenticate and derive current Runtime Actor Context;
2. lock/re-read the Action and effective-cycle facts in the documented global order;
3. prove separate Action visibility and one complete current Grant with `ACTION_REASSIGN`;
4. confirm the Action is unfinished, the prior cycle ended `DECLINED`, no effective cycle exists, and expected version is current;
5. resolve the candidate reference and re-check current same-Case eligibility and response path;
6. insert exactly one new immutable `ASSIGNED` Responsibility Cycle;
7. append the reassignment audit and permission-filtered Product Activity boundary;
8. commit atomically and return the authoritative projection.

A database uniqueness defense permits at most one effective, non-ended cycle per Action. If A chooses C while D chooses E, one transaction succeeds and the other returns stale/conflict. No client-side overwrite is possible. Same operation key plus the same normalized intent returns the original result; the same key with different intent is an idempotency conflict.

This plan defines expected semantics only. It does not select or authorize SQL schema, lock syntax, function implementation, RLS policy, migration, or runtime cutover.

## 6. Frontend state model

Action Detail owns only bounded recovery-local state:

| State | Presentation and allowed behavior |
|---|---|
| Gap idle | Show `需要重新安排`, `目前沒有人確定接手`; show recovery CTA only when allowed |
| Candidates loading | Busy announcement; no candidate selection or mutation |
| Candidates ready | One labeled, keyboard-operable candidate control; no default selection |
| Candidates empty | Truthful no-candidate copy; gap remains; no broken selector |
| Candidates partial/error | No mutation; bounded retry without leaking hidden counts/details |
| Candidate selected | Show selected safe projection; responsibility still vacant |
| Confirmation | “將請 C 確認是否接手”; explicit confirm and cancel; bounded focus behavior |
| Mutation pending | Disable duplicate submit; retain one intent and operation key |
| Mutation uncertain | Say outcome is unknown; status lookup only; no blind second assignment |
| Definitely not committed | Revalidate Action/candidate/currentness before an explicit retry with the same intent/key |
| Conflict/stale | Refresh Action, remove obsolete control, announce latest responsibility state, require renewed intent |
| Committed pending refresh | Do not claim confirmation; retrieve authoritative Action Detail |
| Reassignment committed | Show `等待 C 確認`; confirmed coverage false |
| Access loss | Clear candidate, confirmation, operation state, and protected projections; show non-enumerating safe replacement |

Do not generalize this into a reusable workflow framework. Existing lifecycle guards, generation ownership, and mutation-currentness techniques are extended only as needed.

## 7. Action Detail interaction

The recovery section is rendered only when the authoritative projection shows `NEEDS_REASSIGNMENT` and the current viewer's `allowedOperations.ACTION_REASSIGN` is true.

```text
Action Detail
→ 重新安排接手者
→ load server-filtered candidates
→ select exactly one
→ review: 將請 C 確認是否接手
→ confirm
→ authoritative reassignment mutation
→ refresh Action Detail
→ 等待 C 確認
```

Candidates have no free-text fallback and no default-first selection. Confirmation is required because the mutation creates a durable responsibility request and audit record. After success, focus moves to the authoritative pending-status heading. The candidate later uses the existing Accept/Cannot Take Over controls; those controls remain exact-current-assignee operations.

The existing gap banner remains presentation-only. It must not fetch candidates or mutate responsibility. No standalone route, modal framework, or tenth primary surface is introduced.

## 8. Demo-service plan

The deterministic demo adapter may be extended to model:

- an Action with a prior immutable `DECLINED` cycle and `NEEDS_REASSIGNMENT`;
- a bounded eligible replacement list;
- an empty candidate response;
- `reassignAction` creating one new `ASSIGNED` cycle without overwriting history;
- pending-confirmation versus accepted coverage wording;
- replacement Accept and replacement Decline;
- a previous decliner being selected into a new cycle;
- stale version, target ineligible, no-access, uncertain, committed, definitely-not-committed and conflict fixtures;
- permission-filtered Product Activity.

The adapter remains fictional and non-authoritative. It must not add an interactive actor selector, query/localStorage identity, production credential flow, role-based permission inference, automatic candidate choice, or claims of external notification.

## 9. Test strategy

Required failure-sensitive evidence:

1. Recovery control appears only for `NEEDS_REASSIGNMENT` plus allowed `ACTION_REASSIGN`.
2. Creator, assigner, family/professional/manager labels and unauthorized actors cannot see or invoke it without the complete path.
3. Candidate projection contains only approved safe fields and no authority inventory or unrelated data.
4. No candidate is preselected; exactly one candidate must be selected.
5. Confirmation is required and cancel returns focus safely.
6. Successful mutation creates a new cycle and preserves the ended `DECLINED` cycle byte-for-byte in the fixture/domain model.
7. Pending assignment says “等待 C 確認” and never claims confirmed coverage/current confirmed holder.
8. Replacement Accept establishes confirmed responsibility coverage and reuses ordered transition rules.
9. Replacement Decline ends only the new cycle and returns the Action to `NEEDS_REASSIGNMENT`.
10. A previous decliner can be explicitly selected again only through a new cycle and new decision.
11. Empty candidates show truthful unresolved copy and create no cycle.
12. Partial/error candidate reads cannot enable reassignment.
13. Stale expected version or an already-created competing cycle rejects and refreshes without overwrite.
14. Logical concurrent attempts yield one success and one stale/conflict result; at most one effective cycle remains.
15. `UNKNOWN` performs status lookup and never blind retry; all four operation outcomes are covered.
16. Pending prevents duplicate mutation while retaining the same intent/key.
17. Candidate becoming ineligible returns safe refresh/reselection behavior.
18. Access loss clears candidate, confirmation, pending intent, protected Action data, and controls; obsolete settlements are inert.
19. Keyboard selection, dialog/disclosure focus, announcements, busy state, result focus, and non-color status pass.
20. Product Activity contains the bounded request/accept/decline milestones without raw audit or duplicate gap noise.
21. Phase-2 features, automatic replacement, parallel candidates, ranking, notifications and service booking remain absent.
22. Full composition covers A observes gap, authorized A requests C, C accepts, and the alternative C declines back to a preserved gap/history.

Snapshots may supplement but never replace behavioral assertions.

## 10. Implementation checkpoints

Every checkpoint below requires a separate gate. Commit policy is one bounded local commit only after its acceptance checks pass; otherwise no commit. No checkpoint authorizes push, backend/runtime work, or files outside its allowed set.

### RR-F0 — Contract and authority projection

Goal: close safe DTO, allowed-operation, service and mutation-result contracts without UI behavior.

Allowed files:

- `app/src/winwin/contracts/frontendContract.ts`
- `app/src/winwin/contracts/verticalSliceService.ts`
- `app/tests/winwinContracts.test.ts`
- `app/tests/winwinSafety.test.tsx` only if the existing pure mutation family requires extension

Acceptance: canonical `ACTION_REASSIGN`; minimized candidate/input types; two service methods; no second capability/framework; contract/typecheck/full regression pass.

Non-actions: Action Detail, demo behavior, CSS, routes, provider, backend. Suggested commit: `feat: add winwin recovery contracts`.

### RR-F1 — Deterministic cycle and projection behavior

Goal: extend the fictional adapter with declined-gap, eligible/empty candidates, immutable new cycle, pending coverage, repeated decline and operation outcomes.

Allowed files:

- `app/src/winwin/adapters/demo/DemoVerticalSliceService.ts`
- `app/tests/winwinContracts.test.ts`
- contract files only if RR-F0 review identified an exact previously documented correction

Acceptance: old cycles preserved; one effective cycle; no candidate auto-selection; empty/no-access/stale/uncertain fixtures; no production-authority claim; focused/typecheck/full regression pass.

Non-actions: UI, route/provider, backend. Suggested commit: `feat: model winwin responsibility recovery`.

### RR-F2 — Action Detail candidate read and confirmation

Goal: add the gap-only inline recovery disclosure, safe candidate loading/empty/error states, exact-one selection and explicit confirmation.

Allowed files:

- `app/src/winwin/pages/ActionDetailPage.tsx`
- `app/src/winwin/winwin.css`
- `app/tests/winwinScreens.test.tsx`
- `app/src/winwin/components/FormField.tsx` only if an exact existing-control accessibility need is proven before editing

Acceptance: authorization-driven CTA; bounded projection; no default; truthful empty state; keyboard/focus/dialog semantics; no mutation yet; screen/typecheck/full regression plus bounded rendered review.

Non-actions: new route/surface, mutation execution, actor selector, notification, backend. Suggested commit: `feat: add winwin recovery selection`.

### RR-F3 — Reassignment mutation and uncertainty

Goal: wire confirmation to `reassignAction`, reusing currentness, operation-key and lookup behavior.

Allowed files:

- `app/src/winwin/pages/ActionDetailPage.tsx`
- `app/src/winwin/safety/safetyState.ts` only if an exact pure-state extension is accepted
- `app/tests/winwinScreens.test.tsx`
- `app/tests/winwinSafety.test.tsx`

Acceptance: pending duplicate prevention; committed refresh; definitely-not-committed guarded retry; unknown lookup-only; conflict stop; stale refresh/renewed intent; access-loss cleanup; authoritative status focus; focused/full/typecheck/build pass.

Non-actions: candidate ranking, parallel request, new mutation framework, backend. Suggested commit: `feat: add winwin reassignment flow`.

### RR-F4 — Replacement response composition

Goal: prove a replacement uses the existing Accept/Decline lifecycle against the new cycle and that responsibility is restored only on Accept.

Allowed files:

- `app/tests/winwinVerticalSlice.test.tsx`
- `app/src/winwin/adapters/demo/DemoVerticalSliceService.ts` only for a bounded missing fixture discovered before the gate
- `app/tests/winwinScreens.test.tsx` only for exact presentation evidence authorized by the gate

Acceptance: decline→reassign→Accept; pending is not confirmed; alternative replacement Decline returns to gap; original and replacement histories preserved; no second lifecycle or actor selector; focused/full/typecheck/build pass.

Non-actions: new product controls beyond accepted flow, backend. Suggested commit: `test: verify winwin responsibility recovery`.

### RR-F5 — Repeated decline, empty, stale and privacy hardening

Goal: close previous-decliner, repeated-cycle history, no-candidate, concurrent logical conflict, candidate invalidation and obsolete-settlement evidence.

Allowed files:

- `app/tests/winwinScreens.test.tsx`
- `app/tests/winwinVerticalSlice.test.tsx`
- `app/tests/winwinContracts.test.ts`
- production files already changed in RR-F1–F3 only if a separately identified bounded defect is explicitly authorized

Acceptance: all test-strategy cases 1–21 mapped; progressive history remains comprehensible; no protected candidate leak; full suite/typecheck/build/diff checks pass; exact scope review.

Non-actions: relinquishment, revocation recovery, timeout replacement, notifications, Backup Care. Suggested commit if correction is required: `fix: harden winwin responsibility recovery`; test-only gates should use an exact test-oriented message.

### RR-F6 — Full integration and closure

Goal: review the complete recovery delta, run bounded manual frontend evidence and full regression, verify authority/scope, and conditionally close only the Minimum Recovery Slice.

Allowed files: no implementation edits. Any defect requires a separate correction gate. A later gate must enumerate the exact accumulated commit/delta state rather than infer it from this plan.

Acceptance: authorized gap control, candidate selection, confirmation, pending wording, replacement Accept/Decline, history, no-candidate, keyboard/focus, uncertainty, stale/access-loss and route regressions pass; full tests/typecheck/build pass; frozen authority unchanged.

Non-actions: push, deployment, backend, overall MVP closure, Backup Care or interruption scenarios. Closure wording: “WinWin declined-gap Minimum Responsibility Recovery Slice is closed.”

## 11. Backend adapter requirements for later planning

A later backend gate must map the same service contract to server-derived Actor Context, single-Grant `ACTION_REASSIGN`, separate record visibility, candidate eligibility, Action/cycle locking, expected versions, unique effective-cycle enforcement, idempotency records, atomic audit/activity, and non-enumerating errors. It must reconcile the existing schema/cutover authority before creating migrations or code.

Frontend completion with the demo adapter is not evidence of production authorization, persistence, real multi-user concurrency, or notification delivery.

## 12. Explicit exclusions

This plan excludes relinquishment UI, in-progress cannot-continue, revocation recovery UI, no-response timeout replacement, forced reassignment, multiple candidates, broadcast requests, ranking, availability calendars, workforce scheduling, external notifications, credential/auth expansion, general Actions dashboard, Backup Care assessment, formal service matching/booking, LTC linkage, care-gap timeline, 24h/72h/7d scenarios, medical diagnosis, emergency dispatch, risk/resilience scoring, and AI caregiver recommendations.

## 13. Research boundary

The following remain research questions rather than implementation truth: final Chinese wording, pressure from re-inviting a prior decliner, minimum context needed before Accept, household interpretation of confirmed responsibility versus care execution, handling of one-person/no-candidate households, and later urgency/escalation needs.

These questions do not block the bounded fictional minimum slice because its states remain explicit and non-claiming. They must be revisited before broader Backup Care or production rollout.

## 14. Planning readiness

The implementation plan is finite, uses existing ownership, has no backend-execution dependency, and contains no required Phase-2 or Backup-Care capability. It is ready for a separate document-freeze review/commit gate and, only afterward, separately authorized RR-F0 implementation.
