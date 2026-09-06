import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App, DEFAULT_PRODUCT_PATH } from '../src/App';
import { DemoVerticalSliceService } from '../src/winwin/adapters/demo/DemoVerticalSliceService';
import type {
  ActionDetailView,
  ActionMutationInput,
  AuthorizedCaseSummary,
  CaseHomeView,
  CareUpdateDetailView,
  CommandResult,
  CompleteActionInput,
  CreateCareUpdateInput,
  CreateActionInput,
  EligibleAssigneeView,
  OperationKey,
  OperationStatusView,
  ProjectionResult,
  ReadCursorAdvanceView,
  TimelineView
} from '../src/winwin/contracts/frontendContract';
import { WinWinRoutes } from '../src/winwin/routes/WinWinRoutes';

function DomHarnessProof() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <main aria-labelledby="proof-heading">
      <h1 id="proof-heading">DOM 測試能力確認</h1>
      <label htmlFor="proof-name">顯示名稱</label>
      <input id="proof-name" />
      <button type="button" disabled={submitted} onClick={() => setSubmitted(true)}>
        確認
      </button>
      <p role="status" aria-live="polite">
        {submitted ? '已確認' : '尚未確認'}
      </p>
    </main>
  );
}

describe('CP-F0 DOM interaction foundation', () => {
  it('supports semantic queries, accessible names, focus, typing, interaction, and status assertions', async () => {
    const user = userEvent.setup();
    render(<DomHarnessProof />);

    const input = screen.getByRole('textbox', { name: '顯示名稱' });
    const button = screen.getByRole('button', { name: '確認' });
    expect(screen.getByRole('main')).toHaveAccessibleName('DOM 測試能力確認');
    expect(screen.getByRole('status')).toHaveTextContent('尚未確認');

    await user.click(input);
    await user.keyboard('林小姐');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('林小姐');

    await user.click(button);
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('已確認');
  });
});

async function openAndFillCreateAction(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: '建立處理事項' }));
  await screen.findByLabelText('要處理的事項 *');
  await user.type(screen.getByLabelText('要處理的事項 *'), '確認明天早上移位協助人力');
  await user.type(screen.getByLabelText('需要處理的原因 *'), '確認明早有足夠人力協助移位');
  await user.selectOptions(screen.getByLabelText('指派給 *'), 'demo-candidate-b');
}

