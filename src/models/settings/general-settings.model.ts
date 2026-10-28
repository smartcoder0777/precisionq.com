import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { GENERAL_SETTINGS_COLUMNS } from "@/db/schema/settings-ref";
import { getPool } from "@/lib/db";

const TABLE_NAME = "general_settings";

const GENERAL_SETTINGS_COL_SQL = GENERAL_SETTINGS_COLUMNS.join(", ");
const GENERAL_SETTINGS_INSERT_COLUMNS = GENERAL_SETTINGS_COLUMNS.filter((c) => c !== "id");
const GENERAL_SETTINGS_INSERT_SQL = GENERAL_SETTINGS_INSERT_COLUMNS.join(", ");
const GENERAL_SETTINGS_INSERT_PH = GENERAL_SETTINGS_INSERT_COLUMNS.map(() => "?").join(", ");

export type GeneralSettingsRecord = RowDataPacket & {
  id: number;
  session_ttl_seconds: number | null;
  theme_mode: string | null;
  sidebar_color: string | null;
  alert_position: string | null;
};

export type GeneralSettingsUpdate = {
  session_ttl_seconds: number;
  theme_mode: string;
  sidebar_color: string;
  alert_position: string;
};

export async function getGeneralSettingsRow(): Promise<GeneralSettingsRecord | null> {
  const pool = getPool();
  const [rows] = await pool.execute<GeneralSettingsRecord[]>(
    `SELECT ${GENERAL_SETTINGS_COL_SQL}
     FROM ${TABLE_NAME}
     ORDER BY id ASC
     LIMIT 1`,
  );
  return rows[0] ?? null;
}

export async function upsertGeneralSettingsRow(input: GeneralSettingsUpdate): Promise<void> {
  const pool = getPool();
  const existing = await getGeneralSettingsRow();
  if (!existing) {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO ${TABLE_NAME}
       (${GENERAL_SETTINGS_INSERT_SQL})
       VALUES (${GENERAL_SETTINGS_INSERT_PH})`,
      [input.session_ttl_seconds, input.theme_mode, input.sidebar_color, input.alert_position],
    );
    return;
  }
  await pool.execute<ResultSetHeader>(
    `UPDATE ${TABLE_NAME}
     SET session_ttl_seconds = ?, theme_mode = ?, sidebar_color = ?, alert_position = ?
     WHERE id = ?
     LIMIT 1`,
    [input.session_ttl_seconds, input.theme_mode, input.sidebar_color, input.alert_position, existing.id],
  );
}
