import { Route, Routes } from "react-router-dom";
import { PortalLayout } from "./components/PortalLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RootRedirect } from "./components/RootRedirect";
import { CheckPage } from "./pages/CheckPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResultsPage } from "./pages/ResultsPage";
import { SchemeDetailPage } from "./pages/SchemeDetailPage";
import { SchemesPage } from "./pages/SchemesPage";
import { EvaluationPage } from "./pages/EvaluationPage";
import { ComparePage } from "./pages/ComparePage";
import { HistoryPage } from "./pages/HistoryPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AccountPage } from "./pages/AccountPage";
import { SystemEvaluationPage } from "./pages/SystemEvaluationPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { InsightsPage } from "./pages/InsightsPage";
import { ReadinessPage } from "./pages/ReadinessPage";
import { UploadsPage } from "./pages/UploadsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { VoiceAssistantPage } from "./pages/VoiceAssistantPage";
import { WalletPage } from "./pages/WalletPage";
import { EligibilitySimulatorPage } from "./pages/EligibilitySimulatorPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { ResearchDashboardPage } from "./pages/ResearchDashboardPage";
import { AdminRoute } from "./components/AdminRoute";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AdminUserDetailPage } from "./pages/AdminUserDetailPage";
import { AdminDocumentsPage } from "./pages/AdminDocumentsPage";
import { AdminEligibilityPage } from "./pages/AdminEligibilityPage";
import { AdminApplicationsPage } from "./pages/AdminApplicationsPage";
import { AdminSchemesPage } from "./pages/AdminSchemesPage";

export default function App() {
  return (
    <PortalLayout>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/check" element={<CheckPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route
          path="/compare"
          element={
            <ProtectedRoute>
              <ComparePage />
            </ProtectedRoute>
          }
        />
        <Route path="/schemes" element={<SchemesPage />} />
        <Route path="/schemes/:schemeId" element={<SchemeDetailPage />} />
        <Route path="/evaluation" element={<EvaluationPage />} />
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </PortalLayout>
  );
}
