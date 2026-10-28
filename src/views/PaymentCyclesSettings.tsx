"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTablePagination } from "@/components/data-table-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes";
import type { PaymentCycleCategoryOption, PaymentCycleSettingsRow } from "@/server/payment-cycles-page";

const PAGE_SIZE = 10;
const INTERVAL_UNITS = ["day", "week", "month", "year"] as const;

function capitalizeFirst(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export type PaymentCyclesSettingsProps = {
  initialRows: PaymentCycleSettingsRow[];
  categoryOptions: PaymentCycleCategoryOption[];
};

const PaymentCyclesSettings = ({ initialRows, categoryOptions }: PaymentCyclesSettingsProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<PaymentCycleSettingsRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PaymentCycleSettingsRow | null>(null);
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formCycleCode, setFormCycleCode] = useState("");
  const [formCycleName, setFormCycleName] = useState("");
  const [formIntervalValue, setFormIntervalValue] = useState("0");
  const [formIntervalUnit, setFormIntervalUnit] = useState("");
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");

  useEffect(() => setRows(initialRows), [initialRows]);

  const categoryLabelById = useMemo(() => new Map(categoryOptions.map((x) => [x.id, x.label])), [categoryOptions]);
  const filtered = useMemo(
    () => rows.filter((r) => `${r.cycleCode} ${r.cycleName} ${r.intervalUnit} ${r.description}`.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );
  const paging = usePagedList(filtered, PAGE_SIZE, search);

  const openAdd = () => {
    setEditing(null);
    setFormCategoryId("");
    setFormCycleCode("");
    setFormCycleName("");
    setFormIntervalValue("0");
    setFormIntervalUnit("");
    setFormIsRecurring(false);
    setFormDescription("");
    setFormStatus("Active");
    setDialogOpen(true);
  };
  const openEdit = (row: PaymentCycleSettingsRow) => {
    setEditing(row);
    setFormCategoryId(row.categoryId);
    setFormCycleCode(row.cycleCode);
    setFormCycleName(row.cycleName);
    setFormIntervalValue(String(row.intervalValue));
    setFormIntervalUnit(row.intervalUnit);
    setFormIsRecurring(row.isRecurring);
    setFormDescription(row.description);
    setFormStatus(row.status);
    setDialogOpen(true);
  };

  const saveRow = async () => {
    if (!formCycleName.trim()) {
      toast({ title: "Error", description: "Cycle name is required.", variant: "destructive" });
      return;
    }
    const payload = {
      categoryId: formCategoryId === "" ? null : Number(formCategoryId),
      cycleCode: formCycleCode,
      cycleName: formCycleName,
      intervalValue: Number(formIntervalValue) || 0,
      intervalUnit: formIntervalUnit,
      isRecurring: formIsRecurring,
      description: formDescription,
      status: formStatus,
    };
    try {
      if (editing) {
        const res = await fetch(API_ROUTES.paymentCycle(editing.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not update cycle.", variant: "destructive" });
          return;
        }
      } else {
        const res = await fetch(API_ROUTES.PAYMENT_CYCLES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not add cycle.", variant: "destructive" });
          return;
        }
      }
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const deleteRow = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(API_ROUTES.paymentCycle(deleteId), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not delete cycle.", variant: "destructive" });
        return;
      }
      setDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground">Payment Cycle</h1><p className="text-muted-foreground">Manage payment_cycles table</p></div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cycles</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
              <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead className="w-10">#</TableHead><TableHead>Category</TableHead><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Interval</TableHead><TableHead>Recurring</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {paging.pagedItems.map((row, i) => (
                <TableRow key={row.id}>
                  <TableCell>{(paging.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell>{categoryLabelById.get(row.categoryId) ?? "—"}</TableCell>
                  <TableCell>{row.cycleCode || "—"}</TableCell>
                  <TableCell className="font-medium">{row.cycleName}</TableCell>
                  <TableCell>{row.intervalValue} {capitalizeFirst(row.intervalUnit)}</TableCell>
                  <TableCell><Badge variant={row.isRecurring ? "default" : "outline"}>{row.isRecurring ? "Yes" : "No"}</Badge></TableCell>
                  <TableCell><Badge variant={row.status === "Active" ? "default" : "secondary"}>{row.status}</Badge></TableCell>
                  <TableCell><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4 text-primary" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No cycles found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <DataTablePagination totalItems={paging.totalItems} page={paging.page} totalPages={paging.totalPages} rangeFrom={paging.rangeFrom} rangeTo={paging.rangeTo} onPageChange={paging.goPage} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Payment Cycle" : "Add Payment Cycle"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Category</Label><Select value={formCategoryId || "none"} onValueChange={(v) => setFormCategoryId(v === "none" ? "" : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{categoryOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Cycle Code</Label><Input value={formCycleCode} onChange={e => setFormCycleCode(e.target.value)} /></div>
              <div className="space-y-2"><Label>Cycle Name <span className="text-destructive">*</span></Label><Input value={formCycleName} onChange={e => setFormCycleName(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Interval Value</Label><Input type="number" value={formIntervalValue} onChange={e => setFormIntervalValue(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Interval Unit</Label>
                <Select value={formIntervalUnit || "none"} onValueChange={(v) => setFormIntervalUnit(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select interval unit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {INTERVAL_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>{capitalizeFirst(unit)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3"><Checkbox checked={formIsRecurring} onCheckedChange={(v) => setFormIsRecurring(Boolean(v))} /><Label>Recurring</Label></div>
            <div className="space-y-2"><Label>Description</Label><Input value={formDescription} onChange={e => setFormDescription(e.target.value)} /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={formStatus} onValueChange={(v: "Active" | "Inactive") => setFormStatus(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={saveRow}>{editing ? "Update" : "Add"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Payment Cycle</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteRow}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaymentCyclesSettings;
