import "server-only";

import * as SecurityQuestionModel from "@/models/settings/security-question.model";

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v);
}

function statusFromDb(n: number | null | undefined): "Active" | "Inactive" {
  return (n ?? 0) === 1 ? "Active" : "Inactive";
}

export type SecurityQuestionSettingsRow = {
  id: string;
  question: string;
  status: "Active" | "Inactive";
};

export async function loadSecurityQuestionsPagePayload(): Promise<{ rows: SecurityQuestionSettingsRow[] }> {
  const rows = await SecurityQuestionModel.getAllSecurityQuestions();
  return {
    rows: rows.map((row) => ({
      id: String(row.id),
      question: toStr(row.question),
      status: statusFromDb(row.status),
    })),
  };
}
