import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../lib/api-client";
import { queryClient } from "../app/query-client";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/utils";

const navigation = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/repositories", label: "Repositories" },
  { to: "/scans", label: "Scans" },
];

export function AppLayout() {
  const { session, clearAuthSession } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } finally {
      clearAuthSession();
      queryClient.clear();
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.1),transparent_24%),linear-gradient(180deg,#020617_0%,#020617_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/60 px-5 py-4 backdrop-blur xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">AI Code Review Platform</p>
            <h1 className="mt-2 text-xl font-semibold text-white">Operational scan dashboard</h1>
          </div>
          <div className="flex flex-col gap-3 xl:items-end">
            <nav className="flex w-full items-center gap-2 overflow-x-auto rounded-full border border-white/10 bg-slate-900/70 p-1 xl:w-auto">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "whitespace-nowrap rounded-full px-4 py-2 text-sm transition",
                      isActive ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="text-left sm:text-right">
                <p className="text-sm text-white">{session?.user.fullName || session?.user.email}</p>
                <p className="text-xs text-slate-500">{session?.user.email}</p>
              </div>
              <Button variant="secondary" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
