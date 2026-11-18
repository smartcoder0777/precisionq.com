import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { TICKET_TYPES_COLUMNS } from "@/db/schema/tickets-contact";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "ticket_types";
const COLUMNS = TICKET_TYPES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type TicketTypeRecord = RowDataPacket & {
  id: number;
  name: string | null;
  description: string | null;
  status: number | null;
  sort_order: number | null;
};

export type CreateTicketTypeInput = Omit<TicketTypeRecord, "id">;
export type TicketTypeUpdatePatch = Partial<CreateTicketTypeInput>;

const DEFAULT_TYPES: { id: number; name: string; sort_order: number }[] = [
  { id: 1, name: "General", sort_order: 1 },
  { id: 2, name: "Billing", sort_order: 2 },
  { id: 3, name: "Appointment", sort_order: 3 },
  { id: 4, name: "Insurance", sort_order: 4 },
  { id: 5, name: "Prescription", sort_order: 5 },
  { id: 6, name: "Complaint", sort_order: 6 },
  { id: 7, name: "Technical", sort_order: 7 },
];

let ensurePromise: Promise<void> | null = null;

/** Create `ticket_types` if missing and seed the legacy 1–7 codes. */
export async function ensureTicketTypesReady(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const pool = getPool();
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`name\` VARCHAR(255) NULL,
          \`description\` TEXT NULL,
          \`status\` INT NULL DEFAULT 1,
          \`sort_order\` INT NULL DEFAULT 0,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      const [countRows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\``,
      );
      const count = Number(countRows[0]?.c ?? 0);
      if (count > 0) return;

      for (const row of DEFAULT_TYPES) {
        await pool.execute<ResultSetHeader>(
          `INSERT IGNORE INTO \`${TABLE_NAME}\` (\`id\`, \`name\`, \`description\`, \`status\`, \`sort_order\`)
           VALUES (?, ?, NULL, 1, ?)`,
          [row.id, row.name, row.sort_order],
        );
      }
    })().catch((e) => {
      ensurePromise = null;
      throw e;
    });
  }
  await ensurePromise;
}

export async function getAllTicketTypes(): Promise<TicketTypeRecord[]> {
  await ensureTicketTypesReady();
  return selectAll<TicketTypeRecord>(TABLE_NAME, COLUMNS);
}

export async function getActiveTicketTypes(): Promise<TicketTypeRecord[]> {
  await ensureTicketTypesReady();
  const pool = getPool();
  const list = COLUMNS.map((c) => `\`${c}\``).join(", ");
  const [rows] = await pool.execute<TicketTypeRecord[]>(
    `SELECT ${list} FROM \`${TABLE_NAME}\`
     WHERE \`status\` = 1 OR \`status\` IS NULL
     ORDER BY COALESCE(\`sort_order\`, 0) ASC, \`name\` ASC, \`id\` ASC`,
  );
  return rows;
}

export const getTicketTypeById = async (id: number) => {
  await ensureTicketTypesReady();
  return selectById<TicketTypeRecord>(TABLE_NAME, COLUMNS, id);
};

export async function createTicketType(payload: CreateTicketTypeInput): Promise<number> {
  await ensureTicketTypesReady();
  return insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);
}

export async function updateTicketTypeById(id: number, patch: TicketTypeUpdatePatch): Promise<void> {
  await ensureTicketTypesReady();
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof TicketTypeUpdatePatch;
    if (patch[key] !== undefined) entries.push([k, patch[key]!]);
  }
  if (entries.length === 0) return;
  const setClause = entries.map(([k]) => `\`${k}\` = ?`).join(", ");
  const vals = entries.map(([, v]) => v);
  await pool.execute<ResultSetHeader>(
    `UPDATE \`${TABLE_NAME}\` SET ${setClause} WHERE id = ? LIMIT 1`,
    [...vals, id] as unknown as (string | number | null)[],
  );
}

export async function deleteTicketTypeById(id: number): Promise<void> {
  await ensureTicketTypesReady();
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM \`${TABLE_NAME}\` WHERE id = ? LIMIT 1`, [id]);
}
