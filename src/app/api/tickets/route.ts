import { NextResponse } from "next/server";
import { ticketsController } from "@/controllers/tickets.controller";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await ticketsController.create({
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
