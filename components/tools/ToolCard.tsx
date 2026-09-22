import Link from "next/link";
import { IconBolt, IconDollar, IconDroplet, IconSlab, IconThermo } from "@/components/icons";
import { TRADE_LABEL, type FreeTool, type TradeKey } from "@/lib/tools";

const TRADE_ICON: Record<TradeKey, (p: { className?: string }) => JSX.Element> = {
  electrical: IconBolt,
  hvac: IconThermo,
  plumbing: IconDroplet,
  general: IconSlab,
  business: IconDollar,
};

/**
 * One free calculator, as a card. `compact` is the homepage version (short
 * name, one-line teaser); the default is the full /tools listing.
 */
export function ToolCard({ tool, compact = false }: { tool: FreeTool; compact?: boolean }) {
  const Icon = TRADE_ICON[tool.trade];
  return (
    <Link
      href={tool.href}
      className="card group relative flex h-full flex-col overflow-hidden p-5 transition hover:border-safety-500/40 sm:p-6"
    >
      <div
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-safety-400 to-ember-600 opacity-0 transition group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-bone-500">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-safety-500/15 text-safety-300">
            <Icon className="h-4 w-4" />
          </span>
          {TRADE_LABEL[tool.trade]}
        </span>
        {!compact ? (
          <span className="rounded-full border border-safety-500/40 bg-safety-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-safety-300">
            {tool.tag}
          </span>
        ) : null}
      </div>

      <h3
        className={`mt-4 font-display uppercase tracking-wide text-paper transition group-hover:text-safety-300 ${
          compact ? "text-xl" : "text-2xl"
        }`}
      >
        {compact ? tool.short : tool.name}
      </h3>
      <p className="mt-1 text-sm font-semibold text-bone-200">{tool.answers}</p>
      <p className={`mt-2 flex-1 leading-relaxed text-bone-400 ${compact ? "text-sm" : "text-[15px]"}`}>
        {compact ? tool.teaser : tool.blurb}
      </p>
      <p className="mt-4 text-sm font-bold text-safety-300">
        Open calculator <span className="inline-block transition group-hover:translate-x-0.5">→</span>
      </p>
    </Link>
  );
}
