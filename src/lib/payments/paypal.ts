import "server-only";

function paypalBaseUrl(): string {
  const mode = (process.env.PAYPAL_MODE || "sandbox").toLowerCase();
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function isPaypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim());
}

async function getAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new Error("PayPal credentials are not configured.");
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status}).`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("PayPal auth missing access_token.");
  return data.access_token;
}

export async function createPaypalOrder(input: {
  amountMajor: number;
  currency: string;
  orderId: number;
  orderToken: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ paypalOrderId: string; approveUrl: string | null }> {
  const token = await getAccessToken();
  const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: String(input.orderId),
          custom_id: input.orderToken,
          amount: {
            currency_code: input.currency.toUpperCase(),
            value: input.amountMajor.toFixed(2),
          },
          description: `PrecisionQ order #${input.orderId}`,
        },
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        user_action: "PAY_NOW",
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal create order failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    id?: string;
    links?: { rel?: string; href?: string }[];
  };
  if (!data.id) throw new Error("PayPal did not return an order id.");
  const approve = data.links?.find((l) => l.rel === "approve")?.href ?? null;
  return { paypalOrderId: data.id, approveUrl: approve };
}

export async function capturePaypalOrder(paypalOrderId: string): Promise<{
  status: string;
  captureId: string | null;
  payerEmail: string | null;
  payerName: string | null;
}> {
  const token = await getAccessToken();
  const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal capture failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    status?: string;
    id?: string;
    payer?: { email_address?: string; name?: { given_name?: string; surname?: string } };
    purchase_units?: { payments?: { captures?: { id?: string; status?: string }[] } }[];
  };
  const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? data.id ?? null;
  const given = data.payer?.name?.given_name ?? "";
  const surname = data.payer?.name?.surname ?? "";
  return {
    status: data.status ?? "UNKNOWN",
    captureId,
    payerEmail: data.payer?.email_address ?? null,
    payerName: [given, surname].filter(Boolean).join(" ").trim() || null,
  };
}

export function verifyPaypalWebhookAuth(): boolean {
  // MVP: rely on capture endpoint called from our return URL + webhook id claim.
  // Production should verify transmission with PayPal verify-webhook-signature.
  return Boolean(process.env.PAYPAL_WEBHOOK_ID?.trim() || process.env.PAYPAL_CLIENT_ID?.trim());
}
