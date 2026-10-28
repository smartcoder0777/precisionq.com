"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTablePagination } from "@/components/data-table-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type VariantProps } from "class-variance-authority";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Trash2, CreditCard, FileText, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes";
import type { PaymentPageRow, PaymentsPagePayload } from "@/types/payments-page";
import { formatUsPhoneDisplay } from "@/lib/phone-format";

const PAGE_SIZE = 10;

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const statusVariant = (s: PaymentPageRow["status"]): BadgeVariant => {
  switch (s) {
    case "succeeded":
      return "default";
    case "pending":
      return "secondary";
    case "failed":
      return "destructive";
    case "refunded":
      return "outline";
    default:
      return "outline";
  }
};

/** `amount` is stored in major units (e.g. dollars) per `payments.amount`. */
const formatMoney = (amount: number, currency: string) => {
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
};

export type PaymentsProps = PaymentsPagePayload;

const Payments = ({ rows: initialRows }: PaymentsProps) => {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentPageRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [deletePayment, setDeletePayment] = useState<PaymentPageRow | null>(null);
  const [deleteAll, setDeleteAll] = useState(false);
  const [invoicePayment, setInvoicePayment] = useState<PaymentPageRow | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setPayments(initialRows);
  }, [initialRows]);

  const filtered = useMemo(
    () =>
      payments.filter(p =>
        `${p.paymentId} ${p.customerName} ${p.email} ${p.phone} ${p.status}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [payments, search],
  );
  const { pagedItems, page, totalPages, totalItems, rangeFrom, rangeTo, goPage } = usePagedList(filtered, PAGE_SIZE, search);

  const handleDelete = async () => {
    if (!deletePayment) return;
    try {
      const res = await fetch(API_ROUTES.payment(deletePayment.id), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({
          title: "Error",
          description: data.message ?? "Could not remove payment.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Removed", description: `Payment ${deletePayment.paymentId} removed.` });
      setDeletePayment(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const handleDeleteAll = async () => {
    try {
      const res = await fetch(API_ROUTES.PAYMENTS_DELETE_ALL, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({
          title: "Error",
          description: data.message ?? "Could not remove all payments.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Cleared", description: "All payment records removed." });
      setDeleteAll(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Payments</h1>
          <p className="text-muted-foreground text-sm mt-1">View payment transactions from the payments table</p>
        </div>
        <Button variant="destructive" onClick={() => setDeleteAll(true)} disabled={payments.length === 0}>
          <Trash className="h-4 w-4 mr-2" /> Remove All
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Transactions ({filtered.length})
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Card Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium font-mono text-xs">{p.paymentId}</TableCell>
                  <TableCell>{p.customerName}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell className="text-muted-foreground">{formatUsPhoneDisplay(p.phone)}</TableCell>
                  <TableCell className="font-medium">{formatMoney(p.amount, p.currency)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="font-mono">•••• {p.cardLast4}</span>
                    <span className="ml-1 text-xs text-muted-foreground">({p.cardBrand})</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)} className="capitalize">
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.createdAt}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setInvoicePayment(p)}
                        title="View Invoice"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletePayment(p)}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No payment records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <DataTablePagination
            totalItems={totalItems}
            page={page}
            totalPages={totalPages}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            onPageChange={goPage}
          />
        </CardContent>
      </Card>

      <Dialog open={!!invoicePayment} onOpenChange={open => !open && setInvoicePayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice — {invoicePayment?.invoiceId}</DialogTitle>
          </DialogHeader>
          {invoicePayment ? (
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <p className="text-lg font-bold text-foreground">INVOICE</p>
                    <p className="text-xs text-muted-foreground">{invoicePayment.invoiceId}</p>
                  </div>
                  <Badge variant={statusVariant(invoicePayment.status)} className="capitalize">
                    {invoicePayment.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Customer</span>
                    <p className="font-medium">{invoicePayment.customerName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email</span>
                    <p className="font-medium">{invoicePayment.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone</span>
                    <p className="font-medium">{formatUsPhoneDisplay(invoicePayment.phone)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date</span>
                    <p className="font-medium">{invoicePayment.createdAt}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment ID</span>
                    <p className="font-medium font-mono text-xs">{invoicePayment.paymentId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Card</span>
                    <p className="font-medium font-mono">•••• {invoicePayment.cardLast4}</p>
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Description</span>
                    <span>{invoicePayment.description}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{formatMoney(invoicePayment.amount, invoicePayment.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePayment} onOpenChange={open => !open && setDeletePayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove payment {deletePayment?.paymentId}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAll} onOpenChange={setDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove All Payments</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {payments.length} payment records from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteAll()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Payments;
