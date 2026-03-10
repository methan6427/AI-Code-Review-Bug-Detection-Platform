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

    expect(await screen.findByText("github_push")).toBeInTheDocument();
    expect(screen.getByText("Retry scheduled")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Mark resolved" }));
    await waitFor(() => expect(apiClientMock.updateIssueStatus).toHaveBeenCalledWith("issue-1", "resolved"));
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

    expect(await screen.findByText("manual")).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(1);
    expect(await screen.findByText("No issues match the active filters")).toBeInTheDocument();
    expect(screen.getByText("No execution events yet")).toBeInTheDocument();
  });
});
