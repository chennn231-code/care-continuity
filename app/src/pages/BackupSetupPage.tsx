import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  BACKUP_CONFIRMATION_STATUSES,
  BACKUP_STATUS_LABELS,
  BackupValidationError,
  describeBackupArrangement,
  eligibleBackupSources,
  normalizeBackupInput,
  type BackupFormValues
} from '../backups/backupContract';
import { ASSIGNMENT_SUPPORT_MODE_LABELS } from '../assignments/assignmentContract';
import {
  createBackupAssignment,
  deleteBackupAssignment,
  getBackupErrorMessage,
  listBackupAssignments,
  updateBackupAssignment,
  type BackupAssignmentRow
} from '../lib/backupAssignments';
import { listOwnedCareReceivers, type CareReceiver } from '../lib/careReceivers';
import { listCareSources, type CareSourceRow } from '../lib/careSources';
import { listCareTasks, type CareTaskRow } from '../lib/careTasks';
import { SUPPORT_MODES, WEEKDAY_LABELS, type SupportMode, type Weekday } from '../tasks/taskContract';

const initialForm: BackupFormValues = { careSourceId: '', confirmationStatus: 'POSSIBLE', weekdays: [], scheduledTimes: [], supportModes: [] };

export function BackupSetupPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [receiver, setReceiver] = useState<CareReceiver | null>(null);
  const [tasks, setTasks] = useState<CareTaskRow[]>([]);
  const [sources, setSources] = useState<CareSourceRow[]>([]);
  const [backups, setBackups] = useState<BackupAssignmentRow[]>([]);
  const [editingTask, setEditingTask] = useState<CareTaskRow | null>(null);
  const [editingBackupId, setEditingBackupId] = useState<string | null>(null);
  const [form, setForm] = useState<BackupFormValues>(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ taskId: string; backupId: string; sourceName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listOwnedCareReceivers().then(async (receivers) => {
      const ownedReceiver = receivers[0];
      if (!ownedReceiver) return navigate('/setup/receiver', { replace: true });
      const [ownedTasks, ownedSources] = await Promise.all([listCareTasks(ownedReceiver.care_receiver_id), listCareSources(ownedReceiver.care_receiver_id)]);
      if (!active) return;
      if (!ownedTasks.length) return navigate('/setup/tasks', { replace: true });
      if (!ownedSources.length) return navigate('/setup/sources', { replace: true });
      const ownedBackups = await listBackupAssignments(ownedTasks.map((task) => task.task_id));
      if (!active) return;
      setReceiver(ownedReceiver); setTasks(ownedTasks); setSources(ownedSources); setBackups(ownedBackups); setLoading(false);
    }).catch((loadError) => {
      console.error('Unable to load backup assignments', loadError);
      if (!active) return;
      setError(getBackupErrorMessage(loadError, 'load')); setLoading(false);
    });
    return () => { active = false; };
  }, [navigate]);

  const eligibleSources = useMemo(() => session ? eligibleBackupSources(sources, session.user.id) : [], [session, sources]);
  const sourceById = useMemo(() => new Map(sources.map((source) => [source.care_source_id, source])), [sources]);
  const closeEditor = () => { setEditingTask(null); setEditingBackupId(null); setForm(initialForm); setError(null); };
  const startCreate = (task: CareTaskRow) => { setEditingTask(task); setEditingBackupId(null); setForm(initialForm); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const startEdit = (task: CareTaskRow, backup: BackupAssignmentRow) => {
    const limitedScope = backup.time_scope && !('mode' in backup.time_scope) ? backup.time_scope : null;
    setEditingTask(task); setEditingBackupId(backup.backup_id);
    setForm({ careSourceId: backup.care_source_id, confirmationStatus: backup.confirmation_status, weekdays: limitedScope?.weekdays ?? [], scheduledTimes: limitedScope?.scheduled_times ?? [], supportModes: backup.support_modes_committed });
    setError(null); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const toggleWeekday = (weekday: Weekday) => setForm((current) => ({ ...current, weekdays: current.weekdays.includes(weekday) ? current.weekdays.filter((value) => value !== weekday) : [...current.weekdays, weekday] }));
  const toggleTime = (time: string) => setForm((current) => ({ ...current, scheduledTimes: current.scheduledTimes.includes(time) ? current.scheduledTimes.filter((value) => value !== time) : [...current.scheduledTimes, time] }));
  const toggleSupportMode = (mode: SupportMode) => setForm((current) => ({ ...current, supportModes: current.supportModes.includes(mode) ? current.supportModes.filter((value) => value !== mode) : [...current.supportModes, mode] }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingTask || submitting) return;
    const duplicate = backups.find((backup) => backup.task_id === editingTask.task_id && backup.care_source_id === form.careSourceId && backup.backup_id !== editingBackupId);
    if (duplicate) { setError('這個來源已經是此工作的備援安排，可以直接編輯既有資料。'); return; }
    let input;
    try { input = normalizeBackupInput(editingTask, form); }
    catch (validationError) { setError(validationError instanceof BackupValidationError ? validationError.message : '請確認備援資料是否完整。'); return; }
    setSubmitting(true); setError(null);
    try {
      if (editingBackupId) {
        const updated = await updateBackupAssignment(editingBackupId, editingTask.task_id, input);
        setBackups((current) => current.map((backup) => backup.backup_id === updated.backup_id ? updated : backup));
      } else {
        const created = await createBackupAssignment(editingTask.task_id, input);
        setBackups((current) => [...current, created]);
      }
      closeEditor();
    } catch (saveError) {
      console.error('Unable to save backup assignment', saveError); setError(getBackupErrorMessage(saveError, 'save'));
    } finally { setSubmitting(false); }
  };

  const remove = async (taskId: string, backupId: string) => {
    try {
      await deleteBackupAssignment(backupId, taskId);
      setBackups((current) => current.filter((backup) => backup.backup_id !== backupId)); setPendingDelete(null);
      if (editingBackupId === backupId) closeEditor();
    } catch (deleteError) { console.error('Unable to delete backup assignment', deleteError); setError(getBackupErrorMessage(deleteError, 'delete')); }
  };

  if (loading) return <main className="centered-page"><section className="status-card compact-card">正在載入備援安排…</section></main>;
  const pattern = editingTask?.occurrence_pattern;

  return <main className="task-setup-layout assignment-setup-layout">
    <header className="task-page-header"><div><p className="eyebrow">{receiver?.display_name}的備援安排</p><h1>主要照顧者不在時，誰可能接手？</h1><p>分清楚尚待詢問、已確認完整接手，以及只有部分時間或方式能接手的安排。</p></div><button className="secondary-button" onClick={() => navigate('/app')}>返回照顧空間</button></header>

    {eligibleSources.length === 0 && <section className="task-form-card"><h2>還沒有可設定的備援來源</h2><p>主要照顧者本人不能成為自己的備援。請先加入其他家人、親友或服務來源。</p><button className="primary-button" onClick={() => navigate('/setup/sources')}>前往照顧來源</button></section>}

    {editingTask && <section className="task-form-card assignment-editor"><p className="eyebrow">{editingBackupId ? '修改備援安排' : '新增備援安排'}</p><h2>{editingTask.title}</h2><form className="form-stack task-form" onSubmit={submit}>
      <label>備援人選或服務<select value={form.careSourceId} disabled={submitting || Boolean(editingBackupId)} onChange={(event) => setForm((current) => ({ ...current, careSourceId: event.target.value }))}><option value="">請選擇</option>{eligibleSources.map((source) => <option key={source.care_source_id} value={source.care_source_id}>{source.display_name}</option>)}</select></label>
      <fieldset><legend>目前確認到哪一步？</legend><div className="choice-grid">{BACKUP_CONFIRMATION_STATUSES.map((status) => status === 'CONFIRMED_WITH_LIMITS' && pattern?.type === 'AS_NEEDED' ? null : <label className="choice-card horizontal" key={status}><input type="radio" name="backup-status" checked={form.confirmationStatus === status} onChange={() => setForm((current) => ({ ...current, confirmationStatus: status, weekdays: [], scheduledTimes: [], supportModes: status === 'POSSIBLE' ? [] : current.supportModes }))} />{BACKUP_STATUS_LABELS[status]}</label>)}</div></fieldset>
      {form.confirmationStatus === 'POSSIBLE' && <p className="assignment-warning">這只代表一個待確認的人選，不代表對方已同意、有空或具備完成工作的能力。</p>}
      {form.confirmationStatus === 'CONFIRMED_WITH_LIMITS' && pattern?.type === 'WEEKLY' && <fieldset><legend>可接手日期</legend><div className="weekday-grid">{pattern.weekdays.map((day) => <label className="compact-choice" key={day}><input type="checkbox" checked={form.weekdays.includes(day)} onChange={() => toggleWeekday(day)} />週{WEEKDAY_LABELS[day]}</label>)}</div></fieldset>}
      {form.confirmationStatus === 'CONFIRMED_WITH_LIMITS' && pattern && pattern.type !== 'AS_NEEDED' && <fieldset><legend>可接手時間</legend><div className="choice-grid three-columns">{pattern.scheduled_times.map((time) => <label className="choice-card" key={time}><input type="checkbox" checked={form.scheduledTimes.includes(time)} onChange={() => toggleTime(time)} />{time}</label>)}</div></fieldset>}
      {form.confirmationStatus !== 'POSSIBLE' && <fieldset><legend>已確認的協助形式</legend><div className="choice-grid three-columns">{SUPPORT_MODES.map((mode) => <label className="choice-card" key={mode}><input type="checkbox" checked={form.supportModes.includes(mode)} onChange={() => toggleSupportMode(mode)} />{ASSIGNMENT_SUPPORT_MODE_LABELS[mode]}</label>)}</div></fieldset>}
      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="form-actions"><button className="primary-button" disabled={submitting}>{submitting ? '儲存中…' : '儲存備援安排'}</button><button className="secondary-button" type="button" onClick={closeEditor}>取消</button></div>
    </form></section>}

    <section className="assignment-task-list">{tasks.map((task) => { const taskBackups = backups.filter((backup) => backup.task_id === task.task_id); return <article className="assignment-task-card" key={task.task_id}><div className="assignment-task-heading"><div><span className="task-category">照顧工作</span><h2>{task.title}</h2></div><button className="secondary-button" disabled={!eligibleSources.length} onClick={() => startCreate(task)}>＋ 新增備援安排</button></div>{taskBackups.length === 0 ? <p className="unassigned-note">尚未建立備援安排</p> : <div className="assignment-list">{taskBackups.map((backup) => <div className="assignment-row" key={backup.backup_id}><div><strong>{sourceById.get(backup.care_source_id)?.display_name ?? '未知來源'}</strong><span>{describeBackupArrangement(backup.confirmation_status, backup.time_scope, backup.support_modes_committed)}</span></div><div className="assignment-actions"><button className="text-button" onClick={() => startEdit(task, backup)}>編輯</button><button className="text-button danger-text" onClick={() => setPendingDelete({ taskId: task.task_id, backupId: backup.backup_id, sourceName: sourceById.get(backup.care_source_id)?.display_name ?? '此來源' })}>移除此備援</button></div></div>)}</div>}</article>; })}</section>
    {pendingDelete && <section className="delete-confirmation" role="alertdialog"><div><strong>確定移除「{pendingDelete.sourceName}」的備援安排？</strong><p>只會刪除這筆備援關係，不會刪除工作或照顧來源。</p></div><div className="form-actions"><button className="secondary-button" onClick={() => setPendingDelete(null)}>取消</button><button className="primary-button danger-button" onClick={() => void remove(pendingDelete.taskId, pendingDelete.backupId)}>確認移除備援</button></div></section>}
    {error && !editingTask && <p className="form-message error" role="alert">{error}</p>}
    <button className="primary-button complete-task-button" onClick={() => navigate('/app')}>完成這一步</button>
  </main>;
}
