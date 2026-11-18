"use client";

import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES, adminPage } from "@/routes";
import type { CheckoutPagePayload } from "@/types/checkout-page";
import { StripeCheckoutForm } from "@/components/StripeCheckoutForm";
import { ShoppingCart, Copy, ExternalLink } from "lucide-react";

type Props = CheckoutPagePayload;

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

const Checkout = ({ products, sellers, enabledMethods, stripePublishableKey }: Props) => {
  const { toast } = useToast();
  const [productId, setProductId] = useState(products[0] ? String(products[0].id) : "");
  const [sellerUserId, setSellerUserId] = useState(sellers[0] ? String(sellers[0].id) : "");
  const [method, setMethod] = useState<"card" | "bank" | "paypal">(
    enabledMethods.card ? "card" : enabledMethods.bank ? "bank" : "paypal",
  );
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState(stripePublishableKey);
  const [payLink, setPayLink] = useState<string | null>(null);
  const [approveUrl, setApproveUrl] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === productId) ?? null,
    [products, productId],
  );

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

  const startCheckout = async () => {
    if (!productId || !sellerUserId) {
      toast({ title: "Missing fields", description: "Select a product and seller.", variant: "destructive" });
      return;
    }
    setBusy(true);
    setClientSecret(null);
    setApproveUrl(null);
    setPayLink(null);
    try {
      const res = await fetch(API_ROUTES.CHECKOUT_SESSION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productServiceId: Number(productId),
          sellerUserId: Number(sellerUserId),
          method,
          payerName,
          payerEmail,
          payerPhone,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        orderToken?: string;
        clientSecret?: string;
        publishableKey?: string | null;
        approveUrl?: string | null;
        provider?: string;
      };
      if (!res.ok || !data.ok) {
        toast({ title: "Checkout failed", description: data.message || "Unable to start checkout.", variant: "destructive" });
        return;
      }
      if (data.orderToken) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setPayLink(`${origin}/pay/${data.orderToken}`);
      }
      if (data.provider === "paypal") {
        setApproveUrl(data.approveUrl ?? null);
        toast({ title: "PayPal order created", description: "Open PayPal to complete payment, or share the pay link." });
        return;
      }
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        if (data.publishableKey) setPublishableKey(data.publishableKey);
        toast({ title: "Session ready", description: "Complete payment below or share the pay link." });
      }
    } catch {
      toast({ title: "Checkout failed", description: "Network error.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!payLink) return;
    await navigator.clipboard.writeText(payLink);
    toast({ title: "Copied", description: "Pay link copied to clipboard." });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Checkout</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Staff-assisted sale — card, bank (ACH), or PayPal
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" /> Order details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.label} — {formatMoney(p.price, p.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Seller (wallet credit)</Label>
              <Select value={sellerUserId} onValueChange={setSellerUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select seller" />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as "card" | "bank" | "paypal")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enabledMethods.card && <SelectItem value="card">Card</SelectItem>}
                  {enabledMethods.bank && <SelectItem value="bank">US bank (ACH)</SelectItem>}
                  {enabledMethods.paypal && <SelectItem value="paypal">PayPal</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payer name</Label>
                <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Payer email</Label>
                <Input type="email" value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payer phone</Label>
              <Input value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />
            </div>
            {selectedProduct && (
              <p className="text-sm text-muted-foreground">
                Charge:{" "}
                <span className="font-medium text-foreground">
                  {formatMoney(selectedProduct.price, selectedProduct.currency)}
                </span>
              </p>
            )}
            <Button className="w-full" disabled={busy || products.length === 0} onClick={() => void startCheckout()}>
              {busy ? "Creating…" : "Create checkout session"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Complete or share</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payLink && (
              <div className="rounded-md border border-border p-3 space-y-2">
                <p className="text-sm text-muted-foreground">Remote pay link</p>
                <p className="font-mono text-xs break-all">{payLink}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
                    <Copy className="h-4 w-4 mr-1" /> Copy
                  </Button>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={payLink} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> Open
                    </a>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" asChild>
                    <a href={adminPage("/payments")}>View payments</a>
                  </Button>
                </div>
              </div>
            )}
            {approveUrl && (
              <Button asChild className="w-full">
                <a href={approveUrl} target="_blank" rel="noreferrer">
                  Continue to PayPal
                </a>
              </Button>
            )}
            {clientSecret && stripePromise && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripeCheckoutForm
                  onSuccess={() =>
                    toast({
                      title: "Payment submitted",
                      description: "Webhook will settle the order and credit the seller wallet.",
                    })
                  }
                  onError={(message) => toast({ title: "Payment error", description: message, variant: "destructive" })}
                />
              </Elements>
            )}
            {!clientSecret && !approveUrl && !payLink && (
              <p className="text-sm text-muted-foreground">
                Create a session to collect payment here or send the payer a link.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
