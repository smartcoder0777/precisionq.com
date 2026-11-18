import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function stripeCurrency(): string {
  return (process.env.STRIPE_CURRENCY?.trim() || "usd").toLowerCase();
}

/** Amount in major units → Stripe minor units. */
export function toStripeAmount(major: number, currency: string): number {
  const zeroDecimal = ["jpy", "krw", "vnd"];
  const c = currency.toLowerCase();
  if (zeroDecimal.includes(c)) return Math.round(major);
  return Math.round(major * 100);
}

export async function createStripePaymentIntent(input: {
  amountMajor: number;
  currency: string;
  method: "card" | "bank";
  orderId: number;
  orderToken: string;
  customerEmail?: string | null;
  customerName?: string | null;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripe();
  const paymentMethodTypes: string[] =
    input.method === "bank" ? ["us_bank_account"] : ["card"];

  const intent = await stripe.paymentIntents.create({
    amount: toStripeAmount(input.amountMajor, input.currency),
    currency: input.currency.toLowerCase(),
    payment_method_types: paymentMethodTypes,
    receipt_email: input.customerEmail || undefined,
    metadata: {
      order_id: String(input.orderId),
      order_token: input.orderToken,
      method: input.method,
    },
    description: `PrecisionQ order #${input.orderId}`,
  } as Stripe.PaymentIntentCreateParams);

  if (!intent.client_secret) throw new Error("Stripe did not return a client secret.");
  return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
}

export function constructStripeEvent(rawBody: string | Buffer, signature: string): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export async function retrievePaymentIntentClientSecret(paymentIntentId: string): Promise<string | null> {
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return intent.client_secret ?? null;
}
