import { NextResponse } from "next/server";
import { walletController } from "@/controllers/wallet.controller";

export async function GET() {
  const { status, body } = await walletController.mine();
  return NextResponse.json(body, { status });
}
