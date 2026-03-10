import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute() {
  const { isAuthenticated, isHydrating } = useAuth();
  const location = useLocation();

  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_22%),linear-gradient(180deg,#020617_0%,#020617_100%)] px-4 py-10">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/60 p-8 text-center backdrop-blur">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300" />
          <p className="mt-4 text-sm text-slate-300">Restoring your workspace session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
