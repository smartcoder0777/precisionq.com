import { NextResponse } from "next/server";
import { authController } from "@/controllers";

export async function GET() {
  const { status, body } = await authController.getSession();
  return NextResponse.json(body, { status });
}
