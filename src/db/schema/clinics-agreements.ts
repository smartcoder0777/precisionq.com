/**
 * Clinics, payers, links, agreements (`clinic.model`, `insurance.model`, `clinic-insurance.model`, `agreement.model`).
 */
import { getTableColumns } from "drizzle-orm";
import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

const v = (name: string, len: number) => varchar(name, { length: len });

export const clinics = mysqlTable("clinics", {
  id: int("id").autoincrement().primaryKey(),
  clinic_id: int("clinic_id"),
  name: v("name", 512),
  acronym: v("acronym", 64),
  address1: v("address1", 255),
  address2: v("address2", 255),
  city: v("city", 128),
  state: v("state", 64),
  zip: v("zip", 32),
  phone: v("phone", 64),
  email: v("email", 255),
  web: v("web", 512),
  portal: v("portal", 512),
});

export const insurances = mysqlTable("insurances", {
  id: int("id").autoincrement().primaryKey(),
  name: v("name", 512),
  email: v("email", 255),
  phone: v("phone", 64),
  fax: v("fax", 64),
  address: v("address", 512),
  city: v("city", 128),
  state: v("state", 64),
  zip: v("zip", 32),
  status: int("status"),
  img: v("img", 1024),
});

export const clinicInsurances = mysqlTable("clinic_insurances", {
  id: int("id").autoincrement().primaryKey(),
  clinic_id: int("clinic_id"),
  insurance_id: int("insurance_id"),
  pt_portal_repid: int("pt_portal_repid"),
  pcp_portal_repid: int("pcp_portal_repid"),
  pt_eligib_repid: int("pt_eligib_repid"),
  hedis_repid: int("hedis_repid"),
  coverage_repid: int("coverage_repid"),
});

export const agreements = mysqlTable("agreements", {
  id: int("id").autoincrement().primaryKey(),
  clinic_id: int("clinic_id"),
  ar_name: v("ar_name", 512),
  ar_desc: text("ar_desc"),
  da_name: v("da_name", 512),
  da_desc: text("da_desc"),
  de_name: v("de_name", 512),
  de_desc: text("de_desc"),
  en_name: v("en_name", 512),
  en_desc: text("en_desc"),
  es_name: v("es_name", 512),
  es_desc: text("es_desc"),
  fr_name: v("fr_name", 512),
  fr_desc: text("fr_desc"),
  it_name: v("it_name", 512),
  it_desc: text("it_desc"),
  ja_name: v("ja_name", 512),
  ja_desc: text("ja_desc"),
  ko_name: v("ko_name", 512),
  ko_desc: text("ko_desc"),
  nl_name: v("nl_name", 512),
  nl_desc: text("nl_desc"),
  pt_name: v("pt_name", 512),
  pt_desc: text("pt_desc"),
  ru_name: v("ru_name", 512),
  ru_desc: text("ru_desc"),
  tr_name: v("tr_name", 512),
  tr_desc: text("tr_desc"),
  zh_name: v("zh_name", 512),
  zh_desc: text("zh_desc"),
  type: v("type", 64),
  completed: int("completed"),
  status: int("status"),
});

export const CLINICS_COLUMNS = Object.keys(getTableColumns(clinics)) as readonly (keyof typeof clinics.$inferSelect)[];
export const INSURANCES_COLUMNS = Object.keys(getTableColumns(insurances)) as readonly (keyof typeof insurances.$inferSelect)[];
export const CLINIC_INSURANCES_COLUMNS = Object.keys(getTableColumns(clinicInsurances)) as readonly (keyof typeof clinicInsurances.$inferSelect)[];
export const AGREEMENTS_COLUMNS = Object.keys(getTableColumns(agreements)) as readonly (keyof typeof agreements.$inferSelect)[];
