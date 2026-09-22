/**
 * Dashboard loading skeleton.
 *
 * Every dashboard screen is a server component that blocks on Postgres. With
 * no skeleton, a contractor on two bars of signal sees the previous page
 * frozen and taps the button again. This gives the wait a shape.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="flex items-start gap-4 md:mt-8">
        <div className="h-14 w-14 shrink-0 rounded-2xl bg-ink-800" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-8 w-2/3 max-w-xs rounded-lg bg-ink-800" />
          <div className="h-4 w-full max-w-md rounded bg-ink-800/70" />
        </div>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-6">
            <div className="h-5 w-32 rounded bg-ink-800" />
            <div className="mt-5 space-y-3">
              <div className="h-16 rounded-xl bg-ink-800/70" />
              <div className="h-16 rounded-xl bg-ink-800/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
