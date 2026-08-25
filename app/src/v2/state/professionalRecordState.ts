import type {
  FamilyProfessionalRecordProjection,
  ProfessionalRecordDraft,
  ProfessionalRecordVersion,
  PrototypeState
} from '../types/prototype';
import { currentActorGrantPaths } from './prototypeState';

export const PROFESSIONAL_RECORD_DEMO_LABEL = '護理師展示情境';

export const EMPTY_PROFESSIONAL_RECORD_DRAFT: ProfessionalRecordDraft = {
  caseId: 'demo-case',
  actingRole: 'NURSE',
  purpose: '日照護理服務紀錄與交接',
  sharingScope: 'SHARED_CARE',
  content: {
    serviceDate: '2026-08-25',
    startedAt: '14:00',
    endedAt: '14:30',
    serviceLocation: '安心日照（虛構）',
    subjectReport: '',
    objectiveObservation: '',
    assessmentSummary: '',
    serviceProvided: '',
    followUpPlan: '',
    followUpDueDate: '2026-08-27',
    professionalOnlyNotes: ''
  }
};

export type ProfessionalRecordErrors = Partial<Record<
  | 'serviceDate'
  | 'startedAt'
  | 'endedAt'
  | 'serviceLocation'
  | 'objectiveObservation'
  | 'serviceProvided'
  | 'followUpPlan'
  | 'correctionReason',
  string
>>;

export function canCreateProfessionalRecord(
  state: PrototypeState,
  caseId: string,
  now = new Date('2026-08-25T12:00:00+08:00')
) {
  return currentActorGrantPaths(state, caseId, now).some(({ grant }) =>
      grant.actingRole === 'NURSE'
      && grant.capabilities.includes('CREATE_PROFESSIONAL_RECORD')
  );
}

export function validateProfessionalRecordDraft(draft: ProfessionalRecordDraft): ProfessionalRecordErrors {
  const errors: ProfessionalRecordErrors = {};
  if (!draft.content.serviceDate) errors.serviceDate = '請選擇服務日期';
  if (!draft.content.startedAt) errors.startedAt = '請填寫開始時間';
  if (!draft.content.endedAt) errors.endedAt = '請填寫結束時間';
  if (draft.content.startedAt && draft.content.endedAt && draft.content.endedAt <= draft.content.startedAt) errors.endedAt = '結束時間必須晚於開始時間';
  if (!draft.content.serviceLocation.trim()) errors.serviceLocation = '請填寫虛構服務地點';
  if (!draft.content.objectiveObservation.trim()) errors.objectiveObservation = '請填寫客觀觀察';
  if (!draft.content.serviceProvided.trim()) errors.serviceProvided = '請填寫處置或服務內容';
  if (!draft.content.followUpPlan.trim()) errors.followUpPlan = '請填寫後續追蹤方式';
  if (draft.correctionOfVersionId && !draft.correctionReason?.trim()) errors.correctionReason = '請說明本次更正原因';
  return errors;
}

export function hasProfessionalRecordErrors(errors: ProfessionalRecordErrors) {
  return Object.keys(errors).length > 0;
}

export function latestProfessionalRecordVersions(state: PrototypeState, caseId: string) {
  const latestByRecord = new Map<string, ProfessionalRecordVersion>();
  for (const version of state.professionalRecordVersions.filter((item) => item.caseId === caseId)) {
    const current = latestByRecord.get(version.recordId);
    if (!current || version.versionNumber > current.versionNumber) latestByRecord.set(version.recordId, version);
  }
  return [...latestByRecord.values()].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export function professionalRecordVersions(state: PrototypeState, recordId: string) {
  return state.professionalRecordVersions
    .filter((item) => item.recordId === recordId)
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

export function professionalRecordVersion(state: PrototypeState, recordId: string) {
  return professionalRecordVersions(state, recordId)[0] ?? null;
}

export function createCorrectionDraft(version: ProfessionalRecordVersion): ProfessionalRecordDraft {
  return {
    caseId: version.caseId,
    actingRole: version.actingRole,
    purpose: version.purpose,
    sharingScope: version.sharingScope,
    content: structuredClone(version.content),
    recordId: version.recordId,
    correctionOfVersionId: version.id,
    correctionReason: ''
  };
}

export function publishProfessionalRecord(
  state: PrototypeState,
  draft: ProfessionalRecordDraft,
  now = new Date('2026-08-25T15:10:00+08:00')
): PrototypeState {
  if (!canCreateProfessionalRecord(state, draft.caseId, now) || hasProfessionalRecordErrors(validateProfessionalRecordDraft(draft))) return state;
  const existingVersions = draft.recordId ? professionalRecordVersions(state, draft.recordId) : [];
  if (draft.correctionOfVersionId && existingVersions[0]?.id !== draft.correctionOfVersionId) return state;
  const recordId = draft.recordId ?? `professional-record-demo-${state.professionalRecordVersions.length + 1}`;
  const versionNumber = existingVersions.length + 1;
  const id = `${recordId}-v${versionNumber}`;
  const timestamp = now.toISOString();
  const version: ProfessionalRecordVersion = {
    id,
    recordId,
    caseId: draft.caseId,
    versionNumber,
    authorName: '陳護理師',
    actingRole: 'NURSE',
    purpose: draft.purpose,
    sharingScope: draft.sharingScope,
    occurredAt: `${draft.content.serviceDate}T${draft.content.startedAt}:00+08:00`,
    recordedAt: timestamp,
    publishedAt: timestamp,
    supersedesVersionId: draft.correctionOfVersionId,
    correctionReason: draft.correctionReason?.trim() || undefined,
    content: structuredClone(draft.content)
  };
  return {
    ...state,
    professionalRecordVersions: [...state.professionalRecordVersions, version],
    successMessage: versionNumber > 1 ? '已追加更正；原始版本仍完整保留' : '已發布虛構專業照顧紀錄'
  };
}

export function familyProfessionalRecordProjection(
  state: PrototypeState,
  recordId: string
): FamilyProfessionalRecordProjection | null {
  const version = professionalRecordVersion(state, recordId);
  if (!version || version.sharingScope !== 'SHARED_CARE') return null;
  return {
    recordId: version.recordId,
    versionNumber: version.versionNumber,
    authorLabel: `${version.authorName}｜日照護理師（虛構）`,
    occurredAt: version.occurredAt,
    purpose: version.purpose,
    objectiveObservation: version.content.objectiveObservation,
    serviceProvided: version.content.serviceProvided,
    followUpPlan: version.content.followUpPlan,
    followUpDueDate: version.content.followUpDueDate,
    wasCorrected: version.versionNumber > 1
  };
}
