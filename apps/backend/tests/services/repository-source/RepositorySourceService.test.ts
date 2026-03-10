import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeGithubPushScan, makeRepository } from "../../../../../tests/factories/domain";

const createInstallationAccessToken = vi.fn();
const execFileMock = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

vi.mock("../../../src/services/github/GithubIntegrationService", () => ({
  GithubIntegrationService: class {
    constructor() {
      return {
        createInstallationAccessToken,
      };
    }
  },
}));

describe("RepositorySourceService", () => {
  beforeEach(() => {
    createInstallationAccessToken.mockReset();
    execFileMock.mockReset();
  });

  it("falls back to stored sample files for unsupported git URLs", async () => {
    const { RepositorySourceService } = await import("../../../src/services/repository-source/RepositorySourceService");
    const source = await new RepositorySourceService().load(
      makeRepository({ githubUrl: "file:///tmp/repo" }),
      makeGithubPushScan({ context: { ...makeGithubPushScan().context, changedFiles: ["src/index.ts"] } }),
    );

    expect(source.sourceType).toBe("sample_files");
    expect(source.files).toEqual([expect.objectContaining({ path: "src/index.ts" })]);
  });

  it("falls back to sample files when git clone fails", async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      callback(new Error("git failed"));
    });
    const { RepositorySourceService } = await import("../../../src/services/repository-source/RepositorySourceService");
    const source = await new RepositorySourceService().load(makeRepository(), makeGithubPushScan());

    expect(source.sourceType).toBe("sample_files");
    expect(source.files).toHaveLength(2);
  });

  it("prefers installation access tokens when building clone URLs", async () => {
    createInstallationAccessToken.mockResolvedValue("installation-token");
    const { RepositorySourceService } = await import("../../../src/services/repository-source/RepositorySourceService");
    const cloneUrl = await (new RepositorySourceService() as never).buildCloneUrl(makeRepository(), makeGithubPushScan());

    expect(cloneUrl).toContain("x-access-token:installation-token@github.com/openai/review-platform.git");
  });
});
