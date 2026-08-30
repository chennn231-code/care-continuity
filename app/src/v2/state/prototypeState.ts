import { INITIAL_PROTOTYPE_STATE } from '../data/mockData';
import type {
  ActivityBoundary,
  ActionStatus,
  DemoRole,
  IdentityRegistrationMode,
  MockRoleGrant,
  NewUpdateInput,
  PrimaryIdentityType,
  ProfessionalType,
  PrototypeGrantPath,
  PrototypeIdentity,
  PrototypeResponsibilityCycle,
  PrototypeState,
  SharingScope,
  TimelineEntry
} from '../types/prototype';
import type { CaseParticipantRef } from '../authorization/domainAuthorizationContract';

const ACTION_TRANSITIONS: Partial<Record<ActionStatus, ActionStatus[]>> = {
  PENDING_ACCEPTANCE: ['ACCEPTED', 'DECLINED'],
  ACCEPTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  NEEDS_REASSIGNMENT: ['PENDING_ACCEPTANCE']
};

export function createInitialPrototypeState(): PrototypeState {
  return structuredClone(INITIAL_PROTOTYPE_STATE);
}

function exactlyOneOrNull<T>(items: T[], invariant: string): T | null {
  if (items.length > 1) throw new Error(invariant);
  return items[0] ?? null;
}

export function beginIdentityRegistration(state: PrototypeState, mode: IdentityRegistrationMode): PrototypeState {
  return { ...state, identityDraft: { mode, identityType: null, professionalType: null }, successMessage: null };
}

export function selectIdentityType(state: PrototypeState, identityType: PrimaryIdentityType): PrototypeState {
  return { ...state, identityDraft: { ...state.identityDraft, identityType, professionalType: null }, successMessage: null };
}

export function selectProfessionalType(state: PrototypeState, professionalType: ProfessionalType): PrototypeState {
  if (state.identityDraft.identityType !== 'PROFESSIONAL') return state;
  return { ...state, identityDraft: { ...state.identityDraft, professionalType }, successMessage: null };
}

export function completeIdentityRegistration(state: PrototypeState): PrototypeState {
  const { mode, identityType, professionalType } = state.identityDraft;
  if (!identityType || (identityType === 'PROFESSIONAL' && !professionalType)) return state;
  const identity: PrototypeIdentity = {
    id: `prototype-identity-${state.identities.length + 1}`,
    accountId: state.currentAccountId,
    identityType,
    professionalType,
    verificationStatus: 'DECLARED',
    isPrimary: mode === 'PRIMARY'
  };
  const identities = mode === 'PRIMARY'
    ? [identity]
    : [...state.identities, { ...identity, isPrimary: false }];
  return {
    ...state,
    identities,
    memberships: mode === 'PRIMARY' ? [] : state.memberships,
    roleGrants: mode === 'PRIMARY' ? [] : state.roleGrants,
    identityDraft: { mode, identityType, professionalType },
    successMessage: mode === 'PRIMARY' ? '已記錄主要身分的虛構登錄狀態' : '已新增第二身分，尚待完成驗證'
  };
}

export function identityHasCaseAccess(state: PrototypeState, identityId: string, caseId: string) {
  const identity = exactlyOneOrNull(state.identities.filter((item) => item.id === identityId), 'MULTIPLE_EXACT_IDENTITIES');
  if (!identity || identity.verificationStatus !== 'VERIFIED') return false;
  return validGrantPaths(state, caseId).some(({ identity: pathIdentity }) => pathIdentity.id === identityId);
}

export function validGrantPaths(state: PrototypeState, caseId: string): PrototypeGrantPath[] {
  return state.roleGrants.flatMap((grant) => {
    const membership = exactlyOneOrNull(state.memberships.filter((item) => item.id === grant.membershipId && item.caseId === caseId && item.status === 'ACTIVE'), 'MULTIPLE_EXACT_GRANT_MEMBERSHIPS');
    const identity = membership && exactlyOneOrNull(state.identities.filter((item) => item.id === membership.identityId && item.verificationStatus === 'VERIFIED'), 'MULTIPLE_EXACT_GRANT_IDENTITIES');
    if (!membership || !identity) return [];
    return [{ identity, membership, grant }];
  });
}

