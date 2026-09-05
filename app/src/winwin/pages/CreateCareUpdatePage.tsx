import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FormField } from '../components/FormField';
import { CreateActionStep } from '../components/CreateActionStep';
import { LoadingState, UnavailableState } from '../components/SafetyStates';
import type {
  CareUpdateDetailView,
  CareUpdateVisibility,
  CreateCareUpdateInput,
  OperationStatusView,
  TimePrecision
} from '../contracts/frontendContract';
import {
  reduceMutation,
  type MutationIntent,
  type MutationState
} from '../safety/safetyState';
import { useWinWinApp } from '../state/WinWinAppProvider';

type Draft = Readonly<{
  category: string;
  content: string;
  source: string;
  occurredDate: string;
  occurredTime: string;
  timePrecision: '' | TimePrecision;
  visibility: '' | CareUpdateVisibility;
  additionalContext: string;
}>;

const EMPTY_DRAFT: Draft = {
  category: '', content: '', source: '', occurredDate: '', occurredTime: '',
  timePrecision: '', visibility: '', additionalContext: ''
};

type Errors = Partial<Record<keyof Draft, string>>;

function validate(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.category) errors.category = '請選擇照顧變化類別';
  if (!draft.content.trim()) errors.content = '請填寫照顧情況的變化';
  else if (draft.content.trim().length > 1000) errors.content = '內容不可超過 1000 個字';
  if (!draft.source.trim()) errors.source = '請填寫資訊來源';
  if (!draft.occurredDate) errors.occurredDate = '請選擇發生日期';
  if (!draft.timePrecision) errors.timePrecision = '請選擇時間精確度';
  if (draft.timePrecision === 'EXACT' && !draft.occurredTime) errors.occurredTime = '精確時間需要填寫發生時間';
  if (!draft.visibility) errors.visibility = '請明確選擇可見範圍';
  if (draft.additionalContext.length > 500) errors.additionalContext = '補充內容不可超過 500 個字';
  return errors;
}

function inputFrom(caseId: string, draft: Draft): CreateCareUpdateInput {
  return {
    caseId,
    category: draft.category,
    content: draft.content.trim(),
    source: draft.source.trim(),
    occurredDate: draft.occurredDate,
    occurredTime: draft.timePrecision === 'EXACT' ? draft.occurredTime : undefined,
    timePrecision: draft.timePrecision as TimePrecision,
    visibility: draft.visibility as CareUpdateVisibility,
    additionalContext: draft.additionalContext.trim() || undefined
  };
}

function fingerprint(input: CreateCareUpdateInput) {
  return JSON.stringify(input);
}

function newOperationKey() {
  return `care-update:${globalThis.crypto.randomUUID()}`;
}

