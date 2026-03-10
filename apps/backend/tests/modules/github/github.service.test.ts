import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryServiceMock = {
  findByGithubOwnerAndName: vi.fn(),
};
const scanServiceMock = {
  createScan: vi.fn(),
};

vi.mock("../../../src/modules/repositories/repository.service", () => ({
  RepositoryService: class {
    constructor() {
      return repositoryServiceMock;
    }
  },
}));

vi.mock("../../../src/modules/scans/scan.service", () => ({
  ScanService: class {
    constructor() {
      return scanServiceMock;
    }
  },
}));

describe("GithubService", () => {
  beforeEach(() => {
    repositoryServiceMock.findByGithubOwnerAndName.mockReset();
    scanServiceMock.createScan.mockReset();
  });

  it("verifies webhook signatures", async () => {
    const { GithubService } = await import("../../../src/modules/github/github.service");
    const service = new GithubService();
    const rawBody = Buffer.from(JSON.stringify({ hello: "world" }));
    const signature = `sha256=${crypto.createHmac("sha256", "webhook-secret").update(rawBody).digest("hex")}`;

    expect(() => service.verifyWebhookSignature(signature, rawBody)).not.toThrow();
    expect(() => service.verifyWebhookSignature("sha256=bad", rawBody)).toThrow("GitHub webhook signature verification failed");
  });

  it("triggers push scans with deduplicated changed files", async () => {
    repositoryServiceMock.findByGithubOwnerAndName.mockResolvedValue([
      { id: "repo-1", userId: "user-1", githubInstallationId: 123 },
    ]);

    const { GithubService } = await import("../../../src/modules/github/github.service");
    const result = await new GithubService().processWebhookEvent("push", "delivery-1", {
      installation: { id: 123 },
      repository: {
        name: "review-platform",
        full_name: "openai/review-platform",
      },
      ref: "refs/heads/main",
      before: "old",
      after: "new",
      commits: [
        { added: ["src/a.ts"], modified: ["src/a.ts", "src/b.ts"], removed: [] },
      ],
    });

    expect(result).toEqual({ accepted: true, event: "push", action: "push" });
    expect(scanServiceMock.createScan).toHaveBeenCalledWith(
      "user-1",
      "repo-1",
      expect.objectContaining({
        source: "github_push",
        branch: "main",
        commitSha: "new",
        baseCommitSha: "old",
        changedFiles: ["src/a.ts", "src/b.ts"],
        installationId: 123,
      }),
    );
  });

  it("triggers pull request scans with PR context", async () => {
    repositoryServiceMock.findByGithubOwnerAndName.mockResolvedValue([{ id: "repo-1", userId: "user-1", githubInstallationId: 123 }]);

    const { GithubService } = await import("../../../src/modules/github/github.service");
    await new GithubService().processWebhookEvent("pull_request", "delivery-1", {
      installation: { id: 123 },
      repository: {
        name: "review-platform",
        full_name: "openai/review-platform",
      },
      pull_request: {
        number: 42,
        head: { ref: "feature/test", sha: "head-sha" },
        base: { ref: "main", sha: "base-sha" },
      },
    });

    expect(scanServiceMock.createScan).toHaveBeenCalledWith(
      "user-1",
      "repo-1",
      expect.objectContaining({
        source: "github_pull_request",
        pullRequestNumber: 42,
        branch: "feature/test",
        baseBranch: "main",
        commitSha: "head-sha",
        baseCommitSha: "base-sha",
      }),
    );
  });
});
