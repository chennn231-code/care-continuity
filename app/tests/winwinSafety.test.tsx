import { describe, expect, it } from 'vitest';
import {
  EMPTY_CURSOR_SAFETY_STATE,
  beginCursorAdvance,
  isSameMutationIntent,
  reduceMutation,
  registerCursorResponse,
  retryCursorAdvance,
  settleCursorAdvance,
  type CursorResponse,
  type MutationFamily,
  type MutationIntent,
  type MutationState
} from '../src/winwin/safety/safetyState';

const mutationFamilies: readonly MutationFamily[] = [
  'CREATE_CARE_UPDATE',
  'CREATE_ACTION',
  'ACCEPT_ACTION',
  'DECLINE_ACTION',
  'START_ACTION',
  'COMPLETE_ACTION'
];

const intent = (family: MutationFamily = 'CREATE_CARE_UPDATE'): MutationIntent => ({
  family,
  operationKey: `operation-${family}`,
  requestFingerprint: `fingerprint-${family}`
});

describe('pure mutation safety machine', () => {
  it.each(mutationFamilies)('starts %s with one stable caller-issued operation key', (family) => {
    const started = reduceMutation<string>({ status: 'idle' }, { type: 'BEGIN', intent: intent(family) });
    expect(started).toEqual({ status: 'submitting', intent: intent(family) });
  });

  it('moves a known committed submission to the authoritative result', () => {
    const started = reduceMutation<string>({ status: 'idle' }, { type: 'BEGIN', intent: intent() });
    expect(reduceMutation(started, { type: 'SUBMISSION_COMMITTED', data: 'server-result' })).toEqual({
      status: 'committed',
      intent: intent(),
      data: 'server-result'
    });
  });

  it('requires revalidation before a definitely-not-committed same-intent retry', () => {
    const started = reduceMutation<string>({ status: 'idle' }, { type: 'BEGIN', intent: intent() });
    const retryable = reduceMutation(started, { type: 'SUBMISSION_DEFINITELY_NOT_COMMITTED' });
    expect(retryable).toMatchObject({
      status: 'definitelyNotCommitted',
      requiresAuthoritativeRevalidation: true
    });
    expect(reduceMutation(retryable, {
      type: 'RETRY_SAME_INTENT',
      intent: intent(),
      revalidated: true
    })).toEqual(started);
  });

  it('does not silently replay with a new key or changed request', () => {
    const started = reduceMutation<string>({ status: 'idle' }, { type: 'BEGIN', intent: intent() });
    const retryable = reduceMutation(started, { type: 'SUBMISSION_DEFINITELY_NOT_COMMITTED' });
    const replacement = { ...intent(), operationKey: 'automatic-replacement-key' };
    expect(isSameMutationIntent(intent(), replacement)).toBe(false);
    expect(reduceMutation(retryable, {
      type: 'RETRY_SAME_INTENT',
      intent: replacement,
      revalidated: true
    })).toBe(retryable);
  });

  it.each([
    ['COMMITTED', 'committed'],
    ['DEFINITELY_NOT_COMMITTED', 'definitelyNotCommitted'],
    ['UNKNOWN', 'uncertain'],
    ['IDEMPOTENCY_CONFLICT', 'conflict']
  ] as const)('resolves lookup outcome %s without implicit resubmission', (outcome, expectedStatus) => {
    const started = reduceMutation<string>({ status: 'idle' }, { type: 'BEGIN', intent: intent() });
    const uncertain = reduceMutation(started, { type: 'SUBMISSION_UNCERTAIN' });
    const resolved = reduceMutation(uncertain, {
      type: 'LOOKUP_RESOLVED',
      outcome,
      data: outcome === 'COMMITTED' ? 'server-result' : undefined
    });
    expect(resolved.status).toBe(expectedStatus);
    expect(resolved.status).not.toBe('submitting');
  });

  it('keeps recoverable failure distinct from uncertain status lookup', () => {
    const started: MutationState<string> = {
      status: 'submitting',
      intent: intent()
    };
    expect(reduceMutation(started, { type: 'SUBMISSION_RECOVERABLE_FAILURE' }).status)
      .toBe('recoverableFailure');
  });
});

const response = (
  responseId: string,
  generation: number,
  boundary?: string
): CursorResponse => ({ responseId, generation, boundary });

