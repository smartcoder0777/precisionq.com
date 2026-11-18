import { NextResponse } from "next/server";
import { webhooksController } from "@/controllers/webhooks.controller";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = Buffer.from(await request.arrayBuffer());
  const { status, body } = await webhooksController.stripe(rawBody, signature);
  return NextResponse.json(body, { status });
}
