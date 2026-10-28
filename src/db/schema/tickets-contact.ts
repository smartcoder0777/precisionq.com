/**
 * Internal tickets and public contact tracking (`ticket.model`, `contact-track.model`).
 */
import { getTableColumns, sql } from "drizzle-orm";
import { datetime, int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

const v = (name: string, len: number) => varchar(name, { length: len });

export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  user_id: int("user_id"),
  clinic_id: int("clinic_id"),
  type: int("type"),
  reason: text("reason"),
  message: text("message"),
  assigned_to: int("assigned_to"),
  backup_assigned: int("backup_assigned"),
  priority: int("priority"),
  status: int("status"),
  createdAt: datetime("createdAt", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const contactTracks = mysqlTable("contact_tracks", {
  id: int("id").autoincrement().primaryKey(),
  case_number: int("case_number"),
  clinic: v("clinic", 255),
  type: int("type"),
  reason: text("reason"),
  name: v("name", 255),
  dob: varchar("dob", { length: 32 }),
  email: v("email", 255),
  cel: v("cel", 64),
  subject: v("subject", 512),
  message: text("message"),
  date: datetime("date", { mode: "string" }),
  assign: v("assign", 255),
  status: int("status"),
  priority: int("priority"),
  lang: v("lang", 32),
  besttime: varchar("besttime", { length: 64 }),
});

export const TICKETS_COLUMNS = Object.keys(getTableColumns(tickets)) as readonly (keyof typeof tickets.$inferSelect)[];
export const CONTACT_TRACKS_COLUMNS = Object.keys(getTableColumns(contactTracks)) as readonly (keyof typeof contactTracks.$inferSelect)[];
