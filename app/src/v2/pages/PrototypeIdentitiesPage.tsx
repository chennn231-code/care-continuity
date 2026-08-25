import { Link } from 'react-router-dom';
import { IDENTITY_TYPE_LABELS, PROFESSIONAL_TYPE_OPTIONS, VERIFICATION_STATUS_LABELS } from '../data/mockData';
import { usePrototype } from '../state/PrototypeProvider';

export function PrototypeIdentitiesPage() {
  const { state } = usePrototype();
  return (
    <section className="v2-page v2-register-page">
      <header className="v2-page-heading"><p className="eyebrow">我的身分</p><h1>身分與驗證狀態</h1><p>主要身分不會在每次登入時重新選擇；新增身分需從這裡提出並完成相應驗證</p></header>
      <div className="v2-identity-list">
        {state.identities.filter((identity) => identity.accountId === state.currentAccountId).map((identity) => {
          const profession = PROFESSIONAL_TYPE_OPTIONS.find((option) => option.value === identity.professionalType);
          return <article className="v2-card" key={identity.id}><div className="v2-section-title"><h2>{profession?.label ?? IDENTITY_TYPE_LABELS[identity.identityType]}</h2>{identity.isPrimary && <span className="v2-fake-label">主要身分</span>}</div><p>{VERIFICATION_STATUS_LABELS[identity.verificationStatus]}</p><small>{identity.verificationStatus === 'VERIFIED' ? '此狀態仍不代表已加入任何長者個案' : '尚不可作為已驗證身分使用'}</small></article>;
        })}
      </div>
      <p className="v2-logic-note">身分有效 ≠ 個案關係有效 ≠ 可以查看所有個案資料；每次操作仍需一條完整有效的 grant path</p>
      <div className="v2-form-actions"><Link className="primary-button" to="/v2/prototype/register/identity?mode=secondary">新增第二身分</Link><Link className="text-button" to="/v2/prototype">返回體驗入口</Link></div>
    </section>
  );
}
