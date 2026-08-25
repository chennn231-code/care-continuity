import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  acceptPrototypeInvitation,
  canCurrentActorAccessCase,
  canAcceptInvitation,
  canViewInvitationPreview,
  declinePrototypeInvitation,
  effectiveInvitationStatus,
  invitationForPreview,
  invitationVerificationStatus,
  managerReassignmentItems,
  prototypeDemoCaseEntryPath,
  removeWorkspaceCaseAccess,
  resendPrototypeInvitation,
  revokePrototypeInvitation,
  searchVisibleWorkspaceCases,
  setProfessionalVerification,
  simulateInvitationLogin,
  togglePrivateTag,
  visibleWorkspaceCases,
  waitingStartWorkspaceCases
} from '../src/v2/state/invitationWorkspaceState';
import { createInitialPrototypeState } from '../src/v2/state/prototypeState';
import { V2_GUARDED_CASE_ROUTE_SUFFIXES } from '../src/v2/data/prototypeRoutes';
import { canCreateProfessionalRecord } from '../src/v2/state/professionalRecordState';
import { PrototypeProvider } from '../src/v2/state/PrototypeProvider';
import { PrototypeCaseAccessGuard } from '../src/v2/components/PrototypeCaseAccessGuard';

function acceptVerifiedProfessionalInvitation() {
  let state = createInitialPrototypeState();
  state = simulateInvitationLogin(state, 'invite-professional-pending');
  state = setProfessionalVerification(state, 'invite-professional-pending', 'VERIFIED');
  return acceptPrototypeInvitation(state, 'invite-professional-pending');
}

