import { Navigate, useNavigate } from 'react-router-dom';
import { IDENTITY_TYPE_LABELS, PROFESSIONAL_TYPE_OPTIONS, VERIFICATION_STATUS_LABELS } from '../data/mockData';
import { usePrototype } from '../state/PrototypeProvider';

export function PrototypeVerificationPage() {
  const { state, completeRegistration } = usePrototype();
  const navigate = useNavigate();
  const { identityType, professionalType } = state.identityDraft;
  if (!identityType || (identityType === 'PROFESSIONAL' && !professionalType)) return <Navigate to="/v2/prototype/register/identity" replace />;
  const profession = PROFESSIONAL_TYPE_OPTIONS.find((option) => option.value === professionalType);

  const finish = () => {
    completeRegistration();
    navigate('/v2/prototype/register/complete');
  };

  return (
    <section className="v2-page v2-register-page">
      <header className="v2-page-heading"><p className="eyebrow">Identity Verification</p><h1>確認身分登錄與驗證邊界</h1><p>本頁只展示未來流程，不會驗證或上傳真實文件</p></header>
      <article className="v2-card v2-verification-card">
        <div><span>本次登錄身分</span><strong>{profession?.label ?? IDENTITY_TYPE_LABELS[identityType]}</strong></div>
        <div><span>Prototype 驗證狀態</span><strong>{VERIFICATION_STATUS_LABELS.DECLARED}</strong></div>
        {identityType === 'SELF' && <p>目前只記錄使用者聲明是本人，尚未完成法律身分驗證</p>}
        {identityType === 'FAMILY' && <p>家屬身分只代表自我登錄，仍需經適當邀請、有效個案關係及資料範圍授權</p>}
        {identityType === 'PROFESSIONAL' && <p>未驗證專業身分不能取得專業內容權限，也不能加入個案處理專業事項</p>}
      </article>
      <p className="v2-logic-note">身分驗證 ≠ Case Membership；Case Membership ≠ 查看所有資料</p>
      <div className="v2-form-actions"><button type="button" className="primary-button" onClick={finish}>完成虛構登錄</button><button type="button" className="text-button" onClick={() => navigate(-1)}>返回</button></div>
    </section>
  );
}
