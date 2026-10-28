import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import * as UserModel from "@/models/user.model";
import { normalizeUsPhone } from "@/lib/phone-format";
import { requireRolePermission } from "@/controllers/_permission";
import { unlinkUserStoredPhoto } from "@/lib/server/unlink-user-photo";

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function PATCH(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    const denied = await requireRolePermission(session, "users", "edit");
    if (denied) return NextResponse.json(denied.body, { status: denied.status });

    const input = (await request.json()) as Record<string, unknown>;
    const row = await UserModel.getUserById(session.userId);
    if (!row) return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });

    const firstName = strOrNull(input.firstName);
    const lastName = strOrNull(input.lastName);
    const email = strOrNull(input.email);
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { ok: false, message: "First name, last name and email are required." },
        { status: 400 },
      );
    }

    const other = await UserModel.getUserByEmail(email);
    if (other && other.id !== row.id) {
      return NextResponse.json({ ok: false, message: "Email already in use." }, { status: 409 });
    }

    await UserModel.updateUserById(row.id, {
      fname: firstName,
      lname: lastName,
      email,
      phone: normalizeUsPhone(input.phone),
      fax: normalizeUsPhone(input.fax),
      address: strOrNull(input.address),
      city: strOrNull(input.city),
      state: strOrNull(input.state) ?? "",
      zip: strOrNull(input.zip),
      photo: strOrNull(input.photo),
    });
    const newPhoto = strOrNull(input.photo);
    if (row.photo && row.photo !== newPhoto) {
      await unlinkUserStoredPhoto(row.photo);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
