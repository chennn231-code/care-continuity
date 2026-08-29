/**
 * WinWin product authorization contract (Batch 1).
 *
 * This module is deliberately runtime- and persistence-agnostic. It describes
 * the server-side proof that a later API/RLS implementation must enforce; it
 * does not authorize the current prototype or imply that Gate 5 has passed.
 */

export type IdentityId = string;
export type MembershipId = string;
export type RelationshipId = string;
export type GrantId = string;
export type CaseId = string;

export type MembershipStatus = 'ACTIVE' | 'WAITING_START' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
export type GrantStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
export type RelationshipType = 'SELF' | 'FAMILY' | 'PROFESSIONAL_SERVICE' | 'OTHER';
export type VisibilityPolicy =
  | 'AUTHOR_ONLY'
  | 'DIRECT_PARTICIPANTS'
  | 'FAMILY_TEAM'
  | 'PROFESSIONAL_TEAM'
  | 'EXPLICIT_GRANT'
  | 'CASE_SHARED';

export type AuthorizationCapability =
  | 'VIEW_RECORD'
  | 'CREATE_CARE_UPDATE'
  | 'ASK_QUESTION'
  | 'ANSWER_QUESTION'
  | 'RESOLVE_QUESTION'
  | 'CREATE_ACTION'
  | 'ASSIGN_ACTION'
  | 'ACCEPT_ASSIGNED_ACTION'
  | 'START_ASSIGNED_ACTION'
  | 'COMPLETE_ASSIGNED_ACTION'
  | 'REASSIGN_ACTION'
  | 'INVITE_MEMBER'
  | 'REVOKE_ACCESS';

export type AuthorizationScope =
  | 'AUTHOR_ONLY'
  | 'DIRECT_PARTICIPANTS'
  | 'FAMILY_TEAM'
  | 'PROFESSIONAL_TEAM'
  | 'EXPLICIT_GRANT'
  | 'CASE_SHARED';

export interface ActorContext {
  accountId: string;
  identityId: IdentityId;
  membershipId: MembershipId;
  relationshipId: RelationshipId;
  caseId: CaseId;
}

export interface CaseMembership {
  id: MembershipId;
  identityId: IdentityId;
  caseId: CaseId;
  relationshipId: RelationshipId;
  status: MembershipStatus;
  validFrom: string;
  validUntil: string | null;
}

export interface CaseRelationship {
  id: RelationshipId;
  caseId: CaseId;
  identityId: IdentityId;
  type: RelationshipType;
  label: string;
}

export interface AuthorizationGrant {
  id: GrantId;
  granteeIdentityId: IdentityId;
  membershipId: MembershipId;
  relationshipId: RelationshipId;
  caseId: CaseId;
  purpose: string;
  scopes: AuthorizationScope[];
  capabilities: AuthorizationCapability[];
  status: GrantStatus;
  validFrom: string;
  validUntil: string | null;
  issuedByIdentityId: IdentityId;
  source: { type: 'INVITATION' | 'DIRECT_GRANT' | 'MIGRATION'; id: string };
}

export interface IdentityMembershipReference {
  identityId: IdentityId;
  membershipId: MembershipId;
}

export interface RecordAuthorizationContext {
  recordId: string;
  caseId: CaseId;
  author: IdentityMembershipReference;
  visibility: VisibilityPolicy;
  directParticipants: IdentityMembershipReference[];
  explicitGrantees: IdentityMembershipReference[];
}

export interface CareUpdateVersionContract {
  id: string;
  careUpdateId: string;
  version: number;
  author: IdentityMembershipReference;
  content: string;
  occurredAt: string;
  serverRecordedAt: string;
  correctsVersionId: string | null;
  correctionReason: string | null;
}

export interface CareUpdateContract {
  id: string;
  caseId: CaseId;
  status: 'DRAFT' | 'PUBLISHED';
  category: 'OBSERVATION' | 'ARRANGEMENT' | 'HANDOFF' | 'OTHER';
  participantIdentities: IdentityMembershipReference[];
  currentVersionId: string;
  authorization: RecordAuthorizationContext;
  auditEventIds: string[];
}

