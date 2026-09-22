import { formatUSD } from "@/lib/money";
import type { LineItem } from "@/lib/money";

/** Status pill colors for quotes, invoices, jobs, and reviews. */
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-500/20 text-slate-300",
    sent: "bg-blue-500/20 text-blue-300",
    viewed: "bg-violet-500/20 text-violet-300",
    accepted: "bg-emerald-500/20 text-emerald-300",
    declined: "bg-red-500/20 text-red-300",
    unpaid: "bg-amber-500/20 text-amber-300",
    overdue: "bg-red-500/20 text-red-300",
    paid: "bg-emerald-500/20 text-emerald-300",
    scheduled: "bg-blue-500/20 text-blue-300",
    in_progress: "bg-amber-500/20 text-amber-300",
    complete: "bg-emerald-500/20 text-emerald-300",
    cancelled: "bg-slate-500/20 text-slate-400",
    requested: "bg-blue-500/20 text-blue-300",
    received: "bg-emerald-500/20 text-emerald-300",
  };
  const label = status.replace(/_/g, " ");
  return (
    <span className={`badge ${styles[status] ?? "bg-white/10 text-slate-300"}`}>
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
    <p className="mt-1 text-xs text-slate-500">
      {items.length} line item{items.length === 1 ? "" : "s"} ·{" "}
      <span className="font-semibold text-slate-300">{formatUSD(total)}</span>
    </p>
  );
}
