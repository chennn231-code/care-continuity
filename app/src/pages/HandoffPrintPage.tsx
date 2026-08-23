import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { listBackupAssignments, type BackupAssignmentRow } from '../lib/backupAssignments';
import { listOwnedCareReceivers, type CareReceiver } from '../lib/careReceivers';
import { listCareSources, type CareSourceRow } from '../lib/careSources';
import { listCareTasks, type CareTaskRow } from '../lib/careTasks';
import { listTaskHandoffs } from '../lib/taskHandoffs';
import {
  buildOfflineHandoffTaskPresentation,
  eligibleOfflineHandoffSources,
  formatOfflineTimestamp,
  offlinePackageIsDraft,
  offlineTaskCanBeSelected,
  printOfflineHandoff,
  type OfflineHandoffTaskPresentation
} from '../handoffs/offlineHandoffContract';
import type { TaskHandoffRecordContract } from '../handoffs/handoffContract';

export function HandoffPrintPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [receiver, setReceiver] = useState<CareReceiver | null>(null);
  const [tasks, setTasks] = useState<CareTaskRow[]>([]);
  const [sources, setSources] = useState<CareSourceRow[]>([]);
  const [backups, setBackups] = useState<BackupAssignmentRow[]>([]);
  const [handoffs, setHandoffs] = useState<TaskHandoffRecordContract[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [includeNotesByTask, setIncludeNotesByTask] = useState<Record<string, boolean>>({});
  const [previewTaskIds, setPreviewTaskIds] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listOwnedCareReceivers().then(async (receivers) => {
      const ownedReceiver = receivers[0];
      if (!ownedReceiver) return navigate('/setup/receiver', { replace: true });
      const [ownedTasks, ownedSources] = await Promise.all([
        listCareTasks(ownedReceiver.care_receiver_id), listCareSources(ownedReceiver.care_receiver_id)
      ]);
      const [ownedBackups, ownedHandoffs] = await Promise.all([
        listBackupAssignments(ownedTasks.map((task) => task.task_id)), listTaskHandoffs(ownedTasks)
      ]);
      if (!active) return;
      setReceiver(ownedReceiver); setTasks(ownedTasks); setSources(ownedSources); setBackups(ownedBackups); setHandoffs(ownedHandoffs); setLoading(false);
    }).catch((loadError) => {
      console.error('Unable to load offline handoff data', loadError);
      if (!active) return;
      setError('目前無法讀取交接摘要資料，請重新整理後再試'); setLoading(false);
    });
    return () => { active = false; };
  }, [navigate]);

  const eligibleSources = useMemo(() => eligibleOfflineHandoffSources(sources, session?.user.id ?? ''), [sources, session]);
  const sourceById = useMemo(() => new Map(sources.map((source) => [source.care_source_id, source])), [sources]);
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.task_id, task])), [tasks]);
  const handoffByTask = useMemo(() => new Map(handoffs.map((handoff) => [handoff.task_id, handoff])), [handoffs]);
  const relevantItems = useMemo(() => backups.filter((backup) => backup.care_source_id === sourceId).flatMap((backup) => {
    const task = taskById.get(backup.task_id);
    if (!task) return [];
    return [buildOfflineHandoffTaskPresentation(task, handoffByTask.get(task.task_id) ?? null, backup)];
  }), [backups, sourceId, taskById, handoffByTask]);
  const previewItems = previewTaskIds.flatMap((taskId) => {
    const item = relevantItems.find((candidate) => candidate.taskId === taskId);
    return item ? [item] : [];
  });
  const selectedSource = sourceById.get(sourceId) ?? null;
  const isDraft = offlinePackageIsDraft(previewItems);

  const chooseSource = (nextSourceId: string) => {
    setSourceId(nextSourceId); setSelectedTaskIds([]); setPreviewTaskIds([]); setGeneratedAt(null); setError(null);
  };
  const toggleTask = (taskId: string) => setSelectedTaskIds((current) => current.includes(taskId)
    ? current.filter((id) => id !== taskId)
    : [...current, taskId]);
  const generatePreview = (event: FormEvent) => {
    event.preventDefault();
    const allowed = relevantItems.filter(offlineTaskCanBeSelected).map((item) => item.taskId);
    const selected = selectedTaskIds.filter((taskId) => allowed.includes(taskId));
    if (!selected.length) return setError('請至少選擇一項已有交接資訊的照顧工作');
    setError(null); setPreviewTaskIds(selected); setGeneratedAt(new Date());
  };

  if (loading) return <main className="centered-page"><section className="status-card compact-card">正在準備交接摘要…</section></main>;

  return <main className="task-setup-layout offline-handoff-layout">
    <header className="task-page-header no-print"><div><p className="eyebrow">離線交接</p><h1>準備紙本交接摘要</h1><p>選擇預計接手的人或服務，以及這次需要提供的照顧工作</p></div><button className="secondary-button" type="button" onClick={() => navigate('/setup/handoffs')}>返回交接資訊</button></header>
    <section className="task-form-card offline-handoff-controls no-print">
      <form className="form-stack task-form" onSubmit={generatePreview}>
        <label>這份交接資料準備給誰<select value={sourceId} onChange={(event) => chooseSource(event.target.value)}><option value="">請選擇接手來源</option>{eligibleSources.map((source) => <option value={source.care_source_id} key={source.care_source_id}>{source.display_name}</option>)}</select></label>
        {sourceId && relevantItems.length === 0 && <p className="empty-task-state">這個照顧來源目前沒有備援安排，請先設定要由他協助的工作</p>}
        {relevantItems.length > 0 && <fieldset><legend>選擇這次要輸出的工作</legend><div className="offline-task-picker">{relevantItems.map((item) => <div className="offline-task-option" key={item.taskId}><label><input type="checkbox" checked={selectedTaskIds.includes(item.taskId)} disabled={!offlineTaskCanBeSelected(item)} onChange={() => toggleTask(item.taskId)} /><span><strong>{item.title}</strong><small>{item.backupStatusLabel}</small><small>{item.readinessLabel}</small></span></label>{item.readiness === 'NOT_PREPARED' && <Link to={`/setup/handoffs?task=${item.taskId}`}>整理交接資訊</Link>}{item.readiness !== 'NOT_PREPARED' && item.additionalNotes && <label className="offline-notes-toggle"><input type="checkbox" checked={includeNotesByTask[item.taskId] ?? false} onChange={(event) => setIncludeNotesByTask((current) => ({ ...current, [item.taskId]: event.target.checked }))} />包含必要補充說明</label>}</div>)}</div></fieldset>}
        <p className="field-hint">產生摘要不代表對方已收到、閱讀、理解或同意接手</p>
        {error && <p className="form-message error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={!sourceId || relevantItems.length === 0}>產生列印預覽</button>
      </form>
    </section>

    {generatedAt && selectedSource && previewItems.length > 0 && <section className={`offline-handoff-preview${isDraft ? ' is-draft' : ''}`} aria-label="交接摘要列印預覽">
      <div className="offline-print-actions no-print"><p>請確認摘要只包含接手者完成這些工作需要知道的資訊</p><button className="primary-button" type="button" onClick={() => printOfflineHandoff()}>列印摘要／另存 PDF</button></div>
      <header className="offline-document-header"><p className="eyebrow">備份心</p><h1>{isDraft ? '交接資訊草稿' : '照顧工作交接摘要'}</h1>{isDraft && <p className="offline-draft-warning">部分交接資訊尚待補充，此份文件為草稿</p>}<dl><div><dt>被照顧者</dt><dd>{receiver?.display_name}</dd></div><div><dt>預計接手來源</dt><dd>{selectedSource.display_name}</dd></div><div><dt>摘要產生時間</dt><dd>{formatOfflineTimestamp(generatedAt)}</dd></div></dl><p className="offline-version-warning">使用前請確認此份交接資訊是否仍為目前版本</p></header>
      <div className="offline-document-tasks">{previewItems.map((item, index) => <OfflineTaskSummary key={item.taskId} item={item} index={index + 1} includeNotes={includeNotesByTask[item.taskId] ?? false} />)}</div>
      <footer className="offline-document-footer"><p>若 App 內容已更新，請停止使用舊版紙本並重新產生摘要</p><p>產生或列印摘要不代表接手者已收到、閱讀、理解或同意接手</p></footer>
    </section>}
  </main>;
}

