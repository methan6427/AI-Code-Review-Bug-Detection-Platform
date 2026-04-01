import { Navigate, Route, Routes } from "react-router-dom";
import { maintenanceModeEnabled } from "../config/maintenance";
import { AppLayout } from "../layouts/AppLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { AuthPage } from "../pages/AuthPage";
import { AuthCallbackPage } from "../pages/AuthCallbackPage";
import { MaintenancePage } from "../pages/MaintenancePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RepositoriesPage } from "../pages/RepositoriesPage";
import { RepositoryDetailsPage } from "../pages/RepositoryDetailsPage";
import { ScanDetailsPage } from "../pages/ScanDetailsPage";
import { ScansPage } from "../pages/ScansPage";
import { ProtectedRoute } from "../routes/ProtectedRoute";

export function App() {
  if (maintenanceModeEnabled) {
    return <MaintenancePage />;
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate replace to="/dashboard" />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/repositories" element={<RepositoriesPage />} />
          <Route path="/repositories/:repositoryId" element={<RepositoryDetailsPage />} />
          <Route path="/scans" element={<ScansPage />} />
          <Route path="/scans/:scanId" element={<ScanDetailsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
