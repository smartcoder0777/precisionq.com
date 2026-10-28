import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { COMMUNITY_SERVICE_CATS_COLUMNS } from "@/db/schema/community";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "community_service_cats";
const COLUMNS = COMMUNITY_SERVICE_CATS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((column) => column !== "id");

export type CommunityServiceCategoryRecord = RowDataPacket & {
  id: number;
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
  status: number | null;
};

export type CreateCommunityServiceCategoryInput = Omit<CommunityServiceCategoryRecord, "id">;
export const getAllCommunityServiceCategories = () =>
  selectAll<CommunityServiceCategoryRecord>(TABLE_NAME, COLUMNS);
export const getCommunityServiceCategoryById = (id: number) =>
  selectById<CommunityServiceCategoryRecord>(TABLE_NAME, COLUMNS, id);
export const createCommunityServiceCategory = (payload: CreateCommunityServiceCategoryInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type CommunityServiceCategoryUpdatePatch = Partial<CreateCommunityServiceCategoryInput>;

export async function updateCommunityServiceCategoryById(id: number, patch: CommunityServiceCategoryUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof CommunityServiceCategoryUpdatePatch;
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

export async function deleteCommunityServiceCategoryById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
