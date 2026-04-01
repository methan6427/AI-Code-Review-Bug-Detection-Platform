import { Card } from "../components/ui/Card";

export function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="relative w-full max-w-2xl overflow-hidden border-cyan-300/10 bg-slate-950/75 p-8 sm:p-10">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.75),transparent)]" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">Maintenance mode</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">Site under maintenance</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
          We're performing scheduled work right now. The site is temporarily unavailable while updates are being completed.
        </p>

      </Card>
    </div>
  );
}
