/**
 * Marketplace orders, wallets, withdrawals, payment settings.
 */
import { getTableColumns, sql } from "drizzle-orm";
import { datetime, decimal, int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

const v = (name: string, len: number) => varchar(name, { length: len });

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  token: v("token", 64),
  buyer_user_id: int("buyer_user_id"),
  seller_user_id: int("seller_user_id"),
  clinic_id: int("clinic_id"),
  product_service_id: int("product_service_id"),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  currency: v("currency", 16),
  method: v("method", 32),
  status: v("status", 64),
  payer_name: v("payer_name", 255),
  payer_email: v("payer_email", 255),
  payer_phone: v("payer_phone", 64),
  provider: v("provider", 32),
  provider_ref: v("provider_ref", 255),
  platform_fee: decimal("platform_fee", { precision: 12, scale: 2 }),
  seller_net: decimal("seller_net", { precision: 12, scale: 2 }),
  createdAt: datetime("createdAt", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  order_id: int("order_id"),
  product_service_id: int("product_service_id"),
  name: v("name", 512),
  quantity: int("quantity"),
  unit_price: decimal("unit_price", { precision: 12, scale: 2 }),
  line_total: decimal("line_total", { precision: 12, scale: 2 }),
});

export const walletAccounts = mysqlTable("wallet_accounts", {
  id: int("id").autoincrement().primaryKey(),
  user_id: int("user_id"),
  currency: v("currency", 16),
  available_balance: decimal("available_balance", { precision: 14, scale: 2 }),
  held_balance: decimal("held_balance", { precision: 14, scale: 2 }),
  status: v("status", 32),
  createdAt: datetime("createdAt", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const walletLedger = mysqlTable("wallet_ledger", {
  id: int("id").autoincrement().primaryKey(),
  wallet_id: int("wallet_id"),
  user_id: int("user_id"),
  entry_type: v("entry_type", 32),
  amount: decimal("amount", { precision: 14, scale: 2 }),
  balance_after: decimal("balance_after", { precision: 14, scale: 2 }),
  order_id: int("order_id"),
  withdrawal_id: int("withdrawal_id"),
  note: text("note"),
  createdAt: datetime("createdAt", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const withdrawals = mysqlTable("withdrawals", {
  id: int("id").autoincrement().primaryKey(),
  user_id: int("user_id"),
  wallet_id: int("wallet_id"),
  amount: decimal("amount", { precision: 14, scale: 2 }),
  currency: v("currency", 16),
  asset: v("asset", 32),
  network: v("network", 64),
  address: v("address", 255),
  status: v("status", 64),
  provider_ref: v("provider_ref", 255),
  failure_reason: text("failure_reason"),
  reviewed_by: int("reviewed_by"),
  createdAt: datetime("createdAt", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const paymentSettings = mysqlTable("payment_settings", {
  id: int("id").autoincrement().primaryKey(),
  platform_fee_percent: decimal("platform_fee_percent", { precision: 8, scale: 4 }),
  platform_fee_flat: decimal("platform_fee_flat", { precision: 12, scale: 2 }),
  min_withdrawal: decimal("min_withdrawal", { precision: 12, scale: 2 }),
  enable_card: int("enable_card"),
  enable_bank: int("enable_bank"),
  enable_paypal: int("enable_paypal"),
  enable_crypto_out: int("enable_crypto_out"),
  updatedAt: datetime("updatedAt", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const webhookEvents = mysqlTable("webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  provider: v("provider", 32),
  event_id: v("event_id", 255),
  event_type: v("event_type", 128),
  processed: int("processed"),
  createdAt: datetime("createdAt", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const ORDERS_COLUMNS = Object.keys(getTableColumns(orders)) as readonly (keyof typeof orders.$inferSelect)[];
export const ORDER_ITEMS_COLUMNS = Object.keys(getTableColumns(orderItems)) as readonly (keyof typeof orderItems.$inferSelect)[];
export const WALLET_ACCOUNTS_COLUMNS = Object.keys(getTableColumns(walletAccounts)) as readonly (keyof typeof walletAccounts.$inferSelect)[];
export const WALLET_LEDGER_COLUMNS = Object.keys(getTableColumns(walletLedger)) as readonly (keyof typeof walletLedger.$inferSelect)[];
export const WITHDRAWALS_COLUMNS = Object.keys(getTableColumns(withdrawals)) as readonly (keyof typeof withdrawals.$inferSelect)[];
export const PAYMENT_SETTINGS_COLUMNS = Object.keys(getTableColumns(paymentSettings)) as readonly (keyof typeof paymentSettings.$inferSelect)[];
export const WEBHOOK_EVENTS_COLUMNS = Object.keys(getTableColumns(webhookEvents)) as readonly (keyof typeof webhookEvents.$inferSelect)[];
