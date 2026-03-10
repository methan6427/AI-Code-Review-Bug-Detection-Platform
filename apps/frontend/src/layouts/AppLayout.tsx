import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../lib/api-client";
import { queryClient } from "../app/query-client";
import { getOAuthRedirectUrl, syncSupabaseBrowserSession } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { DashboardIcon, GithubIcon, RepositoryIcon, ScanIcon } from "../components/ui/icons";
import { cn } from "../lib/utils";
import { useToast } from "../components/ui/Toast";
import { consumeFlashFeedback, feedbackMessages } from "../lib/feedback";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { to: "/repositories", label: "Repositories", icon: RepositoryIcon },
  { to: "/scans", label: "Scans", icon: ScanIcon },
];

export function AppLayout() {
  const { session, clearAuthSession } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [githubError, setGithubError] = useState<string | null>(null);
  const meQuery = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => apiClient.getMe(),
    enabled: Boolean(session?.accessToken),
    staleTime: 30_000,
  });

  useEffect(() => {
    const flashFeedback = consumeFlashFeedback();
    if (flashFeedback) {
      pushToast(flashFeedback);
    }
  }, [pushToast]);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } finally {
      clearAuthSession();
      queryClient.clear();
      navigate("/auth");
    }
  };

  const handleConnectGithub = async () => {
    if (!session?.accessToken || !session.refreshToken) {
      return;
    }

    setGithubError(null);

    const supabase = await syncSupabaseBrowserSession({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });

    window.localStorage.setItem("ai-review-post-auth-redirect", window.location.pathname);
    pushToast(feedbackMessages.githubConnectStarted());

    const { error } = await supabase.auth.linkIdentity({
      provider: "github",
      options: {
        redirectTo: getOAuthRedirectUrl(),
      },
    });

    if (error) {
      throw error;
    }
  };

  const githubConnected = meQuery.data?.githubConnected ?? false;
  const avatarUrl = meQuery.data?.profile.avatarUrl ?? session?.user.avatarUrl ?? null;
  const profileName = session?.user.fullName || session?.user.email || "Developer";
  const initials = profileName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.1),transparent_24%),linear-gradient(180deg,#020617_0%,#020617_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/65 backdrop-blur">
          <div className="flex flex-col gap-6 px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex items-center gap-3">
                <img
                  alt="AI Review logo"
                  className="h-12 w-12 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 object-cover p-1 shadow-[0_0_30px_rgba(34,211,238,0.12)]"
                  src="/logo-trans.png"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">AI Review</p>
                <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">Operational scan dashboard</h1>
                <p className="mt-2 text-sm text-slate-400">Developer-facing visibility into repositories, scan execution, and triage momentum.</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 xl:items-end">
              <nav className="flex w-full items-center gap-2 overflow-x-auto rounded-full border border-white/10 bg-slate-900/70 p-1 xl:w-auto">
                {navigation.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition duration-200",
                        isActive
                          ? "bg-cyan-300 !text-black shadow-[0_10px_24px_rgba(34,211,238,0.2)] [&_*]:!text-black"
                          : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                      )
                    }
                  >
                    <span className="flex items-center gap-2 text-current">
                      <item.icon className="h-4 w-4 text-current" />
                      {item.label}
                    </span>
                  </NavLink>
                ))}
              </nav>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  {avatarUrl ? (
                    <img
                      alt={`${profileName} avatar`}
                      className="h-10 w-10 rounded-full border border-white/15 object-cover"
                      referrerPolicy="no-referrer"
                      src={avatarUrl}
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.07] text-sm font-semibold text-white">
                      {initials || "U"}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{profileName}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{session?.user.email}</span>
                      <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:block" />
                      <span className={cn("font-medium", githubConnected ? "text-emerald-300" : "text-slate-400")}>
                        {githubConnected ? "GitHub connected" : "GitHub not connected"}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  disabled={githubConnected || meQuery.isLoading}
                  onClick={() => {
                    void handleConnectGithub().catch((error) => {
                      setGithubError(error instanceof Error ? error.message : "Unable to connect GitHub");
                      pushToast(feedbackMessages.githubActionFailed(error instanceof Error ? error.message : undefined));
                    });
                  }}
                  title={githubConnected ? "GitHub identity linked" : "Link your GitHub account"}
                  variant="secondary"
                >
                  <GithubIcon className="h-4 w-4" />
                  {githubConnected ? "GitHub connected" : meQuery.isLoading ? "Checking GitHub..." : "Connect GitHub"}
                </Button>
                <Button variant="ghost" onClick={handleLogout}>
                  Sign out
                </Button>
              </div>
              {githubError ? <p className="text-xs text-rose-300">{githubError}</p> : null}
            </div>
          </div>
          <div className="border-t border-white/8 bg-white/[0.02] px-5 py-3 text-xs text-slate-500">
            Manual scans and GitHub-triggered runs share the same workflow surface so triage stays consistent across sources.
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
