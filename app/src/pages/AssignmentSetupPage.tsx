import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ASSIGNMENT_SUPPORT_MODE_LABELS,
  AssignmentValidationError,
  describeAssignmentScope,
  normalizeAssignmentInput,
  PARTICIPATION_TYPE_LABELS,
  PARTICIPATION_TYPES,
  type AssignmentFormValues
} from '../assignments/assignmentContract';
import { listOwnedCareReceivers, type CareReceiver } from '../lib/careReceivers';
import { listCareSources, type CareSourceRow } from '../lib/careSources';
import { listCareTasks, type CareTaskRow } from '../lib/careTasks';
import {
  createCurrentAssignment,
  deleteCurrentAssignment,
  getAssignmentErrorMessage,
  listCurrentAssignments,
  updateCurrentAssignment,
  type CurrentAssignmentRow
} from '../lib/currentAssignments';
import {
  SUPPORT_MODES,
  WEEKDAY_LABELS,
  type SupportMode,
  type Weekday
} from '../tasks/taskContract';

const initialForm: AssignmentFormValues = {
  careSourceId: '',
  participationType: 'REGULAR',
  scopeMode: 'ALL',
  weekdays: [],
  scheduledTimes: [],
  supportMode: 'ON_SITE'
};

export function AssignmentSetupPage() {
  const navigate = useNavigate();
  const [receiver, setReceiver] = useState<CareReceiver | null>(null);
  const [tasks, setTasks] = useState<CareTaskRow[]>([]);
  const [sources, setSources] = useState<CareSourceRow[]>([]);
  const [assignments, setAssignments] = useState<CurrentAssignmentRow[]>([]);
  const [editingTask, setEditingTask] = useState<CareTaskRow | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [form, setForm] = useState<AssignmentFormValues>(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    taskId: string;
    assignmentId: string;
    sourceName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listOwnedCareReceivers().then(async (receivers) => {
      const ownedReceiver = receivers[0];
      if (!ownedReceiver) return navigate('/setup/receiver', { replace: true });
      const [ownedTasks, ownedSources] = await Promise.all([
        listCareTasks(ownedReceiver.care_receiver_id),
        listCareSources(ownedReceiver.care_receiver_id)
      ]);
      if (!active) return;
      if (ownedTasks.length === 0) return navigate('/setup/tasks', { replace: true });
      if (ownedSources.length === 0) return navigate('/setup/sources', { replace: true });
      const ownedAssignments = await listCurrentAssignments(ownedTasks.map((task) => task.task_id));
      if (!active) return;
      setReceiver(ownedReceiver);
      setTasks(ownedTasks);
      setSources(ownedSources);
      setAssignments(ownedAssignments);
      setLoading(false);
    }).catch((loadError) => {
      console.error('Unable to load current assignments', loadError);
      if (!active) return;
      setError(getAssignmentErrorMessage(loadError, 'load'));
      setLoading(false);
    });
    return () => { active = false; };
  }, [navigate]);

  const sourceById = useMemo(
    () => new Map(sources.map((source) => [source.care_source_id, source])),
    [sources]
  );

  const closeEditor = () => {
    setEditingTask(null);
    setEditingAssignmentId(null);
    setForm(initialForm);
    setError(null);
  };

  const startCreate = (task: CareTaskRow) => {
    setEditingTask(task);
    setEditingAssignmentId(null);
    setForm(initialForm);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEdit = (task: CareTaskRow, assignment: CurrentAssignmentRow) => {
    const isFullScope = 'mode' in assignment.time_scope;
    const limitedWeekdays = 'mode' in assignment.time_scope ? [] : assignment.time_scope.weekdays ?? [];
    const limitedScheduledTimes = 'mode' in assignment.time_scope ? [] : assignment.time_scope.scheduled_times ?? [];
    setEditingTask(task);
    setEditingAssignmentId(assignment.assignment_id);
    setForm({
      careSourceId: assignment.care_source_id,
      participationType: assignment.participation_type,
      scopeMode: isFullScope ? 'ALL' : 'LIMITED',
      weekdays: limitedWeekdays,
      scheduledTimes: limitedScheduledTimes,
      supportMode: assignment.support_modes[0] ?? 'ON_SITE'
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleWeekday = (weekday: Weekday) => setForm((current) => ({
    ...current,
    weekdays: current.weekdays.includes(weekday)
      ? current.weekdays.filter((value) => value !== weekday)
      : [...current.weekdays, weekday]
  }));

  const toggleScheduledTime = (scheduledTime: string) => setForm((current) => ({
    ...current,
    scheduledTimes: current.scheduledTimes.includes(scheduledTime)
      ? current.scheduledTimes.filter((value) => value !== scheduledTime)
      : [...current.scheduledTimes, scheduledTime]
  }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingTask || submitting) return;
    const duplicate = assignments.find((assignment) =>
      assignment.task_id === editingTask.task_id &&
      assignment.care_source_id === form.careSourceId &&
      assignment.assignment_id !== editingAssignmentId
    );
    if (duplicate) {
      setError('這個照顧來源已經設定在此工作中，可以直接修改目前的負責方式。');
      return;
    }
    let input;
    try {
      input = normalizeAssignmentInput(editingTask, form);
    } catch (validationError) {
      setError(validationError instanceof AssignmentValidationError
        ? validationError.message : '請確認分工資料是否完整。');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editingAssignmentId) {
        const updated = await updateCurrentAssignment(
          editingAssignmentId, editingTask.task_id, input
        );
        setAssignments((current) => current.map((assignment) =>
          assignment.assignment_id === updated.assignment_id ? updated : assignment
        ));
      } else {
        const created = await createCurrentAssignment(editingTask.task_id, input);
        setAssignments((current) => [...current, created]);
      }
      closeEditor();
    } catch (saveError) {
      console.error('Unable to save current assignment', saveError);
      setError(getAssignmentErrorMessage(saveError, 'save'));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (taskId: string, assignmentId: string) => {
    setError(null);
    try {
      await deleteCurrentAssignment(assignmentId, taskId);
      setAssignments((current) => current.filter((item) => item.assignment_id !== assignmentId));
      setPendingDelete(null);
      if (editingAssignmentId === assignmentId) closeEditor();
    } catch (deleteError) {
      console.error('Unable to delete current assignment', deleteError);
      setError(getAssignmentErrorMessage(deleteError, 'delete'));
    }
  };

  if (loading) return <main className="centered-page"><section className="status-card compact-card">正在載入目前分工…</section></main>;

  const pattern = editingTask?.occurrence_pattern;
  const assignmentMode = form.supportMode;
  const regularIncompatible = editingTask && form.participationType === 'REGULAR' &&
    !editingTask.required_support_modes.includes('FLEXIBLE') &&
    !editingTask.required_support_modes.includes(assignmentMode);

  return (
    <main className="task-setup-layout assignment-setup-layout">
      <header className="task-page-header">
        <div>
          <p className="eyebrow">{receiver?.display_name}的照顧安排</p>
          <h1>這些照顧工作，目前由誰負責？</h1>
          <p>逐項記錄平常實際的照顧分工。這裡整理的是現況，不代表中斷時已有備援。</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => navigate('/app')}>返回照顧空間</button>
      </header>

      {editingTask && (
        <section className="task-form-card assignment-editor" aria-labelledby="assignment-form-title">
          <p className="eyebrow">{editingAssignmentId ? '修改目前分工' : '新增目前分工'}</p>
          <h2 id="assignment-form-title">{editingTask.title}</h2>
          <form className="form-stack task-form" onSubmit={submit}>
            <label>目前負責來源
              <select value={form.careSourceId} disabled={submitting || Boolean(editingAssignmentId)} onChange={(event) => setForm((current) => ({ ...current, careSourceId: event.target.value }))}>
                <option value="">請選擇</option>
                {sources.map((source) => <option key={source.care_source_id} value={source.care_source_id}>{source.display_name}</option>)}
              </select>
            </label>

            <fieldset><legend>負責方式</legend><div className="choice-grid">
              {PARTICIPATION_TYPES.map((type) => <label className="choice-card horizontal" key={type}>
                <input type="radio" name="participation" checked={form.participationType === type} onChange={() => setForm((current) => ({ ...current, participationType: type }))} />
                {PARTICIPATION_TYPE_LABELS[type]}
              </label>)}
            </div></fieldset>
            {form.participationType === 'OCCASIONAL' && <p className="assignment-warning">偶爾協助不代表主要照顧者中斷時，對方已確認能接手。</p>}

            <fieldset><legend>負責範圍</legend><div className="choice-grid">
              <label className="choice-card horizontal"><input type="radio" name="scope" checked={form.scopeMode === 'ALL'} onChange={() => setForm((current) => ({ ...current, scopeMode: 'ALL', weekdays: [], scheduledTimes: [] }))} />全部時間</label>
              {pattern?.type !== 'AS_NEEDED' && <label className="choice-card horizontal"><input type="radio" name="scope" checked={form.scopeMode === 'LIMITED'} onChange={() => setForm((current) => ({ ...current, scopeMode: 'LIMITED' }))} />特定範圍</label>}
            </div></fieldset>

            {form.scopeMode === 'LIMITED' && pattern?.type === 'WEEKLY' && <fieldset><legend>負責日期</legend><div className="weekday-grid">
              {pattern.weekdays.map((day) => <label className="compact-choice" key={day}><input type="checkbox" checked={form.weekdays.includes(day)} onChange={() => toggleWeekday(day)} />週{WEEKDAY_LABELS[day]}</label>)}
            </div></fieldset>}
            {form.scopeMode === 'LIMITED' && pattern && pattern.type !== 'AS_NEEDED' && <fieldset><legend>負責時間</legend><div className="choice-grid three-columns">
              {pattern.scheduled_times.map((time) => <label className="choice-card" key={time}><input type="checkbox" checked={form.scheduledTimes.includes(time)} onChange={() => toggleScheduledTime(time)} />{time}</label>)}
            </div></fieldset>}

            <fieldset><legend>實際協助形式</legend><div className="choice-grid three-columns">
              {SUPPORT_MODES.map((mode) => <label className="choice-card" key={mode}><input type="radio" name="support" checked={form.supportMode === mode} onChange={() => setForm((current) => ({ ...current, supportMode: mode }))} />{ASSIGNMENT_SUPPORT_MODE_LABELS[mode]}</label>)}
            </div></fieldset>
            {regularIncompatible && <p className="form-message error">這個協助形式不符合此工作的需求，固定負責分工無法儲存。</p>}
            {error && <p className="form-message error" role="alert">{error}</p>}
            <div className="form-actions"><button className="primary-button" disabled={submitting || Boolean(regularIncompatible)}>{submitting ? '儲存中…' : '儲存分工'}</button><button className="secondary-button" type="button" onClick={closeEditor} disabled={submitting}>取消</button></div>
          </form>
        </section>
      )}

      <section className="assignment-task-list">
        {tasks.map((task) => {
          const taskAssignments = assignments.filter((assignment) => assignment.task_id === task.task_id);
          return <article className="assignment-task-card" key={task.task_id}>
            <div className="assignment-task-heading"><div><span className="task-category">照顧工作</span><h2>{task.title}</h2></div><button className="secondary-button" type="button" onClick={() => startCreate(task)}>＋ 新增目前負責來源</button></div>
            {taskAssignments.length === 0 ? <p className="unassigned-note">尚未設定目前負責者</p> : <div className="assignment-list">
              {taskAssignments.map((assignment) => <div className="assignment-row" key={assignment.assignment_id}>
                <div><strong>{sourceById.get(assignment.care_source_id)?.display_name ?? '未知來源'}</strong><span>{PARTICIPATION_TYPE_LABELS[assignment.participation_type]} · {describeAssignmentScope(assignment.time_scope)} · {ASSIGNMENT_SUPPORT_MODE_LABELS[assignment.support_modes[0] as SupportMode]}</span>{assignment.participation_type === 'OCCASIONAL' && <small>偶爾協助不等於已確認備援</small>}</div>
                <div className="assignment-actions"><button className="text-button" onClick={() => startEdit(task, assignment)}>編輯</button><button className="text-button danger-text" onClick={() => setPendingDelete({ taskId: task.task_id, assignmentId: assignment.assignment_id, sourceName: sourceById.get(assignment.care_source_id)?.display_name ?? '此來源' })}>移除此分工</button></div>
              </div>)}
            </div>}
          </article>;
        })}
      </section>
      {pendingDelete && (
        <section className="delete-confirmation" role="alertdialog" aria-labelledby="delete-assignment-title">
          <div>
            <strong id="delete-assignment-title">確定移除「{pendingDelete.sourceName}」的這筆分工？</strong>
            <p>只會刪除目前負責關係，照顧工作與照顧來源都會保留。</p>
          </div>
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={() => setPendingDelete(null)}>取消</button>
            <button className="primary-button danger-button" type="button" onClick={() => void remove(pendingDelete.taskId, pendingDelete.assignmentId)}>確認移除分工</button>
          </div>
        </section>
      )}
      {error && !editingTask && <p className="form-message error" role="alert">{error}</p>}
      <button className="primary-button complete-task-button" type="button" onClick={() => navigate('/app')}>完成這一步</button>
    </main>
  );
}
