import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import type { UpdateRepositoryRequest } from "@ai-review/shared";
import { apiClient } from "../lib/api-client";
import { mapRepositoryFormToUpdateRequest, validateRepositoryForm, stringifySampleFiles } from "../features/repositories/form";
import {
  getRepositoryConnectionLabel,
  getRepositoryHealthState,
  getRepositoryLabel,
  getRepositoryReadinessLabel,
  getRepositorySourceLabel,
  hasActiveScan,
} from "../lib/scans";
import { formatDateTime, formatRelativeTime } from "../lib/utils";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input, Textarea } from "../components/ui/Input";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/StatePanel";
import { Badge } from "../components/ui/Badge";
import { ScanRow } from "../components/ScanRow";
import { HintPanel } from "../components/ui/HintPanel";
import { BranchIcon, ClockIcon, GithubIcon, RepositoryIcon, SparkIcon } from "../components/ui/icons";
import { InlineMessage } from "../components/ui/InlineMessage";
import { useToast } from "../components/ui/Toast";
import { feedbackMessages } from "../lib/feedback";

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
    githubInstallationId: "",
    githubRepositoryId: "",
    accessTokenHint: "",
    description: "",
    sampleFilesJson: "[]",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const { pushToast } = useToast();

  useEffect(() => {
    if (formError) {
      setFormError(null);
    }
  }, [form, formError]);

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
      githubInstallationId: repository.githubInstallationId ? String(repository.githubInstallationId) : "",
      githubRepositoryId: repository.githubRepositoryId ? String(repository.githubRepositoryId) : "",
      accessTokenHint: repository.accessTokenHint ?? "",
      description: repository.description ?? "",
      sampleFilesJson: stringifySampleFiles(repository.sampleFiles),
    });
  }, [query.data]);

  const scanMutation = useMutation({
    mutationFn: () => apiClient.triggerScan(repositoryId),
    onSuccess: async () => {
      setScanError(null);
      pushToast(feedbackMessages.scanQueued());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repository", repositoryId] }),
        queryClient.invalidateQueries({ queryKey: ["scans"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to queue scan";
      setScanError(message);
      pushToast({ tone: "error", title: "Scan queue failed", description: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateRepositoryRequest) => apiClient.updateRepository(repositoryId, payload),
    onSuccess: async () => {
      setFormError(null);
      pushToast(feedbackMessages.repositoryUpdated());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repository", repositoryId] }),
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["scans"] }),
      ]);
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to update repository";
      setFormError(message);
      pushToast({ tone: "error", title: "Repository update failed", description: message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.deleteRepository(repositoryId),
    onSuccess: async () => {
      pushToast(feedbackMessages.repositoryDeleted());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["scans"] }),
      ]);
      navigate("/repositories", { replace: true });
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to delete repository";
      setFormError(message);
      pushToast({ tone: "error", title: "Repository delete failed", description: message });
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
  const activeScan = scans.find((scan) => scan.status === "queued" || scan.status === "running");
  const health = getRepositoryHealthState(repository);
  const sourceLabel = getRepositorySourceLabel(repository);
  const readinessLabel = getRepositoryReadinessLabel(repository);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Repository"
        title={`${repository.owner}/${repository.name}`}
        description={repository.description || "Manual repository record prepared for MVP scanning."}
        action={
          <div className="flex flex-wrap gap-3">
            <Button disabled={deleteMutation.isPending} onClick={handleDelete} variant="secondary">
              {deleteMutation.isPending ? "Deleting..." : "Delete repository"}
            </Button>
            <Button disabled={scanMutation.isPending || Boolean(activeScan)} onClick={() => scanMutation.mutate()}>
              {scanMutation.isPending ? "Queueing..." : activeScan ? "Scan in progress" : "Run scan"}
            </Button>
          </div>
        }
      />

      {scanError ? <InlineMessage tone="error">{scanError}</InlineMessage> : null}
      {!scanError && activeScan ? (
        <InlineMessage tone="info">
          {activeScan.status === "queued" ? "A scan is already queued for this repository." : "A scan is currently running for this repository."}
        </InlineMessage>
      ) : null}

      <Card className="overflow-hidden p-6 sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={repository.githubInstallationId || repository.githubRepositoryId ? "github_push" : "manual"}>
                {getRepositoryConnectionLabel(repository)}
              </Badge>
              <Badge tone={health.tone}>{health.label}</Badge>
              <Badge tone="info">{readinessLabel}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-slate-100">
                {repository.githubInstallationId || repository.githubRepositoryId ? (
                  <GithubIcon className="h-5 w-5" />
                ) : (
                  <RepositoryIcon className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{repository.owner}</p>
                <h2 className="text-2xl font-semibold text-white sm:text-3xl">{repository.name}</h2>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              {repository.description || "Repository record prepared for scanning. Keep branch, source, and sample file context aligned so scan output stays trustworthy."}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Owner</p>
                <p className="mt-2 text-sm font-medium text-white">{repository.owner}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Branch</p>
                <p className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                  <BranchIcon className="h-4 w-4 text-slate-400" />
                  {repository.branch}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Source type</p>
                <p className="mt-2 text-sm font-medium text-white">{sourceLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Last scan</p>
                <p className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                  <ClockIcon className="h-4 w-4 text-slate-400" />
                  {formatRelativeTime(repository.lastScanAt)}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(8,47,73,0.48),rgba(2,6,23,0.92))] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/90">Primary actions</p>
              <div className="mt-4 flex flex-col gap-3">
                <Button disabled={scanMutation.isPending || Boolean(activeScan)} onClick={() => scanMutation.mutate()}>
                  {scanMutation.isPending ? "Queueing..." : activeScan ? "Scan in progress" : "Run scan"}
                </Button>
                <Button disabled={deleteMutation.isPending} onClick={handleDelete} variant="secondary">
                  {deleteMutation.isPending ? "Deleting..." : "Delete repository"}
                </Button>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Manual scans are the fastest way to validate repository setup. GitHub-triggered scans will appear automatically after integration events are flowing.
              </p>
            </div>
            <HintPanel
              icon={<SparkIcon className="h-4 w-4" />}
              title="Repository state guide"
              description="GitHub App connected means the record has installation context. Ready to scan is inferred from GitHub metadata or sample files. Health stays lightweight until the backend exposes richer sync and scan quality signals."
              className="bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(8,47,73,0.42))]"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Connection</p>
          <p className="mt-3 text-lg font-semibold text-white">{getRepositoryConnectionLabel(repository)}</p>
          <p className="mt-2 text-sm text-slate-400">{repository.githubUrl ? "GitHub context available for scans." : "Manual metadata only."}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Branch</p>
          <div className="mt-3">
            <Badge tone="info">{repository.branch}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-400">Default branch used when manual scans are triggered.</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Sample files</p>
          <p className="mt-3 text-3xl font-semibold text-white">{repository.sampleFiles.length}</p>
          <p className="mt-2 text-sm text-slate-400">Input files available to the demo scan engine.</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Last scan</p>
          <p className="mt-3 text-lg font-semibold text-white">{formatRelativeTime(repository.lastScanAt)}</p>
          <p className="mt-2 text-sm text-slate-400">{formatDateTime(repository.lastScanAt)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HintPanel
          icon={<GithubIcon className="h-4 w-4" />}
          title="Source meaning"
          description="GitHub App records are best for automatic push and PR scans. Manual records still support baseline analysis, especially when sample files model the code you want to inspect."
        />
        <HintPanel
          icon={<RepositoryIcon className="h-4 w-4" />}
          title="When to use manual scans"
          description="Run a manual scan after editing metadata, branch, or sample files. It is the quickest feedback loop for verifying repository setup before waiting on webhook-driven activity."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Repository metadata</h2>
              <p className="mt-1 text-sm text-slate-400">Keep the repository record accurate so scan source, branch, and reporting context stay trustworthy.</p>
            </div>
            <Badge tone="default">{getRepositoryLabel(repository)}</Badge>
          </div>

          <form className="mt-6 space-y-6" noValidate onSubmit={handleUpdate}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Repository name</label>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Owner</label>
                <Input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Branch</label>
                <Input value={form.branch} onChange={(event) => setForm({ ...form, branch: event.target.value })} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">GitHub URL</label>
                <Input value={form.githubUrl} onChange={(event) => setForm({ ...form, githubUrl: event.target.value })} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">GitHub installation id</label>
                <Input value={form.githubInstallationId} onChange={(event) => setForm({ ...form, githubInstallationId: event.target.value })} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">GitHub repository id</label>
                <Input value={form.githubRepositoryId} onChange={(event) => setForm({ ...form, githubRepositoryId: event.target.value })} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Access token hint</label>
                  <Input value={form.accessTokenHint} onChange={(event) => setForm({ ...form, accessTokenHint: event.target.value })} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Description</label>
                  <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-300">Sample files JSON</label>
                <span className="text-xs text-slate-500">Editing this directly changes scan input fidelity.</span>
              </div>
              <Textarea
                className="min-h-64 font-mono"
                value={form.sampleFilesJson}
                onChange={(event) => setForm({ ...form, sampleFilesJson: event.target.value })}
              />
            </div>

            <div className="grid gap-4 text-sm text-slate-300 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Created</p>
                <p className="mt-2">{formatDateTime(repository.createdAt)}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Last scan</p>
                <p className="mt-2">{formatDateTime(repository.lastScanAt)}</p>
              </div>
            </div>

            {formError ? <InlineMessage tone="error">{formError}</InlineMessage> : null}
            {!formError && validationMessage ? <InlineMessage tone="warning">{validationMessage}</InlineMessage> : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">Keep branch, repository ID, and sample files aligned so future scans remain debuggable.</p>
              <Button disabled={updateMutation.isPending || Boolean(validationMessage)} type="submit">
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Scan history</h2>
              <p className="mt-1 text-sm text-slate-400">Review the latest scan runs for this repository without leaving the record.</p>
            </div>
            <Badge tone="info">{scans.length} total</Badge>
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
