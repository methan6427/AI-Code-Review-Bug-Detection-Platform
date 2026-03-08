import type { AuthResponse } from "@ai-review/shared";
import type { ReactNode } from "react";
import { createContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/api-client";
import { sessionStorageService, type StoredSession } from "../lib/storage";

interface AuthContextValue {
  session: StoredSession | null;
  isAuthenticated: boolean;
  setAuthSession: (payload: AuthResponse) => void;
  clearAuthSession: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedSession = sessionStorageService.get();
    if (!storedSession?.accessToken) {
      setSession(null);
      setHydrated(true);
      return;
    }

    setSession(storedSession);

    let active = true;

    void apiClient
      .getMe()
      .then(({ profile }) => {
        if (!active) {
          return;
        }

        const nextSession: StoredSession = {
          ...storedSession,
          user: {
            id: profile.id,
            email: profile.email,
            fullName: profile.fullName,
          },
        };

        sessionStorageService.set(nextSession);
        setSession(nextSession);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        sessionStorageService.clear();
        setSession(null);
      })
      .finally(() => {
        if (active) {
          setHydrated(true);
        }
      });

    return () => {
      active = false;
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
