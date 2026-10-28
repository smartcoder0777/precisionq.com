import "server-only";

import mysql from "mysql2/promise";

const globalForConector = globalThis as unknown as {
  conectorMysqlPool: mysql.Pool | undefined;
};

/** Azul / Conector Health clinic database (`pqnyrosja_ch` on production). */
export function isConectorDbConfigured(): boolean {
  const database =
    process.env.CONECTOR_DB_DATABASE?.trim() ||
    process.env.CONECTOR_DB_NAME?.trim();
  const user =
    process.env.CONECTOR_DB_USER?.trim() ||
    process.env.CONECTOR_DB_USERNAME?.trim();
  return Boolean(database && user);
}

export function getConectorPool(): mysql.Pool | null {
  if (!isConectorDbConfigured()) return null;

  if (!globalForConector.conectorMysqlPool) {
    const database =
      process.env.CONECTOR_DB_DATABASE?.trim() ||
      process.env.CONECTOR_DB_NAME?.trim() ||
      "";
    const user =
      process.env.CONECTOR_DB_USER?.trim() ||
      process.env.CONECTOR_DB_USERNAME?.trim() ||
      "";
    if (!database || !user) return null;
    const host =
      process.env.CONECTOR_DB_HOST?.trim() ||
      process.env.MYSQL_HOST?.trim() ||
      process.env.DB_HOST?.trim() ||
      "127.0.0.1";
    const port =
      Number(process.env.CONECTOR_DB_PORT || process.env.MYSQL_PORT || process.env.DB_PORT) || 3306;
    const password =
      process.env.CONECTOR_DB_PASSWORD ??
      process.env.CONECTOR_DB_PASS ??
      "";

    globalForConector.conectorMysqlPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 5,
      idleTimeout: 60_000,
      enableKeepAlive: true,
    });
  }

  return globalForConector.conectorMysqlPool;
}
