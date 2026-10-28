/**
 * Global settings, copy, languages (see `setting.model`, `words`, `general-settings`, `language`, `event-status`).
 */
import { getTableColumns } from "drizzle-orm";
import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

const v = (name: string, len: number) => varchar(name, { length: len });

export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  code: v("code", 128),
  display: text("display"),
  detail: text("detail"),
});

export const words = mysqlTable("words", {
  id: int("id").autoincrement().primaryKey(),
  code: v("code", 128),
  color: v("color", 64),
  display: text("display"),
  description: text("description"),
});

export const generalSettings = mysqlTable("general_settings", {
  id: int("id").autoincrement().primaryKey(),
  session_ttl_seconds: int("session_ttl_seconds"),
  theme_mode: v("theme_mode", 64),
  sidebar_color: v("sidebar_color", 128),
  alert_position: v("alert_position", 64),
});

export const languages = mysqlTable("languages", {
  id: int("id").autoincrement().primaryKey(),
  code: v("code", 32),
  dansk: v("dansk", 255),
  deutsch: v("deutsch", 255),
  english: v("english", 255),
  netherlands: v("netherlands", 255),
  polskie: v("polskie", 255),
  russian: v("russian", 255),
  chinese: v("chinese", 255),
});

export const eventStatus = mysqlTable("event_status", {
  id: int("id").autoincrement().primaryKey(),
  code: v("code", 128),
  display: v("display", 255),
  definition: text("definition"),
});

export const SETTINGS_COLUMNS = Object.keys(getTableColumns(settings)) as readonly (keyof typeof settings.$inferSelect)[];
export const WORDS_COLUMNS = Object.keys(getTableColumns(words)) as readonly (keyof typeof words.$inferSelect)[];
export const GENERAL_SETTINGS_COLUMNS = Object.keys(getTableColumns(generalSettings)) as readonly (keyof typeof generalSettings.$inferSelect)[];
export const LANGUAGES_COLUMNS = Object.keys(getTableColumns(languages)) as readonly (keyof typeof languages.$inferSelect)[];
export const EVENT_STATUS_COLUMNS = Object.keys(getTableColumns(eventStatus)) as readonly (keyof typeof eventStatus.$inferSelect)[];
