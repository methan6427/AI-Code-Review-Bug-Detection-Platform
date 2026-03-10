import type { AuthResponse } from "@ai-review/shared";
import type { ReactNode } from "react";
import { createContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/api-client";
import { sessionStorageService, type StoredSession } from "../lib/storage";
import { getSupabaseBrowserClient, mapSupabaseSessionToStoredSession } from "../lib/supabase";

interface AuthContextValue {
  session: StoredSession | null;
  isAuthenticated: boolean;
  setAuthSession: (payload: AuthResponse) => void;
  setStoredSession: (session: StoredSession) => void;
  clearAuthSession: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    const syncProfile = async (candidateSession: StoredSession | null) => {
      if (!candidateSession?.accessToken) {
        if (!active) {
          return;
        }

        sessionStorageService.clear();
        setSession(null);
        setHydrated(true);
        return;
      }

      if (active) {
        sessionStorageService.set(candidateSession);
        setSession(candidateSession);
      }

      try {
        const { profile } = await apiClient.getMe();
        if (!active) {
          return;
        }

        const nextSession: StoredSession = {
          ...candidateSession,
          user: {
            id: profile.id,
            email: profile.email,
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl,
          },
        };

        sessionStorageService.set(nextSession);
        setSession(nextSession);
      } catch {
        if (!active) {
          return;
        }

        sessionStorageService.clear();
        setSession(null);
      } finally {
        if (active) {
          setHydrated(true);
        }
      }
    };

    void (async () => {
      const storedSession = sessionStorageService.get();
      if (!supabase) {
        await syncProfile(storedSession);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      const candidateSession = error ? storedSession : data.session ? mapSupabaseSessionToStoredSession(data.session) : storedSession;
      await syncProfile(candidateSession);
    })();

    const subscription = supabase?.auth.onAuthStateChange((_event, nextSupabaseSession) => {
      if (!active) {
        return;
      }

      if (!nextSupabaseSession) {
        sessionStorageService.clear();
        setSession(null);
        return;
      }

      const nextSession = mapSupabaseSessionToStoredSession(nextSupabaseSession);
      sessionStorageService.set(nextSession);
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      setAuthSession: (payload) => {
        const nextSession: StoredSession = {
          accessToken: payload.session.accessToken,
          refreshToken: payload.session.refreshToken,
          expiresAt: payload.session.expiresAt,
          user: payload.user,
        };
        sessionStorageService.set(nextSession);
        setSession(nextSession);
      },
      setStoredSession: (nextSession) => {
        sessionStorageService.set(nextSession);
        setSession(nextSession);
      },
      clearAuthSession: () => {
        sessionStorageService.clear();
        setSession(null);
      },
    }),
    [session],
  );

  if (!hydrated) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
