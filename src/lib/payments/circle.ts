import "server-only";

function circleBaseUrl(): string {
  const env = (process.env.CIRCLE_ENV || "sandbox").toLowerCase();
  return env === "live" || env === "production"
    ? "https://api.circle.com"
    : "https://api-sandbox.circle.com";
}

export function isCircleConfigured(): boolean {
  return Boolean(process.env.CIRCLE_API_KEY?.trim() && process.env.CIRCLE_WALLET_ID?.trim());
}

export function isValidPolygonAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

/**
 * Create a USDC transfer on Polygon from the configured Circle wallet.
 * Returns provider transfer id when accepted.
 */
export async function createCircleUsdcTransfer(input: {
  amountMajor: number;
  destinationAddress: string;
  idempotencyKey: string;
}): Promise<{ transferId: string }> {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  const walletId = process.env.CIRCLE_WALLET_ID?.trim();
  if (!apiKey || !walletId) throw new Error("Circle is not configured (CIRCLE_API_KEY / CIRCLE_WALLET_ID).");
  if (!isValidPolygonAddress(input.destinationAddress)) {
    throw new Error("Invalid Polygon wallet address.");
  }

  const res = await fetch(`${circleBaseUrl()}/v1/transfers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      idempotencyKey: input.idempotencyKey,
      source: { type: "wallet", id: walletId },
      destination: {
        type: "blockchain",
        address: input.destinationAddress.trim(),
        chain: "MATIC",
      },
      amount: {
        amount: input.amountMajor.toFixed(2),
        currency: "USD",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Circle transfer failed (${res.status}): ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as { data?: { id?: string } };
  const transferId = data.data?.id;
  if (!transferId) throw new Error("Circle did not return a transfer id.");
  return { transferId };
}

export async function getCircleTransfer(transferId: string): Promise<{ status: string }> {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  if (!apiKey) throw new Error("Circle is not configured.");
  const res = await fetch(`${circleBaseUrl()}/v1/transfers/${encodeURIComponent(transferId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Circle get transfer failed (${res.status}).`);
  const data = (await res.json()) as { data?: { status?: string } };
  return { status: data.data?.status ?? "unknown" };
}
