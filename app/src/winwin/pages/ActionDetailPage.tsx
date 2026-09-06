import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LoadingState, UnavailableState } from '../components/SafetyStates';
import type { ActionDetailView, ActionMutationInput, OperationKey, OperationOutcome } from '../contracts/frontendContract';
import { useWinWinApp } from '../state/WinWinAppProvider';

type ActionOperation = 'ACCEPT_ACTION' | 'DECLINE_ACTION' | 'START_ACTION';
type DecisionState = 'idle' | 'submitting' | 'uncertain' | 'definitelyNotCommitted' | 'conflict' | 'committedPendingRefresh';
type Intent = Readonly<{ family: ActionOperation; operationKey: OperationKey; input: ActionMutationInput }>;
type DecisionOwner = Intent | Readonly<{ acquiring: true; family: ActionOperation }>;

function isIntent(owner: DecisionOwner | undefined): owner is Intent {
  return Boolean(owner && 'operationKey' in owner);
}

export function ActionDetailPage({ caseId, actionId }: Readonly<{ caseId: string; actionId: string }>) {
  const { service, sessionState, contextGeneration, invalidateProtectedContext } = useWinWinApp();
  const [detail, setDetail] = useState<ActionDetailView>();
  const [screenState, setScreenState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [decisionState, setDecisionState] = useState<DecisionState>('idle');
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const lifecycle = useRef(0);
  const owner = useRef<DecisionOwner | undefined>(undefined);
  const lookupOwner = useRef(false);

  useEffect(() => {
    const token = ++lifecycle.current;
    owner.current = undefined;
    lookupOwner.current = false;
    setLookupBusy(false);
    setDecisionState('idle');
    setConfirmDecline(false);
    setDetail(undefined);
    setScreenState('loading');
    if (sessionState.status !== 'signedIn') return () => { lifecycle.current++; };
    void service.getActionDetail(caseId, actionId).then((result) => {
      if (token !== lifecycle.current) return;
      if (result.result === 'SUCCESS') { setDetail(result.data); setScreenState('ready'); return; }
      setScreenState('unavailable');
      if (result.result === 'NOT_FOUND_OR_NOT_VISIBLE') invalidateProtectedContext();
    });
    return () => { lifecycle.current++; owner.current = undefined; lookupOwner.current = false; };
  }, [service, sessionState.status, contextGeneration, caseId, actionId, invalidateProtectedContext]);

  const owns = (token: number, intent: Intent) => {
    const currentOwner = owner.current;
    return token === lifecycle.current
      && isIntent(currentOwner)
      && currentOwner.operationKey === intent.operationKey
      && currentOwner.family === intent.family
      && currentOwner.input.expectedVersion === intent.input.expectedVersion;
  };

  const refresh = async (token: number, intent: Intent) => {
    const result = await service.getActionDetail(caseId, actionId);
    if (!owns(token, intent)) return undefined;
    if (result.result === 'NOT_FOUND_OR_NOT_VISIBLE') {
      setDetail(undefined); setScreenState('unavailable'); invalidateProtectedContext();
      return undefined;
    }
    if (result.result === 'SUCCESS') { setDetail(result.data); setScreenState('ready'); return result.data; }
    return undefined;
  };

  const submit = async (intent: Intent) => {
    const token = lifecycle.current;
    try {
      const result = intent.family === 'ACCEPT_ACTION'
        ? await service.acceptAction(intent.input, intent.operationKey)
        : intent.family === 'DECLINE_ACTION'
          ? await service.declineAction(intent.input, intent.operationKey)
          : await service.startAction(intent.input, intent.operationKey);
      if (!owns(token, intent)) return;
      if (result.result === 'SUCCESS') {
        await synchronizeCommitted(token, intent);
      } else if (result.result === 'TEMPORARY_FAILURE') {
        setDecisionState(result.outcomeUncertain ? 'uncertain' : 'definitelyNotCommitted');
      } else if (result.result === 'IDEMPOTENCY_CONFLICT') setDecisionState('conflict');
      else if (result.result === 'NOT_FOUND_OR_NOT_VISIBLE') {
        setDetail(undefined); setScreenState('unavailable'); invalidateProtectedContext();
      } else {
        const current = await refresh(token, intent);
        if (current && owns(token, intent)) { setDecisionState('idle'); owner.current = undefined; }
      }
    } catch {
      if (owns(token, intent)) setDecisionState('uncertain');
    }
  };

  const synchronizeCommitted = async (token: number, intent: Intent) => {
    if (!owns(token, intent)) return;
    setDecisionState('committedPendingRefresh');
    const authoritative = await refresh(token, intent);
    if (authoritative && owns(token, intent)) {
      setDecisionState('idle'); owner.current = undefined; setConfirmDecline(false);
    }
  };

  const begin = (family: ActionOperation) => {
    if (!detail || owner.current) return;
    const requiredState = family === 'START_ACTION' ? 'ACCEPTED' : 'ASSIGNED';
    if (detail.lifecycleState !== requiredState || !detail.allowedOperations[family]) return;
    owner.current = { acquiring: true, family };
    try {
      const intent: Intent = {
        family,
        operationKey: `${family === 'ACCEPT_ACTION' ? 'accept-action' : family === 'DECLINE_ACTION' ? 'decline-action' : 'start-action'}:${globalThis.crypto.randomUUID()}`,
        input: { actionId: detail.actionId, expectedVersion: detail.expectedVersion }
      };
      owner.current = intent;
      setDecisionState('submitting');
      void submit(intent);
    } catch {
      owner.current = undefined;
    }
  };

  const lookup = async (retry: boolean) => {
    const intent = owner.current;
    if (!isIntent(intent) || lookupOwner.current) return;
    const token = lifecycle.current;
    lookupOwner.current = true; setLookupBusy(true);
    try {
      const status = await service.lookupOperationStatus(intent.operationKey);
      if (!owns(token, intent) || status.operationKey !== intent.operationKey) return;
      if (status.outcome === 'COMMITTED') { await synchronizeCommitted(token, intent); return; }
      applyLookupOutcome(status.outcome);
      if (retry && status.outcome === 'DEFINITELY_NOT_COMMITTED') {
        const current = await service.getActionDetail(caseId, actionId);
        if (!owns(token, intent)) return;
        if (current.result === 'NOT_FOUND_OR_NOT_VISIBLE') { setDetail(undefined); setScreenState('unavailable'); invalidateProtectedContext(); return; }
        if (current.result !== 'SUCCESS'
          || current.data.expectedVersion !== intent.input.expectedVersion
          || current.data.lifecycleState !== (intent.family === 'START_ACTION' ? 'ACCEPTED' : 'ASSIGNED')
          || !current.data.allowedOperations[intent.family]) {
          if (current.result === 'SUCCESS') setDetail(current.data);
          setDecisionState('idle'); owner.current = undefined; setConfirmDecline(false); return;
        }
        setDecisionState('submitting');
        await submit(intent);
      }
    } finally {
      if (token === lifecycle.current) { lookupOwner.current = false; setLookupBusy(false); }
    }
  };

  const retryCommittedRefresh = async () => {
    const intent = owner.current;
    if (!isIntent(intent) || lookupOwner.current) return;
    const token = lifecycle.current;
    lookupOwner.current = true; setLookupBusy(true);
    try { await synchronizeCommitted(token, intent); }
    finally {
      if (token === lifecycle.current) { lookupOwner.current = false; setLookupBusy(false); }
    }
  };

  const applyLookupOutcome = (outcome: OperationOutcome) => {
    if (outcome === 'DEFINITELY_NOT_COMMITTED') setDecisionState('definitelyNotCommitted');
    else if (outcome === 'IDEMPOTENCY_CONFLICT') setDecisionState('conflict');
    else setDecisionState('uncertain');
  };

  if (sessionState.status === 'checking') return <LoadingState label="正在確認登入狀態" />;
  if (sessionState.status === 'signedOut' || sessionState.status === 'recoverableError') return <Navigate to="/winwin/login" replace />;
  if (sessionState.status === 'unavailable' || screenState === 'unavailable') return <UnavailableState />;
  if (!detail) return <LoadingState label="處理事項" />;
  const busy = decisionState === 'submitting' || lookupBusy;
  const isStartIntent = owner.current?.family === 'START_ACTION';
  const mutationLabel = isStartIntent ? '開始處理狀態' : '接手狀態';
  const committedLabel = isStartIntent ? '開始處理' : '接手決定';

  return <article className="winwin-action-detail" aria-labelledby="action-detail-heading" aria-busy={busy}>
    <nav className="winwin-breadcrumbs" aria-label="頁面路徑"><Link to={`/winwin/cases/${caseId}`}>個案首頁</Link><span aria-hidden="true">/</span><span>處理事項</span></nav>
    <header className="winwin-page-heading"><p className="winwin-eyebrow">處理事項</p><h1 id="action-detail-heading">{detail.title}</h1><p><strong>{detail.stateDisplay}</strong></p></header>
    {detail.continuityGap && <section className="winwin-gap-banner" role="status" aria-labelledby="action-gap-heading"><h2 id="action-gap-heading">{detail.continuityGap.currentHolderDisplay}</h2><p>{detail.continuityGap.followUpDisplay}。系統不會自動指定其他人。</p></section>}
    <section className="winwin-summary-card" aria-labelledby="holder-heading"><h2 id="holder-heading">目前負責人</h2><p>{detail.currentHolderDisplay ?? '目前沒有人確定接手'}</p></section>
    <section className="winwin-summary-card" aria-labelledby="context-heading"><h2 id="context-heading">事項內容</h2><p>{detail.reason}</p>{detail.dueDisplay && <p>預計時間：{detail.dueDisplay}</p>}<p>來源：{detail.sourceCareUpdate.summary}</p><p>指派者：{detail.assignedByDisplay}・<time dateTime={detail.serverAssignedAt}>{detail.serverAssignedAt}</time></p></section>
    {decisionState === 'uncertain' && <div className="winwin-mutation-notice" role="alert"><p>目前無法確認是否已成功更新{mutationLabel}。系統不會自動再次送出。</p><button type="button" disabled={lookupBusy} onClick={() => void lookup(false)}>{lookupBusy ? '正在查詢…' : '查詢更新狀態'}</button></div>}
    {decisionState === 'definitelyNotCommitted' && <div className="winwin-mutation-notice" role="alert"><p>{mutationLabel}尚未更新。重新送出前會先確認目前負責狀態。</p><button type="button" disabled={lookupBusy} onClick={() => void lookup(true)}>{lookupBusy ? '正在確認…' : '確認目前狀態並重試'}</button></div>}
    {decisionState === 'conflict' && <p className="winwin-mutation-notice" role="alert">這次更新發生衝突，系統沒有再次送出。請重新整理後再決定。</p>}
    {decisionState === 'committedPendingRefresh' && <div className="winwin-mutation-notice" role="status"><p>變更已送出，但最新狀態尚未重新載入完成。系統不會再次送出{committedLabel}。</p><button type="button" disabled={lookupBusy} onClick={() => void retryCommittedRefresh()}>{lookupBusy ? '正在重新載入…' : '重新載入最新狀態'}</button></div>}
    {detail.lifecycleState === 'ASSIGNED' && (detail.allowedOperations.ACCEPT_ACTION || detail.allowedOperations.DECLINE_ACTION) && <section aria-labelledby="decision-heading"><h2 id="decision-heading">回應指派</h2><div className="winwin-page-actions">{detail.allowedOperations.ACCEPT_ACTION && <button className="winwin-primary-action" type="button" disabled={busy || decisionState !== 'idle'} onClick={() => begin('ACCEPT_ACTION')}>{decisionState === 'submitting' && owner.current?.family === 'ACCEPT_ACTION' ? '正在接受…' : '接受處理'}</button>}{detail.allowedOperations.DECLINE_ACTION && <button className="winwin-secondary-action" type="button" disabled={busy || decisionState !== 'idle'} onClick={() => setConfirmDecline(true)}>目前無法接手</button>}</div></section>}
    {confirmDecline && decisionState === 'idle' && <section className="winwin-confirmation" role="dialog" aria-modal="true" aria-labelledby="decline-title"><h2 id="decline-title">目前無法接手這項處理事項？</h2><p>送出後，這項處理事項會顯示目前沒有人確定接手，需要由有權限的人另外安排。系統不會自動指定其他人。</p><div className="winwin-page-actions"><button type="button" onClick={() => setConfirmDecline(false)}>返回</button><button className="winwin-secondary-action" type="button" onClick={() => begin('DECLINE_ACTION')}>確認目前無法接手</button></div></section>}
    {detail.lifecycleState === 'ACCEPTED' && detail.allowedOperations.START_ACTION && <section aria-labelledby="start-heading"><h2 id="start-heading">開始處理</h2><p>表示目前負責人已開始處理，不代表已完成或問題已解決。</p><div className="winwin-page-actions"><button className="winwin-primary-action" type="button" disabled={busy || decisionState !== 'idle'} onClick={() => begin('START_ACTION')}>{decisionState === 'submitting' && isStartIntent ? '正在開始…' : '開始處理'}</button></div></section>}
    <section className="winwin-summary-card" aria-labelledby="history-heading"><h2 id="history-heading">負責與處理紀錄</h2><ol className="winwin-responsibility-history">{detail.responsibilityHistory.map((entry) => <li key={entry.historyId}><strong>{entry.milestoneDisplay}</strong>{entry.personDisplay && <span>・{entry.personDisplay}</span>}<br /><time dateTime={entry.serverRecordedAt}>{entry.serverRecordedAt}</time><span className="winwin-visually-readable">（{entry.relevance === 'CURRENT' ? '目前紀錄' : '歷史紀錄'}）</span></li>)}</ol></section>
  </article>;
}
