import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { listOwnedCareReceivers, type CareReceiver } from '../lib/careReceivers';
import {
  createCareTask,
  getCareTaskErrorMessage,
  listCareTasks,
  updateCareTask,
  type CareTaskRow
} from '../lib/careTasks';
import {
  describeOccurrence,
  normalizeTaskInput,
  OCCURRENCE_TYPES,
  OCCURRENCE_TYPE_LABELS,
  SUPPORT_MODES,
  SUPPORT_MODE_LABELS,
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  TaskValidationError,
  WEEKDAYS,
  WEEKDAY_LABELS,
  type OccurrenceType,
  type SupportMode,
  type TaskCategory,
  type Weekday
} from '../tasks/taskContract';

interface TaskFormState {
  title: string;
  category: TaskCategory;
  occurrenceType: OccurrenceType;
  scheduledTimes: string[];
  weekdays: Weekday[];
  supportMode: SupportMode;
}

const initialForm: TaskFormState = {
  title: '',
  category: 'MEDICATION',
  occurrenceType: 'DAILY',
  scheduledTimes: ['08:00'],
  weekdays: [],
  supportMode: 'ON_SITE'
};

function toggleValue<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function formFromTask(task: CareTaskRow): TaskFormState {
  const pattern = task.occurrence_pattern;
  return {
    title: task.title,
    category: task.category,
    occurrenceType: pattern.type,
    scheduledTimes: pattern.type === 'AS_NEEDED' ? [] : pattern.scheduled_times,
    weekdays: pattern.type === 'WEEKLY' ? pattern.weekdays : [],
    supportMode: task.required_support_modes[0] ?? 'ON_SITE'
  };
}

