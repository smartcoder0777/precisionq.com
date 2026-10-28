/**
 * Model: data and persistence for health checks (no HTTP).
 */
import type { RowDataPacket } from "mysql2";
import { getPool, isMysqlConfigured } from "@/lib/db";

export function isDatabaseConfigured(): boolean {
  return isMysqlConfigured();
}

export type DatabasePingResult =
  | { success: true; ping: boolean }
  | { success: false; code: "not_configured" }
  | { success: false; code: "error"; message: string };

export async function pingDatabase(): Promise<DatabasePingResult> {
  if (!isMysqlConfigured()) {
    return { success: false, code: "not_configured" };
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT 1 AS ok");
    const row = rows[0] as { ok: number } | undefined;
    return { success: true, ping: row?.ok === 1 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, code: "error", message };
  }
}
