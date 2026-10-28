"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTablePagination } from "@/components/data-table-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import { useParams, useRouter } from "next/navigation";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Pencil, Trash2, ArrowLeft, Camera, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { publicAssetUrl } from "@/lib/public-media";
import { uploadPublicMedia } from "@/lib/upload-public-media";
import { LANGUAGES, languageFlagEmoji } from "@/lib/supported-languages";
import { adminPage } from "@/routes";

const PAGE_SIZE = 10;

interface MultiLangField {
  [langCode: string]: string;
}

interface PatientProfile {
  id: string;
  name: string;
  photo: string;
  description: MultiLangField;
  detail: MultiLangField;
  contact: MultiLangField;
  status: "Active" | "Inactive";
}

const INITIAL_PROFILES: PatientProfile[] = [
  {
    id: "1", name: "Dr. Maria Gonzalez", photo: "",
    description: { en: "Experienced primary care physician with 15 years of practice.", es: "Médica de atención primaria experimentada con 15 años de práctica.", fr: "", pt: "", zh: "", ko: "" },
    detail: { en: "Board certified in Internal Medicine. Specializes in preventive care and chronic disease management.", es: "Certificada en Medicina Interna. Especializada en cuidado preventivo.", fr: "", pt: "", zh: "", ko: "" },
    contact: { en: "Phone: (512) 555-0101\nEmail: m.gonzalez@clinic.com", es: "Teléfono: (512) 555-0101\nCorreo: m.gonzalez@clinic.com", fr: "", pt: "", zh: "", ko: "" },
    status: "Active",
  },
  {
    id: "2", name: "Dr. James Chen", photo: "",
    description: { en: "Specialist in behavioral health and counseling.", es: "Especialista en salud conductual y consejería.", fr: "", pt: "", zh: "", ko: "" },
    detail: { en: "PhD in Clinical Psychology. Cognitive behavioral therapy specialist.", es: "", fr: "", pt: "", zh: "", ko: "" },
    contact: { en: "Phone: (512) 555-0202\nEmail: j.chen@clinic.com", es: "", fr: "", pt: "", zh: "", ko: "" },
    status: "Active",
  },
];

const emptyMultiLang = (): MultiLangField => LANGUAGES.reduce((acc, l) => ({ ...acc, [l.code]: "" }), {});