function OfflineTaskSummary({ item, index, includeNotes }: { item: OfflineHandoffTaskPresentation; index: number; includeNotes: boolean }) {
  return <article className="offline-task-summary">
    <header><span>工作 {index}</span><h2>{item.title}</h2><p>{item.categoryLabel}｜{item.occurrenceLabel}</p></header>
    <section><h3>接手安排</h3><p>{item.backupStatusLabel}</p>{item.backupStatusLabel.includes('尚未確認') && <p className="offline-draft-warning">對方可能還不知道這項安排</p>}</section>
    <section><h3>工作需要的協助</h3><p>{item.supportModesLabel}</p></section>
    <section><h3>交接資訊</h3><p className="handoff-readiness-line">{item.readinessLabel}</p>{item.fields.length ? <dl>{item.fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl> : <p>尚無可供接手者使用的交接內容</p>}{includeNotes && item.additionalNotes && <div className="offline-additional-notes"><strong>必要補充說明</strong><p>{item.additionalNotes}</p></div>}{item.medicationSafetyNote && <p className="offline-medication-warning">{item.medicationSafetyNote}</p>}</section>
    <section className="offline-freshness"><p>{item.updatedAt ? `交接內容最後更新：${formatOfflineTimestamp(item.updatedAt)}` : '尚無交接內容更新時間'}</p><p>{item.reviewedAt ? `主要照顧者最後確認：${formatOfflineTimestamp(item.reviewedAt)}` : '主要照顧者尚未確認目前內容仍適用'}</p><small>此確認由主要照顧者記錄，不代表接手者或專業人員已確認</small></section>
  </article>;
}
