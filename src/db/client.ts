import "server-only";

import { drizzle } from "drizzle-orm/mysql2";

import { getPool } from "@/lib/db";
import { drizzleSchema } from "./schema-tables";

/** Typed Drizzle client (MySQL pool from `@/lib/db`). */
export const db = drizzle(getPool(), { schema: drizzleSchema, mode: "default" });

export type Database = typeof db;
