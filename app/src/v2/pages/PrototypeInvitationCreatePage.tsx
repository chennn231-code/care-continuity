import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrototype } from '../state/PrototypeProvider';
import type { InvitationRecipientType } from '../types/prototype';

export function PrototypeInvitationCreatePage() {
  const navigate = useNavigate();
  const { createInvitation } = usePrototype();
  const [recipientType, setRecipientType] = useState<InvitationRecipientType>('FAMILY');
  const [purpose, setPurpose] = useState('家庭照顧協作');
  const [scopeSummary, setScopeSummary] = useState('共同照顧與直接參與事項');
  const [serviceStartsAt, setServiceStartsAt] = useState('2026-08-25');
  const [serviceEndsAt, setServiceEndsAt] = useState('2026-11-30');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createInvitation({
      caseId: 'demo-case',
      caseDisplayName: '林奶奶',
      recipientType,
      roleLabel: recipientType === 'PROFESSIONAL' ? '護理師' : '家屬／家庭照顧者',
      purpose,
      scopeSummary,
      serviceStartsAt,
      serviceEndsAt
    });
    navigate('/v2/prototype/invitations/created');
  };

  return (
    <section className="v2-page v2-form-page">
      <header className="v2-page-heading"><p className="eyebrow">協作管理者流程</p><h1>邀請成員加入照顧圈</h1><p>本頁只產生虛構 credential，不會寄信、建立帳號或寫入後端</p></header>
      <form className="v2-card form-stack v2-invitation-form" onSubmit={submit}>
        <div className="v2-invitation-case"><span>虛構個案</span><strong>林奶奶</strong><small>邀請能力來自個案層級 grant，不來自家屬關係或專業職稱</small></div>
        <fieldset><legend>邀請類型</legend><div className="v2-segmented-choice">
          <label><input type="radio" name="recipient" checked={recipientType === 'FAMILY'} onChange={() => setRecipientType('FAMILY')} />家屬／家庭照顧者</label>
          <label><input type="radio" name="recipient" checked={recipientType === 'PROFESSIONAL'} onChange={() => { setRecipientType('PROFESSIONAL'); setPurpose('皮膚狀況追蹤與護理建議'); }} />專業照顧人員</label>
        </div></fieldset>
        <label>邀請目的<input value={purpose} onChange={(event) => setPurpose(event.target.value)} required /></label>
        <label>分享範圍摘要<select value={scopeSummary} onChange={(event) => setScopeSummary(event.target.value)}><option>共同照顧與直接參與事項</option><option>家庭限定與共同照顧資訊</option></select></label>
        <div className="v2-form-row"><label>服務開始日<input type="date" value={serviceStartsAt} onChange={(event) => setServiceStartsAt(event.target.value)} required /></label><label>服務結束日<input type="date" value={serviceEndsAt} min={serviceStartsAt} onChange={(event) => setServiceEndsAt(event.target.value)} required /></label></div>
        <p className="v2-logic-note">專屬連結、QR Code 與一次性代碼只是同一份邀請 credential 的展示方式，本身不授權</p>
        <button className="primary-button" type="submit">產生虛構邀請</button>
      </form>
    </section>
  );
}
