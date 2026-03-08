import type { ReactNode } from "react";
import { Card } from "./Card";
import { Button } from "./Button";

export function LoadingState({ title = "Loading...", description }: { title?: string; description?: string }) {
  return (
    <Card className="p-8 text-center text-slate-300">
      <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-cyan-400/25 border-t-cyan-300 animate-spin" />
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
    <Card className="p-8 text-center">
      <h3 className="text-lg font-medium text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
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
    <Card className="p-8 text-center">
      <h3 className="text-lg font-medium text-white">Something went wrong</h3>
      <p className="mt-2 text-sm text-slate-400">{message}</p>
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
