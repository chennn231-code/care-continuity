import { describe, expect, it } from 'vitest';
import {
  DEMO_AUTHORITY_MARKER,
  NO_ALLOWED_OPERATIONS,
  type ActionDetailView,
  type ScreenState,
  type SessionView
} from '../src/winwin/contracts/frontendContract';
import type { VerticalSliceService } from '../src/winwin/contracts/verticalSliceService';
import { DemoVerticalSliceService } from '../src/winwin/adapters/demo/DemoVerticalSliceService';

describe('WinWin frontend-safe contract', () => {
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
});

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
