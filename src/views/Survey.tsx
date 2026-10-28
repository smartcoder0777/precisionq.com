"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTablePagination } from "@/components/data-table-pagination";
import { usePagedList } from "@/hooks/use-paged-list";
import { useRouter } from "next/navigation";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="min-h-[180px] rounded-md border border-dashed border-border bg-muted/30" />,
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, Mail, MessageSquare, HelpCircle, Eye, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES, languageFlagEmoji } from "@/lib/supported-languages";
import { formatUsPhoneDisplay } from "@/lib/phone-format";
import { adminPage, API_ROUTES } from "@/routes";

const PAGE_SIZE = 10;
const PATIENT_PAGE_SIZE = 20;
const SURVEY_STATUSES = ["Active", "Inactive", "Closed"] as const;
const EMAIL_BRAND_TITLE = "Precision Quality Central System";
const EMAIL_LOGO_URL = "/favicon.ico";

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

type SurveyRow = {
  id: number;
  langId: number | null;
  langCode: string | null;
  langLabel: string | null;
  cateId: number | null;
  typeId: number | null;
  categoryName: string | null;
  typeName: string | null;
  name: string | null;
  desc: string | null;
  pageLength: number;
  status: string;
};

type LangOption = { id: number; code: string | null; label: string | null };
type CatOption = { id: number; nameEn: string | null; nameEs: string | null };
type TypeOption = { id: number; nameEn: string | null; nameEs: string | null };
type PatientRecord = { id: number; name: string; email: string; phone: string | null };

function flagForLangCode(code: string | null | undefined): string {
  if (!code) return languageFlagEmoji("us");
  const hit = LANGUAGES.find((l) => l.code === code);
  return languageFlagEmoji(hit?.countryCode ?? "us");
}

