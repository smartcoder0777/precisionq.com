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
import type { ProductCategorySettingsRow } from "@/server/product-categories-page";

const PAGE_SIZE = 10;

export type ProductCategoriesSettingsProps = {
  initialCategories: ProductCategorySettingsRow[];
};

const ProductCategoriesSettings = ({ initialCategories }: ProductCategoriesSettingsProps) => {
  const router = useRouter();
  const { toast } = useToast();

  const [categories, setCategories] = useState<ProductCategorySettingsRow[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategorySettingsRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"product" | "service">("product");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const filtered = useMemo(
    () =>
      categories.filter((c) =>
        `${c.name} ${c.description} ${c.type}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [categories, search],
  );
  const paging = usePagedList(filtered, PAGE_SIZE, search);

  const openAdd = () => {
    setEditing(null);
    setFormName("");
    setFormDescription("");
    setFormType("product");
    setFormStatus("Active");
    setDialogOpen(true);
  };

  const openEdit = (category: ProductCategorySettingsRow) => {
    setEditing(category);
    setFormName(category.name);
    setFormDescription(category.description);
    setFormType(category.type);
    setFormStatus(category.status);
    setDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "Category name is required.", variant: "destructive" });
      return;
    }
    const payload = {
      name: formName,
      description: formDescription,
      type: formType,
      status: formStatus,
    };
    try {
      if (editing) {
        const res = await fetch(API_ROUTES.productCategory(editing.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not update category.", variant: "destructive" });
          return;
        }
        toast({ title: "Updated", description: "Product category updated." });
      } else {
        const res = await fetch(API_ROUTES.PRODUCT_CATEGORIES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not add category.", variant: "destructive" });
          return;
        }
        toast({ title: "Added", description: "Product category added." });
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
      const res = await fetch(API_ROUTES.productCategory(deleteId), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not delete category.", variant: "destructive" });
        return;
      }
      toast({ title: "Deleted", description: "Product category removed." });
      setDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Product Category</h1>
        <p className="text-muted-foreground">Manage categories from the product_categories table</p>
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
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paging.pagedItems.map((category, i) => (
                <TableRow key={category.id}>
                  <TableCell>{(paging.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="font-medium">{category.name || "—"}</TableCell>
                  <TableCell className="max-w-[380px] truncate text-muted-foreground">{category.description || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{category.type}</Badge>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Enter category name..."
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Enter description..."
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={(v: "product" | "service") => setFormType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>
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

export default ProductCategoriesSettings;
