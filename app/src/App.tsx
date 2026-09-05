import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { RootEntryRoute } from './auth/RootEntryRoute';
import { LegacyLoadBoundary, LegacyLoading } from './auth/LegacyLoadBoundary';
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
import { PrototypeInvitationCreatePage } from './v2/pages/PrototypeInvitationCreatePage';
import { PrototypeInvitationCredentialPage } from './v2/pages/PrototypeInvitationCredentialPage';
import { PrototypeInvitationPreviewPage } from './v2/pages/PrototypeInvitationPreviewPage';
import { PrototypeInvitationVerificationPage } from './v2/pages/PrototypeInvitationVerificationPage';
import { PrototypeWorkspacePage } from './v2/pages/PrototypeWorkspacePage';
import { PrototypeCaseAccessGuard } from './v2/components/PrototypeCaseAccessGuard';
import { V2_GUARDED_CASE_ROUTE_SUFFIXES, type V2GuardedCaseRouteSuffix } from './v2/data/prototypeRoutes';
import { PrototypeProfessionalRecordsPage } from './v2/pages/PrototypeProfessionalRecordsPage';
import { PrototypeProfessionalRecordNewPage } from './v2/pages/PrototypeProfessionalRecordNewPage';
import { PrototypeProfessionalRecordDetailPage } from './v2/pages/PrototypeProfessionalRecordDetailPage';
import { PrototypeProfessionalRecordCorrectionPage } from './v2/pages/PrototypeProfessionalRecordCorrectionPage';
import { WinWinRoutes } from './winwin/routes/WinWinRoutes';

// Only matched Legacy routes import this module. Its AuthProvider and pages
// share the existing Supabase singleton; WinWin never loads that import chain.
function lazyLegacy(name: keyof typeof import('./auth/LegacyRoutes')) {
  return lazy(async () => ({ default: (await import('./auth/LegacyRoutes'))[name] }));
}

const LegacyLayout = lazyLegacy('LegacyLayout');
const RequireAuth = lazyLegacy('RequireAuth');
const AuthPage = lazyLegacy('AuthPage');
const ConfirmEmailPage = lazyLegacy('ConfirmEmailPage');
const ProtectedHomePage = lazyLegacy('ProtectedHomePage');
const ReceiverSetupPage = lazyLegacy('ReceiverSetupPage');
const TaskSetupPage = lazyLegacy('TaskSetupPage');
const SourceSetupPage = lazyLegacy('SourceSetupPage');
const AssignmentSetupPage = lazyLegacy('AssignmentSetupPage');
const ScenarioPage = lazyLegacy('ScenarioPage');
const BackupSetupPage = lazyLegacy('BackupSetupPage');
const HandoffSetupPage = lazyLegacy('HandoffSetupPage');
const HandoffPrintPage = lazyLegacy('HandoffPrintPage');

const v2CaseRouteElements: Record<V2GuardedCaseRouteSuffix, ReactNode> = {
  '': <PrototypeCaseHomePage />,
  timeline: <PrototypeTimelinePage />,
  'updates/new': <PrototypeNewUpdatePage />,
  actions: <PrototypeActionsPage />,
  circle: <PrototypeCirclePage />,
  records: <PrototypeProfessionalRecordsPage />,
  'records/new': <PrototypeProfessionalRecordNewPage />,
  'records/:recordId': <PrototypeProfessionalRecordDetailPage />,
  'records/:recordId/correct': <PrototypeProfessionalRecordCorrectionPage />
};

export const DEFAULT_PRODUCT_PATH = '/v2/prototype';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<RootEntryRoute />} />
      <Route path="/winwin/*" element={<WinWinRoutes />} />
      <Route path="/v2/prototype" element={<PrototypeProvider><PrototypeShell /></PrototypeProvider>}>
        <Route index element={<PrototypeLandingPage />} />
        <Route path="register" element={<PrototypeRegisterIntroPage />} />
        <Route path="register/identity" element={<PrototypeIdentitySelectionPage />} />
        <Route path="register/profession" element={<PrototypeProfessionPage />} />
        <Route path="register/verification" element={<PrototypeVerificationPage />} />
        <Route path="register/complete" element={<PrototypeRegisterCompletePage />} />
        <Route path="profile/identities" element={<PrototypeIdentitiesPage />} />
        <Route path="workspace" element={<PrototypeWorkspacePage />} />
        <Route path="invitations/new" element={<PrototypeInvitationCreatePage />} />
        <Route path="invitations/created" element={<PrototypeInvitationCredentialPage />} />
        <Route path="invitations/:invitationId/verification" element={<PrototypeInvitationVerificationPage />} />
        <Route path="invitations/:invitationId" element={<PrototypeInvitationPreviewPage />} />
        <Route path="cases" element={<PrototypeCasesPage />} />
        <Route path="cases/:caseId" element={<PrototypeCaseAccessGuard />}>
          {V2_GUARDED_CASE_ROUTE_SUFFIXES.map((path) => path
            ? <Route path={path} element={v2CaseRouteElements[path]} key={path} />
            : <Route index element={v2CaseRouteElements[path]} key="index" />)}
        </Route>
      </Route>
      <Route element={<LegacyLoadBoundary><Suspense fallback={<LegacyLoading />}><LegacyLayout /></Suspense></LegacyLoadBoundary>}>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
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
      </Route>
      <Route path="*" element={<Navigate to={DEFAULT_PRODUCT_PATH} replace />} />
    </Routes>
  );
}
