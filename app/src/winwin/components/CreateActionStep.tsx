import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import type {
  ActionDetailView,
  CreateActionInput,
  EligibleAssigneeView,
  OperationStatusView
} from '../contracts/frontendContract';
import { reduceMutation, type MutationIntent, type MutationState } from '../safety/safetyState';
import { useWinWinApp } from '../state/WinWinAppProvider';
import { FormField } from './FormField';

type Source = Readonly<{ careUpdateId: string; versionId: string; summary: string }>;
type CandidateState = 'closed' | 'loading' | 'ready' | 'empty' | 'error' | 'unavailable';

export function CreateActionStep({ caseId, source }: Readonly<{ caseId: string; source: Source }>) {
  const { service, contextGeneration, invalidateProtectedContext } = useWinWinApp();
  const [candidateState, setCandidateState] = useState<CandidateState>('closed');
  const [candidates, setCandidates] = useState<readonly EligibleAssigneeView[]>([]);
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assignee, setAssignee] = useState('');
  const [errors, setErrors] = useState<Readonly<{ title?: string; reason?: string; assignee?: string }>>({});
  const [targetStale, setTargetStale] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [mutation, dispatch] = useReducer(
    reduceMutation<ActionDetailView>,
    { status: 'idle' } as MutationState<ActionDetailView>
  );
  const lifecycle = useRef(0);
  const loadGeneration = useRef(0);
  const lookupGeneration = useRef(0);
  const lookupInFlight = useRef(false);
  const submissionOwner = useRef<MutationIntent | undefined>(undefined);
  const intentRef = useRef<MutationIntent | undefined>(undefined);
  const inputRef = useRef<CreateActionInput | undefined>(undefined);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    lifecycle.current++;
    submissionOwner.current = undefined;
    intentRef.current = undefined;
    inputRef.current = undefined;
    lookupGeneration.current++;
    lookupInFlight.current = false;
    setLookupBusy(false);
    setCandidateState('closed');
    setCandidates([]);
    setTitle('');
    setReason('');
    setDueAt('');
    setAssignee('');
    setErrors({});
    setTargetStale(false);
    dispatch({ type: 'RESET' });
    return () => {
      lifecycle.current++;
      lookupGeneration.current++;
      lookupInFlight.current = false;
      submissionOwner.current = undefined;
    };
  }, [caseId, source.versionId, contextGeneration]);

  const loadCandidates = async () => {
    const lifecycleToken = lifecycle.current;
    const request = ++loadGeneration.current;
    setCandidateState('loading');
    let result;
    try {
      result = await service.getEligibleActionAssignees(caseId, source.versionId);
    } catch {
      if (lifecycleToken === lifecycle.current && request === loadGeneration.current) setCandidateState('error');
      return undefined;
    }
    if (lifecycleToken !== lifecycle.current || request !== loadGeneration.current) return undefined;
    if (result.result === 'NOT_FOUND_OR_NOT_VISIBLE') {
      setCandidateState('unavailable'); invalidateProtectedContext(); return undefined;
    }
    if (result.result === 'SUCCESS') {
      setCandidates(result.data);
      setCandidateState(result.data.length ? 'ready' : 'empty');
      return result.data;
    }
    if (result.result === 'EMPTY') { setCandidates([]); setCandidateState('empty'); return []; }
    setCandidateState('error');
    return undefined;
  };

  const isCurrent = (token: number, intent: MutationIntent) => token === lifecycle.current
    && intentRef.current?.operationKey === intent.operationKey
    && intentRef.current.requestFingerprint === intent.requestFingerprint;

  const refreshAction = async (token: number, intent: MutationIntent, action: ActionDetailView) => {
    let result;
    try { result = await service.getActionDetail(caseId, action.actionId); }
    catch { return undefined; }
    if (!isCurrent(token, intent)) return undefined;
    if (result.result === 'NOT_FOUND_OR_NOT_VISIBLE') {
      setCandidateState('unavailable'); invalidateProtectedContext(); return undefined;
    }
    return result.result === 'SUCCESS' ? result.data : undefined;
  };

  const submitIntent = async (intent: MutationIntent, input: CreateActionInput) => {
    const token = lifecycle.current;
    try {
      const result = await service.createAction(input, intent.operationKey);
      if (!isCurrent(token, intent)) return;
      if (result.result === 'SUCCESS') {
        const authoritative = await refreshAction(token, intent, result.data);
        if (authoritative && isCurrent(token, intent)) dispatch({ type: 'SUBMISSION_COMMITTED', data: authoritative });
      } else if (result.result === 'TEMPORARY_FAILURE') {
        dispatch({ type: result.outcomeUncertain ? 'SUBMISSION_UNCERTAIN' : 'SUBMISSION_DEFINITELY_NOT_COMMITTED' });
      } else if (result.result === 'IDEMPOTENCY_CONFLICT') {
        dispatch({ type: 'SUBMISSION_CONFLICT' });
      } else if (result.result === 'TARGET_INELIGIBLE') {
        dispatch({ type: 'SUBMISSION_RECOVERABLE_FAILURE' });
        setTargetStale(true);
        const latest = await loadCandidates();
        if (isCurrent(token, intent)) {
          if (latest && !latest.some((candidate) => candidate.candidateRef === input.assigneeCandidateRef)) setAssignee('');
          submissionOwner.current = undefined;
        }
      } else if (result.result === 'NOT_FOUND_OR_NOT_VISIBLE') {
        setCandidateState('unavailable'); invalidateProtectedContext();
      } else {
        dispatch({ type: 'SUBMISSION_RECOVERABLE_FAILURE' });
        submissionOwner.current = undefined;
      }
    } catch {
      if (isCurrent(token, intent)) dispatch({ type: 'SUBMISSION_UNCERTAIN' });
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      title: title.trim() ? undefined : '請填寫要處理的事項',
      reason: reason.trim() ? undefined : '請說明需要處理的原因',
      assignee: assignee ? undefined : '請明確選擇一位協作者'
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      const first = (['title', 'reason', 'assignee'] as const).find((name) => next[name]);
      if (first) document.getElementById(`action-${first}-${source.versionId}`)?.focus();
      return;
    }
    if (submissionOwner.current) return;
    const input: CreateActionInput = {
      caseId, sourceVersionId: source.versionId, title: title.trim(), reason: reason.trim(),
      assigneeCandidateRef: assignee, dueAt: dueAt || undefined
    };
    const intent: MutationIntent = {
      family: 'CREATE_ACTION', operationKey: `create-action:${globalThis.crypto.randomUUID()}`,
      requestFingerprint: JSON.stringify(input)
    };
    submissionOwner.current = intent;
    intentRef.current = intent; inputRef.current = input;
    dispatch({ type: 'BEGIN', intent });
    void submitIntent(intent, input);
  };

  useEffect(() => {
    if (mutation.status === 'committed') successHeadingRef.current?.focus();
  }, [mutation.status]);

  const lookup = async (retry = false) => {
    if (lookupInFlight.current) return;
    const intent = intentRef.current; const input = inputRef.current;
    if (!intent || !input) return;
    const token = lifecycle.current; const lookupAttempt = ++lookupGeneration.current;
    lookupInFlight.current = true; setLookupBusy(true);
    const owns = () => lookupInFlight.current && lookupGeneration.current === lookupAttempt && isCurrent(token, intent);
    try {
      const status: OperationStatusView = await service.lookupOperationStatus(intent.operationKey);
      if (!owns() || status.operationKey !== intent.operationKey) return;
      if (status.outcome === 'COMMITTED' && status.authoritativeResult && 'actionId' in status.authoritativeResult) {
        const authoritative = await refreshAction(token, intent, status.authoritativeResult);
        if (authoritative && owns()) dispatch({ type: 'LOOKUP_RESOLVED', outcome: 'COMMITTED', data: authoritative });
        return;
      }
      dispatch({ type: 'LOOKUP_RESOLVED', outcome: status.outcome });
      if (retry && status.outcome === 'DEFINITELY_NOT_COMMITTED') {
        const timeline = await service.getTimeline(caseId);
        if (!owns()) return;
        if (timeline.result === 'NOT_FOUND_OR_NOT_VISIBLE') { setCandidateState('unavailable'); invalidateProtectedContext(); return; }
        const currentSource = timeline.result === 'SUCCESS'
          ? timeline.data.mergedCareUpdates.find((item) => item.versionId === source.versionId)
          : undefined;
        if (!currentSource?.allowedOperations.CREATE_ACTION) { setCandidateState('unavailable'); return; }
        const latest = await loadCandidates();
        if (!owns() || !latest) return;
        if (!latest.some((candidate) => candidate.candidateRef === input.assigneeCandidateRef)) {
          setAssignee(''); setTargetStale(true); dispatch({ type: 'SUBMISSION_RECOVERABLE_FAILURE' }); return;
        }
        dispatch({ type: 'RETRY_SAME_INTENT', intent, revalidated: true });
        await submitIntent(intent, input);
      }
    } finally {
      if (lookupGeneration.current === lookupAttempt) { lookupInFlight.current = false; setLookupBusy(false); }
    }
  };

  if (candidateState === 'closed') return <button className="winwin-primary-action" type="button" onClick={() => void loadCandidates()}>建立處理事項</button>;
  if (candidateState === 'loading') return <p role="status" aria-busy="true">正在載入可指派的協作者…</p>;
  if (candidateState === 'unavailable') return <p role="alert">目前無法使用此內容</p>;
  if (candidateState === 'error') return <div role="alert"><p>可指派的協作者暫時無法載入。</p><button type="button" onClick={() => void loadCandidates()}>重新載入</button></div>;
  if (candidateState === 'empty') return <p role="status">目前沒有可指派的協作者</p>;
  if (mutation.status === 'committed') {
    const action = mutation.data;
    return <section className="winwin-action-result" role="status" aria-labelledby={`action-${action.actionId}`}>
      <p className="winwin-eyebrow">處理事項</p><h3 ref={successHeadingRef} id={`action-${action.actionId}`} tabIndex={-1}>{action.title}</h3>
      <p><strong>{action.stateDisplay}</strong>・已指派給 {action.currentHolderDisplay}，等待接手確認</p>
      <p>來源：{action.sourceCareUpdate.summary}</p><p>{action.reason}</p>
      {action.dueDisplay && <p>預計時間：{action.dueDisplay}</p>}
      <p>指派者：{action.assignedByDisplay}・<time dateTime={action.serverAssignedAt}>{action.serverAssignedAt}</time></p>
    </section>;
  }
  const locked = mutation.status !== 'idle' && mutation.status !== 'recoverableFailure';
  return <section className="winwin-create-action" aria-labelledby={`create-action-${source.versionId}`}>
    <h3 id={`create-action-${source.versionId}`}>建立處理事項</h3>
    <p>從這筆照顧變化建立一項具體工作，並明確選擇一位協作者。</p>
    {mutation.status === 'uncertain' && <div role="alert" aria-busy={lookupBusy}><p>尚未確認是否已建立並指派。請先查詢狀態，不要再次送出。</p><button type="button" disabled={lookupBusy} onClick={() => void lookup()}>{lookupBusy ? '正在查詢…' : '查詢建立狀態'}</button></div>}
    {mutation.status === 'definitelyNotCommitted' && <div role="alert" aria-busy={lookupBusy}><p>處理事項與指派尚未建立，內容已保留。</p><button type="button" disabled={lookupBusy} onClick={() => void lookup(true)}>{lookupBusy ? '正在確認並重試…' : '確認狀態並重試'}</button></div>}
    {mutation.status === 'conflict' && <p role="alert">這次建立無法安全完成，系統沒有再次送出。</p>}
    {targetStale && <p id="assignee-stale" role="alert">這位協作者目前無法被指派，請重新選擇。</p>}
    <form onSubmit={submit} noValidate aria-busy={mutation.status === 'submitting' || lookupBusy}>
      <div className="winwin-fixed-source"><strong>來源照顧變化</strong><p>{source.summary}</p><small>已固定目前可見版本</small></div>
      <FormField id={`action-title-${source.versionId}`} label="要處理的事項" required error={errors.title}><input id={`action-title-${source.versionId}`} maxLength={200} required disabled={locked} value={title} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? `action-title-${source.versionId}-error` : undefined} onChange={(event) => setTitle(event.target.value)} /></FormField>
      <FormField id={`action-reason-${source.versionId}`} label="需要處理的原因" required error={errors.reason}><textarea id={`action-reason-${source.versionId}`} maxLength={1000} required disabled={locked} value={reason} aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? `action-reason-${source.versionId}-error` : undefined} onChange={(event) => setReason(event.target.value)} /></FormField>
      <FormField id={`action-assignee-${source.versionId}`} label="指派給" required error={errors.assignee}><select id={`action-assignee-${source.versionId}`} required disabled={locked} value={assignee} aria-invalid={Boolean(errors.assignee)} aria-describedby={errors.assignee ? `action-assignee-${source.versionId}-error` : undefined} onChange={(event) => { setAssignee(event.target.value); setTargetStale(false); }}><option value="">請明確選擇一位協作者</option>{candidates.map((candidate) => <option key={candidate.candidateRef} value={candidate.candidateRef}>{candidate.displayName}{candidate.relationshipDisplay ? `・${candidate.relationshipDisplay}` : ''}{candidate.serviceValidityDisplay ? `・${candidate.serviceValidityDisplay}` : ''}</option>)}</select></FormField>
      <FormField id={`action-due-${source.versionId}`} label="預計完成日期與時間（選填）"><input id={`action-due-${source.versionId}`} type="datetime-local" disabled={locked} value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></FormField>
      <button className="winwin-primary-action" type="submit" disabled={locked}>{mutation.status === 'submitting' ? '建立並指派中…' : '建立並指派'}</button>
    </form>
  </section>;
}
