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

const baseIssueRow = {
  id: "issue-1",
  scan_id: "scan-1",
  repository_id: "repo-1",
  severity: "high" as const,
  category: "bug" as const,
  status: "open" as const,
  title: "Broken flow",
  description: "desc",
  recommendation: "fix",
  file_path: null,
  line_number: null,
  rule_code: null,
  metadata: {},
  triage_note: null,
  assigned_to: null,
  last_status_changed_at: null,
  last_status_changed_by: null,
  created_at: "2026-03-10T08:00:00.000Z",
};

describe("IssueService", () => {
  beforeEach(() => {
    supabase.reset();
    repositoryServiceMock.listOwnedRepositoryIds.mockReset();
  });

  it("applies issue filters when listing scan issues", async () => {
    repositoryServiceMock.listOwnedRepositoryIds.mockResolvedValue(["repo-1"]);
    supabase.queueResult("scans", "select", { data: { id: "scan-1" } });
    supabase.queueResult("issues", "select", {
      data: [
        {
          ...baseIssueRow,
          id: "issue-1",
          severity: "critical",
          category: "security",
        },
      ],
    });

    const { IssueService } = await import("../../../src/modules/issues/issue.service");
    const issues = await new IssueService().listByScan("user-1", "scan-1", { severity: "critical", status: "open" });

    expect(issues).toHaveLength(1);
    const calls = supabase.getCalls("issues", "select");
    expect(calls.at(-1)?.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: "scan_id", value: "scan-1" }),
        expect.objectContaining({ column: "severity", value: "critical" }),
        expect.objectContaining({ column: "status", value: "open" }),
      ]),
    );
  });

  it("updates issue triage status only for owned repositories", async () => {
    repositoryServiceMock.listOwnedRepositoryIds.mockResolvedValue(["repo-1"]);
    supabase.queueResult("issues", "select", { data: baseIssueRow });
    supabase.queueResult("issues", "update", {
      data: { ...baseIssueRow, status: "ignored", last_status_changed_by: "user-1" },
    });
    supabase.queueResult("issue_activity", "insert", { data: null });

    const { IssueService } = await import("../../../src/modules/issues/issue.service");
    const issue = await new IssueService().updateStatus("user-1", "issue-1", "ignored");

    expect(issue.status).toBe("ignored");
    const activityCalls = supabase.getCalls("issue_activity", "insert");
    expect(activityCalls).toHaveLength(1);
    const entries = activityCalls[0]?.payload as Array<{ action: string }>;
    expect(entries?.[0]?.action).toBe("status_changed");
  });

  it("writes note_added activity when triage note is first set", async () => {
    repositoryServiceMock.listOwnedRepositoryIds.mockResolvedValue(["repo-1"]);
    supabase.queueResult("issues", "select", { data: baseIssueRow });
    supabase.queueResult("issues", "update", {
      data: { ...baseIssueRow, triage_note: "needs review" },
    });
    supabase.queueResult("issue_activity", "insert", { data: null });

    const { IssueService } = await import("../../../src/modules/issues/issue.service");
    const issue = await new IssueService().updateTriage("user-1", "issue-1", { triageNote: "needs review" });

    expect(issue.triageNote).toBe("needs review");
    const activityCalls = supabase.getCalls("issue_activity", "insert");
    const entries = activityCalls[0]?.payload as Array<{ action: string; note: string | null }>;
    expect(entries?.[0]).toMatchObject({ action: "note_added", note: "needs review" });
  });

  it("bulk-update reports failed ids for inaccessible issues", async () => {
    repositoryServiceMock.listOwnedRepositoryIds.mockResolvedValue(["repo-1"]);
    supabase.queueResult("issues", "select", {
      data: [baseIssueRow],
    });
    supabase.queueResult("issues", "select", { data: baseIssueRow });
    supabase.queueResult("issues", "update", {
      data: { ...baseIssueRow, status: "resolved" },
    });
    supabase.queueResult("issue_activity", "insert", { data: null });

    const { IssueService } = await import("../../../src/modules/issues/issue.service");
    const result = await new IssueService().bulkUpdate("user-1", {
      issueIds: ["issue-1", "issue-missing"],
      status: "resolved",
    });

    expect(result.failedIds).toEqual(["issue-missing"]);
    expect(result.updated).toHaveLength(1);
    expect(result.updated[0]?.status).toBe("resolved");
  });

  it("lists activity entries for issue after verifying ownership", async () => {
    repositoryServiceMock.listOwnedRepositoryIds.mockResolvedValue(["repo-1"]);
    supabase.queueResult("issues", "select", { data: { id: "issue-1" } });
    supabase.queueResult("issue_activity", "select", {
      data: [
        {
          id: "activity-1",
          issue_id: "issue-1",
          actor_id: "user-1",
          action: "status_changed",
          previous_value: { status: "open" },
          next_value: { status: "resolved" },
          note: null,
          created_at: "2026-04-01T10:00:00.000Z",
        },
      ],
    });

    const { IssueService } = await import("../../../src/modules/issues/issue.service");
    const activity = await new IssueService().listActivity("user-1", "issue-1");

    expect(activity).toHaveLength(1);
    expect(activity[0]?.action).toBe("status_changed");
  });
});
