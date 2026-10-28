import type { RowDataPacket } from "mysql2";
import { SURVEY_EXPIRATIONS_COLUMNS } from "@/db/schema/surveys";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "survey_expirations";
const COLUMNS = SURVEY_EXPIRATIONS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type SurveyExpirationRecord = RowDataPacket & {
  id: number; expired_id: string | null; route: string | null; status: number;
};
export type CreateSurveyExpirationInput = Omit<SurveyExpirationRecord, "id">;
export const getAllSurveyExpirations = () => selectAll<SurveyExpirationRecord>(TABLE_NAME, COLUMNS);
export const getSurveyExpirationById = (id: number) =>
  selectById<SurveyExpirationRecord>(TABLE_NAME, COLUMNS, id);
export const createSurveyExpiration = (payload: CreateSurveyExpirationInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);
