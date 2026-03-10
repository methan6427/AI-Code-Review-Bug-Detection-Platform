import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";

export function MetricCard({
  tone = "default",
  label,
  value,
  hint,
  detail,
}: {
  tone?: "default" | "critical" | "info" | "completed" | "running";
  label: string;
  value: string | number;
  hint: string;
  detail?: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-300">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <Badge tone={tone}>{tone === "default" ? "overview" : tone}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{hint}</p>
      {detail ? <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">{detail}</p> : null}
    </Card>
  );
}
