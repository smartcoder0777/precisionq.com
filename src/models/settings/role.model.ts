import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { ROLES_COLUMNS } from "@/db/schema/users-roles";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "roles";
const COLUMNS = ROLES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type RoleRecord = RowDataPacket & {
  id: number; code: string | number | null; name: string | null; description: string | null;
};
export type CreateRoleInput = Omit<RoleRecord, "id">;
export const getAllRoles = () => selectAll<RoleRecord>(TABLE_NAME, COLUMNS);
export const getRoleById = (id: number) => selectById<RoleRecord>(TABLE_NAME, COLUMNS, id);
export const createRole = (payload: CreateRoleInput) => insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type RoleUpdatePatch = Partial<CreateRoleInput>;

export async function updateRoleById(id: number, patch: RoleUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof RoleUpdatePatch;
    if (patch[key] !== undefined) entries.push([k, patch[key]!]);
  }
  if (entries.length === 0) return;
  const setClause = entries.map(([k]) => `\`${k}\` = ?`).join(", ");
  const vals = entries.map(([, v]) => v);
  await pool.execute<ResultSetHeader>(
    `UPDATE ${TABLE_NAME} SET ${setClause} WHERE id = ? LIMIT 1`,
    [...vals, id] as unknown as (string | number | null)[],
  );
}

export async function deleteRoleById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
