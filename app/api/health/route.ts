import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";

/**
 * GET /api/health — liveness probe. Reports which backends are configured
 * without exposing secrets or counts.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    database: isDatabaseConfigured() ? "connected" : "not_configured",
    ai: aiConfigured() ? "configured" : "not_configured",
  });
}
