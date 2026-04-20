import { useEffect, useState } from "react";
import type { Issue, IssueActivity } from "@ai-review/shared";
import { formatDateTime, formatRelativeTime, humanizeToken, truncateMiddle } from "../lib/utils";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input, Textarea } from "./ui/Input";
import {
  AlertIcon,
  BoltIcon,
  BugIcon,
  CheckCircleIcon,
  ClockIcon,
  FileCodeIcon,
  ShieldIcon,
  WrenchIcon,
} from "./ui/icons";

type TriageUpdate = {
  status?: Issue["status"];
  triageNote?: string | null;
  assignedTo?: string | null;
};

type IssueCardProps = {
  issue: Issue;
  onStatusChange?: (status: Issue["status"]) => void;
  onTriageUpdate?: (update: TriageUpdate) => void;
  onLoadActivity?: () => void;
  activity?: IssueActivity[];
  isActivityLoading?: boolean;
  isUpdating?: boolean;
  selectable?: boolean;
  isSelected?: boolean;
  onSelectChange?: (selected: boolean) => void;
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

const activityActionLabels: Record<IssueActivity["action"], string> = {
  created: "Issue created",
  status_changed: "Status changed",
  assigned: "Assignee set",
  unassigned: "Assignee cleared",
  note_added: "Triage note added",
  note_updated: "Triage note updated",
  note_cleared: "Triage note cleared",
};

function describeActivityValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

export function IssueCard({
  issue,
  onStatusChange,
  onTriageUpdate,
  onLoadActivity,
  activity,
  isActivityLoading = false,
  isUpdating = false,
  selectable = false,
  isSelected = false,
  onSelectChange,
}: IssueCardProps) {
  const severityLabel = humanizeToken(issue.severity);
  const categoryLabel = humanizeToken(issue.category);
  const canResolve = issue.status !== "resolved";
  const canIgnore = issue.status !== "ignored";
  const canReopen = issue.status !== "open";

  const [showTriagePanel, setShowTriagePanel] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [noteDraft, setNoteDraft] = useState(issue.triageNote ?? "");
  const [assigneeDraft, setAssigneeDraft] = useState(issue.assignedTo ?? "");

  useEffect(() => {
    setNoteDraft(issue.triageNote ?? "");
    setAssigneeDraft(issue.assignedTo ?? "");
  }, [issue.id, issue.triageNote, issue.assignedTo]);

  const noteIsDirty = (issue.triageNote ?? "") !== noteDraft;
  const assigneeIsDirty = (issue.assignedTo ?? "") !== assigneeDraft;
  const triageIsDirty = noteIsDirty || assigneeIsDirty;

  const handleSaveTriage = () => {
    if (!onTriageUpdate || !triageIsDirty) {
      return;
    }
    const update: TriageUpdate = {};
    if (noteIsDirty) {
      update.triageNote = noteDraft.trim() === "" ? null : noteDraft.trim();
    }
    if (assigneeIsDirty) {
      update.assignedTo = assigneeDraft.trim() === "" ? null : assigneeDraft.trim();
    }
    onTriageUpdate(update);
  };

  const handleToggleActivity = () => {
    const next = !showActivity;
    setShowActivity(next);
    if (next && !activity && onLoadActivity) {
      onLoadActivity();
    }
  };

  return (
    <Card className="overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {selectable ? (
            <label className="mt-1 flex cursor-pointer items-center" aria-label="Select issue for bulk actions">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded border-white/15 bg-slate-950 text-cyan-400 focus:ring-cyan-400/30"
                checked={isSelected}
                onChange={(event) => onSelectChange?.(event.target.checked)}
              />
            </label>
          ) : null}
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
              {issue.assignedTo ? (
                <Badge tone="info">Assigned</Badge>
              ) : null}
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-white">{issue.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{issue.description}</p>
          </div>
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Triage state</p>
          <dl className="mt-3 space-y-2 text-xs text-slate-400">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Assignee</dt>
              <dd className="truncate text-slate-100">{issue.assignedTo ?? "Unassigned"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Last change</dt>
              <dd className="truncate text-slate-100" title={issue.lastStatusChangedAt ? formatDateTime(issue.lastStatusChangedAt) : undefined}>
                {issue.lastStatusChangedAt ? formatRelativeTime(issue.lastStatusChangedAt) : "Never"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Reviewer</dt>
              <dd className="truncate text-slate-100">{issue.lastStatusChangedBy ? truncateMiddle(issue.lastStatusChangedBy, 8, 4) : "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      {issue.triageNote ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/55 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Triage note</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{issue.triageNote}</p>
        </div>
      ) : null}

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
            {onTriageUpdate ? (
              <Button onClick={() => setShowTriagePanel((prev) => !prev)} type="button" variant="ghost">
                {showTriagePanel ? "Hide note" : "Note / Assign"}
              </Button>
            ) : null}
            {onLoadActivity ? (
              <Button onClick={handleToggleActivity} type="button" variant="ghost">
                {showActivity ? "Hide activity" : "Activity"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {onTriageUpdate && showTriagePanel ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/55 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Triage note &amp; assignment</p>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_minmax(0,260px)]">
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-400" htmlFor={`triage-note-${issue.id}`}>
                Note (markdown supported)
              </label>
              <Textarea
                id={`triage-note-${issue.id}`}
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Add reviewer context, scope, or next-step guidance"
                rows={4}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-400" htmlFor={`triage-assignee-${issue.id}`}>
                Assignee (user id)
              </label>
              <Input
                id={`triage-assignee-${issue.id}`}
                value={assigneeDraft}
                onChange={(event) => setAssigneeDraft(event.target.value)}
                placeholder="UUID or leave empty"
              />
              <p className="mt-2 text-xs text-slate-500">Clear the field to remove assignment.</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isUpdating || !triageIsDirty}
              onClick={() => {
                setNoteDraft(issue.triageNote ?? "");
                setAssigneeDraft(issue.assignedTo ?? "");
              }}
            >
              Reset
            </Button>
            <Button type="button" variant="secondary" disabled={isUpdating || !triageIsDirty} onClick={handleSaveTriage}>
              Save triage
            </Button>
          </div>
        </div>
      ) : null}

      {onLoadActivity && showActivity ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/55 p-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-slate-500" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Activity timeline</p>
          </div>
          <div className="mt-3 space-y-2">
            {isActivityLoading ? (
              <p className="text-xs text-slate-500">Loading activity…</p>
            ) : activity && activity.length > 0 ? (
              activity.map((entry) => {
                const previous = describeActivityValue(entry.previousValue);
                const next = describeActivityValue(entry.nextValue);
                return (
                  <div key={entry.id} className="rounded-xl border border-white/6 bg-slate-950/55 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-100">{activityActionLabels[entry.action] ?? entry.action}</span>
                      <span className="text-xs text-slate-500" title={formatDateTime(entry.createdAt)}>
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                    </div>
                    {previous || next ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {previous ? <span className="line-through text-slate-500">{previous}</span> : null}
                        {previous && next ? <span className="px-1">→</span> : null}
                        {next ? <span className="text-slate-200">{next}</span> : null}
                      </p>
                    ) : null}
                    {entry.note ? <p className="mt-1 whitespace-pre-wrap text-xs text-slate-300">{entry.note}</p> : null}
                    {entry.actorId ? (
                      <p className="mt-1 text-[11px] text-slate-500">Actor: {truncateMiddle(entry.actorId, 8, 4)}</p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500">No activity recorded yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
