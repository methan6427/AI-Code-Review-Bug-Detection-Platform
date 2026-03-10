import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
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
import { EmptyState, ErrorState, LoadingState } from "../components/ui/StatePanel";

export function RepositoriesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultRepositoryFormValues);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstallationId, setSelectedInstallationId] = useState<string>("");

  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [form]);

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
    onSuccess: async () => {
      setError(null);
      setForm(defaultRepositoryFormValues);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to create repository");
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
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to import repository metadata");
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

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Repositories"
        description="Create repository records with realistic metadata and optional code samples for the MVP scan engine."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white">Add repository</h2>
          <form className="mt-5 space-y-4" noValidate onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Repository name</label>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="bug-hunter-api" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Owner</label>
                <Input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} placeholder="adamkhabisa" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Branch</label>
                <Input value={form.branch} onChange={(event) => setForm({ ...form, branch: event.target.value })} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm text-slate-400">GitHub URL</label>
                  <button
                    className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300 transition hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-500"
                    disabled={importGithubMutation.isPending}
                    onClick={handleImportGithub}
                    type="button"
                  >
                    {importGithubMutation.isPending ? "Importing..." : "Import metadata"}
                  </button>
                </div>
                <Input value={form.githubUrl} onChange={(event) => setForm({ ...form, githubUrl: event.target.value })} placeholder="https://github.com/owner/repository" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Access token hint</label>
              <Input value={form.accessTokenHint} onChange={(event) => setForm({ ...form, accessTokenHint: event.target.value })} placeholder="Reserved for phase 2 secure token storage" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Description</label>
              <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="API service focused on payments, auth, and scan reporting." />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Application code sample</label>
              <Textarea className="min-h-40 font-mono" value={form.applicationCode} onChange={(event) => setForm({ ...form, applicationCode: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">package.json sample</label>
              <Textarea className="min-h-32 font-mono" value={form.packageJson} onChange={(event) => setForm({ ...form, packageJson: event.target.value })} />
            </div>
            {error ? <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
            {!error && clientValidationMessage ? <p className="text-sm text-amber-300">{clientValidationMessage}</p> : null}
            <Button disabled={createRepositoryMutation.isPending || Boolean(clientValidationMessage)} type="submit">
              {createRepositoryMutation.isPending ? "Saving..." : "Save repository"}
            </Button>
          </form>
        </Card>

        <div>
          <Card className="mb-6 p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">GitHub App import</h2>
                  <p className="text-sm text-slate-400">Install the GitHub App, then pull repository metadata from an installation.</p>
                </div>
                <Button
                  disabled={githubInstallUrlQuery.isLoading || githubInstallUrlQuery.isError || !githubInstallUrlQuery.data?.url}
                  onClick={() => {
                    if (githubInstallUrlQuery.data?.url) {
                      window.open(githubInstallUrlQuery.data.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  variant="secondary"
                >
                  {githubInstallUrlQuery.isLoading ? "Loading install URL..." : "Install GitHub App"}
                </Button>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">GitHub App installation</label>
                <Select value={selectedInstallationId} onChange={(event) => setSelectedInstallationId(event.target.value)}>
                  <option value="">Select an installation</option>
                  {(githubInstallationsQuery.data?.installations ?? []).map((installation) => (
                    <option key={installation.id} value={installation.id}>
                      {installation.accountLogin} ({installation.repositorySelection})
                    </option>
                  ))}
                </Select>
              </div>

              {githubInstallationsQuery.isError ? <p className="text-sm text-rose-300">{githubInstallationsQuery.error.message}</p> : null}
              {githubInstallationRepositoriesQuery.isError ? (
                <p className="text-sm text-rose-300">{githubInstallationRepositoriesQuery.error.message}</p>
              ) : null}

              {githubInstallationRepositoriesQuery.data?.repositories?.length ? (
                <div className="space-y-3">
                  {githubInstallationRepositoriesQuery.data.repositories.map((repository) => (
                    <div key={repository.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{repository.fullName}</p>
                          <p className="mt-1 text-sm text-slate-400">{repository.description || "No description provided."}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                            {repository.isPrivate ? "Private" : "Public"} • {repository.defaultBranch}
                          </p>
                        </div>
                        <Button onClick={() => handleUseInstallationRepository(repository)} variant="secondary">
                          Use in form
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>

          <h2 className="mb-4 text-lg font-semibold text-white">Connected repositories</h2>
          {repositoriesQuery.isLoading ? <LoadingState title="Loading repositories..." /> : null}
          {repositoriesQuery.isError ? <ErrorState message={repositoriesQuery.error.message} retry={() => void repositoriesQuery.refetch()} /> : null}
          {!repositoriesQuery.isLoading && !repositoriesQuery.isError && repositoriesQuery.data ? (
            repositoriesQuery.data.repositories.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {repositoriesQuery.data.repositories.map((repository) => (
                  <RepositoryCard key={repository.id} repository={repository} />
                ))}
              </div>
            ) : (
              <EmptyState title="No repositories yet" description="Create your first repository record to unlock scan workflows." />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
