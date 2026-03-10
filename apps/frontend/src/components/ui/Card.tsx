import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-white/10 bg-slate-900/72 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur transition-[border-color,background-color,box-shadow] duration-200",
        className,
      )}
      {...props}
    />
  );
}
