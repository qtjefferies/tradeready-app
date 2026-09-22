import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getQuoteByToken, markQuoteViewed } from "@/lib/store";
import { isLikelyBot } from "@/lib/bots";
import { computeTotals, formatPct, formatUSD } from "@/lib/money";
import PublicQuoteActions from "@/components/PublicQuoteActions";
import { IconCheck, IconWrench } from "@/components/icons";

/**
 * The customer-facing quote.
 *
 * No login, no account, no app — a homeowner opens a link from a text message
 * and either says yes or doesn't. It is also the only place TradeReady learns
 * whether a quote was ever actually opened, which is the difference between
 * "they didn't like the price" and "they never saw it".
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your quote",
  description: "Review and respond to your quote.",
  // A share token in a search index would hand the quote to anyone who
  // searched for it. Keep every one of these pages out.
  robots: { index: false, follow: false, nocache: true },
};

function formatDay(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function PublicQuotePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { preview?: string };
}) {
  const found = await getQuoteByToken(params.token);
  if (!found) notFound();
  const { quote, business } = found;

  // Two kinds of fetch must not register as a customer view, because both
  // would corrupt the one signal this page exists to collect: the contractor
  // checking their own link, and the messaging app that fetches the URL to
  // build a preview card the instant the link is texted.
  const isPreview = searchParams.preview === "1";
  const automated = isLikelyBot(headers().get("user-agent"));
  if (!isPreview && !automated) await markQuoteViewed(params.token);

  const totals = computeTotals(quote.line_items, quote.tax_pct, quote.discount);
  const labor = quote.line_items.filter((i) => i.kind === "labor");
  const materials = quote.line_items.filter((i) => i.kind === "materials");
  const answered = quote.status === "accepted" || quote.status === "declined";
  const businessName = business.businessName || "your contractor";

  const expired =
    quote.valid_until !== null &&
    new Date(`${quote.valid_until}T23:59:59`).getTime() < Date.now();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      {isPreview && (
        <p className="mb-6 rounded-xl border-2 border-safety-500/40 bg-safety-500/10 px-4 py-3 text-[15px] font-semibold text-safety-200">
          Preview — this is exactly what your customer sees. Opening it this way
          doesn&apos;t count as a view, and the buttons below are live, so
          don&apos;t tap them.
        </p>
      )}

      {/* Who this is from */}
      <div className="card overflow-hidden">
        <div className="hazard h-2" aria-hidden="true" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-safety-500/15 text-safety-300">
              <IconWrench className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="stat-label">Quote from</p>
              <h1 className="mt-1 font-display text-3xl uppercase leading-tight tracking-wide text-paper sm:text-4xl">
                {businessName}
              </h1>
              {business.trade && (
                <p className="mt-1 text-sm font-semibold text-bone-400">
                  {business.trade}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 border-t-2 border-ink-700 pt-6">
            <p className="stat-label">Quote Q-{quote.id}</p>
            <h2 className="mt-1 font-display text-2xl uppercase tracking-wide text-safety-300 sm:text-3xl">
              {quote.title}
            </h2>
            {quote.customer_name && (
              <p className="mt-2 text-[15px] text-bone-300">
                Prepared for {quote.customer_name}
              </p>
            )}
          </div>

          {/* Line items */}
          <div className="mt-8 space-y-7">
            {[
              { label: "Labor", items: labor, total: totals.laborTotal },
              { label: "Materials", items: materials, total: totals.materialsTotal },
            ]
              .filter((g) => g.items.length > 0)
              .map((group) => (
                <div key={group.label}>
                  <div className="flex items-baseline justify-between border-b-2 border-ink-700 pb-2">
                    <h3 className="font-display text-lg uppercase tracking-wide text-paper">
                      {group.label}
                    </h3>
                    <span className="font-semibold text-bone-300">
                      {formatUSD(group.total)}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-3">
                    {group.items.map((item, i) => (
                      <li
                        key={`${group.label}-${i}`}
                        className="flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-[15px] leading-relaxed text-bone-200">
                            {item.description}
                          </p>
                          {item.qty !== 1 && (
                            <p className="mt-0.5 text-sm text-bone-500">
                              {item.qty} × {formatUSD(item.unit_price)}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 font-semibold text-bone-200">
                          {formatUSD(item.qty * item.unit_price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>

          {/* Totals */}
          <dl className="mt-8 space-y-2.5 border-t-2 border-ink-700 pt-6 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-bone-400">Subtotal</dt>
              <dd className="font-semibold text-bone-200">
                {formatUSD(totals.subtotal)}
              </dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-bone-400">Discount</dt>
                <dd className="font-semibold text-money-300">
                  −{formatUSD(totals.discount)}
                </dd>
              </div>
            )}
            {totals.tax > 0 && (
              <div className="flex justify-between">
                <dt className="text-bone-400">Tax ({formatPct(quote.tax_pct)})</dt>
                <dd className="font-semibold text-bone-200">
                  {formatUSD(totals.tax)}
                </dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t-2 border-ink-600 pt-4">
              <dt className="font-display text-xl uppercase tracking-wide text-paper">
                Total
              </dt>
              <dd className="font-display text-4xl tracking-wide text-safety-300 sm:text-5xl">
                {formatUSD(totals.total)}
              </dd>
            </div>
          </dl>

          {quote.notes && (
            <div className="well mt-6 p-4">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-bone-300">
                {quote.notes}
              </p>
            </div>
          )}

          {quote.valid_until && (
            <p className="mt-4 text-sm text-bone-500">
              {expired ? "This quote was valid until" : "Valid until"}{" "}
              {formatDay(quote.valid_until)}
              {expired && " — get in touch and we'll take another look."}
            </p>
          )}
        </div>
      </div>

      {/* The answer */}
      <div className="mt-6">
        {answered ? (
          <div
            className={`rounded-2xl border-2 p-6 text-center ${
              quote.status === "accepted"
                ? "border-money-400/40 bg-money-400/10"
                : "border-ink-600 bg-ink-900"
            }`}
          >
            <p
              className={`font-display text-2xl uppercase tracking-wide ${
                quote.status === "accepted" ? "text-money-300" : "text-bone-300"
              }`}
            >
              {quote.status === "accepted" ? (
                <span className="inline-flex items-center gap-2">
                  <IconCheck className="h-6 w-6" /> Accepted
                </span>
              ) : (
                "Declined"
              )}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-bone-300">
              {quote.status === "accepted"
                ? `${businessName} has this and will be in touch to book the work in.`
                : `${businessName} has been notified. If anything changes, just get in touch.`}
            </p>
          </div>
        ) : (
          <PublicQuoteActions token={params.token} businessName={businessName} />
        )}
      </div>

      {/* How to reach them. `business.email` is the profile's contact
          address, never the login address — see getPublicBusinessInfo. */}
      {(business.phone || business.email) && (
        <div className="mt-6 rounded-2xl border border-ink-700 bg-ink-900/60 p-5 text-center">
          <p className="stat-label">Questions about this quote?</p>
          <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
            {business.phone && (
              <a
                href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}
                className="btn-secondary w-full sm:w-auto"
              >
                Call {business.phone}
              </a>
            )}
            {business.email && (
              <a
                href={`mailto:${business.email}`}
                className="text-[15px] font-semibold text-safety-300 underline-offset-4 hover:underline"
              >
                {business.email}
              </a>
            )}
          </div>
          {business.licenseNumber && (
            <p className="mt-4 text-xs text-bone-600">
              License {business.licenseNumber}
            </p>
          )}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-bone-600">
        Sent with TradeReady — no account needed, nothing to install.
      </p>
    </div>
  );
}
