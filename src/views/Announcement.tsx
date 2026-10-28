"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Pencil, Trash2, Copy, Eye, Pin, Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isRtlLanguage, LANGUAGES, languageFlagEmoji } from "@/lib/supported-languages";
import { publicAssetUrl } from "@/lib/public-media";
import { uploadPublicMedia } from "@/lib/upload-public-media";

const PAGE_SIZE = 10;

const ALL_CLINICS = [
  { id: "1", name: "Main Clinic" },
  { id: "2", name: "Downtown Clinic" },
  { id: "3", name: "West Side Clinic" },
  { id: "4", name: "East Side Clinic" },
];

const AUDIENCES = ["All", "Patients", "Staff"];
const PRIORITIES = ["Normal", "Urgent", "Critical"];
const TYPES = ["General", "Policy Update", "Event", "Emergency", "Maintenance"];
const STATUSES = ["Draft", "Scheduled", "Published", "Expired", "Archived"];

type MultiLang = Record<string, string>;

interface AnnouncementRecord {
  id: string;
  title: MultiLang;
  body: MultiLang;
  audience: string;
  clinics: string[];
  priority: string;
  type: string;
  bannerImage: string;
  publishDate: string;
  expiryDate: string;
  pinned: boolean;
  status: string;
  createdAt: string;
}

const emptyMultiLang = (): MultiLang => LANGUAGES.reduce((acc, l) => ({ ...acc, [l.code]: "" }), {});

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

const today = () => new Date().toISOString().split("T")[0];

const INITIAL_ANNOUNCEMENTS: AnnouncementRecord[] = [
  {
    id: "1",
    title: { en: "Holiday Schedule Update", es: "Actualización del Horario de Vacaciones", fr: "", pt: "", zh: "", ko: "" },
    body: { en: "<p>Please note our clinics will have <strong>modified hours</strong> during the holiday season. Check with your local clinic for specific times.</p>", es: "<p>Nuestras clínicas tendrán <strong>horarios modificados</strong> durante la temporada navideña.</p>", fr: "", pt: "", zh: "", ko: "" },
    audience: "All", clinics: ["1", "2", "3", "4"], priority: "Normal", type: "General",
    bannerImage: "", publishDate: "2026-03-25", expiryDate: "2026-04-15",
    pinned: false, status: "Published", createdAt: "2026-03-25",
  },
  {
    id: "2",
    title: { en: "System Maintenance — March 30", es: "Mantenimiento del Sistema — 30 de Marzo", fr: "", pt: "", zh: "", ko: "" },
    body: { en: "<p>Our patient portal will undergo scheduled maintenance on <strong>March 30, 2026</strong> from 2:00 AM to 6:00 AM EST. Services will be temporarily unavailable.</p>", es: "", fr: "", pt: "", zh: "", ko: "" },
    audience: "All", clinics: ["1", "2"], priority: "Urgent", type: "Maintenance",
    bannerImage: "", publishDate: "2026-03-28", expiryDate: "2026-03-31",
    pinned: true, status: "Published", createdAt: "2026-03-28",
  },
  {
    id: "3",
    title: { en: "New Privacy Policy Effective April 1", es: "", fr: "", pt: "", zh: "", ko: "" },
    body: { en: "<p>We have updated our privacy policy in compliance with new regulations. Please review the changes at your earliest convenience.</p>", es: "", fr: "", pt: "", zh: "", ko: "" },
    audience: "Patients", clinics: ["1", "2", "3", "4"], priority: "Normal", type: "Policy Update",
    bannerImage: "", publishDate: "2026-04-01", expiryDate: "2026-05-01",
    pinned: false, status: "Scheduled", createdAt: "2026-03-29",
  },
  {
    id: "4",
    title: { en: "Free Community Health Fair", es: "", fr: "", pt: "", zh: "", ko: "" },
    body: { en: "<p>Join us for a <em>free community health fair</em> on April 10th at the Main Clinic. Free screenings, healthy snacks, and giveaways!</p>", es: "", fr: "", pt: "", zh: "", ko: "" },
    audience: "All", clinics: ["1"], priority: "Normal", type: "Event",
    bannerImage: "", publishDate: "", expiryDate: "", pinned: false, status: "Draft", createdAt: "2026-03-30",
  },
];

