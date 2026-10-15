import { lazy, ReactNode, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { UndoToastProvider } from "./undo/UndoToastContext";
import { ConfirmProvider } from "./confirm/ConfirmContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import AdminRoute from "./auth/AdminRoute";
import LoginPage from "./pages/LoginPage";

// Each page (and the charts, maps and PDF libraries it pulls in) is its own
// chunk, so the first load only downloads the page actually being opened.
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const MonthlyReportViewPage = lazy(() => import("./pages/MonthlyReportViewPage"));
const ProjectCloseoutReportPage = lazy(() => import("./pages/ProjectCloseoutReportPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const LessonsLearnedPage = lazy(() => import("./pages/LessonsLearnedPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const TaskTemplatesPage = lazy(() => import("./pages/TaskTemplatesPage"));

// Only the path, not ?tab= changes, so switching tabs doesn't jump the page.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      Loading…
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UndoToastProvider>
          <ConfirmProvider>
            <ScrollToTop />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Protected><DashboardPage /></Protected>} />
                <Route
                  path="/projects/:id"
                  element={<Protected><ProjectDetailPage /></Protected>}
                />
                <Route
                  path="/projects/:projectId/reports/:reportId"
                  element={<Protected><MonthlyReportViewPage /></Protected>}
                />
                <Route
                  path="/projects/:id/closeout-report"
                  element={<Protected><ProjectCloseoutReportPage /></Protected>}
                />
                <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />
                <Route
                  path="/lessons-learned"
                  element={<Protected><LessonsLearnedPage /></Protected>}
                />
                <Route
                  path="/task-templates"
                  element={<Protected><TaskTemplatesPage /></Protected>}
                />
                <Route
                  path="/admin/users"
                  element={
                    <AdminRoute>
                      <AdminUsersPage />
                    </AdminRoute>
                  }
                />
              </Routes>
            </Suspense>
          </ConfirmProvider>
        </UndoToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
