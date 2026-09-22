import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { deleteJob, getJob, updateJob } from "@/lib/store";
import { badRequest, parseJob, readJson } from "@/lib/validate";

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** GET /api/jobs/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid job id.");

  try {
    const job = await getJob(auth.user.id, id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
    return NextResponse.json({ job });
  } catch (err) {
    console.error("[jobs/:id] get failed:", err);
    return NextResponse.json(
      { error: "Couldn't load the job right now." },
      { status: 500 }
    );
  }
}

/** PUT /api/jobs/[id] */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid job id.");

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const parsed = parseJob(body, true);
  if ("error" in parsed) return badRequest(parsed.error);

  try {
    const job = await updateJob(auth.user.id, id, parsed.value);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
    return NextResponse.json({ job });
  } catch (err) {
    console.error("[jobs/:id] update failed:", err);
    return NextResponse.json(
      { error: "Couldn't save the job right now." },
      { status: 500 }
    );
  }
}

/** DELETE /api/jobs/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid job id.");

  try {
    const ok = await deleteJob(auth.user.id, id);
    if (!ok) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[jobs/:id] delete failed:", err);
    return NextResponse.json(
      { error: "Couldn't delete the job right now." },
      { status: 500 }
    );
  }
}
