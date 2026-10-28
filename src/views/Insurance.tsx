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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Search, Pencil, Trash2, ShieldCheck, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insuranceImageUrl } from "@/lib/public-media";
import { uploadPublicMedia } from "@/lib/upload-public-media";
import { API_ROUTES } from "@/routes";
import type { InsurancePageClinicOption, InsurancePageRow } from "@/types/insurance-page";
import { normalizeUsPhone, US_PHONE_PATTERN } from "@/lib/phone-format";

const PAGE_SIZE = 10;

export type InsuranceProps = {
  initialRows: InsurancePageRow[];
  clinicOptions: InsurancePageClinicOption[];
};

const Insurance = ({ initialRows, clinicOptions }: InsuranceProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [records, setRecords] = useState<InsurancePageRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<InsurancePageRow | null>(null);
  const [editing, setEditing] = useState<InsurancePageRow | null>(null);

  const [clinicModalInsurance, setClinicModalInsurance] = useState<InsurancePageRow | null>(null);
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  const [savingClinics, setSavingClinics] = useState(false);

  useEffect(() => {
    setRecords(initialRows);
  }, [initialRows]);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formFax, setFormFax] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formZip, setFormZip] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [pendingLogoPreviewUrl, setPendingLogoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingLogo) {
      setPendingLogoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingLogo);
    setPendingLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingLogo]);

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        const hay = `${r.name} ${r.addressLine} ${r.phone ?? ""} ${r.email ?? ""} ${r.status}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      }),
    [records, search],
  );
  const { pagedItems, page, totalPages, totalItems, rangeFrom, rangeTo, goPage } = usePagedList(
    filtered,
    PAGE_SIZE,
    search,
  );

  const buildApiBody = (img: string) => ({
    name: formName.trim(),
    email: formEmail.trim() || null,
    phone: formPhone.trim() || null,
    fax: formFax.trim() || null,
    address: formAddress.trim() || null,
    city: formCity.trim() || null,
    state: formState.trim() || null,
    zip: formZip.trim() || null,
    status: formStatus === "Active" ? 1 : 0,
    img,
  });

  const formatInsurancePhoneOnBlur = (field: "phone" | "fax") => {
    if (field === "phone") {
      setFormPhone((p) => (p.trim() ? normalizeUsPhone(p) ?? p : p));
      return;
    }
    setFormFax((p) => (p.trim() ? normalizeUsPhone(p) ?? p : p));
  };

  const openAdd = () => {
    setEditing(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormFax("");
    setFormAddress("");
    setFormCity("");
    setFormState("");
    setFormZip("");
    setFormStatus("Active");
    setFormLogoUrl("");
    setPendingLogo(null);
    setDialogOpen(true);
  };

  const openEdit = (rec: InsurancePageRow) => {
    setEditing(rec);
    setFormName(rec.name);
    setFormEmail(rec.email ?? "");
    setFormPhone(rec.phone ?? "");
    setFormFax(rec.fax ?? "");
    setFormAddress(rec.address ?? "");
    setFormCity(rec.city ?? "");
    setFormState(rec.state ?? "");
    setFormZip(rec.zip ?? "");
    setFormStatus(rec.status);
    setFormLogoUrl(rec.img ?? "");
    setPendingLogo(null);
    setDialogOpen(true);
  };

  const openClinicModal = (rec: InsurancePageRow) => {
    setClinicModalInsurance(rec);
    setSelectedClinicIds(rec.clinicIds.map(String));
  };

  const toggleClinicDraft = (idStr: string) => {
    setSelectedClinicIds(prev =>
      prev.includes(idStr) ? prev.filter(x => x !== idStr) : [...prev, idStr],
    );
  };

  const toggleAllClinicsDraft = () => {
    if (clinicOptions.length === 0) return;
    if (selectedClinicIds.length === clinicOptions.length) {
      setSelectedClinicIds([]);
    } else {
      setSelectedClinicIds(clinicOptions.map(c => String(c.id)));
    }
  };

  const saveClinicLinks = async () => {
    if (!clinicModalInsurance) return;
    setSavingClinics(true);
    try {
      const clinicIds = selectedClinicIds.map(Number).filter(n => Number.isFinite(n) && n > 0);
      const res = await fetch(API_ROUTES.insuranceClinics(clinicModalInsurance.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicIds }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not save clinics.", variant: "destructive" });
        return;
      }
      toast({ title: "Saved", description: "Clinic assignments updated." });
      setClinicModalInsurance(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    } finally {
      setSavingClinics(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "Insurance name is required.", variant: "destructive" });
      return;
    }
    let img = formLogoUrl;
    if (pendingLogo) {
      try {
        img = await uploadPublicMedia(pendingLogo, { into: "insurances" });
      } catch (err) {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Could not upload logo.",
          variant: "destructive",
        });
        return;
      }
    }
    const body = buildApiBody(img);
    try {
      if (editing) {
        const res = await fetch(API_ROUTES.insurance(editing.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not update insurance.", variant: "destructive" });
          return;
        }
        toast({ title: "Updated", description: `${formName.trim()} has been updated.` });
      } else {
        const res = await fetch(API_ROUTES.INSURANCES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { ok?: boolean; id?: number; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not add insurance.", variant: "destructive" });
          return;
        }
        toast({ title: "Added", description: `${formName.trim()} has been added.` });
      }
      setPendingLogo(null);
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;
    try {
      const res = await fetch(API_ROUTES.insurance(deleteRecord.id), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not delete insurance.", variant: "destructive" });
        return;
      }
      toast({ title: "Removed", description: `${deleteRecord.name} has been removed.` });
      setDeleteRecord(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingLogo(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Insurance</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage insurance providers from the insurances table; assign clinics via the clinic action.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Insurance
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              All Insurance ({filtered.length})
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search insurance..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Logo</TableHead>
                <TableHead>Insurance Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Clinics</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map(rec => (
                <TableRow key={rec.id}>
                  <TableCell>
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                      {rec.img ? (
                        <img src={insuranceImageUrl(rec.img)} alt={rec.name} className="h-full w-full object-cover" />
                      ) : (
                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{rec.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{rec.addressLine}</TableCell>
                  <TableCell className="text-muted-foreground">{rec.phone ?? "—"}</TableCell>
                  <TableCell>
                    {rec.clinicNames.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {rec.clinicNames.map((name, i) => (
                          <Badge key={`${rec.id}-c-${i}`} variant="outline" className="text-xs">
                            <Building2 className="mr-1 h-3 w-3" />
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rec.status === "Active" ? "default" : "secondary"}>{rec.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Assign clinics"
                        onClick={() => openClinicModal(rec)}
                        disabled={clinicOptions.length === 0}
                      >
                        <Building2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(rec)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Delete"
                        onClick={() => setDeleteRecord(rec)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No insurance records found
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

      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) setPendingLogo(null);
        }}
      >
        <DialogContent className="max-h-[min(90dvh,900px)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Insurance" : "Add Insurance"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Logo (optional)</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                  {pendingLogoPreviewUrl ? (
                    <img src={pendingLogoPreviewUrl} alt="" className="h-full w-full object-cover" />
                  ) : formLogoUrl ? (
                    <img src={insuranceImageUrl(formLogoUrl)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input type="file" accept="image/*" onChange={handleLogoSelect} className="cursor-pointer text-sm" />
                  <p className="text-xs text-muted-foreground">
                    Logo is saved under public/images/insurances when you click {editing ? "Update" : "Add"}.
                  </p>
                  {(formLogoUrl || pendingLogo) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPendingLogo(null);
                        setFormLogoUrl("");
                      }}
                    >
                      Remove logo
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Insurance name *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Enter insurance name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="Email" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  onBlur={() => formatInsurancePhoneOnBlur("phone")}
                  placeholder={US_PHONE_PATTERN}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fax</Label>
              <Input
                value={formFax}
                onChange={e => setFormFax(e.target.value)}
                onBlur={() => formatInsurancePhoneOnBlur("fax")}
                placeholder={US_PHONE_PATTERN}
              />
            </div>
            <div className="space-y-2">
              <Label>Street address</Label>
              <Input value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Address line" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formCity} onChange={e => setFormCity(e.target.value)} placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={formState} onChange={e => setFormState(e.target.value)} placeholder="State" />
              </div>
              <div className="space-y-2">
                <Label>ZIP</Label>
                <Input value={formZip} onChange={e => setFormZip(e.target.value)} placeholder="ZIP" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={v => setFormStatus(v as "Active" | "Inactive")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()}>{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!clinicModalInsurance} onOpenChange={open => !open && setClinicModalInsurance(null)}>
        <DialogContent className="flex max-h-[min(90dvh,900px)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-y-auto overflow-x-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border bg-muted/30 px-5 py-4">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg">Clinics — {clinicModalInsurance?.name ?? ""}</DialogTitle>
              <p className="text-sm font-normal text-muted-foreground">Select one or more clinics for this insurance.</p>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-sm font-medium">Clinics</Label>
              {clinicOptions.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={toggleAllClinicsDraft}>
                  {selectedClinicIds.length === clinicOptions.length ? "Deselect all" : "Select all"}
                </Button>
              )}
            </div>
            {clinicOptions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No clinics in the database.
              </p>
            ) : (
              <div className="grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2">
                {clinicOptions.map(opt => {
                  const idStr = String(opt.id);
                  const on = selectedClinicIds.includes(idStr);
                  return (
                    <label
                      key={opt.id}
                      className={`flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${on ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:bg-muted/40"}`}
                    >
                      <Checkbox checked={on} onCheckedChange={() => toggleClinicDraft(idStr)} />
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="leading-snug">{opt.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-5 py-3 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setClinicModalInsurance(null)} disabled={savingClinics}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveClinicLinks()} disabled={savingClinics || !clinicModalInsurance}>
              {savingClinics ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRecord} onOpenChange={open => !open && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Insurance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteRecord?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Insurance;
