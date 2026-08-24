import { Link } from 'react-router-dom';
import { REGISTRATION_BOUNDARY_LABELS } from '../data/registrationCopy';

export function PrototypeRegisterIntroPage() {
  return (
    <section className="v2-page v2-register-page">
      <header className="v2-page-heading">
        <p className="eyebrow">Prototype 註冊流程</p>
        <h1>先登錄一個主要身分</h1>
        <p>主要身分描述帳號使用者與照顧的主要關係，不等於身分已驗證，也不會自動取得任何長者個案資料</p>
      </header>
      <div className="v2-boundary-stack" aria-label="四層權限說明">
        {REGISTRATION_BOUNDARY_LABELS.map((item, index) => <div key={item.title}><strong>{index + 1}　{item.title}</strong><span>{item.description}（{item.english}）</span></div>)}
      </div>
      <p className="v2-logic-note">註冊選擇身分 ≠ 身分已驗證 ≠ 已加入個案 ≠ 已取得資料權限</p>
      <div className="v2-form-actions"><Link className="primary-button" to="/v2/prototype/register/identity">開始選擇主要身分</Link><Link className="text-button" to="/v2/prototype">返回體驗入口</Link></div>
    </section>
  );
}
