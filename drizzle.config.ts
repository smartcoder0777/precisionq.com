import { defineConfig } from "drizzle-kit";

/**
 * Build MySQL URL the same way as app runtime (`src/lib/db.ts`) so `drizzle-kit push` works
 * with either DATABASE_URL or MYSQL_* / DB_* variables.
 */
function databaseUrl(): string {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  const host = process.env.MYSQL_HOST?.trim() || process.env.DB_HOST?.trim() || "127.0.0.1";
  const port = process.env.MYSQL_PORT?.trim() || process.env.DB_PORT?.trim() || "3306";
  const user = encodeURIComponent(process.env.MYSQL_USER?.trim() || process.env.DB_USERNAME?.trim() || "");
  const password = encodeURIComponent(process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? "");
  const database = process.env.MYSQL_DATABASE?.trim() || process.env.DB_DATABASE?.trim() || "";
  if (!database) {
    throw new Error(
      "Set DATABASE_URL or MYSQL_DATABASE (and MYSQL_USER) / DB_DATABASE (and DB_USERNAME) for drizzle-kit.",
    );
  }
  const auth = password ? `${user}:${password}` : user;
  return `mysql://${auth}@${host}:${port}/${database}`;
}

export default defineConfig({
  schema: "./src/db/schema/**/*.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: databaseUrl(),
  },
  strict: true,
});
