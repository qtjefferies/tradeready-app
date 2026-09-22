import Link from "next/link";
import { IconCheck } from "./icons";

/**
 * First-run checklist.
 *
 * The briefing's empty states are written for an established contractor
 * having a quiet Tuesday — "Nobody owes you money. Beautiful." Shown to
 * someone who signed up ninety seconds ago, that reads as "this app is empty
 * and I don't know what to do", which is the single worst moment in the
 * product. This replaces it until there's real work on the account.
 *
 * Every step links to the screen that completes it, and each one is a real
 * check against the database — never a box you tick yourself.
 */

export interface SetupStep {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  done: boolean;
}

export default function GettingStarted({ steps }: { steps: SetupStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  return (
    <section className="card overflow-hidden">
      <div className="hazard h-2" aria-hidden="true" />
      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="stat-label">Getting set up</p>
            <h3 className="mt-1 font-display text-2xl uppercase tracking-wide text-paper sm:text-3xl">
              {doneCount === 0
                ? "Four steps to your first quote"
                : `${doneCount} of ${steps.length} done`}
            </h3>
          </div>
          <p className="font-display text-3xl tracking-wide text-safety-300">
            {doneCount}/{steps.length}
          </p>
        </div>

        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-bone-300">
          {next
            ? `Next: ${next.body}`
            : "You're set up. This panel disappears once your first quote is on the board."}
        </p>

        {/* Progress bar — deliberately a real proportion, not decoration. */}
        <div
          className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-ink-900"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-label="Setup progress"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-safety-400 to-ember-500 transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>

        <ol className="mt-6 space-y-3">
          {steps.map((s, i) => {
            const isNext = next?.id === s.id;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-4 rounded-xl border-2 p-4 transition ${
                  s.done
                    ? "border-money-400/30 bg-money-400/[0.07]"
                    : isNext
                    ? "border-safety-500/50 bg-safety-500/[0.07]"
                    : "border-ink-700 bg-ink-900/60"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg ${
                    s.done
                      ? "bg-money-400/20 text-money-300"
                      : isNext
                      ? "bg-safety-500/20 text-safety-300"
                      : "bg-ink-800 text-bone-500"
                  }`}
                  aria-hidden="true"
                >
                  {s.done ? <IconCheck className="h-5 w-5" /> : i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={`font-display text-lg uppercase tracking-wide ${
                      s.done ? "text-bone-400 line-through" : "text-paper"
                    }`}
                  >
                    {s.title}
                  </p>
                  {!s.done && (
                    <p className="mt-0.5 text-sm leading-relaxed text-bone-400">
                      {s.body}
                    </p>
                  )}
                </div>

                {!s.done && (
                  <Link
                    href={s.href}
                    className={
                      isNext
                        ? "btn-primary shrink-0 !min-h-[44px] !px-4 text-sm"
                        : "btn-secondary shrink-0 !min-h-[44px] !px-4 text-sm"
                    }
                  >
                    {s.cta}
                  </Link>
                )}
                {s.done && (
                  <span className="sr-only">Done</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
