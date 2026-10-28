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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes";
import { isRtlLanguage, LANGUAGES, languageFlagEmoji } from "@/lib/supported-languages";
import type { EducationCategorySettingsRow } from "@/server/education-categories-page";

const PAGE_SIZE = 10;

const emptyLangMap = () => LANGUAGES.reduce((acc, l) => ({ ...acc, [l.code]: "" }), {} as Record<string, string>);

export type EducationCategoriesSettingsProps = {
  initialCategories: EducationCategorySettingsRow[];
};

const EducationCategoriesSettings = ({ initialCategories }: EducationCategoriesSettingsProps) => {
  const router = useRouter();
  const { toast } = useToast();

  const [categories, setCategories] = useState<EducationCategorySettingsRow[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EducationCategorySettingsRow | null>(null);
  const [formParentMenu, setFormParentMenu] = useState("");
  const [formNames, setFormNames] = useState<Record<string, string>>(emptyLangMap());
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
  const [lang, setLang] = useState("en");

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const filtered = useMemo(
    () =>
      categories.filter((c) =>
        Object.values(c.names).some((n) => n.toLowerCase().includes(search.toLowerCase())),
      ),
    [categories, search],
  );
  const paging = usePagedList(filtered, PAGE_SIZE, search);

  const openAdd = () => {
    setEditing(null);
    setFormParentMenu("");
    setFormNames(emptyLangMap());
    setFormStatus("Active");
    setLang("en");
    setDialogOpen(true);
  };

  const openEdit = (category: EducationCategorySettingsRow) => {
    setEditing(category);
    setFormParentMenu(category.parentMenu);
    setFormNames({ ...category.names });
    setFormStatus(category.status);
    setLang("en");
    setDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!formNames.en.trim()) {
      toast({ title: "Error", description: "English name is required.", variant: "destructive" });
      return;
    }
    const payload = { parentMenu: formParentMenu, names: formNames, status: formStatus };
    try {
      if (editing) {
        const res = await fetch(API_ROUTES.educationCategory(editing.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not update category.", variant: "destructive" });
          return;
        }
        toast({ title: "Updated", description: "Education category updated." });
      } else {
        const res = await fetch(API_ROUTES.EDUCATION_CATEGORIES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not add category.", variant: "destructive" });
          return;
        }
        toast({ title: "Added", description: "Education category added." });
      }
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const deleteCategory = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(API_ROUTES.educationCategory(deleteId), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not delete category.", variant: "destructive" });
        return;
      }
      toast({ title: "Deleted", description: "Education category removed." });
      setDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Education Category</h1>
        <p className="text-muted-foreground">Manage multilingual education categories</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Categories</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead>Parent Menu</TableHead>
                <TableHead>Translations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paging.pagedItems.map((category, i) => (
                <TableRow key={category.id}>
                  <TableCell>{(paging.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium">{category.names.en || "—"}</p>
                  </TableCell>
                  <TableCell>{category.parentMenu || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {LANGUAGES.map(l => (
                        <span
                          key={l.code}
                          className={`text-sm ${category.names[l.code] ? "opacity-100" : "opacity-30 grayscale"}`}
                          title={`${l.label}: ${category.names[l.code] || "Not translated"}`}
                        >
                          {languageFlagEmoji(l.countryCode)}
                        </span>
                      ))}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {Object.values(category.names).filter(n => n.trim()).length}/{LANGUAGES.length}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={category.status === "Active" ? "default" : "secondary"}>{category.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(category)}>
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Remove" onClick={() => setDeleteId(category.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No categories found.</TableCell></TableRow>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <Tabs value={lang} onValueChange={setLang}>
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
              {LANGUAGES.map(l => (
                <TabsTrigger key={l.code} value={l.code} className="gap-1.5 text-xs">
                  <span>{languageFlagEmoji(l.countryCode)}</span> {l.label}
                  {formNames[l.code]?.trim() && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent" />}
                </TabsTrigger>
              ))}
            </TabsList>
            {LANGUAGES.map(l => (
              <TabsContent key={l.code} value={l.code} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Category Name ({l.label}) {l.code === "en" && <span className="text-destructive">*</span>}</Label>
                  <Input
                    placeholder={`Enter name in ${l.label}...`}
                    value={formNames[l.code] || ""}
                    onChange={e => setFormNames(prev => ({ ...prev, [l.code]: e.target.value }))}
                    dir={isRtlLanguage(l.code) ? "rtl" : "ltr"}
                    className={isRtlLanguage(l.code) ? "text-right" : undefined}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <div className="space-y-2">
            <Label>Parent Menu</Label>
            <Input
              placeholder="Enter parent menu..."
              value={formParentMenu}
              onChange={e => setFormParentMenu(e.target.value)}
            />
          </div>
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
            <Button onClick={saveCategory}>{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCategory}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EducationCategoriesSettings;
