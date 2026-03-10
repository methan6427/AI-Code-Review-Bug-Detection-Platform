import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../src/lib/api-client";
import { sessionStorageService } from "../../src/lib/storage";

describe("apiClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.clear();
    fetchMock.mockReset();
  });

  it("adds bearer auth headers for authenticated requests", async () => {
    sessionStorageService.set({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: null,
      user: { id: "user-1", email: "ada@example.com", fullName: "Ada" },
    });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ summary: {} }), { status: 200 }));

    await apiClient.getDashboardSummary();

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:4000/api/dashboard/summary");
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer access-token");
  });

  it("clears stored session state on authenticated 401 responses", async () => {
    sessionStorageService.set({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: null,
      user: { id: "user-1", email: "ada@example.com", fullName: "Ada" },
    });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }));

    await expect(apiClient.getMe()).rejects.toThrow("Unauthorized");
    expect(sessionStorageService.get()).toBeNull();
  });

  it("builds query strings for issue filters", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ issues: [] }), { status: 200 }));

    await apiClient.getIssuesByScan("scan-1", { severity: "critical", status: "open" });

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:4000/api/issues/scan/scan-1?severity=critical&status=open");
  });

  it("times out stalled auth bootstrap requests", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise((_, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    );

    const requestPromise = apiClient.getMe();
    const assertion = expect(requestPromise).rejects.toThrow("Request timed out after 8000ms");
    await vi.advanceTimersByTimeAsync(8_100);

    await assertion;
    vi.useRealTimers();
  });
});
