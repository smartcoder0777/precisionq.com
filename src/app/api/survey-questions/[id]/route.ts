import { NextResponse } from "next/server";
import { surveySettingsController } from "@/controllers/survey-settings.controller";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: raw } = await context.params;
    const id = Number(raw);
    const body = (await request.json()) as Record<string, unknown>;
    const result = await surveySettingsController.questions.update(id, body);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params;
  const id = Number(raw);
  const result = await surveySettingsController.questions.remove(id);
  return NextResponse.json(result.body, { status: result.status });
}
