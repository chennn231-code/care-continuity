import { useEffect, useRef } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { IDENTITY_TYPE_LABELS } from '../data/mockData';
import { IDENTITY_CAROUSEL_HINT } from '../data/registrationCopy';
import { usePrototype } from '../state/PrototypeProvider';
import type { PrimaryIdentityType } from '../types/prototype';

const identityOptions: Array<{ value: PrimaryIdentityType; icon: string; description: string }> = [
  { value: 'SELF', icon: '人', description: '我是接受照顧服務或希望管理自己照顧資訊的人' },
  { value: 'FAMILY', icon: '家', description: '我協助家中長者處理生活照顧、服務安排或健康相關事項' },
  { value: 'PROFESSIONAL', icon: '照', description: '我以長照、醫療、復能、營養、心理或社會工作專業參與照顧' }
];

const actionLabels: Record<PrimaryIdentityType, string> = {
  SELF: '以長者本人身分繼續',
  FAMILY: '以家屬身分繼續',
  PROFESSIONAL: '選擇我的專業身分'
};

export function PrototypeIdentitySelectionPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'secondary' ? 'SECONDARY' : 'PRIMARY';
  const { state, beginRegistration, chooseIdentityType } = usePrototype();
  const navigate = useNavigate();
  const initializedMode = useRef<string | null>(null);
  const primaryRegistrationCompleted = state.identities.some((identity) => identity.isPrimary && identity.id.startsWith('prototype-identity-'));

  useEffect(() => {
    if (initializedMode.current !== mode) {
      beginRegistration(mode);
      initializedMode.current = mode;
    }
  }, [beginRegistration, mode]);

  const selected = state.identityDraft.identityType;
  const continueFlow = () => {
    if (!selected) return;
    navigate(selected === 'PROFESSIONAL' ? '/v2/prototype/register/profession' : '/v2/prototype/register/verification');
  };

  if (mode === 'PRIMARY' && primaryRegistrationCompleted) return <Navigate to="/v2/prototype/profile/identities" replace />;

  return (
    <section className="v2-page v2-register-page">
      <header className="v2-page-heading">
        <p className="eyebrow">{mode === 'PRIMARY' ? '主要身分' : '新增第二身分'}</p>
        <h1>你與照顧的關係是什麼？</h1>
        <p>選擇最符合你目前情況的主要身分，之後仍可在「我的身分」申請新增其他身分</p>
      </header>
      <div className="v2-identity-carousel" aria-label="身分類型">
        {identityOptions.map((option, index) => (
          <button
            className={`v2-identity-card ${selected === option.value ? 'selected' : ''}`}
            type="button"
            aria-pressed={selected === option.value}
            onClick={() => chooseIdentityType(option.value)}
            key={option.value}
          >
            <span className="v2-identity-icon" aria-hidden="true">{option.icon}</span>
            <small>{index + 1}／{identityOptions.length}</small>
            <strong>{IDENTITY_TYPE_LABELS[option.value]}</strong>
            <span>{option.description}</span>
          </button>
        ))}
      </div>
      <div className="v2-carousel-dots" aria-label="三種身分類型">
        {identityOptions.map((option) => <span className={selected === option.value ? 'active' : ''} key={option.value} aria-hidden="true" />)}
      </div>
      <p className="v2-carousel-hint">{IDENTITY_CAROUSEL_HINT}</p>
      <p className="v2-logic-note">選擇身分只會建立自我登錄狀態，不會自動取得個案資料</p>
      <button className="primary-button v2-wide-action" type="button" disabled={!selected} onClick={continueFlow}>{selected ? actionLabels[selected] : '請先選擇主要身分'}</button>
    </section>
  );
}
