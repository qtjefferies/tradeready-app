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
    return <div className="h-9 w-24 animate-pulse rounded-xl bg-white/10" />;
  }

  if (state === "in") {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 transition hover:opacity-90"
        >
          Dashboard
        </Link>
        <button
          onClick={logout}
          className="text-sm text-slate-400 transition hover:text-white"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/login" className="text-sm text-slate-300 transition hover:text-white">
        Log in
      </Link>
      <Link
        href="/signup"
        className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 transition hover:opacity-90"
      >
        Get started
      </Link>
    </div>
  );
}