export interface GrantRequirement {
  capability: AuthorizationCapability;
  scope: AuthorizationScope;
  purpose?: string;
}

export type AuthorizationDecision =
  | { allowed: true; grantId: GrantId }
  | { allowed: false; reason: string };

function instantIsWithin(value: string, start: string, end: string | null) {
  const instant = Date.parse(value);
  const starts = Date.parse(start);
  const ends = end === null ? null : Date.parse(end);
  return Number.isFinite(instant)
    && Number.isFinite(starts)
    && (ends === null || Number.isFinite(ends))
    && instant >= starts
    && (ends === null || instant < ends);
}

/** Evaluate one complete proof path. Requirements are never combined across grants. */
export function evaluateSingleGrantPath(input: {
  actor: ActorContext;
  membership: CaseMembership;
  relationship: CaseRelationship;
  grant: AuthorizationGrant;
  requirement: GrantRequirement;
  serverNow: string;
}): AuthorizationDecision {
  const { actor, membership, relationship, grant, requirement, serverNow } = input;
  if (actor.identityId !== membership.identityId || actor.membershipId !== membership.id) {
    return { allowed: false, reason: 'ACTOR_MEMBERSHIP_MISMATCH' };
  }
  if (actor.relationshipId !== relationship.id || membership.relationshipId !== relationship.id) {
    return { allowed: false, reason: 'RELATIONSHIP_MISMATCH' };
  }
  if (actor.caseId !== membership.caseId || relationship.caseId !== actor.caseId) {
    return { allowed: false, reason: 'CASE_MISMATCH' };
  }
  if (relationship.identityId !== actor.identityId) {
    return { allowed: false, reason: 'RELATIONSHIP_IDENTITY_MISMATCH' };
  }
  if (membership.status !== 'ACTIVE' || !instantIsWithin(serverNow, membership.validFrom, membership.validUntil)) {
    return { allowed: false, reason: 'MEMBERSHIP_INACTIVE' };
  }
  if (
    grant.membershipId !== membership.id
    || grant.granteeIdentityId !== actor.identityId
    || grant.relationshipId !== relationship.id
    || grant.caseId !== actor.caseId
  ) {
    return { allowed: false, reason: 'GRANT_PATH_MISMATCH' };
  }
  if (grant.status !== 'ACTIVE' || !instantIsWithin(serverNow, grant.validFrom, grant.validUntil)) {
    return { allowed: false, reason: 'GRANT_INACTIVE' };
  }
  if (!grant.capabilities.includes(requirement.capability)) {
    return { allowed: false, reason: 'CAPABILITY_MISSING' };
  }
  if (!grant.scopes.includes(requirement.scope)) {
    return { allowed: false, reason: 'SCOPE_MISSING' };
  }
  if (requirement.purpose !== undefined && grant.purpose !== requirement.purpose) {
    return { allowed: false, reason: 'PURPOSE_MISMATCH' };
  }
  return { allowed: true, grantId: grant.id };
}

export interface GrantPath {
  membership: CaseMembership;
  relationship: CaseRelationship;
  grant: AuthorizationGrant;
}

export function authorizeThroughAnySingleGrant(input: {
  actor: ActorContext;
  paths: GrantPath[];
  requirement: GrantRequirement;
  serverNow: string;
}): AuthorizationDecision {
  for (const path of input.paths) {
    const decision = evaluateSingleGrantPath({ ...input, ...path });
    if (decision.allowed) return decision;
  }
  return { allowed: false, reason: 'NO_SINGLE_GRANT_PATH' };
}

function isExactReference(actor: ActorContext, reference: IdentityMembershipReference) {
  return actor.identityId === reference.identityId && actor.membershipId === reference.membershipId;
}

function visibilityScope(visibility: VisibilityPolicy): AuthorizationScope {
  return visibility;
}

