import type { RowDataPacket } from "mysql2";
import { SURVEY_FEEDBACKS_COLUMNS } from "@/db/schema/surveys";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "survey_feedbacks";
const COLUMNS = SURVEY_FEEDBACKS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type SurveyFeedbackRecord = RowDataPacket & {
  id: number; ques_id: number | null; resp_id: number | null; resp_type: string | null; response: string | null;
};
export type CreateSurveyFeedbackInput = Omit<SurveyFeedbackRecord, "id">;
export const getAllSurveyFeedbacks = () => selectAll<SurveyFeedbackRecord>(TABLE_NAME, COLUMNS);
export const getSurveyFeedbackById = (id: number) =>
  selectById<SurveyFeedbackRecord>(TABLE_NAME, COLUMNS, id);
export const createSurveyFeedback = (payload: CreateSurveyFeedbackInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);
