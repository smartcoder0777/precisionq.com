import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { CONTACT_TRACKS_COLUMNS } from "@/db/schema/tickets-contact";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "contact_tracks";
const COLUMNS = CONTACT_TRACKS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((column) => column !== "id");

/** mysql2 may return JS `Date` for DATE/DATETIME columns. */
export type ContactTrackRecord = RowDataPacket & {
  id: number;
  case_number: number | null;
  clinic: string | null;
  type: number | null;
  reason: string | null;
  name: string | null;
  dob: string | Date | null;
  email: string | null;
  cel: string | null;
  subject: string | null;
  message: string | null;
  date: string | Date | null;
  assign: string | null;
  status: number | null;
  priority: number | null;
  lang: string | null;
  besttime: string | Date | null;
};

export type CreateContactTrackInput = Omit<ContactTrackRecord, "id">;
export const getAllContactTracks = () => selectAll<ContactTrackRecord>(TABLE_NAME, COLUMNS);
export const getContactTrackById = (id: number) => selectById<ContactTrackRecord>(TABLE_NAME, COLUMNS, id);
export const createContactTrack = (payload: CreateContactTrackInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

/** Latest contact tracks for dashboard (newest first). */
export async function getContactTracksOrdered(limit = 500): Promise<ContactTrackRecord[]> {
  const pool = getPool();
  const [rows] = await pool.execute<ContactTrackRecord[]>(
    `SELECT ${COLUMNS.join(", ")} FROM ${TABLE_NAME} ORDER BY id DESC LIMIT ?`,
    [limit],
  );
  return rows;
}

/** Row from dashboard query: `contact_tracks` plus best-matched `clinics` name/acronym. */
export type ContactTrackWithResolvedClinic = ContactTrackRecord & {
  resolved_clinic_name: string | null;
  resolved_clinic_acronym: string | null;
};

/**
 * Contact tracks for dashboard with clinic resolved in SQL (prefix/exact name, id, or `type` FK).
 * Example: `contact_tracks.clinic` = "GENERAL MEDICAL" matches `clinics.name` "GENERAL MEDICAL SERVICES OF QUEENS"
 * via `name LIKE CONCAT(TRIM(clinic), '%')`, preferring the longest matching name.
 */
export async function getContactTracksForDashboard(limit = 500): Promise<ContactTrackWithResolvedClinic[]> {
  const pool = getPool();
  const ctCols = COLUMNS.map((c) => `ct.${c}`).join(", ");
  const sql = `
SELECT
  ${ctCols},
  c.name AS resolved_clinic_name,
  c.acronym AS resolved_clinic_acronym
FROM ${TABLE_NAME} ct
LEFT JOIN clinics c ON c.id = (
  SELECT c2.id
  FROM clinics c2
  WHERE
    (
      TRIM(COALESCE(ct.clinic, '')) REGEXP '^[0-9]+$'
      AND (
        c2.id = CAST(TRIM(ct.clinic) AS UNSIGNED)
        OR c2.clinic_id = CAST(TRIM(ct.clinic) AS UNSIGNED)
      )
    )
    OR (
      ct.type IS NOT NULL
      AND (c2.id = ct.type OR c2.clinic_id = ct.type)
    )
    OR (
      TRIM(COALESCE(ct.clinic, '')) <> ''
      AND TRIM(ct.clinic) NOT REGEXP '^[0-9]+$'
      AND (
        UPPER(TRIM(c2.name)) LIKE CONCAT(UPPER(TRIM(ct.clinic)), '%')
        OR UPPER(TRIM(ct.clinic)) = UPPER(TRIM(c2.name))
      )
    )
  ORDER BY
    CASE
      WHEN TRIM(COALESCE(ct.clinic, '')) REGEXP '^[0-9]+$'
        AND (
          c2.id = CAST(TRIM(ct.clinic) AS UNSIGNED)
          OR c2.clinic_id = CAST(TRIM(ct.clinic) AS UNSIGNED)
        )
        THEN 300
      WHEN ct.type IS NOT NULL AND (c2.id = ct.type OR c2.clinic_id = ct.type) THEN 200
      WHEN TRIM(COALESCE(ct.clinic, '')) <> ''
        AND TRIM(ct.clinic) NOT REGEXP '^[0-9]+$'
        AND UPPER(TRIM(ct.clinic)) = UPPER(TRIM(c2.name)) THEN 150
      WHEN TRIM(COALESCE(ct.clinic, '')) <> ''
        AND TRIM(ct.clinic) NOT REGEXP '^[0-9]+$'
        AND UPPER(TRIM(c2.name)) LIKE CONCAT(UPPER(TRIM(ct.clinic)), '%') THEN 100
      ELSE 0
    END DESC,
    CHAR_LENGTH(TRIM(c2.name)) DESC,
    c2.id DESC
  LIMIT 1
)
ORDER BY ct.id DESC
LIMIT ?
`;
  const [rows] = await pool.execute<ContactTrackWithResolvedClinic[]>(sql, [limit]);
  return rows;
}

export async function deleteContactTrackById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}

export type ContactTrackPatch = Partial<{
  case_number: number | null;
  clinic: string | null;
  type: number | null;
  reason: string | null;
  name: string | null;
  dob: string | Date | null;
  email: string | null;
  cel: string | null;
  subject: string | null;
  message: string | null;
  date: string | Date | null;
  assign: string | null;
  status: number | null;
  priority: number | null;
  lang: string | null;
  besttime: string | Date | null;
}>;

const PATCHABLE_COLUMNS = COLUMNS.filter((c) => c !== "id") as ReadonlyArray<keyof ContactTrackPatch>;

export async function updateContactTrackById(id: number, patch: ContactTrackPatch): Promise<void> {
  const pool = getPool();
  const entries = PATCHABLE_COLUMNS
    .filter((k) => patch[k] !== undefined)
    .map((k) => [k, patch[k]!] as const);
  if (entries.length === 0) return;
  const setClause = entries.map(([k]) => `\`${k}\` = ?`).join(", ");
  const vals = entries.map(([, v]) => v);
  await pool.execute<ResultSetHeader>(
    `UPDATE ${TABLE_NAME} SET ${setClause} WHERE id = ? LIMIT 1`,
    [...vals, id] as unknown as (string | number | Date | null)[],
  );
}

export async function getContactTrackByCaseNumber(caseNumber: number): Promise<ContactTrackRecord | null> {
  const pool = getPool();
  const [rows] = await pool.execute<ContactTrackRecord[]>(
    `SELECT ${COLUMNS.join(", ")} FROM ${TABLE_NAME} WHERE case_number = ? ORDER BY id DESC LIMIT 1`,
    [caseNumber],
  );
  return rows[0] ?? null;
}

export async function updateContactTrackByCaseNumber(caseNumber: number, patch: ContactTrackPatch): Promise<void> {
  const row = await getContactTrackByCaseNumber(caseNumber);
  if (!row) return;
  await updateContactTrackById(row.id, patch);
}

export async function deleteContactTrackByCaseNumber(caseNumber: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE case_number = ?`, [caseNumber]);
}
