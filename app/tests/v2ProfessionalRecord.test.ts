import { describe, expect, it } from 'vitest';
import { V2_GUARDED_CASE_ROUTE_SUFFIXES } from '../src/v2/data/prototypeRoutes';
import { canCurrentActorAccessCase, removeWorkspaceCaseAccess } from '../src/v2/state/invitationWorkspaceState';
import {
  canCreateProfessionalRecord,
  createCorrectionDraft,
  EMPTY_PROFESSIONAL_RECORD_DRAFT,
  familyProfessionalRecordProjection,
  latestProfessionalRecordVersions,
  PROFESSIONAL_RECORD_DEMO_LABEL,
  professionalRecordVersion,
  professionalRecordVersions,
  publishProfessionalRecord,
  validateProfessionalRecordDraft
} from '../src/v2/state/professionalRecordState';
import { createInitialPrototypeState } from '../src/v2/state/prototypeState';

const completedDraft = () => ({
  ...structuredClone(EMPTY_PROFESSIONAL_RECORD_DRAFT),
  content: {
    ...structuredClone(EMPTY_PROFESSIONAL_RECORD_DRAFT.content),
    subjectReport: '長輩表示沒有疼痛。',
    objectiveObservation: '左前臂可見局部泛紅，未見破皮或滲液。',
    assessmentSummary: '依本次可見狀況持續觀察，不作診斷。',
    serviceProvided: '完成皮膚周邊清潔並向家屬說明客觀觀察。',
    followUpPlan: '下次服務再次觀察外觀變化。',
    professionalOnlyNotes: '僅供虛構專業工作交接的備註。'
  }
});

