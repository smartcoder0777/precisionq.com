"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTablePagination } from "@/components/data-table-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="min-h-[200px] rounded-md border border-dashed border-border bg-muted/30" />,
});
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, Code, Eye, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES, languageFlagEmoji } from "@/lib/supported-languages";
import { API_ROUTES } from "@/routes";
import type { AgreementClinicOption, AgreementPageRow } from "@/types/agreements-page";

const AGREEMENT_TYPES = ["Privacy Policy", "Terms of Use"];
const STATUSES = ["Active", "Inactive"] as const;

type MultiLang = Record<string, string>;

const PAGE_SIZE = 10;

/** Max clinic names in the add/edit dialog "Selected:" line before appending "N clinics more...". */
const MAX_SELECTED_CLINIC_NAMES = 2;
/** Max clinic badges per row in the agreements table before appending "N clinics more...". */
const MAX_TABLE_CLINIC_BADGES = 2;

function clinicsMoreLabel(count: number): string {
  if (count <= 0) return "";
  return `${count} ${count === 1 ? "clinic" : "clinics"} more...`;
}

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link"],
    ["blockquote", "code-block"],
    ["clean"],
  ],
};

export type AgreementsProps = {
  initialRows: AgreementPageRow[];
  clinics: AgreementClinicOption[];
};

function emptyContent(): MultiLang {
  return LANGUAGES.reduce((acc, l) => ({ ...acc, [l.code]: "" }), {} as MultiLang);
}

