"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** Header auth state: shows Dashboard / Log out when logged in. */
export default function AuthNav() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setState(d.user ? "in" : "out");
      })
      .catch(() => {
        if (alive) setState("out");
      });
    return () => {
      alive = false;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setState("out");
    router.push("/");
    router.refresh();
  }

  if (state === "loading") {
    return (
      <div
        className="h-11 w-28 animate-pulse rounded-xl bg-ink-700"
        aria-label="Loading"
      />
    );
  }

  if (state === "in") {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/dashboard"
          className="btn-primary !min-h-[44px] !px-5 !py-2 !text-sm"
        >
          Dashboard
        </Link>
        <button
          onClick={logout}
          className="min-h-[44px] touch-manipulation rounded-xl px-3 text-sm font-bold text-bone-400 transition hover:text-paper active:scale-[0.97]"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/login"
        className="hidden min-h-[44px] touch-manipulation items-center rounded-xl px-4 text-sm font-bold text-bone-300 transition hover:text-paper active:scale-[0.97] sm:inline-flex"
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="btn-primary !min-h-[44px] !px-5 !py-2 !text-sm"
      >
        Get started
      </Link>
    </div>
  );
}
