import { currentActorGrantPaths, nextDemoActivitySequence, sameParticipant, type DemoOperationAvailability } from './prototypeState';
import type {
  InvitationEffectiveStatus,
  PrototypeInvitation,
  PrototypeInvitationInput,
  PrototypeResponsibilityHistory,
  PrototypeState,
  PrototypeWorkspaceCase,
  VerificationStatus,
  WorkspaceCaseAccessStatus
} from '../types/prototype';

export const PROTOTYPE_CLOCK = new Date('2026-08-25T12:00:00+08:00');

function invitationById(state: PrototypeState, invitationId: string) {
  const matches = state.invitations.filter((item) => item.id === invitationId);
  if (matches.length > 1) throw new Error('MULTIPLE_EXACT_INVITATIONS');
  return matches[0] ?? null;
}

function dateOnlyStartsAt(value: string) {
  return new Date(`${value}T00:00:00+08:00`).getTime();
}

function dateOnlyEndsAt(value: string) {
  return new Date(`${value}T23:59:59+08:00`).getTime();
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function maskCaseName(name: string) {
  return `${name.slice(0, 1)}○○長輩`;
}

export function effectiveInvitationStatus(invitation: PrototypeInvitation, now = PROTOTYPE_CLOCK): InvitationEffectiveStatus {
  if (invitation.status === 'INVITED' && now.getTime() >= new Date(invitation.expiresAt).getTime()) return 'EXPIRED';
  return invitation.status;
}

function currentIdentityForRecipient(state: PrototypeState, invitation: PrototypeInvitation) {
  if (!invitation.recipientIdentityId) return null;
  const matches = state.identities.filter((identity) => identity.id === invitation.recipientIdentityId);
  if (matches.length > 1) throw new Error('MULTIPLE_INVITATION_RECIPIENT_IDENTITIES');
  return matches[0] ?? null;
}

export function invitationVerificationStatus(state: PrototypeState, invitation: PrototypeInvitation): VerificationStatus {
  return currentIdentityForRecipient(state, invitation)?.verificationStatus
    ?? (invitation.recipientType === 'PROFESSIONAL' ? 'PENDING_VERIFICATION' : 'DECLARED');
}

export function canAcceptInvitation(state: PrototypeState, invitation: PrototypeInvitation, now = PROTOTYPE_CLOCK) {
  if (effectiveInvitationStatus(invitation, now) !== 'INVITED') return false;
  if (!canViewInvitationPreview(state, invitation.id)) return false;
  if (!invitationBelongsToCurrentAccount(state, invitation)) return false;
  if (invitationVerificationStatus(state, invitation) !== 'VERIFIED') return false;
  return now.getTime() < new Date(`${invitation.serviceEndsAt}T23:59:59+08:00`).getTime();
}

export function invitationBelongsToCurrentAccount(state: PrototypeState, invitation: PrototypeInvitation) {
  if (!invitation.recipientIdentityId) return false;
  return state.identities.some((identity) =>
    identity.id === invitation.recipientIdentityId && identity.accountId === state.currentAccountId);
}

export function invitationsForCurrentAccount(state: PrototypeState) {
  return state.invitations.filter((invitation) => invitationBelongsToCurrentAccount(state, invitation));
}

export function canViewInvitationPreview(state: PrototypeState, invitationId: string) {
  const invitation = invitationById(state, invitationId);
  return Boolean(invitation
    && effectiveInvitationStatus(invitation) === 'INVITED'
    && invitationBelongsToCurrentAccount(state, invitation)
    && state.invitationSessionIds.includes(invitationId));
}

export function invitationForPreview(state: PrototypeState, invitationId: string) {
  if (!canViewInvitationPreview(state, invitationId)) return null;
  return invitationById(state, invitationId);
}

export function simulateInvitationLogin(state: PrototypeState, invitationId: string): PrototypeState {
  const invitation = invitationById(state, invitationId);
  if (!invitation || effectiveInvitationStatus(invitation) !== 'INVITED') {
    return { ...state, successMessage: '目前無法使用此邀請' };
  }
  const expectedType = invitation.recipientType === 'PROFESSIONAL' ? 'PROFESSIONAL' : 'FAMILY';
  let identity = currentIdentityForRecipient(state, invitation) ?? undefined;
  let identities = [...state.identities];
  if (!identity) {
    identity = {
      id: `identity-login-${invitation.id}`,
      accountId: `account-login-${invitation.id}`,
      identityType: expectedType,
      professionalType: expectedType === 'PROFESSIONAL' ? 'NURSE' : null,
      verificationStatus: expectedType === 'PROFESSIONAL' ? 'PENDING_VERIFICATION' : 'VERIFIED',
      isPrimary: true
    };
    identities.push(identity);
  }
  identities = identities.map((item) => item.accountId === identity.accountId
    ? { ...item, isPrimary: item.id === identity.id }
    : item);
  return {
    ...state,
    currentAccountId: identity.accountId,
    identities,
    invitations: state.invitations.map((item) => item.id === invitationId ? { ...item, recipientIdentityId: identity.id } : item),
    invitationSessionIds: state.invitationSessionIds.includes(invitationId)
      ? state.invitationSessionIds
      : [...state.invitationSessionIds, invitationId],
    successMessage: '已完成虛構登入與 Email 綁定概念檢查，現在只顯示最低必要邀請資訊'
  };
}

export function canCurrentActorAccessCase(state: PrototypeState, caseId: string, now = PROTOTYPE_CLOCK) {
  return currentActorGrantPaths(state, caseId, now).length > 0;
}

export function canManageCaseInvitations(state: PrototypeState, caseId: string, now = PROTOTYPE_CLOCK) {
  return demoAccessOperationAvailability(state, caseId, 'INVITE', now).allowed;
}

export function demoAccessOperationAvailability(
  state: PrototypeState,
  caseId: string,
  operation: 'INVITE' | 'REVOKE',
  now = PROTOTYPE_CLOCK
): DemoOperationAvailability {
  const capability = operation === 'INVITE' ? 'ACCESS_INVITE' : 'ACCESS_REVOKE';
  const paths = currentActorGrantPaths(state, caseId, now).filter(({ grant }) =>
    grant.targetScopes.includes('CASE') && grant.capabilities.includes(capability));
  if (paths.length > 1) return { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'AMBIGUOUS_DEMO_PATH' };
  return paths.length === 1
    ? { source: 'DEMO_NON_AUTHORITATIVE', allowed: true }
    : { source: 'DEMO_NON_AUTHORITATIVE', allowed: false, unavailableReason: 'NO_DEMO_PATH' };
}

export function prototypeDemoCaseEntryPath(state: PrototypeState) {
  return canCurrentActorAccessCase(state, 'demo-case') ? '/v2/prototype/cases' : '/v2/prototype/workspace';
}

export function managerReassignmentItems(state: PrototypeState, caseId: string, now = PROTOTYPE_CLOCK) {
  const hasManagerPath = currentActorGrantPaths(state, caseId, now)
    .some(({ grant }) => grant.targetScopes.includes('RECORD') && grant.capabilities.includes('ACTION_REASSIGN'));
  if (!hasManagerPath) return [];
  return state.actions
    .filter((action) => action.caseId === caseId && action.status === 'NEEDS_REASSIGNMENT')
    .map((action) => ({ action, history: state.responsibilityHistory.find((item) => item.actionId === action.id) ?? null }));
}

function credentialRepresentations(serial: number) {
  const credentialId = `prototype-credential-${serial}`;
  const codeRepresentation = `DEMO-WINWIN-${String(serial).padStart(3, '0')}`;
  return {
    credentialId,
    codeRepresentation,
    linkRepresentation: `https://winwin.example.invalid/invite/${codeRepresentation}`
  };
}

export function createPrototypeInvitation(
  state: PrototypeState,
  input: PrototypeInvitationInput,
  now = PROTOTYPE_CLOCK
): PrototypeState {
  const authorized = demoAccessOperationAvailability(state, input.caseId, 'INVITE', now).allowed;
  if (!authorized) return { ...state, successMessage: '目前沒有建立此個案邀請的權限' };
  const serial = state.invitations.length + 1;
  const id = `invite-created-${serial}`;
  const invitation: PrototypeInvitation = {
    id,
    previousInvitationId: null,
    caseId: input.caseId,
    caseDisplayName: input.caseDisplayName,
    maskedCaseDisplayName: maskCaseName(input.caseDisplayName),
    inviterName: '林家協作管理者',
    recipientType: input.recipientType,
    recipientEmailHint: input.recipientType === 'PROFESSIONAL' ? 'p***@example.invalid' : 'f***@example.invalid',
    roleLabel: input.roleLabel,
    purpose: input.purpose,
    scopeSummary: input.scopeSummary,
    proposedTargetScopes: ['RECORD'],
    proposedSharingScopes: ['SHARED_CARE'],
    proposedCapabilities: ['RECORD_VIEW'],
    serviceStartsAt: input.serviceStartsAt,
    serviceEndsAt: input.serviceEndsAt,
    expiresAt: addDays(now, 7).toISOString(),
    status: 'INVITED',
    recipientIdentityId: null,
    ...credentialRepresentations(serial)
  };
  return {
    ...state,
    invitations: [invitation, ...state.invitations],
    lastInvitationId: id,
    successMessage: '已產生虛構邀請，未傳送任何真實資料'
  };
}

export function declinePrototypeInvitation(state: PrototypeState, invitationId: string, now = PROTOTYPE_CLOCK): PrototypeState {
  const invitation = invitationById(state, invitationId);
  if (!invitation || effectiveInvitationStatus(invitation, now) !== 'INVITED' || !canViewInvitationPreview(state, invitationId)) return state;
  return {
    ...state,
    invitations: state.invitations.map((item) => item.id === invitationId ? { ...item, status: 'DECLINED' } : item),
    successMessage: '已拒絕虛構邀請，不會建立個案成員關係'
  };
}

export function revokePrototypeInvitation(state: PrototypeState, invitationId: string, now = PROTOTYPE_CLOCK): PrototypeState {
  const invitation = invitationById(state, invitationId);
  const canRevoke = invitation && demoAccessOperationAvailability(state, invitation.caseId, 'REVOKE', now).allowed;
  if (!invitation || effectiveInvitationStatus(invitation, now) !== 'INVITED' || !canRevoke) return state;
  return {
    ...state,
    invitations: state.invitations.map((item) => item.id === invitationId ? { ...item, status: 'REVOKED' } : item),
    successMessage: '已撤回虛構邀請'
  };
}

export function resendPrototypeInvitation(state: PrototypeState, invitationId: string, now = PROTOTYPE_CLOCK): PrototypeState {
  const source = invitationById(state, invitationId);
  if (!source || effectiveInvitationStatus(source, now) === 'ACCEPTED' || !canManageCaseInvitations(state, source.caseId, now)) return state;
  const serial = state.invitations.length + 1;
  const replacementId = `invite-resent-${serial}`;
  const replacement: PrototypeInvitation = {
    ...source,
    id: replacementId,
    previousInvitationId: source.id,
    expiresAt: addDays(now, 7).toISOString(),
    status: 'INVITED',
    ...credentialRepresentations(serial)
  };
  return {
    ...state,
    invitations: [replacement, ...state.invitations.map((item) => item.id === invitationId ? { ...item, status: 'REVOKED' as const } : item)],
    lastInvitationId: replacementId,
    successMessage: '已產生新的虛構邀請，舊 credential 已撤回'
  };
}

export function setProfessionalVerification(
  state: PrototypeState,
  invitationId: string,
  verificationStatus: Extract<VerificationStatus, 'VERIFIED' | 'REJECTED'>
): PrototypeState {
  const invitation = invitationById(state, invitationId);
  if (!invitation || invitation.recipientType !== 'PROFESSIONAL' || !invitation.recipientIdentityId || !canViewInvitationPreview(state, invitationId)) return state;
  return {
    ...state,
    identities: state.identities.map((identity) => identity.id === invitation.recipientIdentityId ? { ...identity, verificationStatus } : identity),
    successMessage: verificationStatus === 'VERIFIED'
      ? '虛構專業驗證已通過，仍需重新檢查並接受邀請'
      : '虛構專業驗證未通過，不會取得個案權限'
  };
}

function workspaceCaseFromInvitation(invitation: PrototypeInvitation, accessStatus: WorkspaceCaseAccessStatus): PrototypeWorkspaceCase {
  return {
    id: invitation.caseId,
    displayName: invitation.caseDisplayName,
    relationshipLabel: invitation.roleLabel,
    serviceSource: '使用者聲明的虛構服務關係',
    serviceStartsAt: invitation.serviceStartsAt,
    serviceEndsAt: invitation.serviceEndsAt,
    accessStatus,
    visibleActionCount: 0,
    lastVisibleUpdateLabel: accessStatus === 'WAITING_START' ? '' : '尚無新變化'
  };
}

export function acceptPrototypeInvitation(state: PrototypeState, invitationId: string, now = PROTOTYPE_CLOCK): PrototypeState {
  const invitation = invitationById(state, invitationId);
  if (!invitation || !canAcceptInvitation(state, invitation, now)) {
    return { ...state, successMessage: '目前不能接受此邀請，請檢查驗證、期限與服務期間' };
  }
  const isFuture = now.getTime() < new Date(`${invitation.serviceStartsAt}T00:00:00+08:00`).getTime();
  const membershipStatus = isFuture ? 'WAITING_START' as const : 'ACTIVE' as const;
  const identity = currentIdentityForRecipient(state, invitation);
  if (!identity || identity.accountId !== state.currentAccountId || identity.verificationStatus !== 'VERIFIED') {
    return { ...state, successMessage: '目前不能接受此邀請，請先完成同一帳號身分的虛構驗證' };
  }
  const membershipId = `membership-from-${invitation.id}`;
  const workspaceCase = workspaceCaseFromInvitation(invitation, isFuture ? 'WAITING_START' : 'ACTIVE');
  const actingRole = invitation.recipientType === 'PROFESSIONAL' ? 'NURSE' as const : 'FAMILY' as const;
  const grantId = `grant-from-${invitation.id}`;
  const caseMember = {
    id: `member-from-${invitation.id}`,
    caseId: invitation.caseId,
    name: invitation.recipientType === 'PROFESSIONAL' ? '陳護理師' : '受邀家屬',
    role: actingRole,
    participant: { identityId: identity.id, membershipId },
    relationship: invitation.roleLabel,
    purpose: invitation.purpose,
    scopeSummary: invitation.scopeSummary,
    validFrom: invitation.serviceStartsAt,
    validUntil: invitation.serviceEndsAt,
    status: 'ACTIVE' as const
  };

  return {
    ...state,
    activeRole: actingRole,
    memberships: [...state.memberships, {
      id: membershipId,
      identityId: identity.id,
      caseId: invitation.caseId,
      relationship: invitation.recipientType === 'PROFESSIONAL' ? 'PROFESSIONAL_SERVICE' : 'FAMILY_MEMBER',
      status: membershipStatus,
      validUntil: invitation.serviceEndsAt
    }],
    roleGrants: [...state.roleGrants, {
      id: grantId,
      membershipId,
      actingRole,
      purpose: invitation.purpose,
      targetScopes: [...invitation.proposedTargetScopes],
      sharingScopes: [...invitation.proposedSharingScopes],
      capabilities: [...invitation.proposedCapabilities],
      startsAt: invitation.serviceStartsAt,
      validUntil: invitation.serviceEndsAt
    }],
    members: [...state.members.filter((item) => item.id !== caseMember.id), caseMember],
    demoActorSelections: {
      ...state.demoActorSelections,
      [invitation.caseId]: { participant: caseMember.participant, displayRole: actingRole }
    },
    invitations: state.invitations.map((item) => item.id === invitationId ? { ...item, status: 'ACCEPTED' } : item),
    workspaceCases: [...state.workspaceCases.filter((item) => item.id !== invitation.caseId), workspaceCase],
    successMessage: isFuture ? '已接受，等待服務開始，目前不顯示個案內容' : '已接受虛構邀請，個案已加入我的個案'
  };
}

export function visibleWorkspaceCases(state: PrototypeState) {
  return state.workspaceCases.filter((item) => canCurrentActorAccessCase(state, item.id));
}

export function waitingStartWorkspaceCases(state: PrototypeState) {
  return state.workspaceCases.filter((item) => item.accessStatus === 'WAITING_START');
}

export function searchVisibleWorkspaceCases(state: PrototypeState, query: string) {
  const normalized = query.trim().toLocaleLowerCase('zh-TW');
  const visible = visibleWorkspaceCases(state);
  if (!normalized) return visible;
  return visible.filter((item) => [item.displayName, item.relationshipLabel, item.serviceSource]
    .some((value) => value.toLocaleLowerCase('zh-TW').includes(normalized)));
}

export function togglePrivateTag(state: PrototypeState, caseId: string, tagId: string): PrototypeState {
  if (!visibleWorkspaceCases(state).some((item) => item.id === caseId)) return state;
  const exists = state.privateTagAssignments.some((item) => item.caseId === caseId && item.tagId === tagId);
  return {
    ...state,
    privateTagAssignments: exists
      ? state.privateTagAssignments.filter((item) => item.caseId !== caseId || item.tagId !== tagId)
      : [...state.privateTagAssignments, { caseId, tagId }],
    successMessage: '已更新個人私人分類，不會改變個案權限'
  };
}

export function removeWorkspaceCaseAccess(
  state: PrototypeState,
  caseId: string,
  reason: Extract<WorkspaceCaseAccessStatus, 'EXPIRED' | 'REVOKED'>
): PrototypeState {
  const lostParticipant = state.demoActorSelections[caseId]?.participant ?? null;
  if (!lostParticipant) return state;
  const exactMemberships = state.memberships.filter((membership) =>
    membership.id === lostParticipant.membershipId
    && membership.identityId === lostParticipant.identityId
    && membership.caseId === caseId);
  if (exactMemberships.length === 0) return state;
  if (exactMemberships.length > 1) throw new Error('MULTIPLE_EXACT_ACCESS_REMOVAL_MEMBERSHIPS');
  const affectedCycles = state.responsibilityCycles.filter((cycle) =>
    cycle.caseId === caseId
    && cycle.endedAt === null
    && (cycle.status === 'ASSIGNED' || cycle.status === 'ACCEPTED' || cycle.status === 'IN_PROGRESS')
    && sameParticipant(lostParticipant, cycle.assignee));
  const reassignedActions = state.actions.filter((item) => affectedCycles.some((cycle) => cycle.actionId === item.id));
  const firstActivitySequence = nextDemoActivitySequence(state, caseId);
  return {
    ...state,
    // Workspace Case metadata is shared fixture presentation, not per-participant
    // access truth. Exact Membership status below removes only the target actor.
    workspaceCases: state.workspaceCases,
    privateTagAssignments: state.privateTagAssignments.filter((item) => item.caseId !== caseId),
    memberships: state.memberships.map((item) =>
      item.id === lostParticipant.membershipId
      && item.identityId === lostParticipant.identityId
      && item.caseId === caseId
        ? { ...item, status: reason }
        : item),
    actions: state.actions.map((item) => reassignedActions.some((action) => action.id === item.id)
      ? { ...item, status: 'NEEDS_REASSIGNMENT' }
      : item),
    responsibilityCycles: state.responsibilityCycles.map((cycle) => affectedCycles.some((affected) => affected.id === cycle.id)
      ? { ...cycle, status: 'ENDED', endedAt: PROTOTYPE_CLOCK.toISOString() }
      : cycle),
    responsibilityHistory: [
      ...state.responsibilityHistory,
      ...affectedCycles.map((cycle, index) => {
        const item = state.actions.find((action) => action.id === cycle.actionId)!;
        const member = state.members.find((candidate) => sameParticipant(candidate.participant, cycle.assignee));
        return {
        id: `responsibility-history-${item.id}-${state.responsibilityHistory.length + index + 1}`,
        caseId,
        actionId: item.id,
        formerAssigneeName: member?.name ?? '虛構個案成員',
        formerAssignee: cycle.assignee,
        formerAssigneeDisplayRole: member?.role ?? state.activeRole,
        previousStatus: cycle.status as PrototypeResponsibilityHistory['previousStatus'],
        endedAt: PROTOTYPE_CLOCK.toISOString(),
        activitySequence: firstActivitySequence + index * 2,
        reason: reason === 'EXPIRED' ? 'SERVICE_EXPIRED' as const : 'MEMBERSHIP_REVOKED' as const,
        summary: reason === 'EXPIRED' ? '原負責人因服務到期而結束責任週期' : '原負責人因個案關係撤銷而結束責任週期'
      }; })
    ],
    actionStatusHistory: [
      ...state.actionStatusHistory,
      ...affectedCycles.map((cycle, index) => {
        const item = state.actions.find((action) => action.id === cycle.actionId)!;
        const member = state.members.find((candidate) => sameParticipant(candidate.participant, cycle.assignee));
        return {
        id: `action-status-history-${item.id}-${state.actionStatusHistory.length + index + 1}`,
        caseId,
        actionId: item.id,
        fromStatus: item.status,
        toStatus: 'NEEDS_REASSIGNMENT' as const,
        actor: cycle.assignee,
        actorDisplayRole: member?.role ?? state.activeRole,
        changedAt: PROTOTYPE_CLOCK.toISOString(),
        activitySequence: firstActivitySequence + index * 2 + 1
      }; })
    ],
    successMessage: reason === 'EXPIRED'
      ? '服務期間已結束，個案與私人分類關聯已從可見集合移除'
      : '個案關係已撤銷，不再顯示個案或隱含數量'
  };
}
