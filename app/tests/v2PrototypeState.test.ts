import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { BASE_DOCUMENT_TITLE, V2_DOCUMENT_TITLE, V2_PRODUCT_DESCRIPTION, V2_PRODUCT_LOGO, V2_PRODUCT_LOGO_ALT, V2_PRODUCT_LOGO_HEIGHT, V2_PRODUCT_LOGO_WIDTH, V2_PRODUCT_NAME, V2_PRODUCT_TAGLINE, V2_PROTOTYPE_NOTICE } from '../src/v2/data/branding';
import { PrototypeShell } from '../src/v2/components/PrototypeShell';
import { PrototypeLandingPage } from '../src/v2/pages/PrototypeLandingPage';
import { PrototypeProvider, usePrototype } from '../src/v2/state/PrototypeProvider';
import {
  addCareUpdate,
  advanceDemoReadCursor,
  createInitialPrototypeState,
  currentActorGrantPaths,
  currentPrototypeAssigneeProjection,
  demoActionOperationAvailability,
  demoActionCreationAvailability,
  deriveCurrentPrototypeResponsibilityCycle,
  resolveQuestion,
  selectDemoActor,
  transitionAction
} from '../src/v2/state/prototypeState';
import { caseActivityResponseForCurrentActor, visibleTimelineForCurrentActor } from '../src/v2/state/caseCollaborationSelectors';
import type { NewUpdateInput } from '../src/v2/types/prototype';
import { acceptPrototypeInvitation, canCurrentActorAccessCase, managerReassignmentItems, removeWorkspaceCaseAccess, setProfessionalVerification, simulateInvitationLogin } from '../src/v2/state/invitationWorkspaceState';

function acceptedSunCase() {
  let state = simulateInvitationLogin(createInitialPrototypeState(), 'invite-professional-pending');
  state = setProfessionalVerification(state, 'invite-professional-pending', 'VERIFIED');
  return acceptPrototypeInvitation(state, 'invite-professional-pending');
}

function addLinkedQuestionAndAction(state = acceptedSunCase()) {
  const familyState = selectDemoActor({ ...state, currentAccountId: 'sun-manager-account' }, 'sun-case', { identityId: 'demo-identity-sun-manager', membershipId: 'demo-membership-sun-manager' }, 'FAMILY');
  return addCareUpdate(familyState, {
    caseId: 'sun-case',
    kind: 'QUESTION',
    occurredDate: '2026-08-25',
    occurredTime: '15:00',
    content: '請協助確認本次皮膚觀察是否需要後續追蹤',
    source: '虛構家屬提問',
    actor: { identityId: 'demo-identity-sun-manager', membershipId: 'demo-membership-sun-manager' },
    actorDisplayRole: 'FAMILY',
    purpose: '家庭個案協作管理',
    sharingScope: 'DIRECT_PARTICIPANTS',
    needsAction: true,
    assignee: { identityId: 'demo-identity-invited-nurse', membershipId: 'membership-from-invite-professional-pending' },
    assigneeDisplayRole: 'NURSE',
    dueAt: '2026-08-27T17:00'
  }, new Date('2026-08-25T07:00:00Z'));
}