export function TaskSetupPage() {
  const navigate = useNavigate();
  const [receiver, setReceiver] = useState<CareReceiver | null>(null);
  const [tasks, setTasks] = useState<CareTaskRow[]>([]);
  const [form, setForm] = useState<TaskFormState>(initialForm);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void listOwnedCareReceivers()
      .then(async (receivers) => {
        if (!active) return;
        const ownedReceiver = receivers[0];
        if (!ownedReceiver) {
          navigate('/setup/receiver', { replace: true });
          return;
        }
        const existingTasks = await listCareTasks(ownedReceiver.care_receiver_id);
        if (!active) return;
        setReceiver(ownedReceiver);
        setTasks(existingTasks);
        setLoading(false);
      })
      .catch((loadError) => {
        console.error('Unable to load task setup', loadError);
        if (!active) return;
        setError(getCareTaskErrorMessage('load'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const setOccurrenceType = (occurrenceType: OccurrenceType) => {
    setForm((current) => ({
      ...current,
      occurrenceType,
      weekdays: occurrenceType === 'WEEKLY' ? current.weekdays : [],
      scheduledTimes: occurrenceType === 'AS_NEEDED' ? [] : (current.scheduledTimes.length ? current.scheduledTimes : ['08:00'])
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingTaskId(null);
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !receiver) return;

    setError(null);
    let input;
    try {
      input = normalizeTaskInput(form);
    } catch (validationError) {
      setError(
        validationError instanceof TaskValidationError
          ? validationError.message
          : '請確認照顧工作資料是否完整。'
      );
      return;
    }

    setSubmitting(true);
    try {
      if (editingTaskId) {
        const updated = await updateCareTask(receiver.care_receiver_id, editingTaskId, input);
        setTasks((current) => current.map((task) => task.task_id === updated.task_id ? updated : task));
      } else {
        const created = await createCareTask(receiver.care_receiver_id, input);
        setTasks((current) => [...current, created]);
      }
      resetForm();
    } catch (saveError) {
      console.error('Unable to save care task', saveError);
      setError(getCareTaskErrorMessage('save'));
    } finally {
      setSubmitting(false);
    }
  };

  const editTask = (task: CareTaskRow) => {
    setEditingTaskId(task.task_id);
    setForm(formFromTask(task));
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <main className="centered-page" aria-live="polite">
        <section className="status-card compact-card">正在載入照顧工作…</section>
      </main>
    );
  }

  return (
    <main className="task-setup-layout">
      <header className="task-page-header">
        <div>
          <p className="eyebrow">{receiver?.display_name}的照顧安排</p>
          <h1>平常有哪些事情需要有人協助？</h1>
          <p>
            把每天、固定日期或視情況需要處理的照顧工作整理下來，之後才能確認主要照顧者不在時，哪些事情可能沒有人接手。
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={() => navigate('/app')}>
          返回照顧空間
        </button>
      </header>

      <div className="task-setup-grid">
        <section className="task-form-card" aria-labelledby="task-form-title">
          <p className="eyebrow">{editingTaskId ? '修改照顧工作' : '新增照顧工作'}</p>
          <h2 id="task-form-title">{editingTaskId ? '調整這項工作的內容' : '先記下一件重要的事'}</h2>

          <form onSubmit={submit} className="form-stack task-form">
            <label>
              任務名稱
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                maxLength={150}
                required
                disabled={submitting}
                placeholder="例如：早上協助用藥"
              />
            </label>

            <label>
              任務類型
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as TaskCategory }))}
                disabled={submitting}
              >
                {TASK_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{TASK_CATEGORY_LABELS[category]}</option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend>發生頻率</legend>
              <div className="choice-grid three-columns">
                {OCCURRENCE_TYPES.map((type) => (
                  <label className="choice-card" key={type}>
                    <input
                      type="radio"
                      name="occurrence-type"
                      value={type}
                      checked={form.occurrenceType === type}
                      onChange={() => setOccurrenceType(type)}
                      disabled={submitting}
                    />
                    <span>{OCCURRENCE_TYPE_LABELS[type]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {form.occurrenceType === 'WEEKLY' && (
              <fieldset>
                <legend>每週日期</legend>
                <div className="weekday-grid">
                  {WEEKDAYS.map((weekday) => (
                    <label className="compact-choice" key={weekday}>
                      <input
                        type="checkbox"
                        checked={form.weekdays.includes(weekday)}
                        onChange={() => setForm((current) => ({
                          ...current,
                          weekdays: toggleValue(current.weekdays, weekday)
                        }))}
                        disabled={submitting}
                      />
                      <span>{WEEKDAY_LABELS[weekday]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {form.occurrenceType !== 'AS_NEEDED' && (
              <fieldset>
                <legend>時間</legend>
                <div className="scheduled-time-list">
                  {form.scheduledTimes.map((time, index) => (
                    <div className="scheduled-time-row" key={index}>
                      <label>
                        <span className="visually-hidden">第 {index + 1} 個時間</span>
                        <input type="text" inputMode="numeric" pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]" placeholder="08:00" value={time} onChange={(event) => setForm((current) => ({
                          ...current,
                          scheduledTimes: current.scheduledTimes.map((value, itemIndex) => itemIndex === index ? event.target.value : value)
                        }))} disabled={submitting} />
                      </label>
                      {form.scheduledTimes.length > 1 && <button className="text-button danger-text" type="button" onClick={() => setForm((current) => ({ ...current, scheduledTimes: current.scheduledTimes.filter((_, itemIndex) => itemIndex !== index) }))}>移除</button>}
                    </div>
                  ))}
                  <button className="secondary-button" type="button" onClick={() => setForm((current) => ({ ...current, scheduledTimes: [...current.scheduledTimes, '12:00'] }))}>＋ 新增另一個時間</button>
                </div>
                <p className="field-hint">若不同時間由不同人負責，建議拆成不同照顧工作，分工會更清楚。</p>
              </fieldset>
            )}

            <fieldset>
              <legend>完成這件事需要什麼形式的協助？</legend>
              <div className="choice-grid">
                {SUPPORT_MODES.map((mode) => (
                  <label className="choice-card horizontal" key={mode}>
                    <input
                      type="radio"
                      name="support-mode"
                      value={mode}
                      checked={form.supportMode === mode}
                      onChange={() => setForm((current) => ({ ...current, supportMode: mode }))}
                      disabled={submitting}
                    />
                    <span>{SUPPORT_MODE_LABELS[mode]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error && <p className="form-message error" role="alert">{error}</p>}

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={submitting || !receiver}>
                {submitting ? '儲存中…' : editingTaskId ? '儲存修改' : '加入照顧工作'}
              </button>
              {editingTaskId && (
                <button className="secondary-button" type="button" onClick={resetForm} disabled={submitting}>
                  取消修改
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="task-list-card" aria-labelledby="task-list-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">目前照顧工作</p>
              <h2 id="task-list-title">已整理 {tasks.length} 項</h2>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="empty-task-state">
              <strong>還沒有照顧工作</strong>
              <p>可以先從每天最不能中斷的一件事開始。</p>
            </div>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <article className="task-item" key={task.task_id}>
                  <div>
                    <span className="task-category">{TASK_CATEGORY_LABELS[task.category]}</span>
                    <h3>{task.title}</h3>
                    <p>{describeOccurrence(task.occurrence_pattern)}</p>
                    <p>{SUPPORT_MODE_LABELS[task.required_support_modes[0] ?? 'ON_SITE']}</p>
                  </div>
                  <button className="text-button" type="button" onClick={() => editTask(task)}>
                    修改
                  </button>
                </article>
              ))}
            </div>
          )}

          <button
            className="primary-button complete-task-button"
            type="button"
            disabled={tasks.length === 0}
            onClick={() => navigate('/app')}
          >
            完成這一步
          </button>
        </section>
      </div>
    </main>
  );
}
