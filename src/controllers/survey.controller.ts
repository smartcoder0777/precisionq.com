/**
 * Surveys CRUD + outbound email/SMS for survey invitations.
 */
import { getAuthSession } from "@/lib/auth-session";
import { sendSurveyEmail, sendSurveySms } from "@/lib/survey-delivery";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";
import * as LanguageModel from "@/models/language.model";
import * as SurveyCategoryModel from "@/models/settings/survey-category.model";
import * as SurveyFeedbackModel from "@/models/settings/survey-feedback.model";
import * as SurveyQuestionModel from "@/models/settings/survey-question.model";
import * as SurveyResponseModel from "@/models/settings/survey-response.model";
import * as SurveyTypeModel from "@/models/settings/survey-type.model";
import * as SurveyModel from "@/models/survey.model";
import * as SurveyViewModel from "@/models/survey-view.model";
import * as UserModel from "@/models/user.model";

type SurveyPageBody = {
  ok: boolean;
  surveys: SurveyRowJson[];
  languages: { id: number; code: string | null; label: string | null }[];
  categories: { id: number; nameEn: string | null; nameEs: string | null }[];
  types: { id: number; nameEn: string | null; nameEs: string | null }[];
  message?: string;
};

async function unauthorized(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 401, body: { ok: false, message: "Unauthorized." } };
}

