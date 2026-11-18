"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes";
import type { PaymentSettingsPagePayload } from "@/types/payment-settings-page";

type Props = { initial: PaymentSettingsPagePayload };

export default function PaymentSettings({ initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [platformFeePercent, setPlatformFeePercent] = useState(String(initial.platformFeePercent));
  const [platformFeeFlat, setPlatformFeeFlat] = useState(String(initial.platformFeeFlat));
  const [minWithdrawal, setMinWithdrawal] = useState(String(initial.minWithdrawal));
  const [enableCard, setEnableCard] = useState(initial.enableCard);
  const [enableBank, setEnableBank] = useState(initial.enableBank);
  const [enablePaypal, setEnablePaypal] = useState(initial.enablePaypal);
  const [enableCryptoOut, setEnableCryptoOut] = useState(initial.enableCryptoOut);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPlatformFeePercent(String(initial.platformFeePercent));
    setPlatformFeeFlat(String(initial.platformFeeFlat));
    setMinWithdrawal(String(initial.minWithdrawal));
    setEnableCard(initial.enableCard);
    setEnableBank(initial.enableBank);
    setEnablePaypal(initial.enablePaypal);
    setEnableCryptoOut(initial.enableCryptoOut);
  }, [initial]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(API_ROUTES.SETTINGS_PAYMENTS, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformFeePercent: Number(platformFeePercent),
          platformFeeFlat: Number(platformFeeFlat),
          minWithdrawal: Number(minWithdrawal),
          enableCard,
          enableBank,
          enablePaypal,
          enableCryptoOut,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Save failed", description: data.message || "Unable to save.", variant: "destructive" });
        return;
      }
      toast({ title: "Saved", description: "Payment settings updated." });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Payment settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Platform fee, methods, and crypto withdrawal (USDC on Polygon)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fees & limits</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Platform fee %</Label>
            <Input value={platformFeePercent} onChange={(e) => setPlatformFeePercent(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Platform fee flat</Label>
            <Input value={platformFeeFlat} onChange={(e) => setPlatformFeeFlat(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Min withdrawal</Label>
            <Input value={minWithdrawal} onChange={(e) => setMinWithdrawal(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enabled methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={enableCard} onCheckedChange={(v) => setEnableCard(v === true)} />
            Card (Stripe)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={enableBank} onCheckedChange={(v) => setEnableBank(v === true)} />
            US bank / ACH (Stripe)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={enablePaypal} onCheckedChange={(v) => setEnablePaypal(v === true)} />
            PayPal
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={enableCryptoOut} onCheckedChange={(v) => setEnableCryptoOut(v === true)} />
            Crypto withdrawals (USDC Polygon via Circle)
          </label>
          <p className="text-xs text-muted-foreground pt-2">
            Configure secrets in environment: STRIPE_*, PAYPAL_*, CIRCLE_*. Production crypto payouts require Circle
            business KYC and legal review.
          </p>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
