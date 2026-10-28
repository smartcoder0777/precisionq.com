"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTablePagination } from "@/components/data-table-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import { Plus, Search, Pencil, Trash2, Building2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes";
import type { ClinicsPageClinic, ClinicsPageInsuranceOption } from "@/types/clinics-page";
import { normalizeUsPhone, US_PHONE_PATTERN } from "@/lib/phone-format";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const PAGE_SIZE = 10;

export type ClinicsProps = {
  initialClinics: ClinicsPageClinic[];
  insuranceOptions: ClinicsPageInsuranceOption[];
};

function ClinicInsurancesIconButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-9 shrink-0"
      title="Select insurances"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="relative flex h-5 w-7 items-center justify-center">
        <Shield className="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
        <Shield className="absolute left-1/2 top-1/2 z-[1] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/90" strokeWidth={1.75} />
        <Shield className="absolute right-0 top-1/2 z-[2] h-3.5 w-3.5 -translate-y-1/2 text-primary" strokeWidth={1.75} />
      </span>
    </Button>
  );
}

const Clinics = ({ initialClinics, insuranceOptions }: ClinicsProps) => {
  const router = useRouter();
  const [clinics, setClinics] = useState<ClinicsPageClinic[]>(initialClinics);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicsPageClinic | null>(null);
  const [deleteClinic, setDeleteClinic] = useState<ClinicsPageClinic | null>(null);
  const [insuranceClinic, setInsuranceClinic] = useState<ClinicsPageClinic | null>(null);
  const [selectedInsuranceIds, setSelectedInsuranceIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savingInsurances, setSavingInsurances] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setClinics(initialClinics);
  }, [initialClinics]);

  const [f, setF] = useState({
    clinicId: "",
    name: "",
    acronym: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    web: "",
    portal: "",
  });

  const filtered = useMemo(
    () =>
      clinics.filter((c) =>
        `${c.clinicIdDisplay} ${c.name} ${c.address1} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [clinics, search],
  );

  const { pagedItems, page, totalPages, totalItems, rangeFrom, rangeTo, goPage } = usePagedList(filtered, PAGE_SIZE, search);

  const resetForm = () =>
    setF({
      clinicId: "",
      name: "",
      acronym: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      phone: "",
      email: "",
      web: "",
      portal: "",
    });

  const openAdd = () => {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (c: ClinicsPageClinic) => {
    setEditing(c);
    setF({
      clinicId: c.clinicIdDisplay,
      name: c.name,
      acronym: c.acronym,
      address1: c.address1,
      address2: c.address2,
      city: c.city,
      state: c.state,
      zip: c.zip,
      phone: c.phone,
      email: c.email,
      web: c.web,
      portal: c.portal,
    });
    setDialogOpen(true);
  };

  const openInsuranceModal = (c: ClinicsPageClinic) => {
    setInsuranceClinic(c);
    setSelectedInsuranceIds(c.insuranceIds.map(String));
  };

  const toggleInsurance = (idStr: string) => {
    setSelectedInsuranceIds((prev) => (prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr]));
  };

  const selectAllInsuranceToggle = () => {
    if (insuranceOptions.length === 0) return;
    if (selectedInsuranceIds.length === insuranceOptions.length) {
      setSelectedInsuranceIds([]);
    } else {
      setSelectedInsuranceIds(insuranceOptions.map((o) => String(o.id)));
    }
  };

  const saveInsurances = async () => {
    if (!insuranceClinic) return;
    setSavingInsurances(true);
    try {
      const insuranceIds = selectedInsuranceIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
      const res = await fetch(API_ROUTES.clinicInsurances(insuranceClinic.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insuranceIds }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ variant: "destructive", title: "Save failed", description: data.message || res.statusText });
        return;
      }
      toast({ title: "Saved", description: `Insurances updated for ${insuranceClinic.name}.` });
      setInsuranceClinic(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Save failed", description: "Network error." });
    } finally {
      setSavingInsurances(false);
    }
  };

  const buildPayload = () => ({
    clinicId: f.clinicId.trim() === "" ? null : f.clinicId,
    name: f.name.trim(),
    acronym: f.acronym.trim() || null,
    address1: f.address1.trim() || null,
    address2: f.address2.trim() || null,
    city: f.city.trim() || null,
    state: f.state.trim() || null,
    zip: f.zip.trim() || null,
    phone: f.phone.trim() || null,
    email: f.email.trim() || null,
    web: f.web.trim() || null,
    portal: f.portal.trim() || null,
  });

  const formatClinicPhoneOnBlur = () => {
    setF((prev) => {
      if (!prev.phone.trim()) return prev;
      return { ...prev, phone: normalizeUsPhone(prev.phone) ?? prev.phone };
    });
  };

  const handleSave = async () => {
    if (!f.name.trim()) {
      toast({ title: "Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editing) {
        const res = await fetch(API_ROUTES.clinic(editing.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ variant: "destructive", title: "Update failed", description: data.message || res.statusText });
          return;
        }
        toast({ title: "Updated", description: `${f.name} updated.` });
      } else {
        const res = await fetch(API_ROUTES.CLINICS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ variant: "destructive", title: "Create failed", description: data.message || res.statusText });
          return;
        }
        toast({ title: "Added", description: `${f.name} added.` });
      }
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Request failed", description: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteClinic) return;
    setRemoving(true);
    try {
      const res = await fetch(API_ROUTES.clinic(deleteClinic.id), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ variant: "destructive", title: "Delete failed", description: data.message || res.statusText });
        return;
      }
      toast({ title: "Removed", description: `${deleteClinic.name} removed.` });
      setDeleteClinic(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Delete failed", description: "Network error." });
    } finally {
      setRemoving(false);
    }
  };

  const updateField = (key: string, value: string) => setF((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clinics</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage clinic locations from the database</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Clinic
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> All Clinics ({filtered.length})
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clinics..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clinic ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Web</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.clinicIdDisplay || "—"}</TableCell>
                  <TableCell>{c.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {[c.address1, c.address2].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[140px] truncate">{c.web || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ClinicInsurancesIconButton
                        onClick={() => openInsuranceModal(c)}
                        disabled={insuranceOptions.length === 0}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteClinic(c)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No clinics found
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(90dvh,900px)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-y-auto overflow-x-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border bg-muted/30 px-5 py-4">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg">{editing ? "Edit clinic" : "Add clinic"}</DialogTitle>
              <p className="text-sm font-normal text-muted-foreground">Name is required. Other fields are optional.</p>
            </DialogHeader>
          </div>
          <div className="space-y-5 px-5 py-5">
            <section className="space-y-3 border-l-2 border-primary/25 pl-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Identity</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clinic-external-id">Clinic # (optional)</Label>
                  <Input
                    id="clinic-external-id"
                    className="h-10"
                    value={f.clinicId}
                    onChange={(e) => updateField("clinicId", e.target.value)}
                    placeholder="Numeric ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-acronym">Acronym</Label>
                  <Input id="clinic-acronym" className="h-10" value={f.acronym} onChange={(e) => updateField("acronym", e.target.value)} placeholder="e.g. MC" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="clinic-name">Name *</Label>
                  <Input
                    id="clinic-name"
                    className="h-10"
                    value={f.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Clinic name"
                  />
                </div>
              </div>
            </section>
            <section className="space-y-3 border-l-2 border-primary/25 pl-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Address</h3>
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="clinic-address1">Line 1</Label>
                  <Input id="clinic-address1" className="h-10" value={f.address1} onChange={(e) => updateField("address1", e.target.value)} placeholder="Street" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-address2">Line 2</Label>
                  <Input id="clinic-address2" className="h-10" value={f.address2} onChange={(e) => updateField("address2", e.target.value)} placeholder="Suite, unit" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="col-span-2 space-y-2 sm:col-span-1">
                    <Label htmlFor="clinic-city">City</Label>
                    <Input id="clinic-city" className="h-10" value={f.city} onChange={(e) => updateField("city", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinic-state">State</Label>
                    <Select value={f.state || undefined} onValueChange={(v) => updateField("state", v)}>
                      <SelectTrigger id="clinic-state" className="h-10">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2 sm:col-span-1">
                    <Label htmlFor="clinic-zip">ZIP</Label>
                    <Input id="clinic-zip" className="h-10" value={f.zip} onChange={(e) => updateField("zip", e.target.value)} />
                  </div>
                </div>
              </div>
            </section>
            <section className="space-y-3 border-l-2 border-primary/25 pl-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Contact and links</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clinic-phone">Phone</Label>
                  <Input
                    id="clinic-phone"
                    className="h-10"
                    placeholder={US_PHONE_PATTERN}
                    value={f.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    onBlur={formatClinicPhoneOnBlur}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-email">Email</Label>
                  <Input id="clinic-email" type="email" className="h-10" value={f.email} onChange={(e) => updateField("email", e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="clinic-web">Website</Label>
                  <Input id="clinic-web" className="h-10" value={f.web} onChange={(e) => updateField("web", e.target.value)} placeholder="https://…" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="clinic-portal">Patient portal</Label>
                  <Input id="clinic-portal" className="h-10" value={f.portal} onChange={(e) => updateField("portal", e.target.value)} placeholder="https://…" />
                </div>
              </div>
            </section>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-5 py-3 sm:justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!insuranceClinic} onOpenChange={(open) => !open && setInsuranceClinic(null)}>
        <DialogContent className="flex max-h-[min(90dvh,900px)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-y-auto overflow-x-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border bg-muted/30 px-5 py-4">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg">Insurances — {insuranceClinic?.name ?? ""}</DialogTitle>
              <p className="text-sm font-normal text-muted-foreground">Choose one or more plans for this clinic.</p>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-sm font-medium">Available plans</Label>
              {insuranceOptions.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={selectAllInsuranceToggle}>
                  {selectedInsuranceIds.length === insuranceOptions.length ? "Deselect all" : "Select all"}
                </Button>
              )}
            </div>
            {insuranceOptions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No insurance plans in the database.
              </p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {insuranceOptions.map((opt) => {
                  const idStr = String(opt.id);
                  const on = selectedInsuranceIds.includes(idStr);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleInsurance(idStr)}
                      className={`flex min-h-[3.25rem] items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${on ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:bg-muted/40"}`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? "border-primary bg-primary" : "border-muted-foreground/50"}`}
                      >
                        {on ? <span className="text-[10px] text-primary-foreground">✓</span> : null}
                      </span>
                      <Shield className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                      <span className="leading-snug">{opt.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-5 py-3 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setInsuranceClinic(null)} disabled={savingInsurances}>
              Cancel
            </Button>
            <Button type="button" onClick={saveInsurances} disabled={savingInsurances || !insuranceClinic}>
              {savingInsurances ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteClinic} onOpenChange={() => setDeleteClinic(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clinic</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete {deleteClinic?.name}? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={removing}>
              {removing ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clinics;
