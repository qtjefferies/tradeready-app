"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Calculator state that lives in the URL. Every result becomes a link a
 * contractor can text to a customer or paste into a quote, and the back
 * button doesn't fill up because updates use replaceState.
 *
 * Values are strings (they feed inputs directly). Defaults are rendered on
 * the server; the URL is read once on mount so hydration matches.
 */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [state, setState] = useState<T>(defaults);
  const hydrated = useRef(false);
  const defaultsRef = useRef(defaults);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const params = new URLSearchParams(window.location.search);
      let changed = false;
      const next = { ...defaultsRef.current };
      for (const key of Object.keys(next)) {
        const v = params.get(key);
        if (v !== null && v !== next[key]) {
          (next as Record<string, string>)[key] = v;
          changed = true;
        }
      }
      if (changed) setState(next);
    } catch {
      /* no URL access — defaults stand */
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(state)) {
        if (value === defaultsRef.current[key]) params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* ignore */
    }
  }, [state]);

  const set = useCallback(
    <K extends keyof T>(key: K) =>
      (value: T[K]) =>
        setState((s) => (s[key] === value ? s : { ...s, [key]: value })),
    []
  );

  return [state, set] as const;
}
