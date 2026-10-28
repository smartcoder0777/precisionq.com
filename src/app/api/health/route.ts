import { NextResponse } from "next/server";
import { healthController } from "@/controllers/health.controller";

export async function GET() {
  const { status, body } = healthController.getAppHealth();
  return NextResponse.json(body, { status });
}
