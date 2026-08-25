import { Link } from 'react-router-dom';
import { V2_PRODUCT_LOGO, V2_PRODUCT_LOGO_ALT, V2_PRODUCT_LOGO_HEIGHT, V2_PRODUCT_LOGO_WIDTH, V2_PRODUCT_TAGLINE } from '../data/branding';
import { canCurrentActorAccessCase, prototypeDemoCaseEntryPath } from '../state/invitationWorkspaceState';
import { usePrototype } from '../state/PrototypeProvider';

export function PrototypeLandingPage() {
  const { state } = usePrototype();
  const canOpenDemoCase = canCurrentActorAccessCase(state, 'demo-case');
  return (
    <section className="v2-page v2-landing-page">
      <header className="v2-page-heading">
        <div className="v2-landing-brand">
          <img src={V2_PRODUCT_LOGO} alt={V2_PRODUCT_LOGO_ALT} width={V2_PRODUCT_LOGO_WIDTH} height={V2_PRODUCT_LOGO_HEIGHT} />
          <p>{V2_PRODUCT_TAGLINE}</p>
        </div>
        <h1>選擇你想體驗的流程</h1>
        <p>所有內容都是虛構展示，不會建立帳號、連線資料庫或保存輸入內容</p>
      </header>
      <div className="v2-choice-grid">
        <article className="v2-card">
          <span className="v2-fake-label">既有展示</span>
          <h2>照顧變化與處理事項</h2>
          <p>查看虛構個案、照顧變化、責任指派與完成流程</p>
          <Link className="primary-button" to={prototypeDemoCaseEntryPath(state)}>{canOpenDemoCase ? '體驗展示個案' : '返回我的個案'}</Link>
        </article>
        <article className="v2-card">
          <span className="v2-fake-label">新增流程</span>
          <h2>主要身分註冊</h2>
          <p>了解身分登錄、驗證、個案關係與權限之間的差異</p>
          <Link className="secondary-button" to="/v2/prototype/register">體驗註冊流程</Link>
        </article>
        <article className="v2-card">
          <span className="v2-fake-label">純前端模擬</span>
          <h2>邀請與我的個案</h2>
          <p>體驗最低必要邀請預覽、專業驗證等待、接受邀請與私人分類</p>
          <Link className="secondary-button" to="/v2/prototype/workspace">開啟我的個案</Link>
        </article>
      </div>
    </section>
  );
}
