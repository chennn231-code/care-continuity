import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { AuthorizedCaseSummary, ScreenState } from '../contracts/frontendContract';
import { LoadingState, UnavailableState } from '../components/SafetyStates';
import { useWinWinApp } from '../state/WinWinAppProvider';

type CaseListState = ScreenState<readonly AuthorizedCaseSummary[]>;

export function MyCasesPage() {
  const {
    service,
    sessionState,
    contextGeneration,
    invalidateProtectedContext
  } = useWinWinApp();
  const [state, setState] = useState<CaseListState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const requestGeneration = useRef(0);

  useEffect(() => {
    if (sessionState.status !== 'signedIn') return;
    const request = ++requestGeneration.current;
    setState({ status: 'loading' });

    void service.getAuthorizedCases().then((result) => {
      if (request !== requestGeneration.current) return;
      if (result.result === 'SUCCESS') {
        setState(result.data.length === 0
          ? { status: 'empty' }
          : { status: 'success', data: result.data, freshness: 'current' });
        return;
      }
      if (result.result === 'EMPTY') {
        setState({ status: 'empty', boundary: result.boundary });
        return;
      }
      if (result.result === 'PARTIAL') {
        setState({ status: 'partial', data: result.data, retryable: true });
        return;
      }
      if (result.result === 'TEMPORARY_FAILURE') {
        setState({ status: 'recoverableError', error: result.error });
        return;
      }
      setState({ status: 'unavailable' });
      invalidateProtectedContext();
    });

    return () => { requestGeneration.current++; };
  }, [service, sessionState.status, contextGeneration, attempt, invalidateProtectedContext]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (sessionState.status === 'checking') return <LoadingState label="正在確認登入狀態" />;
  if (sessionState.status === 'signedOut' || sessionState.status === 'recoverableError') {
    return <Navigate to="/winwin/login" replace />;
  }
  if (sessionState.status === 'unavailable' || state.status === 'unavailable') {
    return <UnavailableState />;
  }
  if (state.status === 'idle' || state.status === 'loading' || state.status === 'stale') {
    return <LoadingState label="我的個案" />;
  }

  if (state.status === 'recoverableError') {
    return (
      <section className="winwin-state-card" role="alert" aria-labelledby="winwin-cases-error-title">
        <h1 id="winwin-cases-error-title">我的個案</h1>
        <p>部分資訊暫時無法載入，請稍後再試。</p>
        <button className="winwin-primary-action" type="button" onClick={retry}>重新載入</button>
      </section>
    );
  }

  const cases = state.status === 'empty' ? [] : state.data;
  const partial = state.status === 'partial';
  const assignedActions = cases.flatMap((item) => item.assignedActions);

  return (
    <div className="winwin-cases-page">
      <header className="winwin-page-heading">
        <p className="winwin-eyebrow">照顧協作</p>
        <h1>我的個案</h1>
        <p>查看目前可存取的照顧個案與指派事項。</p>
      </header>

      {partial && (
        <div className="winwin-inline-notice" role="status">
          部分資訊暫時無法載入
          <button type="button" onClick={retry}>重新載入</button>
        </div>
      )}

      <section aria-labelledby="winwin-assigned-heading">
        <h2 id="winwin-assigned-heading">指派給我</h2>
        {assignedActions.length === 0 ? (
          <p className="winwin-empty-copy">目前沒有指派給你的處理事項</p>
        ) : (
          <ul className="winwin-assigned-list" aria-labelledby="winwin-assigned-heading">
            {assignedActions.map((action) => (
              <li key={action.actionId}>
                <strong>{action.actionTitle}</strong>
                <span>{action.caseDisplay}・{action.stateLabel}</span>
                {action.dueDisplay && <span>{action.dueDisplay}</span>}
                <Link to={`/winwin/cases/${action.caseId}/actions/${action.actionId}`}>查看處理事項</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="winwin-cases-heading">
        <h2 id="winwin-cases-heading">可存取的個案</h2>
        {cases.length === 0 ? (
          <p className="winwin-empty-copy">目前沒有可存取的個案</p>
        ) : (
          <ul className="winwin-case-list" aria-labelledby="winwin-cases-heading">
            {cases.map((item) => (
              <li className="winwin-case-card" key={item.caseId}>
                <h3>{item.caseDisplay}</h3>
                <p>{item.relationshipDisplay}</p>
                {!partial && typeof item.newChangeCount === 'number' && (
                  <p className="winwin-badge">新變化 {item.newChangeCount}</p>
                )}
                {!partial && item.responsibilitySummary && <p>{item.responsibilitySummary}</p>}
                <p>{item.latestVisibleActivity ?? '目前沒有可見活動'}</p>
                <Link className="winwin-primary-action" to={`/winwin/cases/${item.caseId}`}>
                  開啟個案
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
