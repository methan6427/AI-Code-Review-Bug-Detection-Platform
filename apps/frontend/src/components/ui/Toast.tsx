import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/utils";

type ToastTone = "success" | "warning" | "error" | "info";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastInput = Omit<ToastItem, "id">;

const toastStyles: Record<ToastTone, string> = {
  success: "border-emerald-400/25 bg-emerald-500/12 text-emerald-50",
  warning: "border-amber-400/25 bg-amber-500/12 text-amber-50",
  error: "border-rose-400/25 bg-rose-500/12 text-rose-50",
  info: "border-cyan-400/25 bg-cyan-500/12 text-cyan-50",
};

const toastAccentStyles: Record<ToastTone, string> = {
  success: "bg-emerald-300",
  warning: "bg-amber-300",
  error: "bg-rose-300",
  info: "bg-cyan-300",
};

const ToastContext = createContext<{
  pushToast: (toast: ToastInput) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col gap-3 sm:left-auto sm:right-6 sm:w-full sm:max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto overflow-hidden rounded-2xl border shadow-[0_22px_50px_rgba(2,6,23,0.5)] backdrop-blur",
              toastStyles[toast.tone],
            )}
            role="status"
          >
            <div className="flex items-start gap-3 p-4">
              <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", toastAccentStyles[toast.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-sm leading-5 text-current/80">{toast.description}</p> : null}
              </div>
              <button
                aria-label="Dismiss notification"
                className="rounded-full p-1 text-current/70 transition hover:bg-white/10 hover:text-white"
                onClick={() => dismissToast(toast.id)}
                type="button"
              >
                <span aria-hidden="true" className="block text-base leading-none">
                  ×
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
