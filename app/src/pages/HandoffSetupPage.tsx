import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listOwnedCareReceivers, type CareReceiver } from '../lib/careReceivers';
import { listCareTasks, type CareTaskRow } from '../lib/careTasks';
import {
  createTaskHandoff,
  deleteTaskHandoff,
  getTaskHandoffErrorMessage,
  listTaskHandoffs,
  markTaskHandoffReviewed,
  updateTaskHandoff
} from '../lib/taskHandoffs';
import {
  BATHING_METHODS,
  formatHandoffTimestamp,
  getHandoffReadiness,
  HANDOFF_READINESS_LABELS,
  HANDOFF_REVIEW_INTERVAL_OPTIONS,
  MEDICATION_ASSISTANCE_TYPES,
  normalizeHandoffReviewInterval,
  normalizeTaskHandoffDetails,
  TOILETING_METHODS,
  type HandoffReadiness,
  type TaskHandoffDetails,
  type TaskHandoffRecordContract
} from '../handoffs/handoffContract';
import { describeOccurrence, TASK_CATEGORY_LABELS, type TaskCategory } from '../tasks/taskContract';

type DetailDraft = Record<string, unknown>;
interface HandoffFormState {
  details: DetailDraft;
  listText: Record<string, string>;
  additionalNotes: string;
  reviewInterval: string;
}

const emptyForm: HandoffFormState = {
  details: {}, listText: {}, additionalNotes: '', reviewInterval: ''
};

const MEDICATION_ASSISTANCE_LABELS = {
  REMINDER: '提醒查看正式用藥資訊',
  PICKUP: '協助取藥',
  ADMINISTRATION_SUPPORT: '協助服藥'
} as const;
const TOILETING_METHOD_LABELS = { TOILET: '馬桶', COMMODE: '便盆', DIAPER: '尿布', OTHER: '其他' } as const;
const BATHING_METHOD_LABELS = { SHOWER: '淋浴', BED_BATH: '床上擦澡', OTHER: '其他' } as const;

function parseList(value: string) {
  return [...new Set(value.split(/[，,、\n]/).map((item) => item.trim()).filter(Boolean))];
}

function formFromHandoff(handoff: TaskHandoffRecordContract | null): HandoffFormState {
  if (!handoff) return emptyForm;
  const details = { ...handoff.details } as DetailDraft;
  const listText: Record<string, string> = {};
  for (const field of ['equipment', 'items_to_bring']) {
    if (Array.isArray(details[field])) {
      listText[field] = (details[field] as string[]).join('、');
      delete details[field];
    }
  }
  return {
    details,
    listText,
    additionalNotes: handoff.additional_notes ?? '',
    reviewInterval: handoff.review_interval_days?.toString() ?? ''
  };
}

function TriStateField({
  label, value, onChange
}: { label: string; value: unknown; onChange: (value: boolean | undefined) => void }) {
  return <label>{label}<select value={typeof value === 'boolean' ? String(value) : ''} onChange={(event) => {
    onChange(event.target.value === '' ? undefined : event.target.value === 'true');
  }}><option value="">尚未填寫</option><option value="true">是</option><option value="false">否</option></select></label>;
}

function ReadinessBadge({ readiness }: { readiness: HandoffReadiness }) {
  return <span className={`handoff-readiness readiness-${readiness.toLowerCase()}`}>{HANDOFF_READINESS_LABELS[readiness]}</span>;
}

