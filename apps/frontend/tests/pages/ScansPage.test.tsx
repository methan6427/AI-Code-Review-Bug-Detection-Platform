import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScansPage } from "../../src/pages/ScansPage";
import { renderWithProviders } from "../utils/render";
import { makeGithubPushScan, makeManualScan, makeRepository, makeRetryingScan } from "../../../../tests/factories/domain";

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    getScans: vi.fn(),
    getRepositories: vi.fn(),
  },
}));

vi.mock("../../src/lib/api-client", () => ({
  apiClient: apiClientMock,
}));

describe("ScansPage", () => {
  it("renders scans with repository labels", async () => {
    apiClientMock.getScans.mockResolvedValue({ scans: [makeGithubPushScan()] });
    apiClientMock.getRepositories.mockResolvedValue({ repositories: [makeRepository()] });

    renderWithProviders(<ScansPage />);

    expect(await screen.findByText("openai/review-platform")).toBeInTheDocument();
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Triggered by a repository push event").length).toBeGreaterThan(0);
  });

  it("renders empty state when scans are absent", async () => {
    apiClientMock.getScans.mockResolvedValue({ scans: [] });
    apiClientMock.getRepositories.mockResolvedValue({ repositories: [] });

    renderWithProviders(<ScansPage />);

    expect(await screen.findByText("No scans available")).toBeInTheDocument();
  });

  it("filters scans by search and source", async () => {
    apiClientMock.getScans.mockResolvedValue({
      scans: [
        makeGithubPushScan(),
        makeManualScan({ id: "scan-2", repositoryId: "repo-2", context: { ...makeManualScan().context, branch: "staging" } }),
      ],
    });
    apiClientMock.getRepositories.mockResolvedValue({
      repositories: [
        makeRepository(),
        makeRepository({ id: "repo-2", owner: "solo", name: "manual-lab" }),
      ],
    });
    const user = userEvent.setup();

    renderWithProviders(<ScansPage />);

    await user.type(await screen.findByLabelText("Search scans"), "manual-lab");
    expect(screen.getByText("solo/manual-lab")).toBeInTheDocument();
    expect(screen.queryByText("openai/review-platform")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search scans"));
    await user.selectOptions(screen.getByRole("combobox", { name: "Source" }), "github_push");
    expect(screen.getByText("openai/review-platform")).toBeInTheDocument();
    expect(screen.queryByText("solo/manual-lab")).not.toBeInTheDocument();
  });

  it("surfaces retrying scans separately from queued ones", async () => {
    apiClientMock.getScans.mockResolvedValue({
      scans: [
        makeRetryingScan(),
        makeManualScan({ id: "scan-2", status: "queued", attemptCount: 1, nextRetryAt: null, errorMessage: null, lastErrorAt: null }),
      ],
    });
    apiClientMock.getRepositories.mockResolvedValue({ repositories: [makeRepository()] });

    renderWithProviders(<ScansPage />);

    expect(await screen.findByText("Retrying")).toBeInTheDocument();
    expect(screen.getByText(/Attempt 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByText("Queued")).toBeInTheDocument();
  });
});