const Survey = () => {
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [languages, setLanguages] = useState<LangOption[]>([]);
  const [categories, setCategories] = useState<CatOption[]>([]);
  const [types, setTypes] = useState<TypeOption[]>([]);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [sendModal, setSendModal] = useState<{ type: "email" | "sms"; surveyId: number } | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [patientsTotal, setPatientsTotal] = useState(0);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<number[]>([]);
  const [selectedPatientMap, setSelectedPatientMap] = useState<Record<number, PatientRecord>>({});

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyMode, setEmailBodyMode] = useState<"rich" | "html">("rich");
  const [emailHtmlRich, setEmailHtmlRich] = useState("");
  const [emailHtmlRaw, setEmailHtmlRaw] = useState("");
  const [smsBody, setSmsBody] = useState("Please complete our survey. Thank you.");
  const [sending, setSending] = useState(false);

  const [formLangId, setFormLangId] = useState<string>("");
  const [formCateId, setFormCateId] = useState<string>("");
  const [formTypeId, setFormTypeId] = useState<string>("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState<string>("Active");
  const [formPageType, setFormPageType] = useState<"single" | "multi">("single");

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.SURVEYS, { credentials: "include" });
      const data = (await res.json()) as {
        ok?: boolean;
        surveys?: SurveyRow[];
        languages?: LangOption[];
        categories?: CatOption[];
        types?: TypeOption[];
        message?: string;
      };
      if (!res.ok || data.ok === false) throw new Error(data.message || "Failed to load surveys.");
      setSurveys(data.surveys ?? []);
      setLanguages(data.languages ?? []);
      setCategories(data.categories ?? []);
      setTypes(data.types ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load surveys.";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadPatients = useCallback(async (query: string, page: number) => {
    setPatientsLoading(true);
    try {
      const params = new URLSearchParams({ query, page: String(page), pageSize: String(PATIENT_PAGE_SIZE) });
      const res = await fetch(`${API_ROUTES.SURVEYS_PATIENTS}?${params.toString()}`, { credentials: "include" });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: PatientRecord[];
        total?: number;
        message?: string;
      };
      if (!res.ok || data.ok === false) throw new Error(data.message || "Failed to load patients.");
      const items = data.items ?? [];
      setPatients(items);
      setPatientsTotal(data.total ?? 0);
      setSelectedPatientMap((prev) => {
        const next = { ...prev };
        for (const p of items) next[p.id] = p;
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load patients.";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setPatients([]);
      setPatientsTotal(0);
    } finally {
      setPatientsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!sendModal) return;
    const timer = setTimeout(() => {
      void loadPatients(patientSearch, patientPage);
    }, 250);
    return () => clearTimeout(timer);
  }, [sendModal, patientSearch, patientPage, loadPatients]);

  const resetForm = () => {
    setFormLangId(languages[0]?.id != null ? String(languages[0].id) : "");
    setFormCateId(categories[0]?.id != null ? String(categories[0].id) : "");
    setFormTypeId(types[0]?.id != null ? String(types[0].id) : "");
    setFormName("");
    setFormDesc("");
    setFormStatus("Active");
    setFormPageType("single");
    setEditingId(null);
  };

  const openAdd = () => { resetForm(); setModalOpen(true); };

  const openEdit = (s: SurveyRow) => {
    setEditingId(s.id);
    setFormLangId(s.langId != null ? String(s.langId) : "");
    setFormCateId(s.cateId != null ? String(s.cateId) : "");
    setFormTypeId(s.typeId != null ? String(s.typeId) : "");
    setFormName(s.name ?? "");
    setFormDesc(s.desc ?? "");
    setFormStatus(s.status);
    setFormPageType(s.pageLength > 1 ? "multi" : "single");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formLangId || !formCateId || !formTypeId || !formName.trim()) {
      toast({ title: "Error", description: "Language, category, type, and survey name are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        langId: Number(formLangId),
        cateId: Number(formCateId),
        typeId: Number(formTypeId),
        name: formName.trim(),
        desc: formDesc.trim() || null,
        pageLength: formPageType === "multi" ? 10 : 1,
        status: formStatus,
      };
      const url = editingId != null ? API_ROUTES.survey(editingId) : API_ROUTES.SURVEYS;
      const res = await fetch(url, {
        method: editingId != null ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || data.ok === false) throw new Error(data.message || "Save failed.");
      toast({ title: editingId ? "Updated" : "Created", description: "Survey saved successfully." });
      setModalOpen(false);
      resetForm();
      await loadPage();
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Save failed.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      const res = await fetch(API_ROUTES.survey(deleteId), { method: "DELETE", credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || data.ok === false) throw new Error(data.message || "Delete failed.");
      setDeleteId(null);
      toast({ title: "Deleted", description: "Survey removed." });
      await loadPage();
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Delete failed.", variant: "destructive" });
    }
  };

  const openSendModal = (type: "email" | "sms", surveyId: number) => {
    const s = surveys.find((x) => x.id === surveyId);
    const surveyName = s?.name?.trim() || "Survey";
    const serviceName = s?.categoryName?.trim() || s?.typeName?.trim() || "Service";
    setSendModal({ type, surveyId });
    setPatientSearch("");
    setPatientPage(1);
    setPatients([]);
    setPatientsTotal(0);
    setSelectedPatients([]);
    setSelectedPatientMap({});
    setEmailSubject(`${surveyName} - ${serviceName}`);
    setEmailBodyMode("rich");
    setEmailHtmlRich("<p>Hello,</p><p>Please complete our survey using the link we sent you.</p>");
    setEmailHtmlRaw("<p>Hello,</p><p>Please complete our survey using the link we sent you.</p>");
    setSmsBody("Please complete our survey. Thank you.");
  };

  const togglePatient = (id: number) => {
    setSelectedPatients((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const toggleAllPatients = () => {
    const ids = patients.map((p) => p.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedPatients.includes(id));
    if (allSelected) setSelectedPatients((prev) => prev.filter((id) => !ids.includes(id)));
    else setSelectedPatients((prev) => [...new Set([...prev, ...ids])]);
  };

  const selectedPatientRecords = selectedPatients
    .map((id) => selectedPatientMap[id])
    .filter((p): p is PatientRecord => Boolean(p));

  const htmlBodyForSend = emailBodyMode === "rich" ? emailHtmlRich : emailHtmlRaw;

  const wrapEmailTemplate = (contentHtml: string, surveyName: string, serviceName: string): string => {
    return `
<div style="margin:0;padding:24px;background:#f3f6fb;font-family:Arial,sans-serif;color:#1f2937;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
    <div style="padding:18px 24px;background:#0b3a66;color:#ffffff;display:flex;align-items:center;gap:12px;">
      <img src="${EMAIL_LOGO_URL}" alt="Logo" style="width:32px;height:32px;border-radius:6px;background:#ffffff;" />
      <div>
        <div style="font-size:16px;font-weight:700;line-height:1.2;">${EMAIL_BRAND_TITLE}</div>
        <div style="font-size:12px;opacity:0.9;">Survey Notification</div>
      </div>
    </div>
    <div style="padding:22px 24px;">
      <h2 style="margin:0 0 10px 0;font-size:18px;color:#0f172a;">${surveyName} - ${serviceName}</h2>
      <div style="font-size:14px;line-height:1.65;color:#111827;">
        ${contentHtml}
      </div>
    </div>
    <div style="padding:12px 24px;border-top:1px solid #e5e7eb;background:#f8fafc;font-size:12px;color:#64748b;">
      ${EMAIL_BRAND_TITLE}
    </div>
  </div>
</div>`.trim();
  };

  const handleSend = async () => {
    if (!sendModal) return;
    if (selectedPatients.length === 0) {
      toast({ title: "Error", description: "Please select at least one recipient.", variant: "destructive" });
      return;
    }
    if (sendModal.type === "email" && !htmlBodyForSend.trim()) {
      toast({ title: "Error", description: "Enter email content.", variant: "destructive" });
      return;
    }
    if (sendModal.type === "sms" && !smsBody.trim()) {
      toast({ title: "Error", description: "Enter SMS message text.", variant: "destructive" });
      return;
    }

    const recipients =
      sendModal.type === "email"
        ? selectedPatientRecords.map((p) => ({ email: p.email }))
        : selectedPatientRecords.map((p) => ({ phone: (p.phone ?? "").replace(/\s/g, "") }));

    setSending(true);
    try {
      const surveyName = surveys.find((s) => s.id === sendModal.surveyId)?.name?.trim() || "Survey";
      const serviceName =
        surveys.find((s) => s.id === sendModal.surveyId)?.categoryName?.trim() || "Service";
      const finalSubject = emailSubject.trim() || `${surveyName} - ${serviceName}`;
      const finalHtml =
        sendModal.type === "email"
          ? wrapEmailTemplate(htmlBodyForSend, surveyName, serviceName)
          : undefined;

      const res = await fetch(API_ROUTES.SURVEYS_SEND, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: sendModal.type,
          surveyId: sendModal.surveyId,
          subject: finalSubject,
          htmlBody: finalHtml,
          smsBody: sendModal.type === "sms" ? smsBody.trim() : undefined,
          recipients,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; sent?: number; failed?: number; message?: string };
      if (!res.ok) throw new Error(data.message || "Send failed.");
      if ((data.failed ?? 0) > 0) {
        toast({ title: "Partially sent", description: `${data.sent ?? 0} sent, ${data.failed} failed. ${data.message ?? ""}`, variant: "destructive" });
      } else {
        toast({ title: "Sent", description: `${sendModal.type === "email" ? "Email" : "SMS"} sent to ${data.sent ?? recipients.length} recipient(s).` });
      }
      setSendModal(null);
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Send failed.", variant: "destructive" });
    } finally { setSending(false); }
  };

  const filteredSurveys = useMemo(() => surveys.filter((s) => (s.name ?? "").toLowerCase().includes(search.toLowerCase())), [surveys, search]);
  const surveyPaging = usePagedList(filteredSurveys, PAGE_SIZE, search);
  const patientTotalPages = Math.max(1, Math.ceil(patientsTotal / PATIENT_PAGE_SIZE));

  const getStatusBadge = (status: string) => status === "Active" ? <Badge variant="default">{status}</Badge> : status === "Closed" ? <Badge variant="destructive">{status}</Badge> : <Badge variant="outline">{status}</Badge>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Surveys</h1>
          <p className="text-muted-foreground">Each survey is stored in one language (<code className="text-xs">lang_id</code>).</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Survey</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All Surveys</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search surveys..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {loading ? <span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</span> : null}
          </div>

          <div className="max-w-full overflow-x-auto rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Survey Name</TableHead><TableHead>Language</TableHead><TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead className="hidden md:table-cell">Description</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredSurveys.length === 0 ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">{loading ? "Loading…" : "No surveys found."}</TableCell></TableRow> : surveyPaging.pagedItems.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="min-w-[140px] font-medium">{s.name || "Untitled"}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-1.5 text-sm"><span className="text-base leading-none">{flagForLangCode(s.langCode)}</span><span>{s.langLabel || s.langCode || "—"}</span></span></TableCell>
                    <TableCell className="whitespace-nowrap">{s.categoryName || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{s.typeName || "—"}</TableCell>
                    <TableCell className="hidden max-w-[220px] truncate text-sm text-muted-foreground md:table-cell">{s.desc || "—"}</TableCell>
                    <TableCell>{getStatusBadge(s.status)}</TableCell>
                    <TableCell><div className="flex justify-end gap-0.5">
                      <Button variant="ghost" size="icon" onClick={() => openSendModal("email", s.id)} title="Send Email"><Mail className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openSendModal("sms", s.id)} title="Send SMS"><MessageSquare className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => router.push(adminPage(`/survey/${s.id}/builder`))} title="Questions"><HelpCircle className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => router.push(adminPage(`/survey/${s.id}/preview`))} title="Preview"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)} title="Remove"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination totalItems={surveyPaging.totalItems} page={surveyPaging.page} totalPages={surveyPaging.totalPages} rangeFrom={surveyPaging.rangeFrom} rangeTo={surveyPaging.rangeTo} onPageChange={surveyPaging.goPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editingId != null ? "Update Survey" : "Add Survey"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Language *</Label><Select value={formLangId} onValueChange={setFormLangId}><SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger><SelectContent>{languages.map((l) => <SelectItem key={l.id} value={String(l.id)}>{flagForLangCode(l.code)} {(l.label || l.code || `ID ${l.id}`).trim()} {l.code ? `(${l.code})` : ""}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Category *</Label><Select value={formCateId} onValueChange={setFormCateId}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nameEn || c.nameEs || `Category #${c.id}`}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Type *</Label><Select value={formTypeId} onValueChange={setFormTypeId}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{types.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nameEn || t.nameEs || `Type #${t.id}`}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Status</Label><Select value={formStatus} onValueChange={setFormStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SURVEY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Page layout</Label><RadioGroup value={formPageType} onValueChange={(v) => setFormPageType(v as "single" | "multi")} className="flex flex-wrap gap-6 pt-1"><div className="flex items-center space-x-2"><RadioGroupItem value="single" id="single" /><Label htmlFor="single" className="cursor-pointer font-normal">Single page</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="multi" id="multi" /><Label htmlFor="multi" className="cursor-pointer font-normal">Multi page</Label></div></RadioGroup></div>
            <div className="space-y-2"><Label>Name *</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Survey title" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Short description" rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button><Button onClick={() => void handleSave()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editingId != null ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sendModal} onOpenChange={(open) => !open && setSendModal(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2">{sendModal?.type === "email" ? <Mail className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}Send survey via {sendModal?.type === "email" ? "email" : "SMS"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/50 p-3"><p className="text-sm font-medium">Survey: {surveys.find((s) => s.id === sendModal?.surveyId)?.name || "Unknown"}</p></div>

            {sendModal?.type === "email" ? (
              <>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Category: </span>
                  <span className="font-medium">
                    {surveys.find((s) => s.id === sendModal?.surveyId)?.categoryName || "Service"}
                  </span>
                </div>
                <div className="space-y-2"><Label>Subject</Label><Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject" /></div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Tabs value={emailBodyMode} onValueChange={(v) => setEmailBodyMode(v as "rich" | "html")}>
                    <TabsList><TabsTrigger value="rich">Editor</TabsTrigger><TabsTrigger value="html">HTML</TabsTrigger></TabsList>
                    <TabsContent value="rich" className="mt-2">
                      <div className="overflow-hidden rounded-md border [&_.ql-editor]:min-h-[180px]">
                        <ReactQuill theme="snow" modules={QUILL_MODULES} value={emailHtmlRich} onChange={setEmailHtmlRich} placeholder="Write the email body…" />
                      </div>
                    </TabsContent>
                    <TabsContent value="html" className="mt-2">
                      <Textarea value={emailHtmlRaw} onChange={(e) => setEmailHtmlRaw(e.target.value)} className="min-h-[220px] font-mono text-sm" placeholder="<p>Hello, ...</p>" />
                    </TabsContent>
                  </Tabs>
                </div>
              </>
            ) : (
              <div className="space-y-2"><Label>SMS text</Label><Textarea value={smsBody} onChange={(e) => setSmsBody(e.target.value)} rows={5} placeholder="Plain text message (no HTML)" /></div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Recipients ({selectedPatients.length} selected)</Label>
                <Button type="button" variant="outline" size="sm" onClick={toggleAllPatients}>
                  {patients.length > 0 && patients.every((p) => selectedPatients.includes(p.id)) ? "Deselect page" : "Select page"}
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search patients by name/email/phone..." className="pl-9" value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setPatientPage(1); }} />
              </div>
            </div>

            {selectedPatientRecords.length > 0 ? (
              <div className="flex max-h-[76px] flex-wrap gap-1.5 overflow-y-auto">
                {selectedPatientRecords.map((patient) => (
                  <Badge key={patient.id} variant="secondary" className="gap-1 pr-1">{patient.name}<button type="button" onClick={() => togglePatient(patient.id)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>
                ))}
              </div>
            ) : null}

            <div className="rounded-md border">
              <div className="max-h-[280px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-10" /><TableHead>Name</TableHead><TableHead>{sendModal?.type === "email" ? "Email" : "Phone"}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {patientsLoading ? (
                      <TableRow><TableCell colSpan={3} className="py-6 text-center text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading patients...</TableCell></TableRow>
                    ) : patients.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="py-4 text-center text-muted-foreground">No patients found.</TableCell></TableRow>
                    ) : patients.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => togglePatient(p.id)}>
                        <TableCell><Checkbox checked={selectedPatients.includes(p.id)} onCheckedChange={() => togglePatient(p.id)} /></TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{sendModal?.type === "email" ? p.email : formatUsPhoneDisplay(p.phone)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
                <span>{patientsTotal} total patients</span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setPatientPage((p) => Math.max(1, p - 1))} disabled={patientPage <= 1 || patientsLoading}><ChevronLeft className="h-4 w-4" /> Prev</Button>
                  <span>Page {patientPage} / {patientTotalPages}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPatientPage((p) => Math.min(patientTotalPages, p + 1))} disabled={patientPage >= patientTotalPages || patientsLoading}>Next <ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendModal(null)} disabled={sending}>Cancel</Button>
            <Button onClick={() => void handleSend()} disabled={selectedPatients.length === 0 || sending}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : sendModal?.type === "email" ? <Mail className="mr-2 h-4 w-4" /> : <MessageSquare className="mr-2 h-4 w-4" />}Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete survey</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void handleDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Survey;
