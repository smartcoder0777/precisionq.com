import "server-only";

import { getAuthSession } from "@/lib/auth-session";
import { getUserById } from "@/models/user.model";
import { getRoleById } from "@/models/settings/role.model";
import { formatUsPhoneDisplay } from "@/lib/phone-format";

export type ProfilePagePayload = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fax: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  roleName: string;
  photo: string;
};

export async function loadProfilePagePayload(): Promise<ProfilePagePayload | null> {
  const session = await getAuthSession();
  if (!session) return null;
  const row = await getUserById(session.userId);
  if (!row) return null;
  const role = row.role_id ? await getRoleById(row.role_id) : null;
  return {
    id: row.id,
    firstName: String(row.fname ?? ""),
    lastName: String(row.lname ?? ""),
    email: String(row.email ?? ""),
    phone: formatUsPhoneDisplay(row.phone, ""),
    fax: formatUsPhoneDisplay(row.fax, ""),
    address: String(row.address ?? ""),
    city: String(row.city ?? ""),
    state: String(row.state ?? ""),
    zip: String(row.zip ?? ""),
    roleName: String(role?.name ?? "User"),
    photo: String(row.photo ?? ""),
  };
}
