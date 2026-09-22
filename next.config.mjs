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
