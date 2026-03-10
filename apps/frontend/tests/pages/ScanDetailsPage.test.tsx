import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScanDetailsPage } from "../../src/pages/ScanDetailsPage";
import { renderWithProviders } from "../utils/render";
import { makeGithubPushScan, makeIssue, makeManualScan, makeRepository, makeRetryingScan, makeScanEvent } from "../../../../tests/factories/domain";

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    getScan: vi.fn(),
    getIssuesByScan: vi.fn(),
    updateIssueStatus: vi.fn(),
  },
}));

vi.mock("../../src/lib/api-client", () => ({
  apiClient: apiClientMock,
}));

describe("ScanDetailsPage", () => {
  beforeEach(() => {
    apiClientMock.updateIssueStatus.mockResolvedValue({
      issue: makeIssue({ status: "resolved" }),
    });
  });

  it("renders GitHub scan context, timeline, retries, and triage actions", async () => {
    const scan = makeRetryingScan({ status: "failed", context: makeGithubPushScan().context });
    apiClientMock.getScan.mockResolvedValue({
      scan,
      repository: makeRepository(),
      events: [makeScanEvent({ stage: "retry", level: "warn", message: "Retry scheduled" })],
      issues: [],
    });
    apiClientMock.getIssuesByScan.mockResolvedValue({ issues: [makeIssue()] });
    const user = userEvent.setup();

    renderWithProviders(<ScanDetailsPage />, {
      route: "/scans/scan-1",
      path: "/scans/:scanId",
    });

    expect(await screen.findByText("GitHub Push")).toBeInTheDocument();
    expect(screen.getByText("Retry scheduled")).toBeInTheDocument();
    expect(screen.getByText("Execution metadata")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByText("Last error")).toBeInTheDocument();
    expect(screen.getByText("Previous failure")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(apiClientMock.updateIssueStatus).toHaveBeenCalledWith("issue-1", "resolved"));
    expect(await screen.findByText("Issue triaged")).toBeInTheDocument();
  });

  it("renders manual scans with missing context safely", async () => {
    apiClientMock.getScan.mockResolvedValue({
      scan: makeManualScan({ context: { ...makeManualScan().context, branch: null, commitSha: null, sourceType: null } }),
      repository: makeRepository(),
      events: [],
      issues: [],
    });
    apiClientMock.getIssuesByScan.mockResolvedValue({ issues: [] });

    renderWithProviders(<ScanDetailsPage />, {
      route: "/scans/scan-1",
      path: "/scans/:scanId",
    });

    expect(await screen.findByText("Manual")).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(1);
    expect(screen.getByText("No execution events yet")).toBeInTheDocument();
    expect(screen.getByText("Analyzed file totals are not exposed yet.")).toBeInTheDocument();
  });

  it("reads initial filter values from the URL and can clear them", async () => {
    apiClientMock.getScan.mockResolvedValue({
      scan: makeManualScan(),
      repository: makeRepository(),
      events: [],
      issues: [],
    });
    apiClientMock.getIssuesByScan.mockResolvedValue({ issues: [] });
    const user = userEvent.setup();

    renderWithProviders(<ScanDetailsPage />, {
      route: "/scans/scan-1?severity=critical&status=open",
      path: "/scans/:scanId",
    });

    const selects = await screen.findAllByRole("combobox");
    expect(selects[0]).toHaveValue("critical");
    expect(selects[2]).toHaveValue("open");

    await user.selectOptions(selects[0], "All severities");
    await user.selectOptions(selects[2], "All statuses");

    await waitFor(() => {
      expect(selects[0]).toHaveValue("");
      expect(selects[2]).toHaveValue("");
    });
  });

  it("filters issue groups locally from the search box", async () => {
    apiClientMock.getScan.mockResolvedValue({
      scan: makeManualScan(),
      repository: makeRepository(),
      events: [],
      issues: [],
    });
    apiClientMock.getIssuesByScan.mockResolvedValue({
      issues: [
        makeIssue({ id: "issue-a", title: "Hardcoded secret", filePath: "src/index.ts" }),
        makeIssue({ id: "issue-b", title: "Slow loop", severity: "medium", category: "performance", filePath: "src/worker.ts" }),
      ],
    });
    const user = userEvent.setup();

    renderWithProviders(<ScanDetailsPage />, {
      route: "/scans/scan-1",
      path: "/scans/:scanId",
    });

    await user.type(await screen.findByLabelText("Search issues"), "worker");

    expect(screen.getByText("src/worker.ts")).toBeInTheDocument();
    expect(screen.queryByText("src/index.ts")).not.toBeInTheDocument();
  });
});
