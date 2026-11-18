import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";

export type InvoicesRecord = RowDataPacket & {
  id: number;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_method_id: string | null;
  order_id: number | null;
  user_id: number | null;
  provider?: string | null;
  provider_ref?: string | null;
  method?: string | null;
  amount: number | string | null;
  customer_email: string | null;
  card_last4: string | null;
  currency: string | null;
  status: string | null;
  invoice_pdf: string | null;
  createdAt?: string | Date | null;
};

export type CreateInvoicesInput = {
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_method_id: string | null;
  order_id: number | null;
  user_id: number | null;
  provider?: string | null;
  provider_ref?: string | null;
  method?: string | null;
  amount: number | string | null;
  customer_email: string | null;
  card_last4: string | null;
  currency: string | null;
  status: string | null;
  invoice_pdf: string | null;
};

export async function getAllInvoices(): Promise<InvoicesRecord[]> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<InvoicesRecord[]>(`SELECT * FROM invoices ORDER BY id DESC`);
  return rows;
}

export async function getInvoicesById(id: number): Promise<InvoicesRecord | null> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<InvoicesRecord[]>(`SELECT * FROM invoices WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function createInvoices(payload: CreateInvoicesInput): Promise<number> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO invoices
     (stripe_invoice_id, stripe_payment_intent_id, stripe_payment_method_id, order_id, user_id,
      provider, provider_ref, method, amount, customer_email, card_last4, currency, status, invoice_pdf)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.stripe_invoice_id,
      payload.stripe_payment_intent_id,
      payload.stripe_payment_method_id,
      payload.order_id,
      payload.user_id,
      payload.provider ?? null,
      payload.provider_ref ?? null,
      payload.method ?? null,
      payload.amount,
      payload.customer_email,
      payload.card_last4,
      payload.currency,
      payload.status,
      payload.invoice_pdf,
    ],
  );
  return result.insertId;
}
