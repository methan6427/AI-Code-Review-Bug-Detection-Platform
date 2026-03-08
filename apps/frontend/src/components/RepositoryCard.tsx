import type { Repository } from "@ai-review/shared";
import { Link } from "react-router-dom";
import { formatDateTime } from "../lib/utils";
import { Card } from "./ui/Card";

export function RepositoryCard({ repository }: { repository: Repository }) {
  return (
    <Link to={`/repositories/${repository.id}`}>
      <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{repository.owner}</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{repository.name}</h3>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{repository.branch}</span>
        </div>
        <p className="mt-4 text-sm text-slate-400">{repository.description || "No description provided."}</p>
        <div className="mt-5 text-xs text-slate-500">Last scan: {formatDateTime(repository.lastScanAt)}</div>
      </Card>
    </Link>
  );
}

