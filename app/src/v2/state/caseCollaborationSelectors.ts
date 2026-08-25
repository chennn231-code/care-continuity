import type {
  CareCircleMember,
  CaseActivityItem,
  DemoRole,
  ProfessionalRecordVersion,
  PrototypeAction,
  PrototypeGrantPath,
  PrototypeQuestion,
  PrototypeState,
  SharingScope,
  TimelineEntry
} from '../types/prototype';
import { currentActorGrantPaths } from './prototypeState';

function pathsForScope(state: PrototypeState, caseId: string, scope: SharingScope) {
  return currentActorGrantPaths(state, caseId).filter(({ grant }) => grant.sharingScopes.includes(scope));
}

export function currentActorCanViewScope(
  state: PrototypeState,
  caseId: string,
  scope: SharingScope,
  authorRole?: DemoRole,
  participantRoles: DemoRole[] = [],
  authorIdentityId?: string
) {
  return pathsForScope(state, caseId, scope).some(({ grant }) => {
    if (scope === 'AUTHOR_ONLY') {
      const path = currentActorGrantPaths(state, caseId).find((item) => item.grant.id === grant.id);
      return Boolean(authorIdentityId && path?.identity.id === authorIdentityId);
    }
    if (scope === 'FAMILY_ONLY') return grant.actingRole === 'FAMILY';
    if (scope === 'DIRECT_PARTICIPANTS') return participantRoles.includes(grant.actingRole) || authorRole === grant.actingRole;
    return grant.capabilities.includes('VIEW_SHARED_CARE') || grant.capabilities.includes('VIEW_PROFESSIONAL_CASE');
  });
}

export function currentActorCanViewTimelineEntry(state: PrototypeState, entry: TimelineEntry) {
  return currentActorCanViewScope(state, entry.caseId, entry.sharingScope, entry.authorRole, entry.participantRoles, entry.authorIdentityId);
}

export function visibleTimelineForCurrentActor(state: PrototypeState, caseId: string) {
  return state.timeline.filter((entry) => entry.caseId === caseId && currentActorCanViewTimelineEntry(state, entry));
}

function questionSource(state: PrototypeState, question: PrototypeQuestion) {
  return state.timeline.find((entry) => entry.id === question.sourceTimelineEntryId && entry.caseId === question.caseId) ?? null;
}

export function currentActorCanViewQuestion(state: PrototypeState, question: PrototypeQuestion) {
  const source = questionSource(state, question);
  return Boolean(source && currentActorCanViewTimelineEntry(state, source));
}

export function visibleQuestionsForCurrentActor(state: PrototypeState, caseId: string) {
  return state.questions.filter((question) => question.caseId === caseId && currentActorCanViewQuestion(state, question));
}

export function currentActorCanViewAction(state: PrototypeState, action: PrototypeAction) {
  const paths = currentActorGrantPaths(state, action.caseId);
  if (paths.length === 0) return false;
  const linkedQuestion = state.questions.find((question) => question.id === action.linkedQuestionId && question.caseId === action.caseId);
  if (linkedQuestion && !currentActorCanViewQuestion(state, linkedQuestion)) return false;
  return paths.some(({ grant }) =>
    grant.actingRole === action.assigneeRole
    || grant.capabilities.includes('MANAGE_MEMBERS')
    || grant.capabilities.includes('RESOLVE_QUESTION'));
}

export function visibleActionsForCurrentActor(state: PrototypeState, caseId: string) {
  return state.actions.filter((action) => action.caseId === caseId && currentActorCanViewAction(state, action));
}

export function currentActorCanViewProfessionalRecord(state: PrototypeState, record: ProfessionalRecordVersion) {
  return currentActorCanViewScope(state, record.caseId, record.sharingScope, record.actingRole, [record.actingRole], record.authorIdentityId);
}

export function currentActorCanViewFullProfessionalRecord(state: PrototypeState, record: ProfessionalRecordVersion) {
  return currentActorGrantPaths(state, record.caseId).some(({ grant }) =>
    grant.actingRole === record.actingRole
    && grant.sharingScopes.includes(record.sharingScope)
    && (grant.capabilities.includes('VIEW_PROFESSIONAL_CASE') || grant.capabilities.includes('CREATE_PROFESSIONAL_RECORD')));
}

