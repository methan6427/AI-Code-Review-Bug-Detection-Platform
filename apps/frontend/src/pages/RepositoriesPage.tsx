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
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/StatePanel";

export function RepositoriesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultRepositoryFormValues);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [form]);

  const repositoriesQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: () => apiClient.getRepositories(),
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
                <label className="mb-2 block text-sm text-slate-400">GitHub URL</label>
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
