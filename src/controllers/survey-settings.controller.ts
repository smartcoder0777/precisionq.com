import { getAuthSession } from "@/lib/auth-session";
import type { HttpResult } from "./health.controller";
import * as SurveyCategoryModel from "@/models/settings/survey-category.model";
import * as SurveyTypeModel from "@/models/settings/survey-type.model";
import * as SurveyQuestionModel from "@/models/settings/survey-question.model";
import * as SurveyResponseModel from "@/models/settings/survey-response.model";
import * as LanguageModel from "@/models/language.model";
import * as SurveyModel from "@/models/survey.model";
import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import { requireRolePermission } from "./_permission";

async function unauthorized<T extends object>(emptyBody: T): Promise<HttpResult<T & { ok: false; message: string }>> {
  return { status: 401, body: { ...emptyBody, ok: false, message: "Unauthorized." } };
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function statusToDb(v: unknown): 0 | 1 {
  return v === "Active" || v === 1 || v === "1" ? 1 : 0;
}

function statusFromDb(v: number | null | undefined): "Active" | "Inactive" {
  return (v ?? 0) === 1 ? "Active" : "Inactive";
}

function coerceNames(input: Record<string, unknown>, prefix: "name_"): Record<string, string | null> {
  const names: Record<string, string | null> = {};
  for (const { code } of SUPPORTED_LANGUAGES) {
    const k = `${prefix}${code}`;
    names[k] = strOrNull(input[k] ?? (input.names as Record<string, unknown> | undefined)?.[code]);
  }
  return names;
}

function normalizeResponseItemsJson(input: unknown): string | null {
  const raw = strOrNull(input);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Array<{ id?: unknown; name?: unknown; type?: unknown; value?: unknown }>;
    if (!Array.isArray(parsed)) return null;
    const normalized = parsed
      .map((item, idx) => ({
        id: Number.isFinite(Number(item?.id)) ? Number(item.id) : idx,
        name: typeof item?.name === "string" ? item.name.trim() : "",
        type: typeof item?.type === "string" ? item.type.trim() : "text",
        value: typeof item?.value === "string" ? item.value : "",
      }))
      .filter((item) => item.name.length > 0);
    if (normalized.length === 0) return null;
    return JSON.stringify(normalized);
  } catch {
    return null;
  }
}

