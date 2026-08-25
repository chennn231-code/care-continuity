import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { addCareUpdate, beginIdentityRegistration, completeIdentityRegistration, createInitialPrototypeState, resolveQuestion, selectIdentityType, selectProfessionalType, transitionAction } from './prototypeState';
import { acceptPrototypeInvitation, createPrototypeInvitation, declinePrototypeInvitation, removeWorkspaceCaseAccess, resendPrototypeInvitation, revokePrototypeInvitation, setProfessionalVerification, simulateInvitationLogin, togglePrivateTag } from './invitationWorkspaceState';
import type { ActionStatus, DemoRole, IdentityRegistrationMode, NewUpdateInput, PrimaryIdentityType, ProfessionalType, PrototypeInvitationInput, PrototypeState } from '../types/prototype';

interface PrototypeContextValue {
  state: PrototypeState;
  setRole: (role: DemoRole) => void;
  beginRegistration: (mode: IdentityRegistrationMode) => void;
  chooseIdentityType: (identityType: PrimaryIdentityType) => void;
  chooseProfessionalType: (professionalType: ProfessionalType) => void;
  completeRegistration: () => void;
  addUpdate: (input: NewUpdateInput) => void;
  moveAction: (actionId: string, status: ActionStatus) => void;
  markQuestionResolved: (questionId: string) => void;
  createInvitation: (input: PrototypeInvitationInput) => void;
  acceptInvitation: (invitationId: string) => void;
  declineInvitation: (invitationId: string) => void;
  revokeInvitation: (invitationId: string) => void;
  resendInvitation: (invitationId: string) => void;
  simulateInvitationLogin: (invitationId: string) => void;
  setInvitationVerification: (invitationId: string, status: 'VERIFIED' | 'REJECTED') => void;
  toggleCaseTag: (caseId: string, tagId: string) => void;
  removeCaseAccess: (caseId: string, reason: 'EXPIRED' | 'REVOKED') => void;
  clearSuccess: () => void;
}

const PrototypeContext = createContext<PrototypeContextValue | null>(null);

export function PrototypeProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(createInitialPrototypeState);
  const value = useMemo<PrototypeContextValue>(() => ({
    state,
    setRole: (activeRole) => setState((current) => ({ ...current, activeRole, successMessage: null })),
    beginRegistration: (mode) => setState((current) => beginIdentityRegistration(current, mode)),
    chooseIdentityType: (identityType) => setState((current) => selectIdentityType(current, identityType)),
    chooseProfessionalType: (professionalType) => setState((current) => selectProfessionalType(current, professionalType)),
    completeRegistration: () => setState((current) => completeIdentityRegistration(current)),
    addUpdate: (input) => setState((current) => addCareUpdate(current, input)),
    moveAction: (actionId, status) => setState((current) => transitionAction(current, actionId, status, current.activeRole)),
    markQuestionResolved: (questionId) => setState((current) => resolveQuestion(current, questionId)),
    createInvitation: (input) => setState((current) => createPrototypeInvitation(current, input)),
    acceptInvitation: (invitationId) => setState((current) => acceptPrototypeInvitation(current, invitationId)),
    declineInvitation: (invitationId) => setState((current) => declinePrototypeInvitation(current, invitationId)),
    revokeInvitation: (invitationId) => setState((current) => revokePrototypeInvitation(current, invitationId)),
    resendInvitation: (invitationId) => setState((current) => resendPrototypeInvitation(current, invitationId)),
    simulateInvitationLogin: (invitationId) => setState((current) => simulateInvitationLogin(current, invitationId)),
    setInvitationVerification: (invitationId, status) => setState((current) => setProfessionalVerification(current, invitationId, status)),
    toggleCaseTag: (caseId, tagId) => setState((current) => togglePrivateTag(current, caseId, tagId)),
    removeCaseAccess: (caseId, reason) => setState((current) => removeWorkspaceCaseAccess(current, caseId, reason)),
    clearSuccess: () => setState((current) => ({ ...current, successMessage: null }))
  }), [state]);
  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const value = useContext(PrototypeContext);
  if (!value) throw new Error('usePrototype must be used inside PrototypeProvider');
  return value;
}
