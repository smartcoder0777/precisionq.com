import type { UserRecord } from "@/types/users-page";
import type { UserDbRecord } from "@/models/user.model";
import { formatUsPhoneDisplay } from "@/lib/phone-format";

export function parseClinicIdsCsv(csv: string | null | undefined): string[] {
  if (csv == null || String(csv).trim() === "") return [];
  return String(csv)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .filter(id => Number.isFinite(Number(id)) && Number(id) > 0);
}

export function clinicIdsToCsv(ids: string[]): string | null {
  const nums = ids.map(s => Number(String(s).trim())).filter(n => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return null;
  return [...new Set(nums)].join(",");
}

export function userDbToTableRow(
  row: UserDbRecord,
  roleById: Map<number, { name: string; description: string | null }>,
): UserRecord {
  const role = roleById.get(row.role_id);
  const roleName = (role?.name ?? "").trim() || `Role #${row.role_id}`;
  const permission = (role?.description ?? "").trim() || "—";
  return {
    id: String(row.id),
    firstName: row.fname ?? "",
    lastName: row.lname ?? "",
    email: row.email,
    address: row.address ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    zip: row.zip ?? "",
    phone: formatUsPhoneDisplay(row.phone, ""),
    fax: formatUsPhoneDisplay(row.fax, ""),
    roleId: String(row.role_id),
    roleName,
    permission,
    clinicIds: parseClinicIdsCsv(row.clinics),
    photo: row.photo ?? "",
  };
}

export function clinicLabelMap(options: { id: number; name: string }[]): Map<number, string> {
  return new Map(options.map(o => [o.id, (o.name ?? "").trim() || `Clinic #${o.id}`]));
}
