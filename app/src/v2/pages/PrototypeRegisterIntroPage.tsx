import { Link } from 'react-router-dom';

export function PrototypeRegisterIntroPage() {
  return (
    <section className="v2-page v2-register-page">
      <header className="v2-page-heading">
        <p className="eyebrow">Prototype 註冊流程</p>
        <h1>先登錄一個主要身分</h1>
        <p>主要身分描述帳號使用者與照顧的主要關係，不等於身分已驗證，也不會自動取得任何長者個案資料</p>
      </header>
      <div className="v2-boundary-stack" aria-label="四層權限說明">
        <div><strong>1　Account Identity</strong><span>帳號自我登錄的主要身分</span></div>
        <div><strong>2　Identity Verification</strong><span>確認身分狀態，不代表個案存取權</span></div>
        <div><strong>3　Case Membership</strong><span>與特定長者個案的有效關係</span></div>
        <div><strong>4　Role Grant／Permission</strong><span>對特定目的、範圍及期間可以做什麼</span></div>
      </div>
      <p className="v2-logic-note">註冊選擇身分 ≠ 身分已驗證 ≠ 已加入個案 ≠ 已取得資料權限</p>
      <div className="v2-form-actions"><Link className="primary-button" to="/v2/prototype/register/identity">開始選擇主要身分</Link><Link className="text-button" to="/v2/prototype">返回體驗入口</Link></div>
    </section>
  );
}
