import "server-only";

import * as OrderModel from "@/models/order.model";
import * as PaymentsModel from "@/models/payments.model";
import * as InvoicesModel from "@/models/invoices.model";
import { creditWallet } from "@/lib/payments/ledger";
import { roundMoney } from "@/lib/payments/fees";

export type SettleOrderInput = {
  orderId: number;
  provider: "stripe" | "paypal";
  providerRef: string;
  method: "card" | "bank" | "paypal";
  status?: string;
  cardLast4?: string | null;
  stripePaymentIntentId?: string | null;
  stripePaymentMethodId?: string | null;
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
};

/**
 * Mark order paid, write payment + invoice rows, credit seller wallet (idempotent if already paid).
 */
export async function settlePaidOrder(input: SettleOrderInput): Promise<{ ok: true; alreadySettled?: boolean } | { ok: false; message: string }> {
  const order = await OrderModel.getOrderById(input.orderId);
  if (!order) return { ok: false, message: "Order not found." };

  const status = (order.status ?? "").toLowerCase();
  if (status === "paid" || status === "succeeded" || status === "completed") {
    return { ok: true, alreadySettled: true };
  }

  const amount = roundMoney(Number(order.amount ?? 0));
  const currency = (order.currency ?? "usd").toLowerCase();
  const sellerId = order.seller_user_id;
  const sellerNet = roundMoney(Number(order.seller_net ?? amount));

  await OrderModel.updateOrderById(order.id, {
    status: "paid",
    provider: input.provider,
    provider_ref: input.providerRef,
    method: input.method,
    payer_name: input.payerName ?? order.payer_name,
    payer_email: input.payerEmail ?? order.payer_email,
    payer_phone: input.payerPhone ?? order.payer_phone,
  });

  await PaymentsModel.createPayment({
    order_id: order.id,
    user_id: order.buyer_user_id ?? sellerId,
    provider: input.provider,
    provider_ref: input.providerRef,
    method: input.method,
    stripe_payment_intent_id: input.stripePaymentIntentId ?? (input.provider === "stripe" ? input.providerRef : null),
    stripe_payment_method_id: input.stripePaymentMethodId ?? null,
    name: input.payerName ?? order.payer_name,
    email: input.payerEmail ?? order.payer_email,
    phone: input.payerPhone ?? order.payer_phone,
    country: null,
    amount,
    currency,
    card_last4: input.cardLast4 ?? null,
    card_exp_month: null,
    card_exp_year: null,
    status: input.status ?? "succeeded",
    failure_reason: null,
  });

  await InvoicesModel.createInvoices({
    stripe_invoice_id: null,
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    stripe_payment_method_id: input.stripePaymentMethodId ?? null,
    order_id: order.id,
    user_id: order.buyer_user_id ?? sellerId,
    provider: input.provider,
    provider_ref: input.providerRef,
    method: input.method,
    amount,
    customer_email: input.payerEmail ?? order.payer_email,
    card_last4: input.cardLast4 ?? null,
    currency,
    status: "paid",
    invoice_pdf: null,
  });

  if (sellerId != null && sellerNet > 0) {
    await creditWallet({
      userId: sellerId,
      amount: sellerNet,
      currency,
      orderId: order.id,
      note: `Order #${order.id} seller net`,
    });
  }

  return { ok: true };
}
