"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, X, Play, Upload, Image as ImageIcon, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { productServiceImageUrl, productServiceVideoUrl } from "@/lib/public-media";
import { uploadPublicMedia } from "@/lib/upload-public-media";
import { API_ROUTES } from "@/routes";
import type { ProductImage, ProductServicePageRow, ProductsServicesPagePayload } from "@/types/products-services-page";

const PAGE_SIZE = 10;

/** Sentinel for payment cycle Select (must not match a real numeric id string). */
const PAYMENT_CYCLE_NONE = "__none__";

function revokePendingPreviewUrls(rows: DraftImageRow[]) {
  for (const r of rows) {
    if (r.kind === "pending") URL.revokeObjectURL(r.previewUrl);
  }
}

/** Row in the add/edit dialog: already on disk, or a local file uploaded on save. */
type DraftImageRow =
  | { key: string; kind: "saved"; filename: string; isPrimary: boolean }
  | { key: string; kind: "pending"; file: File; isPrimary: boolean; previewUrl: string };

type ProductFormState = {
  name: string;
  type: "Product" | "Service";
  categoryId: number | null;
  shortDesc: string;
  longDesc: string;
  basePrice: number;
  discount: number;
  payTypeId: number | null;
  paymentCycleId: number | null;
  billingCategoryId: number | null;
  images: ProductImage[];
  video: string;
  status: "Active" | "Inactive" | "Draft";
  taxRequired: boolean;
};

const emptyProduct = (): ProductFormState => ({
  name: "",
  type: "Product",
  categoryId: null,
  shortDesc: "",
  longDesc: "",
  basePrice: 0,
  discount: 0,
  payTypeId: null,
  paymentCycleId: null,
  billingCategoryId: null,
  images: [],
  video: "",
  status: "Active",
  taxRequired: false,
});

export type ProductsServicesProps = ProductsServicesPagePayload;

