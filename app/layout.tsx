import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Link from "next/link";
import "./globals.css";

import { siteUrl, siteName } from "@/lib/site";
import AuthNav from "@/components/AuthNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

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
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 font-display text-lg font-bold text-white shadow-lg shadow-orange-600/30">
        T
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-white">
        Trade<span className="gradient-text">Ready</span>
      </span>
    </Link>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="min-h-screen bg-[#0a0c10] font-sans text-slate-200 antialiased">
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0a0c10]/80 backdrop-blur-xl">
          <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <Logo />
            <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
              <Link href="/#how-it-works" className="transition hover:text-white">
                How it works
              </Link>
              <Link href="/#features" className="transition hover:text-white">
                Features
              </Link>
              <Link href="/#faq" className="transition hover:text-white">
                FAQ
              </Link>
            </div>
            <AuthNav />
          </nav>
        </header>

        <main className="pt-16">{children}</main>

        <footer className="border-t border-white/10 bg-black/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-4">
            <div className="md:col-span-2">
              <Logo />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
                The AI office manager for trades professionals. Built for the way
                real shops work — no fluff, no fake reviews, no inflated claims.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">Product</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <Link href="/signup" className="transition hover:text-white">
                    Get started
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="transition hover:text-white">
                    Log in
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="transition hover:text-white">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <Link href="/terms" className="transition hover:text-white">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="transition hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 py-6 text-center text-xs text-slate-600">
            © 2026 TradeReady. All rights reserved.
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
