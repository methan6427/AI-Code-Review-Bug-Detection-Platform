import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { MetricCard } from "../components/MetricCard";
import { RepositoryCard } from "../components/RepositoryCard";
import { ScanRow } from "../components/ScanRow";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card } from "../components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/StatePanel";
import { Badge } from "../components/ui/Badge";
import { getRepositoryLabel, hasActiveScan } from "../lib/scans";
import { formatDateTime } from "../lib/utils";

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

  return (
    <div className="space-y-8">
      <SectionHeader
        title={`Welcome back, ${summary.profile.fullName || summary.profile.email}`}
        description="Track repository coverage, recent scans, and where the issue backlog is clustering."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Repositories" value={summary.metrics.repositoryCount} hint="Connected manual repository entries" />
        <MetricCard label="Recent scans" value={summary.metrics.scanCount} hint="Latest scan records in the platform" />
        <MetricCard label="Open issues" value={summary.metrics.openIssueCount} hint="Findings still needing triage" />
        <MetricCard label="Critical issues" value={summary.metrics.criticalIssueCount} hint="Security or reliability hotspots" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent scans</h2>
            <span className="text-sm text-slate-500">{summary.recentScans.length} shown</span>
          </div>
          <div className="mt-5 space-y-3">
            {summary.recentScans.length > 0 ? (
              summary.recentScans.map((scan) => (
                <ScanRow key={scan.id} scan={scan} repositoryLabel={`${scan.repositoryOwner}/${scan.repositoryName}`} />
              ))
            ) : (
              <EmptyState title="No scans yet" description="Trigger a repository scan to start building reports and dashboard metrics." />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white">Severity distribution</h2>
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
                <div className="h-2 rounded-full bg-slate-900">
                  <div
                    className="h-2 rounded-full bg-cyan-400 transition-[width]"
                    style={{ width: `${(Number(count) / maxSeverityCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Repository activity</h2>
          <span className="text-sm text-slate-500">Top 5 by recent scans</span>
        </div>
        <div className="mt-5 space-y-3">
          {repositoryActivity.length > 0 ? (
            repositoryActivity.map((repository) => (
              <div key={repository.id} className="rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{repository.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {repository.lastScanAt ? `Last scan ${formatDateTime(repository.lastScanAt)}` : "No scans recorded yet"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">{repository.recentScanCount}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recent scans</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No repository activity yet" description="Create a repository and run a scan to populate activity trends." />
          )}
        </div>
      </Card>

      <div>
        <SectionHeader title="Repositories" description="Manual repository records configured for MVP scan simulation." />
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
