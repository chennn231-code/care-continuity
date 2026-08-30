import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  caseActivityForCurrentActor,
  caseActivityResponseForCurrentActor,
  currentCaseActorContext,
  visibleActionsForCurrentActor,
  visibleCareCircleForCurrentActor,
  visibleProfessionalRecordsForCurrentActor,
  visibleQuestionsForCurrentActor,
  visibleTimelineForCurrentActor
} from '../src/v2/state/caseCollaborationSelectors';
import { PrototypeProvider } from '../src/v2/state/PrototypeProvider';
import { PrototypeShell } from '../src/v2/components/PrototypeShell';
import { PrototypeCaseHomePage } from '../src/v2/pages/PrototypeCaseHomePage';
import { canCreateProfessionalRecord, demoProfessionalRecordOperationAvailability, publishProfessionalRecord, createCorrectionDraft, professionalRecordVersion } from '../src/v2/state/professionalRecordState';
import { addCareUpdate, createInitialPrototypeState, demoCareUpdateOperationAvailability, demoQuestionOperationAvailability, resolveQuestion, selectDemoActor, transitionAction } from '../src/v2/state/prototypeState';
import { EMPTY_PROFESSIONAL_RECORD_DRAFT } from '../src/v2/state/professionalRecordState';
import type { PrototypeState } from '../src/v2/types/prototype';

function restrictedDayCareState() {
  const initial = createInitialPrototypeState();
  const state = selectDemoActor(initial, 'demo-case', { identityId: 'demo-identity-day-care', membershipId: 'demo-membership-day-care' }, 'DAY_CARE');
  return {
    ...state,
    activeRole: 'DAY_CARE' as const,
    roleGrants: state.roleGrants.map((grant) => grant.id === 'demo-grant-day-care'
      ? { ...grant, sharingScopes: ['DIRECT_PARTICIPANTS' as const] }
      : grant)
  };
}