function dateOnlyStartsAt(value: string) {
  return new Date(`${value}T00:00:00+08:00`).getTime();
}

function dateOnlyEndsAt(value: string) {
  return new Date(`${value}T23:59:59+08:00`).getTime();
}

export function currentActorGrantPaths(
  state: PrototypeState,
  caseId: string,
  now = new Date('2026-08-25T12:00:00+08:00')
): PrototypeGrantPath[] {
  const workspaceCase = exactlyOneOrNull(state.workspaceCases.filter((item) => item.id === caseId), 'MULTIPLE_EXACT_WORKSPACE_CASES');
  if (!workspaceCase || !['ACTIVE', 'EXPIRING'].includes(workspaceCase.accessStatus)) return [];
  if (now.getTime() < dateOnlyStartsAt(workspaceCase.serviceStartsAt)) return [];
  if (workspaceCase.serviceEndsAt && now.getTime() > dateOnlyEndsAt(workspaceCase.serviceEndsAt)) return [];

  const selection = state.demoActorSelections[caseId]?.participant;
  if (!selection) return [];
  return state.roleGrants.flatMap((grant) => {
    if (grant.membershipId !== selection.membershipId || !grant.purpose.trim() || grant.capabilities.length === 0 || grant.targetScopes.length === 0) return [];
    const membership = exactlyOneOrNull(state.memberships.filter((item) => item.id === grant.membershipId && item.caseId === caseId), 'MULTIPLE_EXACT_GRANT_MEMBERSHIPS');
    if (!membership || membership.status !== 'ACTIVE') return [];
    if (!sameParticipant(selection, { identityId: membership.identityId, membershipId: membership.id })) return [];
    if (membership.validUntil && now.getTime() > dateOnlyEndsAt(membership.validUntil)) return [];
    const identity = exactlyOneOrNull(state.identities.filter((item) => item.id === membership.identityId), 'MULTIPLE_EXACT_GRANT_IDENTITIES');
    if (!identity || identity.accountId !== state.currentAccountId || identity.verificationStatus !== 'VERIFIED') return [];
    if (grant.startsAt && now.getTime() < dateOnlyStartsAt(grant.startsAt)) return [];
    if (grant.validUntil && now.getTime() > dateOnlyEndsAt(grant.validUntil)) return [];
    return [{ identity, membership, grant }];
  });
}

export function selectDemoActor(
  state: PrototypeState,
  caseId: string,
  participant: CaseParticipantRef,
  displayRole: DemoRole
): PrototypeState {
  return {
    ...state,
    activeRole: displayRole,
    demoActorSelections: { ...state.demoActorSelections, [caseId]: { participant, displayRole } },
    successMessage: null
  };
}

export function shouldChooseActingContext(paths: PrototypeGrantPath[]) {
  return paths.length > 1;
}

export function grantPathAllows(grant: MockRoleGrant, requiredCapabilities: string[], requiredScope: 'CASE' | 'RECORD') {
  return requiredCapabilities.every((capability) => grant.capabilities.includes(capability)) && grant.targetScopes.includes(requiredScope);
}

export function anySingleGrantPathAllows(paths: PrototypeGrantPath[], requiredCapabilities: string[], requiredScope: 'CASE' | 'RECORD') {
  return paths.some((path) => grantPathAllows(path.grant, requiredCapabilities, requiredScope));
}