export function canViewRecord(input: {
  actor: ActorContext;
  record: RecordAuthorizationContext;
  paths: GrantPath[];
  serverNow: string;
}): AuthorizationDecision {
  const { actor, record } = input;
  if (actor.caseId !== record.caseId) return { allowed: false, reason: 'CASE_MISMATCH' };

  // Identity checks narrow visibility; an active VIEW_RECORD grant remains mandatory.
  if (record.visibility === 'AUTHOR_ONLY' && !isExactReference(actor, record.author)) {
    return { allowed: false, reason: 'NOT_AUTHOR' };
  }
  if (
    record.visibility === 'DIRECT_PARTICIPANTS'
    && !isExactReference(actor, record.author)
    && !record.directParticipants.some((participant) => isExactReference(actor, participant))
  ) {
    return { allowed: false, reason: 'NOT_DIRECT_PARTICIPANT' };
  }
  if (
    record.visibility === 'EXPLICIT_GRANT'
    && !record.explicitGrantees.some((grantee) => isExactReference(actor, grantee))
  ) return { allowed: false, reason: 'NOT_EXPLICIT_GRANTEE' };

  const paths = input.paths.filter((path) => {
    if (record.visibility === 'FAMILY_TEAM') return path.relationship.type === 'FAMILY';
    if (record.visibility === 'PROFESSIONAL_TEAM') return path.relationship.type === 'PROFESSIONAL_SERVICE';
    return true;
  });

  return authorizeThroughAnySingleGrant({
    actor,
    paths,
    requirement: { capability: 'VIEW_RECORD', scope: visibilityScope(record.visibility) },
    serverNow: input.serverNow
  });
}

export type ActionStatus = 'OPEN' | 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ResponsibilityStatus = 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ENDED';
export type ResponsibilityEndReason = 'REASSIGNED' | 'ACCESS_REVOKED' | 'SERVICE_ENDED' | 'CANCELLED';

export interface ResponsibilityCycle {
  id: string;
  actionId: string;
  caseId: CaseId;
  assignee: IdentityMembershipReference;
  assignedBy: IdentityMembershipReference;
  status: ResponsibilityStatus;
  assignedAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  endedAt: string | null;
  endReason: ResponsibilityEndReason | null;
}

export interface ActionContract {
  id: string;
  caseId: CaseId;
  status: ActionStatus;
  sourceCareUpdateId: string | null;
  creator: IdentityMembershipReference;
  authorization: RecordAuthorizationContext;
  currentResponsibilityCycleId: string | null;
  linkedQuestionId: string | null;
  serverCreatedAt: string;
  serverUpdatedAt: string;
  auditEventIds: string[];
}

export type AssigneeOperation = 'ACCEPT' | 'START' | 'COMPLETE';

const operationCapability: Record<AssigneeOperation, AuthorizationCapability> = {
  ACCEPT: 'ACCEPT_ASSIGNED_ACTION',
  START: 'START_ASSIGNED_ACTION',
  COMPLETE: 'COMPLETE_ASSIGNED_ACTION'
};

const operationStatus: Record<AssigneeOperation, ResponsibilityStatus> = {
  ACCEPT: 'ASSIGNED',
  START: 'ACCEPTED',
  COMPLETE: 'IN_PROGRESS'
};

/** Viewing an action and mutating its responsibility are intentionally separate decisions. */
export function canPerformAssigneeOperation(input: {
  actor: ActorContext;
  action: ActionContract;
  responsibility: ResponsibilityCycle;
  operation: AssigneeOperation;
  paths: GrantPath[];
  serverNow: string;
}): AuthorizationDecision {
  if (input.action.caseId !== input.actor.caseId || input.responsibility.caseId !== input.actor.caseId) {
    return { allowed: false, reason: 'CASE_MISMATCH' };
  }
  if (input.action.currentResponsibilityCycleId !== input.responsibility.id) {
    return { allowed: false, reason: 'NOT_CURRENT_RESPONSIBILITY' };
  }
  if (!isExactReference(input.actor, input.responsibility.assignee)) {
    return { allowed: false, reason: 'NOT_CURRENT_ASSIGNEE' };
  }
  if (input.responsibility.status !== operationStatus[input.operation]) {
    return { allowed: false, reason: 'INVALID_RESPONSIBILITY_STATE' };
  }
  return authorizeThroughAnySingleGrant({
    actor: input.actor,
    paths: input.paths,
    requirement: { capability: operationCapability[input.operation], scope: 'DIRECT_PARTICIPANTS' },
    serverNow: input.serverNow
  });
}

