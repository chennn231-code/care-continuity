import { ACTION_STATUS_LABELS, DEMO_ROLE_LABELS, QUESTION_STATUS_LABELS } from '../data/mockData';
import { StatusPill } from '../components/PrototypeShell';
import { usePrototype } from '../state/PrototypeProvider';
import type { ActionStatus } from '../types/prototype';
import { useParams } from 'react-router-dom';
import { currentActorCanViewQuestion, visibleActionsForCurrentActor } from '../state/caseCollaborationSelectors';
import { currentPrototypeAssigneeProjection, demoActionOperationAvailability, demoQuestionOperationAvailability } from '../state/prototypeState';

const nextStep: Partial<Record<ActionStatus, { status: ActionStatus; label: string }>> = {
  PENDING_ACCEPTANCE: { status: 'ACCEPTED', label: '接受這項指派' },
  ACCEPTED: { status: 'IN_PROGRESS', label: '開始處理' },
  IN_PROGRESS: { status: 'COMPLETED', label: '標示處理完成' }
};

export function PrototypeActionsPage() {
  const { state, moveAction, markQuestionResolved, clearSuccess } = usePrototype();
  const { caseId = 'demo-case' } = useParams();
  const caseActions = visibleActionsForCurrentActor(state, caseId);
  return (
    <section className="v2-page">
      <header className="v2-page-heading"><p className="eyebrow">責任與進度</p><h1>處理事項</h1><p>指派、接受、開始處理與完成是不同階段</p></header>
      {state.successMessage && <div className="v2-toast" role="status"><span>{state.successMessage}</span><button type="button" onClick={clearSuccess}>關閉提示</button></div>}
      <div className="v2-principles"><span>指派不等於接受</span><span>接受不等於開始處理</span><span>事項完成不會自動解決問題</span></div>
      <div className="v2-action-list">{caseActions.map((action) => {
        const step = nextStep[action.status];
        const canAct = step && demoActionOperationAvailability(state, action.id, step.status).allowed;
        const assignee = currentPrototypeAssigneeProjection(state, action.id);
        const question = state.questions.find((item) => item.id === action.linkedQuestionId && currentActorCanViewQuestion(state, item));
        return <article className="v2-card v2-action-card" id={`action-${action.id}`} key={action.id}>
          <div className="v2-card-heading"><div><StatusPill tone={action.status === 'COMPLETED' ? 'complete' : action.status === 'PENDING_ACCEPTANCE' ? 'pending' : 'active'}>{ACTION_STATUS_LABELS[action.status]}</StatusPill><h2>{action.title}</h2></div>{assignee?.displayRole && <strong>{DEMO_ROLE_LABELS[assignee.displayRole]}</strong>}</div>
          <p>{action.detail}</p><dl className="v2-meta-grid"><div><dt>目前虛構負責人</dt><dd>{assignee?.displayName ?? '目前沒有負責人'}</dd></div><div><dt>期限</dt><dd>{new Date(action.dueAt).toLocaleString('zh-TW')}</dd></div></dl>
          {canAct && step ? <button className="primary-button" type="button" onClick={() => moveAction(action.id, step.status)}>{step.label}</button> : <p className="v2-scope-note">目前具體參與者的虛構授權路徑不能執行這一步</p>}
          {question && <section className="v2-linked-question" id={`question-${question.id}`}><h3>相關問題</h3><p>{question.text}</p><p>問題狀態：<strong>{QUESTION_STATUS_LABELS[question.status]}</strong></p>{question.status !== 'RESOLVED' && demoQuestionOperationAvailability(state, question.id).allowed && <button className="secondary-button" type="button" onClick={() => markQuestionResolved(question.id)}>標示問題已解決</button>}</section>}
        </article>;
      })}</div>
      {caseActions.length === 0 && <section className="v2-empty-state"><h2>目前沒有可見的處理事項</h2><p>此頁不顯示未授權事項或其數量。</p></section>}
      <section className="v2-card v2-status-reference"><h2>其他狀態</h2><div><StatusPill>已拒絕</StatusPill><StatusPill tone="pending">需要重新指派</StatusPill><StatusPill>已取消</StatusPill></div><p>這些狀態在本輪只展示文案，不提供模擬操作</p></section>
    </section>
  );
}
