import { NextResponse } from "next/server";
import { qpSettingsController } from "@/controllers/qp-settings.controller";

export async function GET() {
  const { status, body } = await qpSettingsController.get();
  return NextResponse.json(body, { status });
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await qpSettingsController.save(body);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