export function transitionResponsibility(
  responsibility: ResponsibilityCycle,
  operation: AssigneeOperation,
  serverNow: string
): ResponsibilityCycle {
  if (responsibility.status !== operationStatus[operation]) {
    throw new Error('INVALID_RESPONSIBILITY_TRANSITION');
  }
  if (operation === 'ACCEPT') return { ...responsibility, status: 'ACCEPTED', acceptedAt: serverNow };
  if (operation === 'START') return { ...responsibility, status: 'IN_PROGRESS', startedAt: serverNow };
  return { ...responsibility, status: 'COMPLETED', completedAt: serverNow };
}

export function reassignResponsibility(input: {
  action: ActionContract;
  current: ResponsibilityCycle;
  nextCycleId: string;
  nextAssignee: IdentityMembershipReference;
  actor: ActorContext;
  serverNow: string;
}): { action: ActionContract; history: ResponsibilityCycle[]; current: ResponsibilityCycle } {
  if (input.action.currentResponsibilityCycleId !== input.current.id || input.current.status === 'ENDED') {
    throw new Error('RESPONSIBILITY_NOT_CURRENT');
  }
  const ended: ResponsibilityCycle = {
    ...input.current,
    status: 'ENDED',
    endedAt: input.serverNow,
    endReason: 'REASSIGNED'
  };
  const next: ResponsibilityCycle = {
    id: input.nextCycleId,
    actionId: input.action.id,
    caseId: input.action.caseId,
    assignee: input.nextAssignee,
    assignedBy: { identityId: input.actor.identityId, membershipId: input.actor.membershipId },
    status: 'ASSIGNED',
    assignedAt: input.serverNow,
    acceptedAt: null,
    startedAt: null,
    completedAt: null,
    endedAt: null,
    endReason: null
  };
  return {
    action: { ...input.action, status: 'ASSIGNED', currentResponsibilityCycleId: next.id },
    history: [ended],
    current: next
  };
}

export interface QuestionContract {
  id: string;
  caseId: CaseId;
  sourceRecordId: string;
  status: 'OPEN' | 'ANSWERED' | 'RESOLVED';
  askedBy: IdentityMembershipReference;
  participants: IdentityMembershipReference[];
  authorization: RecordAuthorizationContext;
  answers: Array<{
    id: string;
    author: IdentityMembershipReference;
    serverRecordedAt: string;
    auditEventId: string;
  }>;
  resolvedAt: string | null;
  auditEventIds: string[];
}

export function completeActionWithoutResolvingQuestion(input: {
  action: ActionContract;
  question: QuestionContract | null;
}): { action: ActionContract; question: QuestionContract | null } {
  return { action: { ...input.action, status: 'COMPLETED' }, question: input.question };
}

export interface TypedInvitationContract {
  id: string;
  caseId: CaseId;
  issuedByIdentityId: IdentityId;
  recipientIdentityId: IdentityId;
  acceptanceValidFrom: string;
  acceptanceValidUntil: string;
  relationship: { type: RelationshipType; label: string };
  grant: {
    purpose: string;
    scopes: AuthorizationScope[];
    capabilities: AuthorizationCapability[];
    validFrom: string;
    validUntil: string | null;
  };
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED';
}

