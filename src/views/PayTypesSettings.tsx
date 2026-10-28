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
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes";
import type { PayTypeSettingsRow } from "@/server/pay-types-page";

const PAGE_SIZE = 10;

export type PayTypesSettingsProps = {
  initialRows: PayTypeSettingsRow[];
};

const PayTypesSettings = ({ initialRows }: PayTypesSettingsProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<PayTypeSettingsRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PayTypeSettingsRow | null>(null);
  const [formTypeCode, setFormTypeCode] = useState("");
  const [formTypeName, setFormTypeName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");

  useEffect(() => setRows(initialRows), [initialRows]);

  const filtered = useMemo(
    () => rows.filter((r) => `${r.typeCode} ${r.typeName} ${r.description}`.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );
  const paging = usePagedList(filtered, PAGE_SIZE, search);

  const openAdd = () => {
    setEditing(null);
    setFormTypeCode("");
    setFormTypeName("");
    setFormDescription("");
    setFormStatus("Active");
    setDialogOpen(true);
  };

  const openEdit = (row: PayTypeSettingsRow) => {
    setEditing(row);
    setFormTypeCode(row.typeCode);
    setFormTypeName(row.typeName);
    setFormDescription(row.description);
    setFormStatus(row.status);
    setDialogOpen(true);
  };

  const saveRow = async () => {
    if (!formTypeName.trim()) {
      toast({ title: "Error", description: "Type name is required.", variant: "destructive" });
      return;
    }
    const payload = {
      typeCode: formTypeCode,
      typeName: formTypeName,
      description: formDescription,
      status: formStatus,
    };
    try {
      if (editing) {
        const res = await fetch(API_ROUTES.payType(editing.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not update pay type.", variant: "destructive" });
          return;
        }
      } else {
        const res = await fetch(API_ROUTES.PAY_TYPES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not add pay type.", variant: "destructive" });
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
      const res = await fetch(API_ROUTES.payType(deleteId), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not delete pay type.", variant: "destructive" });
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pay Type</h1>
        <p className="text-muted-foreground">Manage pay_types table</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pay Types</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paging.pagedItems.map((row, i) => (
                <TableRow key={row.id}>
                  <TableCell>{(paging.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell>{row.typeCode || "—"}</TableCell>
                  <TableCell className="font-medium">{row.typeName}</TableCell>
                  <TableCell className="max-w-[360px] truncate text-muted-foreground">{row.description || "—"}</TableCell>
                  <TableCell><Badge variant={row.status === "Active" ? "default" : "secondary"}>{row.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4 text-primary" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No pay types found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <DataTablePagination
            totalItems={paging.totalItems}
            page={paging.page}
            totalPages={paging.totalPages}
            rangeFrom={paging.rangeFrom}
            rangeTo={paging.rangeTo}
            onPageChange={paging.goPage}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Pay Type" : "Add Pay Type"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Type Code</Label><Input value={formTypeCode} onChange={e => setFormTypeCode(e.target.value)} /></div>
            <div className="space-y-2"><Label>Type Name <span className="text-destructive">*</span></Label><Input value={formTypeName} onChange={e => setFormTypeName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={formDescription} onChange={e => setFormDescription(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={(v: "Active" | "Inactive") => setFormStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveRow}>{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pay Type</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRow}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PayTypesSettings;
