import { useNavigate } from 'react-router-dom';
import { PROFESSIONAL_TYPE_OPTIONS, PROFESSIONAL_VERIFICATION_HINT } from '../data/mockData';
import { usePrototype } from '../state/PrototypeProvider';

export function PrototypeProfessionPage() {
  const { state, chooseProfessionalType } = usePrototype();
  const navigate = useNavigate();
  const selected = state.identityDraft.professionalType;
  const categories = Array.from(new Set(PROFESSIONAL_TYPE_OPTIONS.map((option) => option.category)));

  return (
    <section className="v2-page v2-register-page">
      <header className="v2-page-heading"><p className="eyebrow">專業身分類型</p><h1>選擇你的專業身分</h1><p>本 Prototype 不收集證照、身分證、機構文件或其他真實個人資料</p></header>
      <div className="v2-profession-groups">
        {categories.map((category) => <fieldset key={category}><legend>{category}</legend><div className="v2-profession-grid">
          {PROFESSIONAL_TYPE_OPTIONS.filter((option) => option.category === category).map((option) => <label className={`v2-profession-card ${selected === option.value ? 'selected' : ''}`} key={option.value}>
            <input type="radio" name="profession" value={option.value} checked={selected === option.value} onChange={() => chooseProfessionalType(option.value)} />
            <strong>{option.label}</strong><small>{PROFESSIONAL_VERIFICATION_HINT}</small>
          </label>)}
        </div></fieldset>)}
      </div>
      <p className="v2-logic-note">職稱登錄不代表已完成證照或機構關係驗證，也不會自動取得 WinWin 個案協作管理權</p>
      <div className="v2-form-actions"><button className="primary-button" type="button" disabled={!selected} onClick={() => navigate('/v2/prototype/register/verification')}>查看驗證狀態</button><button className="text-button" type="button" onClick={() => navigate(-1)}>返回</button></div>
    </section>
  );
}
