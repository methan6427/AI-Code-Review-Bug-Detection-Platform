import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase } from "../../utils/mockSupabase";

const supabase = createMockSupabase();
const repositoryServiceMock = {
  listOwnedRepositoryIds: vi.fn(),
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

describe("DashboardService", () => {
  beforeEach(() => {
    supabase.reset();
    repositoryServiceMock.listOwnedRepositoryIds.mockReset();
  });

  it("aggregates repository, scan, and issue metrics", async () => {
    repositoryServiceMock.listOwnedRepositoryIds.mockResolvedValue(["repo-1"]);
    supabase.queueResult("profiles", "select", {
      data: {
        id: "user-1",
        email: "ada@example.com",
        full_name: "Ada Lovelace",
        avatar_url: null,
        created_at: "2026-03-10T08:00:00.000Z",
        updated_at: "2026-03-10T08:00:00.000Z",
      },
    });
    supabase.queueResult("repositories", "select", {
      data: [
        {
          id: "repo-1",
          user_id: "user-1",
          name: "review-platform",
          owner: "openai",
          branch: "main",
          github_url: "https://github.com/openai/review-platform",
          github_installation_id: 123,
          github_repository_id: 999,
          access_token_hint: null,
          description: "repo",
          sample_files: [],
          last_scan_at: "2026-03-10T08:00:00.000Z",
          created_at: "2026-03-10T08:00:00.000Z",
          updated_at: "2026-03-10T08:00:00.000Z",
        },
      ],
    });
    supabase.queueResult("scans", "select", {
      data: [
        {
          id: "scan-1",
          repository_id: "repo-1",
          triggered_by: "user-1",
          status: "completed",
          scan_context: { source: "manual", changedFiles: [] },
          attempt_count: 1,
          max_attempts: 3,
          next_retry_at: null,
          last_error_at: null,
          summary: { totalIssues: 2 },
          error_message: null,
          started_at: "2026-03-10T08:00:00.000Z",
          completed_at: "2026-03-10T08:00:00.000Z",
          created_at: "2026-03-10T08:00:00.000Z",
          updated_at: "2026-03-10T08:00:00.000Z",
          last_error_details: {},
          github_check_run_id: null,
        },
      ],
    });
    supabase.queueResult("scans", "select", { count: 3 });
    supabase.queueResult("issues", "select", {
      data: [
        { severity: "critical", status: "open" },
        { severity: "medium", status: "open" },
        { severity: "low", status: "resolved" },
      ],
    });

    const { DashboardService } = await import("../../../src/modules/dashboard/dashboard.service");
    const summary = await new DashboardService().getSummary("user-1");

    expect(summary.metrics).toMatchObject({
      repositoryCount: 1,
      scanCount: 3,
      openIssueCount: 2,
      criticalIssueCount: 1,
    });
    expect(summary.recentScans[0]).toMatchObject({
      repositoryName: "review-platform",
      repositoryOwner: "openai",
    });
  });
});
