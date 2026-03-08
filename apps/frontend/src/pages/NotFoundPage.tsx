import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">404</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Page not found</h1>
        <p className="mt-3 text-slate-400">The route does not exist in this environment.</p>
        <Link className="mt-6 inline-block" to="/dashboard">
          <Button>Go to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

