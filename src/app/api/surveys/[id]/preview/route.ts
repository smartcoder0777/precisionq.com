import { NextResponse } from "next/server";
import { surveyController } from "@/controllers/survey.controller";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params;
  const surveyId = Number(raw);
  const url = new URL(request.url);
  const langIdRaw = url.searchParams.get("languageId");
  const languageId = langIdRaw ? Number(langIdRaw) : undefined;
  const { status, body } = await surveyController.getPreviewData(surveyId, languageId);
  return NextResponse.json(body, { status });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: raw } = await context.params;
    const surveyId = Number(raw);
    const payload = (await request.json()) as Record<string, unknown>;
    const { status, body } = await surveyController.submitPreview(surveyId, payload);
    return NextResponse.json(body, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
