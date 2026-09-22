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

/**
 * A styled replacement for `window.confirm`.
 *
 * The native dialog is an unstyled OS box that ignores the design system,
 * looks like a browser malfunction on a phone, and gives no room to say what
 * is actually about to happen. This one is promise-based, so call sites read
 * almost exactly as they did before:
 *
 *   if (!(await confirm({ title: "Delete this quote?" }))) return;
 *
 * Destructive actions can also require the user to type a word, for the
 * handful that genuinely cannot be undone.
 */

export interface ConfirmOptions {
  title: string;
  body?: string;
  /** Defaults to "Confirm". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red styling for destructive actions. */
  destructive?: boolean;
  /** When set, the confirm button stays disabled until this is typed. */
  requireTyped?: string;
}

type Resolver = (ok: boolean) => void;

const ConfirmContext = createContext<
  ((opts: ConfirmOptions) => Promise<boolean>) | null
>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState("");
  const resolver = useRef<Resolver | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    setTyped("");
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
    setTyped("");
  }, []);

  // Escape cancels, the way the native dialog does.
  useEffect(() => {
    if (!opts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    // Move focus into the dialog so keyboard users aren't left behind it.
    confirmButton.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [opts, close]);

  const value = useMemo(() => confirm, [confirm]);
  const locked = Boolean(opts?.requireTyped) && typed.trim() !== opts?.requireTyped;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div
            className="card w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={opts.destructive ? "h-2 bg-alert-400" : "hazard h-2"}
              aria-hidden="true"
            />
            <div className="p-6">
              <h3
                id="confirm-title"
                className="font-display text-2xl uppercase leading-tight tracking-wide text-paper"
              >
                {opts.title}
              </h3>
              {opts.body && (
                <p className="mt-3 text-[15px] leading-relaxed text-bone-300">
                  {opts.body}
                </p>
              )}

              {opts.requireTyped && (
                <div className="mt-5">
                  <label htmlFor="confirm-typed" className="label-dark">
                    Type {opts.requireTyped} to confirm
                  </label>
                  <input
                    id="confirm-typed"
                    type="text"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    autoComplete="off"
                    className="input-dark"
                  />
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
                <button
                  ref={confirmButton}
                  onClick={() => close(true)}
                  disabled={locked}
                  className={
                    opts.destructive
                      ? "inline-flex min-h-[52px] flex-1 touch-manipulation items-center justify-center rounded-xl border-2 border-alert-400/50 bg-alert-400/15 px-6 text-base font-bold text-alert-300 transition hover:bg-alert-400/25 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
                      : "btn-primary flex-1 text-base"
                  }
                >
                  {opts.confirmLabel ?? "Confirm"}
                </button>
                <button onClick={() => close(false)} className="btn-secondary">
                  {opts.cancelLabel ?? "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * Returns an async confirm(). Falls back to the native dialog outside a
 * provider, so a call site can never silently skip its confirmation step.
 */
export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  return (
    ctx ??
    (async (o: ConfirmOptions) =>
      typeof window !== "undefined" ? window.confirm(o.title) : false)
  );
}
