import { NextResponse } from "next/server";
import { insuranceController } from "@/controllers/insurance.controller";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: raw } = await context.params;
    const id = Number(raw);
    const body = (await request.json()) as { clinicIds?: unknown };
    const { status, body: resBody } = await insuranceController.replaceClinics(id, body.clinicIds);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
