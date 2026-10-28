import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { SECURITY_QUESTIONS_COLUMNS } from "@/db/schema/users-roles";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "security_questions";
const COLUMNS = SECURITY_QUESTIONS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type SecurityQuestionRecord = RowDataPacket & {
  id: number; question: string | null; status: number | null;
};
export type CreateSecurityQuestionInput = Omit<SecurityQuestionRecord, "id">;
export const getAllSecurityQuestions = () => selectAll<SecurityQuestionRecord>(TABLE_NAME, COLUMNS);
export const getSecurityQuestionById = (id: number) =>
  selectById<SecurityQuestionRecord>(TABLE_NAME, COLUMNS, id);
export const createSecurityQuestion = (payload: CreateSecurityQuestionInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type SecurityQuestionUpdatePatch = Partial<CreateSecurityQuestionInput>;

export async function updateSecurityQuestionById(id: number, patch: SecurityQuestionUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof SecurityQuestionUpdatePatch;
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

export async function deleteSecurityQuestionById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
