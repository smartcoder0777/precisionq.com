/**
 * Drizzle MySQL schema — single source of truth for table shapes used with `drizzle-kit`
 * (`npm run db:push` / `db:generate` / `db:studio`).
 *
 * Runtime data access mostly lives in `src/models/*`; models import `*_COLUMNS` from these
 * modules so `SELECT`/`INSERT` column lists stay aligned with the schema.
 *
 * The `surveys` table includes both `lang_id` and `language_id` in DDL so Drizzle matches
 * legacy and new installs; `src/models/survey.model.ts` still detects which column the DB
 * actually uses for reads/writes when only one exists.
 *
 * All table instances are aggregated in `src/db/schema-tables.ts` (`drizzleSchema`) for the
 * Drizzle client; this barrel also exports `*_COLUMNS` helpers used by models.
 */
export * from "./community";
export * from "./users-roles";
export * from "./settings-ref";
export * from "./clinics-agreements";
export * from "./patient-services";
export * from "./education-products";
export * from "./surveys";
export * from "./tickets-contact";
