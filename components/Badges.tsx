import { formatUSD } from "@/lib/money";
import type { LineItem } from "@/lib/money";

/**
 * StatusBadge — high-contrast status pills. Borders on every variant so the
 * status reads in bright sunlight, not just in a dark shop office.
 */
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "border-bone-500/40 bg-bone-500/15 text-bone-300",
    sent: "border-info-400/40 bg-info-400/15 text-info-300",
    viewed: "border-grape-400/40 bg-grape-400/15 text-grape-300",
    accepted: "border-money-400/40 bg-money-400/15 text-money-300",
    declined: "border-alert-400/40 bg-alert-400/15 text-alert-300",
    unpaid: "border-safety-500/40 bg-safety-500/15 text-safety-300",
    overdue: "border-alert-400/40 bg-alert-400/15 text-alert-300",
    paid: "border-money-400/40 bg-money-400/15 text-money-300",
    scheduled: "border-info-400/40 bg-info-400/15 text-info-300",
    in_progress: "border-safety-500/40 bg-safety-500/15 text-safety-300",
    complete: "border-money-400/40 bg-money-400/15 text-money-300",
    cancelled: "border-bone-500/40 bg-bone-500/15 text-bone-400",
    requested: "border-info-400/40 bg-info-400/15 text-info-300",
    received: "border-money-400/40 bg-money-400/15 text-money-300",
  };
  const label = status.replace(/_/g, " ");
  return (
    <span className={`badge ${styles[status] ?? "border-white/15 bg-white/10 text-bone-300"}`}>
      {label}
    </span>
  );
}

/** One-line summary of line items + total, for list rows. */
export function ItemSummary({
  items,
  total,
}: {
  items: LineItem[];
  total: number;
}) {
  return (
    <p className="mt-1 text-sm text-bone-500">
      {items.length} line item{items.length === 1 ? "" : "s"} ·{" "}
      <span className="font-display text-lg tracking-wide text-paper">
        {formatUSD(total)}
      </span>
    </p>
  );
}
