import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { MetricCard } from "../components/MetricCard";
import { RepositoryCard } from "../components/RepositoryCard";
import { ScanRow } from "../components/ScanRow";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card } from "../components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/StatePanel";
import { Badge } from "../components/ui/Badge";
import { getRepositoryLabel, getScanSourceLabel, getScanSourceTone, hasActiveScan } from "../lib/scans";
import { formatDateTime, formatRelativeTime } from "../lib/utils";

export function DashboardPage() {
  const query = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiClient.getDashboardSummary(),
    refetchInterval: (currentQuery) => {
      const scans = currentQuery.state.data?.summary.recentScans ?? [];
      return hasActiveScan(scans) ? 3000 : false;
    },
  });

  if (query.isLoading) {
    return <LoadingState title="Loading dashboard summary..." />;
  }

  if (query.isError) {
    return <ErrorState message={query.error.message} retry={() => void query.refetch()} />;
  }

  if (!query.data) {
    return <LoadingState title="Preparing dashboard..." />;
  }

  const { summary } = query.data;
  const severityEntries = Object.entries(summary.issueCountsBySeverity) as Array<
    [keyof typeof summary.issueCountsBySeverity, number]
  >;
  const maxSeverityCount = Math.max(...severityEntries.map(([, count]) => Number(count)), 1);
  const repositoryActivity = summary.repositories
    .map((repository) => ({
      id: repository.id,
      label: getRepositoryLabel(repository),
      recentScanCount: summary.recentScans.filter((scan) => scan.repositoryId === repository.id).length,
      lastScanAt: repository.lastScanAt,
    }))
    .sort((left, right) => right.recentScanCount - left.recentScanCount || left.label.localeCompare(right.label))
    .slice(0, 5);
  const activeScans = summary.recentScans.filter((scan) => scan.status === "queued" || scan.status === "running").length;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Overview"
        title={`Welcome back, ${summary.profile.fullName || summary.profile.email}`}
        description="Track repository coverage, recent scan execution, and where the issue backlog is clustering so the team can react faster."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300/90">Workspace health</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Repository coverage and scan execution in one view.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Keep an eye on what is connected, what is still running, and which findings are still open before they become triage debt.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Active scans</p>
                <p className="mt-2 text-2xl font-semibold text-white">{activeScans}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Recent scans</p>
                <p className="mt-2 text-2xl font-semibold text-white">{summary.recentScans.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Open backlog</p>
                <p className="mt-2 text-2xl font-semibold text-white">{summary.metrics.openIssueCount}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300/90">Focus area</p>
              <h2 className="mt-2 text-lg font-semibold text-white">Severity distribution</h2>
            </div>
            <Badge tone={summary.metrics.criticalIssueCount > 0 ? "critical" : "completed"}>
              {summary.metrics.criticalIssueCount > 0 ? "Attention needed" : "Stable"}
            </Badge>
          </div>
          <div className="mt-5 space-y-4">
            {severityEntries.map(([severity, count]) => (
              <div key={severity} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge tone={severity}>{severity}</Badge>
                    <span className="text-sm text-slate-300 capitalize">{severity}</span>
                  </div>
                  <span className="text-sm font-medium text-white">{Number(count)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-950/80">
                  <div
                    className="h-2 rounded-full bg-cyan-300 transition-[width]"
                    style={{ width: `${(Number(count) / maxSeverityCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Repositories"
          value={summary.metrics.repositoryCount}
          hint="Connected repositories ready for scans."
          detail="coverage"
        />
        <MetricCard
          label="Recent scans"
          value={summary.metrics.scanCount}
          hint="Latest scan records tracked across the platform."
          detail={`${activeScans} active`}
          tone={activeScans > 0 ? "running" : "info"}
        />
        <MetricCard
          label="Open issues"
          value={summary.metrics.openIssueCount}
          hint="Findings that still need review or a triage decision."
          detail="backlog"
          tone="info"
        />
        <MetricCard
          label="Critical issues"
          value={summary.metrics.criticalIssueCount}
          hint="Security or reliability hotspots requiring immediate attention."
          detail="priority"
          tone={summary.metrics.criticalIssueCount > 0 ? "critical" : "completed"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Recent scans</h2>
              <p className="mt-1 text-sm text-slate-400">Quickly review what ran, where it came from, and whether the report is ready.</p>
            </div>
            <span className="text-sm text-slate-500">{summary.recentScans.length} shown</span>
          </div>
          <div className="mt-5 space-y-3">
            {summary.recentScans.length > 0 ? (
              summary.recentScans.map((scan) => (
                <ScanRow key={scan.id} scan={scan} repositoryLabel={`${scan.repositoryOwner}/${scan.repositoryName}`} />
              ))
            ) : (
              <EmptyState title="No scans yet" description="Trigger a repository scan to start building reports, trends, and issue summaries." />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Repository activity</h2>
              <p className="mt-1 text-sm text-slate-400">Top repositories by recent scan volume.</p>
            </div>
            <span className="text-sm text-slate-500">Top 5</span>
          </div>
          <div className="mt-5 space-y-3">
            {repositoryActivity.length > 0 ? (
              repositoryActivity.map((repository) => (
                <div key={repository.id} className="rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{repository.label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {repository.lastScanAt ? `Last scan ${formatRelativeTime(repository.lastScanAt)}` : "No scans recorded yet"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">{repository.recentScanCount}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recent scans</p>
                    </div>
                  </div>
                  {repository.lastScanAt ? <p className="mt-3 text-xs text-slate-500">{formatDateTime(repository.lastScanAt)}</p> : null}
                </div>
              ))
            ) : (
              <EmptyState title="No repository activity yet" description="Create a repository and run a scan to populate activity trends." />
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Scan source mix</h2>
            <p className="mt-1 text-sm text-slate-400">Shows how scan activity entered the platform most recently.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.recentScans.slice(0, 3).map((scan) => (
              <Badge key={scan.id} tone={getScanSourceTone(scan.context.source)}>
                {getScanSourceLabel(scan.context.source)}
              </Badge>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(["manual", "github_push", "github_pull_request"] as const).map((source) => {
            const count = summary.recentScans.filter((scan) => scan.context.source === source).length;

            return (
              <div key={source} className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone={getScanSourceTone(source)}>{getScanSourceLabel(source)}</Badge>
                  <span className="text-2xl font-semibold text-white">{count}</span>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  {count > 0 ? "Recently active in the current dashboard window." : "No recent scans from this source yet."}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <div>
        <SectionHeader
          eyebrow="Inventory"
          title="Repositories"
          description="Configured repositories with enough context to support manual or GitHub-backed scan workflows."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summary.repositories.length > 0 ? (
            summary.repositories.map((repository) => <RepositoryCard key={repository.id} repository={repository} />)
          ) : (
            <EmptyState title="No repositories connected" description="Add your first repository on the Repositories page." />
          )}
        </div>
      </div>
    </div>
  );
}
