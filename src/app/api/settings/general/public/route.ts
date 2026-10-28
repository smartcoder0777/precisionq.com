import { NextResponse } from "next/server";
import { generalSettingsController } from "@/controllers/general-settings.controller";

export async function GET() {
  const { status, body } = await generalSettingsController.getPublic();
  return NextResponse.json(body, { status });
}