export function HandoffSetupPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [receiver, setReceiver] = useState<CareReceiver | null>(null);
  const [tasks, setTasks] = useState<CareTaskRow[]>([]);
  const [handoffs, setHandoffs] = useState<TaskHandoffRecordContract[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<HandoffFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handoffByTask = useMemo(() => new Map(handoffs.map((handoff) => [handoff.task_id, handoff])), [handoffs]);
  const selectedTask = tasks.find((task) => task.task_id === selectedTaskId) ?? null;
  const selectedHandoff = selectedTaskId ? handoffByTask.get(selectedTaskId) ?? null : null;
  const selectedReadiness = selectedTask
    ? getHandoffReadiness(selectedTask.category, selectedHandoff)
    : 'NOT_PREPARED';

  useEffect(() => {
    let active = true;
    void listOwnedCareReceivers().then(async (receivers) => {
      const ownedReceiver = receivers[0];
      if (!ownedReceiver) return navigate('/setup/receiver', { replace: true });
      const ownedTasks = await listCareTasks(ownedReceiver.care_receiver_id);
      if (!ownedTasks.length) return navigate('/setup/tasks', { replace: true });
      const ownedHandoffs = await listTaskHandoffs(ownedTasks);
      if (!active) return;
      const requestedTaskId = searchParams.get('task');
      const initialTaskId = ownedTasks.some((task) => task.task_id === requestedTaskId)
        ? requestedTaskId
        : ownedTasks[0].task_id;
      setReceiver(ownedReceiver);
      setTasks(ownedTasks);
      setHandoffs(ownedHandoffs);
      setSelectedTaskId(initialTaskId);
      setForm(formFromHandoff(ownedHandoffs.find((handoff) => handoff.task_id === initialTaskId) ?? null));
      setLoading(false);
    }).catch((loadError) => {
      console.error('Unable to load task handoffs', loadError);
      if (!active) return;
      setError(getTaskHandoffErrorMessage('load'));
      setLoading(false);
    });
    return () => { active = false; };
  }, [navigate]);

  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setSearchParams({ task: taskId }, { replace: true });
    setForm(formFromHandoff(handoffByTask.get(taskId) ?? null));
    setConfirmingDelete(false);
    setError(null);
  };

  const setDetail = (field: string, value: unknown) => setForm((current) => {
    const details = { ...current.details };
    if (value === undefined || value === '') delete details[field];
    else details[field] = value;
    return { ...current, details };
  });
  const setListText = (field: string, value: string) => setForm((current) => ({
    ...current, listText: { ...current.listText, [field]: value }
  }));

  const buildDetails = (category: TaskCategory) => {
    const draft = { ...form.details };
    for (const [field, value] of Object.entries(form.listText)) {
      const values = parseList(value);
      if (values.length) draft[field] = values;
      else delete draft[field];
    }
    return normalizeTaskHandoffDetails(category, draft);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTask || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const details = buildDetails(selectedTask.category);
      const reviewInterval = normalizeHandoffReviewInterval(form.reviewInterval ? Number(form.reviewInterval) : null);
      const additionalNotes = form.additionalNotes.trim() || null;
      const saved = selectedHandoff
        ? await updateTaskHandoff(selectedHandoff.handoff_id, selectedTask, {
          details, additional_notes: additionalNotes, review_interval_days: reviewInterval
        })
        : await createTaskHandoff(selectedTask, {
          task_id: selectedTask.task_id, details, additional_notes: additionalNotes, review_interval_days: reviewInterval
        });
      setHandoffs((current) => selectedHandoff
        ? current.map((handoff) => handoff.handoff_id === saved.handoff_id ? saved : handoff)
        : [...current, saved]);
      setForm(formFromHandoff(saved));
    } catch (saveError) {
      console.error('Unable to save task handoff', saveError);
      setError(saveError instanceof Error && saveError.message.startsWith('請')
        ? saveError.message
        : getTaskHandoffErrorMessage('save'));
    } finally {
      setSubmitting(false);
    }
  };

  const review = async () => {
    if (!selectedHandoff || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const reviewedAt = await markTaskHandoffReviewed(selectedHandoff.handoff_id);
      setHandoffs((current) => current.map((handoff) => handoff.handoff_id === selectedHandoff.handoff_id
        ? { ...handoff, reviewed_at: reviewedAt }
        : handoff));
    } catch (reviewError) {
      console.error('Unable to review task handoff', reviewError);
      setError(getTaskHandoffErrorMessage('review'));
    } finally { setSubmitting(false); }
  };

  const remove = async () => {
    if (!selectedHandoff || submitting) return;
    setSubmitting(true); setError(null);
    try {
      await deleteTaskHandoff(selectedHandoff.handoff_id, selectedHandoff.task_id);
      setHandoffs((current) => current.filter((handoff) => handoff.handoff_id !== selectedHandoff.handoff_id));
      setForm(emptyForm); setConfirmingDelete(false);
    } catch (deleteError) {
      console.error('Unable to delete task handoff', deleteError);
      setError(getTaskHandoffErrorMessage('delete'));
    } finally { setSubmitting(false); }
  };

  if (loading) return <main className="centered-page"><section className="status-card compact-card">正在載入交接資訊…</section></main>;

  return <main className="task-setup-layout handoff-layout">
    <header className="task-page-header"><div><p className="eyebrow">{receiver?.display_name}的交接準備</p><h1>讓接手的人知道怎麼做</h1><p>有人願意接手，不代表已經知道每項工作怎麼完成，請整理真正需要交接的資訊</p></div><button className="secondary-button" type="button" onClick={() => navigate('/app')}>返回照顧空間</button></header>
    <div className="handoff-grid">
      <section className="task-list-card"><p className="eyebrow">照顧工作</p><h2>選擇要整理的工作</h2><div className="task-list">
        {tasks.map((task) => {
          const handoff = handoffByTask.get(task.task_id) ?? null;
          const readiness = getHandoffReadiness(task.category, handoff);
          return <button className={`handoff-task-card${task.task_id === selectedTaskId ? ' active' : ''}`} type="button" key={task.task_id} onClick={() => selectTask(task.task_id)}><span className="task-category">{TASK_CATEGORY_LABELS[task.category]}</span><strong>{task.title}</strong><small>{describeOccurrence(task.occurrence_pattern)}</small><ReadinessBadge readiness={readiness} />{handoff && <small>最後更新：{formatHandoffTimestamp(handoff.updated_at)}</small>}</button>;
        })}
      </div></section>
      {selectedTask && <section className="task-form-card handoff-editor"><p className="eyebrow">{TASK_CATEGORY_LABELS[selectedTask.category]}</p><h2>{selectedTask.title}</h2><p className="handoff-task-time">{describeOccurrence(selectedTask.occurrence_pattern)}</p><ReadinessBadge readiness={selectedReadiness} />
        {selectedHandoff && <div className="handoff-freshness"><span>最後更新：{formatHandoffTimestamp(selectedHandoff.updated_at, true)}</span><span>{selectedHandoff.reviewed_at ? `主要照顧者最後確認：${formatHandoffTimestamp(selectedHandoff.reviewed_at, true)}` : '尚未確認目前內容仍適用'}</span><small>此確認由主要照顧者記錄，不代表備援者或專業人員已確認</small></div>}
        <form className="form-stack task-form handoff-form" onSubmit={save}>
          <CategoryFields category={selectedTask.category} details={form.details} listText={form.listText} setDetail={setDetail} setListText={setListText} disabled={submitting} />
          <label>必要補充說明<textarea value={form.additionalNotes} onChange={(event) => setForm((current) => ({ ...current, additionalNotes: event.target.value }))} disabled={submitting} rows={4} placeholder="只記錄接手時確實需要知道的補充內容" /></label><p className="field-hint">請勿在此記錄長篇照顧日誌、完整病歷或處方內容</p>
          <label>確認提醒<select value={form.reviewInterval} onChange={(event) => setForm((current) => ({ ...current, reviewInterval: event.target.value }))} disabled={submitting}><option value="">不提醒</option>{HANDOFF_REVIEW_INTERVAL_OPTIONS.map((days) => <option value={days} key={days}>{days === 14 ? '每 2 週' : days === 30 ? '每 1 個月' : '每 3 個月'}</option>)}</select></label><p className="field-hint">由你依目前照顧情況設定，不代表醫療或長照專業建議</p>
          {error && <p className="form-message error" role="alert">{error}</p>}
          <div className="form-actions"><button className="primary-button" type="submit" disabled={submitting}>{submitting ? '處理中…' : selectedHandoff ? '儲存交接資訊' : '建立交接資訊'}</button>{selectedHandoff && selectedReadiness === 'READY_TO_SHARE' && <button className="secondary-button" type="button" onClick={review} disabled={submitting}>內容沒變，仍適用</button>}</div>
          {selectedHandoff && <button className="text-button danger-text" type="button" onClick={() => setConfirmingDelete(true)} disabled={submitting}>移除交接資訊</button>}
        </form>
        {confirmingDelete && selectedHandoff && <div className="delete-confirmation"><div><strong>只移除這項工作的交接資訊</strong><p>照顧工作本身不會被刪除</p></div><div className="form-actions"><button className="secondary-button" type="button" onClick={() => setConfirmingDelete(false)}>取消</button><button className="primary-button danger-button" type="button" onClick={remove} disabled={submitting}>確認移除交接資訊</button></div></div>}
      </section>}
    </div>
  </main>;
}

