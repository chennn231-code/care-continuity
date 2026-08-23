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
  runPrimaryCaregiverScenario,
  SCENARIO_DURATIONS,
  SCENARIO_STATUS_LABELS,
  ScenarioContractError,
  type ScenarioDurationHours
} from '../scenario/scenarioContract';

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
      setError('目前無法讀取照顧結構，請重新整理後再試。'); setLoading(false);
    });
    return () => { active = false; };
  }, [navigate]);

  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.task_id, task])), [tasks]);
  const selfSource = sources.find((source) => source.user_id === session?.user.id);

  const simulate = (event: FormEvent) => {
    event.preventDefault();
    if (!session) return;
    setError(null);
    try {
      setResult(runPrimaryCaregiverScenario({
        tasks, assignments, backups, sources, authenticatedUserId: session.user.id, startLocal, durationHours: duration
      }));
    } catch (scenarioError) {
      setResult(null);
      setError(scenarioError instanceof ScenarioContractError ? scenarioError.message : '目前無法完成模擬，請檢查照顧資料。');
    }
  };

  if (loading) return <main className="centered-page"><section className="status-card compact-card">正在載入照顧結構…</section></main>;

  return (
    <main className="task-setup-layout scenario-layout">
      <header className="task-page-header">
        <div><p className="eyebrow">{receiver?.display_name}的中斷模擬</p><h1>如果明天我不能照顧呢？</h1><p>模擬主要照顧者暫時無法照顧時，看看哪些日常工作仍有人處理，以及哪些時間可能出現照顧空窗。</p></div>
        <button className="secondary-button" onClick={() => navigate('/app')}>返回照顧空間</button>
      </header>

      {!selfSource ? (
        <section className="task-form-card missing-self-card">
          <h2>尚未設定「主要照顧者本人」</h2>
          <p>請先回到照顧來源設定，將代表你本人的來源勾選為「這是我本人」。系統不會自行猜測哪一位家人是主要照顧者。</p>
          <Link className="primary-button" to="/setup/sources">前往照顧來源設定</Link>
        </section>
      ) : (
        <>
          <section className="task-form-card scenario-controls">
            <p className="self-source-line">本次 unavailable source：<strong>{selfSource.display_name}</strong></p>
            <form className="form-stack task-form" onSubmit={simulate}>
              <label>無法照顧的開始時間<input type="text" inputMode="numeric" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}T(?:[01][0-9]|2[0-3]):[0-5][0-9]" placeholder="2026-08-25T14:00" value={startLocal} onChange={(event) => { setStartLocal(event.target.value); setResult(null); }} required /></label>
              <fieldset><legend>模擬期間</legend><div className="choice-grid three-columns">
                {SCENARIO_DURATIONS.map((hours) => <label className="choice-card" key={hours}><input type="radio" name="duration" checked={duration === hours} onChange={() => { setDuration(hours); setResult(null); }} />{hours === 168 ? '7 天' : `${hours} 小時`}</label>)}
              </div></fieldset>
              <p className="field-hint">時間以 Asia/Taipei 計算，區間包含開始時間、不包含結束時間。</p>
              <button className="primary-button" type="submit">開始模擬</button>
            </form>
          </section>

          {error && <p className="form-message error" role="alert">{error}</p>}
          {result && <section className="scenario-results" aria-live="polite">
            <div className="scenario-summary">
              <div><strong>{result.summary.covered}</strong><span>已有安排可持續</span></div>
              <div><strong>{result.summary.needs_confirmation}</strong><span>需要再確認</span></div>
              <div><strong>{result.summary.unprepared}</strong><span>目前沒有安排</span></div>
            </div>
            <div className="timeline-section"><h2>固定照顧時間軸</h2>
              {result.details.length === 0 ? <p className="empty-task-state">這段期間沒有固定時間的照顧工作。</p> : <div className="scenario-timeline">
                {result.details.map((item) => <article className={`scenario-result status-${item.status.toLowerCase()}`} key={`${item.task_id}-${item.scheduled_at}`}>
                  <time dateTime={item.scheduled_at}>{item.date?.slice(5).replace('-', '/')} {item.scheduled_time}</time>
                  <div><h3>{tasksById.get(item.task_id)?.title ?? '未知照顧工作'}</h3><p>{SCENARIO_STATUS_LABELS[item.status]}</p></div>
                </article>)}
              </div>}
            </div>
            {result.unscheduled_considerations.length > 0 && <div className="unscheduled-section"><h2>非固定需求</h2><p>這類需求沒有固定發生時間，無法用時間軸直接判定，建議另外確認應變方式。</p>
              {result.unscheduled_considerations.map((item) => <article key={item.task_id}><strong>{tasksById.get(item.task_id)?.title ?? '未知照顧工作'}</strong><span>{SCENARIO_STATUS_LABELS[item.status]}</span></article>)}
            </div>}
          </section>}
        </>
      )}
    </main>
  );
}
