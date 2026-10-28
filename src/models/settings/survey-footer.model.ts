import type { RowDataPacket } from "mysql2";
import { SURVEY_FOOTER_COLUMNS } from "@/db/schema/surveys";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "survey_footer";
const COLUMNS = SURVEY_FOOTER_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type SurveyFooterRecord = RowDataPacket & {
  id: number; lang_id: number | null; footer: string | null;
};
export type CreateSurveyFooterInput = Omit<SurveyFooterRecord, "id">;
export const getAllSurveyFooters = () => selectAll<SurveyFooterRecord>(TABLE_NAME, COLUMNS);
export const getSurveyFooterById = (id: number) => selectById<SurveyFooterRecord>(TABLE_NAME, COLUMNS, id);
export const createSurveyFooter = (payload: CreateSurveyFooterInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);