export function canTransitionAction(from: ActionStatus, to: ActionStatus) {
  return ACTION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function sameParticipant(left: CaseParticipantRef, right: CaseParticipantRef) {
  return left.identityId === right.identityId && left.membershipId === right.membershipId;
}

function participantForPath(path: PrototypeGrantPath): CaseParticipantRef {
  return { identityId: path.identity.id, membershipId: path.membership.id };
}

export function resolveCurrentDemoActor(state: PrototypeState, caseId: string): CaseParticipantRef | null {
  const participants = currentActorGrantPaths(state, caseId)
    .map(participantForPath)
    .filter((participant, index, all) => all.findIndex((candidate) => sameParticipant(candidate, participant)) === index);
  if (participants.length > 1) throw new Error('MULTIPLE_EFFECTIVE_DEMO_ACTORS');
  return participants[0] ?? null;
}

const EFFECTIVE_PROTOTYPE_RESPONSIBILITY_STATUSES: PrototypeResponsibilityCycle['status'][] = ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'];

export function deriveCurrentPrototypeResponsibilityCycle(state: PrototypeState, actionId: string) {
  const effective = state.responsibilityCycles.filter((cycle) =>
    cycle.actionId === actionId
    && cycle.endedAt === null
    && EFFECTIVE_PROTOTYPE_RESPONSIBILITY_STATUSES.includes(cycle.status));
  if (effective.length > 1) throw new Error('MULTIPLE_EFFECTIVE_RESPONSIBILITY_CYCLES');
  return effective[0] ?? null;
}

function responsibilityStatusForAction(status: ActionStatus): PrototypeResponsibilityCycle['status'] | null {
  if (status === 'PENDING_ACCEPTANCE') return 'ASSIGNED';
  if (status === 'ACCEPTED' || status === 'IN_PROGRESS' || status === 'COMPLETED') return status;
  return null;
}

export interface DemoOperationAvailability {
  source: 'DEMO_NON_AUTHORITATIVE';
  allowed: boolean;
  unavailableReason?: 'NO_CURRENT_RESPONSIBILITY' | 'NOT_CURRENT_ASSIGNEE' | 'NO_DEMO_PATH' | 'AMBIGUOUS_DEMO_PATH' | 'INVALID_TRANSITION' | 'CAPABILITY_MISSING';
}

function careUpdateOperationPaths(state: PrototypeState, input: Pick<NewUpdateInput, 'caseId' | 'actor' | 'purpose' | 'sharingScope'>, now: Date) {
  return currentActorGrantPaths(state, input.caseId, now).filter(({ identity, membership, grant }) =>
    sameParticipant(input.actor, { identityId: identity.id, membershipId: membership.id })
    && grant.purpose === input.purpose
    && grant.targetScopes.includes('CASE')
    && grant.capabilities.includes('CARE_UPDATE_CREATE')
    && grant.sharingScopes.includes(input.sharingScope));
}

export function demoCareUpdateOperationAvailability(
  state: PrototypeState,
  input: Pick<NewUpdateInput, 'caseId' | 'actor' | 'purpose' | 'sharingScope'>,
  now = new Date('2026-08-25T12:00:00+08:00')
): DemoOperationAvailability {
  const paths = careUpdateOperationPaths(state, input, now);
  if (paths.length > 1) return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'AMBIGUOUS_DEMO_PATH' };
  return paths.length === 1
    ? { source: 'DEMO_NON_AUTHORITATIVE', allowed: true }
    : { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'NO_DEMO_PATH' };
}

export function demoActionCreationAvailability(
  state: PrototypeState,
  caseId: string,
  actor: CaseParticipantRef,
  now = new Date('2026-08-25T12:00:00+08:00')
): DemoOperationAvailability {
  const paths = currentActorGrantPaths(state, caseId, now).filter(({ identity, membership, grant }) =>
    sameParticipant(actor, { identityId: identity.id, membershipId: membership.id })
    && grant.targetScopes.includes('CASE')
    && grant.capabilities.includes('ACTION_CREATE')
    && grant.capabilities.includes('ACTION_ASSIGN'));
  if (paths.length > 1) return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'AMBIGUOUS_DEMO_PATH' };
  return paths.length === 1
    ? { source: 'DEMO_NON_AUTHORITATIVE', allowed: true }
    : { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'NO_DEMO_PATH' };
}

const ACTION_OPERATION_CAPABILITY: Partial<Record<ActionStatus, string>> = {
  ACCEPTED: 'ACTION_ACCEPT',
  IN_PROGRESS: 'ACTION_START',
  COMPLETED: 'ACTION_COMPLETE'
};

export function currentPrototypeAssigneeProjection(state: PrototypeState, actionId: string) {
  const current = deriveCurrentPrototypeResponsibilityCycle(state, actionId);
  if (!current) return null;
  const member = state.members.find((item) => sameParticipant(item.participant, current.assignee));
  return {
    participant: current.assignee,
    displayName: member?.name ?? '虛構個案成員',
    displayRole: member?.role ?? null
  };
}

