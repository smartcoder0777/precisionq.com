import { NextResponse } from "next/server";
import { authController } from "@/controllers";

export async function POST() {
  const { status, body } = await authController.logout();
  return NextResponse.json(body, { status });
}
