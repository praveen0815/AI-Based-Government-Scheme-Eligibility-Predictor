import { Component, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./components/AdminRoute";
import { ErrorState } from "./components/ErrorState";
import { LoadingState } from "./components/LoadingState";
import { PortalLayout } from "./components/PortalLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RootRedirect } from "./components/RootRedirect";
import { useI18n } from "./context/LanguageContext";
import {
  AccountPage,
  AdminApplicationsPage,
  AdminDashboardPage,
  AdminDocumentsPage,
  AdminEligibilityPage,
  AdminSchemesPage,
  AdminUserDetailPage,
  AdminUsersPage,
  ApplicationsPage,
  CheckPage,
  ComparePage,
  DashboardPage,
  DocumentScannerPage,
  DocumentsPage,
  EligibilitySimulatorPage,
  EvaluationPage,
  HistoryPage,
  HomePage,
  InsightsPage,
  LoginPage,
  NotFoundPage,
  NotificationsPage,
  ReadinessPage,
  RegisterPage,
  ResearchDashboardPage,
  ResultsPage,
  SchemeAssistantPage,
  SchemeDetailPage,
  SchemesPage,
  SystemEvaluationPage,
  UploadsPage,
  VoiceAssistantPage,
  WalletPage,
} from "@pages";

class PageLoadBoundary extends Component<{ children: ReactNode; message: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <ErrorState message={this.props.message} onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

export default function App() {
  const { t } = useI18n();

  return (
    <PortalLayout>
      <PageLoadBoundary message={t.networkError}>
        <Suspense fallback={<LoadingState message={t.loadingGeneric} />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/check"
          element={
            <ProtectedRoute>
              <CheckPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <ProtectedRoute>
              <ComparePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schemes"
          element={
            <ProtectedRoute>
              <SchemesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schemes/:schemeId"
          element={
            <ProtectedRoute>
              <SchemeDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/evaluation"
          element={
            <ProtectedRoute>
              <EvaluationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/system-evaluation"
          element={
            <ProtectedRoute>
              <SystemEvaluationPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <WalletPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/insights"
          element={
            <ProtectedRoute>
              <InsightsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/readiness"
          element={
            <ProtectedRoute>
              <ReadinessPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/uploads"
          element={
            <ProtectedRoute>
              <UploadsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/document-scanner"
          element={
            <ProtectedRoute>
              <DocumentScannerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history/:historyId"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voice-assistant"
          element={
            <ProtectedRoute>
              <VoiceAssistantPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scheme-assistant"
          element={
            <ProtectedRoute>
              <SchemeAssistantPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eligibility-simulator"
          element={
            <ProtectedRoute>
              <EligibilitySimulatorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications"
          element={
            <ProtectedRoute>
              <ApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/research-dashboard"
          element={
            <ProtectedRoute>
              <ResearchDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <AdminRoute>
              <AdminUserDetailPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/documents"
          element={
            <AdminRoute>
              <AdminDocumentsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/eligibility"
          element={
            <AdminRoute>
              <AdminEligibilityPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/applications"
          element={
            <AdminRoute>
              <AdminApplicationsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/schemes"
          element={
            <AdminRoute>
              <AdminSchemesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/scheme-knowledge"
          element={<Navigate to="/admin/schemes" replace />}
        />
        <Route
          path="/admin/evaluation"
          element={
            <AdminRoute>
              <EvaluationPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/system-evaluation"
          element={
            <AdminRoute>
              <SystemEvaluationPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/research-dashboard"
          element={
            <AdminRoute>
              <ResearchDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <AdminRoute>
              <NotificationsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/voice-assistant"
          element={
            <AdminRoute>
              <VoiceAssistantPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/uploads"
          element={
            <AdminRoute>
              <UploadsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <AccountPage />
            </AdminRoute>
          }
        />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <NotFoundPage />
            </ProtectedRoute>
          }
        />
      </Routes>
        </Suspense>
      </PageLoadBoundary>
    </PortalLayout>
  );
}
