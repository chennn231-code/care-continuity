import { describe, expect, it } from 'vitest';
// @ts-expect-error The app intentionally omits Node typings; Vitest runs this contract in Node.
import { readFileSync } from 'node:fs';
import {
  DEMO_AUTHORITY_MARKER,
  NO_ALLOWED_OPERATIONS,
  type ActionDetailView,
  type EligibleReassignmentCandidateView,
  type ReassignActionInput,
  type ScreenState,
  type SessionView
} from '../src/winwin/contracts/frontendContract';
import type {
  ResponsibilityRecoveryService,
  VerticalSliceService
} from '../src/winwin/contracts/verticalSliceService';
import { DemoVerticalSliceService } from '../src/winwin/adapters/demo/DemoVerticalSliceService';

const winwinStyles = readFileSync(new URL('../src/winwin/winwin.css', import.meta.url), 'utf8');

describe('WinWin frontend-safe contract', () => {
  it('defines the canonical reassignment capability and defaults it closed', () => {
    expect(NO_ALLOWED_OPERATIONS.ACTION_REASSIGN).toBe(false);
    expect(NO_ALLOWED_OPERATIONS).not.toHaveProperty('REASSIGN_ACTION');
  });

  it('keeps reassignment candidate and input projections minimized', () => {
    const candidate: EligibleReassignmentCandidateView = {
      candidateRef: 'opaque-candidate',
      displayName: '陳小姐',
      relationshipDisplay: '照顧協作者'
    };
    const input: ReassignActionInput = {
      actionId: 'opaque-action',
      assigneeCandidateRef: candidate.candidateRef,
      expectedVersion: 'opaque-version'
    };

    expect(Object.keys(candidate).sort()).toEqual([
      'candidateRef',
      'displayName',
      'relationshipDisplay'
    ]);
    expect(candidate).not.toHaveProperty('identityId');
    expect(candidate).not.toHaveProperty('membershipId');
    expect(candidate).not.toHaveProperty('grants');
    expect(candidate).not.toHaveProperty('contactDetails');
    expect(candidate).not.toHaveProperty('healthData');
    expect(candidate).not.toHaveProperty('availability');
    expect(candidate).not.toHaveProperty('score');
    expect(input).toEqual({
      actionId: 'opaque-action',
      assigneeCandidateRef: 'opaque-candidate',
      expectedVersion: 'opaque-version'
    });
    expect(input).not.toHaveProperty('actorIdentity');
    expect(input).not.toHaveProperty('operationKey');
  });

  it('constructs representative minimized projections without authority records', () => {
    const action: ActionDetailView = {
      actionId: 'opaque-action',
      caseId: 'opaque-case',
      expectedVersion: 'opaque-version',
      title: '確認照顧安排',
      lifecycleState: 'ASSIGNED',
      stateDisplay: '尚待接手',
      sourceCareUpdate: {
        careUpdateId: 'opaque-update',
        versionId: 'opaque-update-version',
        summary: '早上的照顧安排需要確認。'
      },
      reason: '需要一位協作者確認接手。',
      currentHolderDisplay: '王先生',
      assignedByDisplay: '林小姐',
      serverAssignedAt: '2026-09-05T02:00:00.000Z',
      responsibilityHistory: [],
      allowedOperations: {
        ...NO_ALLOWED_OPERATIONS,
        ACCEPT_ACTION: true,
        DECLINE_ACTION: true
      }
    };

    expect(action.lifecycleState).toBe('ASSIGNED');
    expect(action.allowedOperations.ACCEPT_ACTION).toBe(true);
    expect(action).not.toHaveProperty('grants');
    expect(action).not.toHaveProperty('membership');
    expect(action).not.toHaveProperty('role');
  });

  it('keeps public unavailable state non-enumerating', () => {
    const unavailable: ScreenState<SessionView> = { status: 'unavailable' };
    expect(unavailable).toEqual({ status: 'unavailable' });
    expect(unavailable).not.toHaveProperty('reason');
    expect(unavailable).not.toHaveProperty('revokedBy');
  });

  it('rejects authority-bearing fields from safe session projections at compile time', () => {
    const safe: SessionView = {
      disposition: 'SIGNED_IN',
      actorDisplay: '林小姐',
      demoMarker: DEMO_AUTHORITY_MARKER
    };
    expect(safe.demoMarker).toBe('DEMO_NON_AUTHORITATIVE');

    const unsafe: SessionView = {
      disposition: 'SIGNED_IN',
      // @ts-expect-error Grant inventories are not frontend-safe projection fields.
      grants: [{ capability: 'RECORD_VIEW' }]
    };
    expect(unsafe).toBeDefined();
  });
});

