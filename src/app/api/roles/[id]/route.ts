import { NextResponse } from "next/server";
import { rolesPermissionsController } from "@/controllers/roles-permissions.controller";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: raw } = await context.params;
    const id = Number(raw);
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await rolesPermissionsController.updateRole(id, body);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params;
  const id = Number(raw);
  const { status, body } = await rolesPermissionsController.deleteRole(id);
  return NextResponse.json(body, { status });
}
