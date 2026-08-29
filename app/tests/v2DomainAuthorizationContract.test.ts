import { describe, expect, it } from 'vitest';
import {
  advanceReadCursor,
  authorizeThroughAnySingleGrant,
  canPerformAssigneeOperation,
  canViewRecord,
  completeActionWithoutResolvingQuestion,
  materializeInvitationAcceptance,
  reassignResponsibility,
  transitionResponsibility,
  type ActionContract,
  type ActorContext,
  type AuthorizationGrant,
  type CaseMembership,
  type CaseRelationship,
  type GrantPath,
  type QuestionContract,
  type RecordAuthorizationContext,
  type ResponsibilityCycle,
  type TypedInvitationContract
} from '../src/v2/authorization/domainAuthorizationContract';

const serverNow = '2026-08-29T08:00:00.000Z';

function pathFor(identityId = 'identity-a', overrides: Partial<AuthorizationGrant> = {}): {
  actor: ActorContext;
  path: GrantPath;
} {
  const membership: CaseMembership = {
    id: `membership-${identityId}`,
    identityId,
    caseId: 'case-1',
    relationshipId: `relationship-${identityId}`,
    status: 'ACTIVE',
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: null
  };
  const relationship: CaseRelationship = {
    id: membership.relationshipId,
    identityId,
    caseId: 'case-1',
    type: 'PROFESSIONAL_SERVICE',
    label: '護理服務'
  };
  const grant: AuthorizationGrant = {
    id: `grant-${identityId}`,
    granteeIdentityId: identityId,
    membershipId: membership.id,
    relationshipId: relationship.id,
    caseId: 'case-1',
    purpose: '照顧協作',
    scopes: ['AUTHOR_ONLY', 'DIRECT_PARTICIPANTS', 'PROFESSIONAL_TEAM'],
    capabilities: [
      'VIEW_RECORD',
      'ACCEPT_ASSIGNED_ACTION',
      'START_ASSIGNED_ACTION',
      'COMPLETE_ASSIGNED_ACTION'
    ],
    status: 'ACTIVE',
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: null,
    issuedByIdentityId: 'identity-issuer',
    source: { type: 'DIRECT_GRANT', id: `source-${identityId}` },
    ...overrides
  };
  return {
    actor: {
      accountId: `account-${identityId}`,
      identityId,
      membershipId: membership.id,
      relationshipId: relationship.id,
      caseId: 'case-1'
    },
    path: { membership, relationship, grant }
  };
}

function record(visibility: RecordAuthorizationContext['visibility']): RecordAuthorizationContext {
  return {
    recordId: 'record-1',
    caseId: 'case-1',
    author: { identityId: 'identity-a', membershipId: 'membership-identity-a' },
    visibility,
    directParticipants: [{ identityId: 'identity-b', membershipId: 'membership-identity-b' }],
    explicitGrantees: []
  };
}

function responsibility(assigneeIdentityId = 'identity-a'): ResponsibilityCycle {
  return {
    id: 'responsibility-1',
    actionId: 'action-1',
    caseId: 'case-1',
    assignee: {
      identityId: assigneeIdentityId,
      membershipId: `membership-${assigneeIdentityId}`
    },
    assignedBy: { identityId: 'identity-manager', membershipId: 'membership-manager' },
    status: 'ASSIGNED',
    assignedAt: serverNow,
    acceptedAt: null,
    startedAt: null,
    completedAt: null,
    endedAt: null,
    endReason: null
  };
}

const action: ActionContract = {
  id: 'action-1',
  caseId: 'case-1',
  status: 'ASSIGNED',
  sourceCareUpdateId: 'record-1',
  creator: { identityId: 'identity-manager', membershipId: 'membership-manager' },
  authorization: record('DIRECT_PARTICIPANTS'),
  currentResponsibilityCycleId: 'responsibility-1',
  linkedQuestionId: 'question-1',
  serverCreatedAt: serverNow,
  serverUpdatedAt: serverNow,
  auditEventIds: ['audit-action-created']
};

