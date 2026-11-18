import { NextResponse } from "next/server";
import { webhooksController } from "@/controllers/webhooks.controller";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { orderToken?: string };
    const token = String(body.orderToken ?? "").trim();
    if (!token) return NextResponse.json({ ok: false, message: "orderToken required." }, { status: 400 });
    const { status, body: resBody } = await webhooksController.paypalCaptureReturn(token);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
