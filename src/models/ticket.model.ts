import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { TICKETS_COLUMNS } from "@/db/schema/tickets-contact";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "tickets";
const COLUMNS = TICKETS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((column) => column !== "id" && column !== "createdAt");

export type TicketRecord = RowDataPacket & {
  id: number;
  user_id: number | null;
  clinic_id: number | null;
  type: number | null;
  reason: string | null;
  message: string | null;
  assigned_to: number | null;
  backup_assigned: number | null;
  priority: number | null;
  status: number | null;
  createdAt: string | Date | null;
};

export type CreateTicketInput = Omit<TicketRecord, "id" | "createdAt"> & { createdAt?: string | Date | null };
export const getAllTickets = () => selectAll<TicketRecord>(TABLE_NAME, COLUMNS);
export const getTicketById = (id: number) => selectById<TicketRecord>(TABLE_NAME, COLUMNS, id);
export const createTicket = (payload: CreateTicketInput) => insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

/** `tickets` row with joined display fields from `clinics` and `users`. */
export type TicketListRecord = TicketRecord & {
  clinic_name: string | null;
  assignee_name: string | null;
  backup_name: string | null;
  creator_name: string | null;
};

/**
 * Tickets for admin list: clinic, assignees, creator (`user_id` → users), `createdAt`.
 * Assumes `tickets.clinic_id` references `clinics.id`.
 */
export async function getTicketsForListView(limit = 10_000): Promise<TicketListRecord[]> {
  const pool = getPool();
  const cols = COLUMNS.map((c) => (c === "createdAt" ? "t.`createdAt`" : `t.${c}`)).join(", ");
  const sql = `
SELECT
  ${cols},
  c.name AS clinic_name,
  TRIM(CONCAT(COALESCE(u1.fname, ''), ' ', COALESCE(u1.lname, ''))) AS assignee_name,
  TRIM(CONCAT(COALESCE(u2.fname, ''), ' ', COALESCE(u2.lname, ''))) AS backup_name,
  TRIM(CONCAT(COALESCE(uc.fname, ''), ' ', COALESCE(uc.lname, ''))) AS creator_name
FROM ${TABLE_NAME} t
LEFT JOIN clinics c ON c.id = t.clinic_id
LEFT JOIN users u1 ON u1.id = t.assigned_to
LEFT JOIN users u2 ON u2.id = t.backup_assigned
LEFT JOIN users uc ON uc.id = t.user_id
ORDER BY t.id DESC
LIMIT ?
`;
  const [rows] = await pool.execute<TicketListRecord[]>(sql, [limit]);
  return rows;
}

export type NewTicketRow = {
  user_id: number;
  clinic_id: number | null;
  type: number | null;
  reason: string | null;
  message: string | null;
  assigned_to: number | null;
  backup_assigned: number | null;
  priority: number | null;
  status: number | null;
};

export async function insertTicketRow(row: NewTicketRow): Promise<number> {
  const pool = getPool();
  const cols = [
    "user_id",
    "clinic_id",
    "type",
    "reason",
    "message",
    "assigned_to",
    "backup_assigned",
    "priority",
    "status",
  ] as const;
  const ph = cols.map(() => "?").join(", ");
  const vals = cols.map((c) => row[c]);
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO ${TABLE_NAME} (${cols.join(",")}) VALUES (${ph})`,
    vals as unknown as (string | number | null)[],
  );
  return result.insertId;
}

export type TicketUpdatePatch = Partial<{
  clinic_id: number | null;
  type: number | null;
  reason: string | null;
  message: string | null;
  assigned_to: number | null;
  backup_assigned: number | null;
  priority: number | null;
  status: number | null;
}>;

export async function updateTicketById(id: number, patch: TicketUpdatePatch): Promise<void> {
  const pool = getPool();
  const allowed = [
    "clinic_id",
    "type",
    "reason",
    "message",
    "assigned_to",
    "backup_assigned",
    "priority",
    "status",
  ] as const satisfies readonly (keyof TicketUpdatePatch)[];
  const entries = allowed.filter((k) => patch[k] !== undefined).map((k) => [k, patch[k]!] as const);
  if (entries.length === 0) return;
  const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
  const vals = entries.map(([, v]) => v);
  await pool.execute<ResultSetHeader>(
    `UPDATE ${TABLE_NAME} SET ${setClause} WHERE id = ? LIMIT 1`,
    [...vals, id] as unknown as (string | number | null)[],
  );
}

export async function deleteTicketById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
