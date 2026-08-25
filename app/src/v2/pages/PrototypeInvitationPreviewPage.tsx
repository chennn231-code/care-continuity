import { Link, useNavigate, useParams } from 'react-router-dom';
import { canAcceptInvitation, canViewInvitationPreview, effectiveInvitationStatus, invitationForPreview, invitationVerificationStatus } from '../state/invitationWorkspaceState';
import { usePrototype } from '../state/PrototypeProvider';
import { VERIFICATION_STATUS_LABELS } from '../data/mockData';

const invitationLabels = { INVITED: '等待回應', ACCEPTED: '已接受', DECLINED: '已拒絕', REVOKED: '已撤回', EXPIRED: '已逾期' } as const;

export function PrototypeInvitationPreviewPage() {
  const { invitationId } = useParams();
  const navigate = useNavigate();
  const { state, acceptInvitation, declineInvitation, simulateInvitationLogin } = usePrototype();
  const invitation = invitationId ? invitationForPreview(state, invitationId) : null;
  if (!invitationId || !canViewInvitationPreview(state, invitationId)) {
    return <section className="v2-page v2-invitation-login-page"><header className="v2-page-heading"><p className="eyebrow">WinWin 邀請</p><h1>這是一份 WinWin 邀請</h1><p>登入前不顯示個案、邀請者、角色、服務日期或分享範圍</p></header><button className="primary-button" type="button" onClick={() => invitationId && simulateInvitationLogin(invitationId)}>模擬登入／註冊</button><p className="v2-logic-note">此按鈕只模擬登入與 Email 綁定概念檢查，不會建立帳號或連線後端</p></section>;
  }
  if (!invitation) return <section className="v2-page"><h1>目前無法開啟此邀請</h1><Link to="/v2/prototype/workspace">返回我的個案</Link></section>;
  const status = effectiveInvitationStatus(invitation);
  const verificationStatus = invitationVerificationStatus(state, invitation);
  const needsVerification = invitation.recipientType === 'PROFESSIONAL' && verificationStatus !== 'VERIFIED';
  const accept = () => {
    if (needsVerification) return navigate(`/v2/prototype/invitations/${invitation.id}/verification`);
    acceptInvitation(invitation.id);
    navigate('/v2/prototype/workspace');
  };
  return (
    <section className="v2-page v2-invitation-preview-page">
      <header className="v2-page-heading"><p className="eyebrow">已使用虛構帳號登入</p><h1>確認是否加入這個照顧圈</h1><p>以下只是確認沒有加錯個案所需的最低必要資訊，不含照顧內容</p></header>
      {state.successMessage && <div className="v2-toast" role="status"><span>{state.successMessage}</span></div>}
      <article className="v2-card v2-invitation-preview-card">
        <div className="v2-section-title"><div><span className="v2-fake-label">虛構邀請</span><h2>{invitation.maskedCaseDisplayName}</h2></div><strong>{invitationLabels[status]}</strong></div>
        <dl className="v2-meta-grid"><div><dt>邀請者</dt><dd>{invitation.inviterName}</dd></div><div><dt>邀請身分</dt><dd>{invitation.roleLabel}</dd></div><div><dt>邀請目的</dt><dd>{invitation.purpose}</dd></div><div><dt>分享範圍摘要</dt><dd>{invitation.scopeSummary}</dd></div><div><dt>服務期間</dt><dd>{invitation.serviceStartsAt} 至 {invitation.serviceEndsAt}</dd></div><div><dt>身分驗證</dt><dd>{invitation.recipientType === 'PROFESSIONAL' ? VERIFICATION_STATUS_LABELS[verificationStatus] : '不代表個案權限'}</dd></div></dl>
        <p className="v2-scope-note">預覽不顯示時間軸、問題、事項、其他成員、Email 綁定細節或其他個案</p>
      </article>
      <div className="v2-form-actions"><button className="primary-button" type="button" disabled={status !== 'INVITED' || (!needsVerification && !canAcceptInvitation(state, invitation))} onClick={accept}>{needsVerification ? '先查看專業驗證狀態' : '接受邀請'}</button><button className="secondary-button" type="button" disabled={status !== 'INVITED'} onClick={() => declineInvitation(invitation.id)}>拒絕邀請</button><Link className="text-button" to="/v2/prototype/workspace">返回我的個案</Link></div>
    </section>
  );
}
