import { NextResponse } from "next/server";
import { withdrawalsController } from "@/controllers/withdrawals.controller";

export async function GET() {
  const { status, body } = await withdrawalsController.list();
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await withdrawalsController.create(body);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
