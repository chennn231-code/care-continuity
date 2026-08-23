import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import type { CoverageEvaluationResult } from '../../engine/coverageEngine';
import { listOwnedCareReceivers, type CareReceiver } from '../lib/careReceivers';
import { listCareSources, type CareSourceRow } from '../lib/careSources';
import { listCareTasks, type CareTaskRow } from '../lib/careTasks';
import { listCurrentAssignments, type CurrentAssignmentRow } from '../lib/currentAssignments';
import { listBackupAssignments, type BackupAssignmentRow } from '../lib/backupAssignments';
import {
  defaultScenarioStart,
  buildCustomScenarioInterval,
  buildScenarioInterval,
  describeScenarioInterval,
  runPrimaryCaregiverScenario,
  SCENARIO_DURATIONS,
  SCENARIO_STATUS_LABELS,
  ScenarioContractError,
  type ScenarioDurationHours
} from '../scenario/scenarioContract';
import { describeScenarioSources } from '../scenario/scenarioPresentation';

export function ScenarioPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [receiver, setReceiver] = useState<CareReceiver | null>(null);
  const [tasks, setTasks] = useState<CareTaskRow[]>([]);
  const [sources, setSources] = useState<CareSourceRow[]>([]);
  const [assignments, setAssignments] = useState<CurrentAssignmentRow[]>([]);
  const [backups, setBackups] = useState<BackupAssignmentRow[]>([]);
  const [startLocal, setStartLocal] = useState(() => defaultScenarioStart());
  const [duration, setDuration] = useState<ScenarioDurationHours>(24);
  const [customInterval, setCustomInterval] = useState(false);
  const [endLocal, setEndLocal] = useState('');
  const [result, setResult] = useState<CoverageEvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);
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
      const taskIds = ownedTasks.map((task) => task.task_id);
      const [ownedAssignments, ownedBackups] = await Promise.all([listCurrentAssignments(taskIds), listBackupAssignments(taskIds)]);
      if (!active) return;
      setReceiver(ownedReceiver); setTasks(ownedTasks); setSources(ownedSources); setAssignments(ownedAssignments); setBackups(ownedBackups); setLoading(false);
    }).catch((loadError) => {
      console.error('Unable to load scenario data', loadError);
      if (!active) return;
      setError('目前無法讀取照顧結構，請重新整理後再試'); setLoading(false);
    });
    return () => { active = false; };
  }, [navigate]);

  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.task_id, task])), [tasks]);
  const sourceById = useMemo(() => new Map(sources.map((source) => [source.care_source_id, source.display_name])), [sources]);
  const selfSource = sources.find((source) => source.user_id === session?.user.id);
  const assignedTaskIds = useMemo(() => new Set(assignments.map((assignment) => assignment.task_id)), [assignments]);
  const unassignedTaskCount = tasks.filter((task) => !assignedTaskIds.has(task.task_id)).length;
  let intervalPreview: ReturnType<typeof buildScenarioInterval> | null = null;
  try {
    intervalPreview = customInterval
      ? buildCustomScenarioInterval(startLocal, endLocal)
      : buildScenarioInterval(startLocal, duration);
  } catch {
    intervalPreview = null;
  }

  const simulate = (event: FormEvent) => {
    event.preventDefault();
    if (!session) return;
    setError(null);
    try {
      setResult(runPrimaryCaregiverScenario({
        tasks, assignments, backups, sources, authenticatedUserId: session.user.id, startLocal,
        ...(customInterval ? { endLocal } : { durationHours: duration })
      }));
    } catch (scenarioError) {
      setResult(null);
      setError(scenarioError instanceof ScenarioContractError ? scenarioError.message : '目前無法完成模擬，請檢查照顧資料');
    }
  };

  if (loading) return <main className="centered-page"><section className="status-card compact-card">正在載入照顧結構…</section></main>;

  return (
    <main className="task-setup-layout scenario-layout">
      <header className="task-page-header">
        <div><p className="eyebrow">{receiver?.display_name}的中斷模擬</p><h1>如果明天我不能照顧呢？</h1><p>模擬主要照顧者暫時無法照顧時，看看哪些日常工作仍有人處理，以及哪些時間可能出現照顧空窗</p></div>
        <button className="secondary-button" onClick={() => navigate('/app')}>返回照顧空間</button>
      </header>

      {tasks.length === 0 ? (
        <section className="task-form-card missing-self-card">
          <h2>尚未整理照顧工作</h2>
          <p>先記下平常需要完成的照顧工作，模擬才不會把「沒有資料」誤解成沒有照顧空窗</p>
          <Link className="primary-button" to="/setup/tasks">前往照顧任務</Link>
        </section>
      ) : sources.length === 0 ? (
        <section className="task-form-card missing-self-card">
          <h2>尚未加入照顧來源</h2>
          <p>請先加入目前參與照顧的人或服務，並標示主要照顧者本人</p>
          <Link className="primary-button" to="/setup/sources">前往照顧來源設定</Link>
        </section>
      ) : !selfSource ? (
        <section className="task-form-card missing-self-card">
          <h2>尚未設定「主要照顧者本人」</h2>
          <p>請先回到照顧來源設定，將代表你本人的來源勾選為「這是我本人」，系統不會自行猜測哪一位家人是主要照顧者</p>
          <Link className="primary-button" to="/setup/sources">前往照顧來源設定</Link>
        </section>
      ) : (
        <>
          <section className="task-form-card scenario-controls">
            <p className="self-source-line">本次 unavailable source：<strong>{selfSource.display_name}</strong></p>
            {unassignedTaskCount > 0 && <div className="scenario-prerequisite-warning" role="alert">
              <strong>有 {unassignedTaskCount} 項工作尚未設定目前負責者</strong>
              <span>你仍可繼續模擬，但結果會把未記錄的現況視為沒有可確認安排</span>
              <Link to="/setup/assignments">先整理目前分工</Link>
            </div>}
            <form className="form-stack task-form" onSubmit={simulate}>
              <label>無法照顧的開始時間<input type="datetime-local" value={startLocal} onChange={(event) => { setStartLocal(event.target.value); setResult(null); }} required /></label>
              <fieldset><legend>模擬期間</legend><div className="choice-grid">
                {SCENARIO_DURATIONS.map((hours) => <label className="choice-card" key={hours}><input type="radio" name="duration" checked={!customInterval && duration === hours} onChange={() => { setCustomInterval(false); setDuration(hours); setResult(null); }} />{hours === 168 ? '7 天' : `${hours} 小時`}</label>)}
                <label className="choice-card"><input type="radio" name="duration" checked={customInterval} onChange={() => { setCustomInterval(true); setResult(null); }} />自訂期間</label>
              </div></fieldset>
              {customInterval && <label>無法照顧的結束時間<input type="datetime-local" value={endLocal} onChange={(event) => { setEndLocal(event.target.value); setResult(null); }} required /></label>}
              {intervalPreview && (() => { const details = describeScenarioInterval(intervalPreview); return <div className="scenario-prerequisite-warning"><strong>無法照顧期間</strong><span>開始　{details.start}</span><span>結束　{details.end}</span><span>共 {details.durationHours} 小時</span></div>; })()}
              <p className="field-hint">時間以 Asia/Taipei 計算，區間包含開始時間、不包含結束時間</p>
              <button className="primary-button" type="submit">開始模擬</button>
            </form>
          </section>

          {error && <p className="form-message error" role="alert">{error}</p>}
          {result && <section className="scenario-results" aria-live="polite">
            {intervalPreview && (() => { const details = describeScenarioInterval(intervalPreview); return <div className="scenario-prerequisite-warning"><strong>本次模擬期間</strong><span>{details.start} ～ {details.end}</span><span>共 {details.durationHours} 小時</span></div>; })()}
            <div className="scenario-summary">
              <div><strong>{result.summary.covered}</strong><span>已有安排可持續</span></div>
              <div><strong>{result.summary.needs_confirmation}</strong><span>需要再確認</span></div>
              <div><strong>{result.summary.coordination_only}</strong><span>只有遠端協調</span></div>
              <div><strong>{result.summary.unprepared}</strong><span>尚無準備</span></div>
            </div>
            <div className="timeline-section"><h2>固定照顧時間軸</h2>
              {result.details.length === 0 ? <p className="empty-task-state">這段期間沒有固定時間的照顧工作</p> : <div className="scenario-timeline">
                {result.details.map((item) => <article className={`scenario-result status-${item.status.toLowerCase()}`} key={`${item.task_id}-${item.scheduled_at}`}>
                  <time dateTime={item.scheduled_at}>{item.date?.slice(5).replace('-', '/')} {item.scheduled_time}</time>
                  <div><h3>{tasksById.get(item.task_id)?.title ?? '未知照顧工作'}</h3><p>{SCENARIO_STATUS_LABELS[item.status]}</p><small>{describeScenarioSources(item, sourceById, (sourceId) => console.warn('Scenario result references an unknown care source', { sourceId }))}</small></div>
                </article>)}
              </div>}
            </div>
            {result.unscheduled_considerations.length > 0 && <div className="unscheduled-section"><h2>非固定需求</h2><p>這類需求沒有固定發生時間，無法用時間軸直接判定，建議另外確認應變方式</p>
              {result.unscheduled_considerations.map((item) => <article key={item.task_id}><strong>{tasksById.get(item.task_id)?.title ?? '未知照顧工作'}</strong><span>{SCENARIO_STATUS_LABELS[item.status]}</span></article>)}
            </div>}
            <Link className="secondary-button scenario-adjust-cta" to="/setup/backups">調整備援安排</Link>
          </section>}
        </>
      )}
    </main>
  );
}