describe('v2 case collaboration correction gate', () => {
  it('distinguishes case access from content-scope access', () => {
    const state = restrictedDayCareState();
    expect(state.workspaceCases.some((item) => item.id === 'demo-case')).toBe(true);
    expect(visibleTimelineForCurrentActor(state, 'demo-case')).toEqual([]);
    expect(visibleQuestionsForCurrentActor(state, 'demo-case')).toEqual([]);
    expect(visibleActionsForCurrentActor(state, 'demo-case')).toEqual([]);
    expect(visibleProfessionalRecordsForCurrentActor(state, 'demo-case')).toEqual([]);
  });

  it('minimizes care-circle data for a non-manager path', () => {
    const members = visibleCareCircleForCurrentActor(restrictedDayCareState(), 'demo-case');
    expect(members).toHaveLength(1);
    expect(members[0].role).toBe('DAY_CARE');
    expect(members[0].purpose).toBeUndefined();
    expect(members[0].scopeSummary).toBeUndefined();
  });

  it('rejects direct update mutations without CARE_UPDATE_CREATE or with an unauthorized visibility policy', () => {
    const state = createInitialPrototypeState();
    const input = {
      caseId: 'demo-case', kind: 'OBSERVATION' as const, occurredDate: '2026-08-25', occurredTime: '10:00', content: '虛構觀察', source: '虛構來源',
      actor: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' }, actorDisplayRole: 'FAMILY' as const,
      purpose: '家庭共同照顧', sharingScope: 'SHARED_CARE' as const, needsAction: false
    };
    const noCapability = { ...state, roleGrants: state.roleGrants.map((grant) => grant.id === 'demo-grant-family' ? { ...grant, capabilities: grant.capabilities.filter((item) => item !== 'CARE_UPDATE_CREATE') } : grant) };
    expect(demoCareUpdateOperationAvailability(state, input)).toEqual({ source: 'DEMO_NON_AUTHORITATIVE', allowed: true });
    expect(demoCareUpdateOperationAvailability(noCapability, input)).toMatchObject({ source: 'DEMO_NON_AUTHORITATIVE', allowed: false });
    expect(addCareUpdate(noCapability, input)).toBe(noCapability);
    expect(addCareUpdate(state, { ...input, sharingScope: 'AUTHOR_ONLY' })).toBe(state);
  });

  it('does not treat another actor with the same role as the author of AUTHOR_ONLY content', () => {
    let state: PrototypeState = selectDemoActor(createInitialPrototypeState(), 'demo-case', { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }, 'NURSE');
    const draft = structuredClone(EMPTY_PROFESSIONAL_RECORD_DRAFT);
    draft.sharingScope = 'AUTHOR_ONLY';
    draft.content.objectiveObservation = '僅原作者可見的虛構觀察';
    draft.content.serviceProvided = '虛構服務';
    draft.content.followUpPlan = '虛構追蹤';
    state = publishProfessionalRecord(state, draft);
    const otherNurse: PrototypeState = {
      ...state,
      currentAccountId: 'other-nurse-account',
      identities: [...state.identities, { id: 'other-nurse-identity', accountId: 'other-nurse-account', identityType: 'PROFESSIONAL', professionalType: 'NURSE', verificationStatus: 'VERIFIED', isPrimary: true }],
      memberships: [...state.memberships, { id: 'other-nurse-membership', identityId: 'other-nurse-identity', caseId: 'demo-case', relationship: 'PROFESSIONAL_SERVICE', status: 'ACTIVE', validUntil: '2026-11-30' }],
      demoActorSelections: { ...state.demoActorSelections, 'demo-case': { participant: { identityId: 'other-nurse-identity', membershipId: 'other-nurse-membership' }, displayRole: 'NURSE' } },
      roleGrants: [...state.roleGrants, { id: 'other-nurse-grant', membershipId: 'other-nurse-membership', actingRole: 'NURSE', purpose: '日照護理服務紀錄與交接', targetScopes: ['CASE', 'RECORD'], sharingScopes: ['AUTHOR_ONLY'], capabilities: ['RECORD_VIEW', 'CREATE_PROFESSIONAL_RECORD'], startsAt: '2026-08-01', validUntil: '2026-11-30' }]
    };
    expect(visibleProfessionalRecordsForCurrentActor(otherNurse, 'demo-case').some((record) => record.content.objectiveObservation.includes('僅原作者'))).toBe(false);
    const original = state.professionalRecordVersions.at(-1)!;
    const correction = createCorrectionDraft(original);
    correction.correctionReason = '同角色不同參與者不得更正';
    expect(publishProfessionalRecord(otherNurse, correction)).toBe(otherNurse);
  });

  it('does not let role presentation alone create or fully view a professional record', () => {
    const state = createInitialPrototypeState();
    const sameAccountRoleLabelOnly = { ...state, activeRole: 'NURSE' as const };
    expect(canCreateProfessionalRecord(sameAccountRoleLabelOnly, 'demo-case')).toBe(false);
    expect(demoProfessionalRecordOperationAvailability(sameAccountRoleLabelOnly, 'demo-case', 'CREATE')).toMatchObject({ source: 'DEMO_NON_AUTHORITATIVE', allowed: false });
    expect(currentCaseActorContext(sameAccountRoleLabelOnly, 'demo-case')?.actingRole).toBe('FAMILY');
    const roleOnly = { ...state, activeRole: 'NURSE' as const, currentAccountId: 'account-without-nurse-path' };
    expect(canCreateProfessionalRecord(roleOnly, 'demo-case')).toBe(false);
    expect(visibleProfessionalRecordsForCurrentActor(roleOnly, 'demo-case')).toEqual([]);
  });

  it('does not let a family role label alone resolve a question', () => {
    const state = { ...createInitialPrototypeState(), activeRole: 'FAMILY' as const, currentAccountId: 'account-without-family-path' };
    expect(demoQuestionOperationAvailability(state, 'skin-question')).toEqual({
      source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'NO_DEMO_PATH'
    });
    expect(resolveQuestion(state, 'skin-question')).toBe(state);
  });

  it('derives professional publish and correction activities from record versions', () => {
    let state: PrototypeState = selectDemoActor(createInitialPrototypeState(), 'demo-case', { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }, 'NURSE');
    const draft = structuredClone(EMPTY_PROFESSIONAL_RECORD_DRAFT);
    draft.content.objectiveObservation = '虛構客觀觀察';
    draft.content.serviceProvided = '虛構服務內容';
    draft.content.followUpPlan = '虛構追蹤方式';
    state = publishProfessionalRecord(state, draft);
    const published = state.professionalRecordVersions.at(-1)!;
    const correction = createCorrectionDraft(published);
    correction.correctionReason = '虛構更正理由';
    correction.content.objectiveObservation = '虛構更正後觀察';
    state = publishProfessionalRecord(state, correction);
    const activities = caseActivityForCurrentActor(state, 'demo-case').filter((item) => item.sourceType === 'PROFESSIONAL_RECORD' && item.sourceId.startsWith(published.recordId));
    expect(activities.map((item) => item.summary)).toEqual(expect.arrayContaining(['發布一筆專業照顧紀錄', '追加更正專業照顧紀錄（版本 2）']));
    expect(professionalRecordVersion(state, published.recordId)?.versionNumber).toBe(2);
  });

  it('derives action lifecycle activity with the original action source id', () => {
    let state: PrototypeState = selectDemoActor(createInitialPrototypeState(), 'demo-case', { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }, 'NURSE');
    state = transitionAction(state, 'action-skin-check', 'ACCEPTED');
    state = transitionAction(state, 'action-skin-check', 'IN_PROGRESS');
    state = transitionAction(state, 'action-skin-check', 'COMPLETED');
    const activities = caseActivityForCurrentActor(state, 'demo-case').filter((item) => item.sourceType === 'ACTION');
    expect(activities).toHaveLength(3);
    expect(activities.every((item) => item.sourceId === 'action-skin-check')).toBe(true);
    expect(activities.every((item) => item.linkedQuestionId === 'skin-question')).toBe(true);
    expect(activities.every((item) => item.linkedActionId === 'action-skin-check')).toBe(true);
    expect(activities.every((item) => item.linkedActionStatus === 'COMPLETED')).toBe(true);
  });

  it('orders activity by the demo boundary sequence rather than display timestamp', () => {
    const initial = createInitialPrototypeState();
    const state = {
      ...initial,
      timeline: initial.timeline.map((entry) => entry.id === 'update-observation-original'
        ? { ...entry, activitySequence: 100, recordedAt: '2020-01-01T00:00:00.000Z' }
        : entry.id === 'update-observation-current'
          ? { ...entry, activitySequence: 99, recordedAt: '2099-01-01T00:00:00.000Z' }
          : entry)
    };
    const response = caseActivityResponseForCurrentActor(state, 'demo-case');
    expect(response.source).toBe('DEMO_NON_AUTHORITATIVE');
    expect(response.items[0]).toMatchObject({
      sourceId: 'update-observation-original',
      displayTimestamp: '2020-01-01T00:00:00.000Z',
      demoSequence: 100,
      boundary: { source: 'DEMO_NON_AUTHORITATIVE', caseId: 'demo-case', value: 'demo-boundary:demo-case:100' }
    });
    expect(response.latestBoundary).toEqual(response.items[0].boundary);
  });

  it('derives question and action linkage without replacing their existing ids', () => {
    const state = createInitialPrototypeState();
    const activity = caseActivityForCurrentActor(state, 'demo-case').find((item) => item.sourceId === 'question-skin');
    expect(activity).toMatchObject({
      linkedQuestionId: 'skin-question',
      linkedQuestionStatus: 'ANSWERED',
      linkedActionId: 'action-skin-check',
      linkedActionStatus: 'PENDING_ACCEPTANCE'
    });
    expect(state.questions.find((item) => item.id === activity?.linkedQuestionId)?.sourceTimelineEntryId).toBe('question-skin');
    expect(state.actions.find((item) => item.id === activity?.linkedActionId)?.linkedQuestionId).toBe('skin-question');
  });

  it('renders shell and case home from the same active actor context', () => {
    const state = selectDemoActor(createInitialPrototypeState(), 'demo-case', { identityId: 'demo-identity-day-care', membershipId: 'demo-membership-day-care' }, 'DAY_CARE');
    expect(currentCaseActorContext(state, 'demo-case')).toEqual({
      actingRole: 'DAY_CARE',
      relationshipLabel: '日照服務人員（虛構）',
      purpose: '日照服務期間的照顧交接'
    });
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/v2/prototype/cases/demo-case'] },
      createElement(
        PrototypeProvider,
        { initialState: state },
        createElement(
          Routes,
          null,
          createElement(Route, { path: '/v2/prototype', element: createElement(PrototypeShell) },
            createElement(Route, { path: 'cases/:caseId', element: createElement(PrototypeCaseHomePage) }))
        )
      )
    ));
    expect(html.match(/目前個案關係：日照服務人員（虛構）/g)).toHaveLength(2);
    expect(html).toContain('授權依據：日照服務期間的照顧交接');
    expect(html).not.toContain('有效 grant path：家庭共同照顧');
  });
});
