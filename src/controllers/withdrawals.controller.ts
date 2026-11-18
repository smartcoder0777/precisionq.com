import { getAuthSession, touchAuthSession } from "@/lib/auth-session";
import { canViewAllTickets } from "@/lib/ticket-access";
import { listTicketAdminRecipients } from "@/lib/ticket-access";
import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";
import {
  finalizeWalletHold,
  getOrCreateWallet,
  holdWalletFunds,
  releaseWalletHold,
} from "@/lib/payments/ledger";
import { createCircleUsdcTransfer, isCircleConfigured, isValidPolygonAddress } from "@/lib/payments/circle";
import { sendSurveyEmail, isSmtpConfigured } from "@/lib/survey-delivery";
import * as PaymentSettingsModel from "@/models/payment-settings.model";
import * as UserModel from "@/models/user.model";
import * as WithdrawalModel from "@/models/withdrawal.model";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";

async function unauthorized(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 401, body: { ok: false, message: "Unauthorized." } };
}

async function notifyWithdrawal(subject: string, html: string, userEmail: string | null) {
  if (!isSmtpConfigured()) return;
  const admins = await listTicketAdminRecipients();
  const to = [...new Set([userEmail, ...admins.map((a) => a.email)].filter(Boolean) as string[])];
  if (to.length === 0) return;
  await sendSurveyEmail({ to: to.join(","), subject, html, text: html.replace(/<[^>]+>/g, " ") });
}

export const withdrawalsController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    await ensureMarketplacePaymentTables();
    const session = await getAuthSession();
    if (!session) return unauthorized();
    await touchAuthSession(session);
    const denied = await requireRolePermission(session, "withdrawals", "create");
    if (denied) return denied;

    const settings = await PaymentSettingsModel.getPaymentSettings();
    if (Number(settings?.enable_crypto_out ?? 1) !== 1) {
      return { status: 400, body: { ok: false, message: "Crypto withdrawals are disabled." } };
    }

    const amount = Number(input.amount);
    const address = String(input.address ?? "").trim();
    const min = Number(settings?.min_withdrawal ?? 25);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: 400, body: { ok: false, message: "Amount is required." } };
    }
    if (amount < min) {
      return { status: 400, body: { ok: false, message: `Minimum withdrawal is ${min}.` } };
    }
    if (!isValidPolygonAddress(address)) {
      return { status: 400, body: { ok: false, message: "Enter a valid Polygon (0x) address." } };
    }

    try {
      const wallet = await getOrCreateWallet(session.userId, "usd");
      if (wallet.available_balance < amount) {
        return { status: 400, body: { ok: false, message: "Insufficient available balance." } };
      }
      const id = await WithdrawalModel.createWithdrawal({
        user_id: session.userId,
        wallet_id: wallet.id,
        amount,
        currency: "usd",
        asset: "USDC",
        network: "polygon",
        address,
        status: "pending",
      });
      await holdWalletFunds({
        userId: session.userId,
        amount,
        withdrawalId: id,
        note: `Withdrawal #${id} hold`,
      });

      const user = await UserModel.getUserById(session.userId);
      void notifyWithdrawal(
        `Withdrawal request #${id}`,
        `<p>User ${user?.email ?? session.userId} requested <strong>${amount} USDC</strong> to <code>${address}</code>.</p>`,
        user?.email ?? null,
      );

      return { status: 201, body: { ok: true, id } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Withdrawal failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async list(): Promise<HttpResult<{ ok: boolean; rows?: unknown[]; message?: string }>> {
    await ensureMarketplacePaymentTables();
    const session = await getAuthSession();
    if (!session) return unauthorized();
    await touchAuthSession(session);
    const denied = await requireRolePermission(session, "withdrawals", "view");
    if (denied) return denied;

    const elevated = await canViewAllTickets(session);
    const rows = elevated
      ? await WithdrawalModel.listWithdrawals()
      : await WithdrawalModel.listWithdrawalsForUser(session.userId);
    return { status: 200, body: { ok: true, rows } };
  },

  async review(
    id: number,
    input: Record<string, unknown>,
  ): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    await ensureMarketplacePaymentTables();
    const session = await getAuthSession();
    if (!session) return unauthorized();
    await touchAuthSession(session);
    const denied = await requireRolePermission(session, "withdrawals", "edit");
    if (denied) return denied;
    const elevated = await canViewAllTickets(session);
    if (!elevated) return { status: 403, body: { ok: false, message: "Managers and admins only." } };

    const action = String(input.action ?? "").toLowerCase();
    if (action !== "approve" && action !== "reject") {
      return { status: 400, body: { ok: false, message: "action must be approve or reject." } };
    }

    const row = await WithdrawalModel.getWithdrawalById(id);
    if (!row) return { status: 404, body: { ok: false, message: "Withdrawal not found." } };
    if ((row.status ?? "").toLowerCase() !== "pending") {
      return { status: 400, body: { ok: false, message: "Only pending withdrawals can be reviewed." } };
    }

    const amount = Number(row.amount ?? 0);
    const userId = Number(row.user_id);
    const user = await UserModel.getUserById(userId);

    try {
      if (action === "reject") {
        await releaseWalletHold({
          userId,
          amount,
          withdrawalId: id,
          note: `Withdrawal #${id} rejected`,
        });
        await WithdrawalModel.updateWithdrawalById(id, {
          status: "rejected",
          reviewed_by: session.userId,
          failure_reason: String(input.reason ?? "Rejected by admin"),
        });
        void notifyWithdrawal(
          `Withdrawal #${id} rejected`,
          `<p>Your withdrawal of ${amount} USDC was rejected.</p>`,
          user?.email ?? null,
        );
        return { status: 200, body: { ok: true } };
      }

      if (!isCircleConfigured()) {
        return { status: 503, body: { ok: false, message: "Circle is not configured for crypto payouts." } };
      }

      const { transferId } = await createCircleUsdcTransfer({
        amountMajor: amount,
        destinationAddress: String(row.address ?? ""),
        idempotencyKey: `withdrawal-${id}`,
      });

      await finalizeWalletHold({
        userId,
        amount,
        withdrawalId: id,
        note: `Withdrawal #${id} sent`,
      });
      await WithdrawalModel.updateWithdrawalById(id, {
        status: "sent",
        provider_ref: transferId,
        reviewed_by: session.userId,
      });

      void notifyWithdrawal(
        `Withdrawal #${id} sent`,
        `<p>Your withdrawal of <strong>${amount} USDC</strong> was approved and submitted (ref ${transferId}).</p>`,
        user?.email ?? null,
      );
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Review failed.";
      await WithdrawalModel.updateWithdrawalById(id, {
        status: "failed",
        failure_reason: message,
        reviewed_by: session.userId,
      });
      try {
        await releaseWalletHold({
          userId,
          amount,
          withdrawalId: id,
          note: `Withdrawal #${id} failed — hold released`,
        });
      } catch {
        /* ignore secondary */
      }
      return { status: 500, body: { ok: false, message } };
    }
  },
};
