import { Link, Outlet, useParams } from 'react-router-dom';
import { canCurrentActorAccessCase } from '../state/invitationWorkspaceState';
import { usePrototype } from '../state/PrototypeProvider';

export function PrototypeCaseAccessGuard() {
  const { caseId } = useParams();
  const { state } = usePrototype();

  if (!caseId || !canCurrentActorAccessCase(state, caseId)) {
    return (
      <section className="v2-page v2-access-denied-page">
        <header className="v2-page-heading">
          <p className="eyebrow">個案存取</p>
          <h1>目前無法存取此個案</h1>
          <p>此頁不會說明個案是否存在、關係是否到期或權限是否遭撤銷</p>
        </header>
        <Link className="primary-button" to="/v2/prototype/workspace">返回我的個案</Link>
        <p className="v2-logic-note">前端 access guard 只用於 Prototype 流程展示，不是正式安全邊界；正式系統仍須由 Supabase RLS 與後端授權共同強制執行</p>
      </section>
    );
  }

  return <Outlet />;
}
