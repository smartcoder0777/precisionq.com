/**
 * Create marketplace checkout sessions (Stripe card/bank, PayPal).
 */
import { getAuthSession, touchAuthSession } from "@/lib/auth-session";
import { computeFeeSplit } from "@/lib/payments/fees";
import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";
import { createPaypalOrder, isPaypalConfigured } from "@/lib/payments/paypal";
import {
  createStripePaymentIntent,
  isStripeConfigured,
  retrievePaymentIntentClientSecret,
  stripeCurrency,
} from "@/lib/payments/stripe";
import * as OrderModel from "@/models/order.model";
import * as PaymentSettingsModel from "@/models/payment-settings.model";
import * as ProductServiceModel from "@/models/product-service.model";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";

async function unauthorized(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 401, body: { ok: false, message: "Unauthorized." } };
}

function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.HOST_URL?.trim() ||
    process.env.HOST?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "").replace(/^['"]|['"]$/g, "");
}

export const checkoutController = {
  async createSession(input: Record<string, unknown>): Promise<
    HttpResult<{
      ok: boolean;
      message?: string;
      orderId?: number;
      orderToken?: string;
      provider?: string;
      clientSecret?: string;
      paymentIntentId?: string;
      approveUrl?: string | null;
      paypalOrderId?: string;
      publishableKey?: string | null;
    }>
  > {
    await ensureMarketplacePaymentTables();
    const session = await getAuthSession();
    if (!session) return unauthorized();
    await touchAuthSession(session);
    const denied = await requireRolePermission(session, "payments", "create");
    if (denied) return denied;

    const productId = Number(input.productServiceId);
    const sellerUserId = Number(input.sellerUserId);
    const methodRaw = String(input.method ?? "card").toLowerCase();
    const method = methodRaw === "bank" || methodRaw === "paypal" ? methodRaw : "card";
    const clinicId = input.clinicId != null && input.clinicId !== "" ? Number(input.clinicId) : null;
    const payerName = String(input.payerName ?? "").trim() || null;
    const payerEmail = String(input.payerEmail ?? "").trim() || null;
    const payerPhone = String(input.payerPhone ?? "").trim() || null;

    if (!Number.isFinite(productId) || productId <= 0) {
      return { status: 400, body: { ok: false, message: "Product is required." } };
    }
    if (!Number.isFinite(sellerUserId) || sellerUserId <= 0) {
      return { status: 400, body: { ok: false, message: "Seller user is required." } };
    }

    const settings = await PaymentSettingsModel.getPaymentSettings();
    if (method === "card" && Number(settings?.enable_card ?? 1) !== 1) {
      return { status: 400, body: { ok: false, message: "Card payments are disabled." } };
    }
    if (method === "bank" && Number(settings?.enable_bank ?? 1) !== 1) {
      return { status: 400, body: { ok: false, message: "Bank payments are disabled." } };
    }
    if (method === "paypal" && Number(settings?.enable_paypal ?? 1) !== 1) {
      return { status: 400, body: { ok: false, message: "PayPal is disabled." } };
    }

    const product = await ProductServiceModel.getProductServiceById(productId);
    if (!product) return { status: 404, body: { ok: false, message: "Product not found." } };
    const amount = Number(product.base_price ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: 400, body: { ok: false, message: "Product price is invalid." } };
    }
    const currency = (product.currency || stripeCurrency()).toLowerCase();
    const fees = await computeFeeSplit(amount);
    const token = OrderModel.newOrderToken();

    try {
      if (method === "paypal") {
        if (!isPaypalConfigured()) {
          return { status: 503, body: { ok: false, message: "PayPal is not configured." } };
        }
        const orderId = await OrderModel.createOrder({
          token,
          buyer_user_id: session.userId,
          seller_user_id: sellerUserId,
          clinic_id: clinicId != null && Number.isFinite(clinicId) ? clinicId : null,
          product_service_id: productId,
          amount: fees.gross,
          currency,
          method: "paypal",
          status: "pending",
          payer_name: payerName,
          payer_email: payerEmail,
          payer_phone: payerPhone,
          provider: "paypal",
          platform_fee: fees.platformFee,
          seller_net: fees.sellerNet,
          product_name: product.name?.trim() || `Product #${productId}`,
        });

        const base = appBaseUrl();
        const { paypalOrderId, approveUrl } = await createPaypalOrder({
          amountMajor: fees.gross,
          currency,
          orderId,
          orderToken: token,
          returnUrl: `${base}/pay/${token}?paypal=1`,
          cancelUrl: `${base}/admin/checkout?canceled=1`,
        });
        await OrderModel.updateOrderById(orderId, { provider_ref: paypalOrderId });
        return {
          status: 201,
          body: {
            ok: true,
            orderId,
            orderToken: token,
            provider: "paypal",
            paypalOrderId,
            approveUrl,
          },
        };
      }

      if (!isStripeConfigured()) {
        return { status: 503, body: { ok: false, message: "Stripe is not configured." } };
      }

      const orderId = await OrderModel.createOrder({
        token,
        buyer_user_id: session.userId,
        seller_user_id: sellerUserId,
        clinic_id: clinicId != null && Number.isFinite(clinicId) ? clinicId : null,
        product_service_id: productId,
        amount: fees.gross,
        currency,
        method,
        status: "pending",
        payer_name: payerName,
        payer_email: payerEmail,
        payer_phone: payerPhone,
        provider: "stripe",
        platform_fee: fees.platformFee,
        seller_net: fees.sellerNet,
        product_name: product.name?.trim() || `Product #${productId}`,
      });

      const stripeMethod = method === "bank" ? "bank" : "card";
      const { clientSecret, paymentIntentId } = await createStripePaymentIntent({
        amountMajor: fees.gross,
        currency,
        method: stripeMethod,
        orderId,
        orderToken: token,
        customerEmail: payerEmail,
        customerName: payerName,
      });
      await OrderModel.updateOrderById(orderId, { provider_ref: paymentIntentId });

      return {
        status: 201,
        body: {
          ok: true,
          orderId,
          orderToken: token,
          provider: "stripe",
          clientSecret,
          paymentIntentId,
          publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null,
        },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Checkout failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async getByToken(token: string): Promise<
    HttpResult<{
      ok: boolean;
      message?: string;
      order?: {
        id: number;
        token: string;
        amount: number;
        currency: string;
        method: string;
        status: string;
        provider: string | null;
        productName: string | null;
      };
      clientSecret?: string | null;
      publishableKey?: string | null;
      approveUrl?: string | null;
      paypalClientId?: string | null;
    }>
  > {
    await ensureMarketplacePaymentTables();
    const order = await OrderModel.getOrderByToken(token.trim());
    if (!order) return { status: 404, body: { ok: false, message: "Order not found." } };

    let productName: string | null = null;
    if (order.product_service_id) {
      const product = await ProductServiceModel.getProductServiceById(Number(order.product_service_id));
      productName = product?.name?.trim() || null;
    }

    const status = (order.status ?? "pending").toLowerCase();
    const provider = (order.provider ?? "").toLowerCase();
    const method = (order.method ?? "card").toLowerCase();
    let clientSecret: string | null = null;
    let approveUrl: string | null = null;

    if (status === "pending" && provider === "stripe" && order.provider_ref) {
      try {
        clientSecret = await retrievePaymentIntentClientSecret(String(order.provider_ref));
      } catch {
        clientSecret = null;
      }
    }

    if (status === "pending" && provider === "paypal" && order.provider_ref) {
      approveUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${encodeURIComponent(String(order.provider_ref))}`;
      if ((process.env.PAYPAL_MODE || "sandbox").toLowerCase() === "live") {
        approveUrl = `https://www.paypal.com/checkoutnow?token=${encodeURIComponent(String(order.provider_ref))}`;
      }
    }

    return {
      status: 200,
      body: {
        ok: true,
        order: {
          id: order.id,
          token: String(order.token ?? token),
          amount: Number(order.amount ?? 0),
          currency: String(order.currency ?? "usd"),
          method,
          status,
          provider: order.provider,
          productName,
        },
        clientSecret,
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null,
        approveUrl,
        paypalClientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() || process.env.PAYPAL_CLIENT_ID?.trim() || null,
      },
    };
  },
};
