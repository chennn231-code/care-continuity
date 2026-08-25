import { Link, useParams } from 'react-router-dom';
import { DEMO_ROLE_LABELS } from '../data/mockData';
import { usePrototype } from '../state/PrototypeProvider';
import { visibleTimelineEntries } from '../state/prototypeState';
import { StatusPill } from '../components/PrototypeShell';

export function PrototypeCaseHomePage() {
  const { state } = usePrototype();
  const { caseId = 'demo-case' } = useParams();
  const latest = visibleTimelineEntries(state, state.activeRole, caseId)[0];
  const waiting = state.actions.filter((item) => item.caseId === caseId && item.assigneeRole === state.activeRole && item.status === 'PENDING_ACCEPTANCE');
  const active = state.actions.filter((item) => item.caseId === caseId && item.assigneeRole === state.activeRole && ['ACCEPTED', 'IN_PROGRESS'].includes(item.status));
  const unresolved = state.questions.filter((item) => item.status !== 'RESOLVED');
  return (
    <section className="v2-page">
      <header className="v2-page-heading v2-heading-actions"><div><p className="eyebrow">虛構展示個案</p><h1>林奶奶的照顧協作</h1><p>目前個案關係：{state.activeRole === 'NURSE' ? '日照護理服務人員（虛構）' : '家庭成員'}｜有效 grant path：{state.activeRole === 'NURSE' ? '日照護理服務紀錄與交接' : '家庭共同照顧'}</p>{state.activeRole !== 'FAMILY' && <small>目前正在使用 Prototype 權限預覽：{DEMO_ROLE_LABELS[state.activeRole]}</small>}</div><div className="v2-form-actions"><Link className="secondary-button" to="/v2/prototype/cases/demo-case/updates/new">新增照顧變化</Link>{state.activeRole === 'NURSE' && <Link className="primary-button" to="/v2/prototype/cases/demo-case/records/new">新增專業照顧紀錄</Link>}</div></header>
      <section className="v2-new-summary" aria-labelledby="new-summary-heading"><div><span>上次查看後</span><strong>3</strong><span>筆新變化</span></div><div><h2 id="new-summary-heading">先看發生了什麼</h2><p>時間軸成功載入時才會更新本人的查看位置，本 Prototype 不建立公開已讀名單</p></div><Link className="secondary-button" to="/v2/prototype/cases/demo-case/timeline">查看照顧變化</Link></section>
      <div className="v2-dashboard-grid">
        <section className="v2-card"><div className="v2-section-title"><h2>最近一次照顧變化</h2><StatusPill tone="active">有更新</StatusPill></div>{latest && <><p className="v2-card-copy">{latest.summary}</p><small>{DEMO_ROLE_LABELS[latest.authorRole]}｜{latest.source}</small></>}</section>
        <section className="v2-card"><div className="v2-section-title"><h2>等待我接受</h2><strong>{waiting.length}</strong></div><p>{waiting[0]?.title ?? '目前沒有等待接受的事項'}</p><Link className="text-button" to="/v2/prototype/cases/demo-case/actions">查看處理事項</Link></section>
        <section className="v2-card"><div className="v2-section-title"><h2>處理中的事項</h2><strong>{active.length}</strong></div><p>{active[0]?.title ?? '目前沒有進行中的事項'}</p><Link className="text-button" to="/v2/prototype/cases/demo-case/actions">前往處理</Link></section>
        <section className="v2-card"><div className="v2-section-title"><h2>尚未解決的問題</h2><strong>{unresolved.length}</strong></div><p>{unresolved[0]?.text}</p><small>有人回覆或完成事項，不會自動代表問題已解決</small></section>
        <section className="v2-card v2-circle-summary"><div className="v2-section-title"><h2>照顧圈成員</h2><strong>{state.members.length}</strong></div><div>{state.members.map((member) => <span key={member.id}>{member.name}<small>{DEMO_ROLE_LABELS[member.role]}</small></span>)}</div><Link className="text-button" to="/v2/prototype/cases/demo-case/circle">查看角色與期間</Link></section>
      </div>
    </section>
  );
}
