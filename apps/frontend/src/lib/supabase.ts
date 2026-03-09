import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
