import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App, DEFAULT_PRODUCT_PATH } from '../src/App';
import { DemoVerticalSliceService } from '../src/winwin/adapters/demo/DemoVerticalSliceService';
import type {
  AuthorizedCaseSummary,
  CaseHomeView,
  CommandResult,
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

describe('CP-F2 Timeline, Care Update detail, and Read Cursor', () => {
  it('renders semantic authorized chronology and read-only merged Care Update detail', async () => {
    renderWinWin(new DemoVerticalSliceService(), '/winwin/cases/demo-case-1/timeline');
    expect(await screen.findByRole('list', { name: '個案活動時間軸' })).toBeInTheDocument();
    expect(screen.getByText('上次查看後')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看照顧變化' })).toHaveAttribute('href', '#update-demo-care-update-1');
    expect(screen.getByRole('heading', { name: '照顧變化內容' })).toBeInTheDocument();
    expect(screen.getByText('目前版本・唯讀')).toBeInTheDocument();
    expect(screen.getByText(/約略時間/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /建立|編輯|刪除|修正/ })).not.toBeInTheDocument();
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
