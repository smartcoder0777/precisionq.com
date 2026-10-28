/**
 * Education, catalog, billing metadata, payments (`education.model`, `settings/*`, `payments.model`, `invoices.model`, `product-service.model`).
 */
import { getTableColumns, sql } from "drizzle-orm";
import { datetime, decimal, int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

const v = (name: string, len: number) => varchar(name, { length: len });

export const educations = mysqlTable("educations", {
  id: int("id").autoincrement().primaryKey(),
  page: v("page", 255),
  title_en: v("title_en", 512),
  title_es: v("title_es", 512),
  desc_en: text("desc_en"),
  desc_es: text("desc_es"),
  file_en: v("file_en", 1024),
  file_es: v("file_es", 1024),
  title_ar: v("title_ar", 512),
  title_da: v("title_da", 512),
  title_de: v("title_de", 512),
  title_fr: v("title_fr", 512),
  title_it: v("title_it", 512),
  title_ja: v("title_ja", 512),
  title_ko: v("title_ko", 512),
  title_nl: v("title_nl", 512),
  title_pt: v("title_pt", 512),
  title_ru: v("title_ru", 512),
  title_tr: v("title_tr", 512),
  title_zh: v("title_zh", 512),
  desc_ar: text("desc_ar"),
  desc_da: text("desc_da"),
  desc_de: text("desc_de"),
  desc_fr: text("desc_fr"),
  desc_it: text("desc_it"),
  desc_ja: text("desc_ja"),
  desc_ko: text("desc_ko"),
  desc_nl: text("desc_nl"),
  desc_pt: text("desc_pt"),
  desc_ru: text("desc_ru"),
  desc_tr: text("desc_tr"),
  desc_zh: text("desc_zh"),
  file_ar: v("file_ar", 1024),
  file_da: v("file_da", 1024),
  file_de: v("file_de", 1024),
  file_fr: v("file_fr", 1024),
  file_it: v("file_it", 1024),
  file_ja: v("file_ja", 1024),
  file_ko: v("file_ko", 1024),
  file_nl: v("file_nl", 1024),
  file_pt: v("file_pt", 1024),
  file_ru: v("file_ru", 1024),
  file_tr: v("file_tr", 1024),
  file_zh: v("file_zh", 1024),
  createdAt: datetime("createdAt", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const educationCategories = mysqlTable("education_categories", {
  id: int("id").autoincrement().primaryKey(),
  parent_menu: v("parent_menu", 255),
  text_ar: text("text_ar"),
  text_da: text("text_da"),
  text_de: text("text_de"),
  text_en: text("text_en"),
  text_es: text("text_es"),
  text_fr: text("text_fr"),
  text_it: text("text_it"),
  text_ja: text("text_ja"),
  text_ko: text("text_ko"),
  text_nl: text("text_nl"),
  text_pt: text("text_pt"),
  text_ru: text("text_ru"),
  text_tr: text("text_tr"),
  text_zh: text("text_zh"),
  status: int("status"),
});

export const productCategories = mysqlTable("product_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: v("name", 512),
  description: text("description"),
  type: v("type", 64),
  status: int("status"),
});

export const payTypes = mysqlTable("pay_types", {
  id: int("id").autoincrement().primaryKey(),
  type_code: v("type_code", 64),
  type_name: v("type_name", 255),
  description: text("description"),
  status: int("status"),
});

export const billingCycleCategories = mysqlTable("billing_cycle_categories", {
  id: int("id").autoincrement().primaryKey(),
  category_code: v("category_code", 64),
  category_name: v("category_name", 255),
  description: text("description"),
  status: int("status"),
});

export const paymentCycles = mysqlTable("payment_cycles", {
  id: int("id").autoincrement().primaryKey(),
  category_id: int("category_id"),
  cycle_code: v("cycle_code", 64),
  cycle_name: v("cycle_name", 255),
  interval_value: int("interval_value"),
  interval_unit: v("interval_unit", 32),
  is_recurring: int("is_recurring"),
  description: text("description"),
  status: int("status"),
});

export const productServices = mysqlTable("product_services", {
  id: int("id").autoincrement().primaryKey(),
  type: v("type", 64),
  category_id: int("category_id"),
  name: v("name", 512),
  short_description: text("short_description"),
  long_description: text("long_description"),
  base_price: decimal("base_price", { precision: 12, scale: 2 }),
  currency: v("currency", 16),
  is_subscription: int("is_subscription"),
  pay_type_id: int("pay_type_id"),
  payment_cycle_id: int("payment_cycle_id"),
  billing_cycle_category_id: int("billing_cycle_category_id"),
  discount_type: v("discount_type", 64),
  discount_value: decimal("discount_value", { precision: 12, scale: 2 }),
  tax_required: int("tax_required"),
  status: v("status", 64),
  images: text("images"),
  videos: text("videos"),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  order_id: int("order_id"),
  user_id: int("user_id"),
  stripe_payment_intent_id: v("stripe_payment_intent_id", 255),
  stripe_payment_method_id: v("stripe_payment_method_id", 255),
  name: v("name", 255),
  email: v("email", 255),
  phone: v("phone", 64),
  country: v("country", 128),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  currency: v("currency", 16),
  card_last4: v("card_last4", 16),
  card_exp_month: int("card_exp_month"),
  card_exp_year: int("card_exp_year"),
  status: v("status", 64),
  failure_reason: text("failure_reason"),
});

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  stripe_invoice_id: v("stripe_invoice_id", 255),
  stripe_payment_intent_id: v("stripe_payment_intent_id", 255),
  stripe_payment_method_id: v("stripe_payment_method_id", 255),
  order_id: int("order_id"),
  user_id: int("user_id"),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  customer_email: v("customer_email", 255),
  card_last4: v("card_last4", 16),
  currency: v("currency", 16),
  status: v("status", 64),
  invoice_pdf: text("invoice_pdf"),
});

export const EDUCATIONS_COLUMNS = Object.keys(getTableColumns(educations)) as readonly (keyof typeof educations.$inferSelect)[];
export const EDUCATION_CATEGORIES_COLUMNS = Object.keys(getTableColumns(educationCategories)) as readonly (keyof typeof educationCategories.$inferSelect)[];
export const PRODUCT_CATEGORIES_COLUMNS = Object.keys(getTableColumns(productCategories)) as readonly (keyof typeof productCategories.$inferSelect)[];
export const PAY_TYPES_COLUMNS = Object.keys(getTableColumns(payTypes)) as readonly (keyof typeof payTypes.$inferSelect)[];
export const BILLING_CYCLE_CATEGORIES_COLUMNS = Object.keys(getTableColumns(billingCycleCategories)) as readonly (keyof typeof billingCycleCategories.$inferSelect)[];
export const PAYMENT_CYCLES_COLUMNS = Object.keys(getTableColumns(paymentCycles)) as readonly (keyof typeof paymentCycles.$inferSelect)[];
export const PRODUCT_SERVICES_COLUMNS = Object.keys(getTableColumns(productServices)) as readonly (keyof typeof productServices.$inferSelect)[];
export const PAYMENTS_COLUMNS = Object.keys(getTableColumns(payments)) as readonly (keyof typeof payments.$inferSelect)[];
export const INVOICES_COLUMNS = Object.keys(getTableColumns(invoices)) as readonly (keyof typeof invoices.$inferSelect)[];
