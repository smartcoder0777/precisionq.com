import { NextResponse } from "next/server";
import { paymentsController } from "@/controllers/payments.controller";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params;
  const id = Number(raw);
  const { status, body } = await paymentsController.remove(id);
  return NextResponse.json(body, { status });
}
