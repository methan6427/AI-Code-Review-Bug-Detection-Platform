import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { StoredSession } from "./storage";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export const isSupabaseOAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabaseBrowserClient() {
  if (!isSupabaseOAuthConfigured) {
    return null;
  }

  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        detectSessionInUrl: true,
        flowType: "pkce",
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }

  return client;
}

export function getOAuthRedirectUrl() {
  return `${window.location.origin}/auth/callback`;
}

export function mapSupabaseSessionToStoredSession(session: Session): StoredSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
      fullName:
        typeof session.user.user_metadata.full_name === "string"
          ? session.user.user_metadata.full_name
          : typeof session.user.user_metadata.name === "string"
            ? session.user.user_metadata.name
            : null,
      avatarUrl:
        typeof session.user.user_metadata.avatar_url === "string"
          ? session.user.user_metadata.avatar_url
          : typeof session.user.user_metadata.picture === "string"
            ? session.user.user_metadata.picture
            : null,
    },
  };
}

export async function syncSupabaseBrowserSession(session: Pick<StoredSession, "accessToken" | "refreshToken">) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("GitHub OAuth client is unavailable");
  }

  const { error } = await supabase.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });

  if (error) {
    throw error;
  }

  return supabase;
}