describe('VerticalSliceService and deterministic demo boundary', () => {
  it('defines a bounded responsibility-recovery service extension without demo behavior', () => {
    type CandidateRead = ResponsibilityRecoveryService['getEligibleReassignmentCandidates'];
    type Reassign = ResponsibilityRecoveryService['reassignAction'];
    const methodNames: readonly (keyof ResponsibilityRecoveryService)[] = [
      'getEligibleReassignmentCandidates',
      'reassignAction'
    ];

    expect(methodNames).toEqual(['getEligibleReassignmentCandidates', 'reassignAction']);
    expectTypeOnly<CandidateRead>();
    expectTypeOnly<Reassign>();
  });

  it('implements all fourteen frontend-safe logical seams', () => {
    const service: VerticalSliceService = new DemoVerticalSliceService();
    const methods: readonly (keyof VerticalSliceService)[] = [
      'resolveSession',
      'getAuthorizedCases',
      'getCaseHome',
      'getTimeline',
      'createCareUpdate',
      'getEligibleActionAssignees',
      'createAction',
      'getActionDetail',
      'acceptAction',
      'declineAction',
      'startAction',
      'completeAction',
      'lookupOperationStatus',
      'advanceReadCursor'
    ];
    expect(methods).toHaveLength(14);
    expect(methods.every((method) => typeof service[method] === 'function')).toBe(true);
  });

  it('returns stable precomputed projections and consumes allowed operations as data', async () => {
    const service = new DemoVerticalSliceService();
    const first = await service.getActionDetail('demo-case-1', 'demo-action-1');
    const second = await service.getActionDetail('demo-case-1', 'demo-action-1');

    expect(first).toEqual(second);
    expect(first.result).toBe('SUCCESS');
    if (first.result !== 'SUCCESS') throw new Error('Expected deterministic demo success');
    expect(first.data.allowedOperations).toMatchObject({
      ACCEPT_ACTION: true,
      DECLINE_ACTION: true,
      START_ACTION: false
    });
    expect(first.data).not.toHaveProperty('role');
    expect(first.data).not.toHaveProperty('grants');
  });

  it('uses configured server-like outcomes without deriving production authority', async () => {
    const service = new DemoVerticalSliceService({
      operationOutcomes: {
        'operation-unknown': {
          operationKey: 'operation-unknown',
          outcome: 'UNKNOWN'
        }
      }
    });
    expect(await service.lookupOperationStatus('operation-unknown')).toEqual({
      operationKey: 'operation-unknown',
      outcome: 'UNKNOWN'
    });
    expect(service.authorityMarker).toBe('DEMO_NON_AUTHORITATIVE');
  });

  it('does not claim an unobserved operation committed', async () => {
    const service = new DemoVerticalSliceService();
    expect(await service.lookupOperationStatus('operation-not-observed')).toEqual({
      operationKey: 'operation-not-observed',
      outcome: 'UNKNOWN'
    });
  });

  it('returns a non-enumerating result for unknown protected identifiers', async () => {
    const service = new DemoVerticalSliceService();
    expect(await service.getCaseHome('not-visible')).toEqual({
      result: 'NOT_FOUND_OR_NOT_VISIBLE'
    });
  });

  it('creates a distinct pending cycle without changing prior declined history', async () => {
    const service: ResponsibilityRecoveryService = new DemoVerticalSliceService();
    const declined = await service.declineAction(
      { actionId: 'demo-action-1', expectedVersion: '1' },
      'decline-cycle-1'
    );
    expect(declined.result).toBe('SUCCESS');
    if (declined.result !== 'SUCCESS') throw new Error('Expected initial decline');
    const priorHistory = structuredClone(declined.data.responsibilityHistory);

    const candidates = await service.getEligibleReassignmentCandidates('demo-action-1');
    expect(candidates.result).toBe('SUCCESS');
    if (candidates.result !== 'SUCCESS') throw new Error('Expected eligible candidates');
    expect(candidates.data[0]).toEqual({
      candidateRef: 'demo-candidate-c',
      displayName: '陳小姐',
      relationshipDisplay: '照顧協作者',
      serviceValidityDisplay: '目前可邀請確認'
    });
    expect(candidates.data[0]).not.toHaveProperty('grants');
    expect(candidates.data[0]).not.toHaveProperty('contactDetails');
    expect(candidates.data[0]).not.toHaveProperty('healthData');
    expect(candidates.data[0]).not.toHaveProperty('availability');
    expect(candidates.data[0]).not.toHaveProperty('score');

    const reassigned = await service.reassignAction({
      actionId: 'demo-action-1',
      assigneeCandidateRef: 'demo-candidate-c',
      expectedVersion: declined.data.expectedVersion
    }, 'reassign-cycle-2');
    expect(reassigned.result).toBe('SUCCESS');
    if (reassigned.result !== 'SUCCESS') throw new Error('Expected reassignment');
    expect(reassigned.data.responsibilityHistory.slice(0, priorHistory.length)).toEqual(priorHistory);
    expect(reassigned.data.responsibilityHistory.at(-1)).toMatchObject({
      historyId: 'demo-cycle-2-assigned',
      personDisplay: '陳小姐',
      relevance: 'CURRENT'
    });
    expect(reassigned.data.stateDisplay).toBe('等待 陳小姐 確認');
    expect(reassigned.data.stateDisplay).not.toContain('確定接手者');
    expect(reassigned.data.lifecycleState).toBe('ASSIGNED');
    expect(reassigned.data.continuityGap).toBeUndefined();
  });

  it('restores confirmed coverage only after replacement acceptance', async () => {
    const service = new DemoVerticalSliceService();
    const declined = await service.declineAction(
      { actionId: 'demo-action-1', expectedVersion: '1' },
      'decline-before-accept'
    );
    if (declined.result !== 'SUCCESS') throw new Error('Expected initial decline');
    const reassigned = await service.reassignAction({
      actionId: 'demo-action-1',
      assigneeCandidateRef: 'demo-candidate-c',
      expectedVersion: declined.data.expectedVersion
    }, 'reassign-before-accept');
    if (reassigned.result !== 'SUCCESS') throw new Error('Expected reassignment');
    expect(reassigned.data.stateDisplay).toBe('等待 陳小姐 確認');

    const accepted = await service.acceptAction({
      actionId: 'demo-action-1',
      expectedVersion: reassigned.data.expectedVersion
    }, 'accept-cycle-2');
    expect(accepted.result).toBe('SUCCESS');
    if (accepted.result !== 'SUCCESS') throw new Error('Expected replacement acceptance');
    expect(accepted.data.lifecycleState).toBe('ACCEPTED');
    expect(accepted.data.stateDisplay).toBe('已確認接手');
    expect(accepted.data.currentHolderDisplay).toBe('陳小姐');
    expect(accepted.data.responsibilityHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({ historyId: 'demo-cycle-1-declined', relevance: 'HISTORICAL' }),
      expect.objectContaining({ historyId: 'demo-cycle-2-assigned', personDisplay: '陳小姐' }),
      expect.objectContaining({ historyId: 'demo-history-accepted', personDisplay: '陳小姐' })
    ]));
  });

  it('ends only the replacement cycle and permits a previous decliner through a third cycle', async () => {
    const service = new DemoVerticalSliceService();
    const firstDecline = await service.declineAction(
      { actionId: 'demo-action-1', expectedVersion: '1' },
      'decline-cycle-one'
    );
    if (firstDecline.result !== 'SUCCESS') throw new Error('Expected first decline');
    const secondCycle = await service.reassignAction({
      actionId: 'demo-action-1',
      assigneeCandidateRef: 'demo-candidate-c',
      expectedVersion: firstDecline.data.expectedVersion
    }, 'assign-cycle-two');
    if (secondCycle.result !== 'SUCCESS') throw new Error('Expected second cycle');
    const secondDecline = await service.declineAction({
      actionId: 'demo-action-1',
      expectedVersion: secondCycle.data.expectedVersion
    }, 'decline-cycle-two');
    if (secondDecline.result !== 'SUCCESS') throw new Error('Expected second decline');
    expect(secondDecline.data.continuityGap?.followUpDisplay).toBe('需要重新安排');
    expect(secondDecline.data.currentHolderDisplay).toBeUndefined();
    expect(secondDecline.data.allowedOperations.ACTION_REASSIGN).toBe(true);

    const thirdCycle = await service.reassignAction({
      actionId: 'demo-action-1',
      assigneeCandidateRef: 'demo-candidate-b',
      expectedVersion: secondDecline.data.expectedVersion
    }, 'assign-cycle-three');
    expect(thirdCycle.result).toBe('SUCCESS');
    if (thirdCycle.result !== 'SUCCESS') throw new Error('Expected third cycle');
    expect(thirdCycle.data.responsibilityHistory.at(-1)).toMatchObject({
      historyId: 'demo-cycle-3-assigned',
      personDisplay: '王先生'
    });
    expect(thirdCycle.data.responsibilityHistory.filter(({ relevance }) => relevance === 'CURRENT'))
      .toHaveLength(1);
  });

  it('enforces currentness, one effective cycle, candidate eligibility and idempotency', async () => {
    const service = new DemoVerticalSliceService();
    const declined = await service.declineAction(
      { actionId: 'demo-action-1', expectedVersion: '1' },
      'decline-for-guards'
    );
    if (declined.result !== 'SUCCESS') throw new Error('Expected decline');
    const input = {
      actionId: 'demo-action-1',
      assigneeCandidateRef: 'demo-candidate-c',
      expectedVersion: declined.data.expectedVersion
    } as const;
    expect(await service.reassignAction({ ...input, assigneeCandidateRef: 'hidden-person' }, 'bad-target'))
      .toEqual({ result: 'TARGET_INELIGIBLE' });

    const first = await service.reassignAction(input, 'stable-reassign-key');
    expect(first.result).toBe('SUCCESS');
    expect(await service.reassignAction(input, 'stable-reassign-key')).toEqual(first);
    expect(await service.reassignAction({ ...input, assigneeCandidateRef: 'demo-candidate-b' }, 'stable-reassign-key'))
      .toEqual({ result: 'IDEMPOTENCY_CONFLICT' });
    expect(await service.reassignAction(input, 'parallel-attempt')).toEqual({ result: 'STALE_VERSION' });
    expect(await service.reassignAction({ ...input, expectedVersion: 'stale-version' }, 'stale-attempt'))
      .toEqual({ result: 'STALE_VERSION' });
    if (first.result !== 'SUCCESS') throw new Error('Expected reassignment');
    expect(first.data.responsibilityHistory.filter(({ relevance }) => relevance === 'CURRENT'))
      .toHaveLength(1);
    const activity = await service.getTimeline('demo-case-1');
    expect(activity.result).toBe('SUCCESS');
    if (activity.result !== 'SUCCESS') throw new Error('Expected activity projection');
    expect(activity.data.entries.filter(({ eventDisplay }) => (
      eventDisplay === '已請 陳小姐 確認是否接手'
    ))).toHaveLength(1);
  });

  it('keeps empty and unknown outcomes non-mutating and never auto-selects', async () => {
    const emptyService = new DemoVerticalSliceService({
      reassignmentCandidatesResult: { result: 'EMPTY' }
    });
    const emptyDecline = await emptyService.declineAction(
      { actionId: 'demo-action-1', expectedVersion: '1' },
      'decline-empty'
    );
    if (emptyDecline.result !== 'SUCCESS') throw new Error('Expected decline');
    expect(await emptyService.getEligibleReassignmentCandidates('demo-action-1'))
      .toEqual({ result: 'EMPTY' });
    expect(await emptyService.reassignAction({
      actionId: 'demo-action-1',
      assigneeCandidateRef: 'demo-candidate-c',
      expectedVersion: emptyDecline.data.expectedVersion
    }, 'empty-reassign')).toEqual({ result: 'TARGET_INELIGIBLE' });
    expect((await emptyService.getActionDetail('demo-case-1', 'demo-action-1')))
      .toEqual({ result: 'SUCCESS', data: emptyDecline.data });

    const unknownService = new DemoVerticalSliceService({
      operationOutcomes: {
        'unknown-reassign': { operationKey: 'unknown-reassign', outcome: 'UNKNOWN' }
      }
    });
    const unknownDecline = await unknownService.declineAction(
      { actionId: 'demo-action-1', expectedVersion: '1' },
      'decline-unknown'
    );
    if (unknownDecline.result !== 'SUCCESS') throw new Error('Expected decline');
    const unknownInput = {
      actionId: 'demo-action-1',
      assigneeCandidateRef: 'demo-candidate-c',
      expectedVersion: unknownDecline.data.expectedVersion
    };
    expect(await unknownService.reassignAction(unknownInput, 'unknown-reassign')).toEqual({
      result: 'TEMPORARY_FAILURE',
      outcomeUncertain: true
    });
    expect(await unknownService.lookupOperationStatus('unknown-reassign')).toEqual({
      operationKey: 'unknown-reassign',
      outcome: 'UNKNOWN'
    });
    const stillGap = await unknownService.getActionDetail('demo-case-1', 'demo-action-1');
    expect(stillGap.result === 'SUCCESS' && stillGap.data.continuityGap).toBeDefined();
  });
});

