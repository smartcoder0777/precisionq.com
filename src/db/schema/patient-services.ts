/**
 * Patient-facing service catalog (`patient-service-category.model`, `patient-service.model`).
 */
import { getTableColumns } from "drizzle-orm";
import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

const v = (name: string, len: number) => varchar(name, { length: len });

export const patientServiceCats = mysqlTable("patient_service_cats", {
  id: int("id").autoincrement().primaryKey(),
  ar_name: v("ar_name", 512),
  da_name: v("da_name", 512),
  de_name: v("de_name", 512),
  en_name: v("en_name", 512),
  es_name: v("es_name", 512),
  fr_name: v("fr_name", 512),
  it_name: v("it_name", 512),
  ja_name: v("ja_name", 512),
  ko_name: v("ko_name", 512),
  nl_name: v("nl_name", 512),
  pt_name: v("pt_name", 512),
  ru_name: v("ru_name", 512),
  tr_name: v("tr_name", 512),
  zh_name: v("zh_name", 512),
  status: int("status"),
});

export const patientServices = mysqlTable("patient_services", {
  id: int("id").autoincrement().primaryKey(),
  category_id: int("category_id"),
  ar_name: v("ar_name", 512),
  da_name: v("da_name", 512),
  de_name: v("de_name", 512),
  en_name: v("en_name", 512),
  es_name: v("es_name", 512),
  fr_name: v("fr_name", 512),
  it_name: v("it_name", 512),
  ja_name: v("ja_name", 512),
  ko_name: v("ko_name", 512),
  nl_name: v("nl_name", 512),
  pt_name: v("pt_name", 512),
  ru_name: v("ru_name", 512),
  tr_name: v("tr_name", 512),
  zh_name: v("zh_name", 512),
  image: v("image", 768),
  ar_desc: text("ar_desc"),
  da_desc: text("da_desc"),
  de_desc: text("de_desc"),
  en_desc: text("en_desc"),
  es_desc: text("es_desc"),
  fr_desc: text("fr_desc"),
  it_desc: text("it_desc"),
  ja_desc: text("ja_desc"),
  ko_desc: text("ko_desc"),
  nl_desc: text("nl_desc"),
  pt_desc: text("pt_desc"),
  ru_desc: text("ru_desc"),
  tr_desc: text("tr_desc"),
  zh_desc: text("zh_desc"),
  ar_detail: text("ar_detail"),
  da_detail: text("da_detail"),
  de_detail: text("de_detail"),
  en_detail: text("en_detail"),
  es_detail: text("es_detail"),
  fr_detail: text("fr_detail"),
  it_detail: text("it_detail"),
  ja_detail: text("ja_detail"),
  ko_detail: text("ko_detail"),
  nl_detail: text("nl_detail"),
  pt_detail: text("pt_detail"),
  ru_detail: text("ru_detail"),
  tr_detail: text("tr_detail"),
  zh_detail: text("zh_detail"),
  contact: v("contact", 512),
  status: int("status"),
});

export const PATIENT_SERVICE_CATS_COLUMNS = Object.keys(
  getTableColumns(patientServiceCats),
) as readonly (keyof typeof patientServiceCats.$inferSelect)[];

export const PATIENT_SERVICES_COLUMNS = Object.keys(
  getTableColumns(patientServices),
) as readonly (keyof typeof patientServices.$inferSelect)[];
