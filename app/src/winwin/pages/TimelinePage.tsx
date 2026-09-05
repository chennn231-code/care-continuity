import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { CommandResult, ReadCursorAdvanceView, ScreenState, TimelineView } from '../contracts/frontendContract';
import {
  EMPTY_CURSOR_SAFETY_STATE,
  beginCursorAdvance,
  registerCursorResponse,
  retryCursorAdvance,
  settleCursorAdvance,
  type CursorAdvanceAttempt,
  type CursorRenderDisposition,
  type CursorSafetyState
} from '../safety/safetyState';
import { LoadingState, UnavailableState } from '../components/SafetyStates';
import { CreateActionStep } from '../components/CreateActionStep';
import { useWinWinApp } from '../state/WinWinAppProvider';

type TimelineState = ScreenState<TimelineView>;
type CursorStatus = 'idle' | 'saving' | 'saved' | 'failed';

export function TimelinePage({ caseId }: Readonly<{ caseId: string }>) {
  const { service, sessionState, contextGeneration, invalidateProtectedContext } = useWinWinApp();
  const [state, setState] = useState<TimelineState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const [cursorStatus, setCursorStatus] = useState<CursorStatus>('idle');
  const requestGeneration = useRef(0);
  const cursorLifecycleGeneration = useRef(0);
  const requestContext = useRef<Readonly<{ caseId: string; contextGeneration: number }> | undefined>(undefined);
  const cursorSafety = useRef<CursorSafetyState>(EMPTY_CURSOR_SAFETY_STATE);

  const settleCursor = useCallback(async (cursorAttempt: CursorAdvanceAttempt) => {
    const lifecycleGeneration = cursorLifecycleGeneration.current;
    const attemptContext = { caseId, contextGeneration };
    const isCurrentAttempt = () => {
      const currentContext = requestContext.current;
      return cursorLifecycleGeneration.current === lifecycleGeneration
        && currentContext?.caseId === attemptContext.caseId
        && currentContext.contextGeneration === attemptContext.contextGeneration
        && cursorSafety.current.currentResponse?.responseId === cursorAttempt.responseId
        && cursorSafety.current.inFlightResponseId === cursorAttempt.responseId;
    };
    setCursorStatus('saving');
    let result: CommandResult<ReadCursorAdvanceView>;
    try {
      result = await service.advanceReadCursor(caseId, cursorAttempt.boundary);
    } catch {
      if (!isCurrentAttempt()) return;
      cursorSafety.current = settleCursorAdvance(cursorSafety.current, cursorAttempt, { status: 'failed' });
      setCursorStatus('failed');
      return;
    }
    if (!isCurrentAttempt()) return;
    if (result.result === 'NOT_FOUND_OR_NOT_VISIBLE') {
      cursorSafety.current = EMPTY_CURSOR_SAFETY_STATE;
      setState({ status: 'unavailable' });
      invalidateProtectedContext();
      return;
    }
    if (result.result === 'SUCCESS') {
      cursorSafety.current = settleCursorAdvance(cursorSafety.current, cursorAttempt, {
        status: 'saved',
        serverBoundary: result.data.currentBoundary
      });
      setCursorStatus('saved');
      return;
    }
    cursorSafety.current = settleCursorAdvance(cursorSafety.current, cursorAttempt, { status: 'failed' });
    setCursorStatus('failed');
  }, [service, caseId, invalidateProtectedContext]);

  useEffect(() => {
    if (sessionState.status !== 'signedIn') return;
    const generation = ++requestGeneration.current;
    cursorLifecycleGeneration.current++;
    requestContext.current = { caseId, contextGeneration };
    cursorSafety.current = EMPTY_CURSOR_SAFETY_STATE;
    setCursorStatus('idle');
    setState({ status: 'loading' });
    void service.getTimeline(caseId).then((result) => {
      if (generation !== requestGeneration.current) return;
      if (result.result === 'SUCCESS') {
        cursorSafety.current = registerCursorResponse(cursorSafety.current, {
          responseId: `${caseId}:${generation}:${result.data.returnedBoundary ?? 'no-boundary'}`,
          generation,
          boundary: result.data.returnedBoundary
        });
        setState({ status: 'success', data: result.data, freshness: 'current' });
      } else if (result.result === 'EMPTY') {
        cursorSafety.current = registerCursorResponse(cursorSafety.current, {
          responseId: `${caseId}:${generation}:${result.boundary ?? 'no-boundary'}`,
          generation,
          boundary: result.boundary
        });
        setState({ status: 'empty', boundary: result.boundary });
      } else if (result.result === 'PARTIAL') {
        setState({ status: 'partial', data: result.data, retryable: true });
      } else if (result.result === 'TEMPORARY_FAILURE') {
        setState({ status: 'recoverableError', error: result.error });
      } else {
        setState({ status: 'unavailable' });
        invalidateProtectedContext();
      }
    });
    return () => {
      requestGeneration.current++;
      cursorLifecycleGeneration.current++;
      cursorSafety.current = EMPTY_CURSOR_SAFETY_STATE;
    };
  }, [service, sessionState.status, contextGeneration, caseId, attempt, invalidateProtectedContext]);

  useEffect(() => {
    let disposition: CursorRenderDisposition | undefined;
    if (requestContext.current?.caseId !== caseId
      || requestContext.current.contextGeneration !== contextGeneration) return;
    if (state.status === 'success') disposition = 'completeSuccess';
    if (state.status === 'empty') disposition = 'authorizedEmpty';
    if (!disposition) return;
    const next = beginCursorAdvance(cursorSafety.current, disposition);
    cursorSafety.current = next.state;
    if (next.attempt) void settleCursor(next.attempt);
  }, [state, settleCursor, caseId, contextGeneration]);

  const retryLoad = useCallback(() => setAttempt((value) => value + 1), []);
  const retryCursor = useCallback(() => {
    const next = retryCursorAdvance(cursorSafety.current);
    cursorSafety.current = next.state;
    if (next.attempt) void settleCursor(next.attempt);
  }, [settleCursor]);

  if (sessionState.status === 'checking') return <LoadingState label="正在確認登入狀態" />;
  if (sessionState.status === 'signedOut' || sessionState.status === 'recoverableError') {
    return <Navigate to="/winwin/login" replace />;
  }
  if (sessionState.status === 'unavailable' || state.status === 'unavailable') return <UnavailableState />;
  if (requestContext.current?.caseId !== caseId
    || requestContext.current.contextGeneration !== contextGeneration) {
    return <LoadingState label="照顧活動" />;
  }
  if (state.status === 'idle' || state.status === 'loading' || state.status === 'stale') {
    return <LoadingState label="照顧活動" />;
  }
  if (state.status === 'recoverableError') {
    return (
      <section className="winwin-state-card" role="alert">
        <h1>照顧活動</h1><p>目前離線，尚未同步最新活動。</p>
        <button className="winwin-primary-action" type="button" onClick={retryLoad}>重新載入</button>
      </section>
    );
  }

  const timeline = state.status === 'empty' ? undefined : state.data;
  const partial = state.status === 'partial';
  return (
    <div className="winwin-timeline-page">
      <nav aria-label="個案導覽" className="winwin-breadcrumbs">
        <Link to="/winwin/cases">我的個案</Link><span aria-hidden="true">/</span>
        <Link to={`/winwin/cases/${caseId}`}>個案首頁</Link><span aria-hidden="true">/</span><span>照顧活動</span>
      </nav>
      <header className="winwin-page-heading"><p className="winwin-eyebrow">時間順序</p><h1>照顧活動</h1></header>
      {partial && <p className="winwin-inline-notice" role="status">部分資訊暫時無法載入；上次查看位置不會更新。</p>}
      {!timeline || timeline.entries.length === 0 ? (
        <p className="winwin-empty-copy">目前沒有可見的個案活動</p>
      ) : (
        <ol className="winwin-timeline" aria-label="個案活動時間軸">
          {timeline.entries.map((entry, index) => (
            <li key={entry.activityId}>
              {timeline.newChangeStartIndex === index && <p className="winwin-timeline-divider">上次查看後</p>}
              <article aria-labelledby={`activity-${entry.activityId}`}>
                <h2 id={`activity-${entry.activityId}`}>{entry.eventDisplay}</h2>
                {entry.actorDisplay && <p>{entry.actorDisplay}{entry.relationshipDisplay ? `・${entry.relationshipDisplay}` : ''}</p>}
                {entry.sourceDisplay && <p>來源：{entry.sourceDisplay}</p>}
                <time dateTime={entry.serverRecordedAt}>{entry.serverRecordedAt}</time>
                <p><a href={entry.target.kind === 'CARE_UPDATE'
                  ? `#update-${entry.target.id}`
                  : `/winwin/cases/${caseId}/actions/${entry.target.id}`}>
                  {entry.target.kind === 'CARE_UPDATE' ? '查看照顧變化' : '查看處理事項'}
                </a></p>
              </article>
            </li>
          ))}
        </ol>
      )}
      {timeline?.mergedCareUpdates.map((update) => (
        <section id={`update-${update.careUpdateId}`} className="winwin-care-update" aria-labelledby={`update-${update.careUpdateId}-title`} key={update.careUpdateId}>
          <p className="winwin-eyebrow">{update.categoryDisplay}</p>
          <h2 id={`update-${update.careUpdateId}-title`}>照顧變化內容</h2>
          <p>{update.content}</p><dl><dt>來源</dt><dd>{update.sourceDisplay}</dd><dt>發生時間</dt><dd>{update.occurredDate}{update.occurredTime ? ` ${update.occurredTime}` : ''}（{{ EXACT: '精確時間', APPROXIMATE: '約略時間', UNKNOWN: '時間未確認' }[update.timePrecision]}）</dd><dt>記錄者</dt><dd>{update.authorDisplay}</dd><dt>發布時間</dt><dd><time dateTime={update.serverPublishedAt}>{update.serverPublishedAt}</time></dd><dt>可見範圍</dt><dd>{update.visibilityDisplay}</dd></dl>
          <p>目前版本・唯讀</p><p>{update.linkedAction ? `處理事項：${update.linkedAction.stateLabel}` : '目前未建立處理事項'}</p>
          {!update.linkedAction && update.allowedOperations.CREATE_ACTION && <CreateActionStep caseId={caseId} source={{
            careUpdateId: update.careUpdateId,
            versionId: update.versionId,
            summary: update.content
          }} />}
        </section>
      ))}
      {cursorStatus === 'failed' && <div className="winwin-cursor-notice" role="status"><span>上次查看位置尚未儲存。</span><button type="button" onClick={retryCursor}>重試儲存</button></div>}
    </div>
  );
}
