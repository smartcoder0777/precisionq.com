import type { RowDataPacket } from "mysql2";
import { SURVEY_QUES_TYPES_COLUMNS } from "@/db/schema/surveys";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "survey_ques_types";
const COLUMNS = SURVEY_QUES_TYPES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type SurveyQuestionTypeRecord = RowDataPacket & {
  id: number; code: string | null; display_en: string | null; display_es: string | null; type: string | null; field_value: string | null;
};
export type CreateSurveyQuestionTypeInput = Omit<SurveyQuestionTypeRecord, "id">;
export const getAllSurveyQuestionTypes = () => selectAll<SurveyQuestionTypeRecord>(TABLE_NAME, COLUMNS);
export const getSurveyQuestionTypeById = (id: number) =>
  selectById<SurveyQuestionTypeRecord>(TABLE_NAME, COLUMNS, id);
export const createSurveyQuestionType = (payload: CreateSurveyQuestionTypeInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);