/** Demo CTA projection only. Real authorization remains a server/database concern. */
export function demoActionOperationAvailability(
  state: PrototypeState,
  actionId: string,
  nextStatus: ActionStatus
): DemoOperationAvailability {
  const action = exactlyOneOrNull(state.actions.filter((item) => item.id === actionId), 'MULTIPLE_EXACT_ACTIONS');
  const current = action ? deriveCurrentPrototypeResponsibilityCycle(state, action.id) : null;
  if (!action || !current) return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'NO_CURRENT_RESPONSIBILITY' };
  const actorPaths = currentActorGrantPaths(state, action.caseId);
  if (actorPaths.length === 0) return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'NO_DEMO_PATH' };
  const matchingPaths = actorPaths.filter((path) => sameParticipant(current.assignee, participantForPath(path)));
  if (matchingPaths.length === 0) {
    return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'NOT_CURRENT_ASSIGNEE' };
  }
  if (matchingPaths.length > 1) {
    return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'AMBIGUOUS_DEMO_PATH' };
  }
  const actorPath = matchingPaths[0];
  if (!canTransitionAction(action.status, nextStatus)) {
    return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'INVALID_TRANSITION' };
  }
  const requiredCapability = ACTION_OPERATION_CAPABILITY[nextStatus];
  if (!requiredCapability || !actorPath.grant.targetScopes.includes('RECORD') || !actorPath.grant.capabilities.includes(requiredCapability)) {
    return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'CAPABILITY_MISSING' };
  }
  return { source: 'DEMO_NON_AUTHORITATIVE', allowed: true };
}

export function transitionAction(
  state: PrototypeState,
  actionId: string,
  nextStatus: ActionStatus
): PrototypeState {
  const action = exactlyOneOrNull(state.actions.filter((item) => item.id === actionId), 'MULTIPLE_EXACT_ACTIONS');
  const availability = demoActionOperationAvailability(state, actionId, nextStatus);
  const current = action ? deriveCurrentPrototypeResponsibilityCycle(state, action.id) : null;
  const actorPaths = action && current
    ? currentActorGrantPaths(state, action.caseId).filter((path) => sameParticipant(current.assignee, participantForPath(path)))
    : [];
  const actorPath = actorPaths.length === 1 ? actorPaths[0] : null;
  const nextResponsibilityStatus = responsibilityStatusForAction(nextStatus);
  if (!action || !current || !actorPath || !nextResponsibilityStatus || !availability.allowed) return state;
  return {
    ...state,
    actions: state.actions.map((item) => item.id === actionId ? { ...item, status: nextStatus } : item),
    responsibilityCycles: state.responsibilityCycles.map((cycle) => cycle.id === current.id
      ? { ...cycle, status: nextResponsibilityStatus }
      : cycle),
    actionStatusHistory: [...state.actionStatusHistory, {
      id: `action-status-history-${action.id}-${state.actionStatusHistory.length + 1}`,
      caseId: action.caseId,
      actionId: action.id,
      fromStatus: action.status,
      toStatus: nextStatus,
      actor: { identityId: actorPath.identity.id, membershipId: actorPath.membership.id },
      actorDisplayRole: state.demoActorSelections[action.caseId]?.displayRole ?? actorPath.grant.actingRole,
      changedAt: demoRecordedAt(nextDemoActivitySequence(state, action.caseId)),
      activitySequence: nextDemoActivitySequence(state, action.caseId)
    }],
    successMessage: nextStatus === 'COMPLETED' ? '已記錄負責者聲明處理完成，問題仍需另外確認是否解決' : '處理事項狀態已更新'
  };
}

export function resolveQuestion(state: PrototypeState, questionId: string): PrototypeState {
  const question = exactlyOneOrNull(state.questions.filter((item) => item.id === questionId), 'MULTIPLE_EXACT_QUESTIONS');
  if (!question) return state;
  if (!demoQuestionOperationAvailability(state, questionId).allowed) return state;
  return {
    ...state,
    questions: state.questions.map((question) => question.id === questionId ? { ...question, status: 'RESOLVED' } : question),
    successMessage: '已將問題標示為已解決'
  };
}

