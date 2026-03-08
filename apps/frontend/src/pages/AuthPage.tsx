import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import { useAuth } from "../hooks/useAuth";
import { validateAuthForm } from "../features/auth/validation";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

type Mode = "login" | "signup";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  if (isAuthenticated) {
    const nextRoute = (location.state as { from?: string } | null)?.from ?? "/dashboard";
    return <Navigate replace to={nextRoute} />;
  }

  const validationMessage = validateAuthForm({ mode, email, password, fullName });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_22%),linear-gradient(180deg,#020617_0%,#020617_100%)] px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-8 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Production-style CV project</p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight text-white">
            Review repositories, simulate scans, and present believable engineering findings.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-slate-400">
            This MVP is built for authenticated scan workflows today, with explicit seams reserved for GitHub OAuth, PR webhooks, background workers, and LLM-backed analysis later.
          </p>
        </div>
        <Card className="p-6 sm:p-8">
          <div className="mb-6 flex rounded-full border border-white/10 bg-slate-950/70 p-1">
            <button
              className={`flex-1 rounded-full px-4 py-2 text-sm ${mode === "login" ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Sign in
            </button>
            <button
              className={`flex-1 rounded-full px-4 py-2 text-sm ${mode === "signup" ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}
              onClick={() => setMode("signup")}
              type="button"
            >
              Create account
            </button>
          </div>
          <form className="space-y-4" noValidate onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <div>
                <label className="mb-2 block text-sm text-slate-400">Full name</label>
                <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ada Lovelace" />
              </div>
            ) : null}
            <div>
              <label className="mb-2 block text-sm text-slate-400">Email</label>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.dev" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Password</label>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 8 characters" />
            </div>
            {error ? <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
            {!error && validationMessage ? <p className="text-sm text-amber-300">{validationMessage}</p> : null}
            <Button className="w-full" disabled={loading || Boolean(validationMessage)} type="submit">
              {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