function expectTypeOnly<T>(): void {
  expect(true).toBe(true);
}

describe('new-tree import boundary', () => {
  const sourceModules = import.meta.glob('../src/winwin/**/*.{ts,tsx}', {
    eager: true,
    import: 'default',
    query: '?raw'
  }) as Record<string, string>;

  it('has source modules to inspect', () => {
    expect(Object.keys(sourceModules).length).toBeGreaterThanOrEqual(4);
  });

  it('rejects prototype, Supabase, and authority-bearing imports', () => {
    const prohibitedImport = /from\s+['"][^'"]*(?:\/v2\/(?:state|types|data|authorization)|\/lib\/supabase)['"]/;
    const prohibitedAuthoritySymbols = /\b(?:DemoRole|AuthorizationGrant|GrantPath|domainAuthorizationContract)\b/;

    for (const [path, source] of Object.entries(sourceModules)) {
      expect(source, `${path} contains a prohibited dependency`).not.toMatch(prohibitedImport);
      expect(source, `${path} imports an authority-bearing symbol`).not.toMatch(prohibitedAuthoritySymbols);
    }
  });
});

describe('CP-F9 scoped WinWin stylesheet', () => {
  it('keeps responsive and reduced-motion rules inside the WinWin stylesheet', () => {
    expect(winwinStyles).toContain('@media (max-width: 38rem)');
    expect(winwinStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(winwinStyles).toContain('.winwin-care-update dl');
    expect(winwinStyles).toContain('.winwin-confirmation');
  });

  it('does not introduce obvious global element or root selectors', () => {
    expect(winwinStyles).not.toMatch(/(?:^|\n)\s*(?:html|body|:root|button|input|a)\s*\{/);
  });

  it('retains the bounded darker WinWin support-text colors selected for rendered verification', () => {
    expect(winwinStyles).toContain('color: #547180');
    expect(winwinStyles).toContain('color: #606f75');
    expect(winwinStyles).not.toContain('color: #587686');
    expect(winwinStyles).not.toContain('color: #65757b');
  });
});
