import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { AuthPage } from './pages/AuthPage';
import { ConfirmEmailPage } from './pages/ConfirmEmailPage';
import { ProtectedHomePage } from './pages/ProtectedHomePage';
import { ReceiverSetupPage } from './pages/ReceiverSetupPage';
import { TaskSetupPage } from './pages/TaskSetupPage';
import { SourceSetupPage } from './pages/SourceSetupPage';
import { AssignmentSetupPage } from './pages/AssignmentSetupPage';
import { ScenarioPage } from './pages/ScenarioPage';
import { BackupSetupPage } from './pages/BackupSetupPage';
import { HandoffSetupPage } from './pages/HandoffSetupPage';
import { HandoffPrintPage } from './pages/HandoffPrintPage';
import { PrototypeProvider } from './v2/state/PrototypeProvider';
import { PrototypeShell } from './v2/components/PrototypeShell';
import { PrototypeCasesPage } from './v2/pages/PrototypeCasesPage';
import { PrototypeCaseHomePage } from './v2/pages/PrototypeCaseHomePage';
import { PrototypeTimelinePage } from './v2/pages/PrototypeTimelinePage';
import { PrototypeNewUpdatePage } from './v2/pages/PrototypeNewUpdatePage';
import { PrototypeActionsPage } from './v2/pages/PrototypeActionsPage';
import { PrototypeCirclePage } from './v2/pages/PrototypeCirclePage';
import { PrototypeLandingPage } from './v2/pages/PrototypeLandingPage';
import { PrototypeRegisterIntroPage } from './v2/pages/PrototypeRegisterIntroPage';
import { PrototypeIdentitySelectionPage } from './v2/pages/PrototypeIdentitySelectionPage';
import { PrototypeProfessionPage } from './v2/pages/PrototypeProfessionPage';
import { PrototypeVerificationPage } from './v2/pages/PrototypeVerificationPage';
import { PrototypeRegisterCompletePage } from './v2/pages/PrototypeRegisterCompletePage';
import { PrototypeIdentitiesPage } from './v2/pages/PrototypeIdentitiesPage';

function AuthEntryRoute() {
  const location = useLocation();
  const hasAuthCallback =
    location.search.includes('code=') ||
    location.search.includes('error=') ||
    location.hash.includes('access_token=') ||
    location.hash.includes('error=');

  if (hasAuthCallback) {
    return <Navigate to={`/auth/confirm${location.search}${location.hash}`} replace />;
  }

  return <Navigate to="/auth" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthEntryRoute />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
      <Route path="/v2/prototype" element={<PrototypeProvider><PrototypeShell /></PrototypeProvider>}>
        <Route index element={<PrototypeLandingPage />} />
        <Route path="register" element={<PrototypeRegisterIntroPage />} />
        <Route path="register/identity" element={<PrototypeIdentitySelectionPage />} />
        <Route path="register/profession" element={<PrototypeProfessionPage />} />
        <Route path="register/verification" element={<PrototypeVerificationPage />} />
        <Route path="register/complete" element={<PrototypeRegisterCompletePage />} />
        <Route path="profile/identities" element={<PrototypeIdentitiesPage />} />
        <Route path="cases" element={<PrototypeCasesPage />} />
        <Route path="cases/demo-case" element={<PrototypeCaseHomePage />} />
        <Route path="cases/demo-case/timeline" element={<PrototypeTimelinePage />} />
        <Route path="cases/demo-case/updates/new" element={<PrototypeNewUpdatePage />} />
        <Route path="cases/demo-case/actions" element={<PrototypeActionsPage />} />
        <Route path="cases/demo-case/circle" element={<PrototypeCirclePage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/setup/receiver" element={<ReceiverSetupPage />} />
        <Route path="/setup/tasks" element={<TaskSetupPage />} />
        <Route path="/setup/sources" element={<SourceSetupPage />} />
        <Route path="/setup/assignments" element={<AssignmentSetupPage />} />
        <Route path="/setup/backups" element={<BackupSetupPage />} />
        <Route path="/setup/handoffs" element={<HandoffSetupPage />} />
        <Route path="/handoffs/print" element={<HandoffPrintPage />} />
        <Route path="/scenario" element={<ScenarioPage />} />
        <Route path="/app" element={<ProtectedHomePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
