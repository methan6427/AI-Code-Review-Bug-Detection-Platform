import type { Scan } from "@ai-review/shared";
import { Link } from "react-router-dom";
import { formatDateTime } from "../lib/utils";
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
      className="grid gap-3 rounded-2xl border border-white/8 bg-slate-900/60 p-4 transition hover:border-cyan-400/30 md:grid-cols-[1.4fr_120px_120px_160px]"
    >
      <div>
        <p className="text-sm font-medium text-white">{repositoryLabel ?? scan.repositoryId}</p>
        <p className="mt-1 text-xs text-slate-500">Started {formatDateTime(scan.startedAt ?? scan.createdAt)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
        <div className="mt-2">
          <Badge tone={scan.status}>{scan.status}</Badge>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Issues</p>
        <p className="mt-2 text-sm text-slate-300">{scan.summary.totalIssues ?? 0}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Completed</p>
        <p className="mt-2 text-sm text-slate-300">{formatDateTime(scan.completedAt)}</p>
      </div>
    </Link>
  );
}

