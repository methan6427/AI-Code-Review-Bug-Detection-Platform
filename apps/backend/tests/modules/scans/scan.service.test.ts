import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase } from "../../utils/mockSupabase";
import { makeManualScan, makeRepository } from "../../../../../tests/factories/domain";

const supabase = createMockSupabase();
const repositoryServiceMock = {
  getOwnedRepository: vi.fn(),
  listOwnedRepositoryIds: vi.fn(),
};
const scanEventServiceMock = {
  record: vi.fn(),
  listByScan: vi.fn(),
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

vi.mock("../../../src/modules/scans/scan-event.service", () => ({
  ScanEventService: class {
    constructor() {
      return scanEventServiceMock;
    }
  },
}));

describe("ScanService", () => {
  beforeEach(() => {
    supabase.reset();
    repositoryServiceMock.getOwnedRepository.mockReset();
    repositoryServiceMock.listOwnedRepositoryIds.mockReset();
    scanEventServiceMock.record.mockReset();
    scanEventServiceMock.listByScan.mockReset();
  });

  it("prevents duplicate queued or running scans", async () => {
    repositoryServiceMock.getOwnedRepository.mockResolvedValue(makeRepository());
    supabase.queueResult("scans", "select", {
      data: {
        id: "scan-2",
        repository_id: "repo-1",
        triggered_by: "user-1",
        status: "queued",
        scan_context: {},
        attempt_count: 1,
        max_attempts: 3,
        next_retry_at: null,
        last_error_at: null,
        summary: {},
        error_message: null,
        started_at: null,
        completed_at: null,
        created_at: "2026-03-10T08:00:00.000Z",
        updated_at: "2026-03-10T08:00:00.000Z",
        last_error_details: {},
        github_check_run_id: null,
      },
    });

    const { ScanService } = await import("../../../src/modules/scans/scan.service");
    await expect(new ScanService().createScan("user-1", "repo-1")).rejects.toThrow("A scan is already queued or running for this repository");
  });

  it("creates scans with built context and records a queue event", async () => {
    repositoryServiceMock.getOwnedRepository.mockResolvedValue(makeRepository());
    supabase.queueResult("scans", "select", { data: null });
    supabase.queueResult("scans", "insert", {
      data: {
        id: "scan-1",
        repository_id: "repo-1",
        triggered_by: "user-1",
        status: "queued",
        scan_context: { source: "github_push", branch: "feature", changedFiles: ["src/a.ts"] },
        attempt_count: 0,
        max_attempts: 3,
        next_retry_at: null,
        last_error_at: null,
        summary: {},
        error_message: null,
        started_at: null,
        completed_at: null,
        created_at: "2026-03-10T08:00:00.000Z",
        updated_at: "2026-03-10T08:00:00.000Z",
        last_error_details: {},
        github_check_run_id: null,
      },
    });

    const { ScanService } = await import("../../../src/modules/scans/scan.service");
    const scan = await new ScanService().createScan("user-1", "repo-1", { source: "github_push", branch: "feature", changedFiles: ["src/a.ts"] });

    expect(scan.context.source).toBe("github_push");
    expect(scanEventServiceMock.record).toHaveBeenCalledWith(
      "scan-1",
      expect.objectContaining({
        stage: "queued",
        metadata: expect.objectContaining({ source: "github_push", branch: "feature" }),
      }),
    );
  });

  it("claims queued scans, increments attempts, and records claim events", async () => {
    supabase.queueResult("scans", "select", {
      data: {
        ...makeManualScan({ status: "queued", attemptCount: 1 }),
        repository_id: "repo-1",
        triggered_by: "user-1",
        scan_context: { source: "manual", changedFiles: [] },
        attempt_count: 1,
        max_attempts: 3,
        next_retry_at: null,
        last_error_at: null,
        summary: {},
        error_message: null,
        started_at: null,
        completed_at: null,
        created_at: "2026-03-10T08:00:00.000Z",
        updated_at: "2026-03-10T08:00:00.000Z",
        last_error_details: {},
        github_check_run_id: null,
      },
    });
    supabase.queueResult("scans", "update", {
      data: {
        id: "scan-1",
        repository_id: "repo-1",
        triggered_by: "user-1",
        status: "running",
        scan_context: { source: "manual", changedFiles: [] },
        attempt_count: 2,
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
      },
    });

    const { ScanService } = await import("../../../src/modules/scans/scan.service");
    const scan = await new ScanService().claimNextQueuedScan();

    expect(scan?.status).toBe("running");
    expect(scan?.attemptCount).toBe(2);
    expect(scanEventServiceMock.record).toHaveBeenCalledWith(
      "scan-1",
      expect.objectContaining({
        stage: "claimed",
        metadata: expect.objectContaining({ attempt: 2, maxAttempts: 3 }),
      }),
    );
  });
});
