import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  getCareReceiverErrorMessage,
  listOwnedCareReceivers,
  type CareReceiver
} from '../lib/careReceivers';
import { listCareTasks, type CareTaskRow } from '../lib/careTasks';
import { listCareSources, type CareSourceRow } from '../lib/careSources';
import { listCurrentAssignments, type CurrentAssignmentRow } from '../lib/currentAssignments';
import { listBackupAssignments, type BackupAssignmentRow } from '../lib/backupAssignments';

export function ProtectedHomePage() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiver, setReceiver] = useState<CareReceiver | null>(null);
  const [tasks, setTasks] = useState<CareTaskRow[]>([]);
  const [sources, setSources] = useState<CareSourceRow[]>([]);
  const [assignments, setAssignments] = useState<CurrentAssignmentRow[]>([]);
  const [backups, setBackups] = useState<BackupAssignmentRow[]>([]);
  const [loadingReceiver, setLoadingReceiver] = useState(true);

  useEffect(() => {
    let active = true;

    void listOwnedCareReceivers()
      .then(async (receivers) => {
        if (!active) return;
        const ownedReceiver = receivers[0] ?? null;
        setReceiver(ownedReceiver);
        if (ownedReceiver) {
          const [ownedTasks, ownedSources] = await Promise.all([
            listCareTasks(ownedReceiver.care_receiver_id),
            listCareSources(ownedReceiver.care_receiver_id)
          ]);
          if (!active) return;
          setTasks(ownedTasks);
          setSources(ownedSources);
          if (ownedTasks.length > 0) {
            const taskIds = ownedTasks.map((task) => task.task_id);
            const [ownedAssignments, ownedBackups] = await Promise.all([
              listCurrentAssignments(taskIds), listBackupAssignments(taskIds)
            ]);
            if (!active) return;
            setAssignments(ownedAssignments);
            setBackups(ownedBackups);
          }
        }
        setLoadingReceiver(false);
      })
      .catch((loadError) => {
        console.error('Unable to load care receivers', loadError);
        if (!active) return;
        setError(getCareReceiverErrorMessage('load'));
        setLoadingReceiver(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : '登出失敗，請稍後再試。');
      setSubmitting(false);
    }
  };

  if (loadingReceiver) {
    return (
      <main className="centered-page" aria-live="polite">
        <section className="status-card compact-card">正在載入照顧空間…</section>
      </main>
    );
  }

  if (!receiver && !error) return <Navigate to="/setup/receiver" replace />;

  const assignedTaskCount = new Set(assignments.map((assignment) => assignment.task_id)).size;
  const unassignedTaskCount = tasks.length - assignedTaskCount;

  return (
    <main className="centered-page app-home">
      <section className="status-card care-summary-card">
        <div className="brand-mark small" aria-hidden="true">心</div>
        <p className="eyebrow">備份心 MVP</p>
        <h1>你的照顧空間</h1>
        {receiver && (
          <div className="receiver-summary">
            <span>被照顧者</span>
            <strong>{receiver.display_name}</strong>
            <Link className="text-button receiver-edit-link" to="/setup/receiver?edit=1">修改稱呼</Link>
          </div>
        )}
        {tasks.length === 0 ? (
          <>
            <p>下一步，整理每天需要完成的照顧工作。</p>
            <Link className="primary-button next-step-button" to="/setup/tasks">
              整理照顧任務
            </Link>
          </>
        ) : (
          <>
            <div className="task-count-summary">
              <strong>{tasks.length}</strong>
              <span>項照顧工作</span>
            </div>
            <div className="home-task-preview">
              {tasks.slice(0, 3).map((task) => <span key={task.task_id}>{task.title}</span>)}
            </div>
            <Link className="secondary-button" to="/setup/tasks">查看／修改照顧任務</Link>
            {sources.length === 0 ? (
              <>
                <p>你已整理需要完成的照顧工作。下一步，加入目前參與照顧的人或服務。</p>
                <Link className="primary-button next-step-button" to="/setup/sources">
                  加入照顧來源
                </Link>
              </>
            ) : (
              <>
                <div className="structure-counts" aria-label="照顧結構摘要">
                  <div><strong>{tasks.length}</strong><span>照顧任務</span></div>
                  <div><strong>{sources.length}</strong><span>照顧來源</span></div>
                </div>
                <Link className="secondary-button" to="/setup/sources">查看／修改照顧來源</Link>
                <div className="assignment-progress" aria-label="目前分工整理進度">
                  <span>已設定目前負責者：{assignedTaskCount}</span>
                  <span>尚未設定：{unassignedTaskCount}</span>
                  <span>已建立備援安排：{backups.length}</span>
                </div>
                {unassignedTaskCount > 0 ? (
                  <p>還有 {unassignedTaskCount} 項照顧工作尚未設定目前負責者。</p>
                ) : (
                  <p>目前照顧分工已整理完成。這不代表中斷時沒有風險或已有備援。</p>
                )}
                <Link className={`${unassignedTaskCount > 0 ? 'primary-button' : 'secondary-button'} next-step-button`} to="/setup/assignments">
                  {assignments.length === 0 ? '設定目前誰負責哪些工作' : '查看／修改目前分工'}
                </Link>
                {unassignedTaskCount === 0 && (
                  <>
                    <Link className={`${backups.length ? 'secondary-button' : 'primary-button'} next-step-button`} to="/setup/backups">
                      {backups.length ? '查看／修改備援安排' : '建立備援安排'}
                    </Link>
                    {backups.length > 0 && <Link className="primary-button next-step-button scenario-entry" to="/scenario">
                      開始中斷模擬
                    </Link>}
                  </>
                )}
              </>
            )}
          </>
        )}
        {error && <p className="form-message error" role="alert">{error}</p>}
        <p className="signed-in-email">登入帳號：{session?.user.email}</p>
        <button className="secondary-button" type="button" onClick={handleSignOut} disabled={submitting}>
          {submitting ? '登出中…' : '登出'}
        </button>
      </section>
    </main>
  );
}
