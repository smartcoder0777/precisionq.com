import { NextResponse } from "next/server";
import { clinicsController } from "@/controllers/clinics.controller";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: raw } = await context.params;
    const id = Number(raw);
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await clinicsController.update(id, {
      clinicId: body.clinicId,
      name: body.name,
      acronym: body.acronym,
      address1: body.address1,
      address2: body.address2,
      city: body.city,
      state: body.state,
      zip: body.zip,
      phone: body.phone,
      email: body.email,
      web: body.web,
      portal: body.portal,
    });
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params;
  const id = Number(raw);
  const { status, body } = await clinicsController.remove(id);
  return NextResponse.json(body, { status });
}
