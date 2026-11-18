import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { randomBytes } from "node:crypto";
import { getPool } from "@/lib/db";
import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";

export type OrderRecord = RowDataPacket & {
  id: number;
  token: string | null;
  buyer_user_id: number | null;
  seller_user_id: number | null;
  clinic_id: number | null;
  product_service_id: number | null;
  amount: string | number | null;
  currency: string | null;
  method: string | null;
  status: string | null;
  payer_name: string | null;
  payer_email: string | null;
  payer_phone: string | null;
  provider: string | null;
  provider_ref: string | null;
  platform_fee: string | number | null;
  seller_net: string | number | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
};

export function newOrderToken(): string {
  return randomBytes(24).toString("hex");
}

export async function createOrder(input: {
  token: string;
  buyer_user_id: number | null;
  seller_user_id: number | null;
  clinic_id: number | null;
  product_service_id: number;
  amount: number;
  currency: string;
  method: string;
  status: string;
  payer_name: string | null;
  payer_email: string | null;
  payer_phone: string | null;
  provider: string | null;
  platform_fee: number;
  seller_net: number;
  product_name: string;
}): Promise<number> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO orders
     (token, buyer_user_id, seller_user_id, clinic_id, product_service_id, amount, currency, method, status,
      payer_name, payer_email, payer_phone, provider, platform_fee, seller_net)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.token,
      input.buyer_user_id,
      input.seller_user_id,
      input.clinic_id,
      input.product_service_id,
      input.amount,
      input.currency,
      input.method,
      input.status,
      input.payer_name,
      input.payer_email,
      input.payer_phone,
      input.provider,
      input.platform_fee,
      input.seller_net,
    ],
  );
  const orderId = result.insertId;
  await pool.execute(
    `INSERT INTO order_items (order_id, product_service_id, name, quantity, unit_price, line_total)
     VALUES (?, ?, ?, 1, ?, ?)`,
    [orderId, input.product_service_id, input.product_name, input.amount, input.amount],
  );
  return orderId;
}

export async function getOrderById(id: number): Promise<OrderRecord | null> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<OrderRecord[]>(`SELECT * FROM orders WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function getOrderByToken(token: string): Promise<OrderRecord | null> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<OrderRecord[]>(`SELECT * FROM orders WHERE token = ? LIMIT 1`, [token]);
  return rows[0] ?? null;
}

export async function getOrderByProviderRef(provider: string, ref: string): Promise<OrderRecord | null> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<OrderRecord[]>(
    `SELECT * FROM orders WHERE provider = ? AND provider_ref = ? LIMIT 1`,
    [provider, ref],
  );
  return rows[0] ?? null;
}

export async function updateOrderById(
  id: number,
  patch: Partial<{
    status: string;
    provider: string | null;
    provider_ref: string | null;
    method: string | null;
    payer_name: string | null;
    payer_email: string | null;
    payer_phone: string | null;
  }>,
): Promise<void> {
  await ensureMarketplacePaymentTables();
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const pool = getPool();
  const setClause = entries.map(([k]) => `\`${k}\` = ?`).join(", ");
  await pool.execute(`UPDATE orders SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? LIMIT 1`, [
    ...entries.map(([, v]) => v as string | number | null),
    id,
  ]);
}

export async function listOrders(limit = 200): Promise<OrderRecord[]> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<OrderRecord[]>(`SELECT * FROM orders ORDER BY id DESC LIMIT ?`, [limit]);
  return rows;
}
