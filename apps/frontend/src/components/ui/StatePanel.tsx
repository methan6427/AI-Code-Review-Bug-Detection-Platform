import type { ReactNode } from "react";
import { Card } from "./Card";
import { Button } from "./Button";

export function LoadingState({ title = "Loading...", description }: { title?: string; description?: string }) {
  return (
    <Card className="relative overflow-hidden p-8 text-center text-slate-300">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/25 border-t-cyan-300" />
      <p className="text-base font-medium text-white">{title}</p>
      {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-8 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <div className="h-6 w-6 rounded-lg border border-cyan-300/35 bg-cyan-300/10" />
      </div>
      <h3 className="text-lg font-medium text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <Card className="relative overflow-hidden p-8 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10">
        <div className="h-2 w-2 rounded-full bg-rose-300 shadow-[0_0_16px_rgba(251,113,133,0.8)]" />
      </div>
      <h3 className="text-lg font-medium text-white">Something went wrong</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{message}</p>
      {retry ? (
        <div className="mt-5">
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
