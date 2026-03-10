import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthCallbackPage } from "../../src/pages/AuthCallbackPage";
import { renderWithProviders, createAuthValue } from "../utils/render";
import { consumeFlashFeedback } from "../../src/lib/feedback";

const getSession = vi.fn();

vi.mock("../../src/lib/supabase", () => ({
  isSupabaseOAuthConfigured: true,
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession,
    },
  }),
}));

describe("AuthCallbackPage", () => {
  it("stores the returned session and completes redirect flow", async () => {
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

    await waitFor(() => expect(auth.setStoredSession).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "access" })));
    expect(consumeFlashFeedback()).toMatchObject({ title: "GitHub connected" });
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
