import { AuthProvider } from './AuthProvider';
import { LegacyBoundary } from '../components/LegacyBoundary';

export { RequireAuth } from './RequireAuth';
export { AuthPage } from '../pages/AuthPage';
export { ConfirmEmailPage } from '../pages/ConfirmEmailPage';
export { ProtectedHomePage } from '../pages/ProtectedHomePage';
export { ReceiverSetupPage } from '../pages/ReceiverSetupPage';
export { TaskSetupPage } from '../pages/TaskSetupPage';
export { SourceSetupPage } from '../pages/SourceSetupPage';
export { AssignmentSetupPage } from '../pages/AssignmentSetupPage';
export { ScenarioPage } from '../pages/ScenarioPage';
export { BackupSetupPage } from '../pages/BackupSetupPage';
export { HandoffSetupPage } from '../pages/HandoffSetupPage';
export { HandoffPrintPage } from '../pages/HandoffPrintPage';

export function LegacyLayout() {
  return <AuthProvider><LegacyBoundary /></AuthProvider>;
}
