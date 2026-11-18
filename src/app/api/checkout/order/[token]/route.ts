import { NextResponse } from "next/server";
import { checkoutController } from "@/controllers/checkout.controller";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const { status, body } = await checkoutController.getByToken(token);
  return NextResponse.json(body, { status });
}
