import { INITIAL_PROTOTYPE_STATE } from '../data/mockData';
import type {
  ActionStatus,
  DemoRole,
  IdentityRegistrationMode,
  MockRoleGrant,
  NewUpdateInput,
  PrimaryIdentityType,
  ProfessionalType,
  PrototypeGrantPath,
  PrototypeIdentity,
  PrototypeState,
  SharingScope,
  TimelineEntry
} from '../types/prototype';

const ACTION_TRANSITIONS: Partial<Record<ActionStatus, ActionStatus[]>> = {
  PENDING_ACCEPTANCE: ['ACCEPTED', 'DECLINED'],
  ACCEPTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  NEEDS_REASSIGNMENT: ['PENDING_ACCEPTANCE']
};

export function createInitialPrototypeState(): PrototypeState {
  return structuredClone(INITIAL_PROTOTYPE_STATE);
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
  const identity = state.identities.find((item) => item.id === identityId);
  if (!identity || identity.verificationStatus !== 'VERIFIED') return false;
  return state.memberships.some((membership) => membership.identityId === identityId && membership.caseId === caseId && membership.status === 'ACTIVE');
}

export function validGrantPaths(state: PrototypeState, caseId: string): PrototypeGrantPath[] {
  return state.roleGrants.flatMap((grant) => {
    const membership = state.memberships.find((item) => item.id === grant.membershipId && item.caseId === caseId && item.status === 'ACTIVE');
    const identity = membership && state.identities.find((item) => item.id === membership.identityId && item.verificationStatus === 'VERIFIED');
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
  const workspaceCase = state.workspaceCases.find((item) => item.id === caseId);
  if (!workspaceCase || !['ACTIVE', 'EXPIRING'].includes(workspaceCase.accessStatus)) return [];
  if (now.getTime() < dateOnlyStartsAt(workspaceCase.serviceStartsAt)) return [];
  if (workspaceCase.serviceEndsAt && now.getTime() > dateOnlyEndsAt(workspaceCase.serviceEndsAt)) return [];

  return state.roleGrants.flatMap((grant) => {
    if (grant.actingRole !== state.activeRole || !grant.purpose.trim() || grant.capabilities.length === 0 || grant.sharingScopes.length === 0) return [];
    const membership = state.memberships.find((item) => item.id === grant.membershipId && item.caseId === caseId);
    if (!membership || membership.status !== 'ACTIVE') return [];
    if (membership.validUntil && now.getTime() > dateOnlyEndsAt(membership.validUntil)) return [];
    const identity = state.identities.find((item) => item.id === membership.identityId);
    if (!identity || identity.accountId !== state.currentAccountId || identity.verificationStatus !== 'VERIFIED') return [];
    if (grant.startsAt && now.getTime() < dateOnlyStartsAt(grant.startsAt)) return [];
    if (grant.validUntil && now.getTime() > dateOnlyEndsAt(grant.validUntil)) return [];
    return [{ identity, membership, grant }];
  });
}

export function shouldChooseActingContext(paths: PrototypeGrantPath[]) {
  return paths.length > 1;
}

export function grantPathAllows(grant: MockRoleGrant, requiredCapabilities: string[], requiredScope: SharingScope) {
  return requiredCapabilities.every((capability) => grant.capabilities.includes(capability)) && grant.sharingScopes.includes(requiredScope);
}

export function anySingleGrantPathAllows(paths: PrototypeGrantPath[], requiredCapabilities: string[], requiredScope: SharingScope) {
  return paths.some((path) => grantPathAllows(path.grant, requiredCapabilities, requiredScope));
}

export function canTransitionAction(from: ActionStatus, to: ActionStatus) {
  return ACTION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionAction(
  state: PrototypeState,
  actionId: string,
  nextStatus: ActionStatus,
  actingRole: DemoRole
): PrototypeState {
  const action = state.actions.find((item) => item.id === actionId);
  const hasCurrentPath = action && currentActorGrantPaths(state, action.caseId).some((path) => path.grant.actingRole === actingRole);
  if (!action || !hasCurrentPath || action.assigneeRole !== actingRole || !canTransitionAction(action.status, nextStatus)) return state;
  return {
    ...state,
    actions: state.actions.map((item) => item.id === actionId ? { ...item, status: nextStatus } : item),
    actionStatusHistory: [...state.actionStatusHistory, {
      id: `action-status-history-${action.id}-${state.actionStatusHistory.length + 1}`,
      caseId: action.caseId,
      actionId: action.id,
      fromStatus: action.status,
      toStatus: nextStatus,
      actorRole: actingRole,
      changedAt: new Date().toISOString()
    }],
    successMessage: nextStatus === 'COMPLETED' ? '已記錄負責者聲明處理完成，問題仍需另外確認是否解決' : '處理事項狀態已更新'
  };
}

export function resolveQuestion(state: PrototypeState, questionId: string, actingRole: DemoRole): PrototypeState {
  const question = state.questions.find((item) => item.id === questionId);
  if (!question) return state;
  const canResolve = currentActorGrantPaths(state, question.caseId).some((path) =>
    path.grant.actingRole === actingRole && path.grant.capabilities.includes('RESOLVE_QUESTION'));
  if (!canResolve) return state;
  return {
    ...state,
    questions: state.questions.map((question) => question.id === questionId ? { ...question, status: 'RESOLVED' } : question),
    successMessage: '已將問題標示為已解決'
  };
}

export function canRoleViewEntry(entry: TimelineEntry, role: DemoRole) {
  if (entry.sharingScope === 'SHARED_CARE') return true;
  if (entry.sharingScope === 'FAMILY_ONLY') return role === 'FAMILY';
  if (entry.sharingScope === 'AUTHOR_ONLY') return entry.authorRole === role;
  return entry.participantRoles?.includes(role) ?? entry.authorRole === role;
}

export function visibleTimelineEntries(state: PrototypeState, role = state.activeRole, caseId?: string) {
  return state.timeline.filter((entry) => (!caseId || entry.caseId === caseId) && canRoleViewEntry(entry, role));
}

function rolesForScope(scope: SharingScope, authorRole: DemoRole, assigneeRole?: DemoRole): DemoRole[] | undefined {
  if (scope !== 'DIRECT_PARTICIPANTS') return undefined;
  return Array.from(new Set([authorRole, ...(assigneeRole ? [assigneeRole] : [])]));
}

export function addCareUpdate(state: PrototypeState, input: NewUpdateInput, now = new Date()): PrototypeState {
  const allowedPath = currentActorGrantPaths(state, input.caseId, now).find(({ grant }) =>
    grant.actingRole === input.actingRole
    && grant.purpose === input.purpose
    && grant.capabilities.includes('ADD_UPDATE')
    && grant.sharingScopes.includes(input.sharingScope));
  const validAssignee = !input.needsAction || (Boolean(input.assigneeRole) && state.members.some((member) =>
    member.caseId === input.caseId && member.role === input.assigneeRole && member.status === 'ACTIVE'));
  if (!allowedPath || !validAssignee) return state;
  const id = `demo-update-${state.timeline.length + 1}`;
  const occurredAt = `${input.occurredDate}T${input.occurredTime}:00+08:00`;
  const entry: TimelineEntry = {
    id,
    caseId: input.caseId,
    kind: input.kind,
    summary: input.content.trim(),
    occurredAt,
    recordedAt: now.toISOString(),
    authorRole: input.actingRole,
    authorIdentityId: allowedPath.identity.id,
    source: input.source.trim(),
    sharingScope: input.sharingScope,
    participantRoles: rolesForScope(input.sharingScope, input.actingRole, input.assigneeRole),
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
        askedBy: input.actingRole === 'FAMILY' ? '家屬' : input.actingRole === 'NURSE' ? '陳護理師' : '日照人員'
      }]
    : state.questions;
  const nextActions = input.needsAction && input.assigneeRole && input.dueAt
    ? [...state.actions, {
        id: `demo-action-${state.actions.length + 1}`,
        caseId: input.caseId,
        title: `跟進：${input.content.trim().slice(0, 24)}`,
        detail: '由新增照顧變化時建立的虛構處理事項',
        assigneeRole: input.assigneeRole,
        assigneeName: input.assigneeRole === 'FAMILY' ? '林怡君' : input.assigneeRole === 'DAY_CARE' ? '王照服員' : '陳護理師',
        dueAt: input.dueAt,
        status: 'PENDING_ACCEPTANCE' as const,
        linkedQuestionId: questionId ?? ''
      }]
    : state.actions;
  return { ...state, timeline: [entry, ...state.timeline], questions: nextQuestions, actions: nextActions, successMessage: '已加入虛構照顧變化' };
}