const emptyForm = () => ({
  title: emptyMultiLang(),
  body: emptyMultiLang(),
  audience: "All",
  clinics: [] as string[],
  priority: "Normal",
  type: "General",
  bannerImage: "",
  publishDate: "",
  expiryDate: "",
  pinned: false,
  status: "Draft",
});

const Announcement = () => {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>(INITIAL_ANNOUNCEMENTS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AnnouncementRecord | null>(null);
  const [activeLang, setActiveLang] = useState("en");

  const [form, setForm] = useState(emptyForm());
  const [pendingBanner, setPendingBanner] = useState<File | null>(null);
  const [pendingBannerPreviewUrl, setPendingBannerPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingBanner) {
      setPendingBannerPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingBanner);
    setPendingBannerPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingBanner]);

  const updateForm = (updates: Partial<ReturnType<typeof emptyForm>>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const filtered = useMemo(
    () =>
      announcements.filter((a) => {
        const matchSearch = a.title.en.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "all" || a.status === filterStatus;
        const matchPriority = filterPriority === "all" || a.priority === filterPriority;
        return matchSearch && matchStatus && matchPriority;
      }),
    [announcements, search, filterStatus, filterPriority],
  );
  const { pagedItems, page, totalPages, totalItems, rangeFrom, rangeTo, goPage } = usePagedList(
    filtered,
    PAGE_SIZE,
    search,
    filterStatus,
    filterPriority,
  );

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setPendingBanner(null);
    setActiveLang("en");
    setDialogOpen(true);
  };

  const openEdit = (a: AnnouncementRecord) => {
    setEditing(a);
    setPendingBanner(null);
    setForm({
      title: { ...a.title },
      body: { ...a.body },
      audience: a.audience,
      clinics: [...a.clinics],
      priority: a.priority,
      type: a.type,
      bannerImage: a.bannerImage,
      publishDate: a.publishDate,
      expiryDate: a.expiryDate,
      pinned: a.pinned,
      status: a.status,
    });
    setActiveLang("en");
    setDialogOpen(true);
  };

  const handleDuplicate = (a: AnnouncementRecord) => {
    const dup: AnnouncementRecord = {
      ...a,
      id: Date.now().toString(),
      title: { ...a.title, en: a.title.en + " (Copy)" },
      status: "Draft",
      pinned: false,
      publishDate: "",
      expiryDate: "",
      createdAt: today(),
    };
    setAnnouncements(prev => [dup, ...prev]);
    toast({ title: "Duplicated", description: "Announcement duplicated as draft." });
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingBanner(file);
  };

  const toggleClinic = (id: string) => {
    setForm(prev => ({
      ...prev,
      clinics: prev.clinics.includes(id) ? prev.clinics.filter(c => c !== id) : [...prev.clinics, id],
    }));
  };

  const toggleAllClinics = () => {
    setForm(prev => ({
      ...prev,
      clinics: prev.clinics.length === ALL_CLINICS.length ? [] : ALL_CLINICS.map(c => c.id),
    }));
  };

  const handleSave = async () => {
    if (!form.title.en.trim()) {
      toast({ title: "Error", description: "English title is required.", variant: "destructive" });
      return;
    }
    let bannerImage = form.bannerImage;
    if (pendingBanner) {
      try {
        bannerImage = await uploadPublicMedia(pendingBanner);
      } catch (err) {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Could not upload banner.",
          variant: "destructive",
        });
        return;
      }
    }
    const payload = { ...form, bannerImage };
    if (editing) {
      setAnnouncements(prev => prev.map(a => a.id === editing.id ? { ...payload, id: editing.id, createdAt: editing.createdAt } : a));
      toast({ title: "Updated", description: "Announcement updated." });
    } else {
      setAnnouncements(prev => [{ ...payload, id: Date.now().toString(), createdAt: today() }, ...prev]);
      toast({ title: "Created", description: "Announcement created." });
    }
    setPendingBanner(null);
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      setAnnouncements(prev => prev.filter(a => a.id !== deleteId));
      toast({ title: "Deleted", description: "Announcement removed." });
      setDeleteId(null);
    }
  };

  const priorityBadge = (p: string) => {
    if (p === "Critical") return <Badge className="bg-destructive text-destructive-foreground">{p}</Badge>;
    if (p === "Urgent") return <Badge className="bg-orange-500 text-white">{p}</Badge>;
    return <Badge variant="outline">{p}</Badge>;
  };

  const statusBadge = (s: string) => {
    if (s === "Published") return <Badge variant="default">{s}</Badge>;
    if (s === "Scheduled") return <Badge className="bg-blue-500 text-white">{s}</Badge>;
    if (s === "Expired") return <Badge variant="secondary">{s}</Badge>;
    if (s === "Archived") return <Badge variant="secondary" className="opacity-60">{s}</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  const previewAnnouncement = announcements.find(a => a.id === previewId);

  const getTranslationCount = (a: AnnouncementRecord) => Object.values(a.title).filter(t => t.trim()).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground">Create, schedule, and broadcast announcements across clinics</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> New Announcement</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>All Announcements</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search announcements..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Clinics</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Publish</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((a, i) => (
                <TableRow key={a.id} className={a.pinned ? "bg-primary/5" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      {a.pinned && <Pin className="h-3 w-3 text-primary fill-primary" />}
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[220px]">
                      <p className="font-medium truncate">{a.title.en}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {LANGUAGES.map(l => (
                          <span key={l.code} className={`text-xs ${a.title[l.code] ? "opacity-100" : "opacity-25 grayscale"}`}>{languageFlagEmoji(l.countryCode)}</span>
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-1">{getTranslationCount(a)}/{LANGUAGES.length}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{a.audience}</Badge></TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {a.clinics.length === ALL_CLINICS.length ? "All Clinics" : `${a.clinics.length} clinic${a.clinics.length !== 1 ? "s" : ""}`}
                    </span>
                  </TableCell>
                  <TableCell><span className="text-xs">{a.type}</span></TableCell>
                  <TableCell>{priorityBadge(a.priority)}</TableCell>
                  <TableCell><span className="text-xs">{a.publishDate || "—"}</span></TableCell>
                  <TableCell><span className="text-xs">{a.expiryDate || "—"}</span></TableCell>
                  <TableCell>{statusBadge(a.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon" title="Preview" onClick={() => setPreviewId(a.id)}><Eye className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(a)}><Pencil className="h-4 w-4 text-primary" /></Button>
                      <Button variant="ghost" size="icon" title="Duplicate" onClick={() => handleDuplicate(a)}><Copy className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleteId(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No announcements found.</TableCell></TableRow>
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

      {/* ========== Preview Modal ========== */}
      <Dialog open={!!previewId} onOpenChange={open => !open && setPreviewId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Preview Announcement
              {previewAnnouncement?.pinned && <Pin className="h-4 w-4 text-primary fill-primary" />}
            </DialogTitle>
          </DialogHeader>
          {previewAnnouncement && (
            <div className="space-y-4">
              {previewAnnouncement.priority === "Critical" && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center">
                  <span className="text-destructive font-semibold text-sm">⚠ CRITICAL ANNOUNCEMENT</span>
                </div>
              )}
              {previewAnnouncement.bannerImage && (
                <img src={publicAssetUrl(previewAnnouncement.bannerImage)} alt="Banner" className="w-full h-40 object-cover rounded-lg" />
              )}
              <div>
                <h2 className="text-xl font-bold text-foreground">{previewAnnouncement.title.en}</h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {priorityBadge(previewAnnouncement.priority)}
                  <Badge variant="outline">{previewAnnouncement.type}</Badge>
                  <Badge variant="outline">{previewAnnouncement.audience}</Badge>
                  {statusBadge(previewAnnouncement.status)}
                </div>
              </div>
              <Separator />
              <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: previewAnnouncement.body.en || "<p><em>No content</em></p>" }} />
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Clinics:</span> <span className="font-medium">{previewAnnouncement.clinics.length === ALL_CLINICS.length ? "All Clinics" : previewAnnouncement.clinics.map(id => ALL_CLINICS.find(c => c.id === id)?.name).join(", ")}</span></div>
                <div><span className="text-muted-foreground">Published:</span> <span className="font-medium">{previewAnnouncement.publishDate || "Not set"}</span></div>
                <div><span className="text-muted-foreground">Expires:</span> <span className="font-medium">{previewAnnouncement.expiryDate || "Never"}</span></div>
                <div><span className="text-muted-foreground">Created:</span> <span className="font-medium">{previewAnnouncement.createdAt}</span></div>
              </div>
              {/* Translation preview */}
              {LANGUAGES.filter(l => l.code !== "en" && previewAnnouncement.title[l.code]).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Other Languages</Label>
                    {LANGUAGES.filter(l => l.code !== "en" && previewAnnouncement.title[l.code]).map(l => (
                      <div key={l.code} className="p-2 rounded bg-muted/50 text-sm">
                        <p className="font-medium">{languageFlagEmoji(l.countryCode)} {previewAnnouncement.title[l.code]}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== Add / Edit Modal ========== */}
      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) setPendingBanner(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Section 1: Content */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                Content
              </h3>

              <Tabs value={activeLang} onValueChange={setActiveLang}>
                <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
                  {LANGUAGES.map(lang => (
                    <TabsTrigger key={lang.code} value={lang.code} className="gap-1 text-xs">
                      <span>{languageFlagEmoji(lang.countryCode)}</span> {lang.label}
                      {form.title[lang.code]?.trim() && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-green-500" />}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {LANGUAGES.map(lang => (
                  <TabsContent key={lang.code} value={lang.code} className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Title ({lang.label}) {lang.code === "en" && <span className="text-destructive">*</span>}</Label>
                      <Input
                        placeholder={`Announcement title in ${lang.label}...`}
                        value={form.title[lang.code] || ""}
                        onChange={e => setForm(prev => ({ ...prev, title: { ...prev.title, [lang.code]: e.target.value } }))}
                        dir={isRtlLanguage(lang.code) ? "rtl" : "ltr"}
                        className={isRtlLanguage(lang.code) ? "text-right" : undefined}
                      />
                      {lang.code !== "en" && form.title.en && (
                        <p className="text-xs text-muted-foreground italic">
                          EN: &ldquo;{form.title.en}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Body ({lang.label})</Label>
                      <div
                        className={`border rounded-md overflow-hidden ${isRtlLanguage(lang.code) ? "rtl" : ""}`}
                        dir={isRtlLanguage(lang.code) ? "rtl" : "ltr"}
                      >
                        <ReactQuill
                          theme="snow"
                          modules={QUILL_MODULES}
                          value={form.body[lang.code] || ""}
                          onChange={val => setForm(prev => ({ ...prev, body: { ...prev.body, [lang.code]: val } }))}
                          placeholder={`Write announcement body in ${lang.label}...`}
                          style={{ minHeight: "150px" }}
                        />
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              {/* Banner Image */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><ImageIcon className="h-4 w-4" /> Banner Image (optional)</Label>
                {pendingBannerPreviewUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-primary/30">
                    <img src={pendingBannerPreviewUrl} alt="Banner preview" className="w-full h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setPendingBanner(null);
                        updateForm({ bannerImage: "" });
                      }}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-destructive/80 rounded-full p-1 transition-colors"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                    <p className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white/90">
                      Stored when you click {editing ? "Update" : "Create"}
                    </p>
                  </div>
                ) : form.bannerImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img src={publicAssetUrl(form.bannerImage)} alt="Banner" className="w-full h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => updateForm({ bannerImage: "" })}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-destructive/80 rounded-full p-1 transition-colors"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Choose a banner (uploaded when you save)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleBannerSelect} />
                  </label>
                )}
              </div>
            </div>

            <Separator />

            {/* Section 2: Targeting */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                Targeting
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select value={form.audience} onValueChange={v => updateForm({ audience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => updateForm({ type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Target Clinics</Label>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleAllClinics}>
                    {form.clinics.length === ALL_CLINICS.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_CLINICS.map(clinic => (
                    <label key={clinic.id} className="flex items-center gap-2 p-2 rounded border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                      <Checkbox
                        checked={form.clinics.includes(clinic.id)}
                        onCheckedChange={() => toggleClinic(clinic.id)}
                      />
                      <span className="text-sm">{clinic.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 3: Scheduling */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                Scheduling & Options
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Publish Date</Label>
                  <Input type="date" value={form.publishDate} onChange={e => updateForm({ publishDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.expiryDate} onChange={e => updateForm({ expiryDate: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => updateForm({ priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => updateForm({ status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.pinned} onCheckedChange={v => updateForm({ pinned: v })} />
                  <Label className="cursor-pointer flex items-center gap-1"><Pin className="h-3.5 w-3.5" /> Pinned</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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

export default Announcement;
