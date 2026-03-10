import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import { MetricCard } from "../components/MetricCard";
import { RepositoryCard } from "../components/RepositoryCard";
import { ScanRow } from "../components/ScanRow";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card } from "../components/ui/Card";
import { EmptyState, ErrorState, ListItemSkeleton, MetricCardSkeleton, SkeletonBlock } from "../components/ui/StatePanel";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { getRepositoryLabel, getScanSourceLabel, getScanSourceTone, hasActiveScan } from "../lib/scans";
import { formatDateTime, formatRelativeTime } from "../lib/utils";
import { AlertIcon, CheckCircleIcon, GithubIcon, RepositoryIcon, ScanIcon } from "../components/ui/icons";

const getActivityTone = (status: "queued" | "running" | "completed" | "failed"): "running" | "completed" | "critical" =>
  status === "completed" ? "completed" : status === "failed" ? "critical" : "running";

export function DashboardPage() {
  const query = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiClient.getDashboardSummary(),
    refetchInterval: (currentQuery) => {
      const scans = currentQuery.state.data?.summary.recentScans ?? [];
      return hasActiveScan(scans) ? 3000 : false;
    },
  });
  const githubInstallUrlQuery = useQuery({
    queryKey: ["github-app-install-url"],
    queryFn: () => apiClient.getGithubAppInstallUrl(),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-10 w-80 max-w-full" />
          <SkeletonBlock className="h-4 w-[34rem] max-w-full" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-6">
            <div className="space-y-4">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-10 w-96 max-w-full" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-5/6" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="space-y-4">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-7 w-44" />
              <SkeletonBlock className="h-24 w-full" />
            </div>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-5">
            <div className="space-y-3">
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </div>
          </Card>
          <Card className="p-5">
            <div className="space-y-3">
              <ListItemSkeleton />
              <ListItemSkeleton />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Dashboard summary unavailable"
        message={query.error.message}
        retry={() => void query.refetch()}
        action={
          <Link to="/repositories">
            <Button variant="ghost">Open repositories</Button>
          </Link>
        }
      />
    );
  }

  if (!query.data) {
    return null;
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
  const firstRepository = summary.repositories[0];
  const mostRecentScan = summary.recentScans[0];
  const mostUrgentScan = summary.recentScans.find((scan) => (scan.summary.criticalCount ?? 0) > 0) ?? mostRecentScan;
  const workspaceState =
    summary.metrics.criticalIssueCount > 0
      ? { label: "Needs attention", tone: "critical" as const, note: "Critical findings are still open in the latest reports." }
      : activeScans > 0
        ? { label: "Monitoring", tone: "running" as const, note: "The worker is still processing active scan jobs." }
        : { label: "Stable", tone: "completed" as const, note: "No critical backlog is showing in the current dashboard window." };
  const lastScanAt = mostRecentScan?.completedAt ?? mostRecentScan?.startedAt ?? null;
  const healthStats = [
    {
      label: "Repositories monitored",
      value: summary.metrics.repositoryCount,
      helper: summary.metrics.repositoryCount === 1 ? "repository connected" : "repositories connected",
    },
    {
      label: "Last scan time",
      value: lastScanAt ? formatRelativeTime(lastScanAt) : "No scans yet",
      helper: lastScanAt ? formatDateTime(lastScanAt) : "Run a scan to establish a fresh baseline.",
    },
    {
      label: "Open issues",
      value: summary.metrics.openIssueCount,
      helper: summary.metrics.openIssueCount > 0 ? "triage work pending" : "nothing waiting for review",
    },
  ];
  const activityFeed: Array<{
    id: string;
    icon: typeof CheckCircleIcon | typeof AlertIcon | typeof ScanIcon | typeof RepositoryIcon;
    tone: "completed" | "critical" | "running" | "info";
    title: string;
    detail: string;
    time: string;
    to: string;
  }> = [
    ...summary.recentScans.slice(0, 4).map((scan) => ({
      id: `scan-${scan.id}`,
      icon: scan.status === "completed" ? CheckCircleIcon : scan.status === "failed" ? AlertIcon : ScanIcon,
      tone: getActivityTone(scan.status),
      title:
        scan.status === "completed"
          ? `Scan finished for ${scan.repositoryOwner}/${scan.repositoryName}`
          : scan.status === "failed"
            ? `Scan needs follow-up for ${scan.repositoryOwner}/${scan.repositoryName}`
            : `Scan is in flight for ${scan.repositoryOwner}/${scan.repositoryName}`,
      detail: `${getScanSourceLabel(scan.context.source)} / ${scan.summary.totalIssues ?? 0} issues in report`,
      time: formatRelativeTime(scan.completedAt ?? scan.startedAt ?? scan.createdAt),
      to: `/scans/${scan.id}`,
    })),
    ...summary.repositories
      .filter((repository) => !summary.recentScans.some((scan) => scan.repositoryId === repository.id))
      .slice(0, 2)
      .map((repository) => ({
        id: `repo-${repository.id}`,
        icon: RepositoryIcon,
        tone: "info" as const,
        title: `${getRepositoryLabel(repository)} is connected`,
        detail: repository.lastScanAt ? `Last scanned ${formatRelativeTime(repository.lastScanAt)}` : "Ready for its first manual scan",
        time: formatRelativeTime(repository.createdAt),
        to: `/repositories/${repository.id}`,
      })),
  ].slice(0, 5);
  const quickActions = [
    {
      label: "Run manual scan",
      description: firstRepository ? "Queue a fresh report on the latest connected repository." : "Add a repository before you can launch a manual scan.",
      to: firstRepository ? `/repositories/${firstRepository.id}` : "/repositories",
      icon: ScanIcon,
    },
    {
      label: "Add repository",
      description: "Create a new repository record with sample files or GitHub metadata.",
      to: "/repositories",
      icon: RepositoryIcon,
    },
    {
      label: "Install GitHub App",
      description: githubInstallUrlQuery.data?.url
        ? "Connect installation-backed repositories for import and webhook scans."
        : "Open repository management if the app install URL is not available yet.",
      to: githubInstallUrlQuery.data?.url ?? "/repositories",
      external: Boolean(githubInstallUrlQuery.data?.url),
      icon: GithubIcon,
    },
    {
      label: "Import repositories",
      description: "Use a GitHub App installation to prefill repository metadata fast.",
      to: "/repositories",
      icon: GithubIcon,
    },
  ];

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
          trend={summary.metrics.repositoryCount > 0 ? "Workspace connected" : "Needs setup"}
          to="/repositories"
        />
        <MetricCard
          label="Recent scans"
          value={summary.metrics.scanCount}
          hint="Latest scan records tracked across the platform."
          detail={`${activeScans} active`}
          tone={activeScans > 0 ? "running" : "info"}
          trend={lastScanAt ? `Last run ${formatRelativeTime(lastScanAt)}` : "No executions yet"}
          to="/scans"
        />
        <MetricCard
          label="Open issues"
          value={summary.metrics.openIssueCount}
          hint="Findings that still need review or a triage decision."
          detail="backlog"
          tone="info"
          trend={summary.metrics.openIssueCount > 0 ? "Review backlog active" : "Nothing waiting"}
          to={mostRecentScan ? `/scans/${mostRecentScan.id}?status=open` : "/scans"}
        />
        <MetricCard
          label="Critical issues"
          value={summary.metrics.criticalIssueCount}
          hint="Security or reliability hotspots requiring immediate attention."
          detail="priority"
          tone={summary.metrics.criticalIssueCount > 0 ? "critical" : "completed"}
          trend={summary.metrics.criticalIssueCount > 0 ? "Escalate now" : "No critical backlog"}
          to={mostUrgentScan ? `/scans/${mostUrgentScan.id}?severity=critical&status=open` : "/scans"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300/90">Workspace health</p>
              <h2 className="mt-2 text-lg font-semibold text-white">Operational readiness</h2>
              <p className="mt-1 text-sm text-slate-400">{workspaceState.note}</p>
            </div>
            <Badge tone={workspaceState.tone}>{workspaceState.label}</Badge>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {healthStats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-slate-950/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
                <p className="mt-2 text-sm text-slate-400">{item.helper}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300/90">Quick actions</p>
              <h2 className="mt-2 text-lg font-semibold text-white">Keep the workspace moving</h2>
            </div>
            <Badge tone="info">4 shortcuts</Badge>
          </div>
          <div className="mt-5 grid gap-3">
            {quickActions.map((action) => {
              const content = (
                <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4 transition duration-200 hover:border-cyan-400/25 hover:bg-slate-950/85">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl border border-white/10 bg-white/[0.05] p-2">
                      <action.icon className="h-4 w-4 text-cyan-200" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{action.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{action.description}</p>
                    </div>
                  </div>
                </div>
              );

              if (action.external) {
                return (
                  <a key={action.label} href={action.to} rel="noreferrer" target="_blank">
                    {content}
                  </a>
                );
              }

              return (
                <Link key={action.label} to={action.to}>
                  {content}
                </Link>
              );
            })}
          </div>
        </Card>
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
              <h2 className="text-lg font-semibold text-white">Recent activity</h2>
              <p className="mt-1 text-sm text-slate-400">Meaningful events across scan execution and repository readiness.</p>
            </div>
            <span className="text-sm text-slate-500">{activityFeed.length} events</span>
          </div>
          <div className="mt-5 space-y-3">
            {activityFeed.length > 0 ? (
              activityFeed.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  className="block rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-4 transition duration-200 hover:border-cyan-400/25 hover:bg-slate-950/85"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.05] p-2">
                        <item.icon className="h-4 w-4 text-cyan-200" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-white">{item.title}</p>
                          <Badge tone={item.tone}>{item.tone}</Badge>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{item.detail}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{item.time}</p>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                eyebrow="Activity"
                title="No recent activity yet"
                description="Once repositories are added or scans start running, this feed will highlight the latest operational changes."
                action={
                  <Link to="/repositories">
                    <Button variant="secondary">Add repository</Button>
                  </Link>
                }
              />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
                <Link
                  key={repository.id}
                  to={`/repositories/${repository.id}`}
                  className="block rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-4 transition duration-200 hover:border-cyan-400/25 hover:bg-slate-950/85"
                >
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
                </Link>
              ))
            ) : (
              <EmptyState
                eyebrow="Activity"
                title="No repository activity yet"
                description="Create a repository and run a scan to populate repository-level activity trends."
              />
            )}
          </div>
        </Card>

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
      </div>

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
            <EmptyState
              eyebrow="Repositories"
              title="No repositories connected"
              description="Add your first repository to unlock scans, issue triage, workspace health, and recent activity."
              action={
                <Link to="/repositories">
                  <Button variant="secondary">Add repository</Button>
                </Link>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