const Agreements = ({ initialRows, clinics }: AgreementsProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [agreements, setAgreements] = useState<AgreementPageRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [filterClinic, setFilterClinic] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [htmlMode, setHtmlMode] = useState(false);

  useEffect(() => {
    setAgreements(initialRows);
  }, [initialRows]);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("Privacy Policy");
  const [formClinicIds, setFormClinicIds] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<(typeof STATUSES)[number]>("Active");
  const [formContent, setFormContent] = useState<MultiLang>({});
  const [activeLang, setActiveLang] = useState("en");

  const resetForm = () => {
    setFormName("");
    setFormType("Privacy Policy");
    setFormClinicIds([]);
    setFormStatus("Active");
    setFormContent({});
    setActiveLang("en");
    setEditingId(null);
    setHtmlMode(false);
  };

  const openAdd = () => {
    resetForm();
    setFormContent(emptyContent());
    setModalOpen(true);
  };

  const openEdit = (a: AgreementPageRow) => {
    setEditingId(a.id);
    setFormName(a.name);
    setFormType(a.type);
    setFormClinicIds([...a.clinicIds]);
    setFormStatus(a.status === "Inactive" ? "Inactive" : "Active");
    setFormContent({ ...emptyContent(), ...a.content });
    setActiveLang("en");
    setHtmlMode(false);
    setModalOpen(true);
  };

  const toggleFormClinic = (clinicId: string) => {
    setFormClinicIds(prev =>
      prev.includes(clinicId) ? prev.filter(id => id !== clinicId) : [...prev, clinicId],
    );
  };

  const toggleSelectAllClinics = () => {
    const allIds = clinics.map(c => String(c.id));
    if (formClinicIds.length === allIds.length) {
      setFormClinicIds([]);
    } else {
      setFormClinicIds(allIds);
    }
  };

  const getClinicName = (id: string) => clinics.find(c => String(c.id) === id)?.name ?? `#${id}`;

  const formatClinicList = (ids: string[]) => {
    if (ids.length === 0) return "—";
    if (ids.length <= MAX_SELECTED_CLINIC_NAMES) {
      return ids.map(id => getClinicName(id)).join(", ");
    }
    const shown = ids
      .slice(0, MAX_SELECTED_CLINIC_NAMES)
      .map(id => getClinicName(id))
      .join(", ");
    const more = ids.length - MAX_SELECTED_CLINIC_NAMES;
    return `${shown}, ${clinicsMoreLabel(more)}`;
  };

  const selectedClinicsFullTitle =
    formClinicIds.length > MAX_SELECTED_CLINIC_NAMES
      ? formClinicIds.map(id => getClinicName(id)).join(", ")
      : undefined;

  const handleSave = async () => {
    if (!formName.trim() || formClinicIds.length === 0) {
      toast({ title: "Error", description: "Agreement name and at least one clinic are required.", variant: "destructive" });
      return;
    }

    const body = {
      name: formName.trim(),
      type: formType,
      status: formStatus === "Active" ? 1 : 0,
      clinicIds: formClinicIds.map(id => Number(id)).filter(n => Number.isFinite(n) && n > 0),
      content: formContent,
    };

    try {
      if (editingId != null) {
        const res = await fetch(API_ROUTES.agreement(editingId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not update agreement.", variant: "destructive" });
          return;
        }
        toast({ title: "Updated", description: "Agreement updated successfully." });
      } else {
        const res = await fetch(API_ROUTES.AGREEMENTS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not create agreement.", variant: "destructive" });
          return;
        }
        toast({ title: "Created", description: "Agreement created successfully." });
      }
      setModalOpen(false);
      resetForm();
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      const res = await fetch(API_ROUTES.agreement(deleteId), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not delete agreement.", variant: "destructive" });
        return;
      }
      toast({ title: "Deleted", description: "Agreement removed successfully." });
      setDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const openPreview = (a: AgreementPageRow, langCode: string) => {
    const content = a.content[langCode] || "<p>No content available for this language.</p>";
    setPreviewTitle(`${a.name} — ${LANGUAGES.find(l => l.code === langCode)?.label || langCode}`);
    setPreviewContent(content);
    setPreviewOpen(true);
  };

  const filtered = useMemo(
    () =>
      agreements.filter(a => {
        const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
        const matchClinic = filterClinic === "all" || a.clinicIds.includes(filterClinic);
        return matchSearch && matchClinic;
      }),
    [agreements, search, filterClinic],
  );
  const { pagedItems, page, totalPages, totalItems, rangeFrom, rangeTo, goPage } = usePagedList(
    filtered,
    PAGE_SIZE,
    search,
    filterClinic,
  );

  const getCompletedCount = (completed: MultiLang) => {
    const done = Object.values(completed).filter(v => v === "Yes").length;
    return `${done}/${LANGUAGES.length}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agreements</h1>
          <p className="text-muted-foreground">
            Manage privacy policies and terms from the agreements table; clinics come from the clinics table.
          </p>
        </div>
        <Button onClick={openAdd} disabled={clinics.length === 0}>
          <Plus className="mr-2 h-4 w-4" /> Add Agreement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search agreements..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterClinic} onValueChange={setFilterClinic}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by clinic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clinics</SelectItem>
                {clinics.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinics</TableHead>
                  <TableHead>Agreement Name</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No agreements found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedItems.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="max-w-[220px]">
                        {a.clinicIds.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <div
                            className="flex flex-wrap items-center gap-1"
                            title={
                              a.clinicIds.length > MAX_TABLE_CLINIC_BADGES
                                ? a.clinicIds.map(cid => getClinicName(cid)).join(", ")
                                : undefined
                            }
                          >
                            {a.clinicIds.slice(0, MAX_TABLE_CLINIC_BADGES).map(cid => (
                              <Badge key={cid} variant="outline" className="text-xs font-normal">
                                <Building2 className="mr-1 h-3 w-3" />
                                {getClinicName(cid)}
                              </Badge>
                            ))}
                            {a.clinicIds.length > MAX_TABLE_CLINIC_BADGES ? (
                              <span className="text-xs text-muted-foreground">
                                {clinicsMoreLabel(a.clinicIds.length - MAX_TABLE_CLINIC_BADGES)}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {LANGUAGES.map(l => (
                            <button
                              key={l.code}
                              type="button"
                              onClick={() => openPreview(a, l.code)}
                              className={`cursor-pointer rounded px-1.5 py-0.5 text-xs transition-colors ${
                                a.content[l.code]?.replace(/<[^>]*>/g, "").trim()
                                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                              title={`Preview ${l.label}`}
                            >
                              {languageFlagEmoji(l.countryCode)}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.type === "Privacy Policy" ? "default" : "secondary"}>{a.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{getCompletedCount(a.completed)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.status === "Active" ? "default" : "secondary"}>{a.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(a)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(a.id)} title="Remove">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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

      <Dialog open={modalOpen} onOpenChange={open => { if (!open) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId != null ? "Update Agreement" : "Add Agreement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Agreement Name *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Patient Privacy Policy" />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGREEMENT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={v => setFormStatus(v as (typeof STATUSES)[number])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Clinics *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAllClinics}
                  disabled={clinics.length === 0}
                >
                  {formClinicIds.length === clinics.length && clinics.length > 0
                    ? "Deselect all clinics"
                    : "Select all clinics"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground" title={selectedClinicsFullTitle}>
                Selected: {formClinicIds.length === 0 ? "none" : formatClinicList(formClinicIds)}
              </p>
              {clinics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No clinics in the database. Add clinics before creating agreements.</p>
              ) : (
                <div className="max-h-[min(280px,42vh)] overflow-y-auto overflow-x-hidden rounded-md border border-border bg-muted/20 pr-1">
                  <div className="grid gap-2 p-2 sm:grid-cols-2">
                    {clinics.map(c => {
                      const idStr = String(c.id);
                      const on = formClinicIds.includes(idStr);
                      return (
                        <label
                          key={c.id}
                          className={`flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${on ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40"}`}
                        >
                          <Checkbox checked={on} onCheckedChange={() => toggleFormClinic(idStr)} />
                          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content (Multi-language)</Label>
                <Button variant="outline" size="sm" onClick={() => setHtmlMode(!htmlMode)} className="gap-1">
                  <Code className="h-3.5 w-3.5" />
                  {htmlMode ? "Rich Editor" : "HTML Code"}
                </Button>
              </div>
              <Tabs value={activeLang} onValueChange={setActiveLang}>
                <TabsList className="flex h-auto flex-wrap gap-1">
                  {LANGUAGES.map(l => {
                    const hasContent = formContent[l.code]?.replace(/<[^>]*>/g, "").trim();
                    return (
                      <TabsTrigger key={l.code} value={l.code} className="relative gap-1.5">
                        <span>{languageFlagEmoji(l.countryCode)}</span>
                        <span>{l.label}</span>
                        {hasContent ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-green-500" /> : null}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {LANGUAGES.map(l => (
                  <TabsContent key={l.code} value={l.code} className="mt-3">
                    {htmlMode ? (
                      <textarea
                        className="h-[300px] w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-sm"
                        value={formContent[l.code] || ""}
                        onChange={e => setFormContent(prev => ({ ...prev, [l.code]: e.target.value }))}
                        placeholder={`Paste or write HTML code for ${l.label}...`}
                      />
                    ) : (
                      <ReactQuill
                        theme="snow"
                        value={formContent[l.code] || ""}
                        onChange={val => setFormContent(prev => ({ ...prev, [l.code]: val }))}
                        modules={quillModules}
                        placeholder={`Write ${l.label} content...`}
                        style={{ minHeight: 200 }}
                      />
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={clinics.length === 0}>
              {editingId != null ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> {previewTitle}
            </DialogTitle>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none rounded-md border bg-muted/30 p-6 dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove this agreement record.
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

export default Agreements;
