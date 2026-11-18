"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes";
import { ArrowUpRight } from "lucide-react";

type WithdrawalRow = {
  id: number;
  user_id: number;
  amount: string | number;
  asset: string | null;
  network: string | null;
  address: string | null;
  status: string | null;
  provider_ref: string | null;
  failure_reason: string | null;
  createdAt?: string | Date | null;
};

type Props = { canReview: boolean };

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export default function Withdrawals({ canReview }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    const res = await fetch(API_ROUTES.WITHDRAWALS);
    const data = (await res.json()) as { ok?: boolean; rows?: WithdrawalRow[]; message?: string };
    if (!res.ok || !data.ok) {
      toast({ title: "Withdrawals", description: data.message || "Unable to load.", variant: "destructive" });
      return;
    }
    setRows(Array.isArray(data.rows) ? data.rows : []);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = useMemo(() => rows.filter((r) => (r.status ?? "").toLowerCase() === "pending"), [rows]);

  const review = async (id: number, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      const res = await fetch(API_ROUTES.withdrawal(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Review failed", description: data.message || "Unable to update.", variant: "destructive" });
        return;
      }
      toast({ title: action === "approve" ? "Approved" : "Rejected", description: `Withdrawal #${id}` });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Withdrawals</h1>
        <p className="text-muted-foreground text-sm mt-1">
          USDC on Polygon — admin approval required before Circle payout
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            Requests ({rows.length})
            {pending.length > 0 && (
              <Badge variant="secondary">{pending.length} pending</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                {canReview && <TableHead className="w-40">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const status = (r.status ?? "").toLowerCase();
                return (
                  <TableRow key={r.id}>
                    <TableCell>#{r.id}</TableCell>
                    <TableCell>{r.user_id}</TableCell>
                    <TableCell>{formatMoney(Number(r.amount))}</TableCell>
                    <TableCell className="capitalize">
                      {r.asset || "USDC"} / {r.network || "polygon"}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[180px] truncate" title={r.address ?? ""}>
                      {r.address || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status === "failed" || status === "rejected" ? "destructive" : status === "sent" || status === "completed" ? "default" : "secondary"} className="capitalize">
                        {status || "—"}
                      </Badge>
                    </TableCell>
                    {canReview && (
                      <TableCell>
                        {status === "pending" ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              disabled={busyId === r.id}
                              onClick={() => void review(r.id, "approve")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === r.id}
                              onClick={() => void review(r.id, "reject")}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{r.provider_ref || r.failure_reason || "—"}</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canReview ? 7 : 6} className="text-center py-12 text-muted-foreground">
                    No withdrawal requests
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
