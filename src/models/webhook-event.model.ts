import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";

/** Returns true if this is the first time we see the event (should process). */
export async function claimWebhookEvent(provider: string, eventId: string, eventType: string): Promise<boolean> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  try {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO webhook_events (provider, event_id, event_type, processed) VALUES (?, ?, ?, 0)`,
      [provider, eventId, eventType],
    );
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("duplicate")) return false;
    throw e;
  }
}

export async function markWebhookProcessed(provider: string, eventId: string): Promise<void> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  await pool.execute(
    `UPDATE webhook_events SET processed = 1 WHERE provider = ? AND event_id = ? LIMIT 1`,
    [provider, eventId],
  );
}

export async function webhookExists(provider: string, eventId: string): Promise<boolean> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM webhook_events WHERE provider = ? AND event_id = ? LIMIT 1`,
    [provider, eventId],
  );
  return Boolean(rows[0]);
}
