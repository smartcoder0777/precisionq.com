import type { PaymentsRecord } from "@/models/payments.model";
import type { PaymentPageRow } from "@/types/payments-page";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStatus(s: string | null): PaymentPageRow["status"] {
  const x = (s ?? "").toLowerCase();
  if (x === "succeeded" || x === "paid" || x === "complete") return "succeeded";
  if (x === "failed" || x === "canceled" || x === "cancelled") return "failed";
  if (x === "refunded" || x === "partially_refunded") return "refunded";
  return "pending";
}

function paymentIntentDisplay(r: PaymentsRecord): string {
  const pi = (r.stripe_payment_intent_id ?? "").trim();
  if (pi) return pi;
  return `pay_${r.id}`;
}

export function paymentsRecordToPageRow(r: PaymentsRecord): PaymentPageRow {
  const orderId = r.order_id != null && Number.isFinite(Number(r.order_id)) ? Number(r.order_id) : null;
  const failure = (r.failure_reason ?? "").trim();
  const desc =
    failure ||
    (orderId != null ? `Payment for order #${orderId}` : "Payment");

  return {
    id: num(r.id),
    paymentId: paymentIntentDisplay(r),
    customerName: (r.name ?? "").trim() || "—",
    email: (r.email ?? "").trim() || "—",
    phone: (r.phone ?? "").trim() || "—",
    amount: num(r.amount),
    cardLast4: (r.card_last4 ?? "").trim() || "—",
    cardBrand: "Card",
    status: normalizeStatus(r.status),
    createdAt: "—",
    invoiceId: orderId != null ? `ORDER-${orderId}` : "—",
    invoiceUrl: "",
    description: desc,
    currency: (r.currency ?? "usd").trim().toLowerCase() || "usd",
  };
}
