"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES, adminPage } from "@/routes";
import { Wallet as WalletIcon } from "lucide-react";

type LedgerRow = {
  id: number;
  entry_type: string | null;
  amount: string | number | null;
  balance_after: string | number | null;
  note: string | null;
  createdAt?: string | Date | null;
};

type Props = {
  canManageAll: boolean;
};

const formatMoney = (amount: number, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount);
  } catch {
    return String(amount);
  }
};

export default function WalletView({ canManageAll }: Props) {
  const { toast } = useToast();
  const [available, setAvailable] = useState(0);
  const [held, setHeld] = useState(0);
  const [currency, setCurrency] = useState("usd");
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [allWallets, setAllWallets] = useState<
    { id: number; user_id: number; available_balance: string | number; held_balance: string | number; currency: string }[]
  >([]);

  const load = async () => {
    const res = await fetch(API_ROUTES.WALLET);
    const data = (await res.json()) as {
      ok?: boolean;
      wallet?: { available: number; held: number; currency: string };
      ledger?: LedgerRow[];
      message?: string;
    };
    if (!res.ok || !data.ok || !data.wallet) {
      toast({ title: "Wallet", description: data.message || "Unable to load wallet.", variant: "destructive" });
      return;
    }
    setAvailable(Number(data.wallet.available));
    setHeld(Number(data.wallet.held));
    setCurrency(data.wallet.currency);
    setLedger(Array.isArray(data.ledger) ? data.ledger : []);
  };

  useEffect(() => {
    void load();
    if (canManageAll) {
      void (async () => {
        const res = await fetch(API_ROUTES.WALLET_ALL);
        const data = (await res.json()) as { ok?: boolean; wallets?: typeof allWallets };
        if (res.ok && data.ok && Array.isArray(data.wallets)) setAllWallets(data.wallets);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount load
  }, [canManageAll]);

  const requestWithdrawal = async () => {
    setBusy(true);
    try {
      const res = await fetch(API_ROUTES.WITHDRAWALS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), address }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Withdrawal failed", description: data.message || "Request failed.", variant: "destructive" });
        return;
      }
      toast({ title: "Withdrawal requested", description: "Pending admin approval." });
      setAmount("");
      setAddress("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Wallet</h1>
          <p className="text-muted-foreground text-sm mt-1">Seller balance and USDC (Polygon) withdrawals</p>
        </div>
        <Button asChild variant="outline">
          <Link href={adminPage("/payments/withdrawals")}>Withdrawals</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <WalletIcon className="h-4 w-4" /> Available
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(available, currency)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">On hold</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(held, currency)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request USDC withdrawal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Amount (USD)</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25.00" />
          </div>
          <div className="space-y-2">
            <Label>Polygon USDC address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x…" className="font-mono text-sm" />
          </div>
          <div className="sm:col-span-2">
            <Button disabled={busy} onClick={() => void requestWithdrawal()}>
              {busy ? "Submitting…" : "Submit withdrawal"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance after</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="capitalize">{row.entry_type}</TableCell>
                  <TableCell>{formatMoney(Number(row.amount ?? 0), currency)}</TableCell>
                  <TableCell>{formatMoney(Number(row.balance_after ?? 0), currency)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.note || "—"}</TableCell>
                </TableRow>
              ))}
              {ledger.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No ledger entries yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManageAll && (
        <Card>
          <CardHeader>
            <CardTitle>All wallets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Held</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allWallets.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.user_id}</TableCell>
                    <TableCell>{formatMoney(Number(w.available_balance), w.currency)}</TableCell>
                    <TableCell>{formatMoney(Number(w.held_balance), w.currency)}</TableCell>
                    <TableCell className="uppercase">{w.currency}</TableCell>
                  </TableRow>
                ))}
                {allWallets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No wallets
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
