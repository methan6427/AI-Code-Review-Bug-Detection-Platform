import type { HTMLAttributes } from "react";
import type { IssueCategory, IssueSeverity, IssueStatus, ScanStatus } from "@ai-review/shared";
import { cn } from "../../lib/utils";

type BadgeTone =
  | IssueSeverity
  | ScanStatus
  | IssueCategory
  | IssueStatus
  | "manual"
  | "github_push"
  | "github_pull_request"
  | "git_clone"
  | "sample_files"
  | "default";

const styles: Record<BadgeTone, string> = {
  critical: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
  high: "bg-orange-500/15 text-orange-300 ring-orange-400/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  low: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  info: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  queued: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
  running: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/30",
  completed: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  failed: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
  bug: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
  security: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/30",
  performance: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  maintainability: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
  open: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/30",
  resolved: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  ignored: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
  manual: "bg-slate-400/12 text-slate-200 ring-slate-300/25",
  github_push: "bg-cyan-500/15 text-cyan-200 ring-cyan-400/30",
  github_pull_request: "bg-violet-500/15 text-violet-200 ring-violet-400/30",
  git_clone: "bg-sky-500/15 text-sky-200 ring-sky-400/30",
  sample_files: "bg-amber-500/15 text-amber-200 ring-amber-400/30",
  default: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
};

export function Badge({
  tone,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] ring-1 ring-inset",
        styles[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
