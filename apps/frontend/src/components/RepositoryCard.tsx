import type { Repository } from "@ai-review/shared";
import { Link } from "react-router-dom";
import { getRepositoryConnectionLabel } from "../lib/scans";
import { formatDateTime, formatRelativeTime } from "../lib/utils";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";

export function RepositoryCard({ repository }: { repository: Repository }) {
  const isGithubConnected = Boolean(repository.githubInstallationId || repository.githubRepositoryId);

  return (
    <Link
      to={`/repositories/${repository.id}`}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    >
      <Card className="h-full p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-cyan-400/30 group-hover:bg-slate-900/84">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{repository.owner}</p>
              <Badge tone={isGithubConnected ? "github_push" : "manual"}>{isGithubConnected ? "github" : "manual"}</Badge>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-white">{repository.name}</h3>
          </div>
          <Badge tone="info">{repository.branch}</Badge>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-400">{repository.description || "No description provided."}</p>
        <div className="mt-5 grid gap-3 border-t border-white/8 pt-4 text-sm text-slate-400 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Connection</p>
            <p className="mt-2 text-slate-200">{getRepositoryConnectionLabel(repository)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Sample files</p>
            <p className="mt-2 text-slate-200">{repository.sampleFiles.length}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Last scan</p>
            <p className="mt-2 text-sm text-slate-200">{formatRelativeTime(repository.lastScanAt)}</p>
          </div>
          <p className="text-xs text-slate-500">{formatDateTime(repository.lastScanAt)}</p>
        </div>
      </Card>
    </Link>
  );
}
