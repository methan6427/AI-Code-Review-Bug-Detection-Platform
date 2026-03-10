import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthCallbackPage } from "../../src/pages/AuthCallbackPage";
import { renderWithProviders, createAuthValue } from "../utils/render";
import { consumeFlashFeedback } from "../../src/lib/feedback";

const getSession = vi.fn();
const exchangeCodeForSession = vi.fn();

vi.mock("../../src/lib/supabase", () => ({
  isSupabaseOAuthConfigured: true,
  mapSupabaseSessionToStoredSession: (session: {
    access_token: string;
    refresh_token: string;
    expires_at: number | null;
    user: { id: string; email?: string | null; user_metadata: { full_name?: string; name?: string; avatar_url?: string; picture?: string } };
  }) => ({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
      fullName: session.user.user_metadata.full_name ?? session.user.user_metadata.name ?? null,
      avatarUrl: session.user.user_metadata.avatar_url ?? session.user.user_metadata.picture ?? null,
    },
  }),
  getSupabaseBrowserClient: () => ({
    auth: {
      exchangeCodeForSession,
      getSession,
    },
  }),
}));

describe("AuthCallbackPage", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    getSession.mockReset();
  });

  it("shows a loading surface while the callback is being processed", async () => {
    getSession.mockImplementation(() => new Promise(() => undefined));

    renderWithProviders(<AuthCallbackPage />, {
      route: "/auth/callback",
      path: "/auth/callback",
    });

    expect(screen.getByText("Completing sign-in")).toBeInTheDocument();
    expect(await screen.findByText("Restoring your workspace session")).toBeInTheDocument();
  });

  it("stores the returned session and completes redirect flow", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "access",
          refresh_token: "refresh",
          expires_at: 123,
          user: {
            id: "user-1",
            email: "ada@example.com",
            user_metadata: { full_name: "Ada Lovelace" },
            app_metadata: {
              provider: "github",
            },
          },
        },
      },
      error: null,
    });
    window.localStorage.setItem("ai-review-post-auth-redirect", "/repositories");
    const auth = createAuthValue();

    renderWithProviders(<AuthCallbackPage />, {
      route: "/auth/callback?code=abc",
      path: "/auth/callback",
      auth,
    });

    await waitFor(() => expect(exchangeCodeForSession).toHaveBeenCalledWith("abc"));
    await waitFor(() => expect(auth.setStoredSession).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "access" })));
    expect(consumeFlashFeedback()).toMatchObject({ title: "Github sign-in complete" });
  });

  it("renders callback errors from the OAuth redirect", async () => {
    renderWithProviders(<AuthCallbackPage />, {
      route: "/auth/callback?error=access_denied",
      path: "/auth/callback",
    });

    expect(await screen.findByText("Sign-in failed")).toBeInTheDocument();
    expect(screen.getByText("access_denied")).toBeInTheDocument();
  });
});
