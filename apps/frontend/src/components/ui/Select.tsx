import type { SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-cyan-400/60 focus-visible:ring-2 focus-visible:ring-cyan-300/20",
        props.className,
      )}
    />
  );
}
