import { NextResponse } from "next/server";
import { ticketsController } from "@/controllers/tickets.controller";

export async function GET() {
  const { status, body } = await ticketsController.listAssignees();
  return NextResponse.json(body, { status });
}
