import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getSupabaseBrowserClient, isSupabaseOAuthConfigured } from "../lib/supabase";
import { InlineMessage } from "../components/ui/InlineMessage";
import { feedbackMessages, storeFlashFeedback } from "../lib/feedback";

const postAuthRedirectKey = "ai-review-post-auth-redirect";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setStoredSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseOAuthConfigured) {
      setError("GitHub OAuth is not configured for the frontend");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("GitHub OAuth client is unavailable");
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
          // Allow the Supabase client to finish automatic PKCE callback handling on initialization.
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        const finalSession = sessionData.session;

        if (!active) {
          return;
        }

        if (!finalSession) {
          throw new Error("GitHub sign-in did not return a session");
        }

        setStoredSession({
          accessToken: finalSession.access_token,
          refreshToken: finalSession.refresh_token,
          expiresAt: finalSession.expires_at ?? null,
          user: {
            id: finalSession.user.id,
            email: finalSession.user.email ?? "",
            fullName:
              typeof finalSession.user.user_metadata.full_name === "string"
                ? finalSession.user.user_metadata.full_name
                : typeof finalSession.user.user_metadata.name === "string"
                  ? finalSession.user.user_metadata.name
                  : null,
            avatarUrl:
              typeof finalSession.user.user_metadata.avatar_url === "string"
                ? finalSession.user.user_metadata.avatar_url
                : typeof finalSession.user.user_metadata.picture === "string"
                  ? finalSession.user.user_metadata.picture
                  : null,
          },
        });

        const redirectTarget = window.localStorage.getItem(postAuthRedirectKey) || nextRoute;
        window.localStorage.removeItem(postAuthRedirectKey);
        storeFlashFeedback(feedbackMessages.githubConnected());
        navigate(redirectTarget, { replace: true });
      } catch (callbackError) {
        if (!active) {
          return;
        }

        setError(callbackError instanceof Error ? callbackError.message : "Unable to complete GitHub sign-in");
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate, searchParams, setStoredSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_22%),linear-gradient(180deg,#020617_0%,#020617_100%)] px-4 py-10">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-950/60 p-8 text-center backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">GitHub OAuth</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">{error ? "Sign-in failed" : "Completing sign-in"}</h1>
        <div className="mt-4">
          {error ? (
            <InlineMessage tone="error">{error}</InlineMessage>
          ) : (
            <InlineMessage tone="info">Exchanging your GitHub authorization with Supabase and preparing the app session.</InlineMessage>
          )}
        </div>
      </div>
    </div>
  );
}
