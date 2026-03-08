import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-slate-900/70 shadow-[0_10px_40px_rgba(15,23,42,0.35)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

