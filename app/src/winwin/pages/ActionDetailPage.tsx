import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FormField } from '../components/FormField';
import { ContinuityGapBanner } from '../components/ContinuityGapBanner';
import { LoadingState, UnavailableState } from '../components/SafetyStates';
import type { ActionDetailView, ActionMutationInput, CompleteActionInput, EligibleReassignmentCandidateView, OperationKey, OperationOutcome } from '../contracts/frontendContract';
import type { ResponsibilityRecoveryService } from '../contracts/verticalSliceService';
import { useWinWinApp } from '../state/WinWinAppProvider';

type ActionOperation = 'ACCEPT_ACTION' | 'DECLINE_ACTION' | 'START_ACTION' | 'COMPLETE_ACTION';
type DecisionState = 'idle' | 'submitting' | 'uncertain' | 'definitelyNotCommitted' | 'conflict' | 'committedPendingRefresh';
type Intent = Readonly<{ family: ActionOperation; operationKey: OperationKey; input: ActionMutationInput | CompleteActionInput }>;
type DecisionOwner = Intent | Readonly<{ acquiring: true; family: ActionOperation }>;
type CandidateState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

function supportsRecovery(service: object): service is ResponsibilityRecoveryService {
  return 'getEligibleReassignmentCandidates' in service
    && typeof service.getEligibleReassignmentCandidates === 'function';
}

function isIntent(owner: DecisionOwner | undefined): owner is Intent {
  return Boolean(owner && 'operationKey' in owner);
}

