import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import { useAuth } from "../hooks/useAuth";
import { validateAuthForm } from "../features/auth/validation";
import { getSupabaseBrowserClient, isSupabaseOAuthConfigured } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

type Mode = "login" | "signup";
const postAuthRedirectKey = "ai-review-post-auth-redirect";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const { isAuthenticated, setAuthSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setError(null);
  }, [mode]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateAuthForm({ mode, email, password, fullName });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload =
        mode === "login"
          ? await apiClient.login({ email: email.trim().toLowerCase(), password })
          : await apiClient.signup({ email: email.trim().toLowerCase(), password, fullName: fullName.trim() });
      setAuthSession(payload);
      const nextRoute = (location.state as { from?: string } | null)?.from ?? "/dashboard";
      navigate(nextRoute, { replace: true });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubAuth = async () => {
    if (!isSupabaseOAuthConfigured) {
      setError("GitHub OAuth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the frontend env.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("GitHub OAuth client is unavailable");
      return;
    }

    setGithubLoading(true);
    setError(null);

    try {
      const nextRoute = (location.state as { from?: string } | null)?.from ?? "/dashboard";
      window.localStorage.setItem(postAuthRedirectKey, nextRoute);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: "http://localhost:5173/auth/callback",
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Unable to start GitHub sign-in");
      setGithubLoading(false);
    }
  };

  if (isAuthenticated) {
    const nextRoute = (location.state as { from?: string } | null)?.from ?? "/dashboard";
    return <Navigate replace to={nextRoute} />;
  }

  const validationMessage = validateAuthForm({ mode, email, password, fullName });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_22%),linear-gradient(180deg,#020617_0%,#020617_100%)] px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/60 p-8 backdrop-blur sm:p-10">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_60%)] lg:block" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">Developer SaaS workspace</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Review repositories, surface scan context, and triage issues with developer-grade clarity.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
            This app already supports end-to-end repository and scan workflows. The interface now focuses on making those workflows feel credible, readable, and production-ready for engineering teams.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Repository coverage</p>
              <p className="mt-3 text-2xl font-semibold text-white">Manual + GitHub</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Track the source and branch behind every scan without changing the core flow.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Actionable findings</p>
              <p className="mt-3 text-2xl font-semibold text-white">Clear triage states</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Resolve, reopen, or ignore issues with stronger context around severity and ownership.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Scan reporting</p>
              <p className="mt-3 text-2xl font-semibold text-white">Status-aware UX</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Queue state, retries, source type, and timeline events stay visible during review.</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">Premium dark UI</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Built for engineering teams</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Responsive and maintainable</span>
          </div>
        </div>
        <Card className="p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300/90">Secure access</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{mode === "login" ? "Sign in to your workspace" : "Create your workspace account"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {mode === "login"
                ? "Continue into your repository and scan dashboard."
                : "Create an account to manage repositories, scans, and findings in one place."}
            </p>
          </div>
          <div className="mb-6 flex rounded-full border border-white/10 bg-slate-950/70 p-1">
            <button
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${mode === "login" ? "bg-cyan-300 text-slate-950 shadow-[0_10px_24px_rgba(34,211,238,0.18)]" : "text-slate-300 hover:text-white"}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Sign in
            </button>
            <button
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-cyan-300 text-slate-950 shadow-[0_10px_24px_rgba(34,211,238,0.18)]" : "text-slate-300 hover:text-white"}`}
              onClick={() => setMode("signup")}
              type="button"
            >
              Create account
            </button>
          </div>
          <form className="space-y-4" noValidate onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Full name</label>
                <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ada Lovelace" />
              </div>
            ) : null}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Email</label>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.dev" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <span className="text-xs text-slate-500">{mode === "login" ? "Use your existing account password" : "Minimum 8 characters"}</span>
              </div>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 8 characters" />
            </div>
            {error ? <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
            {!error && validationMessage ? <p className="text-sm text-amber-300">{validationMessage}</p> : null}
            <Button className="w-full" disabled={loading || Boolean(validationMessage)} type="submit">
              {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-950 px-3 text-xs uppercase tracking-[0.3em] text-slate-500">or</span>
              </div>
            </div>
            <Button className="w-full" disabled={githubLoading} onClick={handleGitHubAuth} type="button" variant="secondary">
              {githubLoading ? "Redirecting to GitHub..." : "Continue with GitHub"}
            </Button>
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
              <p className="font-medium text-slate-200">Why GitHub sign-in matters</p>
              <p className="mt-1 leading-6">
                Use GitHub to streamline repository connection, installation-backed imports, and future pull request triggered scans.
              </p>
            </div>
            {!isSupabaseOAuthConfigured ? (
              <p className="text-xs text-slate-500">GitHub OAuth becomes available after adding the frontend Supabase env variables.</p>
            ) : null}
          </form>
        </Card>
      </div>
    </div>
  );
}
