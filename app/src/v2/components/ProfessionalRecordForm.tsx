import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SHARING_SCOPE_LABELS } from '../data/mockData';
import { hasProfessionalRecordErrors, PROFESSIONAL_RECORD_DEMO_LABEL, validateProfessionalRecordDraft, type ProfessionalRecordErrors } from '../state/professionalRecordState';
import type { ProfessionalRecordContent, ProfessionalRecordDraft, ProfessionalRecordSharingScope } from '../types/prototype';

const sections = [
  ['service', '本次服務資訊'],
  ['observation', '觀察與主述'],
  ['assessment', '評估內容'],
  ['service-record', '處置／服務紀錄'],
  ['follow-up', '後續追蹤'],
  ['sharing', '分享範圍'],
  ['publish', '確認與發布']
] as const;

interface ProfessionalRecordFormProps {
  initialDraft: ProfessionalRecordDraft;
  heading: string;
  description: string;
  submitLabel: string;
  onPublish: (draft: ProfessionalRecordDraft) => string | null;
}

export function ProfessionalRecordForm({ initialDraft, heading, description, submitLabel, onPublish }: ProfessionalRecordFormProps) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => structuredClone(initialDraft));
  const [errors, setErrors] = useState<ProfessionalRecordErrors>({});
  const [previewed, setPreviewed] = useState(false);
  const [pendingExit, setPendingExit] = useState<string | null>(null);
  const allowExit = useRef(false);
  const previewRef = useRef<HTMLElement | null>(null);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initialDraft), [draft, initialDraft]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || allowExit.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const interceptLinks = (event: MouseEvent) => {
      if (!dirty || allowExit.current || event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === '_blank') return;
      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      event.preventDefault();
      setPendingExit(`${destination.pathname}${destination.search}${destination.hash}`);
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', interceptLinks, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', interceptLinks, true);
    };
  }, [dirty]);

  const updateContent = <K extends keyof ProfessionalRecordContent>(key: K, value: ProfessionalRecordContent[K]) => {
    setDraft((current) => ({ ...current, content: { ...current.content, [key]: value } }));
    setPreviewed(false);
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const updateDraft = <K extends keyof ProfessionalRecordDraft>(key: K, value: ProfessionalRecordDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setPreviewed(false);
    if (key === 'correctionReason') setErrors((current) => ({ ...current, correctionReason: undefined }));
  };
  const validateAndPreview = () => {
    const nextErrors = validateProfessionalRecordDraft(draft);
    setErrors(nextErrors);
    if (hasProfessionalRecordErrors(nextErrors)) {
      window.setTimeout(() => document.getElementById('record-error-summary')?.focus(), 0);
      return;
    }
    setPreviewed(true);
    window.setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  const returnToEditing = () => {
    setPreviewed(false);
    window.setTimeout(() => document.getElementById('record-observation')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  const publish = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateProfessionalRecordDraft(draft);
    setErrors(nextErrors);
    if (hasProfessionalRecordErrors(nextErrors) || !previewed) return;
    const recordId = onPublish(draft);
    if (!recordId) return;
    allowExit.current = true;
    navigate(`/v2/prototype/cases/${draft.caseId}/records/${recordId}`);
  };
  const requestCancel = () => {
    if (dirty) setPendingExit(`/v2/prototype/cases/${draft.caseId}/records`);
    else navigate(`/v2/prototype/cases/${draft.caseId}/records`);
  };
  const confirmExit = () => {
    if (!pendingExit) return;
    allowExit.current = true;
    navigate(pendingExit);
  };
  const fieldError = (name: keyof ProfessionalRecordErrors) => errors[name]
    ? <small className="v2-field-error" id={`${name}-error`}>{errors[name]}</small>
    : null;

  return (
    <section className="v2-page v2-professional-record-form-page">
      <header className="v2-page-heading">
        <p className="eyebrow">林奶奶｜{PROFESSIONAL_RECORD_DEMO_LABEL}</p>
        <h1>{heading}</h1>
        <p>{description}</p>
      </header>
      <div className="v2-record-context" role="note">
        <strong>本次使用身分：日照護理師（虛構）</strong>
        <span>服務目的：{draft.purpose}</span>
        <span>分享範圍：{SHARING_SCOPE_LABELS[draft.sharingScope]}</span>
      </div>
      <p className="v2-unsaved-notice">此為流程展示，內容只保留在目前頁面；重新整理後會重置。這不是正式病歷、護理紀錄或法定機構紀錄，也不會自動儲存。</p>
      {hasProfessionalRecordErrors(errors) && <section id="record-error-summary" className="v2-record-error-summary" role="alert" tabIndex={-1}><h2>請完成以下欄位</h2><ul>{Object.entries(errors).map(([key, message]) => <li key={key}><a href={`#record-${key}`}>{message}</a></li>)}</ul></section>}
      <div className="v2-record-editor-layout">
        <nav className="v2-record-section-nav" aria-label="專業照顧紀錄區段">
          <strong>紀錄區段</strong>
          {sections.map(([id, label], index) => <a href={`#record-${id}`} key={id}><span>{index + 1}</span>{label}</a>)}
        </nav>
        <form className="v2-record-form form-stack" onSubmit={publish} noValidate>
          <section id="record-service" className="v2-card v2-record-section"><div className="v2-record-section-heading"><span>1／7</span><h2>本次服務資訊</h2></div>
            <div className="v2-form-row"><label id="record-serviceDate">服務日期<input type="date" value={draft.content.serviceDate} onChange={(event) => updateContent('serviceDate', event.target.value)} aria-describedby={errors.serviceDate ? 'serviceDate-error' : undefined} />{fieldError('serviceDate')}</label><label id="record-serviceLocation">虛構服務地點<input value={draft.content.serviceLocation} onChange={(event) => updateContent('serviceLocation', event.target.value)} aria-describedby={errors.serviceLocation ? 'serviceLocation-error' : undefined} />{fieldError('serviceLocation')}</label></div>
            <div className="v2-form-row"><label id="record-startedAt">開始時間<input type="time" value={draft.content.startedAt} onChange={(event) => updateContent('startedAt', event.target.value)} aria-describedby={errors.startedAt ? 'startedAt-error' : undefined} />{fieldError('startedAt')}</label><label id="record-endedAt">結束時間<input type="time" value={draft.content.endedAt} onChange={(event) => updateContent('endedAt', event.target.value)} aria-describedby={errors.endedAt ? 'endedAt-error' : undefined} />{fieldError('endedAt')}</label></div>
          </section>
          <section id="record-observation" className="v2-card v2-record-section"><div className="v2-record-section-heading"><span>2／7</span><h2>觀察與主述</h2></div>
            <label>長者或家屬主述<textarea rows={3} value={draft.content.subjectReport} onChange={(event) => updateContent('subjectReport', event.target.value)} placeholder="例如：長輩表示沒有疼痛。請清楚標示陳述來源。" /></label>
            <label id="record-objectiveObservation">客觀觀察<textarea rows={5} value={draft.content.objectiveObservation} onChange={(event) => updateContent('objectiveObservation', event.target.value)} placeholder="描述看見、聽見或量測到的事實；不要把觀察寫成診斷。" aria-describedby={errors.objectiveObservation ? 'objectiveObservation-error' : undefined} />{fieldError('objectiveObservation')}</label>
          </section>
          <section id="record-assessment" className="v2-card v2-record-section"><div className="v2-record-section-heading"><span>3／7</span><h2>評估內容</h2></div>
            <label>專業評估摘要<textarea rows={4} value={draft.content.assessmentSummary} onChange={(event) => updateContent('assessmentSummary', event.target.value)} placeholder="只記錄本次服務範圍內的專業判斷，不作未經確認的診斷。" /></label>
            <label>專業限定工作備註<textarea rows={3} value={draft.content.professionalOnlyNotes} onChange={(event) => updateContent('professionalOnlyNotes', event.target.value)} placeholder="家屬預覽不會顯示此欄，也不會顯示有幾筆內容被隱藏。" /></label>
          </section>
          <section id="record-service-record" className="v2-card v2-record-section"><div className="v2-record-section-heading"><span>4／7</span><h2>處置／服務紀錄</h2></div>
            <label id="record-serviceProvided">本次完成的處置或服務<textarea rows={5} value={draft.content.serviceProvided} onChange={(event) => updateContent('serviceProvided', event.target.value)} placeholder="記錄實際完成的服務，不宣稱未執行或無法確認的內容。" aria-describedby={errors.serviceProvided ? 'serviceProvided-error' : undefined} />{fieldError('serviceProvided')}</label>
          </section>
          <section id="record-follow-up" className="v2-card v2-record-section"><div className="v2-record-section-heading"><span>5／7</span><h2>後續追蹤</h2></div>
            <label id="record-followUpPlan">追蹤方式<textarea rows={4} value={draft.content.followUpPlan} onChange={(event) => updateContent('followUpPlan', event.target.value)} placeholder="說明下一步與需要留意的變化；沒有新紀錄不代表狀況穩定。" aria-describedby={errors.followUpPlan ? 'followUpPlan-error' : undefined} />{fieldError('followUpPlan')}</label>
            <label>預計追蹤日期<input type="date" value={draft.content.followUpDueDate} onChange={(event) => updateContent('followUpDueDate', event.target.value)} /></label>
          </section>
          <section id="record-sharing" className="v2-card v2-record-section"><div className="v2-record-section-heading"><span>6／7</span><h2>分享範圍</h2></div>
            <label>本次紀錄分享範圍<select value={draft.sharingScope} onChange={(event) => updateDraft('sharingScope', event.target.value as ProfessionalRecordSharingScope)}><option value="SHARED_CARE">共同照顧</option><option value="DIRECT_PARTICIPANTS">直接參與者</option><option value="AUTHOR_ONLY">僅作者</option></select></label>
            <p className="v2-scope-note">分享範圍不會改變原始內容。家屬預覽只呈現獲授權且完成照顧協作所需的內容。</p>
            {draft.correctionOfVersionId && <label id="record-correctionReason">更正原因<textarea rows={3} value={draft.correctionReason ?? ''} onChange={(event) => updateDraft('correctionReason', event.target.value)} placeholder="說明為什麼需要追加更正；原版本不會消失。" aria-describedby={errors.correctionReason ? 'correctionReason-error' : undefined} />{fieldError('correctionReason')}</label>}
          </section>
          <section id="record-publish" className="v2-card v2-record-section"><div className="v2-record-section-heading"><span>7／7</span><h2>確認與發布</h2></div>
            <p>發布後原文不可直接編輯；需要修改時只能建立新的更正版本，並保留原作者、時間與版本關係。</p>
            <button className="secondary-button" type="button" onClick={validateAndPreview}>預覽即將分享的內容</button>
          </section>
          {previewed && <section ref={previewRef} className="v2-record-share-preview" aria-labelledby="record-preview-heading"><p className="eyebrow">發布前預覽</p><h2 id="record-preview-heading">家屬會看到</h2>{draft.sharingScope === 'SHARED_CARE' ? <><dl><div><dt>作者與身分</dt><dd>陳護理師｜日照護理師（虛構）</dd></div><div><dt>服務目的</dt><dd>{draft.purpose}</dd></div></dl><h3>客觀觀察</h3><p>{draft.content.objectiveObservation}</p><h3>本次服務</h3><p>{draft.content.serviceProvided}</p><h3>後續追蹤</h3><p>{draft.content.followUpPlan}</p><div className="v2-record-preview-excluded"><strong>家屬不會看到</strong><p>專業評估與專業限定工作備註不會出現在這份預覽；不顯示被隱藏內容的數量。</p></div></> : <p>目前分享範圍不包含家庭成員，因此家屬不會看到此紀錄，也不會看到被隱藏內容的數量。</p>}<p className="v2-record-preview-rule">發布後不能直接改寫，只能追加更正。</p></section>}
          <div className="v2-record-sticky-actions"><div><strong>{dirty ? '尚未發布' : '尚未輸入內容'}</strong><small>沒有自動儲存；離開後可能遺失</small></div><button className="text-button" type="button" onClick={previewed ? returnToEditing : requestCancel}>{previewed ? '返回修改' : '取消'}</button><button className="primary-button" type="submit" disabled={!previewed}>{submitLabel}</button></div>
        </form>
      </div>
      {pendingExit && <div className="v2-record-exit-backdrop" role="presentation"><section className="v2-record-exit-dialog" role="dialog" aria-modal="true" aria-labelledby="unsaved-heading"><h2 id="unsaved-heading">這份紀錄尚未保存</h2><p>離開後可能遺失目前輸入內容。</p><div className="v2-form-actions"><button className="primary-button" type="button" autoFocus onClick={() => setPendingExit(null)}>繼續編輯</button><button className="secondary-button" type="button" onClick={confirmExit}>離開並捨棄</button></div></section></div>}
    </section>
  );
}
