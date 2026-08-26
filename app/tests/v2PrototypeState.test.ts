import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { V2_DOCUMENT_TITLE, V2_PRODUCT_DESCRIPTION, V2_PRODUCT_LOGO, V2_PRODUCT_LOGO_ALT, V2_PRODUCT_LOGO_HEIGHT, V2_PRODUCT_LOGO_WIDTH, V2_PRODUCT_NAME, V2_PRODUCT_TAGLINE, V2_PROTOTYPE_NOTICE } from '../src/v2/data/branding';
import { PrototypeShell } from '../src/v2/components/PrototypeShell';
import { PrototypeLandingPage } from '../src/v2/pages/PrototypeLandingPage';
import { PrototypeProvider } from '../src/v2/state/PrototypeProvider';
import {
  addCareUpdate,
  createInitialPrototypeState,
  currentActorGrantPaths,
  resolveQuestion,
  transitionAction,
  visibleTimelineEntries
} from '../src/v2/state/prototypeState';
import type { NewUpdateInput } from '../src/v2/types/prototype';
import { acceptPrototypeInvitation, canCurrentActorAccessCase, managerReassignmentItems, removeWorkspaceCaseAccess, setProfessionalVerification, simulateInvitationLogin } from '../src/v2/state/invitationWorkspaceState';

function acceptedSunCase() {
  let state = simulateInvitationLogin(createInitialPrototypeState(), 'invite-professional-pending');
  state = setProfessionalVerification(state, 'invite-professional-pending', 'VERIFIED');
  return acceptPrototypeInvitation(state, 'invite-professional-pending');
}

function addLinkedQuestionAndAction(state = acceptedSunCase()) {
  const familyState = { ...state, currentAccountId: 'sun-manager-account', activeRole: 'FAMILY' as const };
  return addCareUpdate(familyState, {
    caseId: 'sun-case',
    kind: 'QUESTION',
    occurredDate: '2026-08-25',
    occurredTime: '15:00',
    content: '請協助確認本次皮膚觀察是否需要後續追蹤',
    source: '虛構家屬提問',
    actingRole: 'FAMILY',
    purpose: '家庭個案協作管理',
    sharingScope: 'DIRECT_PARTICIPANTS',
    needsAction: true,
    assigneeRole: 'NURSE',
    dueAt: '2026-08-27T17:00'
  }, new Date('2026-08-25T07:00:00Z'));
}