const ProductsServices = ({
  rows: initialRows,
  categoryOptions,
  payTypeOptions,
  paymentCycleOptions,
  billingCategoryOptions,
}: ProductsServicesProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const imagesFileInputId = useId();
  const videoFileInputId = useId();
  const draftImageKeyRef = useRef(0);
  const [products, setProducts] = useState<ProductServicePageRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<ProductServicePageRow | null>(null);

  useEffect(() => {
    setProducts(initialRows);
  }, [initialRows]);

  // Image gallery state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Video preview state
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<ProductFormState>(emptyProduct());
  const [draftImages, setDraftImages] = useState<DraftImageRow[]>([]);
  const [pendingVideo, setPendingVideo] = useState<File | null>(null);
  const [pendingVideoPreviewUrl, setPendingVideoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingVideo) {
      setPendingVideoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingVideo);
    setPendingVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingVideo]);

  const filtered = useMemo(
    () =>
      products.filter(p => {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.payTypeLabel.toLowerCase().includes(q)
        );
      }),
    [products, search],
  );
  const { pagedItems, page, totalPages, totalItems, rangeFrom, rangeTo, goPage } = usePagedList(filtered, PAGE_SIZE, search);

  const updateForm = (updates: Partial<ProductFormState>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyProduct(),
      categoryId: categoryOptions[0]?.id ?? null,
      payTypeId: payTypeOptions[0]?.id ?? null,
      billingCategoryId: billingCategoryOptions[0]?.id ?? null,
      paymentCycleId: null,
    });
    setDraftImages(prev => {
      revokePendingPreviewUrls(prev);
      return [];
    });
    setPendingVideo(null);
    setDialogOpen(true);
  };

  const openEdit = (p: ProductServicePageRow) => {
    setEditing(p);
    setForm({
      name: p.name,
      type: p.type,
      categoryId: p.categoryId > 0 ? p.categoryId : null,
      shortDesc: p.shortDesc,
      longDesc: p.longDesc,
      basePrice: p.basePrice,
      discount: p.discount,
      payTypeId: p.payTypeId,
      paymentCycleId: p.paymentCycleId,
      billingCategoryId: p.billingCategoryId != null && p.billingCategoryId > 0 ? p.billingCategoryId : null,
      images: p.images.map(img => ({ ...img })),
      video: p.video,
      status: p.status,
      taxRequired: p.taxRequired,
    });
    setDraftImages(prev => {
      revokePendingPreviewUrls(prev);
      return p.images.map((img, i) => ({
        key: `saved-${p.id}-${i}-${img.filename}`,
        kind: "saved" as const,
        filename: img.filename,
        isPrimary: img.isPrimary,
      }));
    });
    setPendingVideo(null);
    setDialogOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    /** Copy files before clearing `input.value` — clearing first empties `FileList` in many browsers. */
    const list = input.files?.length ? Array.from(input.files) : [];
    input.value = "";
    if (!list.length) return;
    setDraftImages(prev => {
      const next = [...prev];
      list.forEach(file => {
        draftImageKeyRef.current += 1;
        next.push({
          key: `pending-${draftImageKeyRef.current}`,
          kind: "pending",
          file,
          isPrimary: false,
          previewUrl: URL.createObjectURL(file),
        });
      });
      if (next.length > 0 && !next.some(r => r.isPrimary)) next[0].isPrimary = true;
      return next;
    });
  };

  const removeDraftImage = (key: string) => {
    setDraftImages(prev => {
      const removed = prev.find(r => r.key === key);
      if (removed?.kind === "pending") URL.revokeObjectURL(removed.previewUrl);
      const next = prev.filter(r => r.key !== key);
      if (next.length > 0 && !next.some(r => r.isPrimary)) next[0].isPrimary = true;
      return next;
    });
  };

  const setPrimaryDraftImage = (key: string) => {
    setDraftImages(prev => prev.map(r => ({ ...r, isPrimary: r.key === key })));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingVideo(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Error", description: "Product name is required.", variant: "destructive" });
      return;
    }
    if (form.categoryId == null) {
      toast({ title: "Error", description: "Category is required.", variant: "destructive" });
      return;
    }
    if (form.payTypeId == null) {
      toast({ title: "Error", description: "Pay type is required.", variant: "destructive" });
      return;
    }
    if (form.billingCategoryId == null) {
      toast({ title: "Error", description: "Billing category is required.", variant: "destructive" });
      return;
    }
    const finalImages: ProductImage[] = [];
    for (const row of draftImages) {
      if (row.kind === "saved") {
        finalImages.push({ filename: row.filename, isPrimary: row.isPrimary });
      } else {
        try {
          const filename = await uploadPublicMedia(row.file, { into: "product_services" });
          finalImages.push({ filename, isPrimary: row.isPrimary });
        } catch (err) {
          toast({
            title: "Upload failed",
            description: err instanceof Error ? err.message : "Could not upload image(s).",
            variant: "destructive",
          });
          return;
        }
      }
    }
    if (finalImages.length > 0 && !finalImages.some(img => img.isPrimary)) {
      finalImages[0].isPrimary = true;
    }
    let finalVideo = form.video;
    if (pendingVideo) {
      try {
        finalVideo = await uploadPublicMedia(pendingVideo, { into: "product_services" });
      } catch (err) {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Could not upload video.",
          variant: "destructive",
        });
        return;
      }
    }
    const body = {
      name: form.name.trim(),
      type: form.type,
      categoryId: form.categoryId,
      shortDesc: form.shortDesc,
      longDesc: form.longDesc,
      basePrice: form.basePrice,
      discount: form.discount,
      payTypeId: form.payTypeId,
      paymentCycleId: form.paymentCycleId,
      billingCategoryId: form.billingCategoryId,
      images: finalImages,
      video: finalVideo,
      status: form.status,
      taxRequired: form.taxRequired,
    };

    try {
      if (editing) {
        const res = await fetch(API_ROUTES.productService(editing.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({
            title: "Error",
            description: data.message ?? "Could not update product/service.",
            variant: "destructive",
          });
          return;
        }
        toast({ title: "Updated", description: "Product/Service updated." });
      } else {
        const res = await fetch(API_ROUTES.PRODUCT_SERVICES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({
            title: "Error",
            description: data.message ?? "Could not create product/service.",
            variant: "destructive",
          });
          return;
        }
        toast({ title: "Added", description: "Product/Service added." });
      }
      setPendingVideo(null);
      setDraftImages(prev => {
        revokePendingPreviewUrls(prev);
        return [];
      });
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      const res = await fetch(API_ROUTES.productService(deleteId), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({
          title: "Error",
          description: data.message ?? "Could not delete product/service.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Deleted", description: "Product/Service removed." });
      setDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const openGallery = (images: ProductServicePageRow["images"]) => {
    if (images.length === 0) return;
    setGalleryImages(images);
    setGalleryIndex(0);
    setGalleryOpen(true);
  };

  const getPrimaryImage = (images: ProductImage[]) => {
    return images.find(img => img.isPrimary) || images[0];
  };

  const statusColor = (s: string) => {
    if (s === "Active") return "default" as const;
    if (s === "Draft") return "outline" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products & Services</h1>
          <p className="text-muted-foreground">Manage your product and service catalog</p>
        </div>
        <Button onClick={openAdd} disabled={categoryOptions.length === 0 || payTypeOptions.length === 0 || billingCategoryOptions.length === 0}>
          <Plus className="mr-2 h-4 w-4" /> Add Product / Service
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Catalog</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Images</TableHead>
                <TableHead>Video</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.shortDesc}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.type === "Product" ? "default" : "outline"}>{p.type}</Badge>
                  </TableCell>
                  <TableCell>{p.categoryName}</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">${p.basePrice.toFixed(2)}</span>
                      {p.discount > 0 && (
                        <span className="ml-1.5 text-xs text-green-600 font-medium">-{p.discount}%</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColor(p.status)}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {p.images.length > 0 ? (
                      <button
                        onClick={() => openGallery(p.images)}
                        className="relative group cursor-pointer"
                      >
                        <img
                          src={productServiceImageUrl(getPrimaryImage(p.images)?.filename ?? "")}
                          alt={p.name}
                          className="h-10 w-14 object-cover rounded border border-border group-hover:ring-2 ring-primary transition-all"
                        />
                        {p.images.length > 1 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {p.images.length}
                          </span>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No images</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.video ? (
                      <button
                        onClick={() => setVideoPreview(productServiceVideoUrl(p.video))}
                        className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        <span className="text-xs font-medium">Preview</span>
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No video</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4 text-primary" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No products or services found.</TableCell></TableRow>
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

      {/* ========== Image Gallery Slider ========== */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black/95">
          <DialogTitle className="sr-only">Product images</DialogTitle>
          <div className="relative">
            {/* Close */}
            <button onClick={() => setGalleryOpen(false)} className="absolute top-3 right-3 z-10 bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors">
              <X className="h-5 w-5 text-white" />
            </button>

            {/* Main image */}
            <div className="flex items-center justify-center min-h-[400px] p-8">
              {galleryImages[galleryIndex] && (
                <img
                  src={productServiceImageUrl(galleryImages[galleryIndex].filename)}
                  alt={`Image ${galleryIndex + 1}`}
                  className="max-h-[400px] max-w-full object-contain rounded-lg"
                />
              )}
            </div>

            {/* Navigation arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={() => setGalleryIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 rounded-full p-2 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={() => setGalleryIndex(prev => (prev + 1) % galleryImages.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}

            {/* Thumbnails */}
            <div className="flex items-center justify-center gap-2 p-4 bg-black/80">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setGalleryIndex(idx)}
                  className={`relative rounded overflow-hidden border-2 transition-all ${
                    idx === galleryIndex ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-90"
                  }`}
                >
                  <img src={productServiceImageUrl(img.filename)} alt="" className="h-12 w-16 object-cover" />
                  {img.isPrimary && (
                    <Star className="absolute top-0.5 right-0.5 h-3 w-3 text-yellow-400 fill-yellow-400" />
                  )}
                </button>
              ))}
              <span className="text-white/60 text-xs ml-2">{galleryIndex + 1} / {galleryImages.length}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== Video Preview Modal ========== */}
      <Dialog open={!!videoPreview} onOpenChange={open => !open && setVideoPreview(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black">
          <DialogTitle className="sr-only">Product video preview</DialogTitle>
          <div className="p-1">
            {videoPreview ? (
              <video
                src={videoPreview}
                controls
                autoPlay
                className="w-full rounded"
                style={{ maxHeight: "70vh" }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== Add / Edit Modal ========== */}
      <Dialog
        modal={false}
        open={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) {
            setDraftImages(prev => {
              revokePendingPreviewUrls(prev);
              return [];
            });
            setPendingVideo(null);
          }
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{editing ? "Update Product / Service" : "Add Product / Service"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* — General Information — */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                General Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type <span className="text-destructive">*</span></Label>
                  <Select value={form.type} onValueChange={(v: "Product" | "Service") => updateForm({ type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Product">Product</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.categoryId != null ? String(form.categoryId) : undefined}
                    onValueChange={v => updateForm({ categoryId: Number(v) })}
                    disabled={categoryOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={categoryOptions.length ? "Select category" : "No categories in DB"} />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => updateForm({ name: e.target.value })} placeholder="Product or service name..." />
              </div>

              <div className="space-y-2">
                <Label>Short Description</Label>
                <Input value={form.shortDesc} onChange={e => updateForm({ shortDesc: e.target.value })} placeholder="Brief description..." />
              </div>

              <div className="space-y-2">
                <Label>Long Description</Label>
                <Textarea rows={3} value={form.longDesc} onChange={e => updateForm({ longDesc: e.target.value })} placeholder="Detailed description..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={Number.isFinite(form.basePrice) ? form.basePrice : 0}
                    onChange={e => updateForm({ basePrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={Number.isFinite(form.discount) ? form.discount : 0}
                    onChange={e => updateForm({ discount: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* — Payment Options — */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                Payment Options
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Pay Type</Label>
                  <Select
                    value={form.payTypeId != null ? String(form.payTypeId) : undefined}
                    onValueChange={v => updateForm({ payTypeId: Number(v) })}
                    disabled={payTypeOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={payTypeOptions.length ? "Select pay type" : "No pay types in DB"} />
                    </SelectTrigger>
                    <SelectContent>
                      {payTypeOptions.map(t => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Cycle</Label>
                  <Select
                    value={form.paymentCycleId != null ? String(form.paymentCycleId) : PAYMENT_CYCLE_NONE}
                    onValueChange={v =>
                      updateForm({ paymentCycleId: v === PAYMENT_CYCLE_NONE ? null : Number(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PAYMENT_CYCLE_NONE}>N/A</SelectItem>
                      {paymentCycleOptions.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Billing Category</Label>
                  <Select
                    value={form.billingCategoryId != null ? String(form.billingCategoryId) : undefined}
                    onValueChange={v => updateForm({ billingCategoryId: Number(v) })}
                    disabled={billingCategoryOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={billingCategoryOptions.length ? "Select billing category" : "No billing categories in DB"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {billingCategoryOptions.map(b => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* — Media Uploads — */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                Media Uploads
              </h3>

              {/* Images */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5"><ImageIcon className="h-4 w-4" /> Images</Label>

                {draftImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-3">
                    {draftImages.map(row => {
                      const src = row.kind === "saved" ? productServiceImageUrl(row.filename) : row.previewUrl;
                      return (
                        <div key={row.key} className="relative group rounded-lg overflow-hidden border border-border">
                          <img src={src} alt="" className="h-24 w-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setPrimaryDraftImage(row.key)}
                              title="Set as primary"
                              className={`p-1.5 rounded-full transition-colors ${row.isPrimary ? "bg-yellow-500" : "bg-white/20 hover:bg-white/40"}`}
                            >
                              <Star className={`h-3.5 w-3.5 ${row.isPrimary ? "text-white fill-white" : "text-white"}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeDraftImage(row.key)}
                              className="p-1.5 rounded-full bg-white/20 hover:bg-red-500/80 transition-colors"
                            >
                              <X className="h-3.5 w-3.5 text-white" />
                            </button>
                          </div>
                          {row.isPrimary && (
                            <span className="absolute top-1 left-1 bg-yellow-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              PRIMARY
                            </span>
                          )}
                          {row.kind === "pending" && (
                            <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/60 px-1 py-0.5 text-center text-[9px] text-white/90">
                              Not saved yet
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <label
                  htmlFor={imagesFileInputId}
                  className="flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-sm text-muted-foreground">Choose images (uploaded when you save)</span>
                  <span className="text-xs text-muted-foreground">JPG, PNG — select multiple files</span>
                </label>
                <input
                  id={imagesFileInputId}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleImageSelect}
                />
              </div>

              {/* Video */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5"><Play className="h-4 w-4" /> Video</Label>

                {pendingVideoPreviewUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-border bg-black">
                    <video src={pendingVideoPreviewUrl} className="w-full max-h-[200px] object-contain" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setVideoPreview(pendingVideoPreviewUrl)}
                        className="bg-white/20 hover:bg-white/30 rounded-full p-3 backdrop-blur-sm transition-colors"
                      >
                        <Play className="h-8 w-8 text-white fill-white" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingVideo(null)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-red-500/80 rounded-full p-1 transition-colors"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                    <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white/90">
                      Uploads when you save
                    </span>
                  </div>
                ) : form.video ? (
                  <div className="relative rounded-lg overflow-hidden border border-border bg-black">
                    <video src={productServiceVideoUrl(form.video)} className="w-full max-h-[200px] object-contain" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setVideoPreview(productServiceVideoUrl(form.video))}
                        className="bg-white/20 hover:bg-white/30 rounded-full p-3 backdrop-blur-sm transition-colors"
                      >
                        <Play className="h-8 w-8 text-white fill-white" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateForm({ video: "" })}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-red-500/80 rounded-full p-1 transition-colors"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <label
                      htmlFor={videoFileInputId}
                      className="flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <Play className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-sm text-muted-foreground">Choose a video (uploaded when you save)</span>
                      <span className="text-xs text-muted-foreground">MP4, WebM</span>
                    </label>
                    <input
                      id={videoFileInputId}
                      type="file"
                      accept="video/*"
                      className="sr-only"
                      onChange={handleVideoSelect}
                    />
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* — Status & Options — */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
                Status & Options
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v: "Active" | "Inactive" | "Draft") => updateForm({ status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.taxRequired} onCheckedChange={v => updateForm({ taxRequired: v })} />
                  <Label className="cursor-pointer">Tax Required</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()}>{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product / Service</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The product/service and all associated media will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductsServices;
