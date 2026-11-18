import "server-only";

import type { AuthSession } from "@/lib/auth-session";
import { getRoleById } from "@/models/settings/role.model";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

/** Roles that may see every ticket (not only their own assignments). */
export function isElevatedTicketRoleName(nameOrCode: string | null | undefined): boolean {
  const raw = String(nameOrCode ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  if (!raw) return false;
  return (
    raw.includes("super admin") ||
    raw === "admin" ||
    raw.startsWith("admin ") ||
    raw.endsWith(" admin") ||
    raw.includes("administrator") ||
    raw.includes("manager")
  );
}

export async function canViewAllTickets(session: AuthSession): Promise<boolean> {
  if (!session.roleId) return false;
  const role = await getRoleById(session.roleId);
  if (!role) return false;
  return isElevatedTicketRoleName(role.name) || isElevatedTicketRoleName(role.code != null ? String(role.code) : null);
}

export function ticketVisibleToUser(
  ticket: { assigned_to?: number | null; backup_assigned?: number | null },
  userId: number,
): boolean {
  return ticket.assigned_to === userId || ticket.backup_assigned === userId;
}

export type AdminRecipient = { id: number; email: string; firstName: string; label: string };

/** Active users whose role is Admin / Super Admin / Manager (for report CC). */
export async function listTicketAdminRecipients(): Promise<AdminRecipient[]> {
  const pool = getPool();
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      email: string | null;
      fname: string | null;
      lname: string | null;
      role_name: string | null;
      role_code: string | null;
    })[]
  >(
    `SELECT u.id, u.email, u.fname, u.lname, r.name AS role_name, r.code AS role_code
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE (u.status = 1 OR u.status IS NULL)`,
  );

  const out: AdminRecipient[] = [];
  for (const row of rows) {
    const email = row.email?.trim();
    if (!email) continue;
    if (!isElevatedTicketRoleName(row.role_name) && !isElevatedTicketRoleName(row.role_code != null ? String(row.role_code) : null)) {
      continue;
    }
    const label = [row.fname, row.lname].filter(Boolean).join(" ").trim() || email;
    out.push({
      id: row.id,
      email,
      firstName: (row.fname ?? "").trim() || label.split(/\s+/)[0] || "Admin",
      label,
    });
  }
  return out;
}
