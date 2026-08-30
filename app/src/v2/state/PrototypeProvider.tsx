import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { addCareUpdate, advanceDemoReadCursor, beginIdentityRegistration, completeIdentityRegistration, createInitialPrototypeState, resolveQuestion, selectDemoActor, selectIdentityType, selectProfessionalType, transitionAction } from './prototypeState';
import { acceptPrototypeInvitation, createPrototypeInvitation, declinePrototypeInvitation, removeWorkspaceCaseAccess, resendPrototypeInvitation, revokePrototypeInvitation, setProfessionalVerification, simulateInvitationLogin, togglePrivateTag } from './invitationWorkspaceState';
import { publishProfessionalRecord } from './professionalRecordState';
import type { CaseParticipantRef } from '../authorization/domainAuthorizationContract';
import type { ActionStatus, ActivityBoundary, DemoRole, IdentityRegistrationMode, NewUpdateInput, PrimaryIdentityType, ProfessionalRecordDraft, ProfessionalType, PrototypeInvitationInput, PrototypeState } from '../types/prototype';

interface PrototypeContextValue {
  /** Presentation/demo adapter marker. This provider is not security enforcement. */
  adapterKind: 'DEMO_NON_AUTHORITATIVE';
  state: PrototypeState;
  selectActor: (caseId: string, participant: CaseParticipantRef, displayRole: DemoRole) => void;
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
  advanceReadCursor: (caseId: string, requestedBoundary: ActivityBoundary) => void;
  publishRecord: (draft: ProfessionalRecordDraft) => string | null;
  clearSuccess: () => void;
}

const PrototypeContext = createContext<PrototypeContextValue | null>(null);

export function PrototypeProvider({ children, initialState }: PropsWithChildren<{ initialState?: PrototypeState }>) {
  const [state, setState] = useState(() => initialState ? structuredClone(initialState) : createInitialPrototypeState());
  const value = useMemo<PrototypeContextValue>(() => ({
    adapterKind: 'DEMO_NON_AUTHORITATIVE',
    state,
    selectActor: (caseId, participant, displayRole) => setState((current) => selectDemoActor(current, caseId, participant, displayRole)),
    beginRegistration: (mode) => setState((current) => beginIdentityRegistration(current, mode)),
    chooseIdentityType: (identityType) => setState((current) => selectIdentityType(current, identityType)),
    chooseProfessionalType: (professionalType) => setState((current) => selectProfessionalType(current, professionalType)),
    completeRegistration: () => setState((current) => completeIdentityRegistration(current)),
    addUpdate: (input) => setState((current) => addCareUpdate(current, input)),
    moveAction: (actionId, status) => setState((current) => transitionAction(current, actionId, status)),
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
    advanceReadCursor: (caseId, requestedBoundary) => setState((current) => advanceDemoReadCursor(current, caseId, requestedBoundary)),
    publishRecord: (draft) => {
      const publishedId = draft.recordId ?? `professional-record-demo-${state.professionalRecordVersions.length + 1}`;
      const next = publishProfessionalRecord(state, draft);
      if (next === state) return null;
      setState(next);
      return publishedId;
    },
    clearSuccess: () => setState((current) => ({ ...current, successMessage: null }))
  }), [state]);
  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const value = useContext(PrototypeContext);
  if (!value) throw new Error('usePrototype must be used inside PrototypeProvider');
  return value;
}
