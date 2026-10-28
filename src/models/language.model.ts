import type { RowDataPacket } from "mysql2";
import { LANGUAGES_COLUMNS } from "@/db/schema/settings-ref";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "languages";
const COLUMNS = LANGUAGES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type LanguageRecord = RowDataPacket & {
  id: number;
  code: string | null;
  dansk: string | null;
  deutsch: string | null;
  english: string | null;
  netherlands: string | null;
  polskie: string | null;
  russian: string | null;
  chinese: string | null;
};

export type CreateLanguageInput = Omit<LanguageRecord, "id">;
export const getAllLanguages = () => selectAll<LanguageRecord>(TABLE_NAME, COLUMNS);
export const getLanguageById = (id: number) => selectById<LanguageRecord>(TABLE_NAME, COLUMNS, id);
export const createLanguage = (payload: CreateLanguageInput) => insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);
