import { NextResponse } from "next/server";
import { ticketsController } from "@/controllers/tickets.controller";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: raw } = await context.params;
    const id = Number(raw);
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await ticketsController.update(id, {
      clinicId: body.clinicId,
      type: body.type,
      reason: body.reason,
      message: body.message,
      assignedToId: body.assignedToId,
      backupAssignedId: body.backupAssignedId,
      priority: body.priority,
      status: body.status,
    });
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params;
  const id = Number(raw);
  const { status, body } = await ticketsController.remove(id);
  return NextResponse.json(body, { status });
}
