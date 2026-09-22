import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Anton, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Link from "next/link";
import "./globals.css";

import { siteUrl, siteName } from "@/lib/site";
import AuthNav from "@/components/AuthNav";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });

/**
 * Mobile chrome. `viewportFit: "cover"` lets the bottom tab bar paint into
 * the iPhone home-indicator area, which the nav's safe-area padding already
 * accounts for; without it there's a dead band under the tabs.
 */
export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Your office manager, in your pocket.`,
    template: `%s — ${siteName}`,
  },
  description:
    "TradeReady is the AI office manager for trades professionals: quotes, invoices, scheduling, customer history, and reviews — the full job lifecycle in one place.",
  openGraph: {
    type: "website",
    siteName,
    title: `${siteName} — Your office manager, in your pocket.`,
    description:
      "Quotes, invoices, scheduling, customer history, and reviews for plumbers, electricians, HVAC, GCs, and more.",
  },
};

function Logo() {
  return (
    <Link href="/" className="flex touch-manipulation items-center gap-3" aria-label="TradeReady home">
      <span className="hazard flex h-10 w-10 items-center justify-center rounded-lg shadow-btn-hard">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-ink-950 font-display text-lg text-safety-400">
          T
        </span>
      </span>
      <span className="font-display text-xl uppercase tracking-wide text-paper">
        Trade<span className="text-safety-400">Ready</span>
      </span>
    </Link>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${anton.variable}`}>
      <body className="min-h-screen bg-ink-950 font-sans text-paper antialiased">
        <ToastProvider>
        <ConfirmProvider>
        {/* Keyboard users shouldn't have to tab through the whole header on
            every page load to reach what they came for. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-safety-400 focus:px-5 focus:py-3 focus:font-bold focus:text-ink-950"
        >
          Skip to content
        </a>
        <header className="fixed inset-x-0 top-0 z-50 border-b-2 border-ink-700 bg-ink-950/90 backdrop-blur-xl">
          <nav className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4 sm:px-6">
            <Logo />
            <div className="hidden items-center gap-8 text-sm font-semibold text-bone-400 md:flex">
              <Link href="/#how-it-works" className="transition hover:text-paper">
                How it works
              </Link>
              <Link href="/#money" className="transition hover:text-paper">
                Money found
              </Link>
              <Link href="/pricing" className="transition hover:text-paper">
                Pricing
              </Link>
              <Link href="/#faq" className="transition hover:text-paper">
                FAQ
              </Link>
            </div>
            <AuthNav />
          </nav>
          <div className="hazard h-1" aria-hidden="true" />
        </header>

        <main id="main" className="pt-[72px]">{children}</main>

        <footer className="border-t-2 border-ink-700 bg-ink-900/60">
          <div className="hazard h-1.5" aria-hidden="true" />
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
            <div className="md:col-span-2">
              <Logo />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-bone-500">
                The AI office manager for trades professionals. Built for the way
                real shops work — no fluff, no fake reviews, no inflated claims.
              </p>
            </div>
            <div>
              <h4 className="mb-3 font-display text-sm uppercase tracking-[0.14em] text-paper">Product</h4>
              <ul className="space-y-2.5 text-sm text-bone-500">
                <li>
                  <Link href="/pricing" className="inline-block min-h-[32px] py-1 transition hover:text-paper">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="inline-block min-h-[32px] py-1 transition hover:text-paper">
                    Get started
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="inline-block min-h-[32px] py-1 transition hover:text-paper">
                    Log in
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="inline-block min-h-[32px] py-1 transition hover:text-paper">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-display text-sm uppercase tracking-[0.14em] text-paper">Legal</h4>
              <ul className="space-y-2.5 text-sm text-bone-500">
                <li>
                  <Link href="/terms" className="inline-block min-h-[32px] py-1 transition hover:text-paper">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="inline-block min-h-[32px] py-1 transition hover:text-paper">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-ink-700 py-6 text-center text-xs text-bone-600">
            © 2026 TradeReady. All rights reserved.
          </div>
        </footer>
        <Analytics />
        </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
