import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { canManageCaseInvitations, effectiveInvitationStatus, invitationVerificationStatus, invitationsForCurrentAccount, managerReassignmentItems, searchVisibleWorkspaceCases, waitingStartWorkspaceCases } from '../state/invitationWorkspaceState';
import { canCreateProfessionalRecord } from '../state/professionalRecordState';
import { usePrototype } from '../state/PrototypeProvider';
import { caseActivityForCurrentActor, visibleActionsForCurrentActor } from '../state/caseCollaborationSelectors';

export function PrototypeWorkspacePage() {
  const { state, removeCaseAccess, resendInvitation, toggleCaseTag } = usePrototype();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const visibleCases = useMemo(() => searchVisibleWorkspaceCases(state, query).filter((item) => !tagFilter || state.privateTagAssignments.some((assignment) => assignment.caseId === item.id && assignment.tagId === tagFilter)), [query, state, tagFilter]);
  const waitingCases = waitingStartWorkspaceCases(state);
  const accountInvitations = invitationsForCurrentAccount(state);
  const pendingInvitations = accountInvitations.filter((item) => effectiveInvitationStatus(item) === 'INVITED');
  const unavailableInvitations = accountInvitations.filter((item) => effectiveInvitationStatus(item) !== 'INVITED' && item.status !== 'ACCEPTED');
  const openProfessionalRecords = (caseId: string) => {
    navigate(`/v2/prototype/cases/${caseId}/records`);
  };
  return (
    <section className="v2-page v2-workspace-page">
      <header className="v2-page-heading v2-heading-actions"><div><p className="eyebrow">個人工作區概念</p><h1>我的個案</h1><p>只顯示目前身分與個案關係允許查看的虛構個案，搜尋不會探測無權個案</p></div><Link className="primary-button" to="/v2/prototype/invitations/new">建立虛構邀請</Link></header>
      {state.successMessage && <div className="v2-toast" role="status"><span>{state.successMessage}</span></div>}
      <section className="v2-workspace-tools" aria-label="個案搜尋與私人分類"><label>搜尋我可見的個案<input type="search" placeholder="輸入顯示名稱、角色或服務來源" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="v2-private-tag-filter"><button type="button" className={!tagFilter ? 'active' : ''} onClick={() => setTagFilter(null)}>全部個案</button>{state.privateTags.map((tag) => <button type="button" className={tagFilter === tag.id ? 'active' : ''} onClick={() => setTagFilter(tag.id)} key={tag.id}>{tag.label}</button>)}</div><small>私人標籤只有你看得到，只用於整理個案，不是協作群組或授權來源</small></section>
      <div className="v2-workspace-layout">
        <section><div className="v2-section-title"><h2>目前可見的個案</h2><strong>{visibleCases.length}</strong></div><div className="v2-workspace-cases">{visibleCases.map((item) => {
          const assigned = state.privateTagAssignments.filter((assignment) => assignment.caseId === item.id).map((assignment) => assignment.tagId);
          const reassignmentItems = managerReassignmentItems(state, item.id);
          const canCreateRecord = canCreateProfessionalRecord(state, item.id);
          const visibleActions = visibleActionsForCurrentActor(state, item.id).filter((action) => !['COMPLETED', 'CANCELLED', 'DECLINED'].includes(action.status));
          const latestActivity = caseActivityForCurrentActor(state, item.id)[0];
          return <article className="v2-card v2-workspace-case" key={item.id}><div className="v2-section-title"><div><span className="v2-fake-label">虛構個案</span><h3>{item.displayName}</h3></div><span className={`v2-status ${item.accessStatus === 'EXPIRING' ? 'v2-status-pending' : 'v2-status-active'}`}>{item.accessStatus === 'EXPIRING' ? '即將到期' : '有效關係'}</span></div><p>{item.relationshipLabel}｜{item.serviceSource}</p><dl className="v2-meta-grid"><div><dt>目前可見待處理事項</dt><dd>{visibleActions.length} 項</dd></div><div><dt>最近可見活動</dt><dd>{latestActivity ? new Date(latestActivity.displayTimestamp).toLocaleString('zh-TW') : '目前沒有可見活動'}</dd></div><div><dt>服務結束</dt><dd>{item.serviceEndsAt ?? '未設定'}</dd></div></dl>{reassignmentItems.length > 0 && <section className="v2-manager-reassignment" role="status"><strong>{reassignmentItems.length} 項處理事項需要重新指派</strong>{reassignmentItems.map(({ action, history }) => <div key={action.id}><span>{action.title}</span><small>{history?.summary ?? '原責任週期已結束'}；尚未指定新負責人</small></div>)}</section>}<fieldset className="v2-tag-picker"><legend>私人標籤・只有你看得到</legend>{state.privateTags.map((tag) => <label key={tag.id}><input type="checkbox" checked={assigned.includes(tag.id)} onChange={() => toggleCaseTag(item.id, tag.id)} />{tag.label}</label>)}</fieldset><small className="v2-private-tag-note">只用於整理個案，不會新增或延長任何權限</small><div className="v2-form-actions"><Link className="secondary-button" to={`/v2/prototype/cases/${item.id}`}>開啟虛構個案</Link>{canCreateRecord && <button className="secondary-button" type="button" onClick={() => openProfessionalRecords(item.id)}>新增專業照顧紀錄</button>}<button className="text-button" type="button" onClick={() => removeCaseAccess(item.id, 'EXPIRED')}>模擬服務到期</button></div></article>;
        })}</div>{visibleCases.length === 0 && <p className="v2-empty-state">目前的可見集合中沒有符合條件的個案，不顯示其他個案的數量或名稱</p>}</section>
        <aside className="v2-workspace-side"><section className="v2-card"><div className="v2-section-title"><h2>等待我回應的邀請</h2><strong>{pendingInvitations.length}</strong></div>{pendingInvitations.slice(0, 3).map((item) => <Link className="v2-workspace-link" to={`/v2/prototype/invitations/${item.id}`} key={item.id}><span>{item.maskedCaseDisplayName}</span><small>{item.roleLabel}｜{item.recipientType === 'PROFESSIONAL' && invitationVerificationStatus(state, item) !== 'VERIFIED' ? '等待身分驗證' : '可查看預覽'}</small></Link>)}</section><section className="v2-card"><h2>已接受，等待服務開始</h2>{waitingCases.map((item) => <div className="v2-waiting-relationship" key={item.id}><strong>{item.displayName.slice(0, 1)}○○長輩</strong><span>{item.relationshipLabel}</span><small>{item.serviceStartsAt} 開始，目前不顯示個案內容或待辦數量</small></div>)}</section>{unavailableInvitations.length > 0 && <section className="v2-card"><h2>邀請狀態展示</h2><p>逾期由目前時間衍生判定，不等待背景排程改寫狀態</p>{unavailableInvitations.slice(0, 2).map((item) => <div className="v2-waiting-relationship" key={item.id}><strong>{item.maskedCaseDisplayName}</strong><span>{effectiveInvitationStatus(item) === 'EXPIRED' ? '已逾期' : effectiveInvitationStatus(item) === 'DECLINED' ? '已拒絕' : '已撤回'}</span>{canManageCaseInvitations(state, item.caseId) && <button className="text-button" type="button" onClick={() => resendInvitation(item.id)}>重送新的虛構 credential</button>}</div>)}</section>}</aside>
      </div>
      <p className="v2-logic-note">拒絕、安全預覽、重送、專業驗證與私人分類均為 in-memory Prototype 模擬，不代表 Migration 007、Supabase 或 Production 已支援</p>
    </section>
  );
}
