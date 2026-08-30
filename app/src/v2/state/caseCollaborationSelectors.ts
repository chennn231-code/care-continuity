import type {
  CareCircleMember,
  CaseActivityItem,
  CaseActivityResponse,
  DemoRole,
  ProfessionalRecordVersion,
  PrototypeAction,
  PrototypeGrantPath,
  PrototypeQuestion,
  PrototypeState,
  SharingScope,
  TimelineEntry
} from '../types/prototype';
import type { CaseParticipantRef } from '../authorization/domainAuthorizationContract';
import { currentActorGrantPaths, demoActivityBoundary, deriveCurrentPrototypeResponsibilityCycle, resolveCurrentDemoActor } from './prototypeState';

const relationshipLabels: Record<DemoRole, string> = {
  FAMILY: '家庭成員',
  DAY_CARE: '日照服務人員（虛構）',
  NURSE: '日照護理服務人員（虛構）'
};

export function currentCaseActorContext(state: PrototypeState, caseId: string) {
  const paths = currentActorGrantPaths(state, caseId);
  if (paths.length !== 1) return null;
  const path = paths[0];
  return {
    actingRole: path.grant.actingRole,
    relationshipLabel: relationshipLabels[path.grant.actingRole],
    purpose: path.grant.purpose
  };
}

function pathsForScope(state: PrototypeState, caseId: string, scope: SharingScope) {
  return currentActorGrantPaths(state, caseId).filter(({ grant }) =>
    grant.targetScopes.includes('RECORD')
    && grant.capabilities.includes('RECORD_VIEW')
    && grant.sharingScopes.includes(scope));
}

function sameParticipant(left: CaseParticipantRef, right: CaseParticipantRef) {
  return left.identityId === right.identityId && left.membershipId === right.membershipId;
}

function exactlyOneOrNull<T>(items: T[], invariant: string): T | null {
  if (items.length > 1) throw new Error(invariant);
  return items[0] ?? null;
}

export function currentActorCanViewScope(
  state: PrototypeState,
  caseId: string,
  scope: SharingScope,
  author?: CaseParticipantRef,
  participants: CaseParticipantRef[] = []
) {
  return pathsForScope(state, caseId, scope).some(({ identity, membership, grant }) => {
    const actor = { identityId: identity.id, membershipId: membership.id };
    if (scope === 'AUTHOR_ONLY') {
      return Boolean(author && sameParticipant(actor, author));
    }
    if (scope === 'FAMILY_ONLY') return membership.relationship === 'FAMILY_MEMBER';
    if (scope === 'DIRECT_PARTICIPANTS') {
      return Boolean(author && sameParticipant(actor, author)) || participants.some((participant) => sameParticipant(actor, participant));
    }
    return true;
  });
}

export function currentActorCanViewTimelineEntry(state: PrototypeState, entry: TimelineEntry) {
  return currentActorCanViewScope(state, entry.caseId, entry.sharingScope, entry.author, entry.participantRefs);
}

export function visibleTimelineForCurrentActor(state: PrototypeState, caseId: string) {
  return state.timeline.filter((entry) => entry.caseId === caseId && currentActorCanViewTimelineEntry(state, entry));
}

function questionSource(state: PrototypeState, question: PrototypeQuestion) {
  return exactlyOneOrNull(
    state.timeline.filter((entry) => entry.id === question.sourceTimelineEntryId && entry.caseId === question.caseId),
    'MULTIPLE_EXACT_QUESTION_SOURCES'
  );
}

export function currentActorCanViewQuestion(state: PrototypeState, question: PrototypeQuestion) {
  const source = questionSource(state, question);
  return Boolean(source && currentActorCanViewTimelineEntry(state, source));
}

export function visibleQuestionsForCurrentActor(state: PrototypeState, caseId: string) {
  return state.questions.filter((question) => question.caseId === caseId && currentActorCanViewQuestion(state, question));
}