export function demoQuestionOperationAvailability(state: PrototypeState, questionId: string): DemoOperationAvailability {
  const question = exactlyOneOrNull(state.questions.filter((item) => item.id === questionId), 'MULTIPLE_EXACT_QUESTIONS');
  if (!question) return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'NO_DEMO_PATH' };
  const source = state.timeline.find((entry) => entry.id === question.sourceTimelineEntryId && entry.caseId === question.caseId);
  if (!source) return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'NO_DEMO_PATH' };
  const paths = currentActorGrantPaths(state, question.caseId).filter((path) => {
    const actor = participantForPath(path);
    if (source.sharingScope === 'AUTHOR_ONLY') return sameParticipant(actor, source.author);
    if (source.sharingScope === 'FAMILY_ONLY') return path.membership.relationship === 'FAMILY_MEMBER';
    if (source.sharingScope === 'DIRECT_PARTICIPANTS') {
      return sameParticipant(actor, source.author)
        || (source.participantRefs ?? []).some((participant) => sameParticipant(actor, participant));
    }
    return path.grant.targetScopes.includes('RECORD') && path.grant.capabilities.includes('RECORD_VIEW');
  });
  if (paths.length === 0) return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'NO_DEMO_PATH' };
  const completePaths = paths.filter(({ grant }) => grant.targetScopes.includes('RECORD') && grant.capabilities.includes('QUESTION_RESOLVE'));
  if (completePaths.length === 0) {
    return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'CAPABILITY_MISSING' };
  }
  if (completePaths.length > 1) return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'AMBIGUOUS_DEMO_PATH' };
  return { source: 'DEMO_NON_AUTHORITATIVE', allowed: true };
}

export function nextDemoActivitySequence(state: PrototypeState, caseId: string) {
  const sequences = [
    ...state.timeline.filter((item) => item.caseId === caseId).map((item) => item.activitySequence),
    ...state.professionalRecordVersions.filter((item) => item.caseId === caseId).map((item) => item.activitySequence),
    ...state.actionStatusHistory.filter((item) => item.caseId === caseId).map((item) => item.activitySequence),
    ...state.responsibilityHistory.filter((item) => item.caseId === caseId).map((item) => item.activitySequence)
  ];
  return Math.max(0, ...sequences) + 1;
}

function demoRecordedAt(sequence: number) {
  return new Date(Date.parse('2026-08-25T04:00:00.000Z') + sequence * 60_000).toISOString();
}

export function demoActivityBoundary(caseId: string, sequence: number): ActivityBoundary {
  return { source: 'DEMO_NON_AUTHORITATIVE', caseId, value: `demo-boundary:${caseId}:${sequence}` };
}

function demoBoundarySequence(boundary: ActivityBoundary, caseId: string) {
  if (boundary.source !== 'DEMO_NON_AUTHORITATIVE' || boundary.caseId !== caseId) return null;
  const prefix = `demo-boundary:${caseId}:`;
  if (!boundary.value.startsWith(prefix)) return null;
  const sequence = Number(boundary.value.slice(prefix.length));
  return Number.isSafeInteger(sequence) && sequence >= 0 ? sequence : null;
}

export function advanceDemoReadCursor(state: PrototypeState, caseId: string, requestedBoundary: ActivityBoundary): PrototypeState {
  const owner = resolveCurrentDemoActor(state, caseId);
  const requestedSequence = demoBoundarySequence(requestedBoundary, caseId);
  if (!owner || requestedSequence === null || requestedSequence >= nextDemoActivitySequence(state, caseId)) return state;
  const existingMatches = state.readCursors.filter((cursor) => cursor.caseId === caseId && sameParticipant(cursor.owner, owner));
  if (existingMatches.length > 1) throw new Error('MULTIPLE_EXACT_READ_CURSORS');
  const existing = existingMatches[0] ?? null;
  const existingSequence = existing ? demoBoundarySequence(existing.boundary, caseId) : null;
  const resultingBoundary = existingSequence !== null && existingSequence > requestedSequence ? existing!.boundary : requestedBoundary;
  return {
    ...state,
    readCursors: [
      ...state.readCursors.filter((cursor) => cursor.caseId !== caseId || !sameParticipant(cursor.owner, owner)),
      { owner, caseId, boundary: resultingBoundary }
    ]
  };
}

function participantsForScope(scope: SharingScope, author: CaseParticipantRef, assignee?: CaseParticipantRef) {
  if (scope !== 'DIRECT_PARTICIPANTS') return undefined;
  const candidates = [author, ...(assignee ? [assignee] : [])];
  return candidates.filter((candidate, index) => candidates.findIndex((item) => sameParticipant(item, candidate)) === index);
}

