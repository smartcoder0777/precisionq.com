import "server-only";

import { getPool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { ensureMarketplacePaymentTables } from "./ensure-tables";
import { roundMoney } from "./fees";

export type WalletAccount = {
  id: number;
  user_id: number;
  currency: string;
  available_balance: number;
  held_balance: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getOrCreateWallet(userId: number, currency = "usd"): Promise<WalletAccount> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const cur = currency.trim().toLowerCase() || "usd";
  const [existing] = await pool.execute<RowDataPacket[]>(
    `SELECT id, user_id, currency, available_balance, held_balance
     FROM wallet_accounts WHERE user_id = ? AND currency = ? LIMIT 1`,
    [userId, cur],
  );
  if (existing[0]) {
    return {
      id: num(existing[0].id),
      user_id: num(existing[0].user_id),
      currency: String(existing[0].currency ?? cur),
      available_balance: num(existing[0].available_balance),
      held_balance: num(existing[0].held_balance),
    };
  }
  const [ins] = await pool.execute<ResultSetHeader>(
    `INSERT INTO wallet_accounts (user_id, currency, available_balance, held_balance, status)
     VALUES (?, ?, 0, 0, 'active')`,
    [userId, cur],
  );
  return {
    id: ins.insertId,
    user_id: userId,
    currency: cur,
    available_balance: 0,
    held_balance: 0,
  };
}

async function appendLedger(input: {
  walletId: number;
  userId: number;
  entryType: string;
  amount: number;
  balanceAfter: number;
  orderId?: number | null;
  withdrawalId?: number | null;
  note?: string | null;
}): Promise<void> {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO wallet_ledger
     (wallet_id, user_id, entry_type, amount, balance_after, order_id, withdrawal_id, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.walletId,
      input.userId,
      input.entryType,
      roundMoney(input.amount),
      roundMoney(input.balanceAfter),
      input.orderId ?? null,
      input.withdrawalId ?? null,
      input.note ?? null,
    ],
  );
}

/** Credit available balance (sale settlement). */
export async function creditWallet(input: {
  userId: number;
  amount: number;
  currency?: string;
  orderId?: number | null;
  note?: string;
}): Promise<WalletAccount> {
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw new Error("Credit amount must be positive.");
  const wallet = await getOrCreateWallet(input.userId, input.currency ?? "usd");
  const pool = getPool();
  const next = roundMoney(wallet.available_balance + amount);
  await pool.execute(
    `UPDATE wallet_accounts SET available_balance = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? LIMIT 1`,
    [next, wallet.id],
  );
  await appendLedger({
    walletId: wallet.id,
    userId: input.userId,
    entryType: "credit",
    amount,
    balanceAfter: next,
    orderId: input.orderId,
    note: input.note ?? "Sale credit",
  });
  return { ...wallet, available_balance: next };
}

/** Move available → held for a pending withdrawal. */
export async function holdWalletFunds(input: {
  userId: number;
  amount: number;
  currency?: string;
  withdrawalId: number;
  note?: string;
}): Promise<WalletAccount> {
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw new Error("Hold amount must be positive.");
  const wallet = await getOrCreateWallet(input.userId, input.currency ?? "usd");
  if (wallet.available_balance < amount) throw new Error("Insufficient available balance.");
  const pool = getPool();
  const available = roundMoney(wallet.available_balance - amount);
  const held = roundMoney(wallet.held_balance + amount);
  await pool.execute(
    `UPDATE wallet_accounts SET available_balance = ?, held_balance = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? LIMIT 1`,
    [available, held, wallet.id],
  );
  await appendLedger({
    walletId: wallet.id,
    userId: input.userId,
    entryType: "hold",
    amount: -amount,
    balanceAfter: available,
    withdrawalId: input.withdrawalId,
    note: input.note ?? "Withdrawal hold",
  });
  return { ...wallet, available_balance: available, held_balance: held };
}

/** Release held funds back to available (rejected withdrawal). */
export async function releaseWalletHold(input: {
  userId: number;
  amount: number;
  currency?: string;
  withdrawalId: number;
  note?: string;
}): Promise<WalletAccount> {
  const amount = roundMoney(input.amount);
  const wallet = await getOrCreateWallet(input.userId, input.currency ?? "usd");
  const pool = getPool();
  const available = roundMoney(wallet.available_balance + amount);
  const held = roundMoney(Math.max(0, wallet.held_balance - amount));
  await pool.execute(
    `UPDATE wallet_accounts SET available_balance = ?, held_balance = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? LIMIT 1`,
    [available, held, wallet.id],
  );
  await appendLedger({
    walletId: wallet.id,
    userId: input.userId,
    entryType: "release",
    amount,
    balanceAfter: available,
    withdrawalId: input.withdrawalId,
    note: input.note ?? "Withdrawal rejected — hold released",
  });
  return { ...wallet, available_balance: available, held_balance: held };
}

/** Finalize held funds as a completed withdrawal debit. */
export async function finalizeWalletHold(input: {
  userId: number;
  amount: number;
  currency?: string;
  withdrawalId: number;
  note?: string;
}): Promise<WalletAccount> {
  const amount = roundMoney(input.amount);
  const wallet = await getOrCreateWallet(input.userId, input.currency ?? "usd");
  const pool = getPool();
  const held = roundMoney(Math.max(0, wallet.held_balance - amount));
  await pool.execute(
    `UPDATE wallet_accounts SET held_balance = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? LIMIT 1`,
    [held, wallet.id],
  );
  await appendLedger({
    walletId: wallet.id,
    userId: input.userId,
    entryType: "debit",
    amount: -amount,
    balanceAfter: wallet.available_balance,
    withdrawalId: input.withdrawalId,
    note: input.note ?? "Withdrawal sent",
  });
  return { ...wallet, held_balance: held };
}

export async function listLedgerForUser(userId: number, limit = 100) {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM wallet_ledger WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
    [userId, limit],
  );
  return rows;
}

export async function listAllWallets(limit = 500) {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT w.*, TRIM(CONCAT(COALESCE(u.fname,''),' ',COALESCE(u.lname,''))) AS user_name, u.email AS user_email
     FROM wallet_accounts w
     LEFT JOIN users u ON u.id = w.user_id
     ORDER BY w.id DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}
