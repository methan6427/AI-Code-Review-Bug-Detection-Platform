import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { getRepositoryLabel, getScanSourceLabel, getScanSourceTone, hasActiveScan } from "../lib/scans";
import { ScanRow } from "../components/ScanRow";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/StatePanel";

export function ScansPage() {
  const scansQuery = useQuery({
    queryKey: ["scans"],
    queryFn: () => apiClient.getScans(),
    refetchInterval: (currentQuery) => {
      const scans = currentQuery.state.data?.scans ?? [];
      return hasActiveScan(scans) ? 3000 : false;
    },
  });

  const repositoriesQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: () => apiClient.getRepositories(),
  });

  if (scansQuery.isLoading || repositoriesQuery.isLoading) {
    return <LoadingState title="Loading scans..." />;
  }

  if (scansQuery.isError) {
    return <ErrorState message={scansQuery.error.message} retry={() => void scansQuery.refetch()} />;
  }

  if (repositoriesQuery.isError) {
    return <ErrorState message={repositoriesQuery.error.message} retry={() => void repositoriesQuery.refetch()} />;
  }

  if (!scansQuery.data || !repositoriesQuery.data) {
    return <LoadingState title="Preparing scans..." />;
  }

  const scans = scansQuery.data.scans;
  const repositoryLabelLookup = new Map(
    repositoriesQuery.data.repositories.map((repository) => [repository.id, getRepositoryLabel(repository)]),
  );
  const activeScans = scans.filter((scan) => scan.status === "queued" || scan.status === "running").length;
  const failedScans = scans.filter((scan) => scan.status === "failed").length;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Execution Monitoring"
        title="Scans"
        description="Monitor queue state, issue totals, source context, and completion timing for every scan run without losing repository-level visibility."
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Total scans</p>
          <p className="mt-3 text-3xl font-semibold text-white">{scans.length}</p>
          <p className="mt-2 text-sm text-slate-400">All recorded scan runs across repositories.</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Active queue</p>
          <p className="mt-3 text-3xl font-semibold text-white">{activeScans}</p>
          <p className="mt-2 text-sm text-slate-400">Queued or running scans that still need platform attention.</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Failed scans</p>
          <p className="mt-3 text-3xl font-semibold text-white">{failedScans}</p>
          <p className="mt-2 text-sm text-slate-400">Failures worth checking for retries, worker errors, or bad input.</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Recent sources</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["manual", "github_push", "github_pull_request"] as const).map((source) => {
              const count = scans.filter((scan) => scan.context.source === source).length;
              return count > 0 ? (
                <Badge key={source} tone={getScanSourceTone(source)}>
                  {getScanSourceLabel(source)} {count}
                </Badge>
              ) : null;
            })}
          </div>
          <p className="mt-3 text-sm text-slate-400">Source badges make it easier to distinguish manual runs from GitHub-triggered activity.</p>
        </Card>
      </div>

      {scans.length > 0 ? (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Scan history</h2>
              <p className="mt-1 text-sm text-slate-400">Each row is clickable and shows the most important execution context at a glance.</p>
            </div>
            <Badge tone={activeScans > 0 ? "running" : "completed"}>{activeScans > 0 ? "Live updates enabled" : "Up to date"}</Badge>
          </div>
          <div className="mt-5 space-y-3">
            {scans.map((scan) => (
              <ScanRow key={scan.id} scan={scan} repositoryLabel={repositoryLabelLookup.get(scan.repositoryId) ?? scan.repositoryId} />
            ))}
          </div>
        </Card>
      ) : (
        <EmptyState
          title="No scans available"
          description="Create a repository and trigger a scan to populate this page. Once scans exist, this list becomes the main operational view for execution monitoring."
        />
      )}
    </div>
  );
}
