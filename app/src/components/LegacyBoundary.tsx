import { Link, Outlet } from 'react-router-dom';

export function LegacyBoundary() {
  return (
    <div className="legacy-boundary">
      <aside className="legacy-notice" role="note" aria-label="備份心舊版流程說明">
        <div>
          <strong>備份心舊版流程</strong>
          <span>此頁僅保留作為舊版測試與歷史驗證，不代表 WinWin 現行產品流程。</span>
        </div>
        <Link to="/v2/prototype">返回 WinWin</Link>
      </aside>
      <Outlet />
    </div>
  );
}
