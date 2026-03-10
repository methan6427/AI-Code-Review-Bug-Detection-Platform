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
          id: "issue-1",
          scan_id: "scan-1",
          repository_id: "repo-1",
          severity: "critical",
          category: "security",
          status: "open",
          title: "Hardcoded secret",
          description: "secret",
          recommendation: "move it",
          file_path: "src/index.ts",
          line_number: 4,
          rule_code: "secret",
          metadata: {},
          created_at: "2026-03-10T08:00:00.000Z",
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
    supabase.queueResult("issues", "select", {
      data: {
        id: "issue-1",
        scan_id: "scan-1",
        repository_id: "repo-1",
        severity: "high",
        category: "bug",
        status: "open",
        title: "Broken flow",
        description: "desc",
        recommendation: "fix",
        file_path: null,
        line_number: null,
        rule_code: null,
        metadata: {},
        created_at: "2026-03-10T08:00:00.000Z",
      },
    });
    supabase.queueResult("issues", "update", {
      data: {
        id: "issue-1",
        scan_id: "scan-1",
        repository_id: "repo-1",
        severity: "high",
        category: "bug",
        status: "ignored",
        title: "Broken flow",
        description: "desc",
        recommendation: "fix",
        file_path: null,
        line_number: null,
        rule_code: null,
        metadata: {},
        created_at: "2026-03-10T08:00:00.000Z",
      },
    });

    const { IssueService } = await import("../../../src/modules/issues/issue.service");
    const issue = await new IssueService().updateStatus("user-1", "issue-1", "ignored");

    expect(issue.status).toBe("ignored");
  });
});
