import type { ContextType, ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { AuthContext } from "../../src/app/AuthContext";
import { ToastProvider } from "../../src/components/ui/Toast";

export const createAuthValue = (overrides: Partial<ContextType<typeof AuthContext>> = {}) => ({
  session: null,
  isAuthenticated: false,
  isHydrating: false,
  setAuthSession: vi.fn(),
  setStoredSession: vi.fn(),
  clearAuthSession: vi.fn(),
  ...overrides,
});

type RenderOptions = {
  route?: string;
  path?: string;
  auth?: ReturnType<typeof createAuthValue>;
};

export const renderWithProviders = (ui: ReactElement, options: RenderOptions = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={options.auth ?? createAuthValue()}>
            <MemoryRouter initialEntries={[options.route ?? "/"]}>
              <Routes>
                <Route path={options.path ?? "/"} element={ui} />
              </Routes>
            </MemoryRouter>
          </AuthContext.Provider>
        </ToastProvider>
      </QueryClientProvider>,
    ),
  };
};
