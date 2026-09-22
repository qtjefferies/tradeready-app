import { ImageResponse } from "next/og";

/**
 * App icon, generated rather than shipped as a binary so the brand lives in
 * one place. The hazard-stripe mark from the site header, scaled up: amber
 * ground, charcoal diagonals, dark rounded plate with the T.
 *
 * The stripes are real rotated elements, not a gradient — Satori (the
 * renderer behind ImageResponse) has no `repeating-linear-gradient`.
 */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

const STRIPE_W = 58;
const STRIPE_GAP = STRIPE_W * 2;

export default function Icon() {
  // Enough bars to cover the square once rotated 45°, which needs roughly
  // sqrt(2)× the width of coverage on each side.
  const bars = Array.from(
    { length: Math.ceil((size.width * 2) / STRIPE_GAP) + 2 },
    (_, i) => i * STRIPE_GAP - size.width / 2
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f59e0b",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {bars.map((left) => (
          <div
            key={left}
            style={{
              position: "absolute",
              top: -size.height / 2,
              left,
              width: STRIPE_W,
              height: size.height * 2,
              background: "#0a0b0d",
              transform: "rotate(45deg)",
            }}
          />
        ))}
        <div
          style={{
            position: "relative",
            width: 320,
            height: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0b0d",
            // The plate is the same charcoal as the stripes, so without a
            // ring of ground colour between them the two merge into one
            // ragged shape at icon size.
            border: "18px solid #f59e0b",
            borderRadius: 88,
            color: "#fbbf24",
            fontSize: 230,
            fontWeight: 900,
          }}
        >
          T
        </div>
      </div>
    ),
    size
  );
}
