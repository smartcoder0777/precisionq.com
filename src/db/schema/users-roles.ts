/**
 * Auth-related tables (see `src/models/user.model.ts`, `src/models/settings/role*.ts`).
 * Run `npm run db:push` after edits.
 */
import { getTableColumns } from "drizzle-orm";
import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

const v = (name: string, len: number) => varchar(name, { length: len });

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  fname: v("fname", 255),
  lname: v("lname", 255),
  email: v("email", 255),
  phone: v("phone", 64),
  fax: v("fax", 64),
  address: v("address", 512),
  city: v("city", 128),
  state: v("state", 64),
  zip: v("zip", 32),
  role_id: int("role_id"),
  password: v("password", 255),
  status: int("status"),
  resetToken: v("resetToken", 255),
  resetTokenExpiry: varchar("resetTokenExpiry", { length: 64 }),
  /** Often JSON or comma-separated clinic ids; shape is app-defined. */
  clinics: text("clinics"),
  /** Present on some deployments; optional profile image path. */
  photo: v("photo", 1024),
});

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  code: v("code", 128),
  name: v("name", 255),
  description: text("description"),
});

export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  name: v("name", 255),
  description: text("description"),
});

export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  role_id: int("role_id"),
  page_key: v("page_key", 128),
  action_key: v("action_key", 128),
  value: int("value"),
});

export const securityQuestions = mysqlTable("security_questions", {
  id: int("id").autoincrement().primaryKey(),
  question: text("question"),
  status: int("status"),
});

export const userSecurities = mysqlTable("user_securities", {
  id: int("id").autoincrement().primaryKey(),
  user_id: int("user_id"),
  question_id: int("question_id"),
  answer: text("answer"),
});

/** Columns used for INSERT/SELECT in models; `photo` is omitted because some DBs lack that column (see `user.model`). */
export const USERS_COLUMNS_CRUD = Object.keys(getTableColumns(users)).filter(
  (c) => c !== "photo",
) as readonly Exclude<keyof typeof users.$inferSelect, "photo">[];

export const ROLES_COLUMNS = Object.keys(getTableColumns(roles)) as readonly (keyof typeof roles.$inferSelect)[];
export const PERMISSIONS_COLUMNS = Object.keys(getTableColumns(permissions)) as readonly (keyof typeof permissions.$inferSelect)[];
export const ROLE_PERMISSIONS_COLUMNS = Object.keys(getTableColumns(rolePermissions)) as readonly (keyof typeof rolePermissions.$inferSelect)[];
export const SECURITY_QUESTIONS_COLUMNS = Object.keys(getTableColumns(securityQuestions)) as readonly (keyof typeof securityQuestions.$inferSelect)[];
export const USER_SECURITIES_COLUMNS = Object.keys(getTableColumns(userSecurities)) as readonly (keyof typeof userSecurities.$inferSelect)[];
