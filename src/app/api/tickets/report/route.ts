import { NextResponse } from "next/server";
import { ticketsController } from "@/controllers/tickets.controller";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { userId?: unknown };
    const { status, body: resBody } = await ticketsController.sendStatusReport({
      userId: body.userId,
    });
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
