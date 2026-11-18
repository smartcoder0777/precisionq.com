import "server-only";

import { getPool } from "@/lib/db";

let ensurePromise: Promise<void> | null = null;

async function addColumnIfMissing(table: string, column: string, ddl: string): Promise<void> {
  const pool = getPool();
  const [rows] = await pool.execute<{ cnt: number }[] & import("mysql2").RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  if (Number(rows[0]?.cnt ?? 0) > 0) return;
  await pool.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
}

/** Create marketplace tables and evolve payments/invoices for provider-agnostic rows. */
export async function ensureMarketplacePaymentTables(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const pool = getPool();

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS \`orders\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`token\` VARCHAR(64) NULL,
          \`buyer_user_id\` INT NULL,
          \`seller_user_id\` INT NULL,
          \`clinic_id\` INT NULL,
          \`product_service_id\` INT NULL,
          \`amount\` DECIMAL(12,2) NULL,
          \`currency\` VARCHAR(16) NULL,
          \`method\` VARCHAR(32) NULL,
          \`status\` VARCHAR(64) NULL,
          \`payer_name\` VARCHAR(255) NULL,
          \`payer_email\` VARCHAR(255) NULL,
          \`payer_phone\` VARCHAR(64) NULL,
          \`provider\` VARCHAR(32) NULL,
          \`provider_ref\` VARCHAR(255) NULL,
          \`platform_fee\` DECIMAL(12,2) NULL,
          \`seller_net\` DECIMAL(12,2) NULL,
          \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`orders_token_uq\` (\`token\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS \`order_items\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`order_id\` INT NULL,
          \`product_service_id\` INT NULL,
          \`name\` VARCHAR(512) NULL,
          \`quantity\` INT NULL DEFAULT 1,
          \`unit_price\` DECIMAL(12,2) NULL,
          \`line_total\` DECIMAL(12,2) NULL,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS \`wallet_accounts\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`user_id\` INT NULL,
          \`currency\` VARCHAR(16) NULL DEFAULT 'usd',
          \`available_balance\` DECIMAL(14,2) NULL DEFAULT 0,
          \`held_balance\` DECIMAL(14,2) NULL DEFAULT 0,
          \`status\` VARCHAR(32) NULL DEFAULT 'active',
          \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`wallet_user_currency_uq\` (\`user_id\`, \`currency\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS \`wallet_ledger\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`wallet_id\` INT NULL,
          \`user_id\` INT NULL,
          \`entry_type\` VARCHAR(32) NULL,
          \`amount\` DECIMAL(14,2) NULL,
          \`balance_after\` DECIMAL(14,2) NULL,
          \`order_id\` INT NULL,
          \`withdrawal_id\` INT NULL,
          \`note\` TEXT NULL,
          \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS \`withdrawals\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`user_id\` INT NULL,
          \`wallet_id\` INT NULL,
          \`amount\` DECIMAL(14,2) NULL,
          \`currency\` VARCHAR(16) NULL,
          \`asset\` VARCHAR(32) NULL,
          \`network\` VARCHAR(64) NULL,
          \`address\` VARCHAR(255) NULL,
          \`status\` VARCHAR(64) NULL,
          \`provider_ref\` VARCHAR(255) NULL,
          \`failure_reason\` TEXT NULL,
          \`reviewed_by\` INT NULL,
          \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS \`payment_settings\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`platform_fee_percent\` DECIMAL(8,4) NULL DEFAULT 10,
          \`platform_fee_flat\` DECIMAL(12,2) NULL DEFAULT 0,
          \`min_withdrawal\` DECIMAL(12,2) NULL DEFAULT 25,
          \`enable_card\` INT NULL DEFAULT 1,
          \`enable_bank\` INT NULL DEFAULT 1,
          \`enable_paypal\` INT NULL DEFAULT 1,
          \`enable_crypto_out\` INT NULL DEFAULT 1,
          \`updatedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS \`webhook_events\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`provider\` VARCHAR(32) NULL,
          \`event_id\` VARCHAR(255) NULL,
          \`event_type\` VARCHAR(128) NULL,
          \`processed\` INT NULL DEFAULT 0,
          \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`webhook_provider_event_uq\` (\`provider\`, \`event_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      const [settingsCount] = await pool.execute<import("mysql2").RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM \`payment_settings\``,
      );
      if (Number(settingsCount[0]?.c ?? 0) === 0) {
        await pool.execute(
          `INSERT INTO \`payment_settings\`
           (\`platform_fee_percent\`, \`platform_fee_flat\`, \`min_withdrawal\`, \`enable_card\`, \`enable_bank\`, \`enable_paypal\`, \`enable_crypto_out\`)
           VALUES (10, 0, 25, 1, 1, 1, 1)`,
        );
      }

      await addColumnIfMissing("payments", "order_id", "`order_id` INT NULL");
      await addColumnIfMissing("payments", "provider", "`provider` VARCHAR(32) NULL");
      await addColumnIfMissing("payments", "provider_ref", "`provider_ref` VARCHAR(255) NULL");
      await addColumnIfMissing("payments", "method", "`method` VARCHAR(32) NULL");
      await addColumnIfMissing("payments", "createdAt", "`createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP");

      await addColumnIfMissing("invoices", "order_id", "`order_id` INT NULL");
      await addColumnIfMissing("invoices", "provider", "`provider` VARCHAR(32) NULL");
      await addColumnIfMissing("invoices", "provider_ref", "`provider_ref` VARCHAR(255) NULL");
      await addColumnIfMissing("invoices", "method", "`method` VARCHAR(32) NULL");
      await addColumnIfMissing("invoices", "createdAt", "`createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP");
    })().catch((e) => {
      ensurePromise = null;
      throw e;
    });
  }
  await ensurePromise;
}
