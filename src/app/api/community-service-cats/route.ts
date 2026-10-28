import { NextResponse } from "next/server";
import { communityServiceCategoriesController } from "@/controllers/community-services.controller";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await communityServiceCategoriesController.create(body);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
