import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { addCareUpdate, beginIdentityRegistration, completeIdentityRegistration, createInitialPrototypeState, resolveQuestion, selectIdentityType, selectProfessionalType, transitionAction } from './prototypeState';
import type { ActionStatus, DemoRole, IdentityRegistrationMode, NewUpdateInput, PrimaryIdentityType, ProfessionalType, PrototypeState } from '../types/prototype';

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
    clearSuccess: () => setState((current) => ({ ...current, successMessage: null }))
  }), [state]);
  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const value = useContext(PrototypeContext);
  if (!value) throw new Error('usePrototype must be used inside PrototypeProvider');
  return value;
}
