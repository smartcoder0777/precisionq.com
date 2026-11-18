import { NextResponse } from "next/server";
import { withdrawalsController } from "@/controllers/withdrawals.controller";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: raw } = await context.params;
    const id = Number(raw);
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await withdrawalsController.review(id, body);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
