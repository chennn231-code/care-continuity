import { currentActorGrantPaths } from './prototypeState';
import type {
  InvitationEffectiveStatus,
  PrototypeInvitation,
  PrototypeInvitationInput,
  PrototypeIdentity,
  PrototypeState,
  PrototypeWorkspaceCase,
  VerificationStatus,
  WorkspaceCaseAccessStatus
} from '../types/prototype';

export const PROTOTYPE_CLOCK = new Date('2026-08-25T12:00:00+08:00');

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
  const linked = invitation.recipientIdentityId
    ? state.identities.find((identity) => identity.id === invitation.recipientIdentityId)
    : null;
  if (linked) return linked;
  const expectedType = invitation.recipientType === 'PROFESSIONAL' ? 'PROFESSIONAL' : 'FAMILY';
  return state.identities.find((identity) => identity.accountId === state.currentAccountId && identity.identityType === expectedType) ?? null;
}

export function invitationVerificationStatus(state: PrototypeState, invitation: PrototypeInvitation): VerificationStatus {
  return currentIdentityForRecipient(state, invitation)?.verificationStatus
    ?? (invitation.recipientType === 'PROFESSIONAL' ? 'PENDING_VERIFICATION' : 'DECLARED');
}

export function canAcceptInvitation(state: PrototypeState, invitation: PrototypeInvitation, now = PROTOTYPE_CLOCK) {
  if (effectiveInvitationStatus(invitation, now) !== 'INVITED') return false;
  if (invitationVerificationStatus(state, invitation) !== 'VERIFIED') return false;
  return now.getTime() < new Date(`${invitation.serviceEndsAt}T23:59:59+08:00`).getTime();
}

export function canViewInvitationPreview(state: PrototypeState, invitationId: string) {
  return state.invitationSessionIds.includes(invitationId);
}

export function invitationForPreview(state: PrototypeState, invitationId: string) {
  if (!canViewInvitationPreview(state, invitationId)) return null;
  return state.invitations.find((item) => item.id === invitationId) ?? null;
}

