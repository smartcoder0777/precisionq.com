import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { USERS_COLUMNS_CRUD } from "@/db/schema/users-roles";
import { getPool } from "@/lib/db";

const TABLE_NAME = "users";

const COLUMNS = USERS_COLUMNS_CRUD as unknown as readonly string[];

export const USER_INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id") as readonly Exclude<
  (typeof USERS_COLUMNS_CRUD)[number],
  "id"
>[];

function qIdent(name: string): string {
  return `\`${String(name).replace(/`/g, "")}\``;
}

export type UserDbRecord = RowDataPacket & {
  id: number;
  fname: string | null;
  lname: string | null;
  email: string;
  phone: string | null;
  fax: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  role_id: number;
  password: string;
  status: number;
  resetToken: string | null;
  resetTokenExpiry: string | null;
  clinics: string | null;
  photo: string | null;
};

export type CreateUserInput = Omit<UserDbRecord, "id">;

export type UserUpdateInput = Partial<
  Omit<CreateUserInput, "password"> & { password?: string | null }
>;

let usersPhotoColumnState: "unknown" | "present" | "missing" = "unknown";

async function hasUsersPhotoColumn(): Promise<boolean> {
  if (usersPhotoColumnState === "present") return true;
  if (usersPhotoColumnState === "missing") return false;
  const pool = getPool();
  try {
    const [rows] = await pool.execute<(RowDataPacket & { cnt: number })[]>(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [TABLE_NAME, "photo"],
    );
    const ok = Number(rows[0]?.cnt ?? 0) > 0;
    usersPhotoColumnState = ok ? "present" : "missing";
    return ok;
  } catch {
    usersPhotoColumnState = "missing";
    return false;
  }
}

export async function getAllUsers(): Promise<UserDbRecord[]> {
  const pool = getPool();
  const hasPhoto = await hasUsersPhotoColumn();
  const list = [...COLUMNS.map(qIdent), hasPhoto ? qIdent("photo") : "NULL AS `photo`"].join(", ");
  const [rows] = await pool.execute<UserDbRecord[]>(
    `SELECT ${list} FROM ${qIdent(TABLE_NAME)} ORDER BY ${qIdent("id")} ASC`,
  );
  return rows;
}

export async function getUserById(id: number): Promise<UserDbRecord | null> {
  const pool = getPool();
  const hasPhoto = await hasUsersPhotoColumn();
  const list = [...COLUMNS.map(qIdent), hasPhoto ? qIdent("photo") : "NULL AS `photo`"].join(", ");
  const [rows] = await pool.execute<UserDbRecord[]>(
    `SELECT ${list} FROM ${qIdent(TABLE_NAME)} WHERE ${qIdent("id")} = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<UserDbRecord | null> {
  const pool = getPool();
  /**
   * Login path only needs core identity/auth fields.
   * Keep this query resilient across DB variants where optional columns
   * (e.g. resetToken/resetTokenExpiry/clinics) may not exist.
   */
  const list = [
    qIdent("id"),
    qIdent("fname"),
    qIdent("lname"),
    qIdent("email"),
    qIdent("phone"),
    qIdent("fax"),
    qIdent("address"),
    qIdent("city"),
    qIdent("state"),
    qIdent("zip"),
    qIdent("role_id"),
    qIdent("password"),
    qIdent("status"),
    "NULL AS `resetToken`",
    "NULL AS `resetTokenExpiry`",
    "NULL AS `clinics`",
    "NULL AS `photo`",
  ].join(", ");
  const [rows] = await pool.execute<UserDbRecord[]>(
    `SELECT ${list} FROM ${qIdent(TABLE_NAME)} WHERE ${qIdent("email")} = ? LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function createUser(payload: CreateUserInput): Promise<number> {
  const pool = getPool();
  const cols = USER_INSERT_COLUMNS.map(qIdent).join(", ");
  const ph = USER_INSERT_COLUMNS.map(() => "?").join(", ");
  const vals = USER_INSERT_COLUMNS.map(c => payload[c as keyof CreateUserInput]);
  const [result] = await pool.execute<ResultSetHeader & { insertId: number }>(
    `INSERT INTO ${qIdent(TABLE_NAME)} (${cols}) VALUES (${ph})`,
    vals as unknown as (string | number | null)[],
  );
  return result.insertId;
}

export async function updateUserById(id: number, patch: UserUpdateInput): Promise<void> {
  const hasPhoto = await hasUsersPhotoColumn();
  const keys = Object.keys(patch)
    .filter(k => patch[k as keyof UserUpdateInput] !== undefined)
    .filter(k => (k === "photo" ? hasPhoto : true)) as (keyof UserUpdateInput)[];
  if (keys.length === 0) return;
  const pool = getPool();
  const setClause = keys.map(k => `${qIdent(String(k))} = ?`).join(", ");
  const vals = keys.map(k => patch[k]);
  await pool.execute<ResultSetHeader>(
    `UPDATE ${qIdent(TABLE_NAME)} SET ${setClause} WHERE ${qIdent("id")} = ? LIMIT 1`,
    [...vals, id] as unknown as (string | number | null)[],
  );
}

export async function deleteUserById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${qIdent(TABLE_NAME)} WHERE ${qIdent("id")} = ? LIMIT 1`, [id]);
}

export type UserTicketSelectOption = { id: number; label: string };

type UserSelectRow = RowDataPacket & { id: number; fname: string | null; lname: string | null };

export async function listUsersForTicketSelect(): Promise<UserTicketSelectOption[]> {
  const pool = getPool();
  const [rows] = await pool.execute<UserSelectRow[]>(
    `SELECT ${qIdent("id")}, ${qIdent("fname")}, ${qIdent("lname")} FROM ${qIdent(TABLE_NAME)} WHERE ${qIdent("status")} = 1 ORDER BY ${qIdent("lname")} ASC, ${qIdent("fname")} ASC`,
  );
  return rows.map(r => {
    const label = [r.fname, r.lname].filter(Boolean).join(" ").trim();
    return { id: r.id, label: label || `User #${r.id}` };
  });
}

export type SurveyRecipientRow = RowDataPacket & {
  id: number;
  fname: string | null;
  lname: string | null;
  email: string;
  phone: string | null;
};

export async function listSurveyRecipientsPaged(input: {
  query?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: SurveyRecipientRow[]; total: number }> {
  const pool = getPool();
  const page = Math.max(1, Number(input.page) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(input.pageSize) || 20));
  const offset = (page - 1) * pageSize;
  const q = (input.query ?? "").trim();

  const where =
    q.length > 0
      ? `WHERE ${qIdent("status")} = 1 AND (
          CONCAT(COALESCE(${qIdent("fname")}, ''), ' ', COALESCE(${qIdent("lname")}, '')) LIKE ?
          OR ${qIdent("email")} LIKE ?
          OR COALESCE(${qIdent("phone")}, '') LIKE ?
        )`
      : `WHERE ${qIdent("status")} = 1`;

  const params = q.length > 0 ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];

  const [countRows] = await pool.execute<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total FROM ${qIdent(TABLE_NAME)} ${where}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await pool.execute<SurveyRecipientRow[]>(
    `SELECT ${qIdent("id")}, ${qIdent("fname")}, ${qIdent("lname")}, ${qIdent("email")}, ${qIdent("phone")}
     FROM ${qIdent(TABLE_NAME)}
     ${where}
     ORDER BY ${qIdent("id")} DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );

  return { rows, total };
}
