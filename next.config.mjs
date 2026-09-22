/** @type {import('next').NextConfig} */

/**
 * Security headers applied to every response.
 *
 * No Content-Security-Policy yet: Next's inline hydration scripts need either
 * a per-request nonce or 'unsafe-inline', and a CSP with 'unsafe-inline'
 * mostly buys the appearance of protection. The nonce version belongs in
 * middleware, as its own change, tested properly — shipping a broken CSP
 * would silently break the app in exactly the browsers it claims to protect.
 */
const securityHeaders = [
  // Don't let the browser second-guess a declared content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No framing: quote share links carry prices and accept buttons, which is
  // precisely what clickjacking is for.
  { key: "X-Frame-Options", value: "DENY" },
  // Send the origin to other sites, never the full path — share tokens live
  // in the path and must not leak through Referer.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here needs these.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HTTPS only, including subdomains. Vercel terminates TLS, so this is safe
  // to assert in production.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  poweredByHeader: false,
  /**
   * Files read at runtime that Next's tracer cannot see.
   *
   * pdfkit loads its .afm font metrics from disk when a document is created.
   * That read is dynamic, so tracing misses it, the files are left out of the
   * serverless bundle, and every PDF route 500s in production while working
   * perfectly on a laptop — where node_modules is simply present.
   *
   * The migrate route reads lib/schema.sql for the same reason.
   */
  // NOTE: on Next 14 this key lives under `experimental`. It moved to the top
  // level in 15, and setting it there on 14 is silently ignored — the build
  // succeeds and the files simply aren't in the bundle.
  experimental: {
    /**
     * Leave pdfkit as a real require from node_modules instead of bundling
     * it. pdfkit resolves its built-in fonts through Node subpath imports
     * ("#standard-fonts/Helvetica"), which webpack cannot resolve when it
     * inlines the package — the build succeeds and every PDF then dies at
     * runtime with "Cannot find module '#standard-fonts/Helvetica'".
     * Unbundled, Node's own resolver handles it.
     */
    serverComponentsExternalPackages: ["pdfkit"],
    outputFileTracingIncludes: {
      "/api/admin/migrate": ["./lib/schema.sql"],
      // Both the .afm metrics and the standard-font modules that pdfkit
      // reaches through its "#standard-fonts/*" subpath import. Neither is a
      // static require, so tracing finds neither on its own.
      "/api/quotes/[id]/pdf": ["./node_modules/pdfkit/js/**"],
      "/api/invoices/[id]/pdf": ["./node_modules/pdfkit/js/**"],
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Belt and braces alongside the noindex metadata on the quote pages:
        // a crawler that ignores meta tags still gets this.
        source: "/q/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