const PatientProfiles = () => {
  const params = useParams<{ categoryId: string }>();
  const categoryId = params?.categoryId;
  const router = useRouter();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<PatientProfile[]>(INITIAL_PROFILES);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PatientProfile | null>(null);
  const [activeLang, setActiveLang] = useState("en");
  const [activeField, setActiveField] = useState<"description" | "detail" | "contact">("description");

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhoto, setFormPhoto] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingPhotoPreviewUrl, setPendingPhotoPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingPhoto) {
      setPendingPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingPhoto);
    setPendingPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhoto]);
  const [formDesc, setFormDesc] = useState<MultiLangField>(emptyMultiLang());
  const [formDetail, setFormDetail] = useState<MultiLangField>(emptyMultiLang());
  const [formContact, setFormContact] = useState<MultiLangField>(emptyMultiLang());
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");

  const filtered = useMemo(
    () => profiles.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [profiles, search],
  );
  const { pagedItems, page, totalPages, totalItems, rangeFrom, rangeTo, goPage } = usePagedList(filtered, PAGE_SIZE, search);

  const openAdd = () => {
    setEditing(null);
    setFormName("");
    setFormPhoto("");
    setPendingPhoto(null);
    setFormDesc(emptyMultiLang());
    setFormDetail(emptyMultiLang());
    setFormContact(emptyMultiLang());
    setFormStatus("Active");
    setActiveLang("en");
    setActiveField("description");
    setDialogOpen(true);
  };

  const openEdit = (p: PatientProfile) => {
    setEditing(p);
    setFormName(p.name);
    setFormPhoto(p.photo);
    setPendingPhoto(null);
    setFormDesc({ ...p.description });
    setFormDetail({ ...p.detail });
    setFormContact({ ...p.contact });
    setFormStatus(p.status);
    setActiveLang("en");
    setActiveField("description");
    setDialogOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingPhoto(file);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "Patient name is required.", variant: "destructive" });
      return;
    }
    let photo = formPhoto;
    if (pendingPhoto) {
      try {
        photo = await uploadPublicMedia(pendingPhoto);
      } catch (err) {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Could not upload photo.",
          variant: "destructive",
        });
        return;
      }
    }
    const data: PatientProfile = {
      id: editing?.id || Date.now().toString(),
      name: formName,
      photo,
      description: formDesc,
      detail: formDetail,
      contact: formContact,
      status: formStatus,
    };
    if (editing) {
      setProfiles(prev => prev.map(p => p.id === editing.id ? data : p));
      toast({ title: "Updated", description: "Patient profile updated." });
    } else {
      setProfiles(prev => [...prev, data]);
      toast({ title: "Added", description: "Patient profile added." });
    }
    setPendingPhoto(null);
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      setProfiles(prev => prev.filter(p => p.id !== deleteId));
      toast({ title: "Deleted", description: "Profile removed." });
      setDeleteId(null);
    }
  };

  const currentFieldData = activeField === "description" ? formDesc : activeField === "detail" ? formDetail : formContact;
  const setCurrentField = (lang: string, val: string) => {
    if (activeField === "description") setFormDesc(prev => ({ ...prev, [lang]: val }));
    else if (activeField === "detail") setFormDetail(prev => ({ ...prev, [lang]: val }));
    else setFormContact(prev => ({ ...prev, [lang]: val }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(adminPage("/patient-services"))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Patient Profiles</h1>
            <p className="text-muted-foreground">Category ID: {categoryId} — Manage patient profiles with multi-language support</p>
          </div>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Profile</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Profiles</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search profiles..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Photo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={publicAssetUrl(p.photo) || undefined} alt={p.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {p.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="text-sm truncate">{p.description.en || "—"}</p>
                    <div className="flex gap-0.5 mt-1">
                      {LANGUAGES.map(l => (
                        <span key={l.code} className={`text-xs ${p.description[l.code] ? "opacity-100" : "opacity-25 grayscale"}`}>{languageFlagEmoji(l.countryCode)}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px]">
                    <p className="text-sm truncate">{p.contact.en?.split("\n")[0] || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "Active" ? "default" : "secondary"}>{p.status}</Badge>
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
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No profiles found.</TableCell></TableRow>
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
          if (!open) setPendingPhoto(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Profile" : "Add Profile"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Photo Upload — Circular avatar with overlay */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-2 border-dashed border-border">
                  <AvatarImage src={(pendingPhotoPreviewUrl || publicAssetUrl(formPhoto)) || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <Camera className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Upload className="h-6 w-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                </label>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Patient Photo</Label>
                <p className="text-xs text-muted-foreground">
                  Hover over the avatar to choose a photo. It is uploaded when you click {editing ? "Update" : "Add"}.
                </p>
                {(formPhoto || pendingPhoto) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive text-xs h-7 px-2"
                    onClick={() => {
                      setPendingPhoto(null);
                      setFormPhoto("");
                    }}
                  >
                    Remove Photo
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient Name <span className="text-destructive">*</span></Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Enter full name..." />
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

            {/* Multi-language rich content fields */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold">Multi-Language Content</Label>
                <Badge variant="outline" className="text-xs">Editor</Badge>
              </div>

              {/* Field selector */}
              <div className="flex gap-2">
                {(["description", "detail", "contact"] as const).map(field => (
                  <Button
                    key={field}
                    variant={activeField === field ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveField(field)}
                    className="capitalize"
                  >
                    {field === "detail" ? "Detail Information" : field === "contact" ? "Contact Info" : "Description"}
                  </Button>
                ))}
              </div>

              <Tabs value={activeLang} onValueChange={setActiveLang}>
                <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
                  {LANGUAGES.map(lang => (
                    <TabsTrigger key={lang.code} value={lang.code} className="gap-1 text-xs">
                      <span>{languageFlagEmoji(lang.countryCode)}</span> {lang.label}
                      {currentFieldData[lang.code]?.trim() && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-500" />}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {LANGUAGES.map(lang => (
                  <TabsContent key={lang.code} value={lang.code}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground capitalize">
                          {activeField} — {lang.label}
                        </Label>
                        {lang.code !== "en" && formDesc.en && activeField === "description" && (
                          <span className="text-xs text-muted-foreground italic">
                            EN: &ldquo;{formDesc.en.slice(0, 50)}...&rdquo;
                          </span>
                        )}
                      </div>
                      <Textarea
                        rows={5}
                        placeholder={`Enter ${activeField} in ${lang.label}...`}
                        value={currentFieldData[lang.code] || ""}
                        onChange={e => setCurrentField(lang.code, e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
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
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
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

export default PatientProfiles;
