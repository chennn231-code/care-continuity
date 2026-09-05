import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { App, DEFAULT_PRODUCT_PATH } from '../src/App';
import { DemoVerticalSliceService } from '../src/winwin/adapters/demo/DemoVerticalSliceService';
import type { AuthorizedCaseSummary, ProjectionResult } from '../src/winwin/contracts/frontendContract';
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
