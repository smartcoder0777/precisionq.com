import { NextResponse } from "next/server";
import { surveySettingsController } from "@/controllers/survey-settings.controller";

export async function GET() {
  const { status, body } = await surveySettingsController.types.list();
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await surveySettingsController.types.create(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
