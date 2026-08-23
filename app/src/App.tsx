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
      <Route element={<RequireAuth />}>
        <Route path="/setup/receiver" element={<ReceiverSetupPage />} />
        <Route path="/setup/tasks" element={<TaskSetupPage />} />
        <Route path="/setup/sources" element={<SourceSetupPage />} />
        <Route path="/setup/assignments" element={<AssignmentSetupPage />} />
        <Route path="/setup/backups" element={<BackupSetupPage />} />
        <Route path="/scenario" element={<ScenarioPage />} />
        <Route path="/app" element={<ProtectedHomePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
