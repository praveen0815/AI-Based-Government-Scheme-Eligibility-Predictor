import { lazy } from "react";

export { LoginPage } from "../pages/LoginPage";
export { RegisterPage } from "../pages/RegisterPage";

export const CheckPage = lazy(() => import("../pages/CheckPage").then((module) => ({ default: module.CheckPage })));
export const HomePage = lazy(() => import("../pages/HomePage").then((module) => ({ default: module.HomePage })));
export const ResultsPage = lazy(() => import("../pages/ResultsPage").then((module) => ({ default: module.ResultsPage })));
export const SchemeDetailPage = lazy(() =>
  import("../pages/SchemeDetailPage").then((module) => ({ default: module.SchemeDetailPage })),
);
export const SchemesPage = lazy(() => import("../pages/SchemesPage").then((module) => ({ default: module.SchemesPage })));
export const EvaluationPage = lazy(() =>
  import("../pages/EvaluationPage").then((module) => ({ default: module.EvaluationPage })),
);
export const ComparePage = lazy(() => import("../pages/ComparePage").then((module) => ({ default: module.ComparePage })));
export const HistoryPage = lazy(() => import("../pages/HistoryPage").then((module) => ({ default: module.HistoryPage })));
export const NotFoundPage = lazy(() =>
  import("../pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);
export const AccountPage = lazy(() => import("../pages/AccountPage").then((module) => ({ default: module.AccountPage })));
export const SystemEvaluationPage = lazy(() =>
  import("../pages/SystemEvaluationPage").then((module) => ({ default: module.SystemEvaluationPage })),
);
export const DocumentsPage = lazy(() =>
  import("../pages/DocumentsPage").then((module) => ({ default: module.DocumentsPage })),
);
export const InsightsPage = lazy(() => import("../pages/InsightsPage").then((module) => ({ default: module.InsightsPage })));
export const ReadinessPage = lazy(() =>
  import("../pages/ReadinessPage").then((module) => ({ default: module.ReadinessPage })),
);
export const UploadsPage = lazy(() => import("../pages/UploadsPage").then((module) => ({ default: module.UploadsPage })));
export const DocumentScannerPage = lazy(() =>
  import("../pages/DocumentScannerPage").then((module) => ({ default: module.DocumentScannerPage })),
);
export const SchemeAssistantPage = lazy(() =>
  import("../pages/SchemeAssistantPage").then((module) => ({ default: module.SchemeAssistantPage })),
);
export const DashboardPage = lazy(() =>
  import("../pages/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
export const NotificationsPage = lazy(() =>
  import("../pages/NotificationsPage").then((module) => ({ default: module.NotificationsPage })),
);
export const VoiceAssistantPage = lazy(() =>
  import("../pages/VoiceAssistantPage").then((module) => ({ default: module.VoiceAssistantPage })),
);
export const WalletPage = lazy(() => import("../pages/WalletPage").then((module) => ({ default: module.WalletPage })));
export const EligibilitySimulatorPage = lazy(() =>
  import("../pages/EligibilitySimulatorPage").then((module) => ({ default: module.EligibilitySimulatorPage })),
);
export const ApplicationsPage = lazy(() =>
  import("../pages/ApplicationsPage").then((module) => ({ default: module.ApplicationsPage })),
);
export const ResearchDashboardPage = lazy(() =>
  import("../pages/ResearchDashboardPage").then((module) => ({ default: module.ResearchDashboardPage })),
);
export const AdminDashboardPage = lazy(() =>
  import("../pages/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })),
);
export const AdminUsersPage = lazy(() =>
  import("../pages/AdminUsersPage").then((module) => ({ default: module.AdminUsersPage })),
);
export const AdminUserDetailPage = lazy(() =>
  import("../pages/AdminUserDetailPage").then((module) => ({ default: module.AdminUserDetailPage })),
);
export const AdminDocumentsPage = lazy(() =>
  import("../pages/AdminDocumentsPage").then((module) => ({ default: module.AdminDocumentsPage })),
);
export const AdminEligibilityPage = lazy(() =>
  import("../pages/AdminEligibilityPage").then((module) => ({ default: module.AdminEligibilityPage })),
);
export const AdminApplicationsPage = lazy(() =>
  import("../pages/AdminApplicationsPage").then((module) => ({ default: module.AdminApplicationsPage })),
);
export const AdminSchemesPage = lazy(() =>
  import("../pages/AdminSchemesPage").then((module) => ({ default: module.AdminSchemesPage })),
);
