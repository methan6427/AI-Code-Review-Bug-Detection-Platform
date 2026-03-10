import { Link } from "react-router-dom";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { cn } from "../lib/utils";

export function MetricCard({
  tone = "default",
  label,
  value,
  hint,
  detail,
  to,
  trend,
}: {
  tone?: "default" | "critical" | "info" | "completed" | "running";
  label: string;
  value: string | number;
  hint: string;
  detail?: string;
  to?: string;
  trend?: string;
}) {
  const content = (
    <>
      <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-300">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <Badge tone={tone}>{tone === "default" ? "overview" : tone}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{hint}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        {detail ? <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{detail}</p> : <span />}
        {trend ? <p className="text-xs font-medium text-cyan-200/80">{trend}</p> : null}
      </div>
    </>
  );

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-5",
        to ? "transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-slate-900/88" : undefined,
      )}
    >
      {to ? (
        <Link
          to={to}
          className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </Card>
  );
}
