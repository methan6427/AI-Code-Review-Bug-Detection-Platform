import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../../src/pages/DashboardPage";
import { renderWithProviders } from "../utils/render";
import { makeDashboardSummary } from "../../../../tests/factories/domain";

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    getDashboardSummary: vi.fn(),
  },
}));

vi.mock("../../src/lib/api-client", () => ({
  apiClient: apiClientMock,
}));

describe("DashboardPage", () => {
  it("renders dashboard metrics and recent scan data", async () => {
    apiClientMock.getDashboardSummary.mockResolvedValue({ summary: makeDashboardSummary() });

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Welcome back, Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Open issues")).toBeInTheDocument();
    expect(screen.getAllByText("openai/review-platform").length).toBeGreaterThan(0);
  });

  it("renders the error state when loading fails", async () => {
    apiClientMock.getDashboardSummary.mockRejectedValue(new Error("Boom"));

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Boom")).toBeInTheDocument();
  });
});