function displayRolesForScope(scope: SharingScope, authorRole: DemoRole, assigneeRole?: DemoRole): DemoRole[] | undefined {
  if (scope !== 'DIRECT_PARTICIPANTS') return undefined;
  return Array.from(new Set([authorRole, ...(assigneeRole ? [assigneeRole] : [])]));
}

export function addCareUpdate(state: PrototypeState, input: NewUpdateInput, now?: Date): PrototypeState {
  const activitySequence = nextDemoActivitySequence(state, input.caseId);
  const serverLikeNow = now ?? new Date(demoRecordedAt(activitySequence));
  const allowedPaths = careUpdateOperationPaths(state, input, serverLikeNow);
  if (allowedPaths.length > 1) throw new Error('MULTIPLE_EFFECTIVE_UPDATE_PATHS');
  const allowedPath = allowedPaths[0] ?? null;
  const actionAvailability = input.needsAction
    ? demoActionCreationAvailability(state, input.caseId, input.actor, serverLikeNow)
    : { source: 'DEMO_NON_AUTHORITATIVE' as const, allowed: true };
  const validAssignee = !input.needsAction || (Boolean(input.assignee) && state.members.some((member) =>
    member.caseId === input.caseId && input.assignee && sameParticipant(member.participant, input.assignee) && member.status === 'ACTIVE'));
  if (!allowedPath || !actionAvailability.allowed || !validAssignee) return state;
  const id = `demo-update-${state.timeline.length + 1}`;
  const occurredAt = `${input.occurredDate}T${input.occurredTime}:00+08:00`;
  const entry: TimelineEntry = {
    id,
    caseId: input.caseId,
    kind: input.kind,
    summary: input.content.trim(),
    occurredAt,
    recordedAt: serverLikeNow.toISOString(),
    author: { identityId: allowedPath.identity.id, membershipId: allowedPath.membership.id },
    authorDisplayRole: input.actorDisplayRole,
    source: input.source.trim(),
    sharingScope: input.sharingScope,
    participantRefs: participantsForScope(input.sharingScope, input.actor, input.assignee),
    participantDisplayRoles: displayRolesForScope(input.sharingScope, input.actorDisplayRole, input.assigneeDisplayRole),
    activitySequence,
    version: 1,
    hasUpdatedVersion: false,
    isCurrentVersion: true
  };
  const questionId = input.kind === 'QUESTION' ? `demo-question-${state.questions.length + 1}` : null;
  const nextQuestions = questionId
    ? [...state.questions, {
        id: questionId,
        caseId: input.caseId,
        sourceTimelineEntryId: id,
        text: input.content.trim(),
        status: 'OPEN' as const,
        author: input.actor,
        askedBy: input.actorDisplayRole === 'FAMILY' ? '家屬' : input.actorDisplayRole === 'NURSE' ? '陳護理師' : '日照人員'
      }]
    : state.questions;
  const actionId = `demo-action-${state.actions.length + 1}`;
  const nextActions = input.needsAction && input.assignee && input.dueAt
    ? [...state.actions, {
        id: actionId,
        caseId: input.caseId,
        title: `跟進：${input.content.trim().slice(0, 24)}`,
        detail: '由新增照顧變化時建立的虛構處理事項',
        creator: input.actor,
        dueAt: input.dueAt,
        status: 'PENDING_ACCEPTANCE' as const,
        linkedQuestionId: questionId ?? ''
      }]
    : state.actions;
  const nextResponsibilityCycles = input.needsAction && input.assignee && input.dueAt
    ? [...state.responsibilityCycles, {
        id: `responsibility-cycle-${actionId}`,
        actionId,
        caseId: input.caseId,
        assignee: input.assignee,
        assignedBy: input.actor,
        status: 'ASSIGNED' as const,
        endedAt: null
      }]
    : state.responsibilityCycles;
  return {
    ...state,
    timeline: [entry, ...state.timeline],
    questions: nextQuestions,
    actions: nextActions,
    responsibilityCycles: nextResponsibilityCycles,
    successMessage: '已加入虛構照顧變化'
  };
}
