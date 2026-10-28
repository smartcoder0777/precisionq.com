/**
 * Survey builder and delivery (`survey.model`, `survey-view.model`, `settings/survey-*.model`).
 *
 * **Note:** Some legacy databases use `surveys.language_id` instead of `surveys.lang_id`.
 * The app detects this at runtime (`getSurveyLanguageColumn`). New installs should use `lang_id`.
 */
import { getTableColumns } from "drizzle-orm";
import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

const v = (name: string, len: number) => varchar(name, { length: len });

export const surveys = mysqlTable("surveys", {
  id: int("id").autoincrement().primaryKey(),
  /** Preferred FK to `languages.id` on new databases. */
  lang_id: int("lang_id"),
  /** Legacy column name; `survey.model` uses whichever exists at runtime. */
  language_id: int("language_id"),
  cate_id: int("cate_id"),
  type_id: int("type_id"),
  name: v("name", 512),
  desc: text("desc"),
  page_length: int("page_length"),
  status: int("status"),
});

export const surveyViews = mysqlTable("survey_views", {
  id: int("id").autoincrement().primaryKey(),
  survey_id: int("survey_id"),
  completed: int("completed"),
  lang_id: int("lang_id"),
  view: text("view"),
});

export const surveyCategories = mysqlTable("survey_categories", {
  id: int("id").autoincrement().primaryKey(),
  name_ar: v("name_ar", 512),
  name_da: v("name_da", 512),
  name_de: v("name_de", 512),
  name_en: v("name_en", 512),
  name_es: v("name_es", 512),
  name_fr: v("name_fr", 512),
  name_it: v("name_it", 512),
  name_ja: v("name_ja", 512),
  name_ko: v("name_ko", 512),
  name_nl: v("name_nl", 512),
  name_pt: v("name_pt", 512),
  name_ru: v("name_ru", 512),
  name_tr: v("name_tr", 512),
  name_zh: v("name_zh", 512),
  e_status: int("e_status"),
  status: int("status"),
});

export const surveyTypes = mysqlTable("survey_types", {
  id: int("id").autoincrement().primaryKey(),
  name_ar: v("name_ar", 512),
  name_da: v("name_da", 512),
  name_de: v("name_de", 512),
  name_en: v("name_en", 512),
  name_es: v("name_es", 512),
  name_fr: v("name_fr", 512),
  name_it: v("name_it", 512),
  name_ja: v("name_ja", 512),
  name_ko: v("name_ko", 512),
  name_nl: v("name_nl", 512),
  name_pt: v("name_pt", 512),
  name_ru: v("name_ru", 512),
  name_tr: v("name_tr", 512),
  name_zh: v("name_zh", 512),
  status: int("status"),
});

export const surveyResponses = mysqlTable("survey_responses", {
  id: int("id").autoincrement().primaryKey(),
  key: v("key", 128),
  lang_id: int("lang_id"),
  items: text("items"),
  status: int("status"),
  required: int("required"),
});

export const surveyQuestions = mysqlTable("survey_questions", {
  id: int("id").autoincrement().primaryKey(),
  response_id: int("response_id"),
  survey_id: int("survey_id"),
  language_id: int("language_id"),
  text: text("text"),
  choice_text: text("choice_text"),
  required: int("required"),
  status: int("status"),
});

export const surveyExpirations = mysqlTable("survey_expirations", {
  id: int("id").autoincrement().primaryKey(),
  expired_id: v("expired_id", 128),
  route: v("route", 512),
  status: int("status"),
});

export const surveyFeedbacks = mysqlTable("survey_feedbacks", {
  id: int("id").autoincrement().primaryKey(),
  ques_id: int("ques_id"),
  resp_id: int("resp_id"),
  resp_type: v("resp_type", 64),
  response: text("response"),
});

export const surveyFooter = mysqlTable("survey_footer", {
  id: int("id").autoincrement().primaryKey(),
  lang_id: int("lang_id"),
  footer: text("footer"),
});

export const surveyQuesTypes = mysqlTable("survey_ques_types", {
  id: int("id").autoincrement().primaryKey(),
  code: v("code", 64),
  display_en: v("display_en", 255),
  display_es: v("display_es", 255),
  type: v("type", 64),
  field_value: text("field_value"),
});

export const SURVEYS_COLUMNS = Object.keys(getTableColumns(surveys)) as readonly (keyof typeof surveys.$inferSelect)[];
export const SURVEY_VIEWS_COLUMNS = Object.keys(getTableColumns(surveyViews)) as readonly (keyof typeof surveyViews.$inferSelect)[];
export const SURVEY_CATEGORIES_COLUMNS = Object.keys(getTableColumns(surveyCategories)) as readonly (keyof typeof surveyCategories.$inferSelect)[];
export const SURVEY_TYPES_COLUMNS = Object.keys(getTableColumns(surveyTypes)) as readonly (keyof typeof surveyTypes.$inferSelect)[];
export const SURVEY_RESPONSES_COLUMNS = Object.keys(getTableColumns(surveyResponses)) as readonly (keyof typeof surveyResponses.$inferSelect)[];
export const SURVEY_QUESTIONS_COLUMNS = Object.keys(getTableColumns(surveyQuestions)) as readonly (keyof typeof surveyQuestions.$inferSelect)[];
export const SURVEY_EXPIRATIONS_COLUMNS = Object.keys(getTableColumns(surveyExpirations)) as readonly (keyof typeof surveyExpirations.$inferSelect)[];
export const SURVEY_FEEDBACKS_COLUMNS = Object.keys(getTableColumns(surveyFeedbacks)) as readonly (keyof typeof surveyFeedbacks.$inferSelect)[];
export const SURVEY_FOOTER_COLUMNS = Object.keys(getTableColumns(surveyFooter)) as readonly (keyof typeof surveyFooter.$inferSelect)[];
export const SURVEY_QUES_TYPES_COLUMNS = Object.keys(getTableColumns(surveyQuesTypes)) as readonly (keyof typeof surveyQuesTypes.$inferSelect)[];