export const surveySettingsController = {
  categories: {
    async list(): Promise<HttpResult<{ ok: boolean; rows: Array<{ id: number; names: Record<string, string>; e_status: number; status: "Active" | "Inactive" }>; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return unauthorized({ rows: [] });
      const denied = await requireRolePermission(session, "settings-survey", "view");
      if (denied) return { status: denied.status, body: { rows: [], ok: false, message: denied.body.message } };
      const rows = await SurveyCategoryModel.getAllSurveyCategories();
      return {
        status: 200,
        body: {
          ok: true,
          rows: rows.map((r) => ({
            id: r.id,
            names: Object.fromEntries(
              SUPPORTED_LANGUAGES.map(({ code }) => [code, String(r[`name_${code}` as keyof SurveyCategoryModel.SurveyCategoryRecord] ?? "")]),
            ),
            e_status: Number(r.e_status ?? 1),
            status: statusFromDb(r.status),
          })),
        },
      };
    },
    async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
      const denied = await requireRolePermission(session, "settings-survey", "edit");
      if (denied) return denied;
      const names = coerceNames(input, "name_");
      if (!names.name_en) return { status: 400, body: { ok: false, message: "English name is required." } };
      const eStatus = toInt(input.e_status ?? input.eStatus) ?? 1;
      const id = await SurveyCategoryModel.createSurveyCategory({
        name_ar: names.name_ar,
        name_da: names.name_da,
        name_de: names.name_de,
        name_en: names.name_en,
        name_es: names.name_es,
        name_fr: names.name_fr,
        name_it: names.name_it,
        name_ja: names.name_ja,
        name_ko: names.name_ko,
        name_nl: names.name_nl,
        name_pt: names.name_pt,
        name_ru: names.name_ru,
        name_tr: names.name_tr,
        name_zh: names.name_zh,
        e_status: eStatus,
        status: statusToDb(input.status),
      });
      return { status: 201, body: { ok: true, id } };
    },
    async update(id: number, input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
      const denied = await requireRolePermission(session, "settings-survey", "edit");
      if (denied) return denied;
      const existing = await SurveyCategoryModel.getSurveyCategoryById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Category not found." } };
      const names = coerceNames(input, "name_");
      if (!names.name_en) return { status: 400, body: { ok: false, message: "English name is required." } };
      const eStatus = toInt(input.e_status ?? input.eStatus) ?? 1;
      await SurveyCategoryModel.updateSurveyCategoryById(id, {
        name_ar: names.name_ar,
        name_da: names.name_da,
        name_de: names.name_de,
        name_en: names.name_en,
        name_es: names.name_es,
        name_fr: names.name_fr,
        name_it: names.name_it,
        name_ja: names.name_ja,
        name_ko: names.name_ko,
        name_nl: names.name_nl,
        name_pt: names.name_pt,
        name_ru: names.name_ru,
        name_tr: names.name_tr,
        name_zh: names.name_zh,
        e_status: eStatus,
        status: statusToDb(input.status),
      });
      return { status: 200, body: { ok: true } };
    },
    async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
      const denied = await requireRolePermission(session, "settings-survey", "edit");
      if (denied) return denied;
      const existing = await SurveyCategoryModel.getSurveyCategoryById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Category not found." } };
      await SurveyCategoryModel.deleteSurveyCategoryById(id);
      return { status: 200, body: { ok: true } };
    },
  },

  types: {
    async list(): Promise<HttpResult<{ ok: boolean; rows: Array<{ id: number; names: Record<string, string>; status: "Active" | "Inactive" }>; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return unauthorized({ rows: [] });
      const denied = await requireRolePermission(session, "settings-survey", "view");
      if (denied) return { status: denied.status, body: { rows: [], ok: false, message: denied.body.message } };
      const rows = await SurveyTypeModel.getAllSurveyTypes();
      return {
        status: 200,
        body: {
          ok: true,
          rows: rows.map((r) => ({
            id: r.id,
            names: Object.fromEntries(
              SUPPORTED_LANGUAGES.map(({ code }) => [code, String(r[`name_${code}` as keyof SurveyTypeModel.SurveyTypeRecord] ?? "")]),
            ),
            status: statusFromDb(r.status),
          })),
        },
      };
    },
    async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
      const denied = await requireRolePermission(session, "settings-survey", "edit");
      if (denied) return denied;
      const names = coerceNames(input, "name_");
      if (!names.name_en) return { status: 400, body: { ok: false, message: "English name is required." } };
      const id = await SurveyTypeModel.createSurveyType({
        name_ar: names.name_ar,
        name_da: names.name_da,
        name_de: names.name_de,
        name_en: names.name_en,
        name_es: names.name_es,
        name_fr: names.name_fr,
        name_it: names.name_it,
        name_ja: names.name_ja,
        name_ko: names.name_ko,
        name_nl: names.name_nl,
        name_pt: names.name_pt,
        name_ru: names.name_ru,
        name_tr: names.name_tr,
        name_zh: names.name_zh,
        status: statusToDb(input.status),
      });
      return { status: 201, body: { ok: true, id } };
    },
    async update(id: number, input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
      const denied = await requireRolePermission(session, "settings-survey", "edit");
      if (denied) return denied;
      const existing = await SurveyTypeModel.getSurveyTypeById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Type not found." } };
      const names = coerceNames(input, "name_");
      if (!names.name_en) return { status: 400, body: { ok: false, message: "English name is required." } };
      await SurveyTypeModel.updateSurveyTypeById(id, {
        name_ar: names.name_ar,
        name_da: names.name_da,
        name_de: names.name_de,
        name_en: names.name_en,
        name_es: names.name_es,
        name_fr: names.name_fr,
        name_it: names.name_it,
        name_ja: names.name_ja,
        name_ko: names.name_ko,
        name_nl: names.name_nl,
        name_pt: names.name_pt,
        name_ru: names.name_ru,
        name_tr: names.name_tr,
        name_zh: names.name_zh,
        status: statusToDb(input.status),
      });
      return { status: 200, body: { ok: true } };
    },
    async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
      const denied = await requireRolePermission(session, "settings-survey", "edit");
      if (denied) return denied;
      const existing = await SurveyTypeModel.getSurveyTypeById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Type not found." } };
      await SurveyTypeModel.deleteSurveyTypeById(id);
      return { status: 200, body: { ok: true } };
    },
  },

  questions: {
    async list(): Promise<HttpResult<{ ok: boolean; rows: Array<{ id: number; survey_id: number | null; survey_name: string; language_id: number | null; language_name: string; text: string; required: boolean; status: "Active" | "Inactive" }>; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return unauthorized({ rows: [] });
      const denied = await requireRolePermission(session, "settings-survey", "view");
      if (denied) return { status: denied.status, body: { rows: [], ok: false, message: denied.body.message } };
      const [rows, surveys, languages] = await Promise.all([
        SurveyQuestionModel.getAllSurveyQuestions(),
        SurveyModel.listSurveysForAdmin(),
        LanguageModel.getAllLanguages(),
      ]);
      const surveyNameById = new Map(surveys.map((s) => [s.id, s.name ?? `Survey #${s.id}`]));
      const languageNameById = new Map(
        languages.map((l) => [l.id, (l.english ?? "").trim() || (l.code ?? "").trim() || `Language #${l.id}`]),
      );
      return {
        status: 200,
        body: {
          ok: true,
          rows: rows.map((r) => ({
            id: r.id,
            survey_id: r.survey_id,
            survey_name: r.survey_id == null ? "—" : (surveyNameById.get(r.survey_id) ?? `Survey #${r.survey_id}`),
            language_id: r.language_id,
            language_name: r.language_id == null ? "—" : (languageNameById.get(r.language_id) ?? `Language #${r.language_id}`),
            text: r.text ?? "",
            required: r.required === 1,
            status: statusFromDb(r.status),
          })),
        },
      };
    },
    async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
      const denied = await requireRolePermission(session, "settings-survey", "edit");
      if (denied) return denied;
      const text = strOrNull(input.text);
      if (!text) return { status: 400, body: { ok: false, message: "Question text is required." } };
      const id = await SurveyQuestionModel.createSurveyQuestion({
        response_id: toInt(input.response_id ?? input.responseId),
        survey_id: toInt(input.survey_id ?? input.surveyId),
        language_id: toInt(input.language_id ?? input.languageId),
        text,
        choice_text: strOrNull(input.choice_text ?? input.choiceText),
        required: input.required === true ? 1 : 0,
        status: statusToDb(input.status),
      });
      return { status: 201, body: { ok: true, id } };
    },
    async update(id: number, input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
      const denied = await requireRolePermission(session, "settings-survey", "edit");
      if (denied) return denied;
      const existing = await SurveyQuestionModel.getSurveyQuestionById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Question not found." } };
      const text = strOrNull(input.text);
      if (!text) return { status: 400, body: { ok: false, message: "Question text is required." } };
      await SurveyQuestionModel.updateSurveyQuestionById(id, {
        response_id: toInt(input.response_id ?? input.responseId),
        survey_id: toInt(input.survey_id ?? input.surveyId),
        language_id: toInt(input.language_id ?? input.languageId),
        text,
        choice_text: strOrNull(input.choice_text ?? input.choiceText),
        required: input.required === true ? 1 : 0,
        status: statusToDb(input.status),
      });
      return { status: 200, body: { ok: true } };
    },
    async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
      const denied = await requireRolePermission(session, "settings-survey", "edit");
      if (denied) return denied;
      const existing = await SurveyQuestionModel.getSurveyQuestionById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Question not found." } };
      await SurveyQuestionModel.deleteSurveyQuestionById(id);
      return { status: 200, body: { ok: true } };
    },
  },

  responses: {
    async list(): Promise<HttpResult<{ ok: boolean; rows: Array<{ id: number; key: string; lang_id: number | null; language_name: string; items: string; required: boolean; status: "Active" | "Inactive" }>; languages: Array<{ id: number; label: string }>; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return unauthorized({ rows: [], languages: [] });
      const denied = await requireRolePermission(session, "settings-survey", "view");
      if (denied) return { status: denied.status, body: { rows: [], languages: [], ok: false, message: denied.body.message } };
      const [rows, langs] = await Promise.all([
        SurveyResponseModel.getAllSurveyResponses(),
        LanguageModel.getAllLanguages(),
      ]);
      return {
        status: 200,
        body: {
          ok: true,
          rows: rows.map((r) => ({
            id: r.id,
            key: r.key ?? "",
            lang_id: r.lang_id,
            language_name:
              r.lang_id == null
                ? "—"
                : (langs.find((l) => l.id === r.lang_id)?.english ?? langs.find((l) => l.id === r.lang_id)?.code ?? `Language #${r.lang_id}`),
            items: r.items ?? "",
            required: r.required === 1,
            status: statusFromDb(r.status),
          })),
          languages: langs.map((l) => ({
            id: l.id,
            label: (l.english ?? "").trim() || (l.code ?? "").trim() || `Language #${l.id}`,
          })),
        },
      };
    },
    async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
      const denied = await requireRolePermission(session, "settings-survey", "edit");
      if (denied) return denied;
      const key = strOrNull(input.key);
      if (!key) return { status: 400, body: { ok: false, message: "Response key is required." } };
      const itemsJson = normalizeResponseItemsJson(input.items);
      if (!itemsJson) return { status: 400, body: { ok: false, message: "Valid response items are required." } };
      const id = await SurveyResponseModel.createSurveyResponse({
        key,
        lang_id: toInt(input.lang_id ?? input.langId),
        items: itemsJson,
        required: input.required === true ? 1 : 0,
        status: statusToDb(input.status),
      });
      return { status: 201, body: { ok: true, id } };
    },
    async update(id: number, input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
      const denied = await requireRolePermission(session, "settings-survey", "edit");
      if (denied) return denied;
      const existing = await SurveyResponseModel.getSurveyResponseById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Response not found." } };
      const key = strOrNull(input.key);
      if (!key) return { status: 400, body: { ok: false, message: "Response key is required." } };
      const itemsJson = normalizeResponseItemsJson(input.items);
      if (!itemsJson) return { status: 400, body: { ok: false, message: "Valid response items are required." } };
      await SurveyResponseModel.updateSurveyResponseById(id, {
        key,
        lang_id: toInt(input.lang_id ?? input.langId),
        items: itemsJson,
        required: input.required === true ? 1 : 0,
        status: statusToDb(input.status),
      });
      return { status: 200, body: { ok: true } };
    },
    async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
      const session = await getAuthSession();
      if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
      const denied = await requireRolePermission(session, "settings-survey", "edit");
      if (denied) return denied;
      const existing = await SurveyResponseModel.getSurveyResponseById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Response not found." } };
      await SurveyResponseModel.deleteSurveyResponseById(id);
      return { status: 200, body: { ok: true } };
    },
  },
};
