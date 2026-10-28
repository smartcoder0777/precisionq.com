import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { deleteContactTrackById } from "@/models/contact-track.model";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { id: raw } = await context.params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  try {
    await deleteContactTrackById(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
