import { useParams } from 'react-router-dom';
import { DEMO_ROLE_LABELS } from '../data/mockData';
import { StatusPill } from '../components/PrototypeShell';
import { usePrototype } from '../state/PrototypeProvider';
import { visibleCareCircleForCurrentActor } from '../state/caseCollaborationSelectors';

export function PrototypeCirclePage() {
  const { state } = usePrototype();
  const { caseId = 'demo-case' } = useParams();
  const workspaceCase = state.workspaceCases.find((item) => item.id === caseId);
  const members = visibleCareCircleForCurrentActor(state, caseId);
  return (
    <section className="v2-page">
      <header className="v2-page-heading"><p className="eyebrow">{workspaceCase?.displayName}｜虛構展示個案</p><h1>照顧圈</h1><p>每個人只依目前關係、目的、範圍與期間參與這個個案</p></header>
      <div className="v2-circle-list">{members.map((member) => <article className="v2-card" key={member.id}><div className="v2-card-heading"><div><span className="v2-member-avatar" aria-hidden="true">{member.name.slice(0, 1)}</span><h2>{member.name}</h2></div><StatusPill tone={member.status === 'EXPIRING' ? 'pending' : 'active'}>{member.status === 'EXPIRING' ? '即將到期' : '啟用中'}</StatusPill></div><dl className="v2-meta-grid"><div><dt>關係／角色</dt><dd>{member.relationship}｜{DEMO_ROLE_LABELS[member.role]}</dd></div>{member.purpose && <div><dt>服務目的</dt><dd>{member.purpose}</dd></div>}{member.scopeSummary && <div><dt>分享範圍摘要</dt><dd>{member.scopeSummary}</dd></div>}{member.validFrom && <div><dt>有效期間</dt><dd>{member.validFrom} 至 {member.validUntil ?? '未設定結束日'}</dd></div>}</dl></article>)}</div>
      {members.length === 0 && <section className="v2-empty-state"><h2>目前沒有可顯示的成員摘要</h2><p>成員資訊依目前協作目的與權限最小化顯示。</p></section>}
      <section className="v2-governance-note" role="note"><h2>這一頁目前只展示 UI</h2><ul><li>管理身分不代表能查看所有敏感資料</li><li>專業人員權限會依服務期間結束</li><li>同一機構的其他人員不會自動取得個案資料</li><li>這不是正式權限控制或身分驗證</li></ul></section>
    </section>
  );
}
