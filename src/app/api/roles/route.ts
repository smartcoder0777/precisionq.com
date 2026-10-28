import { NextResponse } from "next/server";
import { rolesPermissionsController } from "@/controllers/roles-permissions.controller";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await rolesPermissionsController.createRole(body);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
