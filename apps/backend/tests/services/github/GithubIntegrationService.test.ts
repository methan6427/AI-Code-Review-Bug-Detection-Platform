import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("GithubIntegrationService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("maps installation payloads and filters invalid entries", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 1, account: { login: "openai", type: "Organization" }, repository_selection: "selected", app_slug: "ai-review" },
          { id: "bad" },
        ]),
        { status: 200 },
      ),
    );

    const { GithubIntegrationService } = await import("../../../src/services/github/GithubIntegrationService");
    const installations = await new GithubIntegrationService().listInstallations();

    expect(installations).toEqual([
      expect.objectContaining({
        id: 1,
        accountLogin: "openai",
        repositorySelection: "selected",
      }),
    ]);
  });

  it("maps repositories for an installation", async () => {
    const { GithubIntegrationService } = await import("../../../src/services/github/GithubIntegrationService");
    vi.spyOn(GithubIntegrationService.prototype as never, "createInstallationAccessToken").mockResolvedValue("token");
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          repositories: [
            {
              id: 10,
              name: "review-platform",
              full_name: "openai/review-platform",
              html_url: "https://github.com/openai/review-platform",
              description: "repo",
              private: true,
              default_branch: "main",
              owner: { login: "openai" },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const repositories = await new GithubIntegrationService().listInstallationRepositories(123);
    expect(repositories[0]).toMatchObject({
      installationId: 123,
      isPrivate: true,
      owner: "openai",
    });
  });

  it("limits check-run annotations to GitHub limits", async () => {
    const { GithubIntegrationService } = await import("../../../src/services/github/GithubIntegrationService");
    vi.spyOn(GithubIntegrationService.prototype as never, "createInstallationAccessToken").mockResolvedValue("token");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 77 }), { status: 201 }));

    const annotations = Array.from({ length: 55 }, (_, index) => ({
      path: "src/index.ts",
      start_line: index + 1,
      end_line: index + 1,
      annotation_level: "warning" as const,
      message: `Issue ${index}`,
    }));

    const checkRunId = await new GithubIntegrationService().createCheckRun({
      installationId: 123,
      owner: "openai",
      repository: "review-platform",
      headSha: "abc123",
      name: "AI Review Scan",
      summary: "Summary",
      conclusion: "neutral",
      annotations,
    });

    expect(checkRunId).toBe(77);
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody.output.annotations).toHaveLength(50);
  });
});