export function materializeInvitationAcceptance(input: {
  invitation: TypedInvitationContract;
  membershipId: MembershipId;
  relationshipId: RelationshipId;
  grantId: GrantId;
  acceptedByIdentityId: IdentityId;
  serverNow: string;
}): { membership: CaseMembership; relationship: CaseRelationship; grant: AuthorizationGrant } {
  const { invitation } = input;
  if (invitation.status !== 'PENDING') throw new Error('INVITATION_NOT_ACCEPTABLE');
  if (input.acceptedByIdentityId !== invitation.recipientIdentityId) throw new Error('INVITATION_IDENTITY_MISMATCH');
  if (!instantIsWithin(input.serverNow, invitation.acceptanceValidFrom, invitation.acceptanceValidUntil)) {
    throw new Error('INVITATION_NOT_CURRENT');
  }
  const relationship: CaseRelationship = {
    id: input.relationshipId,
    caseId: invitation.caseId,
    identityId: invitation.recipientIdentityId,
    ...invitation.relationship
  };
  const membership: CaseMembership = {
    id: input.membershipId,
    identityId: invitation.recipientIdentityId,
    caseId: invitation.caseId,
    relationshipId: relationship.id,
    status: Date.parse(input.serverNow) < Date.parse(invitation.grant.validFrom) ? 'WAITING_START' : 'ACTIVE',
    validFrom: invitation.grant.validFrom,
    validUntil: invitation.grant.validUntil
  };
  const grant: AuthorizationGrant = {
    id: input.grantId,
    granteeIdentityId: invitation.recipientIdentityId,
    membershipId: membership.id,
    relationshipId: relationship.id,
    caseId: invitation.caseId,
    purpose: invitation.grant.purpose,
    scopes: [...invitation.grant.scopes],
    capabilities: [...invitation.grant.capabilities],
    status: 'ACTIVE',
    validFrom: invitation.grant.validFrom,
    validUntil: invitation.grant.validUntil,
    issuedByIdentityId: invitation.issuedByIdentityId,
    source: { type: 'INVITATION', id: invitation.id }
  };
  return { membership, relationship, grant };
}

export interface ServerActivityBoundary {
  source: 'SERVER';
  sequence: number;
  recordedAt: string;
}

export interface ReadCursor {
  identityId: IdentityId;
  membershipId: MembershipId;
  caseId: CaseId;
  lastVisibleSequence: number;
  serverRecordedAt: string;
}

/** The caller supplies a server-issued monotonic boundary; client wall-clock time is not accepted. */
export function advanceReadCursor(input: {
  actor: ActorContext;
  current: ReadCursor | null;
  boundary: ServerActivityBoundary;
}): ReadCursor {
  if (input.boundary.source !== 'SERVER' || !Number.isSafeInteger(input.boundary.sequence) || input.boundary.sequence < 0) {
    throw new Error('INVALID_SERVER_BOUNDARY');
  }
  if (input.current && (
    input.current.identityId !== input.actor.identityId
    || input.current.membershipId !== input.actor.membershipId
    || input.current.caseId !== input.actor.caseId
  )) throw new Error('CURSOR_ACTOR_MISMATCH');
  const sequence = Math.max(input.current?.lastVisibleSequence ?? 0, input.boundary.sequence);
  return {
    identityId: input.actor.identityId,
    membershipId: input.actor.membershipId,
    caseId: input.actor.caseId,
    lastVisibleSequence: sequence,
    serverRecordedAt: input.boundary.recordedAt
  };
}

export type AuditEventType =
  | 'GRANT_ISSUED'
  | 'GRANT_REVOKED'
  | 'RECORD_CREATED'
  | 'QUESTION_ANSWERED'
  | 'QUESTION_RESOLVED'
  | 'ACTION_ASSIGNED'
  | 'ACTION_ACCEPTED'
  | 'ACTION_STARTED'
  | 'ACTION_COMPLETED'
  | 'ACTION_REASSIGNED'
  | 'ACCESS_REVOKED';

export interface AuditEvent {
  id: string;
  caseId: CaseId;
  actorIdentityId: IdentityId;
  actorMembershipId: MembershipId;
  eventType: AuditEventType;
  subjectType: 'GRANT' | 'RECORD' | 'QUESTION' | 'ACTION' | 'MEMBERSHIP';
  subjectId: string;
  responsibilityCycleId: string | null;
  occurredAt: string;
  authorizationGrantId: GrantId | null;
  previousStateRef: string | null;
  newStateRef: string | null;
}
