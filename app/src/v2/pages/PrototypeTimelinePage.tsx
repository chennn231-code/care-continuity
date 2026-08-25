import { Link, useParams } from 'react-router-dom';
import { TimelineCard } from '../components/TimelineCard';
import { usePrototype } from '../state/PrototypeProvider';
import { caseActivityForCurrentActor } from '../state/caseCollaborationSelectors';

export function PrototypeTimelinePage() {
  const { state, clearSuccess } = usePrototype();
  const { caseId = 'demo-case' } = useParams();
  const workspaceCase = state.workspaceCases.find((item) => item.id === caseId);
  const entries = caseActivityForCurrentActor(state, caseId);
  return (
    <section className="v2-page">
      <header className="v2-page-heading v2-heading-actions"><div><p className="eyebrow">{workspaceCase?.displayName}｜虛構展示個案</p><h1>照顧變化時間軸</h1><p>先保留誰在什麼時間看到什麼，再把需要處理的事情接下去</p></div><Link className="primary-button" to={`/v2/prototype/cases/${caseId}/updates/new`}>新增照顧變化</Link></header>
      {state.successMessage && <div className="v2-toast" role="status"><span>{state.successMessage}</span><button type="button" onClick={clearSuccess}>關閉提示</button></div>}
      <p className="v2-scope-note">目前只顯示這個模擬角色依單一分享路徑可見的虛構紀錄，不顯示被隱藏資料的數量</p>
      <div className="v2-timeline">{entries.map((entry) => <TimelineCard entry={entry} key={entry.id} />)}</div>
      {entries.length === 0 && <section className="v2-empty-state"><h2>目前沒有可見的個案活動</h2><p>這不代表沒有其他資料；此頁只顯示目前授權範圍內的內容。</p></section>}
    </section>
  );
}
