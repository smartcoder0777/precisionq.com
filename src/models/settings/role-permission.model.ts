import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { ROLE_PERMISSIONS_COLUMNS } from "@/db/schema/users-roles";
import { getPool } from "@/lib/db";

const TABLE_NAME = "role_permissions";
const COLUMNS = ROLE_PERMISSIONS_COLUMNS as unknown as readonly string[];

export type RolePermissionRecord = RowDataPacket & {
  id: number; role_id: number | null; page_key: string | null; action_key: string | null; value: number | null;
};

export type RolePermissionUpsertInput = {
  role_id: number;
  page_key: string;
  action_key: string;
  value: 0 | 1;
};

export async function getRolePermissionsByRoleIds(roleIds: number[]): Promise<RolePermissionRecord[]> {
  if (roleIds.length === 0) return [];
  const pool = getPool();
  const placeholders = roleIds.map(() => "?").join(", ");
  const [rows] = await pool.query<RolePermissionRecord[]>(
    `SELECT ${COLUMNS.join(", ")} FROM ${TABLE_NAME} WHERE role_id IN (${placeholders})`,
    roleIds,
  );
  return rows;
}

export async function replaceRolePermissions(roleId: number, rows: RolePermissionUpsertInput[]): Promise<void> {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE role_id = ?`, [roleId]);
    if (rows.length > 0) {
      const placeholders = rows.map(() => "(?, ?, ?, ?)").join(", ");
      const vals = rows.flatMap((r) => [r.role_id, r.page_key, r.action_key, r.value]);
      await conn.execute<ResultSetHeader>(
        `INSERT INTO ${TABLE_NAME} (role_id, page_key, action_key, value) VALUES ${placeholders}`,
        vals,
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function hasRolePermission(roleId: number, pageKey: string, actionKey: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RolePermissionRecord[]>(
    `SELECT ${COLUMNS.join(", ")}
     FROM ${TABLE_NAME}
     WHERE role_id = ?
       AND value = 1`,
    [roleId],
  );

  const normalize = (v: string) => String(v).toLowerCase().replace(/[\s_-]+/g, "-");
  const wantedPage = normalize(pageKey);
  const wantedAction = normalize(actionKey);

  const actionAliases = new Map<string, string>([
    ["update", "edit"],
    ["modify", "edit"],
    ["remove", "delete"],
    ["read", "view"],
  ]);

  const canonAction = (v: string) => actionAliases.get(normalize(v)) ?? normalize(v);

  return rows.some((r) => {
    const rowPage = normalize(String(r.page_key ?? ""));
    const rowAction = canonAction(String(r.action_key ?? ""));
    return rowPage === wantedPage && rowAction === canonAction(wantedAction);
  });
}

export async function getRolePermissionMapByRoleId(roleId: number): Promise<Record<string, string[]>> {
  const pool = getPool();
  const [rows] = await pool.execute<RolePermissionRecord[]>(
    `SELECT ${COLUMNS.join(", ")}
     FROM ${TABLE_NAME}
     WHERE role_id = ?
       AND value = 1`,
    [roleId],
  );

  const normalize = (v: string) => String(v).toLowerCase().replace(/[\s_-]+/g, "-");
  const actionAliases = new Map<string, string>([
    ["update", "edit"],
    ["modify", "edit"],
    ["remove", "delete"],
    ["read", "view"],
  ]);
  const canonAction = (v: string) => actionAliases.get(normalize(v)) ?? normalize(v);

  const out: Record<string, string[]> = {};
  for (const r of rows) {
    const pageKey = normalize(String(r.page_key ?? ""));
    const actionKey = canonAction(String(r.action_key ?? ""));
    if (!pageKey || !actionKey) continue;
    const curr = out[pageKey] ?? [];
    if (!curr.includes(actionKey)) curr.push(actionKey);
    out[pageKey] = curr;
  }
  return out;
}
