import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { INSURANCES_COLUMNS } from "@/db/schema/clinics-agreements";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "./_crud";

/** Provider row; logo path in `img` is usually under `public/images/insurances/` (see upload + `insuranceImageUrl`). */
const TABLE_NAME = "insurances";
const COLUMNS = INSURANCES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type InsuranceRecord = RowDataPacket & {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  fax: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: number | null;
  img: string;
};

export type CreateInsuranceInput = Omit<InsuranceRecord, "id">;
export const getAllInsurances = () => selectAll<InsuranceRecord>(TABLE_NAME, COLUMNS);
export const getInsuranceById = (id: number) => selectById<InsuranceRecord>(TABLE_NAME, COLUMNS, id);
export const createInsurance = (payload: CreateInsuranceInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type InsuranceUpdatePatch = Partial<{
  name: string | null;
  email: string | null;
  phone: string | null;
  fax: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: number | null;
  img: string;
}>;

export async function updateInsuranceById(id: number, patch: InsuranceUpdatePatch): Promise<void> {
  const pool = getPool();
  const allowed = [
    "name",
    "email",
    "phone",
    "fax",
    "address",
    "city",
    "state",
    "zip",
    "status",
    "img",
  ] as const satisfies readonly (keyof InsuranceUpdatePatch)[];
  const entries = allowed.filter(k => patch[k] !== undefined).map(k => [k, patch[k]!] as const);
  if (entries.length === 0) return;
  const setClause = entries.map(([k]) => `\`${k}\` = ?`).join(", ");
  const vals = entries.map(([, v]) => v);
  await pool.execute<ResultSetHeader>(
    `UPDATE ${TABLE_NAME} SET ${setClause} WHERE id = ? LIMIT 1`,
    [...vals, id] as unknown as (string | number | null)[],
  );
}

export async function deleteInsuranceById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
