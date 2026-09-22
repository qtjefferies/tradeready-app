import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...TOOLS.map((t) => ({ url: `${siteUrl}${t.href}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${siteUrl}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
