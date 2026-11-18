import { getAuthSession, touchAuthSession } from "@/lib/auth-session";
import { canViewAllTickets } from "@/lib/ticket-access";
import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";
import { getOrCreateWallet, listAllWallets, listLedgerForUser } from "@/lib/payments/ledger";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";

async function unauthorized(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 401, body: { ok: false, message: "Unauthorized." } };
}

export const walletController = {
  async mine(): Promise<
    HttpResult<{
      ok: boolean;
      message?: string;
      wallet?: { id: number; available: number; held: number; currency: string };
      ledger?: unknown[];
    }>
  > {
    await ensureMarketplacePaymentTables();
    const session = await getAuthSession();
    if (!session) return unauthorized();
    await touchAuthSession(session);
    const denied = await requireRolePermission(session, "wallet", "view");
    if (denied) return denied;

    const wallet = await getOrCreateWallet(session.userId, "usd");
    const ledger = await listLedgerForUser(session.userId, 100);
    return {
      status: 200,
      body: {
        ok: true,
        wallet: {
          id: wallet.id,
          available: wallet.available_balance,
          held: wallet.held_balance,
          currency: wallet.currency,
        },
        ledger,
      },
    };
  },

  async listAll(): Promise<HttpResult<{ ok: boolean; message?: string; wallets?: unknown[] }>> {
    await ensureMarketplacePaymentTables();
    const session = await getAuthSession();
    if (!session) return unauthorized();
    await touchAuthSession(session);
    const denied = await requireRolePermission(session, "wallet", "view");
    if (denied) return denied;
    const elevated = await canViewAllTickets(session);
    if (!elevated) {
      return { status: 403, body: { ok: false, message: "Managers and admins only." } };
    }
    const wallets = await listAllWallets();
    return { status: 200, body: { ok: true, wallets } };
  },
};
