import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus-visible:ring-2 focus-visible:ring-cyan-300/20",
        props.className,
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-28 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus-visible:ring-2 focus-visible:ring-cyan-300/20",
        props.className,
      )}
    />
  );
}
