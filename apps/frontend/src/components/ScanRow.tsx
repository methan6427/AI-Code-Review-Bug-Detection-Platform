import type { Scan } from "@ai-review/shared";
import { Link } from "react-router-dom";
import {
  getScanDisplayStatusMeta,
  getScanDuration,
  getScanFilesLabel,
  getScanSourceDescription,
  getScanSourceLabel,
  getScanSourceTone,
} from "../lib/scans";
import { formatDateTime, formatRelativeTime, truncateMiddle } from "../lib/utils";
import { Badge } from "./ui/Badge";
import { AlertIcon, ArrowPathIcon, CheckCircleIcon, ClockIcon, GithubIcon, GitPullRequestIcon, QueueIcon, ScanIcon } from "./ui/icons";

export function ScanRow({
  scan,
  repositoryLabel,
}: {
  scan: Scan;
  repositoryLabel?: string;
}) {
  const statusMeta = getScanDisplayStatusMeta(scan);
  const duration = getScanDuration(scan);
  const fileScopeLabel = getScanFilesLabel(scan);
  const sourceDescription = getScanSourceDescription(scan);

  const statusIcon =
    statusMeta.displayStatus === "completed" ? (
      <CheckCircleIcon className="h-4 w-4 text-emerald-300" />
    ) : statusMeta.displayStatus === "failed" ? (
      <AlertIcon className="h-4 w-4 text-rose-300" />
    ) : statusMeta.displayStatus === "retrying" ? (
      <ArrowPathIcon className="h-4 w-4 text-amber-300" />
    ) : statusMeta.displayStatus === "queued" ? (
      <QueueIcon className="h-4 w-4 text-slate-300" />
    ) : (
      <ScanIcon className="h-4 w-4 text-cyan-300" />
    );

  const sourceIcon =
    scan.context.source === "github_push" ? (
      <GithubIcon className="h-4 w-4 text-cyan-300" />
    ) : scan.context.source === "github_pull_request" ? (
      <GitPullRequestIcon className="h-4 w-4 text-violet-300" />
    ) : (
      <ScanIcon className="h-4 w-4 text-slate-400" />
    );

  return (
    <Link
      to={`/scans/${scan.id}`}
      className="group grid gap-4 rounded-[1.35rem] border border-white/8 bg-slate-900/60 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-slate-900/85 hover:shadow-[0_18px_48px_rgba(8,145,178,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:grid-cols-[minmax(0,1.35fr)_minmax(180px,0.7fr)] xl:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)_minmax(220px,0.65fr)]"
      title={`Open scan ${scan.id}`}
    >
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {sourceIcon}
          <Badge tone={getScanSourceTone(scan.context.source)}>{getScanSourceLabel(scan.context.source)}</Badge>
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">{sourceDescription}</span>
          {scan.context.branch ? <Badge tone="default">{scan.context.branch}</Badge> : null}
          {scan.context.pullRequestNumber ? <Badge tone="github_pull_request">PR #{scan.context.pullRequestNumber}</Badge> : null}
        </div>

        <div>
          <p className="text-sm font-medium text-white">{repositoryLabel ?? scan.repositoryId}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span>Started {formatRelativeTime(scan.startedAt ?? scan.createdAt)}</span>
            <span>{formatDateTime(scan.startedAt ?? scan.createdAt)}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Commit</p>
            <p className="mt-2 font-mono text-xs text-slate-300">{scan.context.commitSha ? truncateMiddle(scan.context.commitSha) : "Not captured"}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">File scope</p>
            <p className="mt-2 text-sm text-slate-200">{fileScopeLabel}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Issues</p>
            <p className="mt-2 text-sm text-slate-200">{scan.summary.totalIssues ?? 0} total</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Status</p>
          <div className="mt-2 flex items-center gap-2">
            {statusIcon}
            <Badge tone={statusMeta.badgeTone}>{statusMeta.label}</Badge>
          </div>
          <p className="mt-2 text-xs text-slate-400">{statusMeta.detail}</p>
          {statusMeta.displayStatus === "retrying" ? (
            <p className="mt-1 text-xs text-amber-300">
              Attempt {scan.attemptCount} of {scan.maxAttempts}
              {scan.nextRetryAt ? `, next retry ${formatRelativeTime(scan.nextRetryAt)}` : ""}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Timing</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
            <ClockIcon className="h-4 w-4 text-slate-400" />
            <span>{duration ?? "Not available"}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">{scan.completedAt ? `Finished ${formatRelativeTime(scan.completedAt)}` : "Still in progress or waiting"}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Metadata</p>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Completed</span>
              <span>{formatDateTime(scan.completedAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Attempts</span>
              <span>
                {scan.attemptCount}/{scan.maxAttempts}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Severity mix</span>
              <span>{scan.summary.criticalCount ?? 0} critical</span>
            </div>
          </div>
          {scan.errorMessage ? <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{scan.errorMessage}</p> : null}
        </div>
      </div>
    </Link>
  );
}
