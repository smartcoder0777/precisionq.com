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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Search, Pencil, Trash2, ImageIcon, Filter, X, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES, languageFlagEmoji } from "@/lib/supported-languages";
import { communityServiceImageUrl } from "@/lib/public-media";
import { uploadPublicMedia } from "@/lib/upload-public-media";
import { API_ROUTES } from "@/routes";
import { normalizeUsPhone, US_PHONE_PATTERN } from "@/lib/phone-format";
import type {
  CommunityServicesCategoryRow,
  CommunityServicesClinicOption,
  CommunityServicesServiceRow,
} from "@/types/community-services-page";

const PAGE_SIZE = 10;

type CategoryRecord = CommunityServicesCategoryRow;
type ServiceRecord = CommunityServicesServiceRow;

const emptyLangMap = () => LANGUAGES.reduce((acc, l) => ({ ...acc, [l.code]: "" }), {} as Record<string, string>);

/** API body shape for create/update community service rows. */
function serviceFieldsToApiBody(fields: Omit<ServiceRecord, "id">) {
  return {
    categoryIds: fields.categoryIds,
    image: fields.image,
    names: fields.names,
    descriptions: fields.descriptions,
    details: fields.details,
    address1: fields.address1,
    address2: fields.address2,
    city: fields.city,
    state: fields.state,
    zip: fields.zip,
    country: fields.country,
    phone: fields.phone,
    fax: fields.fax,
    email: fields.email,
    link: fields.link,
    additional: fields.additional,
    clinicIds: fields.clinicIds,
    status: fields.status,
  };
}

export type CommunityServicesProps = {
  initialCategories: CategoryRecord[];
  initialServices: ServiceRecord[];
  clinics: CommunityServicesClinicOption[];
};

