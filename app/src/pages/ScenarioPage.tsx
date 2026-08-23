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
  formatHandoffTimestamp,
  HANDOFF_READINESS_LABELS,
  type TaskHandoffRecordContract
} from '../handoffs/handoffContract';
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
import {
  buildScenarioHandoffPresentation,
  describeScenarioSources,
  loadScenarioHandoffs,
  SCENARIO_HANDOFF_CTA_LABELS,
  summarizeScenarioHandoffs
} from '../scenario/scenarioPresentation';

export function ScenarioPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [receiver, setReceiver] = useState<CareReceiver | null>(null);
  const [tasks, setTasks] = useState<CareTaskRow[]>([]);
  const [sources, setSources] = useState<CareSourceRow[]>([]);
  const [assignments, setAssignments] = useState<CurrentAssignmentRow[]>([]);
  const [backups, setBackups] = useState<BackupAssignmentRow[]>([]);
  const [handoffs, setHandoffs] = useState<TaskHandoffRecordContract[]>([]);
  const [handoffLoadFailed, setHandoffLoadFailed] = useState(false);
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
      const [ownedAssignments, ownedBackups, handoffResult] = await Promise.all([
        listCurrentAssignments(taskIds),
        listBackupAssignments(taskIds),
        loadScenarioHandoffs(ownedTasks)
      ]);
      if (!active) return;
      setReceiver(ownedReceiver); setTasks(ownedTasks); setSources(ownedSources); setAssignments(ownedAssignments); setBackups(ownedBackups);
      setHandoffs(handoffResult.handoffs); setHandoffLoadFailed(handoffResult.failed); setLoading(false);
    }).catch((loadError) => {
      console.error('Unable to load scenario data', loadError);
      if (!active) return;
      setError('目前無法讀取照顧結構，請重新整理後再試'); setLoading(false);
    });
    return () => { active = false; };
  }, [navigate]);

  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.task_id, task])), [tasks]);
  const sourceById = useMemo(() => new Map(sources.map((source) => [source.care_source_id, source.display_name])), [sources]);
  const handoffByTask = useMemo(() => new Map(handoffs.map((handoff) => [handoff.task_id, handoff])), [handoffs]);
  const handoffPresentationByTask = useMemo(() => new Map(tasks.map((task) => [
    task.task_id,
    buildScenarioHandoffPresentation(task, handoffByTask.get(task.task_id) ?? null)
  ])), [tasks, handoffByTask]);
  const selfSource = sources.find((source) => source.user_id === session?.user.id);
  const assignedTaskIds = useMemo(() => new Set(assignments.map((assignment) => assignment.task_id)), [assignments]);
  const unassignedTaskCount = tasks.filter((task) => !assignedTaskIds.has(task.task_id)).length;
  const resultTaskIds = result
    ? [...result.details.map((item) => item.task_id), ...result.unscheduled_considerations.map((item) => item.task_id)]
    : [];
  const handoffSummary = summarizeScenarioHandoffs(resultTaskIds, handoffPresentationByTask);
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
            {handoffLoadFailed ? <div className="scenario-handoff-load-error" role="status">目前無法讀取交接資訊狀態，接手安排仍可正常模擬</div> : <section className="scenario-handoff-summary">
              <h2>本次模擬涉及的交接資訊</h2>
              <div>
                <p><strong>{handoffSummary.NOT_PREPARED}</strong><span>尚未整理</span></p>
                <p><strong>{handoffSummary.NEEDS_DETAILS}</strong><span>尚待補充</span></p>
                <p><strong>{handoffSummary.READY_TO_SHARE}</strong><span>已整理，可提供接手者確認</span></p>
              </div>
            </section>}
            <div className="timeline-section"><h2>固定照顧時間軸</h2>
              {result.details.length === 0 ? <p className="empty-task-state">這段期間沒有固定時間的照顧工作</p> : <div className="scenario-timeline">
                {result.details.map((item) => { const handoff = handoffPresentationByTask.get(item.task_id); return <article className={`scenario-result status-${item.status.toLowerCase()}`} key={`${item.task_id}-${item.scheduled_at}`}>
                  <time dateTime={item.scheduled_at}>{item.date?.slice(5).replace('-', '/')} {item.scheduled_time}</time>
                  <div><h3>{tasksById.get(item.task_id)?.title ?? '未知照顧工作'}</h3>
                    <div className="scenario-result-section"><strong>接手安排</strong><p>{SCENARIO_STATUS_LABELS[item.status]}</p><small>{describeScenarioSources(item, sourceById, (sourceId) => console.warn('Scenario result references an unknown care source', { sourceId }))}</small></div>
                    <div className="scenario-result-section"><strong>交接資訊</strong>{handoffLoadFailed || !handoff ? <p>交接資訊狀態暫時無法確認</p> : <><p>{HANDOFF_READINESS_LABELS[handoff.readiness]}</p>{handoff.updatedAt && <small>最後更新：{formatHandoffTimestamp(handoff.updatedAt)}</small>}<Link className="scenario-handoff-cta" to={`/setup/handoffs?task=${item.task_id}`}>{SCENARIO_HANDOFF_CTA_LABELS[handoff.readiness]}</Link></>}</div>
                  </div>
                </article>; })}
              </div>}
            </div>
            {result.unscheduled_considerations.length > 0 && <div className="unscheduled-section"><h2>非固定需求</h2><p>這類需求沒有固定發生時間，無法用時間軸直接判定，建議另外確認應變方式</p>
              {result.unscheduled_considerations.map((item) => { const handoff = handoffPresentationByTask.get(item.task_id); return <article key={item.task_id}><div><strong>{tasksById.get(item.task_id)?.title ?? '未知照顧工作'}</strong><span>{SCENARIO_STATUS_LABELS[item.status]}</span></div><div><strong>交接資訊</strong><span>{handoffLoadFailed || !handoff ? '交接資訊狀態暫時無法確認' : HANDOFF_READINESS_LABELS[handoff.readiness]}</span>{!handoffLoadFailed && handoff && <Link to={`/setup/handoffs?task=${item.task_id}`}>{SCENARIO_HANDOFF_CTA_LABELS[handoff.readiness]}</Link>}</div></article>; })}
            </div>}
            <Link className="secondary-button scenario-adjust-cta" to="/setup/backups">調整備援安排</Link>
          </section>}
        </>
      )}
    </main>
  );
}
