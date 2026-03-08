import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import type { UpdateRepositoryRequest } from "@ai-review/shared";
import { apiClient } from "../lib/api-client";
import { mapRepositoryFormToUpdateRequest, validateRepositoryForm, stringifySampleFiles } from "../features/repositories/form";
import { getRepositoryLabel, hasActiveScan } from "../lib/scans";
import { formatDateTime } from "../lib/utils";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input, Textarea } from "../components/ui/Input";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/StatePanel";
import { Badge } from "../components/ui/Badge";
import { ScanRow } from "../components/ScanRow";

export function RepositoryDetailsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const repositoryId = params.repositoryId!;
  const [form, setForm] = useState({
    name: "",
    owner: "",
    branch: "main",
    githubUrl: "",
    accessTokenHint: "",
    description: "",
    sampleFilesJson: "[]",
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (formError) {
      setFormError(null);
    }
  }, [form]);

  const query = useQuery({
    queryKey: ["repository", repositoryId],
    queryFn: () => apiClient.getRepository(repositoryId),
    refetchInterval: (currentQuery) => {
      const detail = currentQuery.state.data;
      if (!detail) {
        return false;
      }

      return hasActiveScan(detail.scans) ? 3000 : false;
    },
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }

    const { repository } = query.data;
    setForm({
      name: repository.name,
      owner: repository.owner,
      branch: repository.branch,
      githubUrl: repository.githubUrl,
      accessTokenHint: repository.accessTokenHint ?? "",
      description: repository.description ?? "",
      sampleFilesJson: stringifySampleFiles(repository.sampleFiles),
    });
  }, [query.data]);

  const scanMutation = useMutation({
    mutationFn: () => apiClient.triggerScan(repositoryId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repository", repositoryId] }),
        queryClient.invalidateQueries({ queryKey: ["scans"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateRepositoryRequest) => apiClient.updateRepository(repositoryId, payload),
    onSuccess: async () => {
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repository", repositoryId] }),
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["scans"] }),
      ]);
    },
    onError: (mutationError) => {
      setFormError(mutationError instanceof Error ? mutationError.message : "Unable to update repository");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.deleteRepository(repositoryId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["scans"] }),
      ]);
      navigate("/repositories", { replace: true });
    },
    onError: (mutationError) => {
      setFormError(mutationError instanceof Error ? mutationError.message : "Unable to delete repository");
    },
  });

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();

    let payload: UpdateRepositoryRequest;
    try {
      payload = mapRepositoryFormToUpdateRequest(form);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid sample files JSON");
      return;
    }

    const validationError = validateRepositoryForm({
      name: payload.name ?? "",
      owner: payload.owner ?? "",
      branch: payload.branch ?? "",
      githubUrl: payload.githubUrl ?? "",
      description: payload.description ?? "",
      sampleFiles: payload.sampleFiles,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    await updateMutation.mutateAsync(payload);
  };

  const validationMessage = (() => {
    try {
      const payload = mapRepositoryFormToUpdateRequest(form);
      return validateRepositoryForm({
        name: payload.name ?? "",
        owner: payload.owner ?? "",
        branch: payload.branch ?? "",
        githubUrl: payload.githubUrl ?? "",
        description: payload.description ?? "",
        sampleFiles: payload.sampleFiles,
      });
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid sample files JSON";
    }
  })();

  const handleDelete = () => {
    if (!window.confirm("Delete this repository and all related scans/issues?")) {
      return;
    }

    deleteMutation.mutate();
  };

  if (query.isLoading) {
    return <LoadingState title="Loading repository details..." />;
  }

  if (query.isError) {
    return <ErrorState message={query.error.message} retry={() => void query.refetch()} />;
  }

  if (!query.data) {
    return <LoadingState title="Preparing repository..." />;
  }

  const { repository, scans } = query.data;

  return (
    <div className="space-y-8">
      <SectionHeader
        title={`${repository.owner}/${repository.name}`}
        description={repository.description || "Manual repository record prepared for MVP scanning."}
        action={
          <div className="flex flex-wrap gap-3">
            <Button disabled={deleteMutation.isPending} onClick={handleDelete} variant="secondary">
              {deleteMutation.isPending ? "Deleting..." : "Delete repository"}
            </Button>
            <Button disabled={scanMutation.isPending} onClick={() => scanMutation.mutate()}>
              {scanMutation.isPending ? "Queueing..." : "Run scan"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Repository metadata</h2>
            <Badge tone="info">{repository.branch}</Badge>
          </div>
          <form className="mt-5 space-y-4" noValidate onSubmit={handleUpdate}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Repository name</label>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Owner</label>
                <Input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Branch</label>
                <Input value={form.branch} onChange={(event) => setForm({ ...form, branch: event.target.value })} />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">GitHub URL</label>
                <Input value={form.githubUrl} onChange={(event) => setForm({ ...form, githubUrl: event.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Access token hint</label>
              <Input value={form.accessTokenHint} onChange={(event) => setForm({ ...form, accessTokenHint: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Description</label>
              <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Sample files JSON</label>
              <Textarea
                className="min-h-64 font-mono"
                value={form.sampleFilesJson}
                onChange={(event) => setForm({ ...form, sampleFilesJson: event.target.value })}
              />
            </div>
            <div className="grid gap-4 text-sm text-slate-300 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Created</p>
                <p className="mt-2">{formatDateTime(repository.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Last scan</p>
                <p className="mt-2">{formatDateTime(repository.lastScanAt)}</p>
              </div>
            </div>
            {formError ? <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{formError}</p> : null}
            {!formError && validationMessage ? <p className="text-sm text-amber-300">{validationMessage}</p> : null}
            <Button disabled={updateMutation.isPending || Boolean(validationMessage)} type="submit">
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Scan history</h2>
            <span className="text-sm text-slate-500">{scans.length} total</span>
          </div>
          <div className="mt-5 space-y-3">
            {scans.length > 0 ? (
              scans.map((scan) => <ScanRow key={scan.id} scan={scan} repositoryLabel={getRepositoryLabel(repository)} />)
            ) : (
              <EmptyState title="No scans yet" description="Run the first scan to generate a findings report for this repository." />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