export function ActionDetailPage({ caseId, actionId }: Readonly<{ caseId: string; actionId: string }>) {
  const { service, sessionState, contextGeneration, invalidateProtectedContext } = useWinWinApp();
  const [detail, setDetail] = useState<ActionDetailView>();
  const [screenState, setScreenState] = useState<'loading' | 'ready' | 'recoverable' | 'unavailable'>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [decisionState, setDecisionState] = useState<DecisionState>('idle');
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [completionResult, setCompletionResult] = useState('');
  const [completionError, setCompletionError] = useState<string>();
  const [lookupBusy, setLookupBusy] = useState(false);
  const [candidateState, setCandidateState] = useState<CandidateState>('idle');
  const [candidates, setCandidates] = useState<readonly EligibleReassignmentCandidateView[]>([]);
  const [selectedCandidateRef, setSelectedCandidateRef] = useState('');
  const [confirmRecovery, setConfirmRecovery] = useState(false);
  const [confirmedRecoveryIntent, setConfirmedRecoveryIntent] = useState(false);
  const lifecycle = useRef(0);
  const owner = useRef<DecisionOwner | undefined>(undefined);
  const lookupOwner = useRef(false);
  const declineInvokerRef = useRef<HTMLButtonElement>(null);
  const declineCancelRef = useRef<HTMLButtonElement>(null);
  const declineConfirmRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const recoveryInvokerRef = useRef<HTMLButtonElement>(null);
  const recoveryHeadingRef = useRef<HTMLHeadingElement>(null);
  const recoveryReviewRef = useRef<HTMLButtonElement>(null);
  const recoveryCancelRef = useRef<HTMLButtonElement>(null);
  const confirmationWasOpen = useRef(false);
  const recoveryWasCancelled = useRef(false);
  const focusUpdatedStatus = useRef(false);

  useEffect(() => {
    const token = ++lifecycle.current;
    focusUpdatedStatus.current = false;
    owner.current = undefined;
    lookupOwner.current = false;
    setLookupBusy(false);
    setDecisionState('idle');
    setConfirmDecline(false);
    setCompletionResult('');
    setCompletionError(undefined);
    setCandidateState('idle'); setCandidates([]); setSelectedCandidateRef('');
    setConfirmRecovery(false); setConfirmedRecoveryIntent(false);
    setDetail(undefined);
    setScreenState('loading');
    if (sessionState.status !== 'signedIn') return () => { lifecycle.current++; };
    void service.getActionDetail(caseId, actionId).then((result) => {
      if (token !== lifecycle.current) return;
      if (result.result === 'SUCCESS') { setDetail(result.data); setScreenState('ready'); return; }
      if (result.result === 'NOT_FOUND_OR_NOT_VISIBLE') {
        setScreenState('unavailable'); invalidateProtectedContext(); return;
      }
      setScreenState('recoverable');
    }).catch(() => {
      if (token !== lifecycle.current) return;
      setScreenState('recoverable');
    });
    return () => { lifecycle.current++; owner.current = undefined; lookupOwner.current = false; focusUpdatedStatus.current = false; };
  }, [service, sessionState.status, contextGeneration, caseId, actionId, loadAttempt, invalidateProtectedContext]);

  useEffect(() => {
    if (confirmDecline) declineCancelRef.current?.focus();
    else declineInvokerRef.current?.focus();
  }, [confirmDecline]);

  useEffect(() => {
    if (focusUpdatedStatus.current && detail) {
      focusUpdatedStatus.current = false;
      statusRef.current?.focus();
    }
  }, [detail]);

  useEffect(() => {
    if (confirmRecovery) {
      confirmationWasOpen.current = true;
      recoveryCancelRef.current?.focus();
    } else if (confirmationWasOpen.current) {
      confirmationWasOpen.current = false;
      recoveryReviewRef.current?.focus();
    } else if (candidateState === 'ready') {
      recoveryHeadingRef.current?.focus();
    } else if (candidateState === 'idle' && recoveryWasCancelled.current) {
      recoveryWasCancelled.current = false;
      recoveryInvokerRef.current?.focus();
    }
  }, [confirmRecovery, candidateState]);

  const openRecovery = async () => {
    if (!detail?.continuityGap || !detail.allowedOperations.ACTION_REASSIGN || !supportsRecovery(service)) return;
    const token = lifecycle.current;
    const expectedVersion = detail.expectedVersion;
    setCandidateState('loading'); setCandidates([]); setSelectedCandidateRef(''); setConfirmedRecoveryIntent(false);
    try {
      const result = await service.getEligibleReassignmentCandidates(detail.actionId);
      if (token !== lifecycle.current || detail.expectedVersion !== expectedVersion) return;
      if (result.result === 'SUCCESS') {
        setCandidates(result.data); setCandidateState(result.data.length ? 'ready' : 'empty');
      } else if (result.result === 'EMPTY') setCandidateState('empty');
      else if (result.result === 'NOT_FOUND_OR_NOT_VISIBLE') {
        setCandidates([]); setCandidateState('idle'); setDetail(undefined); setScreenState('unavailable'); invalidateProtectedContext();
      } else setCandidateState('error');
    } catch { if (token === lifecycle.current) setCandidateState('error'); }
  };

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
          : intent.family === 'START_ACTION'
            ? await service.startAction(intent.input, intent.operationKey)
            : await service.completeAction(intent.input as CompleteActionInput, intent.operationKey);
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
    focusUpdatedStatus.current = true;
    const authoritative = await refresh(token, intent);
    if (authoritative && owns(token, intent)) {
      setDecisionState('idle'); owner.current = undefined; setConfirmDecline(false); setCompletionResult(''); setCompletionError(undefined);
    } else {
      focusUpdatedStatus.current = false;
    }
  };

  const begin = (family: ActionOperation, submittedResult?: string) => {
    if (!detail || owner.current) return;
    const requiredState = family === 'START_ACTION' ? 'ACCEPTED' : family === 'COMPLETE_ACTION' ? 'IN_PROGRESS' : 'ASSIGNED';
    if (detail.lifecycleState !== requiredState || !detail.allowedOperations[family]) return;
    if (family === 'COMPLETE_ACTION' && (!submittedResult || submittedResult.length > 300)) {
      setCompletionError(!submittedResult ? '請填寫處理摘要。' : '處理摘要最多 300 個字。');
      document.getElementById('completionResult')?.focus();
      return;
    }
    owner.current = { acquiring: true, family };
    try {
      const operationPrefix = family === 'ACCEPT_ACTION' ? 'accept-action'
        : family === 'DECLINE_ACTION' ? 'decline-action'
          : family === 'START_ACTION' ? 'start-action' : 'complete-action';
      const intent: Intent = {
        family,
        operationKey: `${operationPrefix}:${globalThis.crypto.randomUUID()}`,
        input: family === 'COMPLETE_ACTION'
          ? { actionId: detail.actionId, expectedVersion: detail.expectedVersion, result: submittedResult! }
          : { actionId: detail.actionId, expectedVersion: detail.expectedVersion }
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
          || current.data.lifecycleState !== (intent.family === 'START_ACTION' ? 'ACCEPTED' : intent.family === 'COMPLETE_ACTION' ? 'IN_PROGRESS' : 'ASSIGNED')
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
  if (screenState === 'recoverable') return <section className="winwin-state-card" role="alert"><h1>處理事項</h1><p>目前無法載入最新處理事項，請稍後再試。</p><button className="winwin-primary-action" type="button" onClick={() => setLoadAttempt((value) => value + 1)}>重新載入</button></section>;
  if (!detail) return <LoadingState label="處理事項" />;
  const busy = decisionState === 'submitting' || lookupBusy;
  const isStartIntent = owner.current?.family === 'START_ACTION';
  const isCompleteIntent = owner.current?.family === 'COMPLETE_ACTION';
  const mutationLabel = isCompleteIntent ? '完成處理狀態' : isStartIntent ? '開始處理狀態' : '接手狀態';
  const committedLabel = isCompleteIntent ? '完成處理' : isStartIntent ? '開始處理' : '接手決定';

  return <article className="winwin-action-detail" aria-labelledby="action-detail-heading" aria-busy={busy}>
    <nav className="winwin-breadcrumbs" aria-label="頁面路徑"><Link to={`/winwin/cases/${caseId}`}>個案首頁</Link><span aria-hidden="true">/</span><span>處理事項</span></nav>
    <header className="winwin-page-heading"><p className="winwin-eyebrow">處理事項</p><h1 id="action-detail-heading">{detail.title}</h1><p ref={statusRef} tabIndex={-1} role="status" aria-live="polite"><strong>{detail.stateDisplay}</strong></p></header>
    {detail.continuityGap && <ContinuityGapBanner gap={detail.continuityGap} caseId={caseId} headingId="action-gap-heading" />}
    {detail.continuityGap && detail.allowedOperations.ACTION_REASSIGN && <section className="winwin-recovery" aria-labelledby="recovery-heading">
      <h2 id="recovery-heading">重新安排接手者</h2>
      <p>你可以選擇一位目前可被詢問的協作者；出現在名單中不代表對方已同意或一定能接手。</p>
      {candidateState === 'idle' && <button ref={recoveryInvokerRef} className="winwin-primary-action" type="button" onClick={() => void openRecovery()}>重新安排接手者</button>}
      {candidateState === 'loading' && <p role="status" aria-live="polite">正在載入可詢問的人…</p>}
      {candidateState === 'empty' && <div role="status"><p>目前沒有可重新詢問的接手者。</p><p>這項照顧目前仍沒有人確定接手。</p></div>}
      {candidateState === 'error' && <div role="alert"><p>目前無法載入可詢問的人，尚未進行任何安排。</p><button type="button" onClick={() => void openRecovery()}>重新載入名單</button></div>}
      {candidateState === 'ready' && <div>
        <h3 ref={recoveryHeadingRef} tabIndex={-1}>選擇要詢問的人</h3>
        <fieldset className="winwin-candidate-list"><legend>請選擇一位協作者</legend>{candidates.map((candidate) => <label key={candidate.candidateRef} className="winwin-candidate-option"><input type="radio" name="reassignment-candidate" value={candidate.candidateRef} checked={selectedCandidateRef === candidate.candidateRef} onChange={() => { setSelectedCandidateRef(candidate.candidateRef); setConfirmedRecoveryIntent(false); }} /><span><strong>{candidate.displayName}</strong>{candidate.relationshipDisplay && <small>{candidate.relationshipDisplay}</small>}{candidate.serviceValidityDisplay && <small>{candidate.serviceValidityDisplay}</small>}{candidate.priorDeclineHint && <small>{candidate.priorDeclineHint}</small>}</span></label>)}</fieldset>
        <div className="winwin-page-actions"><button ref={recoveryReviewRef} className="winwin-primary-action" type="button" disabled={!selectedCandidateRef} onClick={() => setConfirmRecovery(true)}>檢視並確認</button><button type="button" onClick={() => { recoveryWasCancelled.current = true; setCandidateState('idle'); setCandidates([]); setSelectedCandidateRef(''); }}>取消</button></div>
      </div>}
      {confirmedRecoveryIntent && <p role="status">已確認要詢問所選協作者；尚未送出安排。</p>}
    </section>}
    {confirmRecovery && (() => { const selected = candidates.find(({ candidateRef }) => candidateRef === selectedCandidateRef); return selected ? <section className="winwin-confirmation" role="dialog" aria-modal="true" aria-labelledby="recovery-confirm-title" aria-describedby="recovery-confirm-description" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); setConfirmRecovery(false); } }}><h2 id="recovery-confirm-title">確認要詢問的人</h2><p id="recovery-confirm-description">你將請「{selected.displayName}」確認是否接手這項處理。這不代表對方已接手，也不代表目前已有確定接手者。</p><div className="winwin-page-actions"><button ref={recoveryCancelRef} type="button" onClick={() => setConfirmRecovery(false)}>返回選擇</button><button className="winwin-primary-action" type="button" onClick={() => { setConfirmRecovery(false); setConfirmedRecoveryIntent(true); }}>確認詢問意願</button></div></section> : null; })()}
    <section className="winwin-summary-card" aria-labelledby="holder-heading"><h2 id="holder-heading">目前負責人</h2><p>{detail.currentHolderDisplay ?? '目前沒有人確定接手'}</p></section>
    <section className="winwin-summary-card" aria-labelledby="context-heading"><h2 id="context-heading">事項內容</h2><p>{detail.reason}</p>{detail.dueDisplay && <p>預計時間：{detail.dueDisplay}</p>}<p>來源：{detail.sourceCareUpdate.summary}</p><p>指派者：{detail.assignedByDisplay}・<time dateTime={detail.serverAssignedAt}>{detail.serverAssignedAt}</time></p></section>
    {decisionState === 'uncertain' && <div className="winwin-mutation-notice" role="alert"><p>目前無法確認是否已成功更新{mutationLabel}。系統不會自動再次送出。</p><button type="button" disabled={lookupBusy} onClick={() => void lookup(false)}>{lookupBusy ? '正在查詢…' : '查詢更新狀態'}</button></div>}
    {decisionState === 'definitelyNotCommitted' && <div className="winwin-mutation-notice" role="alert"><p>{mutationLabel}尚未更新。重新送出前會先確認目前負責狀態。</p><button type="button" disabled={lookupBusy} onClick={() => void lookup(true)}>{lookupBusy ? '正在確認…' : '確認目前狀態並重試'}</button></div>}
    {decisionState === 'conflict' && <p className="winwin-mutation-notice" role="alert">這次更新發生衝突，系統沒有再次送出。請重新整理後再決定。</p>}
    {decisionState === 'committedPendingRefresh' && <div className="winwin-mutation-notice" role="status"><p>變更已送出，但最新狀態尚未重新載入完成。系統不會再次送出{committedLabel}。</p><button type="button" disabled={lookupBusy} onClick={() => void retryCommittedRefresh()}>{lookupBusy ? '正在重新載入…' : '重新載入最新狀態'}</button></div>}
    {detail.lifecycleState === 'ASSIGNED' && (detail.allowedOperations.ACCEPT_ACTION || detail.allowedOperations.DECLINE_ACTION) && <section aria-labelledby="decision-heading"><h2 id="decision-heading">回應指派</h2><div className="winwin-page-actions">{detail.allowedOperations.ACCEPT_ACTION && <button className="winwin-primary-action" type="button" disabled={busy || decisionState !== 'idle'} onClick={() => begin('ACCEPT_ACTION')}>{decisionState === 'submitting' && owner.current?.family === 'ACCEPT_ACTION' ? '正在接受…' : '接受處理'}</button>}{detail.allowedOperations.DECLINE_ACTION && <button ref={declineInvokerRef} className="winwin-secondary-action" type="button" disabled={busy || decisionState !== 'idle'} onClick={() => setConfirmDecline(true)}>目前無法接手</button>}</div></section>}
    {confirmDecline && decisionState === 'idle' && <section className="winwin-confirmation" role="dialog" aria-modal="true" aria-labelledby="decline-title" aria-describedby="decline-description" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); setConfirmDecline(false); return; } if (event.key !== 'Tab') return; const first = declineCancelRef.current; const last = declineConfirmRef.current; if (!first || !last) return; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }}><h2 id="decline-title">目前無法接手這項處理事項？</h2><p id="decline-description">送出後，這項處理事項會顯示目前沒有人確定接手，需要由有權限的人另外安排。系統不會自動指定其他人。</p><div className="winwin-page-actions"><button ref={declineCancelRef} type="button" onClick={() => setConfirmDecline(false)}>返回</button><button ref={declineConfirmRef} className="winwin-secondary-action" type="button" onClick={() => begin('DECLINE_ACTION')}>確認目前無法接手</button></div></section>}
    {detail.lifecycleState === 'ACCEPTED' && detail.allowedOperations.START_ACTION && <section aria-labelledby="start-heading"><h2 id="start-heading">開始處理</h2><p>表示目前負責人已開始處理，不代表已完成或問題已解決。</p><div className="winwin-page-actions"><button className="winwin-primary-action" type="button" disabled={busy || decisionState !== 'idle'} onClick={() => begin('START_ACTION')}>{decisionState === 'submitting' && isStartIntent ? '正在開始…' : '開始處理'}</button></div></section>}
    {detail.lifecycleState === 'IN_PROGRESS' && detail.allowedOperations.COMPLETE_ACTION && <section aria-labelledby="complete-heading"><h2 id="complete-heading">完成這項處理事項</h2><p>完成處理只表示這項處理事項已標示完成，不代表整體照顧問題已解決。</p><form onSubmit={(event) => { event.preventDefault(); begin('COMPLETE_ACTION', completionResult); }} noValidate><FormField id="completionResult" label="處理摘要" required help="請簡短記錄這次做了什麼，共 1–300 個字；這不是照顧成效或健康結果的判定。" error={completionError}><textarea id="completionResult" required maxLength={300} disabled={busy || decisionState !== 'idle'} value={completionResult} aria-invalid={Boolean(completionError)} aria-describedby={`completionResult-help${completionError ? ' completionResult-error' : ''}`} onChange={(event) => { setCompletionResult(event.target.value); setCompletionError(undefined); }} /></FormField><div className="winwin-form-actions"><button className="winwin-primary-action" type="submit" disabled={busy || decisionState !== 'idle'}>{decisionState === 'submitting' && isCompleteIntent ? '正在完成…' : '標示處理完成'}</button></div></form></section>}
    {detail.lifecycleState === 'COMPLETED' && detail.completionResult && <section className="winwin-summary-card" aria-labelledby="completion-summary-heading"><h2 id="completion-summary-heading">處理摘要</h2><p>{detail.completionResult}</p>{detail.serverCompletedAt && <p>完成時間：<time dateTime={detail.serverCompletedAt}>{detail.serverCompletedAt}</time></p>}<p>此狀態只表示處理事項工作流程已完成，不代表整體照顧問題已解決。</p></section>}
    <section className="winwin-summary-card" aria-labelledby="history-heading"><h2 id="history-heading">負責與處理紀錄</h2><ol className="winwin-responsibility-history">{detail.responsibilityHistory.map((entry) => <li key={entry.historyId}><strong>{entry.milestoneDisplay}</strong>{entry.personDisplay && <span>・{entry.personDisplay}</span>}<br /><time dateTime={entry.serverRecordedAt}>{entry.serverRecordedAt}</time><span className="winwin-visually-readable">（{entry.relevance === 'CURRENT' ? '目前紀錄' : '歷史紀錄'}）</span></li>)}</ol></section>
  </article>;
}
