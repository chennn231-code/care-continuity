import type {
  OperationKey,
  OperationOutcome,
  ReadCursorBoundary
} from '../contracts/frontendContract';

export type MutationFamily =
  | 'CREATE_CARE_UPDATE'
  | 'CREATE_ACTION'
  | 'ACTION_REASSIGN'
  | 'ACCEPT_ACTION'
  | 'DECLINE_ACTION'
  | 'START_ACTION'
  | 'COMPLETE_ACTION';

export type MutationIntent = Readonly<{
  family: MutationFamily;
  operationKey: OperationKey;
  requestFingerprint: string;
}>;

export type MutationState<T> =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'submitting'; intent: MutationIntent }>
  | Readonly<{ status: 'committed'; intent: MutationIntent; data: T }>
  | Readonly<{
      status: 'definitelyNotCommitted';
      intent: MutationIntent;
      requiresAuthoritativeRevalidation: true;
    }>
  | Readonly<{ status: 'uncertain'; intent: MutationIntent }>
  | Readonly<{ status: 'conflict'; intent: MutationIntent }>
  | Readonly<{ status: 'recoverableFailure'; intent: MutationIntent }>;

export type MutationEvent<T> =
  | Readonly<{ type: 'BEGIN'; intent: MutationIntent }>
  | Readonly<{ type: 'SUBMISSION_COMMITTED'; data: T }>
  | Readonly<{ type: 'SUBMISSION_DEFINITELY_NOT_COMMITTED' }>
  | Readonly<{ type: 'SUBMISSION_UNCERTAIN' }>
  | Readonly<{ type: 'SUBMISSION_CONFLICT' }>
  | Readonly<{ type: 'SUBMISSION_RECOVERABLE_FAILURE' }>
  | Readonly<{ type: 'LOOKUP_RESOLVED'; outcome: OperationOutcome; data?: T }>
  | Readonly<{ type: 'RETRY_SAME_INTENT'; intent: MutationIntent; revalidated: true }>
  | Readonly<{ type: 'RESET' }>;

export const IDLE_MUTATION_STATE: MutationState<never> = Object.freeze({ status: 'idle' });

export function isSameMutationIntent(left: MutationIntent, right: MutationIntent): boolean {
  return left.family === right.family
    && left.operationKey === right.operationKey
    && left.requestFingerprint === right.requestFingerprint;
}

export function reduceMutation<T>(
  state: MutationState<T>,
  event: MutationEvent<T>
): MutationState<T> {
  if (event.type === 'RESET') return { status: 'idle' };

  if (event.type === 'BEGIN') {
    return state.status === 'idle' || state.status === 'recoverableFailure'
      ? { status: 'submitting', intent: event.intent }
      : state;
  }

  if (event.type === 'RETRY_SAME_INTENT') {
    return state.status === 'definitelyNotCommitted'
      && isSameMutationIntent(state.intent, event.intent)
      ? { status: 'submitting', intent: state.intent }
      : state;
  }

  if (state.status === 'submitting') {
    if (event.type === 'SUBMISSION_COMMITTED') {
      return { status: 'committed', intent: state.intent, data: event.data };
    }
    if (event.type === 'SUBMISSION_DEFINITELY_NOT_COMMITTED') {
      return {
        status: 'definitelyNotCommitted',
        intent: state.intent,
        requiresAuthoritativeRevalidation: true
      };
    }
    if (event.type === 'SUBMISSION_UNCERTAIN') {
      return { status: 'uncertain', intent: state.intent };
    }
    if (event.type === 'SUBMISSION_CONFLICT') {
      return { status: 'conflict', intent: state.intent };
    }
    if (event.type === 'SUBMISSION_RECOVERABLE_FAILURE') {
      return { status: 'recoverableFailure', intent: state.intent };
    }
  }

  if (state.status === 'uncertain' && event.type === 'LOOKUP_RESOLVED') {
    if (event.outcome === 'COMMITTED' && event.data !== undefined) {
      return { status: 'committed', intent: state.intent, data: event.data };
    }
    if (event.outcome === 'DEFINITELY_NOT_COMMITTED') {
      return {
        status: 'definitelyNotCommitted',
        intent: state.intent,
        requiresAuthoritativeRevalidation: true
      };
    }
    if (event.outcome === 'IDEMPOTENCY_CONFLICT') {
      return { status: 'conflict', intent: state.intent };
    }
    return state;
  }

  return state;
}

export type CursorRenderDisposition =
  | 'completeSuccess'
  | 'authorizedEmpty'
  | 'partial'
  | 'unavailable'
  | 'fatal';

export type CursorResponse = Readonly<{
  responseId: string;
  generation: number;
  boundary?: ReadCursorBoundary;
}>;

export type CursorSafetyState = Readonly<{
  currentResponse?: CursorResponse;
  inFlightResponseId?: string;
  failedResponseId?: string;
  savedBoundary?: ReadCursorBoundary;
}>;

export const EMPTY_CURSOR_SAFETY_STATE: CursorSafetyState = Object.freeze({});

export type CursorAdvanceAttempt = Readonly<{
  responseId: string;
  generation: number;
  boundary: ReadCursorBoundary;
}>;

export function registerCursorResponse(
  state: CursorSafetyState,
  response: CursorResponse
): CursorSafetyState {
  if (state.currentResponse && response.generation <= state.currentResponse.generation) return state;
  return { currentResponse: response };
}

export function beginCursorAdvance(
  state: CursorSafetyState,
  disposition: CursorRenderDisposition
): Readonly<{ state: CursorSafetyState; attempt?: CursorAdvanceAttempt }> {
  const response = state.currentResponse;
  const eligibleRender = disposition === 'completeSuccess' || disposition === 'authorizedEmpty';
  if (!response || !eligibleRender || !response.boundary || state.inFlightResponseId === response.responseId) {
    return { state };
  }

  return {
    state: { ...state, inFlightResponseId: response.responseId, failedResponseId: undefined },
    attempt: {
      responseId: response.responseId,
      generation: response.generation,
      boundary: response.boundary
    }
  };
}

export function settleCursorAdvance(
  state: CursorSafetyState,
  attempt: CursorAdvanceAttempt,
  result: Readonly<{ status: 'saved'; serverBoundary: ReadCursorBoundary }> | Readonly<{ status: 'failed' }>
): CursorSafetyState {
  if (state.currentResponse?.responseId !== attempt.responseId
    || state.inFlightResponseId !== attempt.responseId) return state;

  if (result.status === 'saved') {
    return {
      ...state,
      inFlightResponseId: undefined,
      failedResponseId: undefined,
      savedBoundary: result.serverBoundary
    };
  }

  return {
    ...state,
    inFlightResponseId: undefined,
    failedResponseId: attempt.responseId
  };
}

export function retryCursorAdvance(
  state: CursorSafetyState
): Readonly<{ state: CursorSafetyState; attempt?: CursorAdvanceAttempt }> {
  if (!state.currentResponse || state.failedResponseId !== state.currentResponse.responseId) {
    return { state };
  }
  return beginCursorAdvance(state, 'completeSuccess');
}
