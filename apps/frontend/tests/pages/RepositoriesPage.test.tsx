import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepositoriesPage } from "../../src/pages/RepositoriesPage";
import { renderWithProviders } from "../utils/render";
import { makeRepository } from "../../../../tests/factories/domain";

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    getRepositories: vi.fn(),
    getGithubAppInstallUrl: vi.fn(),
    getGithubInstallations: vi.fn(),
    getGithubInstallationRepositories: vi.fn(),
    createRepository: vi.fn(),
    importGithubRepository: vi.fn(),
  },
}));

vi.mock("../../src/lib/api-client", () => ({
  apiClient: apiClientMock,
}));

describe("RepositoriesPage", () => {
  beforeEach(() => {
    apiClientMock.getRepositories.mockResolvedValue({ repositories: [makeRepository()] });
    apiClientMock.getGithubAppInstallUrl.mockResolvedValue({ url: "https://github.com/apps/ai-review/installations/new" });
    apiClientMock.getGithubInstallations.mockResolvedValue({ installations: [{ id: 123, accountLogin: "openai", repositorySelection: "selected" }] });
    apiClientMock.getGithubInstallationRepositories.mockResolvedValue({
      repositories: [
        {
          id: 99,
          name: "imported-repo",
          fullName: "openai/imported-repo",
          owner: "openai",
          defaultBranch: "main",
          htmlUrl: "https://github.com/openai/imported-repo",
          description: "Imported repo",
          isPrivate: false,
          installationId: 123,
        },
      ],
    });
    apiClientMock.createRepository.mockResolvedValue({ repository: makeRepository() });
    apiClientMock.importGithubRepository.mockResolvedValue({
      repository: {
        name: "imported-repo",
        owner: "openai",
        branch: "main",
        githubUrl: "https://github.com/openai/imported-repo",
        githubInstallationId: 123,
        githubRepositoryId: 99,
        description: "Imported repo",
      },
    });
  });

  it("renders repository list and installation-backed import UX", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RepositoriesPage />);

    expect(await screen.findByText("Connected repositories")).toBeInTheDocument();
    expect(await screen.findByText("review-platform")).toBeInTheDocument();

    await user.selectOptions(screen.getAllByRole("combobox")[0], "123");
    expect(await screen.findByText("openai/imported-repo")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Use in form" }));
    await waitFor(() => expect(screen.getByDisplayValue("imported-repo")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Import metadata" }));
    expect(await screen.findByText("Repository metadata imported")).toBeInTheDocument();
  });

  it("shows client validation instead of submitting invalid repository forms", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RepositoriesPage />);

    const repositoryNameInput = (await screen.findAllByRole("textbox"))[0];
    await user.clear(repositoryNameInput);
    await user.type(repositoryNameInput, "a");
    expect(screen.getByText("Repository name must be at least 2 characters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save repository" })).toBeDisabled();
  });

  it("filters repositories by search text and source", async () => {
    apiClientMock.getRepositories.mockResolvedValue({
      repositories: [
        makeRepository(),
        makeRepository({
          id: "repo-2",
          name: "manual-lab",
          owner: "solo",
          githubInstallationId: null,
          githubRepositoryId: null,
        }),
      ],
    });
    const user = userEvent.setup();

    renderWithProviders(<RepositoriesPage />);

    await user.type(await screen.findByPlaceholderText("Search by name, owner, branch, URL, or description"), "manual");
    expect(screen.getByText("manual-lab")).toBeInTheDocument();
    expect(screen.queryByText("review-platform")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search by name, owner, branch, URL, or description"));
    await user.selectOptions(screen.getByRole("combobox", { name: "Source" }), "github");
    expect(screen.getByText("review-platform")).toBeInTheDocument();
    expect(screen.queryByText("manual-lab")).not.toBeInTheDocument();
  });
});
