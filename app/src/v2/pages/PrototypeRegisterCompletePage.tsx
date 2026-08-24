import { Link, Navigate } from 'react-router-dom';
import { IDENTITY_TYPE_LABELS, PROFESSIONAL_TYPE_OPTIONS, VERIFICATION_STATUS_LABELS } from '../data/mockData';
import { usePrototype } from '../state/PrototypeProvider';

const nextSteps = {
  SELF: '接下來可以建立個案草稿；取得適當授權前不能邀請成員或分享資料',
  FAMILY: '請等待長者本人、適當授權者或協作管理者邀請你加入個案',
  PROFESSIONAL: '你的專業身分目前尚未驗證；完成驗證並接受個案邀請後，才能查看獲授權的照顧資訊'
} as const;

export function PrototypeRegisterCompletePage() {
  const { state } = usePrototype();
  const { mode, identityType, professionalType } = state.identityDraft;
  if (!identityType) return <Navigate to="/v2/prototype/register/identity" replace />;
  const profession = PROFESSIONAL_TYPE_OPTIONS.find((option) => option.value === professionalType);
  return (
    <section className="v2-page v2-register-page">
      <header className="v2-page-heading"><p className="eyebrow">虛構註冊完成</p><h1>{mode === 'PRIMARY' ? '已記錄你的主要身分' : '已新增第二身分'}</h1><p>這不代表已完成正式 Auth、身分驗證或個案授權</p></header>
      <article className="v2-card v2-complete-card"><span>{mode === 'PRIMARY' ? '已選主要身分' : '新增身分'}</span><h2>{profession?.label ?? IDENTITY_TYPE_LABELS[identityType]}</h2><span>驗證狀態</span><strong>{VERIFICATION_STATUS_LABELS.DECLARED}</strong><hr /><h3>下一步</h3><p>{nextSteps[identityType]}</p></article>
      <div className="v2-form-actions"><Link className="primary-button" to="/v2/prototype/profile/identities">查看我的身分</Link><Link className="text-button" to="/v2/prototype">返回體驗入口</Link></div>
    </section>
  );
}
