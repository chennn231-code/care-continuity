import { Navigate } from 'react-router-dom';
import { LoadingState, UnavailableState } from '../components/SafetyStates';
import { useWinWinApp } from '../state/WinWinAppProvider';

export function SessionEntryPage() {
  const { sessionState, retrySession } = useWinWinApp();

  if (sessionState.status === 'checking') {
    return <LoadingState label="正在確認登入狀態" />;
  }
  if (sessionState.status === 'signedIn') {
    return <Navigate to="/winwin/cases" replace />;
  }
  if (sessionState.status === 'unavailable') {
    return <UnavailableState />;
  }

  const recoverable = sessionState.status === 'recoverableError';
  return (
    <section className="winwin-state-card" role={recoverable ? 'alert' : undefined} aria-labelledby="winwin-session-title">
      <p className="winwin-eyebrow">安全照顧協作</p>
      <h1 id="winwin-session-title">進入 WinWin</h1>
      <p>{recoverable
        ? '連線暫時不穩定，請稍後再試。'
        : '登入狀態已失效，請重新登入。'}</p>
      <button className="winwin-primary-action" type="button" onClick={retrySession}>
        {recoverable ? '重新嘗試' : '重新登入'}
      </button>
    </section>
  );
}
