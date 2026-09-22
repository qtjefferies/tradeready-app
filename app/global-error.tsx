"use client";

/**
 * Last-resort boundary: catches failures in the root layout itself, where no
 * app chrome is available. Must render its own <html> and <body>, and must
 * not import anything that could be the thing that's broken — so the styling
 * here is inline rather than Tailwind.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0b0d",
          color: "#f3f0e8",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 12px" }}>
            TradeReady hit a snag
          </h1>
          <p style={{ color: "#c9cdd3", lineHeight: 1.6, margin: "0 0 24px" }}>
            Something broke while loading the page. Your data is safe — nothing
            was changed.
          </p>
          <button
            onClick={reset}
            style={{
              minHeight: "52px",
              padding: "0 24px",
              borderRadius: "12px",
              border: "none",
              background: "#fbbf24",
              color: "#0a0b0d",
              fontWeight: 800,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p style={{ color: "#565b64", fontSize: "0.75rem", marginTop: "24px" }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
