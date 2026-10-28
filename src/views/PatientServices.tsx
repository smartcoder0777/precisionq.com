"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTablePagination } from "@/components/data-table-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES, languageFlagEmoji } from "@/lib/supported-languages";
import { API_ROUTES, adminPage } from "@/routes";
import type { PatientServicesCategoryRow } from "@/types/patient-services-page";

const PAGE_SIZE = 10;

type CategoryRecord = PatientServicesCategoryRow;

export type PatientServicesProps = {
  initialCategories: CategoryRecord[];
};

const PatientServices = ({ initialCategories }: PatientServicesProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryRecord[]>(initialCategories);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);

  const emptyNames = () => LANGUAGES.reduce((acc, l) => ({ ...acc, [l.code]: "" }), {} as Record<string, string>);
  const [formNames, setFormNames] = useState<Record<string, string>>(emptyNames());
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
  const [activeLang, setActiveLang] = useState("en");

  const filtered = useMemo(
    () =>
      categories.filter((c) =>
        Object.values(c.names).some((n) => n.toLowerCase().includes(search.toLowerCase())),
      ),
    [categories, search],
  );
  const { pagedItems, page, totalPages, totalItems, rangeFrom, rangeTo, goPage } = usePagedList(filtered, PAGE_SIZE, search);

  const openAdd = () => {
    setEditingCategory(null);
    setFormNames(emptyNames());
    setFormStatus("Active");
    setActiveLang("en");
    setDialogOpen(true);
  };

  const openEdit = (cat: CategoryRecord) => {
    setEditingCategory(cat);
    setFormNames({ ...cat.names });
    setFormStatus(cat.status);
    setActiveLang("en");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formNames.en.trim()) {
      toast({ title: "Error", description: "English name is required.", variant: "destructive" });
      return;
    }
    const payload = { names: formNames, status: formStatus };
    try {
      if (editingCategory) {
        const res = await fetch(API_ROUTES.patientServiceCat(editingCategory.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not update category.", variant: "destructive" });
          return;
        }
        toast({ title: "Updated", description: "Category updated successfully." });
      } else {
        const res = await fetch(API_ROUTES.PATIENT_SERVICE_CATS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not add category.", variant: "destructive" });
          return;
        }
        toast({ title: "Added", description: "Category added successfully." });
      }
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(API_ROUTES.patientServiceCat(deleteId), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not delete category.", variant: "destructive" });
        return;
      }
      toast({ title: "Deleted", description: "Category removed." });
      setDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const getTranslationProgress = (cat: CategoryRecord) => {
    const filled = Object.values(cat.names).filter(n => n.trim()).length;
    return `${filled}/${LANGUAGES.length}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patient Services</h1>
          <p className="text-muted-foreground">Manage service categories with multi-language support</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Service Categories</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Category Name (EN)</TableHead>
                <TableHead>Translations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((cat, i) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{cat.names.en}</p>
                      {cat.names.es && <p className="text-xs text-muted-foreground">🇪🇸 {cat.names.es}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {LANGUAGES.map(lang => (
                        <span
                          key={lang.code}
                          title={`${lang.label}: ${cat.names[lang.code] || "Not translated"}`}
                          className={`text-sm cursor-default ${cat.names[lang.code] ? "opacity-100" : "opacity-30 grayscale"}`}
                        >
                          {languageFlagEmoji(lang.countryCode)}
                        </span>
                      ))}
                      <Badge variant="outline" className="ml-2 text-xs">{getTranslationProgress(cat)}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cat.status === "Active" ? "default" : "secondary"}>{cat.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        title="Patient services"
                        onClick={() => router.push(adminPage(`/patient-services/${cat.id}/services`))}
                      >
                        <Stethoscope className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit Category" onClick={() => openEdit(cat)}>
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Remove" onClick={() => setDeleteId(cat.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No categories found.</TableCell></TableRow>
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>

          <Tabs value={activeLang} onValueChange={setActiveLang}>
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
              {LANGUAGES.map(lang => (
                <TabsTrigger key={lang.code} value={lang.code} className="gap-1.5 text-xs">
                  <span>{languageFlagEmoji(lang.countryCode)}</span>
                  {lang.label}
                  {formNames[lang.code]?.trim() && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-500" />}
                </TabsTrigger>
              ))}
            </TabsList>

            {LANGUAGES.map(lang => (
              <TabsContent key={lang.code} value={lang.code} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Category Name ({lang.label}) {lang.code === "en" && <span className="text-destructive">*</span>}</Label>
                  <Input
                    placeholder={`Enter category name in ${lang.label}...`}
                    value={formNames[lang.code] || ""}
                    onChange={e => setFormNames(prev => ({ ...prev, [lang.code]: e.target.value }))}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formStatus} onValueChange={(v: "Active" | "Inactive") => setFormStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingCategory ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="block">
                This permanently deletes this category and cannot be undone.
              </span>
              <span className="block font-medium text-foreground">
                All patient services in this category will be removed as well, including their database rows and any
                image files stored under <code className="rounded bg-muted px-1 py-0.5 text-xs">public/images/patient_services</code>.
              </span>
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

export default PatientServices;