function CategoryFields({ category, details, listText, setDetail, setListText, disabled }: {
  category: TaskCategory; details: DetailDraft; listText: Record<string, string>;
  setDetail: (field: string, value: unknown) => void; setListText: (field: string, value: string) => void; disabled: boolean;
}) {
  const text = (field: string, label: string, placeholder?: string): ReactNode => <label>{label}<input value={typeof details[field] === 'string' ? details[field] as string : ''} onChange={(event) => setDetail(field, event.target.value)} disabled={disabled} placeholder={placeholder} /></label>;
  const list = (field: string, label: string): ReactNode => <label>{label}<input value={listText[field] ?? ''} onChange={(event) => setListText(field, event.target.value)} disabled={disabled} placeholder="可用頓號分隔多個項目" /></label>;
  const tri = (field: string, label: string): ReactNode => <TriStateField label={label} value={details[field]} onChange={(value) => setDetail(field, value)} />;
  if (category === 'MEDICATION') return <><TriStateField label="正式用藥資訊是否已整理" value={details.official_information_ready} onChange={(value) => setDetail('official_information_ready', value)} />{text('official_information_location', '正式資訊／藥袋位置', '例如：餐桌右側抽屜')}<fieldset><legend>需要哪些協助方式</legend><div className="choice-grid">{MEDICATION_ASSISTANCE_TYPES.map((type) => <label className="choice-card horizontal" key={type}><input type="checkbox" checked={Array.isArray(details.assistance_types) && details.assistance_types.includes(type)} onChange={() => { const current = Array.isArray(details.assistance_types) ? details.assistance_types as string[] : []; setDetail('assistance_types', current.includes(type) ? current.filter((item) => item !== type) : [...current, type]); }} disabled={disabled} /><span>{MEDICATION_ASSISTANCE_LABELS[type]}</span></label>)}</div></fieldset>{text('swallowing_caution', '吞嚥或服藥注意事項')}<p className="handoff-safety-note">正式用藥仍以處方、藥袋或醫療專業指示為準</p></>;
  if (category === 'MEAL') return <>{text('meal_arrangement', '餐點如何取得')}{tri('feeding_assistance_required', '是否需要協助進食')}{text('diet_form', '飲食型態')}{text('swallowing_caution', '吞嚥注意事項')}{list('equipment', '餐具／輔具')}</>;
  if (category === 'TOILETING') return <><label>如廁方式<select value={typeof details.toileting_method === 'string' ? details.toileting_method : ''} onChange={(event) => setDetail('toileting_method', event.target.value)} disabled={disabled}><option value="">尚未填寫</option>{TOILETING_METHODS.map((method) => <option value={method} key={method}>{TOILETING_METHOD_LABELS[method]}</option>)}</select></label>{tri('accompaniment_required', '是否需陪同')}{tri('transfer_assistance_required', '是否需移位協助')}{text('supplies_location', '用品位置')}</>;
  if (category === 'BATHING') return <><label>洗澡方式<select value={typeof details.bathing_method === 'string' ? details.bathing_method : ''} onChange={(event) => setDetail('bathing_method', event.target.value)} disabled={disabled}><option value="">尚未填寫</option>{BATHING_METHODS.map((method) => <option value={method} key={method}>{BATHING_METHOD_LABELS[method]}</option>)}</select></label>{tri('transfer_assistance_required', '是否需移位')}{tri('continuous_supervision_required', '是否需全程有人在場')}{list('equipment', '輔具')}{text('supplies_location', '用品位置')}</>;
  if (category === 'MOBILITY') return <>{text('mobility_method', '移動／移位方式')}{tri('assistance_required', '是否需他人協助')}{list('equipment', '輔具')}{text('cautions', '注意事項')}</>;
  if (category === 'MEDICAL') return <>{text('medical_destination', '院所／科別')}{text('transport_method', '交通方式')}{tri('accompaniment_required', '是否需陪同')}{list('items_to_bring', '攜帶資料')}{text('cautions', '注意事項')}<p className="field-hint">日期與時間沿用照顧工作的發生時間，不需重複填寫</p></>;
  if (category === 'TRANSPORT') return <>{text('origin', '出發地')}{text('destination', '目的地')}{text('transport_method', '交通方式')}{tri('accompaniment_required', '是否需陪同')}{text('cautions', '注意事項')}</>;
  if (category === 'NIGHT_CARE') return <>{text('care_method', '具體照顧方式')}{tri('continuous_supervision_required', '是否需持續有人在場')}{list('equipment', '輔具')}{text('supplies_location', '用品位置')}{text('cautions', '注意事項')}</>;
  return <>{text('care_method', '具體照顧方式')}{list('equipment', '輔具')}{text('supplies_location', '用品位置')}{text('cautions', '注意事項')}</>;
}
