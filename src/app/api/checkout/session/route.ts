import { NextResponse } from "next/server";
import { checkoutController } from "@/controllers/checkout.controller";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await checkoutController.createSession(body);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
