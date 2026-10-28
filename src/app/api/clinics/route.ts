import { NextResponse } from "next/server";
import { clinicsController } from "@/controllers/clinics.controller";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await clinicsController.create({
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