describe('pure Read Cursor safety logic', () => {
  it('permits complete success only with a server-issued boundary', () => {
    const registered = registerCursorResponse(
      EMPTY_CURSOR_SAFETY_STATE,
      response('response-1', 1, 'server-boundary-1')
    );
    expect(beginCursorAdvance(registered, 'completeSuccess').attempt).toEqual({
      responseId: 'response-1',
      generation: 1,
      boundary: 'server-boundary-1'
    });
    expect(beginCursorAdvance(
      registerCursorResponse(EMPTY_CURSOR_SAFETY_STATE, response('response-2', 2)),
      'completeSuccess'
    ).attempt).toBeUndefined();
  });

  it('permits authorized empty only when its response includes a valid boundary', () => {
    const withBoundary = registerCursorResponse(
      EMPTY_CURSOR_SAFETY_STATE,
      response('empty-1', 1, 'server-empty-boundary')
    );
    const withoutBoundary = registerCursorResponse(
      EMPTY_CURSOR_SAFETY_STATE,
      response('empty-2', 2)
    );
    expect(beginCursorAdvance(withBoundary, 'authorizedEmpty').attempt?.boundary)
      .toBe('server-empty-boundary');
    expect(beginCursorAdvance(withoutBoundary, 'authorizedEmpty').attempt).toBeUndefined();
  });

  it.each(['partial', 'unavailable', 'fatal'] as const)('does not advance for %s render', (disposition) => {
    const registered = registerCursorResponse(
      EMPTY_CURSOR_SAFETY_STATE,
      response('response-1', 1, 'server-boundary-1')
    );
    expect(beginCursorAdvance(registered, disposition).attempt).toBeUndefined();
  });

  it('bounds duplicate attempts for the same response', () => {
    const registered = registerCursorResponse(
      EMPTY_CURSOR_SAFETY_STATE,
      response('response-1', 1, 'server-boundary-1')
    );
    const first = beginCursorAdvance(registered, 'completeSuccess');
    expect(first.attempt).toBeDefined();
    expect(beginCursorAdvance(first.state, 'completeSuccess')).toEqual({ state: first.state });
  });

  it('prevents an older response from superseding newer response state', () => {
    const newer = registerCursorResponse(
      EMPTY_CURSOR_SAFETY_STATE,
      response('response-new', 2, 'server-boundary-2')
    );
    expect(registerCursorResponse(newer, response('response-old', 1, 'server-boundary-1'))).toBe(newer);
    expect(registerCursorResponse(newer, response('response-equal', 2, 'server-boundary-other'))).toBe(newer);
  });

  it('ignores late completion after a newer response supersedes the attempt', () => {
    const first = beginCursorAdvance(
      registerCursorResponse(EMPTY_CURSOR_SAFETY_STATE, response('response-1', 1, 'boundary-1')),
      'completeSuccess'
    );
    if (!first.attempt) throw new Error('Expected cursor attempt');
    const newer = registerCursorResponse(first.state, response('response-2', 2, 'boundary-2'));
    expect(settleCursorAdvance(newer, first.attempt, {
      status: 'saved',
      serverBoundary: 'boundary-1'
    })).toBe(newer);
  });

  it('retains same-boundary retry after failure and accepts the server maximum', () => {
    const begun = beginCursorAdvance(
      registerCursorResponse(EMPTY_CURSOR_SAFETY_STATE, response('response-1', 1, 'boundary-1')),
      'completeSuccess'
    );
    if (!begun.attempt) throw new Error('Expected cursor attempt');
    const failed = settleCursorAdvance(begun.state, begun.attempt, { status: 'failed' });
    const retried = retryCursorAdvance(failed);
    expect(retried.attempt?.boundary).toBe('boundary-1');
    if (!retried.attempt) throw new Error('Expected cursor retry');
    expect(settleCursorAdvance(retried.state, retried.attempt, {
      status: 'saved',
      serverBoundary: 'server-monotonic-maximum'
    }).savedBoundary).toBe('server-monotonic-maximum');
  });

  it('uses a later valid response boundary instead of retrying an older failed response', () => {
    const begun = beginCursorAdvance(
      registerCursorResponse(EMPTY_CURSOR_SAFETY_STATE, response('response-1', 1, 'boundary-1')),
      'completeSuccess'
    );
    if (!begun.attempt) throw new Error('Expected cursor attempt');
    const failed = settleCursorAdvance(begun.state, begun.attempt, { status: 'failed' });
    const later = registerCursorResponse(failed, response('response-2', 2, 'boundary-2'));
    expect(retryCursorAdvance(later).attempt).toBeUndefined();
    expect(beginCursorAdvance(later, 'completeSuccess').attempt?.boundary).toBe('boundary-2');
  });
});
