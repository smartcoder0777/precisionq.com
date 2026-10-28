"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTablePagination } from "@/components/data-table-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ImageIcon, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES, languageFlagEmoji } from "@/lib/supported-languages";
import { patientServiceImageUrl } from "@/lib/public-media";
import { uploadPublicMedia } from "@/lib/upload-public-media";
import { API_ROUTES, adminPage } from "@/routes";
import type {
  PatientCategoryServiceRow,
  PatientCategoryServicesPagePayload,
} from "@/types/patient-category-services-page";

const PAGE_SIZE = 10;

function emptyLangRecord(): Record<string, string> {
  return LANGUAGES.reduce((acc, l) => ({ ...acc, [l.code]: "" }), {} as Record<string, string>);
}

function textPreview(html: string, max: number): string {
  const t = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function serviceToApiBody(fields: Omit<PatientCategoryServiceRow, "id">) {
  return {
    categoryId: fields.categoryId,
    names: fields.names,
    descriptions: fields.descriptions,
    details: fields.details,
    contact: fields.contact,
    image: fields.image,
    status: fields.status,
  };
}

type FormState = Omit<PatientCategoryServiceRow, "id">;

const PatientCategoryServices = ({
  categoryId,
  categoryNameEn,
  services,
}: PatientCategoryServicesPagePayload) => {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PatientCategoryServiceRow | null>(null);
  const [activeLang, setActiveLang] = useState("en");
  const [editorTab, setEditorTab] = useState("basic");

  const [form, setForm] = useState<FormState>({
    categoryId,
    names: emptyLangRecord(),
    descriptions: emptyLangRecord(),
    details: emptyLangRecord(),
    contact: "",
    image: null,
    status: "Active",
  });

  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingImage) {
      setPendingImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingImage);
    setPendingImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingImage]);

  const filtered = useMemo(
    () =>
      services.filter((s) => (s.names.en ?? "").toLowerCase().includes(search.toLowerCase())),
    [services, search],
  );
  const { pagedItems, page, totalPages, totalItems, rangeFrom, rangeTo, goPage } = usePagedList(
    filtered,
    PAGE_SIZE,
    search,
  );

  const resetForm = (): FormState => ({
    categoryId,
    names: emptyLangRecord(),
    descriptions: emptyLangRecord(),
    details: emptyLangRecord(),
    contact: "",
    image: null,
    status: "Active",
  });

  const openAdd = () => {
    setEditing(null);
    setForm(resetForm());
    setPendingImage(null);
    setActiveLang("en");
    setEditorTab("basic");
    setDialogOpen(true);
  };

  const openEdit = (row: PatientCategoryServiceRow) => {
    setEditing(row);
    setPendingImage(null);
    setForm({
      categoryId: row.categoryId,
      names: { ...row.names },
      descriptions: { ...row.descriptions },
      details: { ...row.details },
      contact: row.contact,
      image: row.image,
      status: row.status,
    });
    setActiveLang("en");
    setEditorTab("basic");
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.names.en.trim()) {
      toast({ title: "Error", description: "English name is required.", variant: "destructive" });
      return;
    }
    let imageField = form.image;
    if (pendingImage) {
      try {
        imageField = await uploadPublicMedia(pendingImage, { into: "patient_services" });
      } catch (err) {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Could not upload image.",
          variant: "destructive",
        });
        return;
      }
    }
    const body = serviceToApiBody({ ...form, image: imageField });
    try {
      if (editing) {
        const res = await fetch(API_ROUTES.patientServiceRow(editing.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not update service.", variant: "destructive" });
          return;
        }
        toast({ title: "Updated", description: "Service updated." });
      } else {
        const res = await fetch(API_ROUTES.PATIENT_SERVICES_ROWS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not add service.", variant: "destructive" });
          return;
        }
        toast({ title: "Added", description: "Service added." });
      }
      setPendingImage(null);
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(API_ROUTES.patientServiceRow(deleteId), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not delete service.", variant: "destructive" });
        return;
      }
      toast({ title: "Deleted", description: "Service removed." });
      setDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingImage(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href={adminPage("/patient-services")} aria-label="Back to categories">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Patient services</h1>
            <p className="text-muted-foreground">
              Category: <span className="font-medium text-foreground">{categoryNameEn}</span>
            </p>
          </div>
        </div>
        <Button type="button" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add service
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Services in this category</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by English name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description (EN)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((svc, i) => (
                <TableRow key={svc.id}>
                  <TableCell>{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell>
                    {svc.image ? (
                      <img
                        src={patientServiceImageUrl(svc.image)}
                        alt={svc.names.en}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{svc.names.en}</p>
                      <div className="mt-0.5 flex items-center gap-1">
                        {LANGUAGES.map((l) => (
                          <span
                            key={l.code}
                            className={`text-xs ${svc.names[l.code] ? "opacity-100" : "opacity-30 grayscale"}`}
                          >
                            {languageFlagEmoji(l.countryCode)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <p className="truncate text-sm text-muted-foreground">
                      {textPreview(svc.descriptions.en || "", 120)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={svc.status === "Active" ? "default" : "secondary"}>{svc.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" title="Edit" onClick={() => openEdit(svc)}>
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" title="Remove" onClick={() => setDeleteId(svc.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No services in this category yet.
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
          if (!open) setPendingImage(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit patient service" : "Add patient service"}</DialogTitle>
          </DialogHeader>

          <Tabs value={editorTab} onValueChange={setEditorTab}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="basic">Image & status</TabsTrigger>
              <TabsTrigger value="content">Content (languages)</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Image</Label>
                <div className="flex items-center gap-4">
                  {pendingImagePreviewUrl ? (
                    <img
                      src={pendingImagePreviewUrl}
                      alt="Preview"
                      className="h-20 w-20 rounded-lg border border-border object-cover"
                    />
                  ) : form.image ? (
                    <img
                      src={patientServiceImageUrl(form.image)}
                      alt="Preview"
                      className="h-20 w-20 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Input type="file" accept="image/*" onChange={handleImageSelect} className="max-w-xs" />
                    {(form.image || pendingImage) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPendingImage(null);
                          setForm(p => ({ ...p, image: null }));
                        }}
                      >
                        Remove image
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: "Active" | "Inactive") => setForm((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4 pt-4">
              <Tabs value={activeLang} onValueChange={setActiveLang}>
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
                  {LANGUAGES.map((l) => (
                    <TabsTrigger key={l.code} value={l.code} className="gap-1.5 text-xs">
                      <span>{languageFlagEmoji(l.countryCode)}</span>
                      {l.label}
                      {form.names[l.code]?.trim() ? (
                        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent" />
                      ) : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {LANGUAGES.map((l) => (
                  <TabsContent key={l.code} value={l.code} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>
                        Name ({l.label}) {l.code === "en" ? <span className="text-destructive">*</span> : null}
                      </Label>
                      <Input
                        value={form.names[l.code] || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            names: { ...prev.names, [l.code]: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Description ({l.label}){" "}
                        <span className="text-xs text-muted-foreground">— HTML allowed</span>
                      </Label>
                      <Textarea
                        rows={3}
                        className="font-mono text-sm"
                        value={form.descriptions[l.code] || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            descriptions: { ...prev.descriptions, [l.code]: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Details ({l.label}){" "}
                        <span className="text-xs text-muted-foreground">— HTML allowed</span>
                      </Label>
                      <Textarea
                        rows={3}
                        className="font-mono text-sm"
                        value={form.details[l.code] || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            details: { ...prev.details, [l.code]: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>

            <TabsContent value="contact" className="space-y-2 pt-4">
              <Label>Contact</Label>
              <Textarea
                rows={5}
                placeholder="Phone, email, or other contact notes…"
                value={form.contact}
                onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()}>
              {editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the row and deletes the image file from disk when it is stored under the patient services
              folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientCategoryServices;
