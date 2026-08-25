import { Link } from 'react-router-dom';
import { effectiveInvitationStatus } from '../state/invitationWorkspaceState';
import { usePrototype } from '../state/PrototypeProvider';

export function PrototypeInvitationCredentialPage() {
  const { state, resendInvitation, revokeInvitation } = usePrototype();
  const invitation = state.invitations.find((item) => item.id === state.lastInvitationId) ?? state.invitations[0];
  if (!invitation) return <section className="v2-page"><h1>尚無邀請</h1><Link to="/v2/prototype/invitations/new">建立邀請</Link></section>;
  const status = effectiveInvitationStatus(invitation);
  return (
    <section className="v2-page">
      <header className="v2-page-heading"><p className="eyebrow">虛構 credential 展示</p><h1>同一份邀請，三種交付方式</h1><p>本 Prototype 不會傳送連結、產生可掃描 QR Code 或觸發後端狀態</p></header>
      {state.successMessage && <div className="v2-toast" role="status"><span>{state.successMessage}</span></div>}
      <div className="v2-credential-grid">
        <article className="v2-card" data-credential-id={invitation.credentialId}><span className="v2-fake-label">主要方式</span><h2>專屬邀請連結</h2><code>{invitation.linkRepresentation}</code><small>虛構展示，不可對外連線</small></article>
        <article className="v2-card" data-credential-id={invitation.credentialId}><span className="v2-fake-label">概念展示</span><h2>QR Code</h2><div className="v2-mock-qr" aria-label="QR Code 概念展示，與連結及代碼使用同一份虛構 credential"><span aria-hidden="true" /></div><small>與專屬連結使用同一 credential，目前不可掃描</small></article>
        <article className="v2-card" data-credential-id={invitation.credentialId}><span className="v2-fake-label">備用方式</span><h2>一次性代碼</h2><code>{invitation.codeRepresentation}</code><small>不會繞過登入、Email 綁定或邀請期限檢查</small></article>
      </div>
      <section className="v2-governance-note"><h2>邀請狀態：{status}</h2><p>受邀者必須登入自己的帳號並通過虛構綁定檢查，才能查看最低必要預覽</p></section>
      <div className="v2-form-actions"><Link className="primary-button" to={`/v2/prototype/invitations/${invitation.id}`}>查看受邀者預覽</Link><button className="secondary-button" type="button" disabled={status === 'ACCEPTED'} onClick={() => resendInvitation(invitation.id)}>重送虛構邀請</button><button className="text-button" type="button" disabled={status !== 'INVITED'} onClick={() => revokeInvitation(invitation.id)}>撤回</button></div>
    </section>
  );
}
