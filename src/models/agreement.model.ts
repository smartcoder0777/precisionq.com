import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { AGREEMENTS_COLUMNS } from "@/db/schema/clinics-agreements";
import { getPool } from "@/lib/db";

const TABLE_NAME = "agreements";

const COLUMNS = AGREEMENTS_COLUMNS as unknown as readonly string[];

export const AGREEMENT_INSERT_COLUMNS = COLUMNS.filter(
  (c): c is Exclude<(typeof AGREEMENTS_COLUMNS)[number], "id"> => c !== "id",
);

function qIdent(name: string): string {
  return `\`${String(name).replace(/`/g, "")}\``;
}

export type AgreementRecord = RowDataPacket & {
  id: number;
  clinic_id: string | null;
  ar_name: string | null;
  da_name: string | null;
  de_name: string | null;
  en_name: string | null;
  es_name: string | null;
  fr_name: string | null;
  it_name: string | null;
  ja_name: string | null;
  ko_name: string | null;
  nl_name: string | null;
  pt_name: string | null;
  ru_name: string | null;
  tr_name: string | null;
  zh_name: string | null;
  ar_desc: string | null;
  da_desc: string | null;
  de_desc: string | null;
  en_desc: string | null;
  es_desc: string | null;
  fr_desc: string | null;
  it_desc: string | null;
  ja_desc: string | null;
  ko_desc: string | null;
  nl_desc: string | null;
  pt_desc: string | null;
  ru_desc: string | null;
  tr_desc: string | null;
  zh_desc: string | null;
  type: string | null;
  completed: number | null;
  status: number | null;
};

export type CreateAgreementInput = Omit<AgreementRecord, "id">;

/** Default row shape for a new agreement (all locale columns null; `completed` / `status` adjusted by caller). */
export function emptyAgreementCreateInput(): CreateAgreementInput {
  const row: CreateAgreementInput = {
    clinic_id: null,
    ar_name: null,
    ar_desc: null,
    da_name: null,
    da_desc: null,
    de_name: null,
    de_desc: null,
    en_name: null,
    en_desc: null,
    es_name: null,
    es_desc: null,
    fr_name: null,
    fr_desc: null,
    it_name: null,
    it_desc: null,
    ja_name: null,
    ja_desc: null,
    ko_name: null,
    ko_desc: null,
    nl_name: null,
    nl_desc: null,
    pt_name: null,
    pt_desc: null,
    ru_name: null,
    ru_desc: null,
    tr_name: null,
    tr_desc: null,
    zh_name: null,
    zh_desc: null,
    type: null,
    completed: 0,
    status: 1,
  };
  return row;
}

export function agreementRecordToCreateInput(r: AgreementRecord): CreateAgreementInput {
  const { id, ...rest } = r;
  void id;
  return rest;
}

export async function getAllAgreements(): Promise<AgreementRecord[]> {
  const pool = getPool();
  const list = COLUMNS.map(qIdent).join(", ");
  const [rows] = await pool.execute<AgreementRecord[]>(`SELECT ${list} FROM ${qIdent(TABLE_NAME)}`);
  return rows;
}

export async function getAgreementById(id: number): Promise<AgreementRecord | null> {
  const pool = getPool();
  const list = COLUMNS.map(qIdent).join(", ");
  const [rows] = await pool.execute<AgreementRecord[]>(
    `SELECT ${list} FROM ${qIdent(TABLE_NAME)} WHERE ${qIdent("id")} = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createAgreement(payload: CreateAgreementInput): Promise<number> {
  const pool = getPool();
  const cols = AGREEMENT_INSERT_COLUMNS.map(qIdent).join(", ");
  const ph = AGREEMENT_INSERT_COLUMNS.map(() => "?").join(", ");
  const vals = AGREEMENT_INSERT_COLUMNS.map(c => payload[c as keyof CreateAgreementInput]);
  const [result] = await pool.execute<ResultSetHeader & { insertId: number }>(
    `INSERT INTO ${qIdent(TABLE_NAME)} (${cols}) VALUES (${ph})`,
    vals as unknown as (string | number | null)[],
  );
  return result.insertId;
}

export async function updateAgreementById(id: number, payload: CreateAgreementInput): Promise<void> {
  const pool = getPool();
  const setClause = AGREEMENT_INSERT_COLUMNS.map(c => `${qIdent(c)} = ?`).join(", ");
  const vals = AGREEMENT_INSERT_COLUMNS.map(c => payload[c as keyof CreateAgreementInput]);
  await pool.execute<ResultSetHeader>(
    `UPDATE ${qIdent(TABLE_NAME)} SET ${setClause} WHERE ${qIdent("id")} = ? LIMIT 1`,
    [...vals, id] as unknown as (string | number | null)[],
  );
}

export async function deleteAgreementsByIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const pool = getPool();
  const ph = ids.map(() => "?").join(", ");
  await pool.execute<ResultSetHeader>(`DELETE FROM ${qIdent(TABLE_NAME)} WHERE ${qIdent("id")} IN (${ph})`, ids);
}