async function unauthorizedPage(): Promise<HttpResult<SurveyPageBody>> {
  return {
    status: 401,
    body: { ok: false, message: "Unauthorized.", surveys: [], languages: [], categories: [], types: [] },
  };
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function parseId(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const STATUS_TO_DB: Record<string, number> = {
  Active: 1,
  Inactive: 0,
  Closed: 2,
};

const DB_TO_STATUS: Record<number, string> = {
  1: "Active",
  0: "Inactive",
  2: "Closed",
};

function statusToDb(label: unknown): number | null {
  const s = str(label);
  if (s in STATUS_TO_DB) return STATUS_TO_DB[s]!;
  const n = Number(label);
  if (Number.isFinite(n)) return n;
  return 1;
}

function dbToStatus(n: number | null | undefined): string {
  if (n == null) return "Inactive";
  return DB_TO_STATUS[n] ?? "Inactive";
}

function toPayload(input: Record<string, unknown>): SurveyModel.CreateSurveyInput | null {
  const langId = parseId(input.langId);
  const cateId = parseId(input.cateId);
  const typeId = parseId(input.typeId);
  const name = str(input.name);
  if (langId == null || cateId == null || typeId == null || !name) return null;

  const pageLength = Math.max(1, Math.min(500, Number(input.pageLength) || 1));

  return {
    lang_id: langId,
    cate_id: cateId,
    type_id: typeId,
    name,
    desc: str(input.desc) || null,
    page_length: pageLength,
    status: statusToDb(input.status),
  };
}

type SurveyRowJson = {
  id: number;
  langId: number | null;
  langCode: string | null;
  langLabel: string | null;
  cateId: number | null;
  typeId: number | null;
  categoryName: string | null;
  typeName: string | null;
  name: string | null;
  desc: string | null;
  pageLength: number;
  status: string;
};

function rowToJson(r: SurveyModel.SurveyListRow): SurveyRowJson {
  return {
    id: r.id,
    langId: r.lang_id,
    langCode: r.lang_code,
    langLabel: r.lang_label,
    cateId: r.cate_id,
    typeId: r.type_id,
    categoryName: r.category_name,
    typeName: r.type_name,
    name: r.name,
    desc: r.desc,
    pageLength: r.page_length,
    status: dbToStatus(r.status ?? undefined),
  };
}

type BuilderQuestionRow = {
  id: number;
  text: string;
  status: number;
  responseId: number | null;
  responseKey: string | null;
  responseItems: string | null;
};

type BuilderResponseRow = {
  id: number;
  key: string | null;
  status: number | null;
  langId: number | null;
  items: string | null;
};

type BuilderSavedPair = {
  quesId: number;
  respId: number;
};

type PreviewQuestion = {
  quesId: number;
  text: string;
  responseId: number | null;
  responseKey: string | null;
  responseItems: string | null;
};

const RESPONSE_ITEMS_BY_KEY: Record<
  string,
  { key: string; items: string; defaultStatus: number; required: number }
> = {
  "5_agreement_scale": {
    key: "5_agreement_scale",
    defaultStatus: 1,
    required: 1,
    items: JSON.stringify([
      { id: 0, name: "Strongly Disagree", type: "numeric", value: "1" },
      { id: 1, name: "Disagree", type: "numeric", value: "2" },
      { id: 2, name: "Agree", type: "numeric", value: "3" },
      { id: 3, name: "Strongly Agree", type: "numeric", value: "4" },
      { id: 4, name: "Not applicable", type: "numeric", value: "0" },
    ]),
  },
  number_rate: {
    key: "number_rate",
    defaultStatus: 1,
    required: 1,
    items: JSON.stringify([{ id: 0, name: "10 numbers", type: "num_rate", value: "[\"Worst\",\"Best\"]" }]),
  },
  star_rate: {
    key: "star_rate",
    defaultStatus: 1,
    required: 1,
    items: JSON.stringify([{ id: 0, name: "5 stars", type: "rate", value: "" }]),
  },
  "2_yes_no": {
    key: "2_yes_no",
    defaultStatus: 1,
    required: 1,
    items: JSON.stringify([
      { id: 0, name: "Yes", type: "numeric", value: "1" },
      { id: 1, name: "No", type: "numeric", value: "0" },
    ]),
  },
  "1_text": {
    key: "1_text",
    defaultStatus: 1,
    required: 0,
    items: JSON.stringify([{ id: 0, name: "Text", type: "text", value: "" }]),
  },
  "4_experience_based": {
    key: "4_experience_based",
    defaultStatus: 1,
    required: 1,
    items: JSON.stringify([
      { id: 0, name: "Never", type: "numeric", value: "1" },
      { id: 1, name: "Sometimes", type: "numeric", value: "2" },
      { id: 2, name: "Usually", type: "numeric", value: "3" },
      { id: 3, name: "Always", type: "numeric", value: "4" },
    ]),
  },
};

export const surveyController = {
  async getPreviewData(
    surveyId: number,
    languageId?: number,
  ): Promise<
    HttpResult<{
      ok: boolean;
      survey?: { id: number; name: string | null; desc: string | null };
      languageId?: number;
      questions: PreviewQuestion[];
      message?: string;
    }>
  > {
    const session = await getAuthSession();
    if (!session) return { status: 401, body: { ok: false, questions: [], message: "Unauthorized." } };
    const denied = await requireRolePermission(session, "survey", "view");
    if (denied) return { status: denied.status, body: { ok: false, questions: [], message: denied.body.message } };

    const survey = await SurveyModel.getSurveyById(surveyId);
    if (!survey) return { status: 404, body: { ok: false, questions: [], message: "Survey not found." } };

    const langId = languageId ?? survey.lang_id ?? 1;
    try {
      const viewRow = await SurveyViewModel.getSurveyViewBySurveyAndLang(surveyId, langId);
      const viewRaw = viewRow?.view ?? "[]";
      let parsed: Array<{
        ques?: { ques_id?: unknown; question?: unknown };
        resp?: { resp_id?: unknown; items?: unknown };
      }> = [];
      try {
        const maybe = JSON.parse(viewRaw) as unknown;
        if (Array.isArray(maybe)) parsed = maybe as typeof parsed;
      } catch {
        parsed = [];
      }

      const questions: PreviewQuestion[] = parsed
        .map((item) => {
          const quesId = parseId(item?.ques?.ques_id);
          if (quesId == null) return null;
          const text = str(item?.ques?.question);
          const responseId = parseId(item?.resp?.resp_id);
          const responseItems = str(item?.resp?.items) || null;
          return {
            quesId,
            text,
            responseId,
            responseKey: null,
            responseItems,
          } as PreviewQuestion;
        })
        .filter((q): q is PreviewQuestion => q !== null);

      return {
        status: 200,
        body: {
          ok: true,
          survey: { id: survey.id, name: survey.name, desc: survey.desc },
          languageId: langId,
          questions,
        },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load preview.";
      return { status: 500, body: { ok: false, questions: [], message } };
    }
  },

  async submitPreview(
    surveyId: number,
    input: Record<string, unknown>,
  ): Promise<HttpResult<{ ok: boolean; count?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "survey", "create");
    if (denied) return denied;

    const survey = await SurveyModel.getSurveyById(surveyId);
    if (!survey) return { status: 404, body: { ok: false, message: "Survey not found." } };

    const languageId = parseId(input.languageId) ?? survey.lang_id ?? 1;
    const answers = Array.isArray(input.answers) ? input.answers : [];
    if (answers.length === 0) return { status: 400, body: { ok: false, message: "No answers to submit." } };

    try {
      const viewRow = await SurveyViewModel.getSurveyViewBySurveyAndLang(surveyId, languageId);
      const viewRaw = viewRow?.view ?? "[]";
      const parsed = JSON.parse(viewRaw) as Array<{
        ques?: { ques_id?: unknown };
        resp?: { resp_id?: unknown; items?: unknown };
      }>;
      const byQuesId = new Map<
        number,
        { respId: number | null; respType: string | null }
      >();
      for (const item of Array.isArray(parsed) ? parsed : []) {
        const quesId = parseId(item?.ques?.ques_id);
        if (quesId == null) continue;
        const respId = parseId(item?.resp?.resp_id);
        let respType: string | null = null;
        const rawItems = str(item?.resp?.items);
        if (rawItems) {
          try {
            const arr = JSON.parse(rawItems) as Array<{ type?: unknown }>;
            if (Array.isArray(arr) && arr[0]?.type != null) respType = str(arr[0].type) || null;
          } catch {
            respType = null;
          }
        }
        byQuesId.set(quesId, { respId, respType });
      }

      let saved = 0;

      for (const item of answers) {
        if (!item || typeof item !== "object") continue;
        const o = item as { quesId?: unknown; response?: unknown };
        const quesId = parseId(o.quesId);
        const response = str(o.response);
        if (quesId == null || !response) continue;
        const mapped = byQuesId.get(quesId);
        if (!mapped || mapped.respId == null) continue;
        await SurveyFeedbackModel.createSurveyFeedback({
          ques_id: quesId,
          resp_id: mapped.respId,
          resp_type: mapped.respType,
          response,
        });
        saved += 1;
      }

      if (saved === 0) {
        return { status: 400, body: { ok: false, message: "No valid answers were submitted." } };
      }
      return { status: 200, body: { ok: true, count: saved } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to submit survey feedback.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async getBuilderData(
    surveyId: number,
    languageId?: number,
  ): Promise<
    HttpResult<{
      ok: boolean;
      survey?: { id: number; name: string | null; langId: number | null };
      languageId?: number;
      questions: BuilderQuestionRow[];
      responses: BuilderResponseRow[];
      savedPairs: BuilderSavedPair[];
      message?: string;
    }>
  > {
    const session = await getAuthSession();
    if (!session) return { status: 401, body: { ok: false, questions: [], responses: [], savedPairs: [], message: "Unauthorized." } };
    const denied = await requireRolePermission(session, "survey", "view");
    if (denied) return { status: denied.status, body: { ok: false, questions: [], responses: [], savedPairs: [], message: denied.body.message } };

    const survey = await SurveyModel.getSurveyById(surveyId);
    if (!survey) return { status: 404, body: { ok: false, questions: [], responses: [], savedPairs: [], message: "Survey not found." } };

    const langId = languageId ?? survey.lang_id ?? 1;
    try {
      const [questions, responses] = await Promise.all([
        SurveyQuestionModel.listSurveyQuestionsBySurveyAndLang(surveyId, langId),
        SurveyResponseModel.listSurveyResponsesByLang(langId),
      ]);
      const viewRow = await SurveyViewModel.getSurveyViewBySurveyAndLang(surveyId, langId);
      const responseById = new Map(responses.map((r) => [r.id, r]));
      const savedPairs: BuilderSavedPair[] = [];
      if (viewRow?.view) {
        try {
          const parsed = JSON.parse(viewRow.view) as Array<{
            ques?: { ques_id?: unknown };
            resp?: { resp_id?: unknown };
          }>;
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              const quesId = parseId(item?.ques?.ques_id);
              const respId = parseId(item?.resp?.resp_id);
              if (quesId != null && respId != null) savedPairs.push({ quesId, respId });
            }
          }
        } catch {
          // ignore malformed view JSON and keep empty savedPairs
        }
      }
      return {
        status: 200,
        body: {
          ok: true,
          survey: { id: survey.id, name: survey.name, langId: survey.lang_id },
          languageId: langId,
          questions: questions.map((q) => {
            const resp = q.response_id != null ? responseById.get(q.response_id) : undefined;
            return {
              id: q.id,
              text: q.text ?? "",
              status: q.status ?? 1,
              responseId: q.response_id,
              responseKey: resp?.key ?? null,
              responseItems: resp?.items ?? null,
            };
          }),
          responses: responses.map((r) => ({
            id: r.id,
            key: r.key,
            status: r.status,
            langId: r.lang_id,
            items: r.items,
          })),
          savedPairs,
        },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load survey builder.";
      return { status: 500, body: { ok: false, questions: [], responses: [], savedPairs: [], message } };
    }
  },

  async saveBuilderData(
    surveyId: number,
    input: Record<string, unknown>,
  ): Promise<HttpResult<{ ok: boolean; count?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "survey", "edit");
    if (denied) return denied;

    const survey = await SurveyModel.getSurveyById(surveyId);
    if (!survey) return { status: 404, body: { ok: false, message: "Survey not found." } };

    const languageId = parseId(input.languageId) ?? survey.lang_id ?? 1;
    const rawQuestions = Array.isArray(input.questions) ? input.questions : [];

    try {
      const responses = await SurveyResponseModel.listSurveyResponsesByLang(languageId);
      const responseByKey = new Map(responses.map((r) => [String(r.key ?? ""), r]));

      const normalized: Array<{ id: number | null; text: string; status: number; responseId: number | null }> = [];
      for (const item of rawQuestions) {
        if (!item || typeof item !== "object") continue;
        const o = item as { id?: unknown; text?: unknown; status?: unknown; responseKey?: unknown };
        const text = str(o.text);
        const responseKey = str(o.responseKey);
        if (!text) continue;

        let responseId: number | null = null;
        if (responseKey) {
          // Prefer DB response key mapping first (what user actually dragged in UI).
          responseId = responseByKey.get(responseKey)?.id ?? null;
          // Fallback: create from known templates if key does not exist yet.
          if (!responseId) {
            const spec = RESPONSE_ITEMS_BY_KEY[responseKey];
            if (spec) {
              responseId = await SurveyResponseModel.createSurveyResponse({
                key: spec.key,
                lang_id: languageId,
                items: spec.items,
                status: spec.defaultStatus,
                required: spec.required,
              });
              responseByKey.set(responseKey, {
                id: responseId,
                key: spec.key,
                lang_id: languageId,
                items: spec.items,
                status: spec.defaultStatus,
                required: spec.required,
              } as SurveyResponseModel.SurveyResponseRecord);
            }
          }
        }
        normalized.push({
          id: parseId(o.id),
          text,
          status: Number(o.status) === 0 ? 0 : 1,
          responseId,
        });
      }

      const existing = await SurveyQuestionModel.listSurveyQuestionsBySurveyAndLang(surveyId, languageId);
      const existingById = new Map(existing.map((q) => [q.id, q]));
      const responseById = new Map(responses.map((r) => [r.id, r]));
      const viewList: Array<{
        ques: { ques_id: string; question: string; survey_name: string };
        resp: { resp_id: string; items: string; required: string };
        answer: string;
      }> = [];

      for (const q of normalized) {
        if (q.id != null && existingById.has(q.id) && q.responseId != null) {
          await SurveyQuestionModel.updateSurveyQuestionById(q.id, {
            response_id: q.responseId,
            text: q.text,
            status: q.status,
          });
          const resp = responseById.get(q.responseId);
          viewList.push({
            ques: {
              ques_id: String(q.id),
              question: q.text,
              survey_name: survey.name ?? `Survey #${survey.id}`,
            },
            resp: {
              resp_id: String(q.responseId),
              items: String(resp?.items ?? "[]"),
              required: String(resp?.required ?? 1),
            },
            answer: "0",
          });
        }
      }

      const row = await SurveyViewModel.getSurveyViewBySurveyAndLang(surveyId, languageId);
      const serialized = JSON.stringify(viewList);
      if (row) {
        await SurveyViewModel.updateSurveyViewById(row.id, {
          survey_id: surveyId,
          lang_id: languageId,
          completed: row.completed ?? 0,
          view: serialized,
        });
      } else {
        await SurveyViewModel.createSurveyView({
          survey_id: surveyId,
          lang_id: languageId,
          completed: 0,
          view: serialized,
        });
      }

      return { status: 200, body: { ok: true, count: viewList.length } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save survey builder.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async getPageData(): Promise<HttpResult<SurveyPageBody>> {
    const session = await getAuthSession();
    if (!session) return unauthorizedPage();
    const denied = await requireRolePermission(session, "survey", "view");
    if (denied) return { status: denied.status, body: { ok: false, surveys: [], languages: [], categories: [], types: [], message: denied.body.message } };

    try {
      const [surveys, languages, categories, types] = await Promise.all([
        SurveyModel.listSurveysForAdmin(),
        LanguageModel.getAllLanguages(),
        SurveyCategoryModel.getAllSurveyCategories(),
        SurveyTypeModel.getAllSurveyTypes(),
      ]);

      return {
        status: 200,
        body: {
          ok: true,
          surveys: surveys.map(rowToJson),
          languages: languages.map((l) => ({
            id: l.id,
            code: l.code,
            label: l.english?.trim() || l.code,
          })),
          categories: categories.map((c) => ({
            id: c.id,
            nameEn: c.name_en,
            nameEs: c.name_es,
          })),
          types: types.map((t) => ({
            id: t.id,
            nameEn: t.name_en,
            nameEs: t.name_es,
          })),
        },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Database error.";
      return {
        status: 500,
        body: {
          ok: false,
          surveys: [],
          languages: [],
          categories: [],
          types: [],
          message,
        },
      };
    }
  },

  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "survey", "create");
    if (denied) return denied;

    const payload = toPayload(input);
    if (!payload) {
      return { status: 400, body: { ok: false, message: "langId, cateId, typeId, and name are required." } };
    }

    try {
      const id = await SurveyModel.insertSurvey(payload);
      return { status: 201, body: { ok: true, id } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create survey.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async update(
    id: number,
    input: Record<string, unknown>,
  ): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "survey", "edit");
    if (denied) return denied;

    const payload = toPayload(input);
    if (!payload) {
      return { status: 400, body: { ok: false, message: "langId, cateId, typeId, and name are required." } };
    }

    try {
      const existing = await SurveyModel.getSurveyById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Survey not found." } };
      await SurveyModel.updateSurvey(id, payload);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not update survey.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "survey", "delete");
    if (denied) return denied;

    try {
      const existing = await SurveyModel.getSurveyById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Survey not found." } };
      await SurveyModel.deleteSurvey(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not delete survey.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async listRecipients(input: { query?: string; page?: number; pageSize?: number }): Promise<
    HttpResult<{
      ok: boolean;
      items: { id: number; name: string; email: string; phone: string | null }[];
      total: number;
      page: number;
      pageSize: number;
      message?: string;
    }>
  > {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        body: { ok: false, items: [], total: 0, page: 1, pageSize: 20, message: "Unauthorized." },
      };
    }
    const denied = await requireRolePermission(session, "survey", "view");
    if (denied) {
      return {
        status: denied.status,
        body: { ok: false, items: [], total: 0, page: 1, pageSize: 20, message: denied.body.message },
      };
    }

    const page = Math.max(1, Number(input.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(input.pageSize) || 20));
    const query = str(input.query);

    try {
      const result = await UserModel.listSurveyRecipientsPaged({ query, page, pageSize });
      return {
        status: 200,
        body: {
          ok: true,
          items: result.rows.map((r) => ({
            id: r.id,
            name: [r.fname, r.lname].filter(Boolean).join(" ").trim() || `User #${r.id}`,
            email: r.email,
            phone: r.phone,
          })),
          total: result.total,
          page,
          pageSize,
        },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load patients.";
      return {
        status: 500,
        body: { ok: false, items: [], total: 0, page, pageSize, message },
      };
    }
  },

  async send(input: Record<string, unknown>): Promise<
    HttpResult<{
      ok: boolean;
      sent?: number;
      failed?: number;
      results?: { to: string; ok: boolean; error?: string }[];
      message?: string;
    }>
  > {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "survey", "create");
    if (denied) return denied;

    const channel = str(input.channel).toLowerCase();
    if (channel !== "email" && channel !== "sms") {
      return { status: 400, body: { ok: false, message: "channel must be email or sms." } };
    }

    const surveyId = parseId(input.surveyId);
    if (surveyId == null) {
      return { status: 400, body: { ok: false, message: "surveyId is required." } };
    }

    const survey = await SurveyModel.getSurveyById(surveyId);
    if (!survey) {
      return { status: 404, body: { ok: false, message: "Survey not found." } };
    }

    const recipientsRaw = input.recipients;
    if (!Array.isArray(recipientsRaw) || recipientsRaw.length === 0) {
      return { status: 400, body: { ok: false, message: "recipients must be a non-empty array." } };
    }

    const subject = str(input.subject) || `${survey.name ?? "Survey"} — ${surveyId}`;

    const htmlBody = str(input.htmlBody);
    const smsBody = str(input.smsBody);

    if (channel === "email" && !htmlBody) {
      return { status: 400, body: { ok: false, message: "htmlBody is required for email." } };
    }
    if (channel === "sms" && !smsBody) {
      return { status: 400, body: { ok: false, message: "smsBody is required for SMS." } };
    }

    const results: { to: string; ok: boolean; error?: string }[] = [];
    let sent = 0;
    let failed = 0;

    for (const item of recipientsRaw) {
      if (!item || typeof item !== "object") continue;
      const o = item as { email?: unknown; phone?: unknown };

      if (channel === "email") {
        const to = str(o.email);
        if (!to) {
          failed += 1;
          results.push({ to: "(missing)", ok: false, error: "Missing email." });
          continue;
        }
        const r = await sendSurveyEmail({ to, subject, html: htmlBody });
        if (r.ok) {
          sent += 1;
          results.push({ to, ok: true });
        } else {
          failed += 1;
          results.push({ to, ok: false, error: r.message });
        }
      } else {
        const to = str(o.phone);
        if (!to) {
          failed += 1;
          results.push({ to: "(missing)", ok: false, error: "Missing phone." });
          continue;
        }
        const r = await sendSurveySms({ to, body: smsBody });
        if (r.ok) {
          sent += 1;
          results.push({ to, ok: true });
        } else {
          failed += 1;
          results.push({ to, ok: false, error: r.message });
        }
      }
    }

    if (results.length === 0) {
      return { status: 400, body: { ok: false, message: "No valid recipients." } };
    }

    const allSucceeded = failed === 0;
    const status = sent === 0 ? 502 : 200;
    return {
      status,
      body: {
        ok: allSucceeded,
        sent,
        failed,
        results,
        message: allSucceeded ? undefined : "Some messages failed.",
      },
    };
  },
};
