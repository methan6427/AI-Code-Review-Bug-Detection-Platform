import type { Issue } from "@ai-review/shared";
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
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{issue.title}</h3>
          <p className="mt-2 text-sm text-slate-400">{issue.description}</p>
        </div>
        <div className="flex gap-2">
          <Badge tone={issue.severity}>{issue.severity}</Badge>
          <Badge tone={issue.category}>{issue.category}</Badge>
          <Badge tone={issue.status}>{issue.status}</Badge>
        </div>
      </div>
      <div className="mt-4 grid gap-4 text-sm text-slate-400 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Location</p>
          <p className="mt-1">
            {issue.filePath ?? "Unknown file"}
            {issue.lineNumber ? `:${issue.lineNumber}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rule</p>
          <p className="mt-1">{issue.ruleCode ?? "N/A"}</p>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-white/8 bg-slate-950/60 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recommendation</p>
        <p className="mt-2 text-sm text-slate-300">{issue.recommendation}</p>
      </div>
      {onStatusChange ? (
        <div className="mt-4 flex flex-wrap gap-2">
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
      ) : null}
    </Card>
  );
}