// =====================
// Component
// =====================
const CommunityServices = ({ initialCategories, initialServices, clinics }: CommunityServicesProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState("services");

  // ---- Category State ----
  const [categories, setCategories] = useState<CategoryRecord[]>(initialCategories);
  const [catSearch, setCatSearch] = useState("");
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catDeleteId, setCatDeleteId] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<CategoryRecord | null>(null);
  const [catFormNames, setCatFormNames] = useState<Record<string, string>>(emptyLangMap());
  const [catFormStatus, setCatFormStatus] = useState<"Active" | "Inactive">("Active");
  const [catLang, setCatLang] = useState("en");

  // ---- Service State ----
  const [services, setServices] = useState<ServiceRecord[]>(initialServices);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);
  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);
  const [svcSearch, setSvcSearch] = useState("");
  const [svcFilterCat, setSvcFilterCat] = useState("all");
  const [svcDialogOpen, setSvcDialogOpen] = useState(false);
  const [svcDeleteId, setSvcDeleteId] = useState<string | null>(null);
  const [editingSvc, setEditingSvc] = useState<ServiceRecord | null>(null);
  const [svcLang, setSvcLang] = useState("en");
  const [svcEditorTab, setSvcEditorTab] = useState("basic");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  const [clinicModalOpen, setClinicModalOpen] = useState(false);
  const [clinicModalService, setClinicModalService] = useState<ServiceRecord | null>(null);
  const [clinicDraftIds, setClinicDraftIds] = useState<string[]>([]);

  /** Image file chosen in the dialog; uploaded only when saving the service. */
  const [pendingSvcImage, setPendingSvcImage] = useState<File | null>(null);
  const [pendingSvcImagePreviewUrl, setPendingSvcImagePreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingSvcImage) {
      setPendingSvcImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingSvcImage);
    setPendingSvcImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingSvcImage]);

  // Service form fields
  const [svcForm, setSvcForm] = useState<Omit<ServiceRecord, "id">>({
    categoryIds: [], image: null, names: emptyLangMap(), descriptions: emptyLangMap(), details: emptyLangMap(),
    address1: "", address2: "", city: "", state: "", zip: "", country: "", phone: "", fax: "", email: "", link: "",
    additional: "", clinicIds: [], status: "Active",
  });

  const formatServicePhoneOnBlur = (field: "phone" | "fax") => {
    setSvcForm((prev) => {
      const raw = prev[field];
      if (!raw.trim()) return prev;
      return { ...prev, [field]: normalizeUsPhone(raw) ?? raw };
    });
  };

  // ==============================
  // Category CRUD
  // ==============================
  const filteredCats = useMemo(
    () =>
      categories.filter((c) =>
        Object.values(c.names).some((n) => n.toLowerCase().includes(catSearch.toLowerCase())),
      ),
    [categories, catSearch],
  );
  const catPaging = usePagedList(filteredCats, PAGE_SIZE, catSearch);

  const openAddCat = () => {
    setEditingCat(null);
    setCatFormNames(emptyLangMap());
    setCatFormStatus("Active");
    setCatLang("en");
    setCatDialogOpen(true);
  };

  const openEditCat = (cat: CategoryRecord) => {
    setEditingCat(cat);
    setCatFormNames({ ...cat.names });
    setCatFormStatus(cat.status);
    setCatLang("en");
    setCatDialogOpen(true);
  };

  const saveCat = async () => {
    if (!catFormNames.en.trim()) {
      toast({ title: "Error", description: "English name is required.", variant: "destructive" });
      return;
    }
    const payload = { names: catFormNames, status: catFormStatus };
    try {
      if (editingCat) {
        const res = await fetch(API_ROUTES.communityServiceCat(editingCat.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not update category.", variant: "destructive" });
          return;
        }
        toast({ title: "Updated", description: "Category updated." });
      } else {
        const res = await fetch(API_ROUTES.COMMUNITY_SERVICE_CATS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          toast({ title: "Error", description: data.message ?? "Could not add category.", variant: "destructive" });
          return;
        }
        toast({ title: "Added", description: "Category added." });
      }
      setCatDialogOpen(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const deleteCat = async () => {
    if (!catDeleteId) return;
    try {
      const res = await fetch(API_ROUTES.communityServiceCat(catDeleteId), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not delete category.", variant: "destructive" });
        return;
      }
      toast({ title: "Deleted", description: "Category removed." });
      setCatDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  // ==============================
  // Service CRUD
  // ==============================
  const filteredSvcs = useMemo(
    () =>
      services.filter((s) => {
        const matchSearch = (s.names.en ?? "").toLowerCase().includes(svcSearch.toLowerCase());
        const matchCat = svcFilterCat === "all" || s.categoryIds.includes(svcFilterCat);
        return matchSearch && matchCat;
      }),
    [services, svcSearch, svcFilterCat],
  );
  const svcPaging = usePagedList(filteredSvcs, PAGE_SIZE, svcSearch, svcFilterCat);

  const activeCategories = useMemo(
    () => categories.filter(c => c.status === "Active"),
    [categories],
  );

  const resetSvcForm = (): Omit<ServiceRecord, "id"> => ({
    categoryIds: [], image: null, names: emptyLangMap(), descriptions: emptyLangMap(), details: emptyLangMap(),
    address1: "", address2: "", city: "", state: "", zip: "", country: "", phone: "", fax: "", email: "", link: "",
    additional: "", clinicIds: [], status: "Active",
  });

  const openAddSvc = () => {
    setEditingSvc(null);
    setSvcForm(resetSvcForm());
    setPendingSvcImage(null);
    setSvcLang("en");
    setSvcEditorTab("basic");
    setSvcDialogOpen(true);
  };

  const openEditSvc = (svc: ServiceRecord) => {
    setEditingSvc(svc);
    setSvcForm({ ...svc });
    setPendingSvcImage(null);
    setSvcLang("en");
    setSvcEditorTab("basic");
    setSvcDialogOpen(true);
  };

  const saveSvc = async () => {
    if (!svcForm.names.en.trim()) {
      toast({ title: "Error", description: "English name is required.", variant: "destructive" });
      return;
    }
    if (svcForm.categoryIds.length === 0) {
      toast({ title: "Error", description: "Select at least one category.", variant: "destructive" });
      return;
    }
    let imageField = svcForm.image;
    if (pendingSvcImage) {
      try {
        imageField = await uploadPublicMedia(pendingSvcImage, { into: "community_services" });
      } catch (err) {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Could not upload image.",
          variant: "destructive",
        });
        return;
      }
    }
    const body = serviceFieldsToApiBody({ ...svcForm, image: imageField });
    try {
      if (editingSvc) {
        const res = await fetch(API_ROUTES.communityServiceRow(editingSvc.id), {
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
        const res = await fetch(API_ROUTES.COMMUNITY_SERVICES_ROWS, {
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
      setPendingSvcImage(null);
      setSvcDialogOpen(false);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const deleteSvc = async () => {
    if (!svcDeleteId) return;
    try {
      const res = await fetch(API_ROUTES.communityServiceRow(svcDeleteId), { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not delete service.", variant: "destructive" });
        return;
      }
      toast({ title: "Deleted", description: "Service removed." });
      setSvcDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const handleSvcImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingSvcImage(file);
  };

  const addCategoryToForm = (catId: string) => {
    setSvcForm(prev =>
      prev.categoryIds.includes(catId) ? prev : { ...prev, categoryIds: [...prev.categoryIds, catId] },
    );
  };

  const removeCategoryFromForm = (catId: string) => {
    setSvcForm(prev => ({ ...prev, categoryIds: prev.categoryIds.filter(id => id !== catId) }));
  };

  const openClinicModal = (svc: ServiceRecord) => {
    setClinicModalService(svc);
    setClinicDraftIds([...svc.clinicIds]);
    setClinicModalOpen(true);
  };

  const toggleClinicDraft = (clinicId: string) => {
    setClinicDraftIds(prev =>
      prev.includes(clinicId) ? prev.filter(id => id !== clinicId) : [...prev, clinicId],
    );
  };

  const saveClinicAllowance = async () => {
    if (!clinicModalService) return;
    const fields: Omit<ServiceRecord, "id"> = {
      categoryIds: clinicModalService.categoryIds,
      image: clinicModalService.image,
      names: clinicModalService.names,
      descriptions: clinicModalService.descriptions,
      details: clinicModalService.details,
      address1: clinicModalService.address1,
      address2: clinicModalService.address2,
      city: clinicModalService.city,
      state: clinicModalService.state,
      zip: clinicModalService.zip,
      country: clinicModalService.country,
      phone: clinicModalService.phone,
      fax: clinicModalService.fax,
      email: clinicModalService.email,
      link: clinicModalService.link,
      additional: clinicModalService.additional,
      clinicIds: clinicDraftIds,
      status: clinicModalService.status,
    };
    const body = serviceFieldsToApiBody(fields);
    try {
      const res = await fetch(API_ROUTES.communityServiceRow(clinicModalService.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not update clinics.", variant: "destructive" });
        return;
      }
      setServices(prev =>
        prev.map(s => (s.id === clinicModalService.id ? { ...s, clinicIds: [...clinicDraftIds] } : s)),
      );
      toast({ title: "Updated", description: "Linked clinics saved." });
      setClinicModalOpen(false);
      setClinicModalService(null);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  // ==============================
  // Render
  // ==============================
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Community Services</h1>
        <p className="text-muted-foreground">Manage community services and categories</p>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="services">Community Services</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* ==================== SERVICES TAB ==================== */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle>Services</CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search services..." value={svcSearch} onChange={e => setSvcSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={svcFilterCat} onValueChange={setSvcFilterCat}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.filter(c => c.status === "Active").map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.names.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={openAddSvc}><Plus className="mr-2 h-4 w-4" /> Add Service</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {svcPaging.pagedItems.map((svc, i) => (
                    <TableRow key={svc.id}>
                      <TableCell>{(svcPaging.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {svc.categoryIds.map(cid => (
                            <Badge key={cid} variant="outline" className="text-xs">{categories.find(c => c.id === cid)?.names.en || cid}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {svc.image ? (
                          <img src={communityServiceImageUrl(svc.image)} alt={svc.names.en} className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{svc.names.en}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {LANGUAGES.map(l => (
                              <span key={l.code} className={`text-xs ${svc.names[l.code] ? "opacity-100" : "opacity-30 grayscale"}`}>{languageFlagEmoji(l.countryCode)}</span>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate" dangerouslySetInnerHTML={{ __html: svc.descriptions.en || "—" }} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={svc.status === "Active" ? "default" : "secondary"}>{svc.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Clinics"
                            type="button"
                            onClick={() => openClinicModal(svc)}
                          >
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit" type="button" onClick={() => openEditSvc(svc)}>
                            <Pencil className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Remove" type="button" onClick={() => setSvcDeleteId(svc.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSvcs.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No services found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <DataTablePagination
                totalItems={svcPaging.totalItems}
                page={svcPaging.page}
                totalPages={svcPaging.totalPages}
                rangeFrom={svcPaging.rangeFrom}
                rangeTo={svcPaging.rangeTo}
                onPageChange={svcPaging.goPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== CATEGORIES TAB ==================== */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Service Categories</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search categories..." value={catSearch} onChange={e => setCatSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Button onClick={openAddCat}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Translations</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catPaging.pagedItems.map((cat, i) => (
                    <TableRow key={cat.id}>
                      <TableCell>{(catPaging.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                      <TableCell>
                        <p className="font-medium">{cat.names.en}</p>
                        {cat.names.es && <p className="text-xs text-muted-foreground">🇪🇸 {cat.names.es}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {LANGUAGES.map(l => (
                            <span key={l.code} className={`text-sm ${cat.names[l.code] ? "opacity-100" : "opacity-30 grayscale"}`} title={`${l.label}: ${cat.names[l.code] || "Not translated"}`}>{languageFlagEmoji(l.countryCode)}</span>
                          ))}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {Object.values(cat.names).filter(n => n.trim()).length}/{LANGUAGES.length}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={cat.status === "Active" ? "default" : "secondary"}>{cat.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditCat(cat)}><Pencil className="h-4 w-4 text-primary" /></Button>
                          <Button variant="ghost" size="icon" title="Remove" onClick={() => setCatDeleteId(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCats.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No categories found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <DataTablePagination
                totalItems={catPaging.totalItems}
                page={catPaging.page}
                totalPages={catPaging.totalPages}
                rangeFrom={catPaging.rangeFrom}
                rangeTo={catPaging.rangeTo}
                onPageChange={catPaging.goPage}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================== CATEGORY DIALOG ==================== */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <Tabs value={catLang} onValueChange={setCatLang}>
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
              {LANGUAGES.map(l => (
                <TabsTrigger key={l.code} value={l.code} className="gap-1.5 text-xs">
                  <span>{languageFlagEmoji(l.countryCode)}</span> {l.label}
                  {catFormNames[l.code]?.trim() && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent" />}
                </TabsTrigger>
              ))}
            </TabsList>
            {LANGUAGES.map(l => (
              <TabsContent key={l.code} value={l.code} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Category Name ({l.label}) {l.code === "en" && <span className="text-destructive">*</span>}</Label>
                  <Input
                    placeholder={`Enter name in ${l.label}...`}
                    value={catFormNames[l.code] || ""}
                    onChange={e => setCatFormNames(prev => ({ ...prev, [l.code]: e.target.value }))}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={catFormStatus} onValueChange={(v: "Active" | "Inactive") => setCatFormStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCat}>{editingCat ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== SERVICE DIALOG ==================== */}
      <Dialog
        open={svcDialogOpen}
        onOpenChange={open => {
          setSvcDialogOpen(open);
          if (!open) setPendingSvcImage(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSvc ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>

          {/* Inner tabs for service form sections */}
          <Tabs value={svcEditorTab} onValueChange={setSvcEditorTab}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="contact">Contact & Address</TabsTrigger>
            </TabsList>

            {/* ---- BASIC INFO ---- */}
            <TabsContent value="basic" className="space-y-4 pt-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Image</Label>
                <div className="flex items-center gap-4">
                  {pendingSvcImagePreviewUrl ? (
                    <img src={pendingSvcImagePreviewUrl} alt="Preview" className="h-20 w-20 rounded-lg object-cover border border-border" />
                  ) : svcForm.image ? (
                    <img src={communityServiceImageUrl(svcForm.image)} alt="Preview" className="h-20 w-20 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center border border-dashed border-border">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Input type="file" accept="image/*" onChange={handleSvcImageSelect} className="max-w-xs" />
                    {(svcForm.image || pendingSvcImage) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPendingSvcImage(null);
                          setSvcForm(prev => ({ ...prev, image: null }));
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Categories (tag input + picker) */}
              <div className="space-y-2">
                <Label>Categories <span className="text-destructive">*</span></Label>
                <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-border bg-background p-2">
                  {svcForm.categoryIds.map(cid => {
                    const cat = categories.find(c => c.id === cid);
                    const label = cat?.names.en ?? cid;
                    return (
                      <Badge key={cid} variant="secondary" className="gap-1 pl-2 pr-1 font-normal">
                        <span>{label}</span>
                        <button
                          type="button"
                          className="rounded-sm p-0.5 hover:bg-muted-foreground/20 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Remove category ${label}`}
                          onClick={() => removeCategoryFromForm(cid)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                  <Popover open={categoryPickerOpen} onOpenChange={setCategoryPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="h-7 shrink-0">
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add category
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(100vw-2rem,320px)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search categories…" />
                        <CommandList>
                          <CommandEmpty>No matching category.</CommandEmpty>
                          <CommandGroup>
                            {activeCategories
                              .filter(c => !svcForm.categoryIds.includes(c.id))
                              .map(cat => (
                                <CommandItem
                                  key={cat.id}
                                  value={`${cat.names.en} ${cat.id}`}
                                  onSelect={() => {
                                    addCategoryToForm(cat.id);
                                    setCategoryPickerOpen(false);
                                  }}
                                >
                                  {cat.names.en}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {activeCategories.length === 0 && (
                  <p className="text-xs text-muted-foreground">No active categories. Add categories in the Categories tab.</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={svcForm.status} onValueChange={(v: "Active" | "Inactive") => setSvcForm(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* ---- CONTENT (multi-language) ---- */}
            <TabsContent value="content" className="space-y-4 pt-4">
              <Tabs value={svcLang} onValueChange={setSvcLang}>
                <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
                  {LANGUAGES.map(l => (
                    <TabsTrigger key={l.code} value={l.code} className="gap-1.5 text-xs">
                      <span>{languageFlagEmoji(l.countryCode)}</span> {l.label}
                      {svcForm.names[l.code]?.trim() && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent" />}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {LANGUAGES.map(l => (
                  <TabsContent key={l.code} value={l.code} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Name ({l.label}) {l.code === "en" && <span className="text-destructive">*</span>}</Label>
                      <Input
                        placeholder={`Service name in ${l.label}...`}
                        value={svcForm.names[l.code] || ""}
                        onChange={e => setSvcForm(prev => ({ ...prev, names: { ...prev.names, [l.code]: e.target.value } }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description ({l.label}) <span className="text-xs text-muted-foreground">— supports HTML</span></Label>
                      <Textarea
                        placeholder={`<p>Enter description in ${l.label}...</p>`}
                        rows={4}
                        value={svcForm.descriptions[l.code] || ""}
                        onChange={e => setSvcForm(prev => ({ ...prev, descriptions: { ...prev.descriptions, [l.code]: e.target.value } }))}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Details ({l.label}) <span className="text-xs text-muted-foreground">— supports HTML</span></Label>
                      <Textarea
                        placeholder={`<p>Enter details in ${l.label}...</p>`}
                        rows={4}
                        value={svcForm.details[l.code] || ""}
                        onChange={e => setSvcForm(prev => ({ ...prev, details: { ...prev.details, [l.code]: e.target.value } }))}
                        className="font-mono text-sm"
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              {/* Additional (single language, HTML) */}
              <div className="space-y-2">
                <Label>Additional Info <span className="text-xs text-muted-foreground">— supports HTML</span></Label>
                <Textarea
                  placeholder="<p>Additional information...</p>"
                  rows={3}
                  value={svcForm.additional}
                  onChange={e => setSvcForm(prev => ({ ...prev, additional: e.target.value }))}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            {/* ---- CONTACT & ADDRESS ---- */}
            <TabsContent value="contact" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Address Line 1</Label><Input value={svcForm.address1} onChange={e => setSvcForm(prev => ({ ...prev, address1: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Address Line 2</Label><Input value={svcForm.address2} onChange={e => setSvcForm(prev => ({ ...prev, address2: e.target.value }))} /></div>
                <div className="space-y-2"><Label>City</Label><Input value={svcForm.city} onChange={e => setSvcForm(prev => ({ ...prev, city: e.target.value }))} /></div>
                <div className="space-y-2"><Label>State</Label><Input value={svcForm.state} onChange={e => setSvcForm(prev => ({ ...prev, state: e.target.value }))} /></div>
                <div className="space-y-2"><Label>ZIP Code</Label><Input value={svcForm.zip} onChange={e => setSvcForm(prev => ({ ...prev, zip: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Country</Label><Input value={svcForm.country} onChange={e => setSvcForm(prev => ({ ...prev, country: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input placeholder={US_PHONE_PATTERN} value={svcForm.phone} onChange={e => setSvcForm(prev => ({ ...prev, phone: e.target.value }))} onBlur={() => formatServicePhoneOnBlur("phone")} /></div>
                <div className="space-y-2"><Label>Fax</Label><Input placeholder={US_PHONE_PATTERN} value={svcForm.fax} onChange={e => setSvcForm(prev => ({ ...prev, fax: e.target.value }))} onBlur={() => formatServicePhoneOnBlur("fax")} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={svcForm.email} onChange={e => setSvcForm(prev => ({ ...prev, email: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Website Link</Label><Input value={svcForm.link} onChange={e => setSvcForm(prev => ({ ...prev, link: e.target.value }))} /></div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSvcDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveSvc()}>{editingSvc ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== CLINICS MODAL (per row) ==================== */}
      <Dialog
        open={clinicModalOpen}
        onOpenChange={open => {
          setClinicModalOpen(open);
          if (!open) setClinicModalService(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Linked clinics</DialogTitle>
            {clinicModalService && (
              <p className="text-sm text-muted-foreground">
                Select clinics for <span className="font-medium text-foreground">{clinicModalService.names.en}</span>.
              </p>
            )}
          </DialogHeader>
          <div className="max-h-[min(60vh,320px)] space-y-2 overflow-y-auto pr-1">
            {clinics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clinics available.</p>
            ) : (
              clinics.map(clinic => (
                <label
                  key={clinic.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={clinicDraftIds.includes(clinic.id)}
                    onCheckedChange={() => toggleClinicDraft(clinic.id)}
                  />
                  <span className="text-sm">{clinic.name}</span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setClinicModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveClinicAllowance} disabled={!clinicModalService}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE DIALOGS ==================== */}
      <AlertDialog open={!!catDeleteId} onOpenChange={open => !open && setCatDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCat}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!svcDeleteId} onOpenChange={open => !open && setSvcDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSvc}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommunityServices;