export function currentActorCanViewAction(state: PrototypeState, action: PrototypeAction) {
  const paths = currentActorGrantPaths(state, action.caseId).filter(({ grant }) =>
    grant.targetScopes.includes('RECORD') && grant.capabilities.includes('RECORD_VIEW'));
  if (paths.length === 0) return false;
  const linkedQuestion = exactlyOneOrNull(
    state.questions.filter((question) => question.id === action.linkedQuestionId && question.caseId === action.caseId),
    'MULTIPLE_EXACT_LINKED_QUESTIONS'
  );
  if (linkedQuestion && !currentActorCanViewQuestion(state, linkedQuestion)) return false;
  const responsibility = deriveCurrentPrototypeResponsibilityCycle(state, action.id);
  return paths.some(({ identity, membership }) =>
    sameParticipant(action.creator, { identityId: identity.id, membershipId: membership.id })
    ||
    Boolean(responsibility && sameParticipant(responsibility.assignee, { identityId: identity.id, membershipId: membership.id }))
    || Boolean(linkedQuestion && currentActorCanViewQuestion(state, linkedQuestion)));
}

export function visibleActionsForCurrentActor(state: PrototypeState, caseId: string) {
  return state.actions.filter((action) => action.caseId === caseId && currentActorCanViewAction(state, action));
}

export function currentActorCanViewProfessionalRecord(state: PrototypeState, record: ProfessionalRecordVersion) {
  return currentActorCanViewScope(state, record.caseId, record.sharingScope, record.author, [record.author]);
}

export function currentActorCanViewFullProfessionalRecord(state: PrototypeState, record: ProfessionalRecordVersion) {
  return currentActorGrantPaths(state, record.caseId).some(({ identity, membership, grant }) =>
    sameParticipant(record.author, { identityId: identity.id, membershipId: membership.id })
    && grant.targetScopes.includes('RECORD')
    && grant.capabilities.includes('RECORD_VIEW')
    && grant.sharingScopes.includes(record.sharingScope)
    && grant.capabilities.includes('CREATE_PROFESSIONAL_RECORD'));
}

export function visibleProfessionalRecordsForCurrentActor(state: PrototypeState, caseId: string) {
  const latest = new Map<string, ProfessionalRecordVersion>();
  for (const record of state.professionalRecordVersions.filter((item) => item.caseId === caseId && currentActorCanViewProfessionalRecord(state, item))) {
    const previous = latest.get(record.recordId);
    if (previous?.versionNumber === record.versionNumber) throw new Error('MULTIPLE_CURRENT_PROFESSIONAL_RECORD_VERSIONS');
    if (!previous || record.versionNumber > previous.versionNumber) latest.set(record.recordId, record);
  }
  return [...latest.values()].sort((a, b) => b.activitySequence - a.activitySequence);
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
  const canManage = paths.some(({ grant }) => grant.targetScopes.includes('CASE') && grant.capabilities.includes('ACCESS_INVITE'));
  const actingParticipants = paths.map(({ identity, membership }) => ({ identityId: identity.id, membershipId: membership.id }));
  return state.members
    .filter((member) => member.caseId === caseId && (canManage || actingParticipants.some((participant) => sameParticipant(participant, member.participant))))
    .map((member) => canManage ? member : {
      id: member.id,
      name: member.name,
      role: member.role,
      relationship: member.relationship,
      status: member.status
    });
}

export function updateGrantPaths(state: PrototypeState, caseId: string): PrototypeGrantPath[] {
  return currentActorGrantPaths(state, caseId).filter(({ grant }) =>
    grant.targetScopes.includes('CASE') && grant.capabilities.includes('CARE_UPDATE_CREATE'));
}

export function allowedUpdateScopes(state: PrototypeState, caseId: string) {
  return Array.from(new Set(updateGrantPaths(state, caseId).flatMap(({ grant }) => grant.sharingScopes)));
}

