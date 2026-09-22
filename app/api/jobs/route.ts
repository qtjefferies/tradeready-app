import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { createJob, listJobs } from "@/lib/store";
import { badRequest, parseJob, readJson } from "@/lib/validate";
import type { JobStatus } from "@/lib/store";

const STATUSES: JobStatus[] = ["scheduled", "in_progress", "complete", "cancelled"];

/** GET /api/jobs[?status=|?from=YYYY-MM-DD&to=YYYY-MM-DD] */
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const q = req.nextUrl.searchParams;
  const statusParam = q.get("status");
  const status = STATUSES.includes(statusParam as JobStatus)
    ? (statusParam as JobStatus)
    : undefined;
  const from = q.get("from");
  const to = q.get("to");

  try {
    const jobs =
      from && to
        ? await listJobs(auth.user.id, { from, to })
        : await listJobs(auth.user.id, status ? { status } : undefined);
    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("[jobs] list failed:", err);
    return NextResponse.json(
      { error: "Couldn't load your schedule right now." },
      { status: 500 }
    );
  }
}

/** POST /api/jobs — schedule a job. */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const parsed = parseJob(body);
  if ("error" in parsed) return badRequest(parsed.error);

  try {
    const job = await createJob(auth.user.id, {
      customer_id: parsed.value.customer_id ?? null,
      customer_name: parsed.value.customer_name ?? "",
      quote_id: parsed.value.quote_id ?? null,
      title: parsed.value.title ?? "",
      scheduled_at: parsed.value.scheduled_at ?? null,
      status: parsed.value.status ?? "scheduled",
      notes: parsed.value.notes ?? "",
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    console.error("[jobs] create failed:", err);
    return NextResponse.json(
      { error: "Couldn't schedule the job right now." },
      { status: 500 }
    );
  }
}
