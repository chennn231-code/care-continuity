import { Link, Navigate, useParams } from 'react-router-dom';
import { VERIFICATION_STATUS_LABELS } from '../data/mockData';
import { usePrototype } from '../state/PrototypeProvider';
import { canViewInvitationPreview } from '../state/invitationWorkspaceState';

export function PrototypeInvitationVerificationPage() {
  const { invitationId } = useParams();
  const { state, setInvitationVerification } = usePrototype();
  const invitation = state.invitations.find((item) => item.id === invitationId);
  if (!invitationId || !canViewInvitationPreview(state, invitationId)) return <Navigate to={`/v2/prototype/invitations/${invitationId ?? 'unavailable'}`} replace />;
  if (!invitation) return <section className="v2-page"><h1>找不到邀請</h1></section>;
  return (
    <section className="v2-page v2-form-page">
      <header className="v2-page-heading"><p className="eyebrow">專業身分等待流程</p><h1>專業身分尚未可用</h1><p>邀請仍維持 INVITED；PENDING_VERIFICATION 是身分驗證狀態，不是新的 Invitation 狀態</p></header>
      {state.successMessage && <div className="v2-toast" role="status"><span>{state.successMessage}</span></div>}
      <article className="v2-card v2-verification-card"><span>目前虛構狀態</span><h2>{VERIFICATION_STATUS_LABELS[invitation.professionalVerificationStatus]}</h2><p>本 Prototype 不收集證照、身分證、機構文件或個人資料</p><p>驗證通過後仍需回到邀請頁，重新檢查邀請期限、服務期間與權限條件</p></article>
      <div className="v2-form-actions"><button className="primary-button" type="button" onClick={() => setInvitationVerification(invitation.id, 'VERIFIED')}>模擬驗證通過</button><button className="secondary-button" type="button" onClick={() => setInvitationVerification(invitation.id, 'REJECTED')}>模擬驗證未通過</button><Link className="text-button" to={`/v2/prototype/invitations/${invitation.id}`}>返回重新檢查邀請</Link></div>
      <p className="v2-logic-note">此頁全為 in-memory 模擬，Migration 007 尚未實作正式專業身分驗證</p>
    </section>
  );
}
