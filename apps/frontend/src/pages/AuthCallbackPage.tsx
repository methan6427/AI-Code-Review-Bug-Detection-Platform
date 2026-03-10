import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getSupabaseBrowserClient, isSupabaseOAuthConfigured, mapSupabaseSessionToStoredSession } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { InlineMessage } from "../components/ui/InlineMessage";
import { feedbackMessages, storeFlashFeedback } from "../lib/feedback";

const postAuthRedirectKey = "ai-review-post-auth-redirect";
const callbackTimeoutMs = 10_000;
const exchangeTimeoutMs = 8_000;
const sessionRequestTimeoutMs = 2_000;
const sessionPollDelayMs = 250;
const sessionPollAttempts = 8;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function getHashParams() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash);
}

async function waitForSupabaseSession() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("OAuth client is unavailable");
  }

  for (let attempt = 0; attempt < sessionPollAttempts; attempt += 1) {
    const { data, error } = await withTimeout(supabase.auth.getSession(), sessionRequestTimeoutMs, "Supabase session lookup");
    console.info("[AuthCallbackPage] session lookup", { attempt, hasSession: Boolean(data.session), error: error?.message ?? null });
    if (error) {
      throw error;
    }

    if (data.session) {
      return data.session;
    }

    await new Promise((resolve) => window.setTimeout(resolve, sessionPollDelayMs));
  }

  return null;
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setStoredSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loadingLabel, setLoadingLabel] = useState("Checking your Supabase session");

  useEffect(() => {
    const hashParams = getHashParams();
    const authCode = searchParams.get("code");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    console.info("[AuthCallbackPage] callback start", {
      url: window.location.href,
      hasCode: Boolean(authCode),
      hasAccessToken: Boolean(accessToken),
      hasRefreshToken: Boolean(refreshToken),
    });

    if (!isSupabaseOAuthConfigured) {
      console.error("[AuthCallbackPage] OAuth is not configured for the frontend");
      setError("OAuth is not configured for the frontend");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      console.error("[AuthCallbackPage] OAuth client is unavailable");
      setError("OAuth client is unavailable");
      return;
    }

    const authError = searchParams.get("error_description") || searchParams.get("error");
    if (authError) {
      console.error("[AuthCallbackPage] provider returned an auth error", { authError });
      setError(authError);
      return;
    }

    const nextRoute = searchParams.get("next") || "/dashboard";

    let active = true;

    void (async () => {
      try {
        await withTimeout(
          (async () => {
            if (accessToken && refreshToken) {
              setLoadingLabel("Restoring your provider session");
              console.info("[AuthCallbackPage] setting session from callback token params");
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (setSessionError) {
                throw setSessionError;
              }
            } else if (authCode) {
              setLoadingLabel("Finalizing provider sign-in");
              console.info("[AuthCallbackPage] exchanging OAuth code for session");
              const { error: exchangeError } = await withTimeout(
                supabase.auth.exchangeCodeForSession(authCode),
                exchangeTimeoutMs,
                "Supabase OAuth code exchange",
              );
              if (exchangeError) {
                throw exchangeError;
              }
            } else {
              console.warn("[AuthCallbackPage] callback missing code and token params");
            }

            setLoadingLabel("Restoring your workspace session");
            const finalSession = await waitForSupabaseSession();

            if (!active) {
              return;
            }

            if (!finalSession) {
              throw new Error("OAuth sign-in did not return a session");
            }

            console.info("[AuthCallbackPage] session restored", {
              userId: finalSession.user.id,
              provider: finalSession.user.app_metadata.provider ?? null,
            });

            setStoredSession(mapSupabaseSessionToStoredSession(finalSession));

            const redirectTarget = window.localStorage.getItem(postAuthRedirectKey) || nextRoute;
            window.localStorage.removeItem(postAuthRedirectKey);
            const providerName =
              typeof finalSession.user.app_metadata.provider === "string"
                ? finalSession.user.app_metadata.provider.charAt(0).toUpperCase() + finalSession.user.app_metadata.provider.slice(1)
                : "OAuth";
            storeFlashFeedback(feedbackMessages.oauthConnected(providerName));
            navigate(redirectTarget, { replace: true });
          })(),
          callbackTimeoutMs,
          "OAuth callback completion",
        );
      } catch (callbackError) {
        if (!active) {
          return;
        }

        const message = callbackError instanceof Error ? callbackError.message : "Unable to complete OAuth sign-in";
        console.error("[AuthCallbackPage] callback failed", { error: message });
        setError(message);
        window.localStorage.removeItem(postAuthRedirectKey);
        window.setTimeout(() => {
          navigate("/auth", {
            replace: true,
            state: { oauthError: message },
          });
        }, 2500);
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
            <div className="space-y-4">
              <InlineMessage tone="error">{error}</InlineMessage>
              <p className="text-sm text-slate-400">Redirecting you back to sign in...</p>
              <Button onClick={() => navigate("/auth", { replace: true, state: { oauthError: error } })} type="button" variant="secondary">
                Back to sign in
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300" />
              <InlineMessage tone="info">{loadingLabel || "Signing you in..."}</InlineMessage>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
