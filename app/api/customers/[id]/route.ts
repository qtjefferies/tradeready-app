import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  addEquipment,
  deleteCustomer,
  deleteEquipment,
  getCustomer,
  getCustomerHistory,
  updateCustomer,
} from "@/lib/store";
import { badRequest, parseCustomer, readJson } from "@/lib/validate";

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** GET /api/customers/[id] — customer + full job history (the retention moat). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid customer id.");

  try {
    const [customer, history] = await Promise.all([
      getCustomer(auth.user.id, id),
      getCustomerHistory(auth.user.id, id),
    ]);
    if (!customer || !history) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }
    return NextResponse.json({ customer, history });
  } catch (err) {
    console.error("[customers/:id] get failed:", err);
    return NextResponse.json(
      { error: "Couldn't load the customer right now." },
      { status: 500 }
    );
  }
}

/** PUT /api/customers/[id] */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid customer id.");

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const b = body as Record<string, unknown>;

  // Equipment sub-actions: { action: "add-equipment" | "delete-equipment", ... }
  if (b.action === "add-equipment") {
    const description =
      typeof b.description === "string" ? b.description.trim().slice(0, 500) : "";
    if (!description) return badRequest("Equipment description is required.");
    const installedAt =
      typeof b.installed_at === "string" && b.installed_at.trim()
        ? b.installed_at.trim().slice(0, 30)
        : null;
    const notes = typeof b.notes === "string" ? b.notes.trim().slice(0, 5000) : "";
    try {
      const equipment = await addEquipment(
        auth.user.id,
        id,
        description,
        installedAt,
        notes
      );
      if (!equipment) {
        return NextResponse.json({ error: "Customer not found." }, { status: 404 });
      }
      return NextResponse.json({ equipment }, { status: 201 });
    } catch (err) {
      console.error("[customers/:id] add-equipment failed:", err);
      return NextResponse.json(
        { error: "Couldn't save the equipment record right now." },
        { status: 500 }
      );
    }
  }

  if (b.action === "delete-equipment") {
    const eqId = typeof b.equipment_id === "number" ? b.equipment_id : Number(b.equipment_id);
    if (!Number.isInteger(eqId) || eqId <= 0) return badRequest("Invalid equipment id.");
    try {
      const ok = await deleteEquipment(auth.user.id, id, eqId);
      if (!ok) {
        return NextResponse.json({ error: "Equipment record not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("[customers/:id] delete-equipment failed:", err);
      return NextResponse.json(
        { error: "Couldn't delete the equipment record right now." },
        { status: 500 }
      );
    }
  }

  const parsed = parseCustomer(body);
  if ("error" in parsed) return badRequest(parsed.error);

  try {
    const customer = await updateCustomer(auth.user.id, id, parsed.value);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }
    return NextResponse.json({ customer });
  } catch (err) {
    console.error("[customers/:id] update failed:", err);
    return NextResponse.json(
      { error: "Couldn't save the customer right now." },
      { status: 500 }
    );
  }
}

/** DELETE /api/customers/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid customer id.");

  try {
    const ok = await deleteCustomer(auth.user.id, id);
    if (!ok) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[customers/:id] delete failed:", err);
    return NextResponse.json(
      { error: "Couldn't delete the customer right now." },
      { status: 500 }
    );
  }
}
