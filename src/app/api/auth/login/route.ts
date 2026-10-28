import { NextResponse } from "next/server";
import { authController } from "@/controllers";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const { status, body: responseBody } = await authController.login(body);
    return NextResponse.json(responseBody, { status });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Unable to login." },
      { status: 500 },
    );
  }
}
