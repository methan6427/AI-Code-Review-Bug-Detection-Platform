import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPage } from "../../src/pages/AuthPage";
import { renderWithProviders, createAuthValue } from "../utils/render";

const { apiClientMock, signInWithOAuth } = vi.hoisted(() => ({
  apiClientMock: {
    login: vi.fn(),
    signup: vi.fn(),
  },
  signInWithOAuth: vi.fn(),
}));

vi.mock("../../src/lib/api-client", () => ({
  apiClient: apiClientMock,
}));

vi.mock("../../src/lib/supabase", () => ({
  isSupabaseOAuthConfigured: true,
  getSupabaseBrowserClient: () => ({
    auth: {
      signInWithOAuth,
    },
  }),
}));

describe("AuthPage", () => {
  beforeEach(() => {
    apiClientMock.login.mockReset();
    apiClientMock.signup.mockReset();
    signInWithOAuth.mockReset();
  });

  it("submits login credentials and stores auth session", async () => {
    apiClientMock.login.mockResolvedValue({
      user: { id: "user-1", email: "ada@example.com", fullName: "Ada" },
      session: { accessToken: "access", refreshToken: "refresh", expiresAt: null },
    });
    const auth = createAuthValue();
    const user = userEvent.setup();

    renderWithProviders(<AuthPage />, { route: "/auth", path: "/auth", auth });
    await user.type(screen.getByPlaceholderText("you@company.dev"), "ada@example.com");
    await user.type(screen.getByPlaceholderText("Minimum 8 characters"), "password123");
    const signInButtons = screen.getAllByRole("button", { name: "Sign in" });
    await user.click(signInButtons[signInButtons.length - 1]);

    await waitFor(() => expect(apiClientMock.login).toHaveBeenCalledWith({ email: "ada@example.com", password: "password123" }));
    expect(auth.setAuthSession).toHaveBeenCalled();
  });

  it("starts GitHub OAuth and stores the post-auth redirect", async () => {
    signInWithOAuth.mockResolvedValue({ error: null });
    const user = userEvent.setup();

    renderWithProviders(<AuthPage />, { route: "/auth", path: "/auth" });
    await user.click(screen.getByRole("button", { name: "Continue with GitHub" }));

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalled());
    expect(window.localStorage.getItem("ai-review-post-auth-redirect")).toBe("/dashboard");
  });
});
