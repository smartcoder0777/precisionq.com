import { NextResponse } from "next/server";
import { paymentSettingsController } from "@/controllers/payment-settings.controller";

export async function GET() {
  const { status, body } = await paymentSettingsController.get();
  return NextResponse.json(body, { status });
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await paymentSettingsController.update(body);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
