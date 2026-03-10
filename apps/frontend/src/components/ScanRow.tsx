import type { Scan } from "@ai-review/shared";
import { Link } from "react-router-dom";
import { getScanSourceLabel, getScanSourceTone } from "../lib/scans";
import { formatDateTime, formatRelativeTime, truncateMiddle } from "../lib/utils";
import { Badge } from "./ui/Badge";

export function ScanRow({
  scan,
  repositoryLabel,
}: {
  scan: Scan;
  repositoryLabel?: string;
}) {
  return (
    <Link
      to={`/scans/${scan.id}`}
      className="group grid gap-4 rounded-[1.35rem] border border-white/8 bg-slate-900/60 p-4 transition duration-200 hover:border-cyan-400/30 hover:bg-slate-900/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:grid-cols-[minmax(0,1.5fr)_minmax(120px,0.5fr)_minmax(120px,0.4fr)] xl:grid-cols-[minmax(0,1.5fr)_minmax(170px,0.5fr)_minmax(120px,0.35fr)_minmax(160px,0.5fr)]"
      title={`Open scan ${scan.id}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={getScanSourceTone(scan.context.source)}>{getScanSourceLabel(scan.context.source)}</Badge>
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">{scan.context.source}</span>
          {scan.context.branch ? <Badge tone="default">{scan.context.branch}</Badge> : null}
        </div>
        <p className="mt-3 text-sm font-medium text-white">{repositoryLabel ?? scan.repositoryId}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <span>Started {formatRelativeTime(scan.startedAt ?? scan.createdAt)}</span>
          <span>{formatDateTime(scan.startedAt ?? scan.createdAt)}</span>
          {scan.context.commitSha ? <span className="font-mono text-slate-400">{truncateMiddle(scan.context.commitSha)}</span> : null}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Status</p>
        <div className="mt-2 flex items-center gap-2">
          <Badge tone={scan.status}>{scan.status}</Badge>
          <span className="text-xs text-slate-400">{scan.status === "completed" ? "Report ready" : scan.status === "failed" ? "Needs attention" : "In progress"}</span>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Issues</p>
        <p className="mt-2 text-lg font-semibold text-white">{scan.summary.totalIssues ?? 0}</p>
        <p className="mt-1 text-xs text-slate-500">
          {scan.summary.criticalCount ?? 0} critical, {scan.summary.highCount ?? 0} high
        </p>
      </div>
      <div className="hidden xl:block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Completed</p>
        <p className="mt-2 text-sm text-slate-300">{formatDateTime(scan.completedAt)}</p>
        <p className="mt-1 text-xs text-slate-500">{formatRelativeTime(scan.completedAt)}</p>
      </div>
    </Link>
  );
}
