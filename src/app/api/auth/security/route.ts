import { NextResponse } from "next/server";
import { authController } from "@/controllers";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { answer?: string };
    const { status, body: responseBody } = await authController.verifySecurity(body);
    return NextResponse.json(responseBody, { status });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Unable to verify security answer." },
      { status: 500 },
    );
  }
}
