import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../../src/app/AuthContext";
import { ProtectedRoute } from "../../src/routes/ProtectedRoute";
import { createAuthValue } from "../utils/render";

describe("ProtectedRoute", () => {
  it("shows a loading state while auth hydration is in progress", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={createAuthValue({ isHydrating: true })}>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Routes>
              <Route path="/auth" element={<div>Auth page</div>} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<div>Dashboard</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Restoring your workspace session...")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to auth", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={createAuthValue()}>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Routes>
              <Route path="/auth" element={<div>Auth page</div>} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<div>Dashboard</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Auth page")).toBeInTheDocument();
  });
});
