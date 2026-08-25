import { Link } from 'react-router-dom';
import { V2_PRODUCT_DESCRIPTION } from '../data/branding';
import { canCurrentActorAccessCase } from '../state/invitationWorkspaceState';
import { usePrototype } from '../state/PrototypeProvider';

export function PrototypeCasesPage() {
  const { state } = usePrototype();
  const canOpenDemoCase = canCurrentActorAccessCase(state, 'demo-case');
  return (
    <section className="v2-page v2-cases-page">
      <header className="v2-page-heading"><p className="eyebrow">照顧協作個案</p><h1>選擇一個展示個案</h1><p>{V2_PRODUCT_DESCRIPTION}</p><p>這裡只有虛構資料，不會連線或寫入任何照顧資料庫</p><div className="v2-inline-links"><Link className="text-button" to="/v2/prototype/register">體驗主要身分註冊</Link><Link className="text-button" to="/v2/prototype/workspace">查看我的個案工作區</Link></div></header>
      {canOpenDemoCase ? <Link className="v2-card v2-case-card" to="/v2/prototype/cases/demo-case">
        <div><span className="v2-fake-label">虛構展示個案</span><h2>林奶奶</h2><p>家庭與跨角色照顧協作流程</p></div>
        <dl><div><dt>照顧圈</dt><dd>3 位成員</dd></div><div><dt>上次查看後</dt><dd>3 筆新變化</dd></div><div><dt>尚待處理</dt><dd>2 項</dd></div><div><dt>最近更新</dt><dd>今天 11:35</dd></div></dl>
        <span className="v2-link-label">開啟展示個案 →</span>
      </Link> : <section className="v2-empty-state"><h2>目前沒有可開啟的展示個案</h2><p>這裡不會顯示已失權或不存在個案的名稱與數量</p><Link className="primary-button" to="/v2/prototype/workspace">返回我的個案</Link></section>}
    </section>
  );
}
