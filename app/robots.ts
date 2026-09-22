import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /q holds customer quote links. The pages also send noindex headers;
        // this stops a crawler fetching one in the first place, which matters
        // because fetching it would register as the customer viewing it.
        disallow: ["/dashboard", "/api", "/q"],
      },
    ],
  };
}
