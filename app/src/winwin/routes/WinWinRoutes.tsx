import { Navigate, matchPath, useLocation } from 'react-router-dom';
import type { VerticalSliceService } from '../contracts/verticalSliceService';
import { DemoVerticalSliceService } from '../adapters/demo/DemoVerticalSliceService';
import { WinWinAppProvider } from '../state/WinWinAppProvider';
import { WinWinAppShell } from '../components/WinWinAppShell';
import { SessionEntryPage } from '../pages/SessionEntryPage';
import { MyCasesPage } from '../pages/MyCasesPage';
import '../winwin.css';

const demoService = new DemoVerticalSliceService();

export function WinWinRoutes({ service = demoService }: Readonly<{ service?: VerticalSliceService }>) {
  return (
    <WinWinAppProvider service={service}>
      <WinWinRouteContent />
    </WinWinAppProvider>
  );
}

function WinWinRouteContent() {
  const { pathname } = useLocation();
  let content;

  if (pathname === '/winwin' || pathname === '/winwin/' || pathname === '/winwin/login') {
    content = <SessionEntryPage />;
  } else if (pathname === '/winwin/cases') {
    content = <MyCasesPage />;
  } else if (matchPath('/winwin/cases/:caseId', pathname)) {
    content = <Navigate to="/winwin/cases" replace />;
  } else {
    content = <Navigate to="/winwin" replace />;
  }

  return <WinWinAppShell>{content}</WinWinAppShell>;
}