describe('CP-F5 Accept or currently unable to take responsibility', () => {
  const actionPath = '/winwin/cases/demo-case-1/actions/demo-action-1';

  it('renders the adopted Action Detail hierarchy and only projected decision controls', async () => {
    renderWinWin(new DemoVerticalSliceService(), actionPath);
    expect(await screen.findByRole('heading', { level: 1, name: '確認明早照顧安排' })).toBeInTheDocument();
    expect(screen.getByText('尚待接手')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '接受處理' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '目前無法接手' })).toBeEnabled();
    expect(screen.getByRole('heading', { name: '負責與處理紀錄' })).toBeInTheDocument();
    expect(screen.queryByText(/Grant|ACTION_DECLINE|NEEDS_REASSIGNMENT/)).not.toBeInTheDocument();
  });

  it('does not infer either decision from visible assignee data', async () => {
    class ViewerOnly extends DemoVerticalSliceService {
      override async getActionDetail(caseId: string, actionId: string) {
        const result = await super.getActionDetail(caseId, actionId);
        return result.result === 'SUCCESS'
          ? { result: 'SUCCESS' as const, data: { ...result.data, allowedOperations: { ...result.data.allowedOperations, ACCEPT_ACTION: false, DECLINE_ACTION: false } } }
          : result;
      }
    }
    renderWinWin(new ViewerOnly(), actionPath);
    expect(await screen.findByText('王先生')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '接受處理' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '目前無法接手' })).not.toBeInTheDocument();
  });

  it('gives Accept synchronous ownership, one key, and cross-decision exclusion', async () => {
    let settle!: (value: CommandResult<ActionDetailView>) => void;
    const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
    class PendingAccept extends DemoVerticalSliceService {
      accepts: OperationKey[] = []; declines = 0;
      override acceptAction(_input: ActionMutationInput, key: OperationKey) { this.accepts.push(key); return pending; }
      override async declineAction() { this.declines++; return { result: 'STALE_VERSION' as const }; }
    }
    const service = new PendingAccept(); renderWinWin(service, actionPath);
    const accept = await screen.findByRole('button', { name: '接受處理' });
    const decline = screen.getByRole('button', { name: '目前無法接手' });
    accept.click(); accept.click(); decline.click();
    expect(service.accepts).toHaveLength(1); expect(service.declines).toBe(0);
    expect(await screen.findByRole('button', { name: '正在接受…' })).toBeDisabled();
    settle({ result: 'TEMPORARY_FAILURE', outcomeUncertain: true });
    expect(await screen.findByText(/目前無法確認是否已成功更新接手狀態/)).toBeInTheDocument();
  });

  it('accepts explicitly, then uses getActionDetail for authoritative ACCEPTED without starting work', async () => {
    class AcceptProbe extends DemoVerticalSliceService {
      accepts = 0; detailReads = 0;
      override acceptAction(input: ActionMutationInput, key: OperationKey) { this.accepts++; return super.acceptAction(input, key); }
      override getActionDetail(caseId: string, actionId: string) { this.detailReads++; return super.getActionDetail(caseId, actionId); }
    }
    const service = new AcceptProbe(); const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    expect((await screen.findAllByText('已確認接手')).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('處理中')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '接受處理' })).not.toBeInTheDocument();
    expect(service.accepts).toBe(1); expect(service.detailReads).toBeGreaterThanOrEqual(2);
  });

  it('requires explicit decline confirmation, synchronously deduplicates it, and preserves truthful gap history', async () => {
    class DeclineProbe extends DemoVerticalSliceService {
      keys: OperationKey[] = [];
      override declineAction(input: ActionMutationInput, key: OperationKey) { this.keys.push(key); return super.declineAction(input, key); }
    }
    const service = new DeclineProbe(); const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '目前無法接手' }));
    expect(screen.getByRole('dialog', { name: '目前無法接手這項處理事項？' })).toHaveTextContent('系統不會自動指定其他人');
    const confirm = screen.getByRole('button', { name: '確認目前無法接手' });
    confirm.click(); confirm.click();
    expect(service.keys).toHaveLength(1);
    expect(await screen.findAllByText('目前沒有人確定接手')).not.toHaveLength(0);
    expect(screen.getAllByText(/需要重新安排/).length).toBeGreaterThan(0);
    expect(screen.getByText('目前無法接手', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText('已重新指派')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /重新指派|選擇其他人/ })).not.toBeInTheDocument();
  });

  it('keeps UNKNOWN separate, deduplicates lookup, correlates the key, and never replays', async () => {
    let settle!: (value: OperationStatusView) => void;
    const pending = new Promise<OperationStatusView>((resolve) => { settle = resolve; });
    class UnknownAccept extends DemoVerticalSliceService {
      accepts: OperationKey[] = []; lookups: OperationKey[] = [];
      override async acceptAction(_input: ActionMutationInput, key: OperationKey) { this.accepts.push(key); return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
      override lookupOperationStatus(key: OperationKey) { this.lookups.push(key); return pending; }
    }
    const service = new UnknownAccept(); const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    const lookup = await screen.findByRole('button', { name: '查詢更新狀態' });
    lookup.click(); lookup.click();
    expect(service.lookups).toEqual(service.accepts);
    settle({ operationKey: service.accepts[0], outcome: 'UNKNOWN' });
    await waitFor(() => expect(screen.getByRole('button', { name: '查詢更新狀態' })).toBeEnabled());
    expect(service.accepts).toHaveLength(1);
  });

  it.each(['COMMITTED', 'DEFINITELY_NOT_COMMITTED', 'UNKNOWN', 'IDEMPOTENCY_CONFLICT'] as const)(
    'makes mismatched %s lookup inert', async (outcome) => {
      class Mismatch extends DemoVerticalSliceService {
        reads = 0; accepts = 0;
        override async acceptAction() { this.accepts++; return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
        override async lookupOperationStatus() { return { operationKey: 'mismatch', outcome }; }
        override getActionDetail(caseId: string, actionId: string) { this.reads++; return super.getActionDetail(caseId, actionId); }
      }
      const service = new Mismatch(); const user = userEvent.setup(); renderWinWin(service, actionPath);
      await user.click(await screen.findByRole('button', { name: '接受處理' }));
      await user.click(await screen.findByRole('button', { name: '查詢更新狀態' }));
      await waitFor(() => expect(screen.getByRole('button', { name: '查詢更新狀態' })).toBeEnabled());
      expect(service.accepts).toBe(1); expect(service.reads).toBe(1);
    }
  );

  it('blocks same-key retry when the responsibility version changed', async () => {
    class StaleResponsibility extends DemoVerticalSliceService {
      accepts = 0; reads = 0; key?: OperationKey;
      override async acceptAction(_input: ActionMutationInput, key: OperationKey) { this.accepts++; this.key = key; return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: false }; }
      override async lookupOperationStatus(key: OperationKey) { return { operationKey: key, outcome: 'DEFINITELY_NOT_COMMITTED' as const }; }
      override async getActionDetail(caseId: string, actionId: string) {
        const result = await super.getActionDetail(caseId, actionId); this.reads++;
        return this.reads > 1 && result.result === 'SUCCESS'
          ? { result: 'SUCCESS' as const, data: { ...result.data, expectedVersion: 'responsibility-superseded' } }
          : result;
      }
    }
    const service = new StaleResponsibility(); const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    await user.click(await screen.findByRole('button', { name: '確認目前狀態並重試' }));
    await waitFor(() => expect(service.reads).toBe(2));
    expect(service.accepts).toBe(1);
    await waitFor(() => expect(screen.getByRole('button', { name: '接受處理' })).toBeEnabled());
  });

  it('uses a stable Decline key through UNKNOWN lookup without replay', async () => {
    class UnknownDecline extends DemoVerticalSliceService {
      declines: OperationKey[] = []; lookups: OperationKey[] = [];
      override async declineAction(_input: ActionMutationInput, key: OperationKey) { this.declines.push(key); return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
      override async lookupOperationStatus(key: OperationKey) { this.lookups.push(key); return { operationKey: key, outcome: 'UNKNOWN' as const }; }
    }
    const service = new UnknownDecline(); const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '目前無法接手' }));
    await user.click(screen.getByRole('button', { name: '確認目前無法接手' }));
    await user.click(await screen.findByRole('button', { name: '查詢更新狀態' }));
    expect(service.lookups).toEqual(service.declines);
    expect(service.declines).toHaveLength(1);
  });

  it.each(['COMMITTED', 'DEFINITELY_NOT_COMMITTED', 'UNKNOWN', 'IDEMPOTENCY_CONFLICT'] as const)(
    'makes mismatched Decline %s lookup inert', async (outcome) => {
      class MismatchDecline extends DemoVerticalSliceService {
        declines = 0; reads = 0;
        override async declineAction() { this.declines++; return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
        override async lookupOperationStatus() { return { operationKey: 'wrong-decline-key', outcome }; }
        override getActionDetail(caseId: string, actionId: string) { this.reads++; return super.getActionDetail(caseId, actionId); }
      }
      const service = new MismatchDecline(); const user = userEvent.setup(); renderWinWin(service, actionPath);
      await user.click(await screen.findByRole('button', { name: '目前無法接手' }));
      await user.click(screen.getByRole('button', { name: '確認目前無法接手' }));
      await user.click(await screen.findByRole('button', { name: '查詢更新狀態' }));
      await waitFor(() => expect(screen.getByRole('button', { name: '查詢更新狀態' })).toBeEnabled());
      expect(service.declines).toBe(1); expect(service.reads).toBe(1);
    }
  );

  it('keeps conflict distinct and does not generate a replacement key', async () => {
    class ConflictAccept extends DemoVerticalSliceService {
      keys: OperationKey[] = [];
      override async acceptAction(_input: ActionMutationInput, key: OperationKey) { this.keys.push(key); return { result: 'IDEMPOTENCY_CONFLICT' as const }; }
    }
    const service = new ConflictAccept(); const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    expect(await screen.findByText(/更新發生衝突/)).toBeInTheDocument();
    expect(service.keys).toHaveLength(1);
    expect(screen.getByRole('button', { name: '接受處理' })).toBeDisabled();
  });

  it('invalidates current mutation no-access but ignores obsolete no-access after navigation', async () => {
    class CurrentDenied extends DemoVerticalSliceService { override async acceptAction() { return { result: 'NOT_FOUND_OR_NOT_VISIBLE' as const }; } }
    const user = userEvent.setup(); renderWinWin(new CurrentDenied(), actionPath);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');

    cleanup();
    let settle!: (value: CommandResult<ActionDetailView>) => void;
    const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
    class StaleDenied extends DemoVerticalSliceService { override acceptAction() { return pending; } }
    function Harness({ service }: Readonly<{ service: StaleDenied }>) {
      const navigate = useNavigate();
      return <><button type="button" onClick={() => navigate('/winwin/cases')}>離開處理事項</button><WinWinRoutes service={service} /></>;
    }
    render(<MemoryRouter initialEntries={[actionPath]}><Harness service={new StaleDenied()} /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    await user.click(screen.getByRole('button', { name: '離開處理事項' }));
    expect(await screen.findByRole('heading', { name: '我的個案' })).toBeInTheDocument();
    settle({ result: 'NOT_FOUND_OR_NOT_VISIBLE' });
    await waitFor(() => expect(screen.getByRole('heading', { name: '我的個案' })).toBeInTheDocument());
  });

  it('makes a decision completion after unmount inert', async () => {
    let settle!: (value: CommandResult<ActionDetailView>) => void;
    const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
    class Pending extends DemoVerticalSliceService { override acceptAction() { return pending; } }
    const user = userEvent.setup(); const view = renderWinWin(new Pending(), actionPath);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    view.unmount(); settle({ result: 'NOT_FOUND_OR_NOT_VISIBLE' }); await Promise.resolve();
  });

  it('gives Decline first ownership and excludes an immediate Accept', async () => {
    let settle!: (value: CommandResult<ActionDetailView>) => void;
    const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
    class DeclineFirst extends DemoVerticalSliceService {
      declineKeys: OperationKey[] = []; acceptKeys: OperationKey[] = [];
      override declineAction(_input: ActionMutationInput, key: OperationKey) { this.declineKeys.push(key); return pending; }
      override acceptAction(_input: ActionMutationInput, key: OperationKey) { this.acceptKeys.push(key); return pending; }
    }
    const service = new DeclineFirst(); const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '目前無法接手' }));
    const accept = screen.getByRole('button', { name: '接受處理' });
    screen.getByRole('button', { name: '確認目前無法接手' }).click(); accept.click();
    expect(service.declineKeys).toHaveLength(1); expect(service.acceptKeys).toHaveLength(0);
    settle({ result: 'TEMPORARY_FAILURE', outcomeUncertain: true });
    expect(await screen.findByText(/目前無法確認是否已成功更新接手狀態/)).toBeInTheDocument();
  });

  it('retries a definitely-not-committed Accept once with the same key after successful revalidation', async () => {
    class RetryAccept extends DemoVerticalSliceService {
      keys: OperationKey[] = [];
      override acceptAction(input: ActionMutationInput, key: OperationKey) {
        this.keys.push(key);
        return this.keys.length === 1
          ? Promise.resolve({ result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: false })
          : super.acceptAction(input, key);
      }
      override async lookupOperationStatus(key: OperationKey) { return { operationKey: key, outcome: 'DEFINITELY_NOT_COMMITTED' as const }; }
    }
    const service = new RetryAccept(); const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    await user.click(await screen.findByRole('button', { name: '確認目前狀態並重試' }));
    expect((await screen.findAllByText('已確認接手')).length).toBeGreaterThan(0);
    expect(service.keys).toHaveLength(2); expect(new Set(service.keys).size).toBe(1);
  });

  it('keeps Decline conflict distinct without replay, family switch, or fabricated gap', async () => {
    class ConflictDecline extends DemoVerticalSliceService {
      declineKeys: OperationKey[] = []; accepts = 0;
      override async declineAction(_input: ActionMutationInput, key: OperationKey) { this.declineKeys.push(key); return { result: 'IDEMPOTENCY_CONFLICT' as const }; }
      override async acceptAction() { this.accepts++; return { result: 'STALE_VERSION' as const }; }
    }
    const service = new ConflictDecline(); const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '目前無法接手' }));
    await user.click(screen.getByRole('button', { name: '確認目前無法接手' }));
    expect(await screen.findByText(/更新發生衝突/)).toBeInTheDocument();
    expect(service.declineKeys).toHaveLength(1); expect(service.accepts).toBe(0);
    expect(screen.getByText('王先生')).toBeInTheDocument();
    expect(screen.queryByText('目前沒有人確定接手')).not.toBeInTheDocument();
  });

  it('keeps known-COMMITTED lookup non-actionable until explicit authoritative-read retry succeeds', async () => {
    const fixtureService = new DemoVerticalSliceService();
    const committed = await fixtureService.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accepted-fixture');
    if (committed.result !== 'SUCCESS') throw new Error('Expected accepted fixture');
    class LookupCommitted extends DemoVerticalSliceService {
      mutations = 0; reads = 0; keys: OperationKey[] = [];
      override async acceptAction(_input: ActionMutationInput, key: OperationKey) { this.mutations++; this.keys.push(key); return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
      override async lookupOperationStatus(key: OperationKey) { return { operationKey: key, outcome: 'COMMITTED' as const }; }
      override async getActionDetail(caseId: string, actionId: string) {
        this.reads++;
        if (this.reads === 2) return { result: 'TEMPORARY_FAILURE' as const, error: { code: 'TEMPORARY' as const, message: 'offline' } };
        if (this.reads >= 3) return { result: 'SUCCESS' as const, data: committed.data };
        return super.getActionDetail(caseId, actionId);
      }
    }
    const service = new LookupCommitted(); const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    await user.click(await screen.findByRole('button', { name: '查詢更新狀態' }));
    expect(await screen.findByText(/變更已送出，但最新狀態尚未重新載入完成/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '接受處理' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '目前無法接手' })).toBeDisabled();
    expect(service.mutations).toBe(1); expect(service.keys).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '重新載入最新狀態' }));
    expect((await screen.findAllByText('已確認接手')).length).toBeGreaterThan(0);
    expect(service.mutations).toBe(1); expect(service.keys).toHaveLength(1);
  });

  it('uses the same committed-pending-refresh safety for direct mutation success', async () => {
    class DirectCommitted extends DemoVerticalSliceService {
      mutations = 0; reads = 0;
      override acceptAction(input: ActionMutationInput, key: OperationKey) { this.mutations++; return super.acceptAction(input, key); }
      override async getActionDetail(caseId: string, actionId: string) {
        this.reads++;
        if (this.reads === 2) return { result: 'TEMPORARY_FAILURE' as const, error: { code: 'TEMPORARY' as const, message: 'offline' } };
        return super.getActionDetail(caseId, actionId);
      }
    }
    const service = new DirectCommitted(); const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    expect(await screen.findByText(/變更已送出，但最新狀態尚未重新載入完成/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '接受處理' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '重新載入最新狀態' }));
    expect((await screen.findAllByText('已確認接手')).length).toBeGreaterThan(0);
    expect(service.mutations).toBe(1);
  });

  it('invalidates protected context for current no-access during committed refresh', async () => {
    class CommittedThenDenied extends DemoVerticalSliceService {
      reads = 0;
      override async getActionDetail(caseId: string, actionId: string) {
        this.reads++;
        if (this.reads === 2) return { result: 'NOT_FOUND_OR_NOT_VISIBLE' as const };
        return super.getActionDetail(caseId, actionId);
      }
    }
    const user = userEvent.setup(); renderWinWin(new CommittedThenDenied(), actionPath);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');
    expect(screen.queryByText('王先生')).not.toBeInTheDocument();
  });

  it('makes stale no-access from a pending committed refresh inert in a newer Action', async () => {
    const initial = await new DemoVerticalSliceService().getActionDetail('demo-case-1', 'demo-action-1');
    if (initial.result !== 'SUCCESS') throw new Error('Expected Action fixture');
    let settleRead!: (value: ProjectionResult<ActionDetailView>) => void;
    const pendingRead = new Promise<ProjectionResult<ActionDetailView>>((resolve) => { settleRead = resolve; });
    class RefreshRace extends DemoVerticalSliceService {
      readsA = 0;
      override getActionDetail(caseId: string, actionId: string) {
        if (actionId === 'action-b') return Promise.resolve({ result: 'SUCCESS' as const, data: { ...initial.data, actionId, title: 'Action B 保持有效', expectedVersion: 'b1' } });
        this.readsA++;
        return this.readsA === 2 ? pendingRead : super.getActionDetail(caseId, actionId);
      }
    }
    function Harness({ service }: Readonly<{ service: RefreshRace }>) {
      const navigate = useNavigate();
      return <><button type="button" onClick={() => navigate('/winwin/cases/demo-case-1/actions/action-b')}>切換至 Action B</button><WinWinRoutes service={service} /></>;
    }
    const service = new RefreshRace(); const user = userEvent.setup();
    render(<MemoryRouter initialEntries={[actionPath]}><Harness service={service} /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    await user.click(screen.getByRole('button', { name: '切換至 Action B' }));
    expect(await screen.findByRole('heading', { name: 'Action B 保持有效' })).toBeInTheDocument();
    settleRead({ result: 'NOT_FOUND_OR_NOT_VISIBLE' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Action B 保持有效' })).toBeInTheDocument());
    expect(screen.queryByText('目前無法使用此內容')).not.toBeInTheDocument();
  });

  it('makes an Action A decision completion inert after navigating to Action B in the same Case', async () => {
    const initial = await new DemoVerticalSliceService().getActionDetail('demo-case-1', 'demo-action-1');
    if (initial.result !== 'SUCCESS') throw new Error('Expected Action fixture');
    let settle!: (value: CommandResult<ActionDetailView>) => void;
    const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
    class ActionRace extends DemoVerticalSliceService {
      staleRefreshes = 0;
      override acceptAction() { return pending; }
      override async getActionDetail(caseId: string, actionId: string) {
        if (actionId === 'action-b') return { result: 'SUCCESS' as const, data: { ...initial.data, actionId, title: 'Action B 安全內容', expectedVersion: 'b1' } };
        const result = await super.getActionDetail(caseId, actionId);
        if (actionId === 'demo-action-1' && result.result === 'SUCCESS' && result.data.lifecycleState !== 'ASSIGNED') this.staleRefreshes++;
        return result;
      }
    }
    function Harness({ service }: Readonly<{ service: ActionRace }>) {
      const navigate = useNavigate();
      return <><button type="button" onClick={() => navigate('/winwin/cases/demo-case-1/actions/action-b')}>前往 Action B</button><WinWinRoutes service={service} /></>;
    }
    const service = new ActionRace(); const user = userEvent.setup();
    render(<MemoryRouter initialEntries={[actionPath]}><Harness service={service} /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    await user.click(screen.getByRole('button', { name: '前往 Action B' }));
    expect(await screen.findByRole('heading', { name: 'Action B 安全內容' })).toBeInTheDocument();
    settle({ result: 'SUCCESS', data: initial.data });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Action B 安全內容' })).toBeInTheDocument());
    expect(service.staleRefreshes).toBe(0);
  });
});

describe('CP-F6 Start accepted responsibility', () => {
  const actionPath = '/winwin/cases/demo-case-1/actions/demo-action-1';

  async function acceptedService() {
    const service = new DemoVerticalSliceService();
    const result = await service.acceptAction(
      { actionId: 'demo-action-1', expectedVersion: '1' },
      'accept-fixture'
    );
    if (result.result !== 'SUCCESS') throw new Error('Expected accepted fixture');
    return service;
  }

  it('shows projected Start only after ACCEPTED and requires explicit activation', async () => {
    class Probe extends DemoVerticalSliceService {
      starts = 0;
      override startAction(input: ActionMutationInput, key: OperationKey) { this.starts++; return super.startAction(input, key); }
    }
    const service = new Probe();
    await service.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-fixture');
    renderWinWin(service, actionPath);
    const start = await screen.findByRole('button', { name: '開始處理' });
    expect(start).toBeEnabled();
    expect(screen.getByText(/不代表已完成或問題已解決/)).toBeInTheDocument();
    expect(service.starts).toBe(0);
  });

  it('does not infer Start from ACCEPTED state or the displayed holder', async () => {
    const service = await acceptedService();
    class ViewerOnly extends DemoVerticalSliceService {
      override async getActionDetail() {
        const result = await service.getActionDetail('demo-case-1', 'demo-action-1');
        if (result.result !== 'SUCCESS') return result;
        return { result: 'SUCCESS' as const, data: {
          ...result.data,
          allowedOperations: { ...result.data.allowedOperations, START_ACTION: false }
        } };
      }
    }
    renderWinWin(new ViewerOnly(), actionPath);
    expect(await screen.findByText('王先生')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '開始處理' })).not.toBeInTheDocument();
  });

  it.each(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const)(
    'does not expose Start for %s even if a bad projection marks it available', async (lifecycleState) => {
      class InvalidProjection extends DemoVerticalSliceService {
        override async getActionDetail(caseId: string, actionId: string) {
          const result = await super.getActionDetail(caseId, actionId);
          if (result.result !== 'SUCCESS') return result;
          return { result: 'SUCCESS' as const, data: {
            ...result.data,
            lifecycleState,
            stateDisplay: lifecycleState,
            allowedOperations: { ...result.data.allowedOperations, START_ACTION: true }
          } };
        }
      }
      renderWinWin(new InvalidProjection(), actionPath);
      await screen.findByRole('heading', { name: '確認明早照顧安排' });
      expect(screen.queryByRole('button', { name: '開始處理' })).not.toBeInTheDocument();
    }
  );

  it('gives Start synchronous ownership before key generation and deduplicates immediate activation', async () => {
    let settle!: (value: CommandResult<ActionDetailView>) => void;
    const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
    class PendingStart extends DemoVerticalSliceService {
      keys: OperationKey[] = [];
      override startAction(_input: ActionMutationInput, key: OperationKey) { this.keys.push(key); return pending; }
    }
    const service = new PendingStart();
    await service.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-fixture');
    renderWinWin(service, actionPath);
    const start = await screen.findByRole('button', { name: '開始處理' });
    start.click(); start.click();
    expect(service.keys).toHaveLength(1);
    expect(service.keys[0]).toMatch(/^start-action:/);
    expect(await screen.findByRole('button', { name: '正在開始…' })).toBeDisabled();
    settle({ result: 'TEMPORARY_FAILURE', outcomeUncertain: true });
    expect(await screen.findByText(/開始處理狀態/)).toBeInTheDocument();
  });

  it('keeps UNKNOWN lookup same-key, deduplicated, and without mutation replay', async () => {
    let settle!: (value: OperationStatusView) => void;
    const pending = new Promise<OperationStatusView>((resolve) => { settle = resolve; });
    class UnknownStart extends DemoVerticalSliceService {
      starts: OperationKey[] = []; lookups: OperationKey[] = [];
      override async startAction(_input: ActionMutationInput, key: OperationKey) { this.starts.push(key); return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
      override lookupOperationStatus(key: OperationKey) { this.lookups.push(key); return pending; }
    }
    const service = new UnknownStart();
    await service.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-fixture');
    const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '開始處理' }));
    const lookup = await screen.findByRole('button', { name: '查詢更新狀態' });
    lookup.click(); lookup.click();
    expect(service.lookups).toEqual(service.starts);
    settle({ operationKey: service.starts[0], outcome: 'UNKNOWN' });
    await waitFor(() => expect(screen.getByRole('button', { name: '查詢更新狀態' })).toBeEnabled());
    expect(service.starts).toHaveLength(1);
  });

  it.each(['COMMITTED', 'DEFINITELY_NOT_COMMITTED', 'UNKNOWN', 'IDEMPOTENCY_CONFLICT'] as const)(
    'makes mismatched Start %s lookup inert', async (outcome) => {
      class Mismatch extends DemoVerticalSliceService {
        starts = 0; reads = 0;
        override async startAction() { this.starts++; return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
        override async lookupOperationStatus() { return { operationKey: 'wrong-start-key', outcome }; }
        override getActionDetail(caseId: string, actionId: string) { this.reads++; return super.getActionDetail(caseId, actionId); }
      }
      const service = new Mismatch();
      await service.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-fixture');
      const user = userEvent.setup(); renderWinWin(service, actionPath);
      await user.click(await screen.findByRole('button', { name: '開始處理' }));
      await user.click(await screen.findByRole('button', { name: '查詢更新狀態' }));
      await waitFor(() => expect(screen.getByRole('button', { name: '查詢更新狀態' })).toBeEnabled());
      expect(service.starts).toBe(1); expect(service.reads).toBe(1);
    }
  );

  it('revalidates DNC and retries Start explicitly with the same key', async () => {
    class RetryStart extends DemoVerticalSliceService {
      keys: OperationKey[] = [];
      override startAction(input: ActionMutationInput, key: OperationKey) {
        this.keys.push(key);
        return this.keys.length === 1
          ? Promise.resolve({ result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: false })
          : super.startAction(input, key);
      }
      override async lookupOperationStatus(key: OperationKey) { return { operationKey: key, outcome: 'DEFINITELY_NOT_COMMITTED' as const }; }
    }
    const service = new RetryStart();
    await service.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-fixture');
    const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '開始處理' }));
    await user.click(await screen.findByRole('button', { name: '確認目前狀態並重試' }));
    expect(await screen.findByText('處理中')).toBeInTheDocument();
    expect(service.keys).toHaveLength(2); expect(new Set(service.keys).size).toBe(1);
  });

  it.each([
    ['lifecycle', { lifecycleState: 'IN_PROGRESS' as const }],
    ['responsibility version', { expectedVersion: 'superseded' }],
    ['operation availability', { allowedOperations: { START_ACTION: false } }]
  ])('blocks DNC retry when current %s changed', async (_label, change) => {
    class StaleStart extends DemoVerticalSliceService {
      starts = 0; reads = 0;
      override async startAction() { this.starts++; return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: false }; }
      override async lookupOperationStatus(key: OperationKey) { return { operationKey: key, outcome: 'DEFINITELY_NOT_COMMITTED' as const }; }
      override async getActionDetail(caseId: string, actionId: string) {
        const result = await super.getActionDetail(caseId, actionId); this.reads++;
        if (this.reads < 2 || result.result !== 'SUCCESS') return result;
        return { result: 'SUCCESS' as const, data: {
          ...result.data,
          ...change,
          allowedOperations: change.allowedOperations
            ? { ...result.data.allowedOperations, ...change.allowedOperations }
            : result.data.allowedOperations
        } };
      }
    }
    const service = new StaleStart();
    await service.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-fixture');
    const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '開始處理' }));
    await user.click(await screen.findByRole('button', { name: '確認目前狀態並重試' }));
    await waitFor(() => expect(service.reads).toBe(2));
    expect(service.starts).toBe(1);
  });

  it('keeps Start conflict distinct with no replacement key or fabricated progress', async () => {
    class ConflictStart extends DemoVerticalSliceService {
      keys: OperationKey[] = [];
      override async startAction(_input: ActionMutationInput, key: OperationKey) { this.keys.push(key); return { result: 'IDEMPOTENCY_CONFLICT' as const }; }
    }
    const service = new ConflictStart();
    await service.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-fixture');
    const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '開始處理' }));
    expect(await screen.findByText(/更新發生衝突/)).toBeInTheDocument();
    expect(service.keys).toHaveLength(1);
    expect(screen.queryByText('處理中')).not.toBeInTheDocument();
  });

  it('uses an authoritative read after COMMITTED and preserves holder and history', async () => {
    class ReadProbe extends DemoVerticalSliceService {
      starts = 0; reads = 0;
      override startAction(input: ActionMutationInput, key: OperationKey) { this.starts++; return super.startAction(input, key); }
      override getActionDetail(caseId: string, actionId: string) { this.reads++; return super.getActionDetail(caseId, actionId); }
    }
    const service = new ReadProbe();
    await service.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-fixture');
    const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '開始處理' }));
    expect(await screen.findByText('處理中')).toBeInTheDocument();
    expect(screen.getByText('王先生')).toBeInTheDocument();
    expect(screen.getByText('已確認接手', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('開始處理', { selector: 'strong' })).toBeInTheDocument();
    expect(service.starts).toBe(1); expect(service.reads).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: '標示處理完成' })).toBeEnabled();
  });

  it('keeps known-COMMITTED Start owned through failed refresh and retries only the read', async () => {
    class RefreshRecovery extends DemoVerticalSliceService {
      starts = 0; reads = 0;
      override startAction(input: ActionMutationInput, key: OperationKey) { this.starts++; return super.startAction(input, key); }
      override async getActionDetail(caseId: string, actionId: string) {
        this.reads++;
        if (this.reads === 2) return { result: 'TEMPORARY_FAILURE' as const, error: { code: 'OFFLINE' as const, message: 'hidden' } };
        return super.getActionDetail(caseId, actionId);
      }
    }
    const service = new RefreshRecovery();
    await service.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-fixture');
    const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '開始處理' }));
    expect(await screen.findByText(/系統不會再次送出開始處理/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開始處理' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '重新載入最新狀態' }));
    expect(await screen.findByText('處理中')).toBeInTheDocument();
    expect(service.starts).toBe(1); expect(service.reads).toBe(3);
  });

  it('invalidates current Start no-access and makes a completion after unmount inert', async () => {
    class Denied extends DemoVerticalSliceService { override async startAction() { return { result: 'NOT_FOUND_OR_NOT_VISIBLE' as const }; } }
    const denied = new Denied();
    await denied.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-fixture');
    const user = userEvent.setup(); renderWinWin(denied, actionPath);
    await user.click(await screen.findByRole('button', { name: '開始處理' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');

    cleanup();
    let settle!: (value: CommandResult<ActionDetailView>) => void;
    const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
    class Pending extends DemoVerticalSliceService { override startAction() { return pending; } }
    const service = new Pending();
    await service.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-fixture');
    const view = renderWinWin(service, actionPath);
    await user.click(await screen.findByRole('button', { name: '開始處理' }));
    view.unmount(); settle({ result: 'NOT_FOUND_OR_NOT_VISIBLE' }); await Promise.resolve();
  });
});

describe('CP-F6B Complete in-progress responsibility', () => {
  const actionPath = '/winwin/cases/demo-case-1/actions/demo-action-1';

  async function inProgressService<T extends DemoVerticalSliceService>(service: T = new DemoVerticalSliceService() as T) {
    await service.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-fixture');
    await service.startAction({ actionId: 'demo-action-1', expectedVersion: '2' }, 'start-fixture');
    return service;
  }

  async function submitSummary(user: ReturnType<typeof userEvent.setup>, value = '已確認明早協助安排並完成交接。') {
    await user.type(await screen.findByLabelText('處理摘要 *'), value);
    await user.click(screen.getByRole('button', { name: '標示處理完成' }));
  }

  it('shows Complete only for IN_PROGRESS with its projected operation and never completes automatically', async () => {
    class Probe extends DemoVerticalSliceService {
      completes = 0;
      override completeAction(input: CompleteActionInput, key: OperationKey) { this.completes++; return super.completeAction(input, key); }
    }
    const service = await inProgressService(new Probe());
    renderWinWin(service, actionPath);
    expect(await screen.findByRole('button', { name: '標示處理完成' })).toBeEnabled();
    expect(screen.getByText(/不代表整體照顧問題已解決/)).toBeInTheDocument();
    expect(service.completes).toBe(0);
  });

  it('does not infer Complete from IN_PROGRESS or displayed holder without projection', async () => {
    const source = await inProgressService();
    class ViewerOnly extends DemoVerticalSliceService {
      override async getActionDetail() {
        const result = await source.getActionDetail('demo-case-1', 'demo-action-1');
        if (result.result !== 'SUCCESS') return result;
        return { result: 'SUCCESS' as const, data: { ...result.data, allowedOperations: { ...result.data.allowedOperations, COMPLETE_ACTION: false } } };
      }
    }
    renderWinWin(new ViewerOnly(), actionPath);
    expect(await screen.findByText('王先生')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '標示處理完成' })).not.toBeInTheDocument();
  });

  it.each(['ASSIGNED', 'ACCEPTED', 'COMPLETED'] as const)(
    'fails closed for %s despite a permissive Complete projection', async (lifecycleState) => {
      class InvalidProjection extends DemoVerticalSliceService {
        override async getActionDetail(caseId: string, actionId: string) {
          const result = await super.getActionDetail(caseId, actionId);
          if (result.result !== 'SUCCESS') return result;
          return { result: 'SUCCESS' as const, data: { ...result.data, lifecycleState, stateDisplay: lifecycleState, allowedOperations: { ...result.data.allowedOperations, COMPLETE_ACTION: true } } };
        }
      }
      renderWinWin(new InvalidProjection(), actionPath);
      await screen.findByRole('heading', { name: '確認明早照顧安排' });
      expect(screen.queryByRole('button', { name: '標示處理完成' })).not.toBeInTheDocument();
    }
  );

  it('fails closed for a no-holder gap even when Complete is projected', async () => {
    const service = new DemoVerticalSliceService();
    await service.declineAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'decline-fixture');
    class GapProjection extends DemoVerticalSliceService {
      override async getActionDetail() {
        const result = await service.getActionDetail('demo-case-1', 'demo-action-1');
        if (result.result !== 'SUCCESS') return result;
        return { result: 'SUCCESS' as const, data: { ...result.data, allowedOperations: { ...result.data.allowedOperations, COMPLETE_ACTION: true } } };
      }
    }
    renderWinWin(new GapProjection(), actionPath);
    expect((await screen.findAllByText('目前沒有人確定接手')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '標示處理完成' })).not.toBeInTheDocument();
  });

  it('enforces the exact required 1–300 character prototype boundary accessibly', async () => {
    const user = userEvent.setup(); renderWinWin(await inProgressService(), actionPath);
    const field = await screen.findByLabelText('處理摘要 *');
    expect(field).toHaveAttribute('maxlength', '300');
    await user.click(screen.getByRole('button', { name: '標示處理完成' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('請填寫處理摘要');
    await user.type(field, '一');
    expect(field).toHaveValue('一');
  });

  it('accepts exactly 300 characters and rejects a programmatic 301-character draft', async () => {
    class BoundaryProbe extends DemoVerticalSliceService {
      inputs: CompleteActionInput[] = [];
      override async completeAction(input: CompleteActionInput) { this.inputs.push(input); return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
    }
    const accepted = await inProgressService(new BoundaryProbe());
    const user = userEvent.setup(); renderWinWin(accepted, actionPath);
    await user.type(await screen.findByLabelText('處理摘要 *'), '字'.repeat(300));
    await user.click(screen.getByRole('button', { name: '標示處理完成' }));
    expect(accepted.inputs[0].result).toHaveLength(300);

    cleanup();
    const rejected = await inProgressService(new BoundaryProbe()); renderWinWin(rejected, actionPath);
    const field = await screen.findByLabelText('處理摘要 *');
    fireEvent.change(field, { target: { value: '字'.repeat(301) } });
    fireEvent.submit(screen.getByRole('button', { name: '標示處理完成' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('最多 300 個字');
    expect(rejected.inputs).toHaveLength(0);
  });

  it('clears the screen-local Complete draft when navigating from Action A to Action B', async () => {
    const source = await inProgressService();
    const projected = await source.getActionDetail('demo-case-1', 'demo-action-1');
    if (projected.result !== 'SUCCESS') throw new Error('Expected in-progress fixture');
    class TwoActions extends DemoVerticalSliceService {
      override async getActionDetail(_caseId: string, requestedActionId: string) {
        return { result: 'SUCCESS' as const, data: { ...projected.data, actionId: requestedActionId, title: requestedActionId === 'action-b' ? 'Action B' : 'Action A' } };
      }
    }
    function Harness({ service }: Readonly<{ service: TwoActions }>) {
      const navigate = useNavigate();
      return <><button type="button" onClick={() => navigate('/winwin/cases/demo-case-1/actions/action-b')}>前往 Action B</button><WinWinRoutes service={service} /></>;
    }
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={[actionPath]}><Harness service={new TwoActions()} /></MemoryRouter>);
    await user.type(await screen.findByLabelText('處理摘要 *'), '只屬於 Action A');
    await user.click(screen.getByRole('button', { name: '前往 Action B' }));
    expect(await screen.findByRole('heading', { name: 'Action B' })).toBeInTheDocument();
    expect(screen.getByLabelText('處理摘要 *')).toHaveValue('');
  });

  it('acquires synchronous ownership before key creation and submits exactly once', async () => {
    let settle!: (value: CommandResult<ActionDetailView>) => void;
    const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
    class PendingComplete extends DemoVerticalSliceService {
      calls: Array<{ input: CompleteActionInput; key: OperationKey }> = [];
      override completeAction(input: CompleteActionInput, key: OperationKey) { this.calls.push({ input, key }); return pending; }
    }
    const service = await inProgressService(new PendingComplete());
    const user = userEvent.setup(); renderWinWin(service, actionPath);
    await user.type(await screen.findByLabelText('處理摘要 *'), '原始處理摘要');
    const form = screen.getByRole('button', { name: '標示處理完成' }).closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(service.calls).toHaveLength(1);
    expect(service.calls[0].key).toMatch(/^complete-action:/);
    expect(service.calls[0].input.result).toBe('原始處理摘要');
    expect(screen.getByRole('button', { name: '正在完成…' })).toBeDisabled();
    settle({ result: 'TEMPORARY_FAILURE', outcomeUncertain: true });
    expect(await screen.findByText(/完成處理狀態/)).toBeInTheDocument();
  });

  it('keeps UNKNOWN same-key and deduplicated without replay', async () => {
    let settleLookup!: (value: OperationStatusView) => void;
    const pendingLookup = new Promise<OperationStatusView>((resolve) => { settleLookup = resolve; });
    class UnknownComplete extends DemoVerticalSliceService {
      completes: OperationKey[] = []; lookups: OperationKey[] = [];
      override async completeAction(_input: CompleteActionInput, key: OperationKey) { this.completes.push(key); return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
      override lookupOperationStatus(key: OperationKey) { this.lookups.push(key); return pendingLookup; }
    }
    const service = await inProgressService(new UnknownComplete());
    const user = userEvent.setup(); renderWinWin(service, actionPath); await submitSummary(user);
    const lookup = await screen.findByRole('button', { name: '查詢更新狀態' });
    lookup.click(); lookup.click();
    expect(service.lookups).toEqual(service.completes);
    settleLookup({ operationKey: service.completes[0], outcome: 'UNKNOWN' });
    await waitFor(() => expect(screen.getByRole('button', { name: '查詢更新狀態' })).toBeEnabled());
    expect(service.completes).toHaveLength(1);
  });

  it('synchronizes lookup-COMMITTED through an authoritative Action Detail read', async () => {
    class LookupCommitted extends DemoVerticalSliceService {
      input?: CompleteActionInput; key?: OperationKey; completes = 0; reads = 0;
      override async completeAction(input: CompleteActionInput, key: OperationKey) {
        this.input = input; this.key = key; this.completes++;
        return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true };
      }
      override async lookupOperationStatus(key: OperationKey) {
        await super.completeAction(this.input!, key);
        return { operationKey: key, outcome: 'COMMITTED' as const };
      }
      override getActionDetail(caseId: string, actionId: string) { this.reads++; return super.getActionDetail(caseId, actionId); }
    }
    const service = await inProgressService(new LookupCommitted());
    const user = userEvent.setup(); renderWinWin(service, actionPath); await submitSummary(user, '查詢後的權威摘要');
    await user.click(await screen.findByRole('button', { name: '查詢更新狀態' }));
    expect(await screen.findByText('查詢後的權威摘要')).toBeInTheDocument();
    expect(service.completes).toBe(1); expect(service.reads).toBe(2);
  });

  it.each(['COMMITTED', 'DEFINITELY_NOT_COMMITTED', 'UNKNOWN', 'IDEMPOTENCY_CONFLICT'] as const)(
    'makes mismatched Complete %s lookup inert', async (outcome) => {
      class Mismatch extends DemoVerticalSliceService {
        completes = 0; reads = 0;
        override async completeAction() { this.completes++; return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
        override async lookupOperationStatus() { return { operationKey: 'wrong-complete-key', outcome }; }
        override getActionDetail(caseId: string, actionId: string) { this.reads++; return super.getActionDetail(caseId, actionId); }
      }
      const service = await inProgressService(new Mismatch());
      const user = userEvent.setup(); renderWinWin(service, actionPath); await submitSummary(user);
      await user.click(await screen.findByRole('button', { name: '查詢更新狀態' }));
      await waitFor(() => expect(screen.getByRole('button', { name: '查詢更新狀態' })).toBeEnabled());
      expect(service.completes).toBe(1); expect(service.reads).toBe(1);
    }
  );

  it('revalidates DNC and retries with the same key and original immutable result', async () => {
    class RetryComplete extends DemoVerticalSliceService {
      calls: Array<{ input: CompleteActionInput; key: OperationKey }> = [];
      override completeAction(input: CompleteActionInput, key: OperationKey) {
        this.calls.push({ input, key });
        return this.calls.length === 1 ? Promise.resolve({ result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: false }) : super.completeAction(input, key);
      }
      override async lookupOperationStatus(key: OperationKey) { return { operationKey: key, outcome: 'DEFINITELY_NOT_COMMITTED' as const }; }
    }
    const service = await inProgressService(new RetryComplete());
    const user = userEvent.setup(); renderWinWin(service, actionPath); await submitSummary(user, '原始且不可替換的摘要');
    await user.click(await screen.findByRole('button', { name: '確認目前狀態並重試' }));
    expect(await screen.findByText('已完成', { selector: 'header strong' })).toBeInTheDocument();
    expect(service.calls).toHaveLength(2);
    expect(new Set(service.calls.map(({ key }) => key))).toHaveLength(1);
    expect(service.calls.map(({ input }) => input.result)).toEqual(['原始且不可替換的摘要', '原始且不可替換的摘要']);
  });

  it.each([
    ['lifecycle', { lifecycleState: 'COMPLETED' as const }],
    ['version', { expectedVersion: 'superseded' }],
    ['operation', { allowedOperations: { COMPLETE_ACTION: false } }]
  ])('blocks Complete DNC retry when current %s changed', async (_label, change) => {
    class StaleComplete extends DemoVerticalSliceService {
      completes = 0; reads = 0;
      override async completeAction() { this.completes++; return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: false }; }
      override async lookupOperationStatus(key: OperationKey) { return { operationKey: key, outcome: 'DEFINITELY_NOT_COMMITTED' as const }; }
      override async getActionDetail(caseId: string, actionId: string) {
        const result = await super.getActionDetail(caseId, actionId); this.reads++;
        if (this.reads < 2 || result.result !== 'SUCCESS') return result;
        return { result: 'SUCCESS' as const, data: { ...result.data, ...change, allowedOperations: change.allowedOperations ? { ...result.data.allowedOperations, ...change.allowedOperations } : result.data.allowedOperations } };
      }
    }
    const service = await inProgressService(new StaleComplete());
    const user = userEvent.setup(); renderWinWin(service, actionPath); await submitSummary(user);
    await user.click(await screen.findByRole('button', { name: '確認目前狀態並重試' }));
    await waitFor(() => expect(service.reads).toBe(2));
    expect(service.completes).toBe(1);
  });

  it('keeps conflict distinct and demo idempotency rejects changed payload under one key', async () => {
    const service = await inProgressService();
    const input = { actionId: 'demo-action-1', expectedVersion: '3', result: '第一份摘要' };
    expect((await service.completeAction(input, 'complete-fixed')).result).toBe('SUCCESS');
    expect((await service.completeAction({ ...input, result: '被替換的摘要' }, 'complete-fixed')).result).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('refreshes authoritative COMPLETED summary and preserved history after commit', async () => {
    class AuthoritativeComplete extends DemoVerticalSliceService {
      completes = 0; reads = 0;
      override completeAction(input: CompleteActionInput, key: OperationKey) { this.completes++; return super.completeAction(input, key); }
      override getActionDetail(caseId: string, actionId: string) { this.reads++; return super.getActionDetail(caseId, actionId); }
    }
    const service = await inProgressService(new AuthoritativeComplete());
    const user = userEvent.setup(); renderWinWin(service, actionPath); await submitSummary(user, '伺服器保存的處理摘要');
    expect(await screen.findByText('已完成', { selector: 'header strong' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '處理摘要' })).toBeInTheDocument();
    expect(screen.getByText('伺服器保存的處理摘要')).toBeInTheDocument();
    expect(screen.getByText('已指派', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('已確認接手', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('開始處理', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getAllByText('已完成', { selector: 'strong' })).toHaveLength(2);
    expect(service.completes).toBe(1); expect(service.reads).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('button', { name: '標示處理完成' })).not.toBeInTheDocument();
  });

  it('keeps known commit locked after refresh failure and recovers by read only', async () => {
    class RefreshRecovery extends DemoVerticalSliceService {
      completes = 0; reads = 0;
      override completeAction(input: CompleteActionInput, key: OperationKey) { this.completes++; return super.completeAction(input, key); }
      override async getActionDetail(caseId: string, actionId: string) {
        this.reads++;
        if (this.reads === 2) return { result: 'TEMPORARY_FAILURE' as const, error: { code: 'OFFLINE' as const, message: 'hidden' } };
        return super.getActionDetail(caseId, actionId);
      }
    }
    const service = await inProgressService(new RefreshRecovery());
    const user = userEvent.setup(); renderWinWin(service, actionPath); await submitSummary(user);
    expect(await screen.findByText(/系統不會再次送出完成處理/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '標示處理完成' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '重新載入最新狀態' }));
    expect(await screen.findByText('已完成', { selector: 'header strong' })).toBeInTheDocument();
    expect(service.completes).toBe(1); expect(service.reads).toBe(3);
  });

  it('invalidates current Complete no-access and makes post-unmount settlement inert', async () => {
    class Denied extends DemoVerticalSliceService { override async completeAction() { return { result: 'NOT_FOUND_OR_NOT_VISIBLE' as const }; } }
    const denied = await inProgressService(new Denied());
    const user = userEvent.setup(); renderWinWin(denied, actionPath); await submitSummary(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');

    cleanup();
    let settle!: (value: CommandResult<ActionDetailView>) => void;
    const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
    class Pending extends DemoVerticalSliceService { override completeAction() { return pending; } }
    const service = await inProgressService(new Pending());
    const view = renderWinWin(service, actionPath); await submitSummary(user);
    view.unmount(); settle({ result: 'NOT_FOUND_OR_NOT_VISIBLE' }); await Promise.resolve();
  });

  it('makes stale Complete no-access inert after navigating to a newer Case and Action', async () => {
    const source = await inProgressService();
    const projected = await source.getActionDetail('demo-case-1', 'demo-action-1');
    if (projected.result !== 'SUCCESS') throw new Error('Expected in-progress fixture');
    let settle!: (value: CommandResult<ActionDetailView>) => void;
    const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
    class CompleteRace extends DemoVerticalSliceService {
      override completeAction() { return pending; }
      override async getActionDetail(caseId: string, requestedActionId: string) {
        if (caseId === 'case-b' && requestedActionId === 'action-b') return { result: 'SUCCESS' as const, data: { ...projected.data, caseId, actionId: requestedActionId, title: 'Case B Action B', expectedVersion: 'b1' } };
        return super.getActionDetail(caseId, requestedActionId);
      }
    }
    function Harness({ service }: Readonly<{ service: CompleteRace }>) {
      const navigate = useNavigate();
      return <><button type="button" onClick={() => navigate('/winwin/cases/case-b/actions/action-b')}>切換個案與事項</button><WinWinRoutes service={service} /></>;
    }
    const service = new CompleteRace(); await inProgressService(service);
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={[actionPath]}><Harness service={service} /></MemoryRouter>);
    await submitSummary(user);
    await user.click(screen.getByRole('button', { name: '切換個案與事項' }));
    expect(await screen.findByRole('heading', { name: 'Case B Action B' })).toBeInTheDocument();
    settle({ result: 'NOT_FOUND_OR_NOT_VISIBLE' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Case B Action B' })).toBeInTheDocument());
    expect(screen.queryByText('目前無法使用此內容')).not.toBeInTheDocument();
    expect(screen.getByLabelText('處理摘要 *')).toHaveValue('');
  });
});

describe('CP-F4 Create Action and exact-person assignment', () => {
  it('synchronously owns one initial submit before React can disable the form', async () => {
    let settle!: (value: CommandResult<ActionDetailView>) => void;
    const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
    class PendingAction extends DemoVerticalSliceService {
      keys: OperationKey[] = [];
      override createAction(_input: CreateActionInput, key: OperationKey) { this.keys.push(key); return pending; }
    }
    const service = new PendingAction(); const user = userEvent.setup();
    renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    await openAndFillCreateAction(user);
    const button = screen.getByRole('button', { name: '建立並指派' });
    const form = button.closest('form');
    if (!form) throw new Error('Expected Create Action form');
    fireEvent.submit(form);
    fireEvent.submit(form);
    button.click();
    expect(service.keys).toHaveLength(1);
    expect(new Set(service.keys)).toHaveLength(1);
    expect(screen.getByRole('button', { name: '建立並指派中…' })).toBeDisabled();
    settle({ result: 'TEMPORARY_FAILURE', outcomeUncertain: true });
    expect(await screen.findByText(/尚未確認是否已建立並指派/)).toBeInTheDocument();
  });

  it('opens only from projected source capability and requires an explicit exact person', async () => {
    const user = userEvent.setup();
    renderWinWin(new DemoVerticalSliceService(), '/winwin/cases/demo-case-1/timeline');
    await user.click(await screen.findByRole('button', { name: '建立處理事項' }));
    const assignee = await screen.findByLabelText('指派給 *');
    expect(assignee).toHaveValue('');
    expect(screen.getByRole('option', { name: /王先生・照顧協作者・目前可指派/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /family|professional|角色/i })).not.toBeInTheDocument();
    expect(screen.getAllByText('早上的照顧安排需要確認。')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '建立並指派' }));
    expect((await screen.findAllByRole('alert')).some((alert) => alert.textContent === '請明確選擇一位協作者')).toBe(true);
  });

  it('fails closed when eligible source/candidate access is unavailable', async () => {
    class DeniedCandidates extends DemoVerticalSliceService {
      override async getEligibleActionAssignees() { return { result: 'NOT_FOUND_OR_NOT_VISIBLE' as const }; }
    }
    const user = userEvent.setup();
    renderWinWin(new DeniedCandidates(), '/winwin/cases/demo-case-1/timeline');
    await user.click(await screen.findByRole('button', { name: '建立處理事項' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');
    expect(screen.queryByRole('button', { name: '建立並指派' })).not.toBeInTheDocument();
  });

  it('creates and assigns atomically with one key, then reads authoritative ASSIGNED detail', async () => {
    class CommitProbe extends DemoVerticalSliceService {
      keys: OperationKey[] = [];
      detailReads = 0;
      override createAction(input: CreateActionInput, key: OperationKey) { this.keys.push(key); return super.createAction(input, key); }
      override getActionDetail(caseId: string, actionId: string) { this.detailReads++; return super.getActionDetail(caseId, actionId); }
    }
    const service = new CommitProbe(); const user = userEvent.setup();
    renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    await openAndFillCreateAction(user);
    await user.click(screen.getByRole('button', { name: '建立並指派' }));
    expect(await screen.findByRole('heading', { name: '確認明天早上移位協助人力' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/尚待接手・已指派給 王先生，等待接手確認/);
    expect(screen.queryByText('已接受')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /接受|無法接手|開始|完成/ })).not.toBeInTheDocument();
    expect(service.keys).toHaveLength(1);
    expect(service.detailReads).toBe(1);
  });

  it('keeps UNKNOWN distinct, uses the same lookup key, and never replays', async () => {
    let settle!: (value: OperationStatusView) => void;
    const pending = new Promise<OperationStatusView>((resolve) => { settle = resolve; });
    class UnknownAction extends DemoVerticalSliceService {
      createKeys: OperationKey[] = []; lookupKeys: OperationKey[] = [];
      override async createAction(_input: CreateActionInput, key: OperationKey) { this.createKeys.push(key); return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
      override lookupOperationStatus(key: OperationKey) { this.lookupKeys.push(key); return pending; }
    }
    const service = new UnknownAction(); const user = userEvent.setup();
    renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    await openAndFillCreateAction(user);
    await user.click(screen.getByRole('button', { name: '建立並指派' }));
    expect(await screen.findByText(/尚未確認是否已建立並指派/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查詢建立狀態' }));
    expect(screen.getByRole('button', { name: '正在查詢…' })).toBeDisabled();
    screen.getByRole('button', { name: '正在查詢…' }).click();
    expect(service.lookupKeys).toEqual(service.createKeys);
    expect(service.createKeys).toHaveLength(1);
    settle({ operationKey: service.createKeys[0], outcome: 'UNKNOWN' });
    expect(await screen.findByRole('button', { name: '查詢建立狀態' })).toBeEnabled();
  });

  it.each(['COMMITTED', 'DEFINITELY_NOT_COMMITTED', 'UNKNOWN', 'IDEMPOTENCY_CONFLICT'] as const)(
    'keeps mismatched-key %s inert without refresh, retry, or draft loss', async (outcome) => {
      class MismatchAction extends DemoVerticalSliceService {
        creates = 0; detailReads = 0;
        override async createAction() { this.creates++; return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
        override async lookupOperationStatus(): Promise<OperationStatusView> { return { operationKey: 'wrong-key', outcome }; }
        override getActionDetail(caseId: string, actionId: string) { this.detailReads++; return super.getActionDetail(caseId, actionId); }
      }
      const service = new MismatchAction(); const user = userEvent.setup();
      renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
      await openAndFillCreateAction(user);
      await user.click(screen.getByRole('button', { name: '建立並指派' }));
      await user.click(screen.getByRole('button', { name: '查詢建立狀態' }));
      await waitFor(() => expect(screen.getByRole('button', { name: '查詢建立狀態' })).toBeEnabled());
      expect(screen.getByDisplayValue('確認明天早上移位協助人力')).toBeInTheDocument();
      expect(screen.getByText(/尚未確認是否已建立並指派/)).toBeInTheDocument();
      expect(service.creates).toBe(1); expect(service.detailReads).toBe(0);
    });

  it('does not retain a disappeared assignee during explicit same-key retry', async () => {
    class StaleCandidate extends DemoVerticalSliceService {
      creates = 0; candidateReads = 0; key?: OperationKey;
      override getEligibleActionAssignees(caseId: string, versionId: string) {
        this.candidateReads++;
        return this.candidateReads === 1 ? super.getEligibleActionAssignees(caseId, versionId) : Promise.resolve({ result: 'EMPTY' as const });
      }
      override async createAction(_input: CreateActionInput, key: OperationKey) { this.creates++; this.key = key; return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: false }; }
      override async lookupOperationStatus(key: OperationKey) { return { operationKey: key, outcome: 'DEFINITELY_NOT_COMMITTED' as const }; }
    }
    const service = new StaleCandidate(); const user = userEvent.setup();
    renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    await openAndFillCreateAction(user);
    await user.click(screen.getByRole('button', { name: '建立並指派' }));
    await user.click(await screen.findByRole('button', { name: '確認狀態並重試' }));
    expect(await screen.findByText('目前沒有可指派的協作者')).toBeInTheDocument();
    expect(service.creates).toBe(1);
  });

  it.each(['SUCCESS', 'TEMPORARY_FAILURE', 'IDEMPOTENCY_CONFLICT', 'NOT_FOUND_OR_NOT_VISIBLE'] as const)(
    'makes stale initial %s completion inert after a Case change', async (outcome) => {
      let settle!: (value: CommandResult<ActionDetailView>) => void;
      const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
      const fixture = await new DemoVerticalSliceService().createAction({
        caseId: 'demo-case-1', sourceVersionId: 'demo-care-update-version-1', title: '舊處理事項',
        reason: '舊原因', assigneeCandidateRef: 'demo-candidate-b'
      }, 'fixture-action-key');
      if (fixture.result !== 'SUCCESS') throw new Error('Expected Action fixture');
      class StaleAction extends DemoVerticalSliceService {
        detailReads = 0;
        override createAction() { return pending; }
        override getActionDetail(caseId: string, actionId: string) { this.detailReads++; return super.getActionDetail(caseId, actionId); }
      }
      function Harness({ service }: Readonly<{ service: StaleAction }>) {
        const navigate = useNavigate();
        return <><button type="button" onClick={() => navigate('/winwin/cases/case-b/timeline')}>切換處理事項個案</button><WinWinRoutes service={service} /></>;
      }
      const service = new StaleAction(); const user = userEvent.setup();
      render(<MemoryRouter initialEntries={['/winwin/cases/demo-case-1/timeline']}><Harness service={service} /></MemoryRouter>);
      await openAndFillCreateAction(user);
      await user.click(screen.getByRole('button', { name: '建立並指派' }));
      await user.click(screen.getByRole('button', { name: '切換處理事項個案' }));
      await screen.findByRole('alert');
      settle(outcome === 'SUCCESS' ? fixture : outcome === 'TEMPORARY_FAILURE'
        ? { result: outcome, outcomeUncertain: true }
        : { result: outcome });
      await Promise.resolve();
      expect(service.detailReads).toBe(0);
      expect(screen.queryByText('舊處理事項')).not.toBeInTheDocument();
    }
  );

  it('keeps a completion after unmount inert', async () => {
    let settle!: (value: CommandResult<ActionDetailView>) => void;
    const pending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settle = resolve; });
    class PendingAction extends DemoVerticalSliceService { override createAction() { return pending; } }
    const service = new PendingAction(); const user = userEvent.setup();
    const view = renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    await openAndFillCreateAction(user);
    await user.click(screen.getByRole('button', { name: '建立並指派' }));
    view.unmount();
    settle({ result: 'NOT_FOUND_OR_NOT_VISIBLE' });
    await Promise.resolve();
  });

  it('does not apply an old assignee attempt to a newer exact-person intent', async () => {
    let settleOld!: (value: CommandResult<ActionDetailView>) => void;
    const oldPending = new Promise<CommandResult<ActionDetailView>>((resolve) => { settleOld = resolve; });
    const projectedCandidates: readonly EligibleAssigneeView[] = [
      { candidateRef: 'candidate-a', displayName: '陳先生' },
      { candidateRef: 'demo-candidate-b', displayName: '王先生' }
    ];
    class AssigneeIntentProbe extends DemoVerticalSliceService {
      calls: CreateActionInput[] = []; detailReads = 0;
      override async getEligibleActionAssignees() { return { result: 'SUCCESS' as const, data: projectedCandidates }; }
      override createAction(input: CreateActionInput, key: OperationKey) {
        this.calls.push(input);
        return input.assigneeCandidateRef === 'candidate-a' ? oldPending : super.createAction(input, key);
      }
      override getActionDetail(caseId: string, actionId: string) { this.detailReads++; return super.getActionDetail(caseId, actionId); }
    }
    function Harness({ service }: Readonly<{ service: AssigneeIntentProbe }>) {
      const navigate = useNavigate();
      return <><button type="button" onClick={() => navigate('/winwin/cases')}>離開舊指派</button><button type="button" onClick={() => navigate('/winwin/cases/demo-case-1/timeline')}>開始新指派</button><WinWinRoutes service={service} /></>;
    }
    const service = new AssigneeIntentProbe(); const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/winwin/cases/demo-case-1/timeline']}><Harness service={service} /></MemoryRouter>);
    await openAndFillCreateAction(user);
    await user.selectOptions(screen.getByLabelText('指派給 *'), 'candidate-a');
    await user.click(screen.getByRole('button', { name: '建立並指派' }));
    await user.click(screen.getByRole('button', { name: '離開舊指派' }));
    await user.click(screen.getByRole('button', { name: '開始新指派' }));
    await openAndFillCreateAction(user);
    await user.click(screen.getByRole('button', { name: '建立並指派' }));
    expect(await screen.findByRole('heading', { name: '確認明天早上移位協助人力' })).toBeInTheDocument();
    const oldFixture = await new DemoVerticalSliceService().createAction({
      caseId: 'demo-case-1', sourceVersionId: 'demo-care-update-version-1', title: '舊指派結果',
      reason: '舊原因', assigneeCandidateRef: 'demo-candidate-b'
    }, 'old-assignee-fixture');
    settleOld(oldFixture);
    await Promise.resolve();
    expect(screen.queryByText('舊指派結果')).not.toBeInTheDocument();
    expect(service.calls.map((input) => input.assigneeCandidateRef)).toEqual(['candidate-a', 'demo-candidate-b']);
    expect(service.detailReads).toBe(1);
  });

  it('invalidates protected context for current createAction access loss', async () => {
    class LostActionAccess extends DemoVerticalSliceService {
      override async createAction() { return { result: 'NOT_FOUND_OR_NOT_VISIBLE' as const }; }
    }
    const user = userEvent.setup();
    renderWinWin(new LostActionAccess(), '/winwin/cases/demo-case-1/timeline');
    await openAndFillCreateAction(user);
    await user.click(screen.getByRole('button', { name: '建立並指派' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');
    expect(screen.queryByDisplayValue('確認明天早上移位協助人力')).not.toBeInTheDocument();
  });

  it('deduplicates the full same-key lookup, revalidation, and retry sequence', async () => {
    let settleTimeline!: (value: ProjectionResult<TimelineView>) => void;
    const pendingTimeline = new Promise<ProjectionResult<TimelineView>>((resolve) => { settleTimeline = resolve; });
    class RetryProbe extends DemoVerticalSliceService {
      creates: OperationKey[] = []; lookups = 0; timelines = 0; candidates = 0;
      override async createAction(_input: CreateActionInput, key: OperationKey) {
        this.creates.push(key);
        return this.creates.length === 1
          ? { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: false }
          : super.createAction(_input, key);
      }
      override async lookupOperationStatus(key: OperationKey) { this.lookups++; return { operationKey: key, outcome: 'DEFINITELY_NOT_COMMITTED' as const }; }
      override getTimeline(caseId: string) {
        this.timelines++;
        return this.timelines === 1 ? super.getTimeline(caseId) : pendingTimeline;
      }
      override getEligibleActionAssignees(caseId: string, versionId: string) { this.candidates++; return super.getEligibleActionAssignees(caseId, versionId); }
    }
    const service = new RetryProbe(); const user = userEvent.setup();
    renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    await openAndFillCreateAction(user);
    await user.click(screen.getByRole('button', { name: '建立並指派' }));
    const retry = await screen.findByRole('button', { name: '確認狀態並重試' });
    retry.click(); retry.click();
    await waitFor(() => expect(service.timelines).toBe(2));
    expect(service.lookups).toBe(1);
    const timeline = await new DemoVerticalSliceService().getTimeline('demo-case-1');
    settleTimeline(timeline);
    expect(await screen.findByRole('heading', { name: '確認明天早上移位協助人力' })).toBeInTheDocument();
    expect(service.candidates).toBe(2);
    expect(service.creates).toHaveLength(2);
    expect(new Set(service.creates).size).toBe(1);
  });
});

async function fillCareUpdateForm(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText('類別 *'), 'CARE_ARRANGEMENT_CHANGE');
  await user.type(screen.getByLabelText('發生了什麼變化？ *'), '今天開始需要兩人協助移位');
  await user.type(screen.getByLabelText('資訊來源 *'), '本人直接觀察');
  await user.type(screen.getByLabelText('發生日期 *'), '2026-09-05');
  await user.click(screen.getByRole('radio', { name: '約略時間' }));
  await user.click(screen.getByRole('radio', { name: /只有我目前可查看/ }));
}

describe('CP-F3 Create Care Update', () => {
  it('renders only from an authorized Case capability with accessible, publication-only fields', async () => {
    renderWinWin(new DemoVerticalSliceService(), '/winwin/cases/demo-case-1/updates/new');
    expect(await screen.findByLabelText('發生了什麼變化？ *')).toHaveAttribute('maxlength', '1000');
    expect(screen.getByRole('heading', { level: 1, name: '新增照顧變化' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '發布照顧變化' })).toBeEnabled();
    expect(screen.getByText(/發布後不會直接覆寫/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/指派|負責人|完成狀態/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Action|診斷結果|風險分數/)).not.toBeInTheDocument();
  });

  it('fails closed when the projection does not allow creation', async () => {
    renderWinWin(new DemoVerticalSliceService({
      caseHomeResult: { result: 'SUCCESS', data: caseHomeProjection }
    }), '/winwin/cases/demo-case-1/updates/new');
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');
    expect(screen.queryByRole('button', { name: '發布照顧變化' })).not.toBeInTheDocument();
  });

  it('associates required validation messages and supports keyboard form submission', async () => {
    const user = userEvent.setup();
    renderWinWin(new DemoVerticalSliceService(), '/winwin/cases/demo-case-1/updates/new');
    const submit = await screen.findByRole('button', { name: '發布照顧變化' });
    submit.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText('請填寫照顧情況的變化')).toHaveAttribute('id', 'content-error');
    expect(screen.getByLabelText('發生了什麼變化？ *')).toHaveAttribute('aria-describedby', expect.stringContaining('content-error'));
    expect(screen.getByText('請明確選擇可見範圍')).toHaveAttribute('role', 'alert');
  });

  it('submits once, then refreshes authoritative Timeline before showing success', async () => {
    class CommitProbe extends DemoVerticalSliceService {
      createCalls: OperationKey[] = [];
      timelineCalls = 0;
      override createCareUpdate(input: CreateCareUpdateInput, key: OperationKey) {
        this.createCalls.push(key);
        return super.createCareUpdate(input, key);
      }
      override getTimeline(caseId: string) { this.timelineCalls++; return super.getTimeline(caseId); }
    }
    const service = new CommitProbe();
    const user = userEvent.setup();
    renderWinWin(service, '/winwin/cases/demo-case-1/updates/new');
    await screen.findByRole('heading', { name: '新增照顧變化' });
    await fillCareUpdateForm(user);
    await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
    expect(await screen.findByRole('heading', { name: '已儲存' })).toBeInTheDocument();
    expect(service.createCalls).toHaveLength(1);
    expect(service.timelineCalls).toBe(1);
    expect(screen.getByText('目前未建立處理事項。')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '查看照顧活動' }));
    expect(await screen.findByText('今天開始需要兩人協助移位')).toBeInTheDocument();
    expect(service.createCalls).toHaveLength(1);
  });

  it('keeps UNKNOWN distinct, checks status with the same key, and never replays the mutation', async () => {
    class UnknownProbe extends DemoVerticalSliceService {
      createKeys: OperationKey[] = [];
      lookupKeys: OperationKey[] = [];
      override async createCareUpdate(_input: CreateCareUpdateInput, key: OperationKey) {
        this.createKeys.push(key);
        return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true };
      }
      override async lookupOperationStatus(key: OperationKey): Promise<OperationStatusView> {
        this.lookupKeys.push(key);
        return { operationKey: key, outcome: 'UNKNOWN' };
      }
    }
    const service = new UnknownProbe();
    const user = userEvent.setup();
    renderWinWin(service, '/winwin/cases/demo-case-1/updates/new');
    await screen.findByRole('heading', { name: '新增照顧變化' });
    await fillCareUpdateForm(user);
    await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
    expect(await screen.findByRole('heading', { name: '尚未確認是否已儲存' })).toBeInTheDocument();
    expect(screen.queryByText(/一定失敗|直接再送一次/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查詢發布狀態' }));
    expect(service.createKeys).toHaveLength(1);
    expect(service.lookupKeys).toEqual(service.createKeys);
  });

  it('owns one pending UNKNOWN lookup and disables repeated activation', async () => {
    let settleLookup!: (value: OperationStatusView) => void;
    const pendingLookup = new Promise<OperationStatusView>((resolve) => { settleLookup = resolve; });
    class PendingLookupProbe extends DemoVerticalSliceService {
      operationKey?: OperationKey;
      lookupCalls = 0;
      override async createCareUpdate(_input: CreateCareUpdateInput, key: OperationKey) {
        this.operationKey = key;
        return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true };
      }
      override lookupOperationStatus() { this.lookupCalls++; return pendingLookup; }
    }
    const service = new PendingLookupProbe();
    const user = userEvent.setup();
    renderWinWin(service, '/winwin/cases/demo-case-1/updates/new');
    await fillCareUpdateForm(user);
    await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
    await user.click(await screen.findByRole('button', { name: '查詢發布狀態' }));
    const busy = screen.getByRole('button', { name: '正在查詢發布狀態…' });
    expect(busy).toBeDisabled();
    expect(busy.closest('[role="alert"]')).toHaveAttribute('aria-busy', 'true');
    busy.click();
    expect(service.lookupCalls).toBe(1);
    settleLookup({ operationKey: service.operationKey!, outcome: 'UNKNOWN' });
    expect(await screen.findByRole('button', { name: '查詢發布狀態' })).toBeEnabled();
    expect(service.lookupCalls).toBe(1);
  });

  it.each(['COMMITTED', 'DEFINITELY_NOT_COMMITTED', 'UNKNOWN', 'IDEMPOTENCY_CONFLICT'] as const)(
    'keeps a mismatched-key %s lookup response completely inert',
    async (outcome) => {
      class MismatchedLookupProbe extends DemoVerticalSliceService {
        timelineCalls = 0;
        createCalls = 0;
        override async createCareUpdate() {
          this.createCalls++;
          return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true };
        }
        override getTimeline(caseId: string) { this.timelineCalls++; return super.getTimeline(caseId); }
        override async lookupOperationStatus(): Promise<OperationStatusView> {
          const committed = await new DemoVerticalSliceService().createCareUpdate({
            caseId: 'demo-case-1', category: 'OBSERVATION', content: 'mismatched result', source: 'fixture',
            occurredDate: '2026-09-05', timePrecision: 'UNKNOWN', visibility: 'AUTHOR_ONLY'
          }, 'mismatched-fixture-key');
          return {
            operationKey: 'different-operation-key',
            outcome,
            authoritativeResult: outcome === 'COMMITTED' && committed.result === 'SUCCESS' ? committed.data : undefined
          };
        }
      }
      const service = new MismatchedLookupProbe();
      const user = userEvent.setup();
      renderWinWin(service, '/winwin/cases/demo-case-1/updates/new');
      await fillCareUpdateForm(user);
      await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
      await user.click(await screen.findByRole('button', { name: '查詢發布狀態' }));
      await waitFor(() => expect(screen.getByRole('button', { name: '查詢發布狀態' })).toBeEnabled());
      expect(screen.getByDisplayValue('今天開始需要兩人協助移位')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: '尚未確認是否已儲存' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: '已儲存' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: '未儲存' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: '這次發布無法安全完成' })).not.toBeInTheDocument();
      expect(service.timelineCalls).toBe(0);
      expect(service.createCalls).toBe(1);
    }
  );

  it.each(['COMMITTED', 'IDEMPOTENCY_CONFLICT'] as const)(
    'applies a correctly correlated %s lookup outcome',
    async (outcome) => {
      class CorrelatedLookupProbe extends DemoVerticalSliceService {
        operationKey?: OperationKey;
        timelineCalls = 0;
        override async createCareUpdate(_input: CreateCareUpdateInput, key: OperationKey) {
          this.operationKey = key;
          return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true };
        }
        override getTimeline(caseId: string) { this.timelineCalls++; return super.getTimeline(caseId); }
        override async lookupOperationStatus(key: OperationKey): Promise<OperationStatusView> {
          const committed = await new DemoVerticalSliceService().createCareUpdate({
            caseId: 'demo-case-1', category: 'OBSERVATION', content: 'correlated result', source: 'fixture',
            occurredDate: '2026-09-05', timePrecision: 'UNKNOWN', visibility: 'AUTHOR_ONLY'
          }, 'correlated-fixture-key');
          return {
            operationKey: key,
            outcome,
            authoritativeResult: outcome === 'COMMITTED' && committed.result === 'SUCCESS' ? committed.data : undefined
          };
        }
      }
      const service = new CorrelatedLookupProbe();
      const user = userEvent.setup();
      renderWinWin(service, '/winwin/cases/demo-case-1/updates/new');
      await fillCareUpdateForm(user);
      await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
      await user.click(await screen.findByRole('button', { name: '查詢發布狀態' }));
      expect(await screen.findByRole('heading', {
        name: outcome === 'COMMITTED' ? '已儲存' : '這次發布無法安全完成'
      })).toBeInTheDocument();
      expect(service.timelineCalls).toBe(outcome === 'COMMITTED' ? 1 : 0);
      expect(service.operationKey).toBeDefined();
    }
  );

  it('revalidates and retries a definitely-not-committed attempt with its original key', async () => {
    class RetryProbe extends DemoVerticalSliceService {
      createKeys: OperationKey[] = [];
      caseReads = 0;
      override getCaseHome(caseId: string) { this.caseReads++; return super.getCaseHome(caseId); }
      override createCareUpdate(input: CreateCareUpdateInput, key: OperationKey) {
        this.createKeys.push(key);
        return this.createKeys.length === 1
          ? Promise.resolve({ result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: false })
          : super.createCareUpdate(input, key);
      }
      override async lookupOperationStatus(key: OperationKey): Promise<OperationStatusView> {
        return { operationKey: key, outcome: 'DEFINITELY_NOT_COMMITTED' };
      }
    }
    const service = new RetryProbe();
    const user = userEvent.setup();
    renderWinWin(service, '/winwin/cases/demo-case-1/updates/new');
    await screen.findByRole('heading', { name: '新增照顧變化' });
    await fillCareUpdateForm(user);
    await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
    expect(await screen.findByRole('heading', { name: '未儲存' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '確認狀態並重試同一次發布' }));
    expect(await screen.findByRole('heading', { name: '已儲存' })).toBeInTheDocument();
    expect(service.createKeys).toHaveLength(2);
    expect(new Set(service.createKeys).size).toBe(1);
    expect(service.caseReads).toBeGreaterThanOrEqual(2);
  });

  it('owns the full definitely-not-committed revalidation and retry sequence', async () => {
    let settleRevalidation!: (value: ProjectionResult<CaseHomeView>) => void;
    const pendingRevalidation = new Promise<ProjectionResult<CaseHomeView>>((resolve) => { settleRevalidation = resolve; });
    class PendingRetryProbe extends DemoVerticalSliceService {
      createKeys: OperationKey[] = [];
      lookupCalls = 0;
      caseReads = 0;
      override getCaseHome(caseId: string) {
        this.caseReads++;
        return this.caseReads === 1 ? super.getCaseHome(caseId) : pendingRevalidation;
      }
      override createCareUpdate(input: CreateCareUpdateInput, key: OperationKey) {
        this.createKeys.push(key);
        return this.createKeys.length === 1
          ? Promise.resolve({ result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: false })
          : super.createCareUpdate(input, key);
      }
      override async lookupOperationStatus(key: OperationKey): Promise<OperationStatusView> {
        this.lookupCalls++;
        return { operationKey: key, outcome: 'DEFINITELY_NOT_COMMITTED' };
      }
    }
    const service = new PendingRetryProbe();
    const user = userEvent.setup();
    renderWinWin(service, '/winwin/cases/demo-case-1/updates/new');
    await fillCareUpdateForm(user);
    await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
    await user.click(await screen.findByRole('button', { name: '確認狀態並重試同一次發布' }));
    const busy = screen.getByRole('button', { name: '正在確認並重試…' });
    expect(busy).toBeDisabled();
    busy.click();
    expect(service.lookupCalls).toBe(1);
    expect(service.createKeys).toHaveLength(1);
    const revalidated = await new DemoVerticalSliceService().getCaseHome('demo-case-1');
    settleRevalidation(revalidated);
    expect(await screen.findByRole('heading', { name: '已儲存' })).toBeInTheDocument();
    expect(service.lookupCalls).toBe(1);
    expect(service.createKeys).toHaveLength(2);
    expect(new Set(service.createKeys).size).toBe(1);
  });

  it('shows idempotency conflict distinctly and does not create a replacement attempt', async () => {
    class ConflictProbe extends DemoVerticalSliceService {
      calls = 0;
      override async createCareUpdate(_input: CreateCareUpdateInput, _key: OperationKey) {
        this.calls++;
        return { result: 'IDEMPOTENCY_CONFLICT' as const };
      }
    }
    const service = new ConflictProbe();
    const user = userEvent.setup();
    renderWinWin(service, '/winwin/cases/demo-case-1/updates/new');
    await screen.findByRole('heading', { name: '新增照顧變化' });
    await fillCareUpdateForm(user);
    await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
    expect(await screen.findByRole('heading', { name: '這次發布無法安全完成' })).toBeInTheDocument();
    expect(service.calls).toBe(1);
  });

  it('clears protected draft and invalidates on current access loss', async () => {
    class LostAccessProbe extends DemoVerticalSliceService {
      override async createCareUpdate(_input: CreateCareUpdateInput, _key: OperationKey) {
        return { result: 'NOT_FOUND_OR_NOT_VISIBLE' as const };
      }
    }
    const user = userEvent.setup();
    renderWinWin(new LostAccessProbe(), '/winwin/cases/demo-case-1/updates/new');
    await screen.findByRole('heading', { name: '新增照顧變化' });
    await fillCareUpdateForm(user);
    await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');
    expect(screen.queryByDisplayValue('今天開始需要兩人協助移位')).not.toBeInTheDocument();
  });

  it('makes a mutation completion after unmount inert', async () => {
    let settle!: (value: CommandResult<CareUpdateDetailView>) => void;
    const pending = new Promise<CommandResult<CareUpdateDetailView>>((resolve) => { settle = resolve; });
    class PendingCreate extends DemoVerticalSliceService {
      override createCareUpdate() { return pending; }
    }
    const service = new PendingCreate();
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = renderWinWin(service, '/winwin/cases/demo-case-1/updates/new');
    await screen.findByRole('heading', { name: '新增照顧變化' });
    await fillCareUpdateForm(user);
    await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
    view.unmount();
    const projection = await new DemoVerticalSliceService().createCareUpdate({
      caseId: 'demo-case-1', category: 'OBSERVATION', content: 'fixture', source: 'fixture',
      occurredDate: '2026-09-05', timePrecision: 'UNKNOWN', visibility: 'AUTHOR_ONLY'
    }, 'fixture-key');
    if (projection.result !== 'SUCCESS') throw new Error('Expected fixture result');
    settle(projection);
    await Promise.resolve();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it.each([
    ['success', 'SUCCESS'],
    ['failure', 'TEMPORARY_FAILURE'],
    ['no access', 'NOT_FOUND_OR_NOT_VISIBLE']
  ] as const)('makes stale mutation %s after a Case change inert', async (_label, outcome) => {
    let settle!: (value: CommandResult<CareUpdateDetailView>) => void;
    const pending = new Promise<CommandResult<CareUpdateDetailView>>((resolve) => { settle = resolve; });
    const fixture = await new DemoVerticalSliceService().createCareUpdate({
      caseId: 'demo-case-1', category: 'OBSERVATION', content: 'old secret', source: 'fixture',
      occurredDate: '2026-09-05', timePrecision: 'UNKNOWN', visibility: 'AUTHOR_ONLY'
    }, 'fixture-stale-key');
    if (fixture.result !== 'SUCCESS') throw new Error('Expected fixture result');
    class CaseChangeMutationService extends DemoVerticalSliceService {
      override getCaseHome(caseId: string) {
        return super.getCaseHome('demo-case-1').then((result) => result.result === 'SUCCESS'
          ? { ...result, data: { ...result.data, caseId } }
          : result);
      }
      override createCareUpdate() { return pending; }
    }
    function CaseChangeHarness({ service }: Readonly<{ service: CaseChangeMutationService }>) {
      const navigate = useNavigate();
      return <><button type="button" onClick={() => navigate('/winwin/cases/case-b/updates/new')}>前往 Case B 表單</button><WinWinRoutes service={service} /></>;
    }
    const service = new CaseChangeMutationService();
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/winwin/cases/demo-case-1/updates/new']}><CaseChangeHarness service={service} /></MemoryRouter>);
    await fillCareUpdateForm(user);
    await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
    await user.click(screen.getByRole('button', { name: '前往 Case B 表單' }));
    expect(await screen.findByLabelText('發生了什麼變化？ *')).toHaveValue('');
    settle(outcome === 'SUCCESS' ? fixture : outcome === 'TEMPORARY_FAILURE'
      ? { result: 'TEMPORARY_FAILURE', outcomeUncertain: false }
      : { result: 'NOT_FOUND_OR_NOT_VISIBLE' });
    await waitFor(() => expect(screen.getByLabelText('發生了什麼變化？ *')).toHaveValue(''));
    expect(screen.queryByText('old secret')).not.toBeInTheDocument();
    expect(screen.queryByText('目前無法使用此內容')).not.toBeInTheDocument();
  });

  it('makes a stale status lookup after a Case change inert', async () => {
    let settleLookup!: (value: OperationStatusView) => void;
    const pendingLookup = new Promise<OperationStatusView>((resolve) => { settleLookup = resolve; });
    class StaleLookupService extends DemoVerticalSliceService {
      override getCaseHome(caseId: string) {
        return super.getCaseHome('demo-case-1').then((result) => result.result === 'SUCCESS'
          ? { ...result, data: { ...result.data, caseId } }
          : result);
      }
      override async createCareUpdate() { return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: true }; }
      override lookupOperationStatus() { return pendingLookup; }
    }
    function LookupHarness({ service }: Readonly<{ service: StaleLookupService }>) {
      const navigate = useNavigate();
      return <><button type="button" onClick={() => navigate('/winwin/cases/case-b/updates/new')}>切換查詢個案</button><WinWinRoutes service={service} /></>;
    }
    const service = new StaleLookupService();
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/winwin/cases/demo-case-1/updates/new']}><LookupHarness service={service} /></MemoryRouter>);
    await fillCareUpdateForm(user);
    await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
    await user.click(await screen.findByRole('button', { name: '查詢發布狀態' }));
    await user.click(screen.getByRole('button', { name: '切換查詢個案' }));
    expect(await screen.findByLabelText('發生了什麼變化？ *')).toHaveValue('');
    settleLookup({ operationKey: 'old-key', outcome: 'IDEMPOTENCY_CONFLICT' });
    await waitFor(() => expect(screen.queryByRole('heading', { name: '這次發布無法安全完成' })).not.toBeInTheDocument());
  });
});

afterEach(cleanup);

function renderWinWin(service = new DemoVerticalSliceService(), path = '/winwin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WinWinRoutes service={service} />
    </MemoryRouter>
  );
}

describe('CP-F1 route, shell, and session boundary', () => {
  it('mounts the authoritative First Slice shell at /winwin without changing root authority', async () => {
    expect(DEFAULT_PRODUCT_PATH).toBe('/v2/prototype');
    render(
      <MemoryRouter initialEntries={['/winwin']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText('陳女士的照顧個案')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '我的個案' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WinWin 首頁' })).toHaveAttribute('href', '/winwin');
    expect(screen.getByRole('link', { name: '跳至主要內容' })).toHaveAttribute('href', '#winwin-main');
    expect(screen.getByRole('navigation', { name: 'WinWin 主要導覽' })).toBeInTheDocument();
    expect(screen.getByText('虛構資料展示・非正式授權依據')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('keeps /v2/prototype available as reference behavior', async () => {
    render(
      <MemoryRouter initialEntries={['/v2/prototype']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByText('選擇你想體驗的流程')).toBeInTheDocument();
  });

  it('shows an accessible session checking state without protected content', () => {
    const pending = new Promise<never>(() => undefined);
    class PendingSessionService extends DemoVerticalSliceService {
      override resolveSession() { return pending; }
    }
    renderWinWin(new PendingSessionService());
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('heading', { level: 1, name: '正在確認登入狀態' })).toBeInTheDocument();
    expect(screen.queryByText('陳女士的照顧個案')).not.toBeInTheDocument();
  });

  it('offers an accessible retry after a temporary session failure', async () => {
    const user = userEvent.setup();
    renderWinWin(new DemoVerticalSliceService({
      sessionResult: {
        result: 'TEMPORARY_FAILURE',
        error: { code: 'TEMPORARY', message: 'internal detail is not rendered' }
      }
    }));
    const retry = await screen.findByRole('button', { name: '重新嘗試' });
    expect(screen.getByText('連線暫時不穩定，請稍後再試。')).toBeInTheDocument();
    expect(screen.queryByText('internal detail is not rendered')).not.toBeInTheDocument();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(retry).toHaveFocus();
  });

  it('shows a bounded session-entry action when the safe session is signed out', async () => {
    renderWinWin(new DemoVerticalSliceService({
      sessionResult: { result: 'SUCCESS', data: { disposition: 'SIGNED_OUT' } }
    }));
    expect(await screen.findByRole('heading', { level: 1, name: '進入 WinWin' })).toBeInTheDocument();
    expect(screen.getByText('登入狀態已失效，請重新登入。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新登入' })).toBeInTheDocument();
    expect(screen.queryByText('陳女士的照顧個案')).not.toBeInTheDocument();
  });
});

describe('CP-F1 Authorized Case List', () => {
  it('renders only trusted safe Case projections as semantic lists and accessible links', async () => {
    const user = userEvent.setup();
    renderWinWin();

    expect(await screen.findByText('陳女士的照顧個案')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '我的個案' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '指派給我' })).toBeInTheDocument();
    expect(screen.getByText('目前沒有指派給你的處理事項')).toBeInTheDocument();
    const caseList = screen.getByRole('list', { name: '可存取的個案' });
    expect(caseList).toHaveTextContent('陳女士的照顧個案');
    expect(caseList).toHaveTextContent('新變化 1');
    expect(caseList).toHaveTextContent('1 項尚待接手');
    const openCase = screen.getByRole('link', { name: '開啟個案' });
    expect(openCase).toHaveAttribute('href', '/winwin/cases/demo-case-1');
    await user.tab();
    await user.tab();
    await user.tab();
    expect(openCase).toHaveFocus();
    expect(screen.queryByText(/Grant|Membership|DemoRole|revoked/i)).not.toBeInTheDocument();
  });

  it('distinguishes an authorized empty response from unavailable', async () => {
    renderWinWin(new DemoVerticalSliceService({ authorizedCasesResult: { result: 'EMPTY' } }));
    expect(await screen.findByText('目前沒有可存取的個案')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '我的個案' })).toBeInTheDocument();
    expect(screen.queryByText('目前無法使用此內容')).not.toBeInTheDocument();
  });

  it('renders safely authorized partial data while suppressing incomplete totals', async () => {
    const partialCase: AuthorizedCaseSummary = {
      caseId: 'partial-case',
      caseDisplay: '可見的照顧個案',
      relationshipDisplay: '照顧協作者',
      newChangeCount: 99,
      responsibilitySummary: '不完整的統計',
      latestVisibleActivity: '一筆可見活動',
      assignedActions: []
    };
    renderWinWin(new DemoVerticalSliceService({
      authorizedCasesResult: { result: 'PARTIAL', data: [partialCase] }
    }));
    expect(await screen.findByText('部分資訊暫時無法載入')).toBeInTheDocument();
    expect(screen.getByText('可見的照顧個案')).toBeInTheDocument();
    expect(screen.queryByText('新變化 99')).not.toBeInTheDocument();
    expect(screen.queryByText('不完整的統計')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新載入' })).toBeInTheDocument();
  });

  it('provides recoverable Case-list retry without rendering internal error detail', async () => {
    renderWinWin(new DemoVerticalSliceService({
      authorizedCasesResult: {
        result: 'TEMPORARY_FAILURE',
        error: { code: 'OFFLINE', message: 'private transport detail' }
      }
    }));
    expect(await screen.findByRole('alert')).toHaveTextContent('部分資訊暫時無法載入');
    expect(screen.getByRole('button', { name: '重新載入' })).toBeInTheDocument();
    expect(screen.queryByText('private transport detail')).not.toBeInTheDocument();
  });

  it('uses one non-enumerating unavailable state and removes protected Case content', async () => {
    renderWinWin(new DemoVerticalSliceService({
      authorizedCasesResult: { result: 'NOT_FOUND_OR_NOT_VISIBLE' }
    }));
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');
    expect(screen.queryByText('陳女士的照顧個案')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/撤銷|Grant|Membership|個案存在/);
  });

  it('clears previously rendered protected content when the current context loses access', async () => {
    const view = renderWinWin();
    expect(await screen.findByText('陳女士的照顧個案')).toBeInTheDocument();

    view.rerender(
      <MemoryRouter initialEntries={['/winwin/cases']}>
        <WinWinRoutes service={new DemoVerticalSliceService({
          authorizedCasesResult: { result: 'NOT_FOUND_OR_NOT_VISIBLE' }
        })} />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');
    expect(screen.queryByText('陳女士的照顧個案')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '開啟個案' })).not.toBeInTheDocument();
  });

  it('ignores an older protected response after the service/session generation changes', async () => {
    let settleOlder!: (value: ProjectionResult<readonly AuthorizedCaseSummary[]>) => void;
    const olderResult = new Promise<ProjectionResult<readonly AuthorizedCaseSummary[]>>((resolve) => {
      settleOlder = resolve;
    });
    class OlderService extends DemoVerticalSliceService {
      override getAuthorizedCases() { return olderResult; }
    }
    const view = renderWinWin(new OlderService(), '/winwin/cases');
    await screen.findByRole('heading', { level: 1, name: '我的個案' });

    view.rerender(
      <MemoryRouter initialEntries={['/winwin/cases']}>
        <WinWinRoutes service={new DemoVerticalSliceService({
          authorizedCasesResult: { result: 'NOT_FOUND_OR_NOT_VISIBLE' }
        })} />
      </MemoryRouter>
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');

    settleOlder({
      result: 'SUCCESS',
      data: [{
        caseId: 'stale-secret',
        caseDisplay: '不應重新出現的舊資料',
        relationshipDisplay: '舊狀態',
        assignedActions: []
      }]
    });
    await waitFor(() => expect(screen.queryByText('不應重新出現的舊資料')).not.toBeInTheDocument());
  });
});

const caseHomeProjection: CaseHomeView = {
  caseId: 'demo-case-1',
  caseDisplay: '陳女士的照顧個案',
  relationshipDisplay: '家屬照顧者',
  sinceLastViewSummary: '上次查看後有 2 筆新變化',
  latestVisibleActivity: '更新了早晨照顧安排',
  assignedSummary: '1 項目前需要確認',
  continuityGaps: [{
    actionId: 'gap-action',
    careNeedDisplay: '確認明早照顧安排',
    currentHolderDisplay: '目前沒有人確定接手',
    followUpDisplay: '需要重新安排'
  }],
  allowedOperations: {
    CREATE_CARE_UPDATE: false,
    CREATE_ACTION: false,
    ACCEPT_ACTION: false,
    DECLINE_ACTION: false,
    START_ACTION: false,
    COMPLETE_ACTION: false
  }
};

describe('CP-F2 Case Home read experience', () => {
  it('opens an authorized Case from My Cases and renders only projected continuity information', async () => {
    const user = userEvent.setup();
    renderWinWin(new DemoVerticalSliceService({ caseHomeResult: { result: 'SUCCESS', data: caseHomeProjection } }));
    await user.click(await screen.findByRole('link', { name: '開啟個案' }));
    expect(await screen.findByRole('heading', { level: 1, name: '陳女士的照顧個案' })).toBeInTheDocument();
    expect(screen.getByText('上次查看後有 2 筆新變化')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '目前沒有人確定接手' })).toBeInTheDocument();
    expect(screen.getByText('這項處理事項需要重新安排。系統不會自動指定其他人。')).toBeInTheDocument();
    expect(screen.queryByText(/風險|診斷|Grant|Membership/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看所有活動' })).toHaveAttribute(
      'href',
      '/winwin/cases/demo-case-1/timeline'
    );
  });

  it('does not treat possession of an unknown caseId as authorization', async () => {
    renderWinWin(new DemoVerticalSliceService(), '/winwin/cases/not-authorized');
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');
    expect(screen.queryByText('not-authorized')).not.toBeInTheDocument();
  });

  it('keeps partial and recoverable Case Home states distinct', async () => {
    const view = renderWinWin(new DemoVerticalSliceService({
      caseHomeResult: { result: 'PARTIAL', data: caseHomeProjection }
    }), '/winwin/cases/demo-case-1');
    expect(await screen.findByText('部分資訊暫時無法載入')).toBeInTheDocument();
    expect(screen.getByText('目前只能顯示已安全載入的變化。')).toBeInTheDocument();

    view.rerender(<MemoryRouter initialEntries={['/winwin/cases/demo-case-1']}><WinWinRoutes service={
      new DemoVerticalSliceService({ caseHomeResult: {
        result: 'TEMPORARY_FAILURE', error: { code: 'OFFLINE', message: 'hidden detail' }
      } })
    } /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: '重新載入' })).toBeInTheDocument();
    expect(screen.queryByText('hidden detail')).not.toBeInTheDocument();
  });

  it('renders an authorized empty Case Home without inferring unavailable', async () => {
    renderWinWin(new DemoVerticalSliceService({ caseHomeResult: { result: 'EMPTY' } }), '/winwin/cases/demo-case-1');
    expect(await screen.findByText('目前沒有可顯示的個案摘要。')).toBeInTheDocument();
    expect(screen.queryByText('目前無法使用此內容')).not.toBeInTheDocument();
  });
});

describe('CP-F7 continuity-gap navigation and Product Activity integration', () => {
  it('keeps multiple authoritative gaps individually correlated to exact Action Detail targets', async () => {
    const multipleGaps: CaseHomeView = {
      ...caseHomeProjection,
      continuityGaps: [{
        actionId: 'action-a',
        careNeedDisplay: '確認 Action A 的早晨安排',
        currentHolderDisplay: '目前沒有人確定接手',
        followUpDisplay: '需要重新安排'
      }, {
        actionId: 'action-b',
        careNeedDisplay: '確認 Action B 的交接',
        currentHolderDisplay: '目前沒有人確定接手',
        followUpDisplay: '需要重新安排'
      }]
    };
    renderWinWin(new DemoVerticalSliceService({
      caseHomeResult: { result: 'SUCCESS', data: multipleGaps }
    }), '/winwin/cases/demo-case-1');

    expect(await screen.findByRole('link', { name: '查看處理事項：確認 Action A 的早晨安排' })).toHaveAttribute(
      'href', '/winwin/cases/demo-case-1/actions/action-a'
    );
    expect(screen.getByRole('link', { name: '查看處理事項：確認 Action B 的交接' })).toHaveAttribute(
      'href', '/winwin/cases/demo-case-1/actions/action-b'
    );
    expect(document.body).not.toHaveTextContent(/重新指派|已重新安排|高風險|危險/);
  });

  it('uses a fresh authoritative Action Detail read after stale gap navigation and fails safely', async () => {
    class StaleGap extends DemoVerticalSliceService {
      reads: string[] = [];
      override async getCaseHome() { return { result: 'SUCCESS' as const, data: caseHomeProjection }; }
      override async getActionDetail(caseId: string, actionId: string) {
        this.reads.push(`${caseId}:${actionId}`);
        return { result: 'NOT_FOUND_OR_NOT_VISIBLE' as const };
      }
    }
    const service = new StaleGap();
    const user = userEvent.setup();
    renderWinWin(service, '/winwin/cases/demo-case-1');
    await user.click(await screen.findByRole('link', { name: '查看處理事項：確認明早照顧安排' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');
    expect(service.reads).toEqual(['demo-case-1:gap-action']);
    expect(screen.queryByText('確認明早照顧安排')).not.toBeInTheDocument();
  });

  it('projects a declined responsibility into Case Home and Timeline without implying reassignment', async () => {
    const service = new DemoVerticalSliceService();
    await service.declineAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'decline-cp-f7');
    const currentAction = await service.getActionDetail('demo-case-1', 'demo-action-1');
    expect(currentAction.result).toBe('SUCCESS');
    if (currentAction.result !== 'SUCCESS') throw new Error('Expected declined Action projection');
    expect(currentAction.data.currentHolderDisplay).toBeUndefined();
    renderWinWin(service, '/winwin/cases/demo-case-1');
    const link = await screen.findByRole('link', { name: '查看處理事項：確認明早照顧安排' });
    expect(link).toHaveAttribute('href', '/winwin/cases/demo-case-1/actions/demo-action-1');
    expect(screen.getByText('處理事項目前沒有人確定接手')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/已重新指派|重新指派/);

    const user = userEvent.setup();
    await user.click(link);
    expect(await screen.findByRole('heading', { name: '負責與處理紀錄' })).toBeInTheDocument();
    expect(screen.getByText('目前無法接手', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getAllByText('需要重新安排', { exact: false }).length).toBeGreaterThan(0);

    cleanup();
    renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    const events = await screen.findAllByRole('heading', { level: 2 });
    expect(events.map((event) => event.textContent)).toEqual(expect.arrayContaining([
      '目前無法接手處理事項',
      '處理事項目前沒有人確定接手'
    ]));
    expect(screen.getByText('王先生・照顧協作者')).toBeInTheDocument();
    expect(screen.queryByText('目前負責人：王先生')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '查看處理事項' })).toHaveLength(2);
    expect(document.body).not.toHaveTextContent(/Grant|capability|scope|audit payload|已重新安排/);
  });

  it('preserves authoritative activity order, attribution, time, and typed targets', async () => {
    const projected: TimelineView = {
      caseId: 'demo-case-1',
      entries: [{
        activityId: 'activity-first',
        eventDisplay: '第一個權威活動',
        actorDisplay: '權威投影人員',
        relationshipDisplay: '照顧協作者',
        serverRecordedAt: '2026-09-05T01:00:00.000Z',
        target: { kind: 'ACTION', id: 'action-first' }
      }, {
        activityId: 'activity-second',
        eventDisplay: '第二個權威活動',
        serverRecordedAt: '2026-09-05T00:00:00.000Z',
        target: { kind: 'CARE_UPDATE', id: 'update-second' }
      }],
      mergedCareUpdates: []
    };
    renderWinWin(new DemoVerticalSliceService({
      timelineResult: { result: 'SUCCESS', data: projected }
    }), '/winwin/cases/demo-case-1/timeline');
    const items = await screen.findAllByRole('listitem');
    expect(items[0]).toHaveTextContent('第一個權威活動');
    expect(items[1]).toHaveTextContent('第二個權威活動');
    expect(screen.getByText('權威投影人員・照顧協作者')).toBeInTheDocument();
    expect(screen.getByText('2026-09-05T01:00:00.000Z')).toHaveAttribute('datetime', '2026-09-05T01:00:00.000Z');
    expect(screen.getByRole('link', { name: '查看處理事項' })).toHaveAttribute(
      'href', '/winwin/cases/demo-case-1/actions/action-first'
    );
    expect(screen.getByRole('link', { name: '查看照顧變化' })).toHaveAttribute('href', '#update-update-second');
  });

  it('projects lifecycle activity without turning completion into a care-outcome claim', async () => {
    const service = new DemoVerticalSliceService();
    await service.acceptAction({ actionId: 'demo-action-1', expectedVersion: '1' }, 'accept-cp-f7');
    await service.startAction({ actionId: 'demo-action-1', expectedVersion: '2' }, 'start-cp-f7');
    await service.completeAction({ actionId: 'demo-action-1', expectedVersion: '3', result: '已完成交接' }, 'complete-cp-f7');
    renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    const list = await screen.findByRole('list', { name: '個案活動時間軸' });
    expect(list).toHaveTextContent('已接受處理事項');
    expect(list).toHaveTextContent('已開始處理事項');
    expect(list).toHaveTextContent('已完成處理事項工作流程');
    expect(list).not.toHaveTextContent(/照顧問題已解決|長輩已安全|風險已解除|已確保不中斷/);
  });

  it('renders bounded empty projections without manufacturing gap, risk, or safety claims', async () => {
    renderWinWin(new DemoVerticalSliceService({
      caseHomeResult: { result: 'SUCCESS', data: { ...caseHomeProjection, continuityGaps: [] } }
    }), '/winwin/cases/demo-case-1');
    await screen.findByRole('heading', { level: 1, name: '陳女士的照顧個案' });
    expect(screen.queryByRole('heading', { name: '目前沒有人確定接手' })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/完全安全|沒有中斷風險/);

    cleanup();
    renderWinWin(new DemoVerticalSliceService({ timelineResult: { result: 'EMPTY' } }), '/winwin/cases/demo-case-1/timeline');
    expect(await screen.findByText('目前沒有可見的個案活動')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/沒有照顧發生|沒有風險/);
  });

  it.each(['older gap', 'older no-access'] as const)(
    'keeps Case B authoritative when Case A returns an %s response', async (outcome) => {
      let settleOlder!: (value: ProjectionResult<CaseHomeView>) => void;
      const older = new Promise<ProjectionResult<CaseHomeView>>((resolve) => { settleOlder = resolve; });
      const caseB: CaseHomeView = {
        ...caseHomeProjection,
        caseId: 'case-b',
        caseDisplay: 'Case B',
        continuityGaps: []
      };
      class CaseRace extends DemoVerticalSliceService {
        override getCaseHome(caseId: string) {
          return caseId === 'case-a'
            ? older
            : Promise.resolve({ result: 'SUCCESS' as const, data: caseB });
        }
      }
      function Harness({ service }: Readonly<{ service: CaseRace }>) {
        const navigate = useNavigate();
        return <><button type="button" onClick={() => navigate('/winwin/cases/case-b')}>Open Case B</button><WinWinRoutes service={service} /></>;
      }
      const user = userEvent.setup();
      render(<MemoryRouter initialEntries={['/winwin/cases/case-a']}><Harness service={new CaseRace()} /></MemoryRouter>);
      await user.click(screen.getByRole('button', { name: 'Open Case B' }));
      expect(await screen.findByRole('heading', { level: 1, name: 'Case B' })).toBeInTheDocument();
      settleOlder(outcome === 'older gap'
        ? { result: 'SUCCESS', data: { ...caseHomeProjection, caseId: 'case-a', caseDisplay: 'Case A' } }
        : { result: 'NOT_FOUND_OR_NOT_VISIBLE' });
      await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Case B' })).toBeInTheDocument());
      expect(screen.queryByText('Case A')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: '目前沒有人確定接手' })).not.toBeInTheDocument();
      expect(screen.queryByText('目前無法使用此內容')).not.toBeInTheDocument();
    }
  );
});

describe('CP-F2 Timeline, Care Update detail, and Read Cursor', () => {
  it('renders semantic authorized chronology and read-only merged Care Update detail', async () => {
    renderWinWin(new DemoVerticalSliceService(), '/winwin/cases/demo-case-1/timeline');
    expect(await screen.findByRole('list', { name: '個案活動時間軸' })).toBeInTheDocument();
    expect(screen.getByText('上次查看後')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看照顧變化' })).toHaveAttribute('href', '#update-demo-care-update-1');
    expect(screen.getByRole('heading', { name: '照顧變化內容' })).toBeInTheDocument();
    expect(screen.getByText('目前版本・唯讀')).toBeInTheDocument();
    expect(screen.getByText(/約略時間/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '建立處理事項' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /編輯|刪除|修正/ })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/Grant|Membership|audit payload/);
  });

  it('advances a complete rendered response once using its server boundary', async () => {
    class CursorProbeService extends DemoVerticalSliceService {
      calls: string[] = [];
      override async advanceReadCursor(caseId: string, boundary: string) {
        this.calls.push(`${caseId}:${boundary}`);
        return super.advanceReadCursor(caseId, boundary);
      }
    }
    const service = new CursorProbeService();
    renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    await screen.findByRole('heading', { name: '照顧變化內容' });
    await waitFor(() => expect(service.calls).toEqual(['demo-case-1:demo-boundary-2']));
  });

  it('advances authorized empty only with a server boundary', async () => {
    class EmptyCursorProbe extends DemoVerticalSliceService {
      calls: string[] = [];
      override async advanceReadCursor(caseId: string, boundary: string) {
        this.calls.push(boundary);
        return super.advanceReadCursor(caseId, boundary);
      }
    }
    const withBoundary = new EmptyCursorProbe({ timelineResult: { result: 'EMPTY', boundary: 'empty-boundary' } });
    renderWinWin(withBoundary, '/winwin/cases/demo-case-1/timeline');
    expect(await screen.findByText('目前沒有可見的個案活動')).toBeInTheDocument();
    await waitFor(() => expect(withBoundary.calls).toEqual(['empty-boundary']));
  });

  it('does not advance a partial Timeline even when projected data contains a boundary', async () => {
    const timeline = (await new DemoVerticalSliceService().getTimeline('demo-case-1')) as { result: 'SUCCESS'; data: TimelineView };
    class PartialCursorProbe extends DemoVerticalSliceService {
      advanceReadCursor = vi.fn(super.advanceReadCursor.bind(this));
    }
    const service = new PartialCursorProbe({ timelineResult: { result: 'PARTIAL', data: timeline.data } });
    renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    expect(await screen.findByText(/上次查看位置不會更新/)).toBeInTheDocument();
    expect(service.advanceReadCursor).not.toHaveBeenCalled();
  });

  it('keeps rendered content after cursor failure and retries the same boundary only on activation', async () => {
    class FailedCursorService extends DemoVerticalSliceService {
      boundaries: string[] = [];
      override async advanceReadCursor(_caseId: string, boundary: string) {
        this.boundaries.push(boundary);
        return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: false };
      }
    }
    const user = userEvent.setup();
    const service = new FailedCursorService();
    renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    expect(await screen.findByRole('heading', { name: '照顧變化內容' })).toBeInTheDocument();
    const retry = await screen.findByRole('button', { name: '重試儲存' });
    expect(screen.getByText('早上的照顧安排需要確認。')).toBeInTheDocument();
    expect(service.boundaries).toEqual(['demo-boundary-2']);
    await user.click(retry);
    await waitFor(() => expect(service.boundaries).toEqual(['demo-boundary-2', 'demo-boundary-2']));
  });

  it('does not advance or retain Timeline content after unavailable', async () => {
    class UnavailableProbe extends DemoVerticalSliceService {
      advanceReadCursor = vi.fn(super.advanceReadCursor.bind(this));
    }
    const service = new UnavailableProbe({ timelineResult: { result: 'NOT_FOUND_OR_NOT_VISIBLE' } });
    renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');
    expect(screen.queryByText('早上的照顧安排需要確認。')).not.toBeInTheDocument();
    expect(service.advanceReadCursor).not.toHaveBeenCalled();
  });

  it('does not render or acknowledge an older Timeline response after a Case route change', async () => {
    let settleOlder!: (value: ProjectionResult<TimelineView>) => void;
    const older = new Promise<ProjectionResult<TimelineView>>((resolve) => { settleOlder = resolve; });
    class RouteChangeService extends DemoVerticalSliceService {
      advanceReadCursor = vi.fn(super.advanceReadCursor.bind(this));
      override getTimeline(caseId: string) {
        return caseId === 'demo-case-1'
          ? older
          : Promise.resolve({ result: 'NOT_FOUND_OR_NOT_VISIBLE' as const });
      }
    }
    function RouteChangeHarness({ service }: Readonly<{ service: RouteChangeService }>) {
      const navigate = useNavigate();
      return <><button type="button" onClick={() => navigate('/winwin/cases/other/timeline')}>切換個案</button><WinWinRoutes service={service} /></>;
    }
    const service = new RouteChangeService();
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/winwin/cases/demo-case-1/timeline']}><RouteChangeHarness service={service} /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: '切換個案' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');
    const current = await new DemoVerticalSliceService().getTimeline('demo-case-1');
    settleOlder(current);
    await waitFor(() => expect(screen.queryByText('早上的照顧安排需要確認。')).not.toBeInTheDocument());
    expect(service.advanceReadCursor).not.toHaveBeenCalled();
  });
});

describe('CP-F2 stale cursor completion correction', () => {
  const cursorOutcomes: readonly [string, CommandResult<ReadCursorAdvanceView>][] = [
    ['success', { result: 'SUCCESS', data: { currentBoundary: 'old-server-maximum' } }],
    ['failure', { result: 'TEMPORARY_FAILURE', outcomeUncertain: false }],
    ['no access', { result: 'NOT_FOUND_OR_NOT_VISIBLE' }]
  ];

  it.each(cursorOutcomes)('makes stale cursor %s after Case change inert', async (_label, oldOutcome) => {
    const original = await new DemoVerticalSliceService().getTimeline('demo-case-1');
    if (original.result !== 'SUCCESS') throw new Error('Expected demo Timeline');
    const caseB: TimelineView = {
      ...original.data,
      caseId: 'case-b',
      returnedBoundary: undefined,
      newChangeStartIndex: undefined,
      entries: original.data.entries.map((entry) => ({ ...entry, eventDisplay: 'Case B 最新活動' })),
      mergedCareUpdates: original.data.mergedCareUpdates.map((update) => ({ ...update, content: 'Case B 安全內容' }))
    };
    let settleOld!: (result: CommandResult<ReadCursorAdvanceView>) => void;
    const oldCursor = new Promise<CommandResult<ReadCursorAdvanceView>>((resolve) => { settleOld = resolve; });
    class CaseChangeService extends DemoVerticalSliceService {
      cursorCalls: string[] = [];
      override getTimeline(caseId: string) {
        return Promise.resolve({ result: 'SUCCESS' as const, data: caseId === 'case-b' ? caseB : original.data });
      }
      override advanceReadCursor(caseId: string, boundary: string) {
        this.cursorCalls.push(`${caseId}:${boundary}`);
        return oldCursor;
      }
    }
    function CaseChangeHarness({ service }: Readonly<{ service: CaseChangeService }>) {
      const navigate = useNavigate();
      return <><button type="button" onClick={() => navigate('/winwin/cases/case-b/timeline')}>前往 Case B</button><WinWinRoutes service={service} /></>;
    }
    const service = new CaseChangeService();
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/winwin/cases/demo-case-1/timeline']}><CaseChangeHarness service={service} /></MemoryRouter>);
    await waitFor(() => expect(service.cursorCalls).toEqual(['demo-case-1:demo-boundary-2']));
    await user.click(screen.getByRole('button', { name: '前往 Case B' }));
    expect(await screen.findByText('Case B 安全內容')).toBeInTheDocument();
    settleOld(oldOutcome);
    await waitFor(() => expect(screen.getByText('Case B 安全內容')).toBeInTheDocument());
    expect(screen.queryByText('目前無法使用此內容')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重試儲存' })).not.toBeInTheDocument();
  });

  it('does not let an older same-Case cursor success overwrite newer failure feedback', async () => {
    let settleOld!: (result: CommandResult<ReadCursorAdvanceView>) => void;
    const oldCursor = new Promise<CommandResult<ReadCursorAdvanceView>>((resolve) => { settleOld = resolve; });
    class OldService extends DemoVerticalSliceService {
      override advanceReadCursor() { return oldCursor; }
    }
    const view = renderWinWin(new OldService(), '/winwin/cases/demo-case-1/timeline');
    await screen.findByRole('heading', { name: '照顧變化內容' });
    view.rerender(<MemoryRouter initialEntries={['/winwin/cases/demo-case-1/timeline']}><WinWinRoutes service={
      new DemoVerticalSliceService({ cursorResult: { result: 'TEMPORARY_FAILURE', outcomeUncertain: false } })
    } /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: '重試儲存' })).toBeInTheDocument();
    settleOld({ result: 'SUCCESS', data: { currentBoundary: 'stale-maximum' } });
    await waitFor(() => expect(screen.getByRole('button', { name: '重試儲存' })).toBeInTheDocument());
  });

  it('makes a cursor completion after Timeline unmount inert', async () => {
    let settleOld!: (result: CommandResult<ReadCursorAdvanceView>) => void;
    const oldCursor = new Promise<CommandResult<ReadCursorAdvanceView>>((resolve) => { settleOld = resolve; });
    class UnmountService extends DemoVerticalSliceService {
      calls = 0;
      override advanceReadCursor() { this.calls++; return oldCursor; }
    }
    const service = new UnmountService();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = renderWinWin(service, '/winwin/cases/demo-case-1/timeline');
    await waitFor(() => expect(service.calls).toBe(1));
    view.unmount();
    settleOld({ result: 'NOT_FOUND_OR_NOT_VISIBLE' });
    await Promise.resolve();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('keeps current cursor no-access behavior while rejecting stale no-access', async () => {
    renderWinWin(new DemoVerticalSliceService({
      cursorResult: { result: 'NOT_FOUND_OR_NOT_VISIBLE' }
    }), '/winwin/cases/demo-case-1/timeline');
    expect(await screen.findByRole('alert')).toHaveTextContent('目前無法使用此內容');
    expect(screen.queryByText('早上的照顧安排需要確認。')).not.toBeInTheDocument();
  });

  it('turns a current rejected cursor request into bounded retry without removing content', async () => {
    class RejectedCursorService extends DemoVerticalSliceService {
      override advanceReadCursor(): Promise<never> { return Promise.reject(new Error('offline')); }
    }
    renderWinWin(new RejectedCursorService(), '/winwin/cases/demo-case-1/timeline');
    expect(await screen.findByRole('button', { name: '重試儲存' })).toBeInTheDocument();
    expect(screen.getByText('早上的照顧安排需要確認。')).toBeInTheDocument();
  });

  it('does not allow retry from a superseded Timeline response', async () => {
    class FirstFailureService extends DemoVerticalSliceService {
      calls = 0;
      override async advanceReadCursor() {
        this.calls++;
        return { result: 'TEMPORARY_FAILURE' as const, outcomeUncertain: false };
      }
    }
    const first = new FirstFailureService();
    const view = renderWinWin(first, '/winwin/cases/demo-case-1/timeline');
    const staleRetry = await screen.findByRole('button', { name: '重試儲存' });
    view.rerender(<MemoryRouter initialEntries={['/winwin/cases/demo-case-1/timeline']}><WinWinRoutes service={
      new DemoVerticalSliceService({ timelineResult: { result: 'EMPTY' } })
    } /></MemoryRouter>);
    expect(await screen.findByText('目前沒有可見的個案活動')).toBeInTheDocument();
    expect(staleRetry).not.toBeInTheDocument();
    staleRetry.click();
    expect(first.calls).toBe(1);
  });
});
