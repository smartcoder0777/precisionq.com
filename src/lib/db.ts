import "server-only";
import mysql from "mysql2/promise";

const globalForMysql = globalThis as unknown as {
  mysqlPool: mysql.Pool | undefined;
};

export function isMysqlConfigured(): boolean {
  if (process.env.DATABASE_URL?.trim()) return true;
  if (process.env.MYSQL_DATABASE?.trim() && process.env.MYSQL_USER?.trim()) return true;
  if (process.env.DB_DATABASE?.trim() && process.env.DB_USERNAME?.trim()) return true;
  return false;
}

function createPool(): mysql.Pool {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    return mysql.createPool(databaseUrl);
  }

  const database = process.env.MYSQL_DATABASE?.trim() || process.env.DB_DATABASE?.trim();
  const user = process.env.MYSQL_USER?.trim() || process.env.DB_USERNAME?.trim();
  if (!database || !user) {
    throw new Error(
      "MySQL is not configured. Set DATABASE_URL, MYSQL_* variables, or DB_* variables in your environment.",
    );
  }

  return mysql.createPool({
    host: process.env.MYSQL_HOST?.trim() || process.env.DB_HOST?.trim() || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || process.env.DB_PORT) || 3306,
    user,
    password: process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? "",
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10,
    maxIdle: Number(process.env.MYSQL_MAX_IDLE) || 10,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
}

export function getPool(): mysql.Pool {
  if (!globalForMysql.mysqlPool) {
    globalForMysql.mysqlPool = createPool();
  }
  return globalForMysql.mysqlPool;
}
