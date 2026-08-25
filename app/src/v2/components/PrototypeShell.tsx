import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { V2_DOCUMENT_TITLE, V2_PRODUCT_LOGO, V2_PRODUCT_LOGO_ALT, V2_PRODUCT_LOGO_HEIGHT, V2_PRODUCT_LOGO_WIDTH, V2_PROTOTYPE_NOTICE } from '../data/branding';
import { DEMO_ROLE_LABELS, IDENTITY_TYPE_LABELS, VERIFICATION_STATUS_LABELS } from '../data/mockData';
import { usePrototype } from '../state/PrototypeProvider';
import type { DemoRole } from '../types/prototype';
import { canCurrentActorAccessCase, canViewInvitationPreview } from '../state/invitationWorkspaceState';

const roles = Object.keys(DEMO_ROLE_LABELS) as DemoRole[];

export function shouldShowAccountSummary(pathname: string) {
  return !pathname.startsWith('/v2/prototype/register') || pathname.endsWith('/complete');
}

export function PrototypeShell() {
  const { state, setRole } = usePrototype();
  const location = useLocation();
  const caseId = location.pathname.match(/^\/v2\/prototype\/cases\/([^/]+)/)?.[1];
  const isCaseRoute = Boolean(caseId && canCurrentActorAccessCase(state, caseId));
  const invitationId = location.pathname.match(/^\/v2\/prototype\/invitations\/(?!new$|created$)([^/]+)/)?.[1];
  const showAccountSummary = shouldShowAccountSummary(location.pathname) && (!invitationId || canViewInvitationPreview(state, invitationId));
  const primaryIdentity = state.identities.find((identity) => identity.accountId === state.currentAccountId && identity.isPrimary);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = V2_DOCUMENT_TITLE;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="v2-prototype">
      <a className="v2-skip-link" href="#v2-main">跳到主要內容</a>
      <header className="v2-topbar">
        <Link className="v2-brand" to="/v2/prototype" aria-label="返回 WinWin v2 流程展示首頁"><img src={V2_PRODUCT_LOGO} alt={V2_PRODUCT_LOGO_ALT} width={V2_PRODUCT_LOGO_WIDTH} height={V2_PRODUCT_LOGO_HEIGHT} /></Link>
        {showAccountSummary && <Link className="v2-account-summary" to="/v2/prototype/profile/identities"><span>主要身分</span><strong>{primaryIdentity ? IDENTITY_TYPE_LABELS[primaryIdentity.identityType] : '尚未登錄'}</strong><small>{primaryIdentity ? VERIFICATION_STATUS_LABELS[primaryIdentity.verificationStatus] : '前往體驗註冊'}</small></Link>}
      </header>
      <div className="v2-prototype-notice" role="note"><strong>{V2_PROTOTYPE_NOTICE}</strong><small>本 Prototype 不代表正式身分、個案關係或權限驗證</small></div>
      {isCaseRoute && <><div className="v2-case-context"><span>目前個案關係：{state.activeRole === 'NURSE' ? '日照護理服務人員（虛構）' : state.activeRole === 'DAY_CARE' ? '日照服務人員（虛構）' : '家庭成員'}</span><span>身分狀態：已驗證</span><span>資料權限：依此個案的一條完整有效 grant path</span></div><details className="v2-permission-preview">
        <summary>Prototype 權限預覽工具</summary>
        <p>僅供展示，不代表使用者可任意更換身分，也不是每次登入都要選擇</p>
        <div className="v2-demo-role" role="group" aria-label="Prototype 模擬檢視角色">
          {roles.map((role) => <button type="button" className={state.activeRole === role ? 'active' : ''} aria-pressed={state.activeRole === role} onClick={() => setRole(role)} key={role}>{DEMO_ROLE_LABELS[role]}</button>)}
        </div>
      </details><nav className="v2-case-nav" aria-label="展示個案導覽">
        <NavLink to={`/v2/prototype/cases/${caseId}`} end>個案首頁</NavLink>
        <NavLink to={`/v2/prototype/cases/${caseId}/timeline`}>照顧變化</NavLink>
        <NavLink to={`/v2/prototype/cases/${caseId}/actions`}>處理事項</NavLink>
        <NavLink to={`/v2/prototype/cases/${caseId}/circle`}>照顧圈</NavLink>
        <NavLink to={`/v2/prototype/cases/${caseId}/records`}>專業紀錄</NavLink>
      </nav></>}
      <main id="v2-main" className="v2-main"><Outlet /></main>
    </div>
  );
}

export function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'pending' | 'active' | 'complete' }) {
  return <span className={`v2-status v2-status-${tone}`}>{children}</span>;
}