describe('v2 frontend prototype state', () => {
  it('does not allow an action to jump from pending acceptance to completed', () => {
    const state = createInitialPrototypeState();
    const next = transitionAction(state, 'action-skin-check', 'COMPLETED');
    expect(next).toBe(state);
    expect(next.actions[0].status).toBe('PENDING_ACCEPTANCE');
  });

  it('moves an accepted action into progress and then completed', () => {
    const initial = selectDemoActor(createInitialPrototypeState(), 'demo-case', { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }, 'NURSE');
    const accepted = transitionAction(initial, 'action-skin-check', 'ACCEPTED');
    const active = transitionAction(accepted, 'action-skin-check', 'IN_PROGRESS');
    const completed = transitionAction(active, 'action-skin-check', 'COMPLETED');
    expect(accepted.actions[0].status).toBe('ACCEPTED');
    expect(active.actions[0].status).toBe('IN_PROGRESS');
    expect(completed.actions[0].status).toBe('COMPLETED');
  });

  it('does not let a different concrete participant perform the assignee transition', () => {
    const state = createInitialPrototypeState();
    expect(transitionAction(state, 'action-skin-check', 'ACCEPTED')).toBe(state);
  });

  it('does not silently select the first of multiple exact effective paths', () => {
    const state = selectDemoActor(createInitialPrototypeState(), 'demo-case', { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }, 'NURSE');
    const duplicate = {
      ...state,
      roleGrants: [...state.roleGrants, { ...state.roleGrants.find((grant) => grant.id === 'demo-grant-nurse')!, id: 'duplicate-nurse-grant' }]
    };
    expect(demoActionOperationAvailability(duplicate, 'action-skin-check', 'ACCEPTED')).toMatchObject({
      source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'AMBIGUOUS_DEMO_PATH'
    });
    expect(transitionAction(duplicate, 'action-skin-check', 'ACCEPTED')).toBe(duplicate);
  });

  it('requires the frozen operation-specific capability and labels the result non-authoritative', () => {
    const state = selectDemoActor(createInitialPrototypeState(), 'demo-case', { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }, 'NURSE');
    expect(demoActionOperationAvailability(state, 'action-skin-check', 'ACCEPTED')).toEqual({
      source: 'DEMO_NON_AUTHORITATIVE',
      allowed: true
    });
    const missingCapability = {
      ...state,
      roleGrants: state.roleGrants.map((grant) => grant.id === 'demo-grant-nurse'
        ? { ...grant, capabilities: grant.capabilities.filter((capability) => capability !== 'ACTION_ACCEPT') }
        : grant)
    };
    expect(demoActionOperationAvailability(missingCapability, 'action-skin-check', 'ACCEPTED')).toEqual({
      source: 'DEMO_NON_AUTHORITATIVE',
      allowed: false,
      unavailableReason: 'CAPABILITY_MISSING'
    });
  });

  it('does not let the same identity use a different membership lifecycle for the old assignment', () => {
    const initial = selectDemoActor(createInitialPrototypeState(), 'demo-case', { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }, 'NURSE');
    const changed = {
      ...initial,
      memberships: initial.memberships.map((membership) => membership.id === 'demo-membership-nurse'
        ? { ...membership, status: 'EXPIRED' as const }
        : membership).concat({
          id: 'demo-membership-nurse-v2', identityId: 'demo-identity-nurse', caseId: 'demo-case',
          relationship: 'PROFESSIONAL_SERVICE' as const, status: 'ACTIVE' as const, validUntil: '2026-12-31'
        }),
      roleGrants: initial.roleGrants.map((grant) => grant.id === 'demo-grant-nurse'
        ? { ...grant, membershipId: 'demo-membership-nurse-v2' }
        : grant)
    };
    const state = selectDemoActor(changed, 'demo-case', { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse-v2' }, 'NURSE');
    expect(demoActionOperationAvailability(state, 'action-skin-check', 'ACCEPTED')).toEqual({
      source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'NOT_CURRENT_ASSIGNEE'
    });
  });

  it('does not let another identity with the same display role replace the assignee', () => {
    const initial = createInitialPrototypeState();
    const state = {
      ...initial,
      activeRole: 'NURSE' as const,
      currentAccountId: 'other-nurse-account',
      demoActorSelections: { ...initial.demoActorSelections, 'demo-case': { participant: { identityId: 'other-nurse-identity', membershipId: 'other-nurse-membership' }, displayRole: 'NURSE' as const } },
      identities: [...initial.identities, {
        id: 'other-nurse-identity', accountId: 'other-nurse-account', identityType: 'PROFESSIONAL' as const,
        professionalType: 'NURSE' as const, verificationStatus: 'VERIFIED' as const, isPrimary: true
      }],
      memberships: [...initial.memberships, {
        id: 'other-nurse-membership', identityId: 'other-nurse-identity', caseId: 'demo-case',
        relationship: 'PROFESSIONAL_SERVICE' as const, status: 'ACTIVE' as const, validUntil: '2026-12-31'
      }],
      roleGrants: [...initial.roleGrants, {
        id: 'other-nurse-grant', membershipId: 'other-nurse-membership', actingRole: 'NURSE' as const,
        purpose: '日照護理服務紀錄與交接', targetScopes: ['RECORD' as const], sharingScopes: ['DIRECT_PARTICIPANTS' as const],
        capabilities: ['ACTION_ACCEPT'], validUntil: '2026-12-31'
      }]
    };
    expect(demoActionOperationAvailability(state, 'action-skin-check', 'ACCEPTED')).toEqual({
      source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'NOT_CURRENT_ASSIGNEE'
    });
  });

  it('derives the current assignee only from zero or one effective responsibility cycle', () => {
    const state = createInitialPrototypeState();
    expect(deriveCurrentPrototypeResponsibilityCycle({ ...state, responsibilityCycles: [] }, 'action-skin-check')).toBeNull();
    expect(currentPrototypeAssigneeProjection({ ...state, responsibilityCycles: [] }, 'action-skin-check')).toBeNull();
    expect(deriveCurrentPrototypeResponsibilityCycle(state, 'action-skin-check')?.assignee).toEqual({
      identityId: 'demo-identity-nurse',
      membershipId: 'demo-membership-nurse'
    });
    const duplicate = { ...state.responsibilityCycles[0], id: 'responsibility-cycle-skin-duplicate' };
    expect(() => deriveCurrentPrototypeResponsibilityCycle({
      ...state,
      responsibilityCycles: [...state.responsibilityCycles, duplicate]
    }, 'action-skin-check')).toThrow('MULTIPLE_EFFECTIVE_RESPONSIBILITY_CYCLES');
  });

  it('does not project an ended responsibility cycle as the current assignee', () => {
    const state = createInitialPrototypeState();
    const ended = {
      ...state,
      responsibilityCycles: state.responsibilityCycles.map((cycle) => cycle.actionId === 'action-skin-check'
        ? { ...cycle, status: 'ENDED' as const, endedAt: '2026-08-25T12:00:00.000Z' }
        : cycle)
    };
    expect(currentPrototypeAssigneeProjection(ended, 'action-skin-check')).toBeNull();
  });

  it('keeps a question independent when its action is completed', () => {
    const initial = selectDemoActor(createInitialPrototypeState(), 'demo-case', { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }, 'NURSE');
    const accepted = transitionAction(initial, 'action-skin-check', 'ACCEPTED');
    const active = transitionAction(accepted, 'action-skin-check', 'IN_PROGRESS');
    const completed = transitionAction(active, 'action-skin-check', 'COMPLETED');
    expect(completed.questions.find((item) => item.id === 'skin-question')?.status).toBe('ANSWERED');
    expect(completed.actions.find((item) => item.id === 'action-skin-check')?.status).toBe('COMPLETED');
  });

  it('keeps demo read cursors scoped to exact identity, membership lifecycle and case', () => {
    const state = createInitialPrototypeState();
    const boundary = { source: 'DEMO_NON_AUTHORITATIVE' as const, caseId: 'demo-case', value: 'demo-boundary:demo-case:2' };
    const advanced = advanceDemoReadCursor(state, 'demo-case', boundary);
    expect(advanced.readCursors).toEqual([{
      owner: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' },
      caseId: 'demo-case',
      boundary
    }]);
    const newLifecycle = {
      ...advanced,
      memberships: advanced.memberships.map((membership) => membership.id === 'demo-membership-family'
        ? { ...membership, status: 'EXPIRED' as const }
        : membership).concat({
          id: 'demo-membership-family-v2', identityId: 'demo-identity-family', caseId: 'demo-case',
          relationship: 'FAMILY_MEMBER' as const, status: 'ACTIVE' as const, validUntil: null
        }),
      roleGrants: advanced.roleGrants.map((grant) => grant.id === 'demo-grant-family'
        ? { ...grant, membershipId: 'demo-membership-family-v2' }
        : grant)
    };
    const selectedNewLifecycle = selectDemoActor(newLifecycle, 'demo-case', { identityId: 'demo-identity-family', membershipId: 'demo-membership-family-v2' }, 'FAMILY');
    const second = advanceDemoReadCursor(selectedNewLifecycle, 'demo-case', boundary);
    expect(second.readCursors).toHaveLength(2);
    expect(second.readCursors.map((cursor) => cursor.owner.membershipId)).toEqual([
      'demo-membership-family', 'demo-membership-family-v2'
    ]);
  });

  it('orders activity by demo sequence and keeps the boundary separate from display time', () => {
    const state = createInitialPrototypeState();
    const altered = {
      ...state,
      timeline: state.timeline.map((entry) => entry.activitySequence === 1
        ? { ...entry, recordedAt: '2099-01-01T00:00:00+08:00' }
        : entry)
    };
    const response = caseActivityResponseForCurrentActor(altered, 'demo-case');
    const sequences = response.items.map((item) => item.demoSequence);
    expect(sequences).toEqual([...sequences].sort((a, b) => b - a));
    expect(response.items[0].demoSequence).toBe(7);
    expect(response.latestBoundary?.value).not.toBe(response.items[0].displayTimestamp);
  });

  it('requires a separate question resolution action', () => {
    const state = createInitialPrototypeState();
    const resolved = resolveQuestion(state, 'skin-question');
    expect(state.questions.find((item) => item.id === 'skin-question')?.status).toBe('ANSWERED');
    expect(resolved.questions.find((item) => item.id === 'skin-question')?.status).toBe('RESOLVED');
  });

  it('adds a new care update and optional action only to in-memory state', () => {
    const state = createInitialPrototypeState();
    const input: NewUpdateInput = {
      caseId: 'demo-case', kind: 'OBSERVATION', occurredDate: '2026-08-25', occurredTime: '09:00',
      content: '今天起身時需要多一點扶持', source: '虛構家屬觀察',
      actor: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' }, actorDisplayRole: 'FAMILY',
      purpose: '家庭共同照顧', sharingScope: 'DIRECT_PARTICIPANTS', needsAction: true,
      assignee: { identityId: 'demo-identity-day-care', membershipId: 'demo-membership-day-care' }, assigneeDisplayRole: 'DAY_CARE', dueAt: '2026-08-26T17:00'
    };
    const next = addCareUpdate(state, input, new Date('2026-08-25T01:05:00Z'));
    expect(next.timeline).toHaveLength(state.timeline.length + 1);
    expect(next.timeline[0].summary).toBe(input.content);
    expect(next.actions).toHaveLength(state.actions.length + 1);
    expect(next.actions.at(-1)?.status).toBe('PENDING_ACCEPTANCE');
    expect(state.timeline).toHaveLength(6);
    expect(demoActionCreationAvailability(state, input.caseId, input.actor)).toEqual({ source: 'DEMO_NON_AUTHORITATIVE', allowed: true });
    const recordScopeOnly = {
      ...state,
      roleGrants: state.roleGrants.map((grant) => grant.id === 'demo-grant-family'
        ? { ...grant, targetScopes: ['RECORD' as const] }
        : grant)
    };
    expect(addCareUpdate(recordScopeOnly, input)).toBe(recordScopeOnly);
  });

  it('stores exact Question authorship alongside the display label', () => {
    const state = createInitialPrototypeState();
    const next = addCareUpdate(state, {
      caseId: 'demo-case', kind: 'QUESTION', occurredDate: '2026-08-25', occurredTime: '09:00',
      content: '作者精確性測試', source: '虛構來源',
      actor: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' }, actorDisplayRole: 'FAMILY',
      purpose: '家庭共同照顧', sharingScope: 'DIRECT_PARTICIPANTS', needsAction: false
    });
    expect(next.questions.at(-1)).toMatchObject({
      author: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' },
      askedBy: '家屬'
    });
  });

  it('rejects wrong identity plus correct membership while accepting the exact participant', () => {
    const state = createInitialPrototypeState();
    const input: NewUpdateInput = {
      caseId: 'demo-case', kind: 'OBSERVATION', occurredDate: '2026-08-25', occurredTime: '09:00',
      content: '精確參與者測試', source: '虛構來源',
      actor: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' }, actorDisplayRole: 'FAMILY',
      purpose: '家庭共同照顧', sharingScope: 'SHARED_CARE', needsAction: false
    };
    expect(addCareUpdate(state, { ...input, actor: { identityId: 'wrong-identity', membershipId: 'demo-membership-family' } })).toBe(state);
    expect(addCareUpdate(state, input).timeline).toHaveLength(state.timeline.length + 1);
  });

  it('does not leak a hidden family-only entry when switching concrete demo participants', () => {
    const state = createInitialPrototypeState();
    const familyIds = visibleTimelineForCurrentActor(state, 'demo-case').map((entry) => entry.id);
    const dayCare = selectDemoActor(state, 'demo-case', { identityId: 'demo-identity-day-care', membershipId: 'demo-membership-day-care' }, 'DAY_CARE');
    const dayCareIds = visibleTimelineForCurrentActor(dayCare, 'demo-case').map((entry) => entry.id);
    expect(familyIds).toContain('family-private-note');
    expect(dayCareIds).not.toContain('family-private-note');
    expect(dayCareIds).not.toContain('question-skin');
  });

  it('exposes the required prototype and fictional-data notice', () => {
    expect(V2_PRODUCT_NAME).toBe('WinWin');
    expect(V2_PRODUCT_LOGO).toMatch(/winwin-wordmark\.png$/);
    expect(V2_PRODUCT_LOGO_ALT).toBe('WinWin');
    expect([V2_PRODUCT_LOGO_WIDTH, V2_PRODUCT_LOGO_HEIGHT]).toEqual([1916, 386]);
    expect(V2_PRODUCT_TAGLINE).toBe('跨角色照顧協作 Prototype');
    expect(BASE_DOCUMENT_TITLE).toBe('WinWin｜高齡支持照顧系統');
    expect(V2_DOCUMENT_TITLE).toBe('WinWin v2 流程展示');
    expect(V2_PROTOTYPE_NOTICE).toContain('WinWin v2 流程展示');
    expect(V2_PROTOTYPE_NOTICE).toContain('虛構資料');
    expect(V2_PROTOTYPE_NOTICE).toContain('重新整理後會重置');
    expect(V2_PRODUCT_DESCRIPTION).toContain(V2_PRODUCT_NAME);
  });

  it('keeps the provider adapter marker explicit', () => {
    function AdapterProbe() {
      return createElement('span', null, usePrototype().adapterKind);
    }
    expect(renderToStaticMarkup(createElement(PrototypeProvider, null, createElement(AdapterProbe)))).toContain('DEMO_NON_AUTHORITATIVE');
  });

  it('keeps the wordmark in the shared header without repeating it in the landing hero', () => {
    const landingMarkup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/v2/prototype'] },
      createElement(PrototypeProvider, null, createElement(PrototypeLandingPage))
    ));
    const shellMarkup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/v2/prototype'] },
      createElement(PrototypeProvider, null, createElement(PrototypeShell))
    ));

    expect(landingMarkup).toContain(V2_PRODUCT_TAGLINE);
    expect(landingMarkup).toContain('選擇你想體驗的流程');
    expect(landingMarkup).not.toContain('winwin-wordmark.png');
    expect(shellMarkup).toContain('winwin-wordmark.png');
    expect(shellMarkup).toContain('返回 WinWin v2 流程展示首頁');
  });

  it('keeps a newly created question and action linked through one immutable id', () => {
    const accepted = acceptedSunCase();
    const manager = selectDemoActor({ ...accepted, currentAccountId: 'sun-manager-account' }, 'sun-case', { identityId: 'demo-identity-sun-manager', membershipId: 'demo-membership-sun-manager' }, 'FAMILY');
    expect(currentActorGrantPaths(manager, 'sun-case').map((path) => path.grant.id)).toEqual(['demo-grant-sun-manager']);
    const state = addLinkedQuestionAndAction(accepted);
    const question = state.questions.at(-1)!;
    const action = state.actions.at(-1)!;
    expect(question.caseId).toBe('sun-case');
    expect(action.caseId).toBe('sun-case');
    expect(action.linkedQuestionId).toBe(question.id);
    expect(question.sourceTimelineEntryId).toBe(state.timeline[0].id);
  });

  it('completes the linked action without resolving its question, then resolves the same question independently', () => {
    let state = addLinkedQuestionAndAction();
    const questionId = state.questions.at(-1)!.id;
    const actionId = state.actions.at(-1)!.id;
    state = selectDemoActor({ ...state, currentAccountId: 'invited-nurse-account' }, 'sun-case', { identityId: 'demo-identity-invited-nurse', membershipId: 'membership-from-invite-professional-pending' }, 'NURSE');
    state = transitionAction(state, actionId, 'ACCEPTED');
    state = transitionAction(state, actionId, 'IN_PROGRESS');
    state = transitionAction(state, actionId, 'COMPLETED');
    expect(state.questions.find((item) => item.id === questionId)?.status).toBe('OPEN');
    const manager = selectDemoActor({ ...state, currentAccountId: 'sun-manager-account' }, 'sun-case', { identityId: 'demo-identity-sun-manager', membershipId: 'demo-membership-sun-manager' }, 'FAMILY');
    const resolved = resolveQuestion(manager, questionId);
    expect(resolved.questions.find((item) => item.id === questionId)?.status).toBe('RESOLVED');
    expect(resolved.actions.find((item) => item.id === actionId)?.linkedQuestionId).toBe(questionId);
  });

  it('moves the same unfinished action to reassignment and hides it from the expired nurse path', () => {
    let state = addLinkedQuestionAndAction();
    const questionId = state.questions.at(-1)!.id;
    const actionId = state.actions.at(-1)!.id;
    state = selectDemoActor({ ...state, currentAccountId: 'invited-nurse-account' }, 'sun-case', { identityId: 'demo-identity-invited-nurse', membershipId: 'membership-from-invite-professional-pending' }, 'NURSE');
    state = transitionAction(state, actionId, 'ACCEPTED');
    state = transitionAction(state, actionId, 'IN_PROGRESS');
    const expired = removeWorkspaceCaseAccess(state, 'sun-case', 'EXPIRED');
    expect(expired.actions.find((item) => item.id === actionId)?.status).toBe('NEEDS_REASSIGNMENT');
    expect(expired.actions.find((item) => item.id === actionId)?.linkedQuestionId).toBe(questionId);
    expect(expired.responsibilityHistory.find((item) => item.actionId === actionId)?.previousStatus).toBe('IN_PROGRESS');
    expect(canCurrentActorAccessCase(expired, 'sun-case')).toBe(false);
    expect(managerReassignmentItems(expired, 'sun-case')).toEqual([]);
    const managerView = selectDemoActor({ ...expired, currentAccountId: 'sun-manager-account' }, 'sun-case', { identityId: 'demo-identity-sun-manager', membershipId: 'demo-membership-sun-manager' }, 'FAMILY');
    expect(canCurrentActorAccessCase(managerView, 'sun-case')).toBe(true);
    expect(managerReassignmentItems(managerView, 'sun-case').map((item) => item.action.id)).toEqual([actionId]);
  });
});
