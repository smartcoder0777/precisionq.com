import { NextResponse } from "next/server";
import { generalSettingsController } from "@/controllers/general-settings.controller";

export async function GET() {
  const { status, body } = await generalSettingsController.get();
  return NextResponse.json(body, { status });
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await generalSettingsController.save(body);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
