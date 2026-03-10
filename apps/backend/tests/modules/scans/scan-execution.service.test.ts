import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase } from "../../utils/mockSupabase";
import { makeGithubPushScan, makeIssue, makeRepository } from "../../../../../tests/factories/domain";

const supabase = createMockSupabase();
const repositoryServiceMock = {
  getOwnedRepository: vi.fn(),
  markLastScan: vi.fn(),
};
const repositorySourceServiceMock = {
  load: vi.fn(),
};
const scanEventServiceMock = {
  record: vi.fn(),
};
const githubScanReportServiceMock = {
  publishCompletedScan: vi.fn(),
  publishFailedScan: vi.fn(),
};
const staticAnalysisServiceMock = {
  analyze: vi.fn(),
};
const aiAnalysisServiceMock = {
  analyze: vi.fn(),
};

vi.mock("../../../src/services/supabase/client", () => ({
  supabaseAdmin: supabase.supabaseAdmin,
}));

vi.mock("../../../src/modules/repositories/repository.service", () => ({
  RepositoryService: class {
    constructor() {
      return repositoryServiceMock;
    }
  },
}));

vi.mock("../../../src/services/repository-source/RepositorySourceService", () => ({
  RepositorySourceService: class {
    constructor() {
      return repositorySourceServiceMock;
    }
  },
}));

vi.mock("../../../src/modules/scans/scan-event.service", () => ({
  ScanEventService: class {
    constructor() {
      return scanEventServiceMock;
    }
  },
}));

vi.mock("../../../src/modules/scans/github-scan-report.service", () => ({
  GithubScanReportService: class {
    constructor() {
      return githubScanReportServiceMock;
    }
  },
}));

vi.mock("../../../src/services/analysis/RuleBasedStaticAnalysisService", () => ({
  RuleBasedStaticAnalysisService: class {
    constructor() {
      return staticAnalysisServiceMock;
    }
  },
}));

vi.mock("../../../src/services/analysis/PlaceholderAIAnalysisService", () => ({
  PlaceholderAIAnalysisService: class {
    constructor() {
      return aiAnalysisServiceMock;
    }
  },
}));

const scanRow = {
  id: "scan-1",
  repository_id: "repo-1",
  triggered_by: "user-1",
  status: "running",
  scan_context: makeGithubPushScan().context,
  attempt_count: 1,
  max_attempts: 3,
  next_retry_at: null,
  last_error_at: null,
  summary: {},
  error_message: null,
  started_at: "2026-03-10T08:00:00.000Z",
  completed_at: null,
  created_at: "2026-03-10T08:00:00.000Z",
  updated_at: "2026-03-10T08:00:00.000Z",
  last_error_details: {},
  github_check_run_id: null,
};

describe("ScanExecutionService", () => {
  beforeEach(() => {
    supabase.reset();
    repositoryServiceMock.getOwnedRepository.mockReset();
    repositoryServiceMock.markLastScan.mockReset();
    repositorySourceServiceMock.load.mockReset();
    scanEventServiceMock.record.mockReset();
    githubScanReportServiceMock.publishCompletedScan.mockReset();
    githubScanReportServiceMock.publishFailedScan.mockReset();
    staticAnalysisServiceMock.analyze.mockReset();
    aiAnalysisServiceMock.analyze.mockReset();
    repositoryServiceMock.getOwnedRepository.mockResolvedValue(makeRepository());
  });

  it("persists generated issues, updates scan state, and reports completed scans", async () => {
    supabase.queueResult("scans", "select", { data: scanRow });
    supabase.queueResult("issues", "delete", {});
    supabase.queueResult("issues", "insert", {});
    supabase.queueResult("scans", "update", {});
    repositorySourceServiceMock.load.mockResolvedValue({
      sourceType: "git_clone",
      changedFiles: ["src/index.ts"],
      files: [{ path: "src/index.ts", content: "console.log(process.env.API_KEY)" }],
    });
    staticAnalysisServiceMock.analyze.mockResolvedValue([makeIssue({ id: "issue-1", severity: "critical" })]);
    aiAnalysisServiceMock.analyze.mockResolvedValue([makeIssue({ id: "issue-2", severity: "medium", category: "maintainability" })]);
    githubScanReportServiceMock.publishCompletedScan.mockResolvedValue(91);

    const { ScanExecutionService } = await import("../../../src/modules/scans/scan-execution.service");
    await new ScanExecutionService().execute("scan-1");

    expect(supabase.getCalls("issues", "insert")[0]?.payload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scan_id: "scan-1", severity: "critical" }),
        expect.objectContaining({ scan_id: "scan-1", severity: "medium" }),
      ]),
    );
    expect(repositoryServiceMock.markLastScan).toHaveBeenCalled();
    expect(githubScanReportServiceMock.publishCompletedScan).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: "scan-1" }),
      expect.arrayContaining([expect.objectContaining({ severity: "critical" })]),
    );
    expect(scanEventServiceMock.record).toHaveBeenCalledWith(
      "scan-1",
      expect.objectContaining({ stage: "completed" }),
    );
  });

  it("requeues transient failures with retry metadata", async () => {
    supabase.queueResult("scans", "select", { data: scanRow });
    supabase.queueResult("scans", "select", { data: scanRow });
    supabase.queueResult("scans", "update", {});
    repositorySourceServiceMock.load.mockRejectedValue(new Error("clone failed"));

    const { ScanExecutionService } = await import("../../../src/modules/scans/scan-execution.service");
    await expect(new ScanExecutionService().execute("scan-1")).rejects.toThrow("clone failed");

    const updatePayload = supabase.getCalls("scans", "update")[0]?.payload as Record<string, unknown>;
    expect(updatePayload.status).toBe("queued");
    expect(updatePayload.next_retry_at).toBeTruthy();
    expect(scanEventServiceMock.record).toHaveBeenCalledWith(
      "scan-1",
      expect.objectContaining({ stage: "retry" }),
    );
  });

  it("marks exhausted scans as failed and publishes failed GitHub checks", async () => {
    const exhaustedRow = { ...scanRow, attempt_count: 3 };
    supabase.queueResult("scans", "select", { data: exhaustedRow });
    supabase.queueResult("scans", "select", { data: exhaustedRow });
    supabase.queueResult("scans", "update", {});
    supabase.queueResult("scans", "update", {});
    repositorySourceServiceMock.load.mockRejectedValue(new Error("analysis exploded"));
    githubScanReportServiceMock.publishFailedScan.mockResolvedValue(55);

    const { ScanExecutionService } = await import("../../../src/modules/scans/scan-execution.service");
    await expect(new ScanExecutionService().execute("scan-1")).rejects.toThrow("analysis exploded");

    const updatePayload = supabase.getCalls("scans", "update")[0]?.payload as Record<string, unknown>;
    expect(updatePayload.status).toBe("failed");
    expect(updatePayload.completed_at).toBeTruthy();
    expect(githubScanReportServiceMock.publishFailedScan).toHaveBeenCalled();
  });
});
