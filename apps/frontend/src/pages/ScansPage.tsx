import { useQuery } from "@tanstack/react-query";
import { scanStatuses } from "@ai-review/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import { getRepositoryLabel, getScanDisplayStatus, getScanSourceDescription, getScanSourceLabel, getScanSourceTone, hasActiveScan } from "../lib/scans";
import { ScanRow } from "../components/ScanRow";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { EmptyState, ErrorState, ListItemSkeleton, MetricCardSkeleton } from "../components/ui/StatePanel";
import { HintPanel } from "../components/ui/HintPanel";
import { FilterIcon, GithubIcon, RepositoryIcon, SearchIcon, SparkIcon } from "../components/ui/icons";

export function ScansPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | (typeof scanStatuses)[number]>("");
  const [sourceFilter, setSourceFilter] = useState<"" | "manual" | "github_push" | "github_pull_request">("");

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
    return (
      <div className="space-y-8">
        <div className="grid gap-4 xl:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <Card className="p-5 sm:p-6">
          <div className="space-y-3">
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
          </div>
        </Card>
      </div>
    );
  }

  if (scansQuery.isError) {
    return (
      <ErrorState
        title="Scans unavailable"
        message={scansQuery.error.message}
        retry={() => void scansQuery.refetch()}
        action={
          <Link to="/repositories">
            <Button variant="ghost">Open repositories</Button>
          </Link>
        }
      />
    );
  }

  if (repositoriesQuery.isError) {
    return (
      <ErrorState
        title="Repository labels unavailable"
        message={repositoriesQuery.error.message}
        retry={() => void repositoriesQuery.refetch()}
      />
    );
  }

  if (!scansQuery.data || !repositoriesQuery.data) {
    return null;
  }

  const scans = scansQuery.data.scans;
  const repositoryLabelLookup = new Map(
    repositoriesQuery.data.repositories.map((repository) => [repository.id, getRepositoryLabel(repository)]),
  );
  const filteredScans = scans.filter((scan) => {
    const repositoryLabel = repositoryLabelLookup.get(scan.repositoryId) ?? scan.repositoryId;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [repositoryLabel, scan.id, scan.context.branch ?? "", scan.context.commitSha ?? "", getScanSourceLabel(scan.context.source)]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesStatus = !statusFilter || scan.status === statusFilter;
    const matchesSource = !sourceFilter || scan.context.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });
  const activeScans = scans.filter((scan) => scan.status === "queued" || scan.status === "running").length;
  const failedScans = scans.filter((scan) => scan.status === "failed").length;
  const retryingScans = scans.filter((scan) => getScanDisplayStatus(scan) === "retrying").length;
  const hasFilters = Boolean(search.trim() || statusFilter || sourceFilter);

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
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Failed or retrying</p>
          <p className="mt-3 text-3xl font-semibold text-white">{failedScans + retryingScans}</p>
          <p className="mt-2 text-sm text-slate-400">{failedScans} failed and {retryingScans} retrying scans currently need attention.</p>
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

      <div className="grid gap-4 lg:grid-cols-3">
        <HintPanel
          icon={<GithubIcon className="h-4 w-4" />}
          title="GitHub scans arrive automatically"
          description="Push and pull request scans appear here after webhook events. Their source badges help separate automation-driven activity from manual operator runs."
        />
        <HintPanel
          icon={<RepositoryIcon className="h-4 w-4" />}
          title="Manual scans are useful baselines"
          description="Trigger manual scans from repository details when you want an intentional baseline, a verification rerun, or a scan on a record that only has sample files."
        />
        <HintPanel
          icon={<SparkIcon className="h-4 w-4" />}
          title="Retry state is now explicit"
          description="Rows now distinguish plain queued work from retrying scans using attempt counts, next retry timing, and last error context already exposed by the API."
        />
      </div>

      {scans.length > 0 ? (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Scan history</h2>
              <p className="mt-1 text-sm text-slate-400">Each row is clickable and shows the most important execution context at a glance.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={activeScans > 0 ? "running" : "completed"}>{activeScans > 0 ? "Live updates enabled" : "Up to date"}</Badge>
              {retryingScans > 0 ? <Badge tone="medium">{retryingScans} retrying</Badge> : null}
              <Badge tone={hasFilters ? "manual" : "info"}>
                {filteredScans.length} of {scans.length}
              </Badge>
            </div>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                <SearchIcon className="h-4 w-4 text-slate-500" />
                Search scans
              </label>
              <Input
                aria-label="Search scans"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by repository, branch, commit, or scan id"
              />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                <FilterIcon className="h-4 w-4 text-slate-500" />
                Status
              </label>
              <Select aria-label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | (typeof scanStatuses)[number])}>
                <option value="">All statuses</option>
                {scanStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                <FilterIcon className="h-4 w-4 text-slate-500" />
                Source
              </label>
              <Select
                aria-label="Source"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as "" | "manual" | "github_push" | "github_pull_request")}
              >
                <option value="">All sources</option>
                <option value="manual">Manual</option>
                <option value="github_push">GitHub Push</option>
                <option value="github_pull_request">Pull Request</option>
              </Select>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {(["manual", "github_push", "github_pull_request"] as const).map((source) => {
              const sourceScans = scans.filter((scan) => scan.context.source === source);
              return (
                <div key={source} className="rounded-[1.1rem] border border-white/8 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={getScanSourceTone(source)}>{getScanSourceLabel(source)}</Badge>
                    <span className="text-sm font-semibold text-white">{sourceScans.length}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">
                    {sourceScans[0] ? getScanSourceDescription(sourceScans[0]) : "No scans from this source yet."}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 space-y-3">
            {filteredScans.length > 0 ? (
              filteredScans.map((scan) => (
                <ScanRow key={scan.id} scan={scan} repositoryLabel={repositoryLabelLookup.get(scan.repositoryId) ?? scan.repositoryId} />
              ))
            ) : (
              <EmptyState
                eyebrow="Filters"
                title="No scans match this filter"
                description="Adjust the search or clear one of the active filters to review more scan history."
              />
            )}
          </div>
        </Card>
      ) : (
        <EmptyState
          eyebrow="Scans"
          title="No scans available"
          description="Create a repository and trigger a scan to populate this page. Once scans exist, this list becomes the main operational view for execution monitoring."
          action={
            <Link to="/repositories">
              <Button variant="secondary">Add repository</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
