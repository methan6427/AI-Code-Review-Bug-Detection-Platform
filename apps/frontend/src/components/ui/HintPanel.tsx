import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function HintPanel({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(8,47,73,0.42),rgba(2,6,23,0.92))] p-4 shadow-[0_16px_40px_rgba(2,6,23,0.24)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-200">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          <div className="mt-1 text-sm leading-6 text-slate-300">{description}</div>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