describe('v2 professional care record prototype', () => {
  it('labels the first template as a nurse demo scenario rather than all professions', () => {
    expect(PROFESSIONAL_RECORD_DEMO_LABEL).toBe('護理師展示情境');
    expect(EMPTY_PROFESSIONAL_RECORD_DRAFT.actingRole).toBe('NURSE');
  });

  it('requires one complete, verified and currently valid nurse grant path', () => {
    const state = createInitialPrototypeState();
    expect(canCreateProfessionalRecord(state, 'demo-case')).toBe(true);

    const expired = {
      ...state,
      roleGrants: state.roleGrants.map((grant) => grant.id === 'demo-grant-nurse'
        ? { ...grant, validUntil: '2026-08-24' }
        : grant)
    };
    expect(canCreateProfessionalRecord(expired, 'demo-case')).toBe(false);

    const unverified = {
      ...state,
      identities: state.identities.map((identity) => identity.id === 'demo-identity-nurse'
        ? { ...identity, verificationStatus: 'DECLARED' as const }
        : identity)
    };
    expect(canCreateProfessionalRecord(unverified, 'demo-case')).toBe(false);
  });

  it('does not combine the family grant with an incomplete professional grant', () => {
    const state = createInitialPrototypeState();
    const incomplete = {
      ...state,
      roleGrants: state.roleGrants.map((grant) => grant.id === 'demo-grant-nurse'
        ? { ...grant, sharingScopes: [] }
        : grant)
    };
    expect(incomplete.roleGrants.some((grant) => grant.actingRole === 'FAMILY' && grant.sharingScopes.length > 0)).toBe(true);
    expect(canCreateProfessionalRecord(incomplete, 'demo-case')).toBe(false);
  });

  it('validates required content and rejects an end time before the start time', () => {
    const draft = completedDraft();
    draft.content.objectiveObservation = '';
    draft.content.endedAt = '13:30';
    const errors = validateProfessionalRecordDraft(draft);
    expect(errors.objectiveObservation).toBeTruthy();
    expect(errors.endedAt).toContain('晚於');
  });

  it('publishes a source-rich immutable version without mutating the initial fixture', () => {
    const state = createInitialPrototypeState();
    const before = structuredClone(state);
    const next = publishProfessionalRecord(state, completedDraft());
    expect(state).toEqual(before);
    expect(next.professionalRecordVersions).toHaveLength(state.professionalRecordVersions.length + 1);
    const published = next.professionalRecordVersions.at(-1);
    expect(published).toMatchObject({
      authorName: '陳護理師',
      actingRole: 'NURSE',
      purpose: '日照護理服務紀錄與交接',
      sharingScope: 'SHARED_CARE',
      occurredAt: '2026-08-25T14:00:00+08:00'
    });
    expect(published?.recordedAt).toBeTruthy();
  });

  it('adds a correction version and preserves the complete original version', () => {
    const state = createInitialPrototypeState();
    const original = professionalRecordVersion(state, 'professional-record-demo-existing');
    expect(original).not.toBeNull();
    const originalSnapshot = structuredClone(original!);
    const correction = createCorrectionDraft(original!);
    correction.content.objectiveObservation = '更正：泛紅位置為左前臂外側，未見破皮。';
    correction.correctionReason = '補充更精確的位置描述';
    const next = publishProfessionalRecord(state, correction);
    const versions = professionalRecordVersions(next, original!.recordId);
    expect(versions).toHaveLength(2);
    expect(versions[0]).toMatchObject({ versionNumber: 2, supersedesVersionId: original!.id });
    expect(versions[1]).toEqual(originalSnapshot);
  });

  it('rejects a stale correction instead of overwriting a newer version', () => {
    const state = createInitialPrototypeState();
    const original = professionalRecordVersion(state, 'professional-record-demo-existing')!;
    const firstCorrection = createCorrectionDraft(original);
    firstCorrection.content.objectiveObservation = '第一次更正內容。';
    firstCorrection.correctionReason = '第一次更正';
    const corrected = publishProfessionalRecord(state, firstCorrection);
    const stale = createCorrectionDraft(original);
    stale.content.objectiveObservation = '不應被加入的舊版更正。';
    stale.correctionReason = '使用過期來源版本';
    expect(publishProfessionalRecord(corrected, stale)).toBe(corrected);
  });

  it('projects only explicitly shared family content without professional-only fields or hidden counts', () => {
    const state = createInitialPrototypeState();
    const projection = familyProfessionalRecordProjection(state, 'professional-record-demo-existing');
    expect(projection).not.toBeNull();
    const serialized = JSON.stringify(projection);
    expect(serialized).not.toContain('professionalOnlyNotes');
    expect(serialized).not.toContain('assessmentSummary');
    expect(serialized).not.toContain('僅供虛構專業工作交接');
    expect(serialized).not.toContain('hidden');
  });

  it('returns no family projection for author-only content', () => {
    const state = createInitialPrototypeState();
    const next = publishProfessionalRecord(state, { ...completedDraft(), sharingScope: 'AUTHOR_ONLY' });
    const record = latestProfessionalRecordVersions(next, 'demo-case').find((item) => item.recordId !== 'professional-record-demo-existing');
    expect(record).toBeTruthy();
    expect(familyProfessionalRecordProjection(next, record!.recordId)).toBeNull();
  });

  it('keeps all professional record routes behind the shared case access guard', () => {
    const lostAccess = removeWorkspaceCaseAccess(createInitialPrototypeState(), 'demo-case', 'REVOKED');
    const recordRoutes = V2_GUARDED_CASE_ROUTE_SUFFIXES.filter((route) => route.startsWith('records'));
    expect(recordRoutes).toHaveLength(4);
    for (const route of recordRoutes) expect(canCurrentActorAccessCase(lostAccess, 'demo-case'), route).toBe(false);
  });

  it('restores the fictional initial record after refresh-equivalent initialization', () => {
    const changed = publishProfessionalRecord(createInitialPrototypeState(), completedDraft());
    const refreshed = createInitialPrototypeState();
    expect(changed.professionalRecordVersions.length).toBeGreaterThan(refreshed.professionalRecordVersions.length);
    expect(refreshed.professionalRecordVersions).toHaveLength(1);
  });
});