describe('v2 invitation and multi-case workspace prototype', () => {
  it('derives an expired invitation from the clock without changing its stored status', () => {
    const state = createInitialPrototypeState();
    const invitation = state.invitations.find((item) => item.id === 'invite-expired');
    expect(invitation?.status).toBe('INVITED');
    expect(invitation && effectiveInvitationStatus(invitation)).toBe('EXPIRED');
    expect(invitation && canAcceptInvitation(state, invitation)).toBe(false);
  });

  it('keeps pending professional verification separate from invitation status', () => {
    const state = createInitialPrototypeState();
    const invitation = state.invitations.find((item) => item.id === 'invite-professional-pending');
    expect(invitation?.status).toBe('INVITED');
    expect(invitation && invitationVerificationStatus(state, invitation)).toBe('PENDING_VERIFICATION');
    expect(invitation && canAcceptInvitation(state, invitation)).toBe(false);
  });

  it('does not expose invitation preview data before the simulated login check', () => {
    const state = createInitialPrototypeState();
    expect(canViewInvitationPreview(state, 'invite-family-ready')).toBe(false);
    expect(invitationForPreview(state, 'invite-family-ready')).toBeNull();
    const loggedIn = simulateInvitationLogin(state, 'invite-family-ready');
    expect(canViewInvitationPreview(loggedIn, 'invite-family-ready')).toBe(true);
    expect(invitationForPreview(loggedIn, 'invite-family-ready')?.maskedCaseDisplayName).toBe('王○○長輩');
  });

  it('does not auto-accept an invitation after professional verification', () => {
    const state = createInitialPrototypeState();
    const loggedIn = simulateInvitationLogin(state, 'invite-professional-pending');
    const verified = setProfessionalVerification(loggedIn, 'invite-professional-pending', 'VERIFIED');
    const invitation = verified.invitations.find((item) => item.id === 'invite-professional-pending');
    expect(invitation && invitationVerificationStatus(verified, invitation)).toBe('VERIFIED');
    expect(verified.identities.find((item) => item.id === invitation?.recipientIdentityId)?.verificationStatus).toBe('VERIFIED');
    expect(invitation?.status).toBe('INVITED');
    expect(invitation && canAcceptInvitation(verified, invitation)).toBe(true);
  });

  it('accepts a valid invitation and creates one independent membership and grant path', () => {
    const state = createInitialPrototypeState();
    const next = acceptPrototypeInvitation(state, 'invite-family-ready');
    const invitation = next.invitations.find((item) => item.id === 'invite-family-ready');
    const membership = next.memberships.find((item) => item.caseId === 'harbor-case');
    const grants = next.roleGrants.filter((item) => item.membershipId === membership?.id);
    expect(invitation?.status).toBe('ACCEPTED');
    expect(membership?.status).toBe('ACTIVE');
    expect(grants).toHaveLength(1);
    expect(visibleWorkspaceCases(next).map((item) => item.id)).toContain('harbor-case');
  });

  it('keeps an accepted future service outside the visible case collection', () => {
    const state = createInitialPrototypeState();
    const future = {
      ...state,
      invitations: state.invitations.map((item) => item.id === 'invite-family-ready'
        ? { ...item, serviceStartsAt: '2026-09-01' }
        : item)
    };
    const next = acceptPrototypeInvitation(future, 'invite-family-ready');
    expect(next.memberships.find((item) => item.caseId === 'harbor-case')?.status).toBe('WAITING_START');
    expect(visibleWorkspaceCases(next).map((item) => item.id)).not.toContain('harbor-case');
    expect(waitingStartWorkspaceCases(next).map((item) => item.id)).toContain('harbor-case');
  });

  it('uses one access selector for active, future, expired, revoked and suspended relationships', () => {
    const state = createInitialPrototypeState();
    expect(canCurrentActorAccessCase(state, 'demo-case')).toBe(true);
    expect(canCurrentActorAccessCase(state, 'future-case')).toBe(false);
    const expired = removeWorkspaceCaseAccess(state, 'demo-case', 'EXPIRED');
    const revoked = removeWorkspaceCaseAccess(state, 'demo-case', 'REVOKED');
    const suspended = {
      ...state,
      workspaceCases: state.workspaceCases.map((item) => item.id === 'demo-case' ? { ...item, accessStatus: 'SUSPENDED' as const } : item)
    };
    expect(canCurrentActorAccessCase(expired, 'demo-case')).toBe(false);
    expect(canCurrentActorAccessCase(revoked, 'demo-case')).toBe(false);
    expect(canCurrentActorAccessCase(suspended, 'demo-case')).toBe(false);
  });

  it('redirects the landing shortcut to the workspace after access loss', () => {
    const state = createInitialPrototypeState();
    expect(prototypeDemoCaseEntryPath(state)).toBe('/v2/prototype/cases');
    expect(prototypeDemoCaseEntryPath(removeWorkspaceCaseAccess(state, 'demo-case', 'EXPIRED'))).toBe('/v2/prototype/workspace');
    expect(prototypeDemoCaseEntryPath(removeWorkspaceCaseAccess(state, 'demo-case', 'REVOKED'))).toBe('/v2/prototype/workspace');
  });

  it('renders the shared access guard for every direct case content URL', () => {
    const state = removeWorkspaceCaseAccess(createInitialPrototypeState(), 'demo-case', 'EXPIRED');
    expect(V2_GUARDED_CASE_ROUTE_SUFFIXES).toEqual([
      '',
      'timeline',
      'updates/new',
      'actions',
      'circle',
      'records',
      'records/new',
      'records/:recordId',
      'records/:recordId/correct'
    ]);
    for (const suffix of V2_GUARDED_CASE_ROUTE_SUFFIXES) {
      const requestedSuffix = suffix.replace(':recordId', 'record-demo');
      const initialPath = `/v2/prototype/cases/demo-case${requestedSuffix ? `/${requestedSuffix}` : ''}`;
      const childRoute = suffix
        ? createElement(Route, { path: '*', element: createElement('div', null, 'SENSITIVE_CASE_CONTENT') })
        : createElement(Route, { index: true, element: createElement('div', null, 'SENSITIVE_CASE_CONTENT') });
      const html = renderToStaticMarkup(createElement(
        MemoryRouter,
        { initialEntries: [initialPath] },
        createElement(
          PrototypeProvider,
          { initialState: state },
          createElement(
            Routes,
            null,
            createElement(Route, { path: '/v2/prototype/cases/:caseId', element: createElement(PrototypeCaseAccessGuard) }, childRoute)
          )
        )
      ));
      expect(html, initialPath).toContain('目前無法存取此個案');
      expect(html, initialPath).not.toContain('SENSITIVE_CASE_CONTENT');
    }
  });

  it('does not create a membership when an invitation is declined or revoked', () => {
    const state = createInitialPrototypeState();
    const declined = declinePrototypeInvitation(state, 'invite-family-ready');
    const revoked = revokePrototypeInvitation(state, 'invite-family-ready');
    expect(declined.invitations.find((item) => item.id === 'invite-family-ready')?.status).toBe('DECLINED');
    expect(revoked.invitations.find((item) => item.id === 'invite-family-ready')?.status).toBe('REVOKED');
    expect(declined.memberships.some((item) => item.caseId === 'harbor-case')).toBe(false);
    expect(revoked.memberships.some((item) => item.caseId === 'harbor-case')).toBe(false);
  });

  it('resends with a new credential and revokes the former credential', () => {
    const state = createInitialPrototypeState();
    const next = resendPrototypeInvitation(state, 'invite-family-ready');
    const replacement = next.invitations[0];
    const original = next.invitations.find((item) => item.id === 'invite-family-ready');
    expect(replacement.previousInvitationId).toBe('invite-family-ready');
    expect(replacement.credentialId).not.toBe(state.invitations[0].credentialId);
    expect(replacement.linkRepresentation).toContain(replacement.codeRepresentation);
    expect(original?.status).toBe('REVOKED');
  });

  it('searches only the currently visible case collection', () => {
    const state = createInitialPrototypeState();
    expect(searchVisibleWorkspaceCases(state, '林奶奶').map((item) => item.id)).toEqual(['demo-case']);
    expect(searchVisibleWorkspaceCases(state, '許奶奶')).toEqual([]);
    expect(searchVisibleWorkspaceCases(state, '周奶奶')).toEqual([]);
  });

  it('does not let a private tag create access to a hidden case', () => {
    const state = createInitialPrototypeState();
    const next = togglePrivateTag(state, 'future-case', 'tag-this-week');
    expect(next).toBe(state);
    expect(next.privateTagAssignments.some((item) => item.caseId === 'future-case')).toBe(false);
  });

  it('removes tag associations and reassigns unfinished work immediately after access loss', () => {
    const state = createInitialPrototypeState();
    const next = removeWorkspaceCaseAccess(state, 'demo-case', 'EXPIRED');
    expect(visibleWorkspaceCases(next).map((item) => item.id)).not.toContain('demo-case');
    expect(next.privateTagAssignments.some((item) => item.caseId === 'demo-case')).toBe(false);
    expect(next.actions.find((item) => item.id === 'action-meal-followup')?.status).toBe('NEEDS_REASSIGNMENT');
    expect(next.actions.find((item) => item.id === 'action-skin-check')?.status).toBe('PENDING_ACCEPTANCE');
    expect(next.responsibilityHistory.some((item) => item.actionId === 'action-meal-followup' && item.summary.includes('服務到期'))).toBe(true);
  });

  it('does not reassign another role\'s unfinished action when the nurse path expires', () => {
    const state = {
      ...createInitialPrototypeState(),
      activeRole: 'NURSE' as const,
      actions: createInitialPrototypeState().actions.map((action) => action.id === 'action-skin-check'
        ? { ...action, status: 'IN_PROGRESS' as const }
        : action)
    };
    const next = removeWorkspaceCaseAccess(state, 'demo-case', 'EXPIRED');
    expect(next.actions.find((item) => item.id === 'action-skin-check')?.status).toBe('NEEDS_REASSIGNMENT');
    expect(next.actions.find((item) => item.id === 'action-meal-followup')?.status).toBe('IN_PROGRESS');
  });

  it('shows reassignment only through an effective manager grant path', () => {
    const state = createInitialPrototypeState();
    const nurseState = { ...state, activeRole: 'NURSE' as const };
    const managerItems = managerReassignmentItems(nurseState, 'river-case');
    expect(managerItems).toHaveLength(1);
    expect(managerItems[0].history?.summary).toContain('服務到期');
    const lostAccess = removeWorkspaceCaseAccess(nurseState, 'river-case', 'EXPIRED');
    expect(managerReassignmentItems(lostAccess, 'river-case')).toEqual([]);
  });

  it('returns a fresh in-memory fixture after refresh-equivalent initialization', () => {
    const changed = removeWorkspaceCaseAccess(createInitialPrototypeState(), 'demo-case', 'REVOKED');
    const refreshed = createInitialPrototypeState();
    expect(canCurrentActorAccessCase(changed, 'demo-case')).toBe(false);
    expect(refreshed.workspaceCases.find((item) => item.id === 'demo-case')?.accessStatus).toBe('ACTIVE');
    expect(refreshed.privateTagAssignments.some((item) => item.caseId === 'demo-case')).toBe(true);
  });

  it('uses the same identity verification state for invitation, header identity and identity profile', () => {
    let state = simulateInvitationLogin(createInitialPrototypeState(), 'invite-professional-pending');
    const invitation = state.invitations.find((item) => item.id === 'invite-professional-pending')!;
    const linkedIdentity = state.identities.find((item) => item.id === invitation.recipientIdentityId)!;
    expect(linkedIdentity.isPrimary).toBe(true);
    expect(invitationVerificationStatus(state, invitation)).toBe('PENDING_VERIFICATION');
    state = setProfessionalVerification(state, invitation.id, 'VERIFIED');
    expect(invitationVerificationStatus(state, invitation)).toBe('VERIFIED');
    expect(state.identities.find((item) => item.isPrimary)?.verificationStatus).toBe('VERIFIED');
    expect(state.identities.filter((item) => item.accountId === state.currentAccountId).find((item) => item.id === invitation.recipientIdentityId)?.verificationStatus).toBe('VERIFIED');
  });

  it('opens an invited professional case through the shared guard and record grant path', () => {
    const state = acceptVerifiedProfessionalInvitation();
    expect(state.workspaceCases.find((item) => item.id === 'sun-case')?.displayName).toBe('陳爺爺');
    expect(canCurrentActorAccessCase(state, 'sun-case')).toBe(true);
    expect(canCreateProfessionalRecord(state, 'sun-case')).toBe(true);
    for (const route of V2_GUARDED_CASE_ROUTE_SUFFIXES) {
      expect(canCurrentActorAccessCase(state, 'sun-case'), route).toBe(true);
    }
  });

  it('rejects direct URLs for an invited case when its single nurse grant path is incomplete', () => {
    const state = acceptVerifiedProfessionalInvitation();
    const incomplete = {
      ...state,
      roleGrants: state.roleGrants.map((grant) => grant.actingRole === 'NURSE' && state.memberships.find((item) => item.id === grant.membershipId)?.caseId === 'sun-case'
        ? { ...grant, capabilities: [] }
        : grant)
    };
    expect(canCurrentActorAccessCase(incomplete, 'sun-case')).toBe(false);
    expect(canCreateProfessionalRecord(incomplete, 'sun-case')).toBe(false);
  });
});
