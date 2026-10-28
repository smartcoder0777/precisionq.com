import { NextResponse } from "next/server";
import { paymentsController } from "@/controllers/payments.controller";

export async function POST() {
  const { status, body } = await paymentsController.removeAll();
  return NextResponse.json(body, { status });
}
