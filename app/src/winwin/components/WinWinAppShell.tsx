import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useWinWinApp } from '../state/WinWinAppProvider';

export function WinWinAppShell({ children }: Readonly<{ children: ReactNode }>) {
  const { sessionState } = useWinWinApp();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPathname = useRef(pathname);
  const session = sessionState.status === 'signedIn' ? sessionState.session : undefined;

  useEffect(() => {
    if (previousPathname.current !== pathname && document.activeElement !== document.body) {
      mainRef.current?.focus();
    }
    previousPathname.current = pathname;
  }, [pathname]);

  return (
    <div className="winwin-app">
      <a className="winwin-skip-link" href="#winwin-main">跳至主要內容</a>
      <header className="winwin-header">
        <nav aria-label="WinWin 主要導覽">
          <a className="winwin-brand" href="/winwin" aria-label="WinWin 首頁">WinWin</a>
        </nav>
        {session && (
          <div className="winwin-session-summary">
            <p className="winwin-session-context">
              <span>{session.actorDisplay}</span>
              {session.relationshipDisplay && <span>{session.relationshipDisplay}</span>}
            </p>
            {session.demoMarker && <p className="winwin-demo-notice">虛構資料展示・非正式授權依據</p>}
          </div>
        )}
      </header>
      <main ref={mainRef} id="winwin-main" className="winwin-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
