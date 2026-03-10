import type { Issue } from "@ai-review/shared";
import { humanizeToken, truncateMiddle } from "../lib/utils";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { AlertIcon, BoltIcon, BugIcon, CheckCircleIcon, FileCodeIcon, ShieldIcon, WrenchIcon } from "./ui/icons";

type IssueCardProps = {
  issue: Issue;
  onStatusChange?: (status: Issue["status"]) => void;
  isUpdating?: boolean;
};

const severityAccentStyles: Record<Issue["severity"], string> = {
  critical: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  high: "border-orange-400/30 bg-orange-500/10 text-orange-200",
  medium: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  low: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  info: "border-sky-400/30 bg-sky-500/10 text-sky-100",
};

function CategoryIcon({ category }: { category: Issue["category"] }) {
  switch (category) {
    case "security":
      return <ShieldIcon className="h-4 w-4" />;
    case "performance":
      return <BoltIcon className="h-4 w-4" />;
    case "maintainability":
      return <WrenchIcon className="h-4 w-4" />;
    case "bug":
    default:
      return <BugIcon className="h-4 w-4" />;
  }
}

export function IssueCard({ issue, onStatusChange, isUpdating = false }: IssueCardProps) {
  const severityLabel = humanizeToken(issue.severity);
  const categoryLabel = humanizeToken(issue.category);
  const canResolve = issue.status !== "resolved";
  const canIgnore = issue.status !== "ignored";
  const canReopen = issue.status !== "open";

  return (
    <Card className="overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.18em] uppercase ${severityAccentStyles[issue.severity]}`}>
              {issue.severity === "critical" || issue.severity === "high" ? (
                <AlertIcon className="h-4 w-4" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
              {severityLabel}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200">
              <CategoryIcon category={issue.category} />
              {categoryLabel}
            </div>
            <Badge tone={issue.status}>{humanizeToken(issue.status)}</Badge>
          </div>
          <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-white">{issue.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{issue.description}</p>
        </div>
        <div className="min-w-[180px] rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Rule match</p>
          <p className="mt-2 text-sm font-medium text-slate-100">{issue.ruleCode ?? "N/A"}</p>
          <p className="mt-1 text-xs text-slate-500">Issue {truncateMiddle(issue.id, 8, 4)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 text-sm text-slate-400 xl:grid-cols-[minmax(0,1.1fr)_minmax(240px,0.9fr)]">
        <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
          <div className="flex items-center gap-2">
            <FileCodeIcon className="h-4 w-4 text-slate-500" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Location preview</p>
          </div>
          <p className="mt-3 break-all font-mono text-sm text-slate-100">
            {issue.filePath ?? "Unknown file"}
            {issue.lineNumber ? `:${issue.lineNumber}` : ""}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {issue.lineNumber ? `Triage starts at line ${issue.lineNumber}.` : "Line information was not provided for this finding."}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Review summary</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={issue.severity}>{severityLabel}</Badge>
            <Badge tone={issue.category}>{categoryLabel}</Badge>
            <Badge tone={issue.status}>{humanizeToken(issue.status)}</Badge>
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-400">Use the triage controls after review so scan summaries and dashboards reflect the latest status.</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-slate-950/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Recommended next step</p>
          <Badge tone="info">Actionable</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-200">{issue.recommendation}</p>
      </div>

      {onStatusChange ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Triage actions</p>
            <p className="mt-1 text-sm text-slate-400">Update status as review progresses. Actions are disabled when the issue is already in that state.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={isUpdating || !canResolve} onClick={() => onStatusChange("resolved")} type="button" variant="secondary">
              Resolve
            </Button>
            <Button disabled={isUpdating || !canIgnore} onClick={() => onStatusChange("ignored")} type="button" variant="ghost">
              Ignore
            </Button>
            <Button disabled={isUpdating || !canReopen} onClick={() => onStatusChange("open")} type="button" variant="ghost">
              Reopen
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
