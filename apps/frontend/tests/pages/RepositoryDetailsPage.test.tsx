import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepositoryDetailsPage } from "../../src/pages/RepositoryDetailsPage";
import { renderWithProviders } from "../utils/render";
import { makeGithubPushScan, makeRepository } from "../../../../tests/factories/domain";

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    getRepository: vi.fn(),
    triggerScan: vi.fn(),
    updateRepository: vi.fn(),
    deleteRepository: vi.fn(),
  },
}));

vi.mock("../../src/lib/api-client", () => ({
  apiClient: apiClientMock,
}));

describe("RepositoryDetailsPage", () => {
  beforeEach(() => {
    apiClientMock.getRepository.mockResolvedValue({
      repository: makeRepository(),
      scans: [makeGithubPushScan({ status: "running" })],
    });
    apiClientMock.triggerScan.mockResolvedValue({});
    apiClientMock.updateRepository.mockResolvedValue({});
    apiClientMock.deleteRepository.mockResolvedValue({});
  });

  it("renders active scan state and disables duplicate trigger actions", async () => {
    renderWithProviders(<RepositoryDetailsPage />, {
      route: "/repositories/repo-1",
      path: "/repositories/:repositoryId",
    });

    expect(await screen.findByText("A scan is currently running for this repository.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Scan in progress" })[0]).toBeDisabled();
  });

  it("shows invalid sample JSON errors before updating", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RepositoryDetailsPage />, {
      route: "/repositories/repo-1",
      path: "/repositories/:repositoryId",
    });

    const textareas = await screen.findAllByRole("textbox");
    const sampleFilesTextarea = textareas[textareas.length - 1];
    fireEvent.change(sampleFilesTextarea, { target: { value: "{bad json}" } });
    expect(await screen.findByText(/Expected property name/)).toBeInTheDocument();
  });
});
