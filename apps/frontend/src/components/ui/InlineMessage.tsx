import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type InlineMessageTone = "success" | "warning" | "error" | "info";

const toneStyles: Record<InlineMessageTone, string> = {
  success: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-400/20 bg-amber-500/10 text-amber-100",
  error: "border-rose-400/20 bg-rose-500/10 text-rose-100",
  info: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
};

export function InlineMessage({
  tone,
  title,
  children,
  className,
}: {
  tone: InlineMessageTone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm", toneStyles[tone], className)} role={tone === "error" ? "alert" : "status"}>
      {title ? <p className="font-semibold text-white">{title}</p> : null}
      <p className={title ? "mt-1 leading-6" : "leading-6"}>{children}</p>
    </div>
  );
}
