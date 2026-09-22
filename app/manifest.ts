import type { MetadataRoute } from "next";
import { siteName } from "@/lib/site";

/**
 * Installable to a phone home screen.
 *
 * The whole pitch is "your office manager, in your pocket" — so it should
 * open like an app from the home screen, not like a bookmark in a browser
 * with a URL bar eating the top of a 375px-wide dashboard.
 *
 * `start_url` is the briefing rather than the marketing page: someone who
 * installed this is a customer, not a prospect.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteName} — your office manager, in your pocket`,
    short_name: siteName,
    description:
      "Quotes, invoices, scheduling and the money already sitting in your own records — for trades professionals.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0b0d",
    theme_color: "#0a0b0d",
    categories: ["business", "productivity", "finance"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
