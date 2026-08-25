import { Link, useParams } from 'react-router-dom';
import { DEMO_ROLE_LABELS } from '../data/mockData';
import { usePrototype } from '../state/PrototypeProvider';
import { caseActivityForCurrentActor, visibleActionsForCurrentActor, visibleCareCircleForCurrentActor, visibleQuestionsForCurrentActor } from '../state/caseCollaborationSelectors';
import { StatusPill } from '../components/PrototypeShell';

export function PrototypeCaseHomePage() {
  const { state } = usePrototype();
  const { caseId = 'demo-case' } = useParams();
  const workspaceCase = state.workspaceCases.find((item) => item.id === caseId);
  const activities = caseActivityForCurrentActor(state, caseId);
  const latest = activities[0];
  const visibleActions = visibleActionsForCurrentActor(state, caseId);
  const waiting = visibleActions.filter((item) => item.assigneeRole === state.activeRole && item.status === 'PENDING_ACCEPTANCE');
  const active = visibleActions.filter((item) => item.assigneeRole === state.activeRole && ['ACCEPTED', 'IN_PROGRESS'].includes(item.status));
  const unresolved = visibleQuestionsForCurrentActor(state, caseId).filter((item) => item.status !== 'RESOLVED');
  const members = visibleCareCircleForCurrentActor(state, caseId);
  return (
    <section className="v2-page">
      <header className="v2-page-heading v2-heading-actions"><div><p className="eyebrow">虛構展示個案</p><h1>{workspaceCase?.displayName}的照顧協作</h1><p>目前個案關係：{state.activeRole === 'NURSE' ? '日照護理服務人員（虛構）' : '家庭成員'}｜有效 grant path：{state.activeRole === 'NURSE' ? '日照護理服務紀錄與交接' : '家庭共同照顧'}</p>{state.activeRole !== 'FAMILY' && <small>目前正在使用 Prototype 權限預覽：{DEMO_ROLE_LABELS[state.activeRole]}</small>}</div><div className="v2-form-actions"><Link className="secondary-button" to={`/v2/prototype/cases/${caseId}/updates/new`}>新增照顧變化</Link>{state.activeRole === 'NURSE' && <Link className="primary-button" to={`/v2/prototype/cases/${caseId}/records/new`}>新增專業照顧紀錄</Link>}</div></header>
      <section className="v2-new-summary" aria-labelledby="new-summary-heading"><div><span>目前可見</span><strong>{activities.length}</strong><span>筆個案活動</span></div><div><h2 id="new-summary-heading">先看發生了什麼</h2><p>本 Prototype 尚未建立查看游標或公開已讀名單</p></div><Link className="secondary-button" to={`/v2/prototype/cases/${caseId}/timeline`}>查看個案活動</Link></section>
      <div className="v2-dashboard-grid">
        <section className="v2-card"><div className="v2-section-title"><h2>最近一次可見活動</h2>{latest && <StatusPill tone="active">有活動</StatusPill>}</div>{latest ? <><p className="v2-card-copy">{latest.summary}</p><small>{latest.actorLabel}｜{new Date(latest.timestamp).toLocaleString('zh-TW')}</small></> : <p>目前沒有可見活動；這不代表沒有其他未授權資料。</p>}</section>
        <section className="v2-card"><div className="v2-section-title"><h2>等待我接受</h2><strong>{waiting.length}</strong></div><p>{waiting[0]?.title ?? '目前沒有等待接受的事項'}</p><Link className="text-button" to={`/v2/prototype/cases/${caseId}/actions`}>查看處理事項</Link></section>
        <section className="v2-card"><div className="v2-section-title"><h2>處理中的事項</h2><strong>{active.length}</strong></div><p>{active[0]?.title ?? '目前沒有進行中的事項'}</p><Link className="text-button" to={`/v2/prototype/cases/${caseId}/actions`}>前往處理</Link></section>
        <section className="v2-card"><div className="v2-section-title"><h2>尚未解決的問題</h2><strong>{unresolved.length}</strong></div><p>{unresolved[0]?.text ?? '目前沒有可見且尚未解決的問題'}</p><small>有人回覆或完成事項，不會自動代表問題已解決</small></section>
        <section className="v2-card v2-circle-summary"><div className="v2-section-title"><h2>照顧圈成員</h2><strong>{members.length}</strong></div><div>{members.map((member) => <span key={member.id}>{member.name}<small>{DEMO_ROLE_LABELS[member.role]}</small></span>)}</div><Link className="text-button" to={`/v2/prototype/cases/${caseId}/circle`}>查看角色與期間</Link></section>
      </div>
    </section>
  );
}
