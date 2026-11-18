"use client";

import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";

type Props = {
  onSuccess: () => void;
  onError: (message: string) => void;
};

export function StripeCheckoutForm({ onSuccess, onError }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) {
        onError(error.message || "Payment failed.");
        return;
      }
      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        onSuccess();
        return;
      }
      onError(`Unexpected status: ${paymentIntent?.status ?? "unknown"}`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement />
      <Button type="button" className="w-full" disabled={!stripe || busy} onClick={() => void submit()}>
        {busy ? "Processing…" : "Pay now"}
      </Button>
    </div>
  );
}