export function simulateInvitationLogin(state: PrototypeState, invitationId: string): PrototypeState {
  const invitation = state.invitations.find((item) => item.id === invitationId);
  if (!invitation) return state;
  const expectedType = invitation.recipientType === 'PROFESSIONAL' ? 'PROFESSIONAL' : 'FAMILY';
  let identity = invitation.recipientIdentityId
    ? state.identities.find((item) => item.id === invitation.recipientIdentityId)
    : state.identities.find((item) => item.accountId === state.currentAccountId && item.identityType === expectedType);
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

export function prototypeDemoCaseEntryPath(state: PrototypeState) {
  return canCurrentActorAccessCase(state, 'demo-case') ? '/v2/prototype/cases' : '/v2/prototype/workspace';
}

export function managerReassignmentItems(state: PrototypeState, caseId: string, now = PROTOTYPE_CLOCK) {
  if (!canCurrentActorAccessCase(state, caseId, now)) return [];
  const hasManagerPath = state.roleGrants.some((grant) => {
    const membership = state.memberships.find((item) => item.id === grant.membershipId && item.caseId === caseId && item.status === 'ACTIVE');
    if (!membership || !grant.capabilities.includes('MANAGE_MEMBERS')) return false;
    const identity = state.identities.find((item) => item.id === membership.identityId && item.accountId === state.currentAccountId && item.verificationStatus === 'VERIFIED');
    if (!identity) return false;
    if (grant.actingRole !== state.activeRole) return false;
    if (grant.startsAt && now.getTime() < dateOnlyStartsAt(grant.startsAt)) return false;
    if (grant.validUntil && now.getTime() > dateOnlyEndsAt(grant.validUntil)) return false;
    return true;
  });
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
  const invitation = state.invitations.find((item) => item.id === invitationId);
  if (!invitation || effectiveInvitationStatus(invitation, now) !== 'INVITED') return state;
  return {
    ...state,
    invitations: state.invitations.map((item) => item.id === invitationId ? { ...item, status: 'DECLINED' } : item),
    successMessage: '已拒絕虛構邀請，不會建立個案成員關係'
  };
}

export function revokePrototypeInvitation(state: PrototypeState, invitationId: string, now = PROTOTYPE_CLOCK): PrototypeState {
  const invitation = state.invitations.find((item) => item.id === invitationId);
  if (!invitation || effectiveInvitationStatus(invitation, now) !== 'INVITED') return state;
  return {
    ...state,
    invitations: state.invitations.map((item) => item.id === invitationId ? { ...item, status: 'REVOKED' } : item),
    successMessage: '已撤回虛構邀請'
  };
}

export function resendPrototypeInvitation(state: PrototypeState, invitationId: string, now = PROTOTYPE_CLOCK): PrototypeState {
  const source = state.invitations.find((item) => item.id === invitationId);
  if (!source || effectiveInvitationStatus(source, now) === 'ACCEPTED') return state;
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
  const invitation = state.invitations.find((item) => item.id === invitationId);
  if (!invitation || invitation.recipientType !== 'PROFESSIONAL' || !invitation.recipientIdentityId) return state;
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
  const invitation = state.invitations.find((item) => item.id === invitationId);
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
    relationship: invitation.roleLabel,
    purpose: invitation.purpose,
    scopeSummary: invitation.scopeSummary,
    validFrom: invitation.serviceStartsAt,
    validUntil: invitation.serviceEndsAt,
    status: 'ACTIVE' as const
  };

  // Prototype manager path exists only to demonstrate that the same unresolved action remains
  // visible to an authorized manager after the invited nurse loses access.
  const managerIdentity: PrototypeIdentity = {
    id: `manager-identity-for-${invitation.caseId}`,
    accountId: identity.accountId,
    identityType: 'FAMILY',
    professionalType: null,
    verificationStatus: 'VERIFIED',
    isPrimary: false
  };
  const managerMembershipId = `manager-membership-for-${invitation.caseId}`;
  const managerGrantId = `manager-grant-for-${invitation.caseId}`;
  const addManagerPath = invitation.recipientType === 'PROFESSIONAL'
    && !state.memberships.some((item) => item.id === managerMembershipId);
  return {
    ...state,
    activeRole: actingRole,
    identities: addManagerPath ? [...state.identities, managerIdentity] : state.identities,
    memberships: [...state.memberships, {
      id: membershipId,
      identityId: identity.id,
      caseId: invitation.caseId,
      relationship: invitation.recipientType === 'PROFESSIONAL' ? 'PROFESSIONAL_SERVICE' : 'FAMILY_MEMBER',
      status: membershipStatus,
      validUntil: invitation.serviceEndsAt
    }, ...(addManagerPath ? [{
      id: managerMembershipId,
      identityId: managerIdentity.id,
      caseId: invitation.caseId,
      relationship: 'FAMILY_MEMBER' as const,
      status: 'ACTIVE' as const,
      validUntil: null
    }] : [])],
    roleGrants: [...state.roleGrants, {
      id: grantId,
      membershipId,
      actingRole,
      purpose: invitation.purpose,
      sharingScopes: ['SHARED_CARE', 'DIRECT_PARTICIPANTS'],
      capabilities: invitation.recipientType === 'PROFESSIONAL'
        ? ['VIEW_PROFESSIONAL_CASE', 'VIEW_SHARED_CARE', 'ADD_UPDATE', 'CREATE_PROFESSIONAL_RECORD']
        : ['VIEW_SHARED_CARE', 'ADD_UPDATE', 'RESOLVE_QUESTION'],
      startsAt: invitation.serviceStartsAt,
      validUntil: invitation.serviceEndsAt
    }, ...(addManagerPath ? [{
      id: managerGrantId,
      membershipId: managerMembershipId,
      actingRole: 'FAMILY' as const,
      purpose: '個案協作管理展示',
      sharingScopes: ['SHARED_CARE' as const, 'DIRECT_PARTICIPANTS' as const],
      capabilities: ['VIEW_SHARED_CARE', 'MANAGE_MEMBERS', 'RESOLVE_QUESTION'],
      validUntil: null
    }] : [])],
    members: [...state.members.filter((item) => item.id !== caseMember.id), caseMember],
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
  const lostMembershipIds = state.roleGrants
    .filter((grant) => grant.actingRole === state.activeRole)
    .map((grant) => grant.membershipId)
    .filter((membershipId) => state.memberships.some((item) => item.id === membershipId && item.caseId === caseId));
  const reassignedActions = state.actions.filter((item) => item.caseId === caseId && item.assigneeRole === state.activeRole && (item.status === 'ACCEPTED' || item.status === 'IN_PROGRESS'));
  const otherActivePathRemains = state.roleGrants.some((grant) => grant.actingRole !== state.activeRole && state.memberships.some((membership) => membership.id === grant.membershipId && membership.caseId === caseId && membership.status === 'ACTIVE'));
  return {
    ...state,
    workspaceCases: state.workspaceCases.map((item) => item.id === caseId ? { ...item, accessStatus: otherActivePathRemains ? 'ACTIVE' : reason } : item),
    privateTagAssignments: state.privateTagAssignments.filter((item) => item.caseId !== caseId),
    memberships: state.memberships.map((item) => lostMembershipIds.includes(item.id) ? { ...item, status: reason } : item),
    actions: state.actions.map((item) => reassignedActions.some((action) => action.id === item.id)
      ? { ...item, status: 'NEEDS_REASSIGNMENT' }
      : item),
    responsibilityHistory: [
      ...state.responsibilityHistory,
      ...reassignedActions.map((item, index) => ({
        id: `responsibility-history-${item.id}-${state.responsibilityHistory.length + index + 1}`,
        caseId,
        actionId: item.id,
        formerAssigneeName: item.assigneeName,
        previousStatus: item.status as 'ACCEPTED' | 'IN_PROGRESS',
        endedAt: PROTOTYPE_CLOCK.toISOString(),
        reason: reason === 'EXPIRED' ? 'SERVICE_EXPIRED' as const : 'MEMBERSHIP_REVOKED' as const,
        summary: reason === 'EXPIRED' ? '原負責人因服務到期而結束責任週期' : '原負責人因個案關係撤銷而結束責任週期'
      }))
    ],
    actionStatusHistory: [
      ...state.actionStatusHistory,
      ...reassignedActions.map((item, index) => ({
        id: `action-status-history-${item.id}-${state.actionStatusHistory.length + index + 1}`,
        caseId,
        actionId: item.id,
        fromStatus: item.status,
        toStatus: 'NEEDS_REASSIGNMENT' as const,
        actorRole: state.activeRole,
        changedAt: PROTOTYPE_CLOCK.toISOString()
      }))
    ],
    successMessage: reason === 'EXPIRED'
      ? '服務期間已結束，個案與私人分類關聯已從可見集合移除'
      : '個案關係已撤銷，不再顯示個案或隱含數量'
  };
}
