import { describe, expect, it } from 'vitest';
import {
  caseActivityForCurrentActor,
  visibleActionsForCurrentActor,
  visibleCareCircleForCurrentActor,
  visibleProfessionalRecordsForCurrentActor,
  visibleQuestionsForCurrentActor,
  visibleTimelineForCurrentActor
} from '../src/v2/state/caseCollaborationSelectors';
import { publishProfessionalRecord, createCorrectionDraft, professionalRecordVersion } from '../src/v2/state/professionalRecordState';
import { addCareUpdate, createInitialPrototypeState, transitionAction } from '../src/v2/state/prototypeState';
import { EMPTY_PROFESSIONAL_RECORD_DRAFT } from '../src/v2/state/professionalRecordState';
import type { PrototypeState } from '../src/v2/types/prototype';

function restrictedDayCareState() {
  const state = createInitialPrototypeState();
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

  it('rejects direct update mutations without ADD_UPDATE or with an unauthorized scope', () => {
    const state = createInitialPrototypeState();
    const input = {
      caseId: 'demo-case', kind: 'OBSERVATION' as const, occurredDate: '2026-08-25', occurredTime: '10:00', content: '虛構觀察', source: '虛構來源', actingRole: 'FAMILY' as const, purpose: '家庭共同照顧', sharingScope: 'SHARED_CARE' as const, needsAction: false
    };
    const noCapability = { ...state, roleGrants: state.roleGrants.map((grant) => grant.id === 'demo-grant-family' ? { ...grant, capabilities: grant.capabilities.filter((item) => item !== 'ADD_UPDATE') } : grant) };
    expect(addCareUpdate(noCapability, input)).toBe(noCapability);
    expect(addCareUpdate(state, { ...input, sharingScope: 'AUTHOR_ONLY' })).toBe(state);
  });

  it('does not treat another actor with the same role as the author of AUTHOR_ONLY content', () => {
    let state: PrototypeState = { ...createInitialPrototypeState(), activeRole: 'NURSE' };
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
      roleGrants: [...state.roleGrants, { id: 'other-nurse-grant', membershipId: 'other-nurse-membership', actingRole: 'NURSE', purpose: '日照護理服務紀錄與交接', sharingScopes: ['AUTHOR_ONLY'], capabilities: ['VIEW_PROFESSIONAL_CASE'], startsAt: '2026-08-01', validUntil: '2026-11-30' }]
    };
    expect(visibleProfessionalRecordsForCurrentActor(otherNurse, 'demo-case').some((record) => record.content.objectiveObservation.includes('僅原作者'))).toBe(false);
  });

  it('derives professional publish and correction activities from record versions', () => {
    let state: PrototypeState = { ...createInitialPrototypeState(), activeRole: 'NURSE' };
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
    let state: PrototypeState = { ...createInitialPrototypeState(), activeRole: 'NURSE' };
    state = transitionAction(state, 'action-skin-check', 'ACCEPTED', 'NURSE');
    state = transitionAction(state, 'action-skin-check', 'IN_PROGRESS', 'NURSE');
    state = transitionAction(state, 'action-skin-check', 'COMPLETED', 'NURSE');
    const activities = caseActivityForCurrentActor(state, 'demo-case').filter((item) => item.sourceType === 'ACTION');
    expect(activities).toHaveLength(3);
    expect(activities.every((item) => item.sourceId === 'action-skin-check')).toBe(true);
  });
});
