"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconCheck, IconX } from "./icons";

/**
 * Toasts — the confirmation the app never gave.
 *
 * Every save, delete and copy used to end in a silent `router.refresh()`,
 * which looks identical to nothing happening, so people click the button
 * again. A toast is the cheapest possible fix for that.
 *
 * Announced to screen readers as well as shown: success goes out politely via
 * role="status", failure interrupts via role="alert", because a failed save is
 * something you need to hear about before you walk away from the phone.
 */

export type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Long enough to read a sentence on a phone, in gloves, outdoors. */
const DURATION_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = nextId.current++;
      setToasts((t) => [...t, { id, kind, message }]);
      timers.current.push(setTimeout(() => dismiss(id), DURATION_MS));
    },
    [dismiss]
  );

  // Clear pending timers on unmount so a dismissed provider can't set state.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Sits above the mobile tab bar, which is fixed to the bottom. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[96px] z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border-2 p-4 shadow-card-deep backdrop-blur-md ${
              t.kind === "success"
                ? "border-money-400/50 bg-money-400/15 text-money-300"
                : t.kind === "error"
                ? "border-alert-400/50 bg-alert-400/15 text-alert-300"
                : "border-ink-600 bg-ink-800 text-bone-200"
            }`}
          >
            {t.kind === "success" && <IconCheck className="mt-0.5 h-5 w-5 shrink-0" />}
            <p className="flex-1 text-[15px] font-semibold leading-relaxed">
              {t.message}
            </p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="-m-1 shrink-0 rounded-lg p-1 opacity-70 transition hover:opacity-100"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Show a toast. Outside a provider this is a no-op rather than a crash — a
 * missing confirmation should never take a working screen down with it.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx ?? { toast: () => {} };
}