export function visibleProfessionalRecordsForCurrentActor(state: PrototypeState, caseId: string) {
  const latest = new Map<string, ProfessionalRecordVersion>();
  for (const record of state.professionalRecordVersions.filter((item) => item.caseId === caseId && currentActorCanViewProfessionalRecord(state, item))) {
    const previous = latest.get(record.recordId);
    if (!previous || record.versionNumber > previous.versionNumber) latest.set(record.recordId, record);
  }
  return [...latest.values()].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export interface MinimalCareCircleMember {
  id: string;
  name: string;
  role: DemoRole;
  relationship: string;
  status: CareCircleMember['status'];
  purpose?: string;
  scopeSummary?: string;
  validFrom?: string;
  validUntil?: string | null;
}

export function visibleCareCircleForCurrentActor(state: PrototypeState, caseId: string): MinimalCareCircleMember[] {
  const paths = currentActorGrantPaths(state, caseId);
  if (paths.length === 0) return [];
  const canManage = paths.some(({ grant }) => grant.capabilities.includes('MANAGE_MEMBERS'));
  const actingRoles = new Set(paths.map(({ grant }) => grant.actingRole));
  return state.members
    .filter((member) => member.caseId === caseId && (canManage || actingRoles.has(member.role)))
    .map((member) => canManage ? member : {
      id: member.id,
      name: member.name,
      role: member.role,
      relationship: member.relationship,
      status: member.status
    });
}

export function updateGrantPaths(state: PrototypeState, caseId: string): PrototypeGrantPath[] {
  return currentActorGrantPaths(state, caseId).filter(({ grant }) => grant.capabilities.includes('ADD_UPDATE'));
}

export function allowedUpdateScopes(state: PrototypeState, caseId: string) {
  return Array.from(new Set(updateGrantPaths(state, caseId).flatMap(({ grant }) => grant.sharingScopes)));
}

export function allowedUpdateAssigneeRoles(state: PrototypeState, caseId: string) {
  return Array.from(new Set(state.members.filter((member) => member.caseId === caseId && member.status === 'ACTIVE').map((member) => member.role)));
}

export function canSubmitCareUpdate(state: PrototypeState, input: {
  caseId: string;
  actingRole: DemoRole;
  purpose: string;
  sharingScope: SharingScope;
  assigneeRole?: DemoRole;
}) {
  const pathAllowed = updateGrantPaths(state, input.caseId).some(({ grant }) =>
    grant.actingRole === input.actingRole
    && grant.purpose === input.purpose
    && grant.sharingScopes.includes(input.sharingScope));
  if (!pathAllowed) return false;
  return !input.assigneeRole || allowedUpdateAssigneeRoles(state, input.caseId).includes(input.assigneeRole);
}

export function caseActivityForCurrentActor(state: PrototypeState, caseId: string): CaseActivityItem[] {
  const timelineActivities: CaseActivityItem[] = state.timeline
    .filter((entry) => entry.caseId === caseId)
    .map((entry) => ({
      id: `activity-timeline-${entry.id}`,
      caseId,
      sourceType: 'TIMELINE_ENTRY',
      sourceId: entry.id,
      actorRole: entry.authorRole,
      actorLabel: entry.authorRole === 'FAMILY' ? '家屬' : entry.authorRole === 'NURSE' ? '護理人員' : '日照人員',
      actorIdentityId: entry.authorIdentityId,
      timestamp: entry.recordedAt,
      summary: entry.summary,
      sharingScope: entry.sharingScope,
      participantRoles: entry.participantRoles
    }));
  const recordActivities: CaseActivityItem[] = state.professionalRecordVersions
    .filter((record) => record.caseId === caseId)
    .map((record) => ({
      id: `activity-record-${record.id}`,
      caseId,
      sourceType: 'PROFESSIONAL_RECORD',
      sourceId: record.id,
      actorRole: record.actingRole,
      actorLabel: record.authorName,
      actorIdentityId: record.authorIdentityId,
      timestamp: record.publishedAt,
      summary: record.versionNumber === 1 ? '發布一筆專業照顧紀錄' : `追加更正專業照顧紀錄（版本 ${record.versionNumber}）`,
      sharingScope: record.sharingScope,
      participantRoles: [record.actingRole]
    }));
  const actionActivities: CaseActivityItem[] = state.actionStatusHistory
    .filter((history) => history.caseId === caseId)
    .map((history) => ({
      id: `activity-action-${history.id}`,
      caseId,
      sourceType: 'ACTION',
      sourceId: history.actionId,
      actorRole: history.actorRole,
      actorLabel: history.actorRole === 'FAMILY' ? '家屬' : history.actorRole === 'NURSE' ? '護理人員' : '日照人員',
      timestamp: history.changedAt,
      summary: `處理事項狀態：${history.fromStatus} → ${history.toStatus}`,
      sharingScope: 'DIRECT_PARTICIPANTS',
      participantRoles: [history.actorRole, state.actions.find((action) => action.id === history.actionId)?.assigneeRole ?? history.actorRole]
    }));
  const reassignmentActivities: CaseActivityItem[] = state.responsibilityHistory
    .filter((history) => history.caseId === caseId)
    .map((history) => ({
      id: `activity-reassignment-${history.id}`,
      caseId,
      sourceType: 'ACTION',
      sourceId: history.actionId,
      actorRole: state.actions.find((action) => action.id === history.actionId)?.assigneeRole ?? 'NURSE',
      actorLabel: history.formerAssigneeName,
      timestamp: history.endedAt,
      summary: history.summary,
      sharingScope: 'DIRECT_PARTICIPANTS',
      participantRoles: [state.actions.find((action) => action.id === history.actionId)?.assigneeRole ?? 'NURSE']
    }));
  return [...timelineActivities, ...recordActivities, ...actionActivities, ...reassignmentActivities]
    .filter((activity) => currentActorCanViewScope(state, activity.caseId, activity.sharingScope, activity.actorRole, activity.participantRoles, activity.actorIdentityId)
      || (activity.sourceType === 'ACTION' && currentActorGrantPaths(state, activity.caseId).some(({ grant }) => grant.capabilities.includes('MANAGE_MEMBERS'))))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