describe('v2 frontend prototype state', () => {
  it('does not allow an action to jump from pending acceptance to completed', () => {
    const state = createInitialPrototypeState();
    const next = transitionAction(state, 'action-skin-check', 'COMPLETED', 'NURSE');
    expect(next).toBe(state);
    expect(next.actions[0].status).toBe('PENDING_ACCEPTANCE');
  });

  it('moves an accepted action into progress and then completed', () => {
    const initial = { ...createInitialPrototypeState(), activeRole: 'NURSE' as const };
    const accepted = transitionAction(initial, 'action-skin-check', 'ACCEPTED', 'NURSE');
    const active = transitionAction(accepted, 'action-skin-check', 'IN_PROGRESS', 'NURSE');
    const completed = transitionAction(active, 'action-skin-check', 'COMPLETED', 'NURSE');
    expect(accepted.actions[0].status).toBe('ACCEPTED');
    expect(active.actions[0].status).toBe('IN_PROGRESS');
    expect(completed.actions[0].status).toBe('COMPLETED');
  });

  it('does not let a different acting role perform the assignee transition', () => {
    const state = createInitialPrototypeState();
    expect(transitionAction(state, 'action-skin-check', 'ACCEPTED', 'FAMILY')).toBe(state);
  });

  it('keeps a question independent when its action is completed', () => {
    const initial = createInitialPrototypeState();
    const accepted = transitionAction(initial, 'action-skin-check', 'ACCEPTED', 'NURSE');
    const active = transitionAction(accepted, 'action-skin-check', 'IN_PROGRESS', 'NURSE');
    const completed = transitionAction(active, 'action-skin-check', 'COMPLETED', 'NURSE');
    expect(completed.questions.find((item) => item.id === 'skin-question')?.status).toBe('ANSWERED');
  });

  it('requires a separate question resolution action', () => {
    const state = createInitialPrototypeState();
    const resolved = resolveQuestion(state, 'skin-question', 'FAMILY');
    expect(state.questions.find((item) => item.id === 'skin-question')?.status).toBe('ANSWERED');
    expect(resolved.questions.find((item) => item.id === 'skin-question')?.status).toBe('RESOLVED');
  });

  it('adds a new care update and optional action only to in-memory state', () => {
    const state = createInitialPrototypeState();
    const input: NewUpdateInput = {
      caseId: 'demo-case', kind: 'OBSERVATION', occurredDate: '2026-08-25', occurredTime: '09:00',
      content: '今天起身時需要多一點扶持', source: '虛構家屬觀察', actingRole: 'FAMILY',
      purpose: '家庭共同照顧', sharingScope: 'DIRECT_PARTICIPANTS', needsAction: true,
      assigneeRole: 'DAY_CARE', dueAt: '2026-08-26T17:00'
    };
    const next = addCareUpdate(state, input, new Date('2026-08-25T01:05:00Z'));
    expect(next.timeline).toHaveLength(state.timeline.length + 1);
    expect(next.timeline[0].summary).toBe(input.content);
    expect(next.actions).toHaveLength(state.actions.length + 1);
    expect(next.actions.at(-1)?.status).toBe('PENDING_ACCEPTANCE');
    expect(state.timeline).toHaveLength(6);
  });

  it('does not leak a hidden family-only entry when switching demo roles', () => {
    const state = createInitialPrototypeState();
    const familyIds = visibleTimelineEntries(state, 'FAMILY').map((entry) => entry.id);
    const dayCareIds = visibleTimelineEntries(state, 'DAY_CARE').map((entry) => entry.id);
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
    expect(V2_DOCUMENT_TITLE).toBe('WinWin v2 流程展示');
    expect(V2_PROTOTYPE_NOTICE).toContain('WinWin v2 流程展示');
    expect(V2_PROTOTYPE_NOTICE).toContain('虛構資料');
    expect(V2_PROTOTYPE_NOTICE).toContain('重新整理後會重置');
    expect(V2_PRODUCT_DESCRIPTION).toContain(V2_PRODUCT_NAME);
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
    const manager = { ...accepted, currentAccountId: 'sun-manager-account', activeRole: 'FAMILY' as const };
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
    state = { ...state, currentAccountId: 'invited-nurse-account', activeRole: 'NURSE' };
    state = transitionAction(state, actionId, 'ACCEPTED', 'NURSE');
    state = transitionAction(state, actionId, 'IN_PROGRESS', 'NURSE');
    state = transitionAction(state, actionId, 'COMPLETED', 'NURSE');
    expect(state.questions.find((item) => item.id === questionId)?.status).toBe('OPEN');
    const resolved = resolveQuestion({ ...state, currentAccountId: 'sun-manager-account', activeRole: 'FAMILY' }, questionId, 'FAMILY');
    expect(resolved.questions.find((item) => item.id === questionId)?.status).toBe('RESOLVED');
    expect(resolved.actions.find((item) => item.id === actionId)?.linkedQuestionId).toBe(questionId);
  });

  it('moves the same unfinished action to reassignment and hides it from the expired nurse path', () => {
    let state = addLinkedQuestionAndAction();
    const questionId = state.questions.at(-1)!.id;
    const actionId = state.actions.at(-1)!.id;
    state = { ...state, currentAccountId: 'invited-nurse-account', activeRole: 'NURSE' };
    state = transitionAction(state, actionId, 'ACCEPTED', 'NURSE');
    state = transitionAction(state, actionId, 'IN_PROGRESS', 'NURSE');
    const expired = removeWorkspaceCaseAccess(state, 'sun-case', 'EXPIRED');
    expect(expired.actions.find((item) => item.id === actionId)?.status).toBe('NEEDS_REASSIGNMENT');
    expect(expired.actions.find((item) => item.id === actionId)?.linkedQuestionId).toBe(questionId);
    expect(expired.responsibilityHistory.find((item) => item.actionId === actionId)?.previousStatus).toBe('IN_PROGRESS');
    expect(canCurrentActorAccessCase(expired, 'sun-case')).toBe(false);
    expect(managerReassignmentItems(expired, 'sun-case')).toEqual([]);
    const managerView = { ...expired, currentAccountId: 'sun-manager-account', activeRole: 'FAMILY' as const };
    expect(canCurrentActorAccessCase(managerView, 'sun-case')).toBe(true);
    expect(managerReassignmentItems(managerView, 'sun-case').map((item) => item.action.id)).toEqual([actionId]);
  });
});
