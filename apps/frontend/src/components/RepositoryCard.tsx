import type { Repository } from "@ai-review/shared";
import { Link } from "react-router-dom";
import { getRepositoryConnectionLabel, getRepositoryHealthState, getRepositoryReadinessLabel, getRepositorySourceLabel } from "../lib/scans";
import { formatDateTime, formatRelativeTime } from "../lib/utils";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { BranchIcon, ClockIcon, GithubIcon, RepositoryIcon, SparkIcon } from "./ui/icons";

export function RepositoryCard({ repository }: { repository: Repository }) {
  const isGithubConnected = Boolean(repository.githubInstallationId || repository.githubRepositoryId);
  const health = getRepositoryHealthState(repository);
  const sourceLabel = getRepositorySourceLabel(repository);
  const readinessLabel = getRepositoryReadinessLabel(repository);

  return (
    <Link
      to={`/repositories/${repository.id}`}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    >
      <Card className="h-full p-5 transition duration-200 group-hover:-translate-y-1 group-hover:border-cyan-400/35 group-hover:bg-slate-900/84 group-hover:shadow-[0_24px_64px_rgba(8,145,178,0.12)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300">
                {isGithubConnected ? <GithubIcon className="h-4 w-4" /> : <RepositoryIcon className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{repository.owner}</p>
                <p className="text-[11px] text-slate-500">{sourceLabel}</p>
              </div>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-white">{repository.name}</h3>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">
            <BranchIcon className="h-3.5 w-3.5" />
            <span>{repository.branch}</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={isGithubConnected ? "github_push" : "manual"}>{getRepositoryConnectionLabel(repository)}</Badge>
          <Badge tone={health.tone}>{health.label}</Badge>
          <Badge tone="info">{readinessLabel}</Badge>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-400">{repository.description || "No description provided."}</p>
        <div className="mt-5 grid gap-3 border-t border-white/8 pt-4 text-sm text-slate-400 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Repository health</p>
            <p className="mt-2 flex items-center gap-2 text-slate-200">
              <SparkIcon className="h-4 w-4 text-slate-400" />
              {health.description}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Sample files</p>
            <p className="mt-2 text-slate-200">{repository.sampleFiles.length}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Last scan</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-200">
              <ClockIcon className="h-4 w-4 text-slate-400" />
              {formatRelativeTime(repository.lastScanAt)}
            </p>
          </div>
          <p className="text-right text-xs text-slate-500">
            {formatDateTime(repository.lastScanAt)}
            <span className="mt-1 block text-cyan-300 opacity-0 transition group-hover:opacity-100">Open details</span>
          </p>
        </div>
      </Card>
    </Link>
  );
}
