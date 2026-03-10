import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeGithubPushScan, makeIssue, makeRepository } from "../../../../../tests/factories/domain";

const githubIntegrationServiceMock = {
  createCheckRun: vi.fn(),
};

vi.mock("../../../src/services/github/GithubIntegrationService", () => ({
  GithubIntegrationService: class {
    constructor() {
      return githubIntegrationServiceMock;
    }
  },
}));

describe("GithubScanReportService", () => {
  beforeEach(() => {
    githubIntegrationServiceMock.createCheckRun.mockReset();
  });

  it("skips reporting when installation context is missing", async () => {
    const { GithubScanReportService } = await import("../../../src/modules/scans/github-scan-report.service");
    const result = await new GithubScanReportService().publishCompletedScan(
      makeRepository({ githubInstallationId: null }),
      makeGithubPushScan({ context: { ...makeGithubPushScan().context, installationId: null } }),
      [],
    );

    expect(result).toBeNull();
    expect(githubIntegrationServiceMock.createCheckRun).not.toHaveBeenCalled();
  });

  it("uses scan installation id as a fallback override and builds actionable conclusions", async () => {
    githubIntegrationServiceMock.createCheckRun.mockResolvedValue(88);
    const { GithubScanReportService } = await import("../../../src/modules/scans/github-scan-report.service");
    const checkRunId = await new GithubScanReportService().publishCompletedScan(
      makeRepository({ githubInstallationId: null }),
      makeGithubPushScan({ context: { ...makeGithubPushScan().context, installationId: 456 } }),
      [makeIssue({ severity: "critical" }), makeIssue({ id: "issue-2", severity: "medium" })],
    );

    expect(checkRunId).toBe(88);
    expect(githubIntegrationServiceMock.createCheckRun).toHaveBeenCalledWith(
      expect.objectContaining({
        installationId: 456,
        conclusion: "action_required",
        annotations: expect.arrayContaining([
          expect.objectContaining({ path: "src/index.ts", annotation_level: "failure" }),
        ]),
      }),
    );
  });
});
