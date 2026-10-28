import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { USER_SECURITIES_COLUMNS } from "@/db/schema/users-roles";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "user_securities";
const COLUMNS = USER_SECURITIES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type UserSecurityRecord = RowDataPacket & {
  id: number; user_id: number | null; question_id: number | null; answer: string | null;
};
export type CreateUserSecurityInput = Omit<UserSecurityRecord, "id">;
export const getAllUserSecurities = () => selectAll<UserSecurityRecord>(TABLE_NAME, COLUMNS);
export const getUserSecurityById = (id: number) => selectById<UserSecurityRecord>(TABLE_NAME, COLUMNS, id);
export const createUserSecurity = (payload: CreateUserSecurityInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export async function getUserSecurityByUserId(
  userId: number,
): Promise<UserSecurityRecord[]> {
  const [rows] = await getPool().execute<UserSecurityRecord[]>(
    `SELECT ${COLUMNS.join(", ")}
     FROM ${TABLE_NAME}
     WHERE user_id = ?`,
    [userId],
  );
  return rows;
}

export async function getUserSecurityByUserAndQuestion(
  userId: number,
  questionId: number,
): Promise<UserSecurityRecord | null> {
  const [rows] = await getPool().execute<UserSecurityRecord[]>(
    `SELECT ${COLUMNS.join(", ")}
     FROM ${TABLE_NAME}
     WHERE user_id = ? AND question_id = ?
     LIMIT 1`,
    [userId, questionId],
  );
  return rows[0] ?? null;
}

export async function deleteUserSecuritiesByUserId(userId: number): Promise<void> {
  await getPool().execute(`DELETE FROM ${TABLE_NAME} WHERE user_id = ?`, [userId]);
}

export async function updateUserSecurityAnswerById(id: number, answerHash: string): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(
    `UPDATE ${TABLE_NAME} SET answer = ? WHERE id = ? LIMIT 1`,
    [answerHash, id],
  );
}

/**
 * Inserts a new `(user_id, question_id)` answer row, or updates `answer` if that question was already set for the user.
 * Other questions for the same user are left unchanged so login can pick among all stored answers.
 */
export async function upsertUserSecurityAnswer(params: {
  userId: number;
  questionId: number;
  answerHash: string;
}): Promise<void> {
  const existing = await getUserSecurityByUserAndQuestion(params.userId, params.questionId);
  if (existing?.id != null) {
    await updateUserSecurityAnswerById(existing.id, params.answerHash);
    return;
  }
  await createUserSecurity({
    user_id: params.userId,
    question_id: params.questionId,
    answer: params.answerHash,
  });
}
