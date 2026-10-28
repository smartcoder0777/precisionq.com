"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTablePagination } from "@/components/data-table-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, Video } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { API_ROUTES } from "@/routes";
import { useToast } from "@/hooks/use-toast";
import { qpMediaUrl } from "@/lib/public-media";

type WordRow = { id: string; code: string; color: string; display: string; description: string };
type QpSettingsProps = {
  initialWords: WordRow[];
  initialSettings: { bgImage: string; bgVideo: string; bgStatus: "image" | "video"; footerText: string };
};

const PAGE_SIZE = 10;

function baseName(path: string): string {
  if (!path) return "";
  const p = path.replace(/\\/g, "/");
  const idx = p.lastIndexOf("/");
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function uploadWithProgress(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("into", "qp");
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { ok?: boolean; filename?: string; message?: string };
        if (xhr.status >= 400 || !data.ok || !data.filename) reject(new Error(data.message || "Upload failed."));
        else resolve(data.filename);
      } catch {
        reject(new Error("Invalid upload response."));
      }
    };
    xhr.open("POST", API_ROUTES.PUBLIC_UPLOAD, true);
    xhr.send(form);
  });
}

const QpSettings = ({ initialWords, initialSettings }: QpSettingsProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("words");
  const [words, setWords] = useState<WordRow[]>(initialWords);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<WordRow | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formColor, setFormColor] = useState("#2563eb");
  const [allWordsColor, setAllWordsColor] = useState(initialWords[0]?.color || "#2563eb");
  const [formDisplay, setFormDisplay] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const [bgImage, setBgImage] = useState(initialSettings.bgImage);
  const [bgVideo, setBgVideo] = useState(initialSettings.bgVideo);
  const [bgStatus, setBgStatus] = useState<"image" | "video">(initialSettings.bgStatus);
  const [footerText, setFooterText] = useState(initialSettings.footerText);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState<string>("");
  const [pendingVideoPreviewUrl, setPendingVideoPreviewUrl] = useState<string>("");
  const [imageProgress, setImageProgress] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [savingQp, setSavingQp] = useState(false);

  useEffect(() => {
    setWords(initialWords);
  }, [initialWords]);

  useEffect(() => {
    if (!pendingImageFile) {
      setPendingImagePreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(pendingImageFile);
    setPendingImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingImageFile]);

  useEffect(() => {
    if (!pendingVideoFile) {
      setPendingVideoPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(pendingVideoFile);
    setPendingVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingVideoFile]);


  const wordSorted = useMemo(() => [...words].sort((a, b) => a.code.localeCompare(b.code)), [words]);
  const wordsPaging = usePagedList(wordSorted, PAGE_SIZE);

  const openAdd = () => {
    setEditing(null);
    setFormCode("");
    setFormColor("#2563eb");
    setFormDisplay("");
    setFormDescription("");
    setDialogOpen(true);
  };
  const openEdit = (row: WordRow) => {
    setEditing(row);
    setFormCode(row.code);
    setFormColor(row.color || "#2563eb");
    setFormDisplay(row.display);
    setFormDescription(row.description);
    setDialogOpen(true);
  };

  const saveWord = async () => {
    if (!formCode.trim()) {
      toast({ title: "Error", description: "Word code is required.", variant: "destructive" });
      return;
    }
    const payload = { code: formCode, color: formColor, display: formDisplay, description: formDescription };
    const url = editing ? API_ROUTES.word(editing.id) : API_ROUTES.WORDS;
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !data.ok) {
      toast({ title: "Error", description: data.message ?? "Save failed.", variant: "destructive" });
      return;
    }
    setDialogOpen(false);
    toast({ title: "Saved", description: editing ? "Word updated successfully." : "Word added successfully." });
    router.refresh();
  };

  const deleteWord = async () => {
    if (!deleteId) return;
    const res = await fetch(API_ROUTES.word(deleteId), { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !data.ok) {
      toast({ title: "Error", description: data.message ?? "Delete failed.", variant: "destructive" });
      return;
    }
    setDeleteId(null);
    toast({ title: "Deleted", description: "Word removed successfully." });
    router.refresh();
  };

  const applyColorToAllWords = async () => {
    try {
      const res = await fetch(API_ROUTES.WORDS, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: allWordsColor }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Could not update all word colors.", variant: "destructive" });
        return;
      }
      toast({ title: "Saved", description: "Applied same text color to all words." });
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    }
  };

  const handleImageSelect = async (file?: File | null) => {
    if (!file) return;
    setPendingImageFile(file);
    toast({ title: "Selected", description: "Image will upload when you save background settings." });
  };

  const handleVideoSelect = async (file?: File | null) => {
    if (!file) return;
    setPendingVideoFile(file);
    toast({ title: "Selected", description: "Video will upload when you save background settings." });
  };

  const saveQpSettings = async () => {
    if (bgStatus === "image" && !bgImage.trim() && !pendingImageFile) {
      toast({ title: "Error", description: "Please upload a background image first.", variant: "destructive" });
      return;
    }
    if (bgStatus === "video" && !bgVideo.trim() && !pendingVideoFile) {
      toast({ title: "Error", description: "Please upload a background video first.", variant: "destructive" });
      return;
    }
    try {
      setSavingQp(true);
      let nextBgImage = bgImage;
      let nextBgVideo = bgVideo;
      if (pendingImageFile) {
        setImageProgress(1);
        nextBgImage = await uploadWithProgress(pendingImageFile, setImageProgress);
      }
      if (pendingVideoFile) {
        setVideoProgress(1);
        nextBgVideo = await uploadWithProgress(pendingVideoFile, setVideoProgress);
      }
      const res = await fetch(API_ROUTES.SETTINGS_QP, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bgImage: nextBgImage, bgVideo: nextBgVideo, bgStatus, footerText }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Save failed.", variant: "destructive" });
        return;
      }
      setBgImage(nextBgImage);
      setBgVideo(nextBgVideo);
      setPendingImageFile(null);
      setPendingVideoFile(null);
      toast({ title: "Saved", description: "QP settings updated." });
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    } finally {
      setTimeout(() => {
        setImageProgress(0);
        setVideoProgress(0);
      }, 400);
      setSavingQp(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">QP Settings</h1>
        <p className="text-muted-foreground">Manage words, background media and footer</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="words">Word Code</TabsTrigger>
          <TabsTrigger value="background">Background</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>

        <TabsContent value="words">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Word Codes</CardTitle>
                <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Word</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
                <div className="space-y-1">
                  <Label>Same Text Color For All Words</Label>
                  <Input type="color" value={allWordsColor} onChange={(e) => setAllWordsColor(e.target.value)} className="w-20 p-1" />
                </div>
                <Button variant="outline" onClick={() => void applyColorToAllWords()}>Apply to All Words</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Display</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wordsPaging.pagedItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded border" style={{ backgroundColor: row.color }} />
                          {row.color}
                        </div>
                      </TableCell>
                      <TableCell>{row.display || "—"}</TableCell>
                      <TableCell>{row.description || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {wordsPaging.totalItems === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No rows found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <DataTablePagination
                totalItems={wordsPaging.totalItems}
                page={wordsPaging.page}
                totalPages={wordsPaging.totalPages}
                rangeFrom={wordsPaging.rangeFrom}
                rangeTo={wordsPaging.rangeTo}
                onPageChange={wordsPaging.goPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="background">
          <Card>
            <CardHeader><CardTitle>Background Media</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={`space-y-2 rounded-md border p-3 ${bgStatus === "image" ? "border-primary/40 bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <Label>Background Image</Label>
                  </div>
                  <Input type="file" accept="image/*" onChange={(e) => void handleImageSelect(e.target.files?.[0])} />
                  {imageProgress > 0 && <Progress value={imageProgress} />}
                  {pendingImagePreviewUrl ? (
                    <>
                      <img src={pendingImagePreviewUrl} alt="pending bg" className="max-h-44 rounded border object-cover" />
                      <p className="text-xs text-muted-foreground">Pending: {pendingImageFile?.name}</p>
                    </>
                  ) : bgImage ? (
                    <>
                      <img src={qpMediaUrl(bgImage)} alt="bg" className="max-h-44 rounded border object-cover" />
                      <p className="text-xs text-muted-foreground">{baseName(bgImage)}</p>
                    </>
                  ) : <p className="text-sm text-muted-foreground">No image</p>}
                </div>
                <div className={`space-y-2 rounded-md border p-3 ${bgStatus === "video" ? "border-primary/40 bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <Label>Background Video</Label>
                  </div>
                  <Input type="file" accept="video/*" onChange={(e) => void handleVideoSelect(e.target.files?.[0])} />
                  {videoProgress > 0 && <Progress value={videoProgress} />}
                  {pendingVideoPreviewUrl ? (
                    <>
                      <video src={pendingVideoPreviewUrl} controls className="max-h-44 w-full rounded border" />
                      <p className="text-xs text-muted-foreground">Pending: {pendingVideoFile?.name}</p>
                    </>
                  ) : bgVideo ? (
                    <>
                      <video src={qpMediaUrl(bgVideo)} controls className="max-h-44 w-full rounded border" />
                      <p className="text-xs text-muted-foreground">{baseName(bgVideo)}</p>
                    </>
                  ) : <p className="text-sm text-muted-foreground">No video</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Background Status</Label>
                <Select value={bgStatus} onValueChange={(v: "image" | "video") => setBgStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current default: {bgStatus === "image" ? "Image" : "Video"}
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void saveQpSettings()} disabled={savingQp}><Upload className="mr-2 h-4 w-4" /> {savingQp ? "Saving..." : "Save Background"}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer">
          <Card>
            <CardHeader><CardTitle>Footer Text</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Footer Content</Label>
                <Textarea rows={4} value={footerText} onChange={(e) => setFooterText(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void saveQpSettings()} disabled={savingQp}>{savingQp ? "Saving..." : "Save Footer"}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Word" : "Add Word"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Code *</Label><Input value={formCode} onChange={(e) => setFormCode(e.target.value)} /></div>
            <div className="space-y-2"><Label>Color</Label><Input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} /></div>
            <div className="space-y-2"><Label>Display</Label><Input value={formDisplay} onChange={(e) => setFormDisplay(e.target.value)} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={() => void saveWord()}>{editing ? "Update" : "Add"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Word</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void deleteWord()}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QpSettings;
