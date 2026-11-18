"use client";

import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { StripeCheckoutForm } from "@/components/StripeCheckoutForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_ROUTES } from "@/routes";

type OrderInfo = {
  id: number;
  token: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  provider: string | null;
  productName: string | null;
};

type Props = { token: string };

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "USD").toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

export default function PayOrder({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [approveUrl, setApproveUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
        if (params.get("paypal") === "1") {
          const cap = await fetch(API_ROUTES.CHECKOUT_PAYPAL_CAPTURE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderToken: token }),
          });
          const capData = (await cap.json()) as { ok?: boolean; message?: string };
          if (cap.ok && capData.ok) {
            if (!cancelled) setDone(true);
          }
        }

        const res = await fetch(API_ROUTES.checkoutOrder(token));
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          order?: OrderInfo;
          clientSecret?: string | null;
          publishableKey?: string | null;
          approveUrl?: string | null;
        };
        if (!res.ok || !data.ok || !data.order) {
          if (!cancelled) setError(data.message || "Order not found.");
          return;
        }
        if (!cancelled) {
          setOrder(data.order);
          setClientSecret(data.clientSecret ?? null);
          setPublishableKey(data.publishableKey ?? null);
          setApproveUrl(data.approveUrl ?? null);
          if (["paid", "succeeded", "complete"].includes(data.order.status)) setDone(true);
        }
      } catch {
        if (!cancelled) setError("Unable to load payment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading payment…</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Payment unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Pay PrecisionQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order && (
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">{order.productName || `Order #${order.id}`}</p>
              <p className="text-muted-foreground">
                Amount: {formatMoney(order.amount, order.currency)} · {order.method}
              </p>
              <p className="text-muted-foreground capitalize">Status: {done ? "paid" : order.status}</p>
            </div>
          )}
          {done ? (
            <p className="text-sm text-foreground">Thank you — payment received.</p>
          ) : (
            <>
              {approveUrl && (
                <Button asChild className="w-full">
                  <a href={approveUrl}>Continue with PayPal</a>
                </Button>
              )}
              {clientSecret && stripePromise && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripeCheckoutForm
                    onSuccess={() => setDone(true)}
                    onError={(message) => setError(message)}
                  />
                </Elements>
              )}
              {!clientSecret && !approveUrl && (
                <p className="text-sm text-muted-foreground">This order cannot be paid online right now.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
