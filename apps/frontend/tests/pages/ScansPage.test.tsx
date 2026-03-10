import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScansPage } from "../../src/pages/ScansPage";
import { renderWithProviders } from "../utils/render";
import { makeGithubPushScan, makeRepository } from "../../../../tests/factories/domain";

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
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("renders empty state when scans are absent", async () => {
    apiClientMock.getScans.mockResolvedValue({ scans: [] });
    apiClientMock.getRepositories.mockResolvedValue({ repositories: [] });

    renderWithProviders(<ScansPage />);

    expect(await screen.findByText("No scans available")).toBeInTheDocument();
  });
});
