import { NextResponse } from "next/server";
import { usersController } from "@/controllers/users.controller";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const { id: raw } = await ctx.params;
    const id = Number(raw);
    const body = (await request.json()) as Record<string, unknown>;
    const { status, body: resBody } = await usersController.updatePassword(id, body);
    return NextResponse.json(resBody, { status });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
}
