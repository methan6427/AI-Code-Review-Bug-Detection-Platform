import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import {
  defaultRepositoryFormValues,
  mapRepositoryFormToCreateRequest,
  validateRepositoryForm,
} from "../features/repositories/form";
import { RepositoryCard } from "../components/RepositoryCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input, Textarea } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState, ErrorState, ListItemSkeleton, MetricCardSkeleton } from "../components/ui/StatePanel";
import { Badge } from "../components/ui/Badge";
import { HintPanel } from "../components/ui/HintPanel";
import { FilterIcon, GithubIcon, RepositoryIcon, SearchIcon, SparkIcon } from "../components/ui/icons";
import { InlineMessage } from "../components/ui/InlineMessage";
import { useToast } from "../components/ui/Toast";
import { feedbackMessages } from "../lib/feedback";

export function RepositoriesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultRepositoryFormValues);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstallationId, setSelectedInstallationId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [connectionFilter, setConnectionFilter] = useState<"all" | "github" | "manual">("all");
  const { pushToast } = useToast();

  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [form, error]);

  const repositoriesQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: () => apiClient.getRepositories(),
  });
  const githubInstallUrlQuery = useQuery({
    queryKey: ["github-app-install-url"],
    queryFn: () => apiClient.getGithubAppInstallUrl(),
  });
  const githubInstallationsQuery = useQuery({
    queryKey: ["github-installations"],
    queryFn: () => apiClient.getGithubInstallations(),
  });
  const githubInstallationRepositoriesQuery = useQuery({
    queryKey: ["github-installation-repositories", selectedInstallationId],
    queryFn: () => apiClient.getGithubInstallationRepositories(Number(selectedInstallationId)),
    enabled: Boolean(selectedInstallationId),
  });

  const createRepositoryMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof mapRepositoryFormToCreateRequest>) => apiClient.createRepository(payload),
    onSuccess: async ({ repository }) => {
      setError(null);
      setForm(defaultRepositoryFormValues);
      pushToast(feedbackMessages.repositoryCreated(`${repository.owner}/${repository.name}`));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to create repository";
      setError(message);
      pushToast({ tone: "error", title: "Repository add failed", description: message });
    },
  });

  const importGithubMutation = useMutation({
    mutationFn: (githubUrl: string) => apiClient.importGithubRepository(githubUrl),
    onSuccess: ({ repository }) => {
      setError(null);
      setForm((currentForm) => ({
        ...currentForm,
        name: repository.name,
        owner: repository.owner,
        branch: repository.branch,
        githubUrl: repository.githubUrl,
        githubInstallationId: repository.githubInstallationId ? String(repository.githubInstallationId) : "",
        githubRepositoryId: repository.githubRepositoryId ? String(repository.githubRepositoryId) : "",
        description: repository.description ?? "",
      }));
      pushToast(feedbackMessages.repositoryImported(`${repository.owner}/${repository.name}`));
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to import repository metadata";
      setError(message);
      pushToast({ tone: "error", title: "Repository import failed", description: message });
    },
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = mapRepositoryFormToCreateRequest(form);
    const validationError = validateRepositoryForm({
      name: payload.name,
      owner: payload.owner,
      branch: payload.branch,
      githubUrl: payload.githubUrl,
      description: payload.description ?? "",
      sampleFiles: payload.sampleFiles,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    await createRepositoryMutation.mutateAsync(payload);
  };

  const clientValidationMessage = validateRepositoryForm({
    name: form.name,
    owner: form.owner,
    branch: form.branch,
    githubUrl: form.githubUrl,
    description: form.description,
  });

  const handleImportGithub = () => {
    const githubUrl = form.githubUrl.trim();
    if (!githubUrl) {
      setError("Enter a GitHub URL first");
      return;
    }

    importGithubMutation.mutate(githubUrl);
  };

  const handleUseInstallationRepository = (repository: {
    id: number;
    name: string;
    owner: string;
    defaultBranch: string;
    htmlUrl: string;
    description: string | null;
    installationId: number;
  }) => {
    setForm((currentForm) => ({
      ...currentForm,
      name: repository.name,
      owner: repository.owner,
      branch: repository.defaultBranch,
      githubUrl: repository.htmlUrl,
      githubInstallationId: String(repository.installationId),
      githubRepositoryId: String(repository.id),
      description: repository.description ?? "",
    }));
  };

  const installationCount = githubInstallationsQuery.data?.installations.length ?? 0;
  const repositories = repositoriesQuery.data?.repositories ?? [];
  const filteredRepositories = repositories.filter((repository) => {
    const query = search.trim().toLowerCase();
    const isGithubConnected = Boolean(repository.githubInstallationId || repository.githubRepositoryId);
    const matchesSearch =
      !query ||
      [repository.name, repository.owner, repository.branch, repository.description ?? "", repository.githubUrl ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesConnection =
      connectionFilter === "all" ||
      (connectionFilter === "github" ? isGithubConnected : !isGithubConnected);

    return matchesSearch && matchesConnection;
  });
  const hasRepositoryFilters = Boolean(search.trim()) || connectionFilter !== "all";
  const isRepositoryPanelLoading = repositoriesQuery.isLoading;
  const isInstallPanelLoading = githubInstallUrlQuery.isLoading || githubInstallationsQuery.isLoading;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Repository Management"
        title="Repositories"
        description="Create repository records with realistic metadata, sample code, and optional GitHub installation context so scans carry meaningful source information."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Repository inventory</p>
          <p className="mt-3 text-3xl font-semibold text-white">{repositories.length}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">Repository records available for scan execution and reporting.</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">GitHub installations</p>
          <p className="mt-3 text-3xl font-semibold text-white">{installationCount}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">Installation-backed imports help prefill repository source, branch, and ownership details.</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Onboarding tip</p>
          <p className="mt-3 text-lg font-semibold text-white">Start with metadata import, then refine sample files.</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">This keeps repository setup fast while still letting scans produce richer findings.</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <HintPanel
          icon={<GithubIcon className="h-4 w-4" />}
          title="GitHub App import is the fastest setup path"
          description="Install the GitHub App to prefill owner, branch, and repository identity. App-backed repositories are also positioned for automatic push and pull request scans later."
        />
        <HintPanel
          icon={<RepositoryIcon className="h-4 w-4" />}
          title="Manual repositories still matter"
          description="Manual setup is useful for baseline analysis, demos, and repos you do not want to connect to GitHub yet. Add realistic sample files to improve scan relevance."
        />
        <HintPanel
          icon={<SparkIcon className="h-4 w-4" />}
          title="How repository states work"
          description="Ready to scan means the record has GitHub context or sample files. A last scan timestamp indicates prior activity, while connection chips distinguish App-backed and manual records."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Add repository</h2>
              <p className="mt-1 text-sm text-slate-400">Use the form below to create a repository record with enough detail for meaningful scan output.</p>
            </div>
            <Badge tone="manual">manual + import</Badge>
          </div>
          <form className="mt-6 space-y-6" noValidate onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Repository name</label>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="bug-hunter-api" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Owner</label>
                <Input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} placeholder="adamkhabisa" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Branch</label>
                <Input value={form.branch} onChange={(event) => setForm({ ...form, branch: event.target.value })} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-300">GitHub URL</label>
                  <button
                    className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300 transition hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-500"
                    disabled={importGithubMutation.isPending}
                    onClick={handleImportGithub}
                    type="button"
                  >
                    {importGithubMutation.isPending ? "Importing..." : "Import metadata"}
                  </button>
                </div>
                <Input
                  value={form.githubUrl}
                  onChange={(event) => setForm({ ...form, githubUrl: event.target.value })}
                  placeholder="https://github.com/owner/repository"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">Use metadata import when the URL is valid. It reduces manual typing and keeps source attribution cleaner.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Access token hint</label>
                  <Input
                    value={form.accessTokenHint}
                    onChange={(event) => setForm({ ...form, accessTokenHint: event.target.value })}
                    placeholder="Reserved for phase 2 secure token storage"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="API service focused on payments, auth, and scan reporting."
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-300">Application code sample</label>
                  <span className="text-xs text-slate-500">Used by the scan engine to simulate findings.</span>
                </div>
                <Textarea className="min-h-40 font-mono" value={form.applicationCode} onChange={(event) => setForm({ ...form, applicationCode: event.target.value })} />
                <p className="mt-2 text-xs leading-5 text-slate-500">Manual scans rely on these files when no live clone source is attached.</p>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-300">package.json sample</label>
                  <span className="text-xs text-slate-500">Helps dependency and package heuristics.</span>
                </div>
                <Textarea className="min-h-32 font-mono" value={form.packageJson} onChange={(event) => setForm({ ...form, packageJson: event.target.value })} />
                <p className="mt-2 text-xs leading-5 text-slate-500">Dependency context helps explain findings that would otherwise look too generic.</p>
              </div>
            </div>

            {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
            {!error && clientValidationMessage ? <InlineMessage tone="warning">{clientValidationMessage}</InlineMessage> : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">A complete repository record improves scan context, source labeling, and issue relevance.</p>
              <Button disabled={createRepositoryMutation.isPending || Boolean(clientValidationMessage)} type="submit">
                {createRepositoryMutation.isPending ? "Saving..." : "Save repository"}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">GitHub App import</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Install the GitHub App, then pull repository metadata from an installation to reduce manual setup.
                  </p>
                </div>
                <Button
                  disabled={githubInstallUrlQuery.isLoading || githubInstallUrlQuery.isError || !githubInstallUrlQuery.data?.url}
                  onClick={() => {
                    if (githubInstallUrlQuery.data?.url) {
                      pushToast(feedbackMessages.githubConnectStarted());
                      window.open(githubInstallUrlQuery.data.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  variant="secondary"
                >
                  {githubInstallUrlQuery.isLoading ? "Loading install URL..." : "Install GitHub App"}
                </Button>
              </div>

              <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
                <label className="mb-2 block text-sm font-medium text-slate-300">GitHub App installation</label>
                <Select value={selectedInstallationId} onChange={(event) => setSelectedInstallationId(event.target.value)}>
                  <option value="">Select an installation</option>
                  {(githubInstallationsQuery.data?.installations ?? []).map((installation) => (
                    <option key={installation.id} value={installation.id}>
                      {installation.accountLogin} ({installation.repositorySelection})
                    </option>
                  ))}
                </Select>
                <p className="mt-2 text-xs text-slate-500">Pick an installation to see repositories available for quick form prefilling. Automatic GitHub-triggered scans depend on webhook events from this connection.</p>
              </div>

              {isInstallPanelLoading ? (
                <div className="space-y-3">
                  <ListItemSkeleton />
                  <ListItemSkeleton />
                </div>
              ) : null}

              {githubInstallationsQuery.isError ? (
                <ErrorState
                  title="GitHub installations unavailable"
                  message={githubInstallationsQuery.error.message}
                  retry={() => void githubInstallationsQuery.refetch()}
                />
              ) : null}
              {githubInstallationRepositoriesQuery.isError ? (
                <ErrorState
                  title="Installation repositories unavailable"
                  message={githubInstallationRepositoriesQuery.error.message}
                  retry={() => void githubInstallationRepositoriesQuery.refetch()}
                />
              ) : null}

              {githubInstallationRepositoriesQuery.data?.repositories?.length ? (
                <div className="space-y-3">
                  {githubInstallationRepositoriesQuery.data.repositories.map((repository) => (
                    <div key={repository.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-white">{repository.fullName}</p>
                            <Badge tone={repository.isPrivate ? "default" : "github_push"}>{repository.isPrivate ? "private" : "public"}</Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-400">{repository.description || "No description provided."}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">Default branch {repository.defaultBranch}</p>
                        </div>
                        <Button onClick={() => handleUseInstallationRepository(repository)} variant="secondary">
                          Use in form
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : githubInstallationRepositoriesQuery.isLoading ? (
                <div className="space-y-3">
                  <ListItemSkeleton />
                  <ListItemSkeleton />
                </div>
              ) : !selectedInstallationId && !isInstallPanelLoading && !githubInstallationsQuery.isError ? (
                <EmptyState
                  eyebrow="Import"
                  title="No GitHub installation selected"
                  description="Choose an installation to browse repositories that can prefill the creation form."
                />
              ) : selectedInstallationId && !githubInstallationRepositoriesQuery.isLoading ? (
                <EmptyState
                  eyebrow="Import"
                  title="No repositories available"
                  description="This installation did not return importable repositories yet. Verify repository access in GitHub and try again."
                />
              ) : null}
            </div>
          </Card>

          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white">Connected repositories</h2>
                <p className="mt-1 text-sm text-slate-400">All repository records currently available for scans.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={hasRepositoryFilters ? "manual" : "info"}>
                  {filteredRepositories.length} of {repositories.length}
                </Badge>
                {hasRepositoryFilters ? (
                  <button
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:text-slate-200"
                    onClick={() => {
                      setSearch("");
                      setConnectionFilter("all");
                    }}
                    type="button"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mb-4">
              <HintPanel
                title="Reading the repository cards"
                description="The chips call out connection type, lightweight health, and scan readiness. Use them to spot which repositories are already primed for a manual scan and which still need context."
                className="bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(8,47,73,0.42))]"
              />
            </div>
            <Card className="mb-4 p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                    <SearchIcon className="h-4 w-4 text-slate-500" />
                    Search repositories
                  </label>
                  <Input
                    aria-label="Search repositories"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name, owner, branch, URL, or description"
                  />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                    <FilterIcon className="h-4 w-4 text-slate-500" />
                    Source
                  </label>
                  <Select
                    aria-label="Source"
                    value={connectionFilter}
                    onChange={(event) => setConnectionFilter(event.target.value as "all" | "github" | "manual")}
                  >
                    <option value="all">All repositories</option>
                    <option value="github">GitHub App connected</option>
                    <option value="manual">Manual only</option>
                  </Select>
                </div>
              </div>
            </Card>
            {isRepositoryPanelLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </div>
            ) : null}
            {repositoriesQuery.isError ? (
              <ErrorState
                title="Repositories unavailable"
                message={repositoriesQuery.error.message}
                retry={() => void repositoriesQuery.refetch()}
                action={
                  <Link to="/dashboard">
                    <Button variant="ghost">Back to dashboard</Button>
                  </Link>
                }
              />
            ) : null}
            {!repositoriesQuery.isLoading && !repositoriesQuery.isError ? (
              repositories.length === 0 ? (
                <EmptyState
                  eyebrow="Repositories"
                  title="No repositories yet"
                  description="Create your first repository record to unlock scan workflows, activity summaries, and issue triage."
                  action={
                    <Button onClick={() => document.querySelector("form")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                      Open form
                    </Button>
                  }
                />
              ) : filteredRepositories.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredRepositories.map((repository) => (
                    <RepositoryCard key={repository.id} repository={repository} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  eyebrow="Filters"
                  title="No repositories match this filter"
                  description="Try a broader search or switch the source filter to find the repository you want."
                />
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
