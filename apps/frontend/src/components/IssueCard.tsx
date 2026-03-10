import type { Issue } from "@ai-review/shared";
import { truncateMiddle } from "../lib/utils";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

type IssueCardProps = {
  issue: Issue;
  onStatusChange?: (status: Issue["status"]) => void;
  isUpdating?: boolean;
};

export function IssueCard({ issue, onStatusChange, isUpdating = false }: IssueCardProps) {
  return (
    <Card className="overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={issue.severity}>{issue.severity}</Badge>
            <Badge tone={issue.category}>{issue.category}</Badge>
            <Badge tone={issue.status}>{issue.status}</Badge>
          </div>
          <h3 className="mt-3 text-base font-semibold text-white">{issue.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{issue.description}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-3 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Rule</p>
          <p className="mt-2 text-sm font-medium text-slate-100">{issue.ruleCode ?? "N/A"}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 text-sm text-slate-400 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Location</p>
          <p className="mt-2 break-all font-mono text-sm text-slate-200">
            {issue.filePath ?? "Unknown file"}
            {issue.lineNumber ? `:${issue.lineNumber}` : ""}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Issue ID</p>
          <p className="mt-2 font-mono text-sm text-slate-200">{truncateMiddle(issue.id, 10, 6)}</p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-white/8 bg-slate-950/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Recommendation</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{issue.recommendation}</p>
      </div>
      {onStatusChange ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Triage action</p>
            <p className="mt-1 text-sm text-slate-400">Update the issue status to reflect review progress.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={isUpdating || issue.status === "open"} onClick={() => onStatusChange("open")} type="button" variant="ghost">
            Reopen
            </Button>
            <Button
              disabled={isUpdating || issue.status === "resolved"}
              onClick={() => onStatusChange("resolved")}
              type="button"
              variant="secondary"
            >
              Mark resolved
            </Button>
            <Button
              disabled={isUpdating || issue.status === "ignored"}
              onClick={() => onStatusChange("ignored")}
              type="button"
              variant="ghost"
            >
              Ignore
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
