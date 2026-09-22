import type { Config } from "tailwindcss";

/**
 * TradeReady design tokens — rugged-premium workwear aesthetic.
 * Single source of truth for the palette. Dark charcoal surfaces,
 * safety-amber accent, warm off-white text. No pastel SaaS tones.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark charcoal surface scale (page → raised → interactive)
        ink: {
          950: "#0a0b0d", // page background
          900: "#101216", // sunken wells / inputs
          850: "#15181d", // cards (base)
          800: "#1b1f26", // cards (raised)
          700: "#272c36", // borders / dividers
          600: "#39404d", // input borders / strong dividers
        },
        // Warm off-white text (never pure white, never cool slate)
        paper: "#f3f0e8",
        bone: {
          200: "#e6e8eb",
          300: "#c9cdd3", // primary body text — sunlight readable
          400: "#9aa0a9", // secondary text
          500: "#7b818b", // muted
          600: "#565b64", // placeholder / faintest
        },
        // Safety amber — the brand accent (hi-vis gear, caution tape)
        safety: {
          200: "#ffe1a1",
          300: "#ffcb57",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
        },
        // Burnt orange — gradient partner for the amber
        ember: {
          500: "#f97316",
          600: "#ea580c",
        },
        // Money green — paid / success
        money: {
          300: "#6ee7a0",
          400: "#34d399",
          500: "#10b981",
        },
        // Alert red — overdue / danger
        alert: {
          300: "#fca5a5",
          400: "#f87171",
        },
        // Info blue — sent / scheduled
        info: {
          300: "#93c5fd",
          400: "#60a5fa",
        },
        // Review purple — viewed / received
        grape: {
          300: "#c4b5fd",
          400: "#a78bfa",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Physical-button press shadow for primary CTAs
        "btn-hard": "0 3px 0 0 #92400e, 0 10px 24px -10px rgba(245,158,11,.55)",
        "card-deep": "0 16px 40px -20px rgba(0,0,0,.85)",
      },
    },
  },
  plugins: [],
};
export default config;
