import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantStyles: Record<Variant, string> = {
  primary:
    "border border-cyan-300/50 bg-cyan-300 text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.18)] hover:border-cyan-200 hover:bg-cyan-200",
  secondary:
    "border border-white/10 bg-white/[0.06] text-slate-100 shadow-[0_12px_30px_rgba(2,6,23,0.28)] hover:border-cyan-400/30 hover:bg-white/[0.1]",
  ghost: "border border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.05] hover:text-white",
  danger: "border border-rose-400/35 bg-rose-500/90 text-white hover:bg-rose-400",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:border-white/5 disabled:opacity-50",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
