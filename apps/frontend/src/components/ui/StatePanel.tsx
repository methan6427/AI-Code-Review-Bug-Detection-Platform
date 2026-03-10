import type { ReactNode } from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { cn } from "../../lib/utils";

function StateGlyph({ className, children }: { className: string; children: ReactNode }) {
  return <div className={cn("mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border", className)}>{children}</div>;
}

export function SkeletonBlock({
  className,
}: {
  className?: string;
}) {
  return <div className={cn("animate-pulse rounded-2xl bg-white/[0.08]", className)} />;
}

export function MetricCardSkeleton() {
  return (
    <Card className="overflow-hidden p-5">
      <SkeletonBlock className="h-px w-full rounded-full" />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-10 w-20" />
        </div>
        <SkeletonBlock className="h-7 w-20 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-3/4" />
      </div>
      <SkeletonBlock className="mt-4 h-3 w-16" />
    </Card>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-slate-900/60 p-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-5 w-16 rounded-full" />
        </div>
        <SkeletonBlock className="h-4 w-2/5" />
        <SkeletonBlock className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function LoadingState({
  title = "Loading...",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-8 text-center text-slate-300 sm:p-9">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <StateGlyph className="border-cyan-400/20 bg-cyan-500/10">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/25 border-t-cyan-300" />
      </StateGlyph>
      <p className="text-base font-medium text-white">{title}</p>
      {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-8 text-center sm:p-9">
      <StateGlyph className="border-white/10 bg-white/[0.04]">
        <div className="h-6 w-6 rounded-lg border border-cyan-300/35 bg-cyan-300/10" />
      </StateGlyph>
      {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">{eyebrow}</p> : null}
      <h3 className="text-lg font-medium text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function ErrorState({
  message,
  retry,
  title = "Something went wrong",
  action,
}: {
  message: string;
  retry?: () => void;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-8 text-center sm:p-9">
      <StateGlyph className="border-rose-400/20 bg-rose-500/10">
        <div className="h-2 w-2 rounded-full bg-rose-300 shadow-[0_0_16px_rgba(251,113,133,0.8)]" />
      </StateGlyph>
      <h3 className="text-lg font-medium text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{message}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {retry ? (
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        ) : null}
        {action}
      </div>
    </Card>
  );
}
