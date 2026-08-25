import { Link, Navigate, useParams } from 'react-router-dom';
import { VERIFICATION_STATUS_LABELS } from '../data/mockData';
import { usePrototype } from '../state/PrototypeProvider';
import { canViewInvitationPreview, invitationVerificationStatus } from '../state/invitationWorkspaceState';

export function PrototypeInvitationVerificationPage() {
  const { invitationId } = useParams();
  const { state, setInvitationVerification } = usePrototype();
  const invitation = state.invitations.find((item) => item.id === invitationId);
  if (!invitationId || !canViewInvitationPreview(state, invitationId)) return <Navigate to={`/v2/prototype/invitations/${invitationId ?? 'unavailable'}`} replace />;
  if (!invitation) return <section className="v2-page"><h1>找不到邀請</h1></section>;
  const verificationStatus = invitationVerificationStatus(state, invitation);
  const verificationComplete = verificationStatus === 'VERIFIED';
  return (
    <section className="v2-page v2-form-page">
      <header className="v2-page-heading"><p className="eyebrow">專業身分驗證流程</p><h1>{verificationComplete ? '驗證已完成' : '專業身分尚待驗證'}</h1><p>{verificationComplete ? '請返回邀請內容，重新確認並完成加入。' : '邀請仍在等待回應；完成身分驗證後，仍需回到邀請內容確認是否加入。'}</p></header>
      {state.successMessage && <div className="v2-toast" role="status"><span>{state.successMessage}</span></div>}
      <article className="v2-card v2-verification-card"><span>目前虛構狀態</span><h2>{VERIFICATION_STATUS_LABELS[verificationStatus]}</h2><p>本 Prototype 不收集證照、身分證、機構文件或個人資料</p><p>驗證通過後仍需回到邀請頁，重新檢查邀請期限、服務期間與權限條件</p></article>
      <div className="v2-form-actions">{!verificationComplete && <><button className="primary-button" type="button" onClick={() => setInvitationVerification(invitation.id, 'VERIFIED')}>模擬驗證通過</button><button className="secondary-button" type="button" onClick={() => setInvitationVerification(invitation.id, 'REJECTED')}>模擬驗證未通過</button></>}<Link className={verificationComplete ? 'primary-button' : 'text-button'} to={`/v2/prototype/invitations/${invitation.id}`}>{verificationComplete ? '返回邀請內容' : '返回重新檢查邀請'}</Link></div>
      <p className="v2-logic-note">此頁全為 in-memory 模擬，Migration 007 尚未實作正式專業身分驗證</p>
    </section>
  );
}
