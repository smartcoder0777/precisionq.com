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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, FileText, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES, languageFlagEmoji } from "@/lib/supported-languages";
import { educationDocumentUrl } from "@/lib/public-media";
import { uploadPublicMedia } from "@/lib/upload-public-media";
import { API_ROUTES } from "@/routes";
import type { EducationPageRow, LangDocument } from "@/types/education-page";

const PAGE_SIZE = 10;

type MultiLangField = Record<string, string>;

const emptyMultiLang = (): MultiLangField => LANGUAGES.reduce((acc, l) => ({ ...acc, [l.code]: "" }), {});

function toApiBody(fields: {
  pageName: string;
  title: MultiLangField;
  description: MultiLangField;
  documents: Partial<Record<string, LangDocument>>;
}) {
  return {
    pageName: fields.pageName,
    title: fields.title,
    description: fields.description,
    documents: fields.documents,
  };
}

export type EducationProps = {
  initialRows: EducationPageRow[];
};

const Education = ({ initialRows }: EducationProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [records, setRecords] = useState<EducationPageRow[]>(initialRows);

  useEffect(() => {
    setRecords(initialRows);
  }, [initialRows]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EducationPageRow | null>(null);
  const [activeLang, setActiveLang] = useState("en");

  // Form state
  const [formPageName, setFormPageName] = useState("");
  const [formTitle, setFormTitle] = useState<MultiLangField>(emptyMultiLang());
  const [formDesc, setFormDesc] = useState<MultiLangField>(emptyMultiLang());
  const [formDocs, setFormDocs] = useState<Partial<Record<string, LangDocument>>>({});
  /** Files chosen in the dialog; uploaded only when saving the page. */
  const [pendingDocs, setPendingDocs] = useState<Partial<Record<string, File>>>({});
  const [pendingDocUrls, setPendingDocUrls] = useState<Partial<Record<string, string>>>({});
  useEffect(() => {
    const next: Partial<Record<string, string>> = {};
    for (const [code, file] of Object.entries(pendingDocs)) {
      if (file) next[code] = URL.createObjectURL(file);
    }
    setPendingDocUrls(next);
    return () => {
      for (const u of Object.values(next)) {
        if (u) URL.revokeObjectURL(u);
      }
    };
  }, [pendingDocs]);

  const filtered = useMemo(
    () =>
      records.filter(
        (r) =>
          r.pageName.toLowerCase().includes(search.toLowerCase()) ||
          r.title.en.toLowerCase().includes(search.toLowerCase()),
      ),
    [records, search],
  );
  const { pagedItems, page, totalPages, totalItems, rangeFrom, rangeTo, goPage } = usePagedList(filtered, PAGE_SIZE, search);

  const openAdd = () => {
    setEditing(null);
    setFormPageName("");
    setFormTitle(emptyMultiLang());
    setFormDesc(emptyMultiLang());
    setFormDocs({});
    setPendingDocs({});
    setActiveLang("en");
    setDialogOpen(true);
  };

  const openEdit = (rec: EducationPageRow) => {
    setEditing(rec);
    setFormPageName(rec.pageName);
    setFormTitle({ ...rec.title });
    setFormDesc({ ...rec.description });
    setFormDocs({ ...rec.documents });
    setPendingDocs({});
    setActiveLang("en");
    setDialogOpen(true);
  };

  const handleDocSelect = (langCode: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingDocs(prev => ({ ...prev, [langCode]: file }));
  };

  const openEducationDocument = (doc: LangDocument) => {
    const url = educationDocumentUrl(doc.path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const openPendingEducationDocument = (langCode: string) => {
    const url = pendingDocUrls[langCode];
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const removeDoc = (langCode: string) => {
    setPendingDocs(prev => {
      const next = { ...prev };
      delete next[langCode];
      return next;
    });
    setFormDocs(prev => {
      const next = { ...prev };
      delete next[langCode];
      return next;
    });
  };

  const handleSave = async () => {
    if (!formPageName.trim()) {
      toast({ title: "Error", description: "Page name is required.", variant: "destructive" });
      return;
    }
    if (!formTitle.en.trim()) {
      toast({ title: "Error", description: "English title is required.", variant: "destructive" });
      return;
    }
    const mergedDocs: Partial<Record<string, LangDocument>> = { ...formDocs };
    for (const [langCode, file] of Object.entries(pendingDocs)) {
      if (!file) continue;
      try {
        const path = await uploadPublicMedia(file, { into: "educations" });
        mergedDocs[langCode] = {
          path,
          displayName: file.name,
          sizeLabel: `${(file.size / 1024).toFixed(1)} KB`,
        };
      } catch (err) {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Could not upload document.",
          variant: "destructive",
        });
        return;
      }
    }
    const body = toApiBody({
      pageName: formPageName.trim(),
      title: formTitle,
      description: formDesc,
      documents: mergedDocs,
    });
    try {
      if (editing) {
        const res = await fetch(API_ROUTES.education(editing.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not update.", variant: "destructive" });
          return;
        }
        toast({ title: "Updated", description: "Education page updated." });
      } else {
        const res = await fetch(API_ROUTES.EDUCATIONS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not add.", variant: "destructive" });
          return;
        }
        toast({ title: "Added", description: "Education page added." });
      }
      setPendingDocs({});
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(API_ROUTES.education(deleteId), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not delete.", variant: "destructive" });
        return;
      }
      toast({ title: "Deleted", description: "Education page removed." });
      setDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const getDocCount = (rec: EducationPageRow) => Object.keys(rec.documents).length;
  const getTranslationCount = (rec: EducationPageRow) => Object.values(rec.title).filter(t => t.trim()).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Education</h1>
          <p className="text-muted-foreground">Manage educational content with multi-language support and document uploads</p>
        </div>
        <Button type="button" onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Education Page</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Education Pages</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search pages..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Page Name</TableHead>
                <TableHead>Title (EN)</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Languages</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((rec, i) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-medium">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="font-medium">{rec.pageName}</TableCell>
                  <TableCell className="max-w-[180px]">
                    <p className="truncate text-sm">{rec.title.en || "—"}</p>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-sm text-muted-foreground">{rec.description.en || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {LANGUAGES.map(l => (
                        <span key={l.code} className={`text-sm ${rec.title[l.code] ? "opacity-100" : "opacity-25 grayscale"}`}>{languageFlagEmoji(l.countryCode)}</span>
                      ))}
                      <Badge variant="outline" className="ml-1 text-xs">{getTranslationCount(rec)}/{LANGUAGES.length}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{getDocCount(rec)} files</span>
                      {getDocCount(rec) > 0 && (
                        <div className="flex gap-0.5 ml-1">
                          {LANGUAGES.filter(l => rec.documents[l.code]).map(l => (
                            <span key={l.code} className="text-xs">{languageFlagEmoji(l.countryCode)}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {rec.updatedAt || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(rec)}><Pencil className="h-4 w-4 text-primary" /></Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteId(rec.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No education pages found.</TableCell></TableRow>
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

      {/* Add / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) setPendingDocs({});
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Education Page" : "Add Education Page"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Page name <span className="text-destructive">*</span></Label>
              <Input value={formPageName} onChange={e => setFormPageName(e.target.value)} placeholder="e.g. Patient Rights" />
            </div>

            {/* Multi-language Title & Description */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <Label className="text-sm font-semibold">Multi-Language Content</Label>

              <Tabs value={activeLang} onValueChange={setActiveLang}>
                <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
                  {LANGUAGES.map(lang => {
                    const hasTitle = formTitle[lang.code]?.trim();
                    const hasDoc = !!(formDocs[lang.code] || pendingDocs[lang.code]);
                    return (
                      <TabsTrigger key={lang.code} value={lang.code} className="gap-1 text-xs">
                        <span>{languageFlagEmoji(lang.countryCode)}</span> {lang.label}
                        {hasTitle && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-green-500" />}
                        {hasDoc && <FileText className="ml-0.5 h-3 w-3 text-primary" />}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {LANGUAGES.map(lang => (
                  <TabsContent key={lang.code} value={lang.code} className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Title ({lang.label}) {lang.code === "en" && <span className="text-destructive">*</span>}</Label>
                      <Input
                        placeholder={`Enter title in ${lang.label}...`}
                        value={formTitle[lang.code] || ""}
                        onChange={e => setFormTitle(prev => ({ ...prev, [lang.code]: e.target.value }))}
                      />
                      {lang.code !== "en" && formTitle.en && (
                        <p className="text-xs italic text-muted-foreground">EN reference: &quot;{formTitle.en}&quot;</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Description ({lang.label})</Label>
                      <Textarea
                        rows={4}
                        placeholder={`Enter description in ${lang.label}...`}
                        value={formDesc[lang.code] || ""}
                        onChange={e => setFormDesc(prev => ({ ...prev, [lang.code]: e.target.value }))}
                      />
                    </div>

                    {/* Document Upload per Language */}
                    <div className="border rounded-md p-3 space-y-3 bg-background">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Document ({lang.label})
                      </Label>

                      {pendingDocs[lang.code] ? (
                        <div className="flex items-center justify-between gap-2 rounded border border-primary/30 bg-primary/5 p-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-5 w-5 shrink-0 text-primary" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{pendingDocs[lang.code]!.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(pendingDocs[lang.code]!.size / 1024).toFixed(1)} KB — uploads when you click{" "}
                                {editing ? "Update" : "Add"}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Open preview"
                              onClick={() => openPendingEducationDocument(lang.code)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <a
                              href={pendingDocUrls[lang.code] ?? "#"}
                              download={pendingDocs[lang.code]!.name}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Download copy">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              title="Remove"
                              onClick={() => removeDoc(lang.code)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : formDocs[lang.code] ? (
                        <div className="flex items-center justify-between gap-2 rounded border bg-muted/50 p-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-5 w-5 shrink-0 text-primary" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{formDocs[lang.code]!.displayName}</p>
                              <p className="text-xs text-muted-foreground">{formDocs[lang.code]!.sizeLabel}</p>
                              <p className="truncate font-mono text-[10px] text-muted-foreground" title={formDocs[lang.code]!.path}>
                                {formDocs[lang.code]!.path}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Open in new tab"
                              onClick={() => openEducationDocument(formDocs[lang.code]!)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <a
                              href={educationDocumentUrl(formDocs[lang.code]!.path)}
                              download={formDocs[lang.code]!.displayName}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Download">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              title="Remove"
                              onClick={() => removeDoc(lang.code)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:bg-muted/30">
                          <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Choose a document for <strong>{lang.label}</strong>
                          </span>
                          <span className="mt-1 text-center text-xs text-muted-foreground">
                            File is stored under <code className="rounded bg-muted px-1">public/documents/educations</code> when you
                            click {editing ? "Update" : "Add"}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.ppt,.pptx,.odt"
                            className="hidden"
                            onChange={e => handleDocSelect(lang.code, e)}
                          />
                        </label>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void handleSave()}>{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Education Page</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the row in the educations table and removes associated files from{" "}
              <code className="rounded bg-muted px-1 text-xs">public/documents/educations</code> when stored there.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Education;
