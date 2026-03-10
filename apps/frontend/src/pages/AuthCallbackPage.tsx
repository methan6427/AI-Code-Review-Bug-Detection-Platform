import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getSupabaseBrowserClient, isSupabaseOAuthConfigured, mapSupabaseSessionToStoredSession } from "../lib/supabase";
import { InlineMessage } from "../components/ui/InlineMessage";
import { feedbackMessages, storeFlashFeedback } from "../lib/feedback";

const postAuthRedirectKey = "ai-review-post-auth-redirect";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setStoredSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loadingLabel, setLoadingLabel] = useState("Checking your Supabase session");

  useEffect(() => {
    if (!isSupabaseOAuthConfigured) {
      setError("OAuth is not configured for the frontend");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("OAuth client is unavailable");
      return;
    }

    const authError = searchParams.get("error_description") || searchParams.get("error");
    if (authError) {
      setError(authError);
      return;
    }

    const authCode = searchParams.get("code");
    const nextRoute = searchParams.get("next") || "/dashboard";

    let active = true;

    void (async () => {
      try {
        if (authCode) {
          setLoadingLabel("Finalizing provider sign-in");
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) {
            throw exchangeError;
          }
        }

        setLoadingLabel("Restoring your workspace session");
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        const finalSession = sessionData.session;

        if (!active) {
          return;
        }

        if (!finalSession) {
          throw new Error("OAuth sign-in did not return a session");
        }

        setStoredSession(mapSupabaseSessionToStoredSession(finalSession));

        const redirectTarget = window.localStorage.getItem(postAuthRedirectKey) || nextRoute;
        window.localStorage.removeItem(postAuthRedirectKey);
        const providerName =
          typeof finalSession.user.app_metadata.provider === "string"
            ? finalSession.user.app_metadata.provider.charAt(0).toUpperCase() + finalSession.user.app_metadata.provider.slice(1)
            : "OAuth";
        storeFlashFeedback(feedbackMessages.oauthConnected(providerName));
        navigate(redirectTarget, { replace: true });
      } catch (callbackError) {
        if (!active) {
          return;
        }

        setError(callbackError instanceof Error ? callbackError.message : "Unable to complete OAuth sign-in");
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate, searchParams, setStoredSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_22%),linear-gradient(180deg,#020617_0%,#020617_100%)] px-4 py-10">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-950/60 p-8 text-center backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">OAuth</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">{error ? "Sign-in failed" : "Completing sign-in"}</h1>
        <div className="mt-4">
          {error ? (
            <InlineMessage tone="error">{error}</InlineMessage>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300" />
              <InlineMessage tone="info">{loadingLabel}</InlineMessage>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
