/**
 * Controller: orchestrates models and shapes API responses (no React).
 */
import * as HealthModel from "@/models/health.model";

export type HttpResult<T extends object> = { status: number; body: T };

export const healthController = {
  getAppHealth(): HttpResult<{ ok: boolean; service: string }> {
    return {
      status: 200,
      body: { ok: true, service: "care-hub-api" },
    };
  },

  async getDatabaseHealth(): Promise<
    HttpResult<{
      ok: boolean;
      database: string;
      ping?: boolean;
      hint?: string;
      message?: string;
    }>
  > {
    const result = await HealthModel.pingDatabase();

    if (result.success) {
      return {
        status: 200,
        body: {
          ok: true,
          database: "connected",
          ping: result.ping,
        },
      };
    }

    if (result.code === "not_configured") {
      return {
        status: 503,
        body: {
          ok: false,
          database: "not_configured",
          hint: "Set DATABASE_URL or MYSQL_* variables (see .env.example).",
        },
      };
    }

    return {
      status: 503,
      body: {
        ok: false,
        database: "error",
        message: result.message,
      },
    };
  },
};
