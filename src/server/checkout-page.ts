import "server-only";

import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";
import * as PaymentSettingsModel from "@/models/payment-settings.model";
import * as ProductServiceModel from "@/models/product-service.model";
import * as UserModel from "@/models/user.model";
import type { CheckoutPagePayload } from "@/types/checkout-page";

export async function loadCheckoutPagePayload(): Promise<CheckoutPagePayload> {
  await ensureMarketplacePaymentTables();
  const [products, sellers, settings] = await Promise.all([
    ProductServiceModel.getAllProductServices(),
    UserModel.listUsersForTicketSelect(),
    PaymentSettingsModel.getPaymentSettings(),
  ]);

  return {
    products: products
      .filter((p) => (p.status ?? "").toLowerCase() !== "inactive")
      .map((p) => ({
        id: p.id,
        label: (p.name ?? "").trim() || `Product #${p.id}`,
        price: Number(p.base_price ?? 0),
        currency: (p.currency ?? "usd").toLowerCase(),
      })),
    sellers: sellers,
    enabledMethods: {
      card: Number(settings?.enable_card ?? 1) === 1,
      bank: Number(settings?.enable_bank ?? 1) === 1,
      paypal: Number(settings?.enable_paypal ?? 1) === 1,
    },
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null,
  };
}
