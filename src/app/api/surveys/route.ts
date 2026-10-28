import { NextResponse } from "next/server";
import { surveyController } from "@/controllers/survey.controller";

export async function GET() {
  const { status, body } = await surveyController.getPageData();
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await surveyController.create(body);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
