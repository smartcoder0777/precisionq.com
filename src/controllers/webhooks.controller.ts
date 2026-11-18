import { claimWebhookEvent, markWebhookProcessed } from "@/models/webhook-event.model";
import * as OrderModel from "@/models/order.model";
import * as WithdrawalModel from "@/models/withdrawal.model";
import { settlePaidOrder } from "@/lib/payments/settle-order";
import { creditWallet } from "@/lib/payments/ledger";
import { constructStripeEvent, isStripeConfigured } from "@/lib/payments/stripe";
import { capturePaypalOrder } from "@/lib/payments/paypal";
import type { HttpResult } from "./health.controller";

export const webhooksController = {
  async stripe(rawBody: string | Buffer, signature: string | null): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    if (!isStripeConfigured()) {
      return { status: 503, body: { ok: false, message: "Stripe not configured." } };
    }
    if (!signature) {
      return { status: 400, body: { ok: false, message: "Missing Stripe-Signature." } };
    }

    try {
      const event = constructStripeEvent(rawBody, signature);
      const first = await claimWebhookEvent("stripe", event.id, event.type);
      if (!first) return { status: 200, body: { ok: true, message: "Duplicate ignored." } };

      if (
        event.type === "payment_intent.succeeded" ||
        event.type === "payment_intent.processing"
      ) {
        const pi = event.data.object as {
          id: string;
          status?: string;
          metadata?: { order_id?: string; method?: string };
          charges?: { data?: { payment_method_details?: { card?: { last4?: string } } }[] };
          last_payment_error?: unknown;
        };
        const orderId = Number(pi.metadata?.order_id ?? 0);
        if (Number.isFinite(orderId) && orderId > 0) {
          const method = pi.metadata?.method === "bank" ? "bank" : "card";
          // ACH may be "processing" first — only settle on succeeded for ledger credit.
          if (event.type === "payment_intent.succeeded") {
            const last4 =
              pi.charges?.data?.[0]?.payment_method_details?.card?.last4 ?? null;
            await settlePaidOrder({
              orderId,
              provider: "stripe",
              providerRef: pi.id,
              method,
              stripePaymentIntentId: pi.id,
              cardLast4: last4,
              status: "succeeded",
            });
          } else if (method === "bank") {
            await OrderModel.updateOrderById(orderId, { status: "processing", provider_ref: pi.id });
          }
        }
      }

      await markWebhookProcessed("stripe", event.id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Webhook failed.";
      return { status: 400, body: { ok: false, message } };
    }
  },

  async paypal(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    try {
      const eventId = String(input.id ?? input.event_id ?? "").trim() || `paypal-${Date.now()}`;
      const eventType = String(input.event_type ?? input.eventType ?? "PAYPAL_CAPTURE").trim();
      const first = await claimWebhookEvent("paypal", eventId, eventType);
      if (!first) return { status: 200, body: { ok: true, message: "Duplicate ignored." } };

      const resource = (input.resource ?? input) as Record<string, unknown>;
      const paypalOrderId = String(
        resource.supplementary_data &&
          typeof resource.supplementary_data === "object" &&
          (resource.supplementary_data as { related_ids?: { order_id?: string } }).related_ids?.order_id
          ? (resource.supplementary_data as { related_ids?: { order_id?: string } }).related_ids?.order_id
          : resource.id ?? input.paypalOrderId ?? "",
      ).trim();

      // Prefer explicit capture via our return handler; webhook settles if order still pending.
      if (paypalOrderId) {
        const order =
          (await OrderModel.getOrderByProviderRef("paypal", paypalOrderId)) ||
          null;
        if (order && (order.status ?? "").toLowerCase() === "pending") {
          const captured = await capturePaypalOrder(paypalOrderId);
          if (captured.status === "COMPLETED" || captured.captureId) {
            await settlePaidOrder({
              orderId: order.id,
              provider: "paypal",
              providerRef: captured.captureId || paypalOrderId,
              method: "paypal",
              payerEmail: captured.payerEmail,
              payerName: captured.payerName,
              status: "succeeded",
            });
          }
        }
      }

      await markWebhookProcessed("paypal", eventId);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "PayPal webhook failed.";
      return { status: 400, body: { ok: false, message } };
    }
  },

  async circle(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    try {
      const transfer = (input.transfer ?? input.data ?? input) as Record<string, unknown>;
      const transferId = String(transfer.id ?? input.id ?? "").trim();
      const status = String(transfer.status ?? input.status ?? "").toLowerCase();
      if (!transferId) return { status: 400, body: { ok: false, message: "Missing transfer id." } };

      const eventId = `circle-${transferId}-${status || "update"}`;
      const first = await claimWebhookEvent("circle", eventId, status || "transfer");
      if (!first) return { status: 200, body: { ok: true, message: "Duplicate ignored." } };

      const pool = await import("@/lib/db").then((m) => m.getPool());
      const [rows] = await pool.execute<import("mysql2").RowDataPacket[]>(
        `SELECT * FROM withdrawals WHERE provider_ref = ? LIMIT 1`,
        [transferId],
      );
      const row = rows[0];
      if (row) {
        const id = Number(row.id);
        const userId = Number(row.user_id);
        const amount = Number(row.amount ?? 0);
        if (status === "complete" || status === "completed") {
          await WithdrawalModel.updateWithdrawalById(id, { status: "completed" });
        } else if (status === "failed" || status === "denied" || status === "cancelled") {
          const prev = (row.status ?? "").toLowerCase();
          if (prev === "sent") {
            // Approve already finalized the hold; credit balance back on payout failure.
            await creditWallet({
              userId,
              amount,
              note: `Withdrawal #${id} Circle failed — refunded to wallet`,
            });
          }
          await WithdrawalModel.updateWithdrawalById(id, {
            status: "failed",
            failure_reason: `Circle status: ${status}`,
          });
        }
      }

      await markWebhookProcessed("circle", eventId);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Circle webhook failed.";
      return { status: 400, body: { ok: false, message } };
    }
  },

  /** Capture PayPal after browser return to /pay/[token]. */
  async paypalCaptureReturn(orderToken: string): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    try {
      const order = await OrderModel.getOrderByToken(orderToken);
      if (!order) return { status: 404, body: { ok: false, message: "Order not found." } };
      if ((order.status ?? "").toLowerCase() === "paid") {
        return { status: 200, body: { ok: true, message: "Already paid." } };
      }
      const paypalOrderId = (order.provider_ref ?? "").trim();
      if (!paypalOrderId) return { status: 400, body: { ok: false, message: "Missing PayPal order id." } };

      const captured = await capturePaypalOrder(paypalOrderId);
      if (captured.status !== "COMPLETED" && !captured.captureId) {
        return { status: 400, body: { ok: false, message: `PayPal status: ${captured.status}` } };
      }
      const settled = await settlePaidOrder({
        orderId: order.id,
        provider: "paypal",
        providerRef: captured.captureId || paypalOrderId,
        method: "paypal",
        payerEmail: captured.payerEmail,
        payerName: captured.payerName,
        status: "succeeded",
      });
      if (!settled.ok) return { status: 500, body: { ok: false, message: settled.message } };
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Capture failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