describe('WinWin Batch 1 domain authorization contract', () => {
  it('isolates same-role actors by identity for AUTHOR_ONLY records', () => {
    const author = pathFor('identity-a');
    const sameRoleOtherIdentity = pathFor('identity-b');
    expect(canViewRecord({ actor: author.actor, record: record('AUTHOR_ONLY'), paths: [author.path], serverNow }).allowed).toBe(true);
    expect(canViewRecord({
      actor: sameRoleOtherIdentity.actor,
      record: record('AUTHOR_ONLY'),
      paths: [sameRoleOtherIdentity.path],
      serverNow
    })).toEqual({ allowed: false, reason: 'NOT_AUTHOR' });
  });

  it('does not treat an active membership without a grant as access', () => {
    const actor = pathFor();
    expect(canViewRecord({ actor: actor.actor, record: record('AUTHOR_ONLY'), paths: [], serverNow })).toEqual({
      allowed: false,
      reason: 'NO_SINGLE_GRANT_PATH'
    });
  });

  it('does not aggregate capabilities and scopes from separate grants', () => {
    const actor = pathFor();
    const capabilityOnly = pathFor('identity-a', { id: 'grant-capability', scopes: [] }).path;
    const scopeOnly = pathFor('identity-a', { id: 'grant-scope', capabilities: [] }).path;
    expect(authorizeThroughAnySingleGrant({
      actor: actor.actor,
      paths: [capabilityOnly, scopeOnly],
      requirement: { capability: 'VIEW_RECORD', scope: 'PROFESSIONAL_TEAM' },
      serverNow
    })).toEqual({ allowed: false, reason: 'NO_SINGLE_GRANT_PATH' });
  });

  it('requires exact identity and membership for DIRECT_PARTICIPANTS', () => {
    const participant = pathFor('identity-b');
    const wrongMembershipActor = { ...participant.actor, membershipId: 'membership-other' };
    expect(canViewRecord({
      actor: participant.actor,
      record: record('DIRECT_PARTICIPANTS'),
      paths: [participant.path],
      serverNow
    }).allowed).toBe(true);
    expect(canViewRecord({
      actor: wrongMembershipActor,
      record: record('DIRECT_PARTICIPANTS'),
      paths: [participant.path],
      serverNow
    })).toEqual({ allowed: false, reason: 'NOT_DIRECT_PARTICIPANT' });
  });

  it('binds accept, start and complete to the current assignee identity', () => {
    const assignee = pathFor('identity-a');
    const sameRoleOtherIdentity = pathFor('identity-b');
    expect(canPerformAssigneeOperation({
      actor: assignee.actor,
      action,
      responsibility: responsibility(),
      operation: 'ACCEPT',
      paths: [assignee.path],
      serverNow
    }).allowed).toBe(true);
    expect(canPerformAssigneeOperation({
      actor: sameRoleOtherIdentity.actor,
      action,
      responsibility: responsibility(),
      operation: 'ACCEPT',
      paths: [sameRoleOtherIdentity.path],
      serverNow
    })).toEqual({ allowed: false, reason: 'NOT_CURRENT_ASSIGNEE' });
  });

  it('enforces responsibility transition semantics', () => {
    const assigned = responsibility();
    const accepted = transitionResponsibility(assigned, 'ACCEPT', '2026-08-29T08:01:00.000Z');
    const started = transitionResponsibility(accepted, 'START', '2026-08-29T08:02:00.000Z');
    const completed = transitionResponsibility(started, 'COMPLETE', '2026-08-29T08:03:00.000Z');
    expect(completed).toMatchObject({
      status: 'COMPLETED',
      acceptedAt: '2026-08-29T08:01:00.000Z',
      startedAt: '2026-08-29T08:02:00.000Z',
      completedAt: '2026-08-29T08:03:00.000Z'
    });
    expect(() => transitionResponsibility(assigned, 'START', serverNow)).toThrow('INVALID_RESPONSIBILITY_TRANSITION');
  });

  it('denies a revoked grant even when its capability and scope match', () => {
    const revoked = pathFor('identity-a', { status: 'REVOKED' });
    expect(canViewRecord({ actor: revoked.actor, record: record('AUTHOR_ONLY'), paths: [revoked.path], serverNow })).toEqual({
      allowed: false,
      reason: 'NO_SINGLE_GRANT_PATH'
    });
  });

  it('preserves an ended responsibility cycle when reassigned', () => {
    const actor = pathFor('identity-manager').actor;
    const result = reassignResponsibility({
      action,
      current: responsibility(),
      nextCycleId: 'responsibility-2',
      nextAssignee: { identityId: 'identity-b', membershipId: 'membership-identity-b' },
      actor,
      serverNow
    });
    expect(result.history).toEqual([expect.objectContaining({
      id: 'responsibility-1', status: 'ENDED', endReason: 'REASSIGNED', endedAt: serverNow
    })]);
    expect(result.current).toMatchObject({
      id: 'responsibility-2',
      status: 'ASSIGNED',
      assignee: { identityId: 'identity-b', membershipId: 'membership-identity-b' }
    });
    expect(result.action.currentResponsibilityCycleId).toBe('responsibility-2');
  });

  it('keeps question resolution independent from action completion', () => {
    const question: QuestionContract = {
      id: 'question-1',
      caseId: 'case-1',
      sourceRecordId: 'record-1',
      status: 'ANSWERED',
      askedBy: { identityId: 'identity-a', membershipId: 'membership-identity-a' },
      participants: [{ identityId: 'identity-b', membershipId: 'membership-identity-b' }],
      authorization: record('DIRECT_PARTICIPANTS'),
      answers: [],
      resolvedAt: null,
      auditEventIds: []
    };
    const result = completeActionWithoutResolvingQuestion({ action, question });
    expect(result.action.status).toBe('COMPLETED');
    expect(result.question).toEqual(question);
    expect(result.question?.status).toBe('ANSWERED');
  });

  it('materializes the typed invitation instead of hard-coding recipient privileges', () => {
    const invitation: TypedInvitationContract = {
      id: 'invitation-1',
      caseId: 'case-1',
      issuedByIdentityId: 'identity-manager',
      recipientIdentityId: 'identity-therapist',
      acceptanceValidFrom: '2026-08-01T00:00:00.000Z',
      acceptanceValidUntil: '2026-09-01T00:00:00.000Z',
      relationship: { type: 'PROFESSIONAL_SERVICE', label: '職能治療服務' },
      grant: {
        purpose: '職能治療交接',
        scopes: ['DIRECT_PARTICIPANTS'],
        capabilities: ['VIEW_RECORD', 'CREATE_CARE_UPDATE'],
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: null
      },
      status: 'PENDING'
    };
    const result = materializeInvitationAcceptance({
      invitation,
      membershipId: 'membership-therapist',
      relationshipId: 'relationship-therapist',
      grantId: 'grant-therapist',
      acceptedByIdentityId: 'identity-therapist',
      serverNow
    });
    expect(result.relationship).toMatchObject(invitation.relationship);
    expect(result.grant).toMatchObject({
      purpose: invitation.grant.purpose,
      scopes: invitation.grant.scopes,
      capabilities: invitation.grant.capabilities,
      issuedByIdentityId: 'identity-manager'
    });
    expect(result.grant.capabilities).not.toContain('INVITE_MEMBER');
  });

  it('accepts a current invitation for future service without granting early access', () => {
    const invitation: TypedInvitationContract = {
      id: 'invitation-future',
      caseId: 'case-1',
      issuedByIdentityId: 'identity-manager',
      recipientIdentityId: 'identity-future',
      acceptanceValidFrom: '2026-08-01T00:00:00.000Z',
      acceptanceValidUntil: '2026-09-01T00:00:00.000Z',
      relationship: { type: 'PROFESSIONAL_SERVICE', label: '未來服務' },
      grant: {
        purpose: '未來服務交接',
        scopes: ['DIRECT_PARTICIPANTS'],
        capabilities: ['VIEW_RECORD'],
        validFrom: '2026-09-15T00:00:00.000Z',
        validUntil: null
      },
      status: 'PENDING'
    };
    const result = materializeInvitationAcceptance({
      invitation,
      membershipId: 'membership-future',
      relationshipId: 'relationship-future',
      grantId: 'grant-future',
      acceptedByIdentityId: 'identity-future',
      serverNow
    });
    expect(result.membership.status).toBe('WAITING_START');
    expect(result.grant.validFrom).toBe(invitation.grant.validFrom);
  });

  it('advances a per-identity cursor only from a server-issued monotonic boundary', () => {
    const actor = pathFor('identity-a').actor;
    const initial = advanceReadCursor({
      actor,
      current: null,
      boundary: { source: 'SERVER', sequence: 12, recordedAt: serverNow }
    });
    const replay = advanceReadCursor({
      actor,
      current: initial,
      boundary: { source: 'SERVER', sequence: 10, recordedAt: '2026-08-29T08:04:00.000Z' }
    });
    expect(initial).toMatchObject({ identityId: actor.identityId, membershipId: actor.membershipId, lastVisibleSequence: 12 });
    expect(replay.lastVisibleSequence).toBe(12);
    expect(() => advanceReadCursor({
      actor,
      current: null,
      boundary: { source: 'CLIENT' as 'SERVER', sequence: 13, recordedAt: '2099-01-01T00:00:00.000Z' }
    })).toThrow('INVALID_SERVER_BOUNDARY');
  });
});
