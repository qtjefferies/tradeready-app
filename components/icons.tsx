"use client";

/**
 * TradeReady icon set — lightweight inline SVGs, no dependency.
 * 20px stroke icons, currentColor, rounded caps. Workwear-simple.
 */

type IconProps = {
  className?: string;
};

function Base({
  className = "h-5 w-5",
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconBriefing(p: IconProps) {
  // Sunrise — the morning briefing
  return (
    <Base {...p}>
      <path d="M12 2v4" />
      <path d="m4.9 6.9 2.1 2.1" />
      <path d="m19.1 6.9-2.1 2.1" />
      <path d="M5 15a7 7 0 0 1 14 0" />
      <path d="M2 19h20" />
      <path d="M8 19v3M16 19v3" />
    </Base>
  );
}

export function IconQuote(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h4" />
    </Base>
  );
}

export function IconInvoice(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
      <path d="M9 7h6M9 11h6" />
      <path d="M9 15h3" />
    </Base>
  );
}

export function IconSchedule(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Base>
  );
}

export function IconCustomers(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Base>
  );
}

export function IconReviews(p: IconProps) {
  return (
    <Base {...p}>
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
    </Base>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function IconWrench(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </Base>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M20 6 9 17l-5-5" />
    </Base>
  );
}

export function IconCopy(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Base>
  );
}

export function IconDownload(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </Base>
  );
}

export function IconClock(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </Base>
  );
}

export function IconDollar(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 1v22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Base>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Base>
  );
}

export function IconX(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Base>
  );
}
