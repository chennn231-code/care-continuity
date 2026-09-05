import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { CaseHomeView, ScreenState } from '../contracts/frontendContract';
import { LoadingState, UnavailableState } from '../components/SafetyStates';
import { useWinWinApp } from '../state/WinWinAppProvider';

export function CaseHomePage({ caseId }: Readonly<{ caseId: string }>) {
  const { service, sessionState, contextGeneration, invalidateProtectedContext } = useWinWinApp();
  const [state, setState] = useState<ScreenState<CaseHomeView>>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const requestGeneration = useRef(0);
  const requestContext = useRef<Readonly<{ caseId: string; contextGeneration: number }> | undefined>(undefined);

  useEffect(() => {
    if (sessionState.status !== 'signedIn') return;
    const request = ++requestGeneration.current;
    requestContext.current = { caseId, contextGeneration };
    setState({ status: 'loading' });
    void service.getCaseHome(caseId).then((result) => {
      if (request !== requestGeneration.current) return;
      if (result.result === 'SUCCESS') {
        setState({ status: 'success', data: result.data, freshness: 'current' });
      } else if (result.result === 'PARTIAL') {
        setState({ status: 'partial', data: result.data, retryable: true });
      } else if (result.result === 'TEMPORARY_FAILURE') {
        setState({ status: 'recoverableError', error: result.error });
      } else if (result.result === 'EMPTY') {
        setState({ status: 'empty', boundary: result.boundary });
      } else {
        setState({ status: 'unavailable' });
        invalidateProtectedContext();
      }
    });
    return () => { requestGeneration.current++; };
  }, [service, sessionState.status, contextGeneration, caseId, attempt, invalidateProtectedContext]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (sessionState.status === 'checking') return <LoadingState label="正在確認登入狀態" />;
  if (sessionState.status === 'signedOut' || sessionState.status === 'recoverableError') {
    return <Navigate to="/winwin/login" replace />;
  }
  if (sessionState.status === 'unavailable' || state.status === 'unavailable') return <UnavailableState />;
  if (requestContext.current?.caseId !== caseId
    || requestContext.current.contextGeneration !== contextGeneration) {
    return <LoadingState label="個案首頁" />;
  }
  if (state.status === 'idle' || state.status === 'loading' || state.status === 'stale') {
    return <LoadingState label="個案首頁" />;
  }
  if (state.status === 'recoverableError') {
    return (
      <section className="winwin-state-card" role="alert" aria-labelledby="case-home-error-title">
        <h1 id="case-home-error-title">個案首頁</h1>
        <p>個案資訊暫時無法載入，請稍後再試。</p>
        <button className="winwin-primary-action" type="button" onClick={retry}>重新載入</button>
      </section>
    );
  }
  if (state.status === 'empty') {
    return (
      <section className="winwin-state-card">
        <h1>個案首頁</h1>
        <p>目前沒有可顯示的個案摘要。</p>
        <Link to="/winwin/cases">返回我的個案</Link>
      </section>
    );
  }

  const view = state.data;
  const partial = state.status === 'partial';
  return (
    <div className="winwin-case-home">
      <nav aria-label="個案導覽" className="winwin-breadcrumbs">
        <Link to="/winwin/cases">我的個案</Link><span aria-hidden="true">/</span><span>個案首頁</span>
      </nav>
      <header className="winwin-page-heading">
        <p className="winwin-eyebrow">{view.relationshipDisplay}</p>
        <h1>{view.caseDisplay}</h1>
      </header>
      {partial && <p className="winwin-inline-notice" role="status">部分資訊暫時無法載入</p>}
      {view.continuityGaps.map((gap) => (
        <section className="winwin-gap-banner" role="status" aria-labelledby={`gap-${gap.actionId}`} key={gap.actionId}>
          <h2 id={`gap-${gap.actionId}`}>{gap.currentHolderDisplay}</h2>
          <p>這項處理事項需要重新安排。系統不會自動指定其他人。</p>
          <p><strong>{gap.careNeedDisplay}</strong>・{gap.followUpDisplay}</p>
          <Link to={`/winwin/cases/${view.caseId}/actions/${gap.actionId}`}>查看處理事項</Link>
        </section>
      ))}
      <section aria-labelledby="since-last-view-heading" className="winwin-summary-card">
        <h2 id="since-last-view-heading">上次查看後</h2>
        <p>{partial
          ? '目前只能顯示已安全載入的變化。'
          : view.sinceLastViewSummary ?? '上次查看後沒有新的可見變化'}</p>
        {view.latestVisibleActivity && <p>{view.latestVisibleActivity}</p>}
      </section>
      <section aria-labelledby="responsibility-heading" className="winwin-summary-card">
        <h2 id="responsibility-heading">目前照顧安排</h2>
        {view.assignedSummary && <p>{view.assignedSummary}</p>}
        {view.inProgressSummary && <p>{view.inProgressSummary}</p>}
        {!view.assignedSummary && !view.inProgressSummary && <p>目前沒有可顯示的責任摘要。</p>}
      </section>
      <div className="winwin-page-actions">
        <Link className="winwin-primary-action" to={`/winwin/cases/${view.caseId}/timeline`}>查看所有活動</Link>
        {view.allowedOperations.CREATE_CARE_UPDATE && <Link to={`/winwin/cases/${view.caseId}/updates/new`}>新增照顧變化</Link>}
      </div>
    </div>
  );
}