export function allowedUpdateAssignees(state: PrototypeState, caseId: string) {
  return state.members
    .filter((member) => member.caseId === caseId && member.status === 'ACTIVE')
    .map((member) => ({ participant: member.participant, displayRole: member.role, displayName: member.name }));
}

export function canSubmitCareUpdate(state: PrototypeState, input: {
  caseId: string;
  actor: CaseParticipantRef;
  purpose: string;
  sharingScope: SharingScope;
  assignee?: CaseParticipantRef;
}) {
  const pathAllowed = updateGrantPaths(state, input.caseId).some(({ identity, membership, grant }) =>
    sameParticipant(input.actor, { identityId: identity.id, membershipId: membership.id })
    && grant.purpose === input.purpose
    && grant.sharingScopes.includes(input.sharingScope));
  if (!pathAllowed) return false;
  return !input.assignee || allowedUpdateAssignees(state, input.caseId).some(({ participant }) => sameParticipant(participant, input.assignee!));
}

export function caseActivityResponseForCurrentActor(state: PrototypeState, caseId: string): CaseActivityResponse {
  const timelineActivities: CaseActivityItem[] = state.timeline
    .filter((entry) => entry.caseId === caseId)
    .map((entry) => {
      const linkedQuestion = exactlyOneOrNull(state.questions.filter((question) => question.sourceTimelineEntryId === entry.id && question.caseId === caseId), 'MULTIPLE_EXACT_LINKED_QUESTIONS');
      const linkedAction = linkedQuestion
        ? exactlyOneOrNull(state.actions.filter((action) => action.linkedQuestionId === linkedQuestion.id && action.caseId === caseId), 'MULTIPLE_EXACT_LINKED_ACTIONS')
        : null;
      return {
      id: `activity-timeline-${entry.id}`,
      caseId,
      sourceType: 'TIMELINE_ENTRY',
      sourceId: entry.id,
      actor: entry.author,
      actorDisplayRole: entry.authorDisplayRole,
      actorLabel: entry.authorDisplayRole === 'FAMILY' ? '家屬' : entry.authorDisplayRole === 'NURSE' ? '護理人員' : '日照人員',
      displayTimestamp: entry.recordedAt,
      demoSequence: entry.activitySequence,
      boundary: demoActivityBoundary(caseId, entry.activitySequence),
      summary: entry.summary,
      sharingScope: entry.sharingScope,
      participantRefs: entry.participantRefs,
      participantDisplayRoles: entry.participantDisplayRoles,
      sourceLabel: entry.source,
      linkedQuestionId: linkedQuestion?.id,
      linkedQuestionStatus: linkedQuestion?.status,
      linkedActionId: linkedAction?.id,
      linkedActionStatus: linkedAction?.status
      };
    });
  const recordActivities: CaseActivityItem[] = state.professionalRecordVersions
    .filter((record) => record.caseId === caseId)
    .map((record) => ({
      id: `activity-record-${record.id}`,
      caseId,
      sourceType: 'PROFESSIONAL_RECORD',
      sourceId: record.id,
      actor: record.author,
      actorDisplayRole: record.actingRole,
      actorLabel: record.authorName,
      displayTimestamp: record.publishedAt,
      demoSequence: record.activitySequence,
      boundary: demoActivityBoundary(caseId, record.activitySequence),
      summary: record.versionNumber === 1 ? '發布一筆專業照顧紀錄' : `追加更正專業照顧紀錄（版本 ${record.versionNumber}）`,
      sharingScope: record.sharingScope,
      participantRefs: [record.author],
      participantDisplayRoles: [record.actingRole],
      sourceLabel: `專業照顧紀錄版本 ${record.versionNumber}`
    }));
  const actionActivities: CaseActivityItem[] = state.actionStatusHistory
    .filter((history) => history.caseId === caseId)
    .map((history) => {
      const action = exactlyOneOrNull(state.actions.filter((candidate) => candidate.id === history.actionId), 'MULTIPLE_EXACT_ACTIONS');
      const linkedQuestion = action
        ? exactlyOneOrNull(state.questions.filter((question) => question.id === action.linkedQuestionId), 'MULTIPLE_EXACT_LINKED_QUESTIONS')
        : null;
      return ({
      id: `activity-action-${history.id}`,
      caseId,
      sourceType: 'ACTION',
      sourceId: history.actionId,
      actor: history.actor,
      actorDisplayRole: history.actorDisplayRole,
      actorLabel: history.actorDisplayRole === 'FAMILY' ? '家屬' : history.actorDisplayRole === 'NURSE' ? '護理人員' : '日照人員',
      displayTimestamp: history.changedAt,
      demoSequence: history.activitySequence,
      boundary: demoActivityBoundary(caseId, history.activitySequence),
      summary: `處理事項狀態：${history.fromStatus} → ${history.toStatus}`,
      sharingScope: 'DIRECT_PARTICIPANTS',
      participantRefs: action ? [action.creator, history.actor] : [history.actor],
      participantDisplayRoles: [history.actorDisplayRole],
      sourceLabel: '處理事項狀態紀錄',
      linkedQuestionId: action?.linkedQuestionId,
      linkedQuestionStatus: linkedQuestion?.status,
      linkedActionId: history.actionId,
      linkedActionStatus: action?.status
    }); });
  const reassignmentActivities: CaseActivityItem[] = state.responsibilityHistory
    .filter((history) => history.caseId === caseId)
    .map((history) => {
      const action = exactlyOneOrNull(state.actions.filter((candidate) => candidate.id === history.actionId), 'MULTIPLE_EXACT_ACTIONS');
      const linkedQuestion = action
        ? exactlyOneOrNull(state.questions.filter((question) => question.id === action.linkedQuestionId), 'MULTIPLE_EXACT_LINKED_QUESTIONS')
        : null;
      return ({
      id: `activity-reassignment-${history.id}`,
      caseId,
      sourceType: 'ACTION',
      sourceId: history.actionId,
      actor: history.formerAssignee,
      actorDisplayRole: history.formerAssigneeDisplayRole,
      actorLabel: history.formerAssigneeName,
      displayTimestamp: history.endedAt,
      demoSequence: history.activitySequence,
      boundary: demoActivityBoundary(caseId, history.activitySequence),
      summary: history.summary,
      sharingScope: 'DIRECT_PARTICIPANTS',
      participantRefs: action ? [action.creator, history.formerAssignee] : [history.formerAssignee],
      participantDisplayRoles: [history.formerAssigneeDisplayRole],
      sourceLabel: '責任週期紀錄',
      linkedQuestionId: action?.linkedQuestionId,
      linkedQuestionStatus: linkedQuestion?.status,
      linkedActionId: history.actionId,
      linkedActionStatus: action?.status
    }); });
  const items = [...timelineActivities, ...recordActivities, ...actionActivities, ...reassignmentActivities]
    .filter((activity) => currentActorCanViewScope(state, activity.caseId, activity.sharingScope, activity.actor, activity.participantRefs))
    .sort((a, b) => b.demoSequence - a.demoSequence);
  const actor = resolveCurrentDemoActor(state, caseId);
  const storedCursorMatches = actor
    ? state.readCursors.filter((cursor) => cursor.caseId === caseId && sameParticipant(cursor.owner, actor))
    : [];
  if (storedCursorMatches.length > 1) throw new Error('MULTIPLE_EXACT_READ_CURSORS');
  const storedCursor = storedCursorMatches[0] ?? null;
  return {
    source: 'DEMO_NON_AUTHORITATIVE',
    items,
    latestBoundary: items[0]?.boundary ?? null,
    storedCursorBoundary: storedCursor?.boundary ?? null
  };
}

/** Compatibility helper for existing prototype screens; response metadata remains available above. */
export function caseActivityForCurrentActor(state: PrototypeState, caseId: string): CaseActivityItem[] {
  return caseActivityResponseForCurrentActor(state, caseId).items;
}