export function CreateCareUpdatePage({ caseId }: Readonly<{ caseId: string }>) {
  const { service, sessionState, contextGeneration, invalidateProtectedContext } = useWinWinApp();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Errors>({});
  const [screenState, setScreenState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [visibilityOptions, setVisibilityOptions] = useState<readonly Readonly<{ value: CareUpdateVisibility; label: string; description: string }>[]>([]);
  const [refreshWarning, setRefreshWarning] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [mutation, dispatch] = useReducer(
    reduceMutation<CareUpdateDetailView>,
    { status: 'idle' } as MutationState<CareUpdateDetailView>
  );
  const lifecycle = useRef(0);
  const lookupGeneration = useRef(0);
  const lookupInFlight = useRef(false);
  const intentRef = useRef<MutationIntent | undefined>(undefined);
  const inputRef = useRef<CreateCareUpdateInput | undefined>(undefined);

  useEffect(() => {
    const token = ++lifecycle.current;
    intentRef.current = undefined;
    inputRef.current = undefined;
    lookupGeneration.current++;
    lookupInFlight.current = false;
    setLookupBusy(false);
    setDraft(EMPTY_DRAFT);
    setErrors({});
    dispatch({ type: 'RESET' });
    setScreenState('loading');
    if (sessionState.status !== 'signedIn') return () => { lifecycle.current++; };
    void service.getCaseHome(caseId).then((result) => {
      if (token !== lifecycle.current) return;
      if (result.result === 'NOT_FOUND_OR_NOT_VISIBLE') {
        setDraft(EMPTY_DRAFT);
        setScreenState('unavailable');
        invalidateProtectedContext();
        return;
      }
      if (result.result !== 'SUCCESS'
        || !result.data.allowedOperations.CREATE_CARE_UPDATE
        || !result.data.careUpdateCreateOptions?.length) {
        setScreenState('unavailable');
        return;
      }
      setVisibilityOptions(result.data.careUpdateCreateOptions);
      setScreenState('ready');
    });
    return () => { lifecycle.current++; };
  }, [service, sessionState.status, contextGeneration, caseId, invalidateProtectedContext]);

  const isCurrent = (token: number, intent: MutationIntent) => token === lifecycle.current
    && intentRef.current?.operationKey === intent.operationKey
    && intentRef.current.requestFingerprint === intent.requestFingerprint;

  const refreshAuthoritative = async (token: number, intent: MutationIntent) => {
    const result = await service.getTimeline(caseId);
    if (!isCurrent(token, intent)) return false;
    if (result.result === 'NOT_FOUND_OR_NOT_VISIBLE') {
      setDraft(EMPTY_DRAFT);
      setScreenState('unavailable');
      invalidateProtectedContext();
      return false;
    }
    setRefreshWarning(result.result !== 'SUCCESS' && result.result !== 'EMPTY');
    return true;
  };

  const submitIntent = async (intent: MutationIntent, input: CreateCareUpdateInput) => {
    const token = lifecycle.current;
    let result;
    try {
      result = await service.createCareUpdate(input, intent.operationKey);
    } catch {
      if (isCurrent(token, intent)) dispatch({ type: 'SUBMISSION_UNCERTAIN' });
      return;
    }
    if (!isCurrent(token, intent)) return;
    if (result.result === 'SUCCESS') {
      if (await refreshAuthoritative(token, intent)) {
        dispatch({ type: 'SUBMISSION_COMMITTED', data: result.data });
        setDraft(EMPTY_DRAFT);
      }
    } else if (result.result === 'TEMPORARY_FAILURE') {
      dispatch({ type: result.outcomeUncertain ? 'SUBMISSION_UNCERTAIN' : 'SUBMISSION_DEFINITELY_NOT_COMMITTED' });
    } else if (result.result === 'IDEMPOTENCY_CONFLICT') {
      dispatch({ type: 'SUBMISSION_CONFLICT' });
    } else if (result.result === 'NOT_FOUND_OR_NOT_VISIBLE') {
      setDraft(EMPTY_DRAFT);
      setScreenState('unavailable');
      invalidateProtectedContext();
    } else if (result.result === 'FORBIDDEN') {
      setScreenState('unavailable');
    } else {
      dispatch({ type: 'SUBMISSION_RECOVERABLE_FAILURE' });
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const input = inputFrom(caseId, draft);
    const intent: MutationIntent = {
      family: 'CREATE_CARE_UPDATE',
      operationKey: newOperationKey(),
      requestFingerprint: fingerprint(input)
    };
    intentRef.current = intent;
    inputRef.current = input;
    dispatch({ type: 'BEGIN', intent });
    void submitIntent(intent, input);
  };

  const lookup = async (retryWhenDefinite = false) => {
    if (lookupInFlight.current) return;
    const intent = intentRef.current;
    const input = inputRef.current;
    if (!intent || !input) return;
    const token = lifecycle.current;
    const lookupAttempt = ++lookupGeneration.current;
    lookupInFlight.current = true;
    setLookupBusy(true);
    const ownsLookup = () => lookupInFlight.current
      && lookupGeneration.current === lookupAttempt
      && isCurrent(token, intent);
    try {
      const status: OperationStatusView = await service.lookupOperationStatus(intent.operationKey);
      if (!ownsLookup() || status.operationKey !== intent.operationKey) return;
      if (status.outcome === 'COMMITTED' && status.authoritativeResult && 'careUpdateId' in status.authoritativeResult) {
        if (await refreshAuthoritative(token, intent) && ownsLookup()) {
          dispatch({ type: 'LOOKUP_RESOLVED', outcome: 'COMMITTED', data: status.authoritativeResult });
          setDraft(EMPTY_DRAFT);
        }
        return;
      }
      dispatch({ type: 'LOOKUP_RESOLVED', outcome: status.outcome });
      if (retryWhenDefinite && status.outcome === 'DEFINITELY_NOT_COMMITTED') {
        const caseResult = await service.getCaseHome(caseId);
        if (!ownsLookup()) return;
        if (caseResult.result === 'NOT_FOUND_OR_NOT_VISIBLE') {
          setDraft(EMPTY_DRAFT); setScreenState('unavailable'); invalidateProtectedContext(); return;
        }
        if (caseResult.result !== 'SUCCESS' || !caseResult.data.allowedOperations.CREATE_CARE_UPDATE) {
          setScreenState('unavailable'); return;
        }
        dispatch({ type: 'RETRY_SAME_INTENT', intent, revalidated: true });
        await submitIntent(intent, input);
      }
    } catch {
      return;
    } finally {
      if (lookupGeneration.current === lookupAttempt) {
        lookupInFlight.current = false;
        setLookupBusy(false);
      }
    }
  };

  if (sessionState.status === 'checking') return <LoadingState label="正在確認登入狀態" />;
  if (sessionState.status === 'signedOut' || sessionState.status === 'recoverableError') return <Navigate to="/winwin/login" replace />;
  if (sessionState.status === 'unavailable' || screenState === 'unavailable') return <UnavailableState />;
  if (screenState === 'loading') return <LoadingState label="新增照顧變化" />;

  if (mutation.status === 'committed') {
    return <section className="winwin-state-card" role="status" aria-labelledby="care-update-success">
      <h1 id="care-update-success">已儲存</h1>
      <p>{mutation.data.authorDisplay} 已於 <time dateTime={mutation.data.serverPublishedAt}>{mutation.data.serverPublishedAt}</time> 發布這筆照顧變化。</p>
      <p>目前未建立處理事項。</p>
      {mutation.data.allowedOperations.CREATE_ACTION && <CreateActionStep caseId={caseId} source={{
        careUpdateId: mutation.data.careUpdateId,
        versionId: mutation.data.versionId,
        summary: mutation.data.content
      }} />}
      {refreshWarning && <p>照顧活動暫時無法完整重新載入，稍後查看時會以最新授權資料為準。</p>}
      <Link className="winwin-primary-action" to={`/winwin/cases/${caseId}/timeline`}>查看照顧活動</Link>
    </section>;
  }

  const locked = mutation.status !== 'idle' && mutation.status !== 'recoverableFailure';
  const describedBy = (name: keyof Draft, help = false) => [help ? `${name}-help` : '', errors[name] ? `${name}-error` : ''].filter(Boolean).join(' ') || undefined;
  const update = (name: keyof Draft, value: string) => setDraft((current) => ({ ...current, [name]: value }));

  return <div className="winwin-create-update">
    <nav aria-label="個案導覽" className="winwin-breadcrumbs"><Link to="/winwin/cases">我的個案</Link><span aria-hidden="true">/</span><Link to={`/winwin/cases/${caseId}`}>個案首頁</Link><span aria-hidden="true">/</span><span>新增照顧變化</span></nav>
    <header className="winwin-page-heading"><p className="winwin-eyebrow">記錄最近的照顧情況</p><h1>新增照顧變化</h1><p>記錄協作者需要理解的照顧變化；這不是診斷或專業驗證。</p></header>
    {mutation.status === 'uncertain' && <div className="winwin-mutation-notice" role="alert" aria-busy={lookupBusy}><h2>尚未確認是否已儲存</h2><p>目前無法確認是否已儲存。請先查詢這次發布狀態，不要再次送出。</p><button type="button" disabled={lookupBusy} onClick={() => void lookup()}>{lookupBusy ? '正在查詢發布狀態…' : '查詢發布狀態'}</button></div>}
    {mutation.status === 'definitelyNotCommitted' && <div className="winwin-mutation-notice" role="alert" aria-busy={lookupBusy}><h2>未儲存</h2><p>照顧變化尚未建立，內容已保留。</p><button type="button" disabled={lookupBusy} onClick={() => void lookup(true)}>{lookupBusy ? '正在確認並重試…' : '確認狀態並重試同一次發布'}</button></div>}
    {mutation.status === 'conflict' && <div className="winwin-mutation-notice" role="alert"><h2>這次發布無法安全完成</h2><p>系統發現發布識別與內容不一致，沒有再次送出。請返回個案確認最新狀態。</p></div>}
    {mutation.status === 'recoverableFailure' && <div className="winwin-mutation-notice" role="alert"><h2>照顧變化尚未建立</h2><p>內容已保留，請確認欄位或稍後再試。</p></div>}
    <form className="winwin-care-update-form" onSubmit={onSubmit} noValidate aria-busy={mutation.status === 'submitting' || lookupBusy}>
      <FormField id="category" label="類別" required error={errors.category}><select id="category" required disabled={locked} value={draft.category} aria-invalid={Boolean(errors.category)} aria-describedby={describedBy('category')} onChange={(e) => update('category', e.target.value)}><option value="">請選擇</option><option value="OBSERVATION">照顧觀察</option><option value="CARE_ARRANGEMENT_CHANGE">照顧安排變化</option><option value="OTHER">其他相關變化</option></select></FormField>
      <FormField id="content" label="發生了什麼變化？" required help="請用簡短事實描述，不要將內容寫成診斷。最多 1000 字。" error={errors.content}><textarea id="content" required maxLength={1000} disabled={locked} value={draft.content} aria-invalid={Boolean(errors.content)} aria-describedby={describedBy('content', true)} onChange={(e) => update('content', e.target.value)} /></FormField>
      <FormField id="source" label="資訊來源" required help="例如：本人直接觀察或本次服務中觀察。" error={errors.source}><input id="source" required disabled={locked} value={draft.source} aria-invalid={Boolean(errors.source)} aria-describedby={describedBy('source', true)} onChange={(e) => update('source', e.target.value)} /></FormField>
      <FormField id="occurredDate" label="發生日期" required error={errors.occurredDate}><input id="occurredDate" type="date" required disabled={locked} value={draft.occurredDate} aria-invalid={Boolean(errors.occurredDate)} aria-describedby={describedBy('occurredDate')} onChange={(e) => update('occurredDate', e.target.value)} /></FormField>
      <fieldset className="winwin-form-field" disabled={locked} aria-describedby={errors.timePrecision ? 'timePrecision-error' : undefined}><legend>時間精確度 <span aria-hidden="true">*</span></legend>{([['EXACT', '精確時間'], ['APPROXIMATE', '約略時間'], ['UNKNOWN', '時間不確定']] as const).map(([value, label]) => <label className="winwin-radio" key={value}><input type="radio" name="timePrecision" required value={value} checked={draft.timePrecision === value} onChange={() => update('timePrecision', value)} />{label}</label>)}{errors.timePrecision && <p id="timePrecision-error" className="winwin-field-error" role="alert">{errors.timePrecision}</p>}</fieldset>
      {draft.timePrecision === 'EXACT' && <FormField id="occurredTime" label="發生時間" required error={errors.occurredTime}><input id="occurredTime" type="time" required disabled={locked} value={draft.occurredTime} aria-invalid={Boolean(errors.occurredTime)} aria-describedby={describedBy('occurredTime')} onChange={(e) => update('occurredTime', e.target.value)} /></FormField>}
      <fieldset className="winwin-form-field" disabled={locked} aria-describedby={errors.visibility ? 'visibility-error' : undefined}><legend>可見範圍 <span aria-hidden="true">*</span></legend>{visibilityOptions.map((option) => <label className="winwin-radio" key={option.value}><input type="radio" name="visibility" required value={option.value} checked={draft.visibility === option.value} onChange={() => update('visibility', option.value)} /><span><strong>{option.label}</strong><small>{option.description}</small></span></label>)}{errors.visibility && <p id="visibility-error" className="winwin-field-error" role="alert">{errors.visibility}</p>}</fieldset>
      <FormField id="additionalContext" label="補充內容（選填）" help="只填寫協作所需內容，最多 500 字。" error={errors.additionalContext}><textarea id="additionalContext" maxLength={500} disabled={locked} value={draft.additionalContext} aria-invalid={Boolean(errors.additionalContext)} aria-describedby={describedBy('additionalContext', true)} onChange={(e) => update('additionalContext', e.target.value)} /></FormField>
      <p className="winwin-publication-note">發布後不會直接覆寫；若需更正，會保留原內容並建立新版本。</p>
      <div className="winwin-form-actions"><button className="winwin-primary-action" type="submit" disabled={locked}>{mutation.status === 'submitting' ? '發布中…' : '發布照顧變化'}</button><Link to={`/winwin/cases/${caseId}`}>取消</Link></div>
    </form>
  </div>;
}
