import { NextResponse } from "next/server";
import { webhooksController } from "@/controllers/webhooks.controller";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await webhooksController.circle(body);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
