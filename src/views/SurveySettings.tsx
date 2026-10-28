"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes";
import { isRtlLanguage, LANGUAGES, languageFlagEmoji } from "@/lib/supported-languages";
import { DataTablePagination } from "@/components/data-table-pagination";
import { usePagedList } from "@/hooks/use-paged-list";

type Status = "Active" | "Inactive";
type CategoryRow = { id: number; names: Record<string, string>; e_status: number; status: Status };
type TypeRow = { id: number; names: Record<string, string>; status: Status };
type QuestionRow = {
  id: number;
  survey_id: number | null;
  survey_name: string;
  language_id: number | null;
  language_name: string;
  text: string;
  required: boolean;
  status: Status;
};
type ResponseRow = { id: number; key: string; lang_id: number | null; language_name: string; items: string; required: boolean; status: Status };
type ResponseLanguageOption = { id: number; label: string };
type ResponseItemRow = { id: number; name: string; type: string; value: string };

const RESPONSE_ITEM_TYPES = ["text", "boolean", "numeric", "star_rate", "number_rate"] as const;
const PAGE_SIZE = 10;

function normalizeResponseType(type: string): string {
  if (type === "rate") return "star_rate";
  if (type === "num_rate") return "number_rate";
  return type;
}

function parseNumberRateValue(raw: string): { worst: string; best: string } {
  if (!raw) return { worst: "", best: "" };
  try {
    const parsed = JSON.parse(raw) as { worst?: unknown; best?: unknown };
    if (typeof parsed === "object" && parsed !== null) {
      return {
        worst: typeof parsed.worst === "string" ? parsed.worst : "",
        best: typeof parsed.best === "string" ? parsed.best : "",
      };
    }
  } catch {
    // fallback to legacy delimiter format
  }
  const [worst = "", best = ""] = raw.split("||");
  return { worst, best };
}

function buildNumberRateValue(worst: string, best: string): string {
  return JSON.stringify({ worst, best });
}

function responseTypeLabel(type: string): string {
  if (type === "star_rate") return "Star Rate";
  if (type === "number_rate") return "Number Rate";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatResponseItemBadge(item: ResponseItemRow): string {
  if (item.type === "number_rate") {
    const { worst, best } = parseNumberRateValue(item.value);
    if (worst || best) {
      return `${item.name} (${worst || "-"}, ${best || "-"})`;
    }
  }
  return `${item.name}${item.value ? ` (${item.value})` : ""}`;
}

function parseResponseItems(raw: string): ResponseItemRow[] {
  try {
    const parsed = JSON.parse(raw) as Array<{ id?: unknown; name?: unknown; type?: unknown; value?: unknown }>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x, idx) => ({
      id: Number.isFinite(Number(x.id)) ? Number(x.id) : idx,
      name: typeof x.name === "string" ? x.name : "",
      type: typeof x.type === "string" ? normalizeResponseType(x.type) : "text",
      value: typeof x.value === "string" ? x.value : "",
    }));
  } catch {
    return [];
  }
}

function statusBadge(status: Status) {
  return <Badge variant={status === "Active" ? "default" : "secondary"}>{status}</Badge>;
}

const emptyNames = () => Object.fromEntries(LANGUAGES.map((l) => [l.code, ""])) as Record<string, string>;

const SurveySettings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("categories");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [responseLanguages, setResponseLanguages] = useState<ResponseLanguageOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [catNames, setCatNames] = useState<Record<string, string>>(emptyNames());
  const [catLang, setCatLang] = useState("en");
  const [catEStatus, setCatEStatus] = useState("1");
  const [catStatus, setCatStatus] = useState<Status>("Active");

  const [typeNames, setTypeNames] = useState<Record<string, string>>(emptyNames());
  const [typeLang, setTypeLang] = useState("en");
  const [typeStatus, setTypeStatus] = useState<Status>("Active");

  const [qForm, setQForm] = useState({
    survey_id: "",
    language_id: "",
    response_id: "",
    text: "",
    choice_text: "",
    required: false,
    status: "Active" as Status,
  });

  const [resForm, setResForm] = useState({ key: "", lang_id: "", required: false, status: "Active" as Status });
  const [resItems, setResItems] = useState<ResponseItemRow[]>([{ id: 0, name: "", type: "text", value: "" }]);

  const currentRows = useMemo<Array<CategoryRow | TypeRow | QuestionRow | ResponseRow>>(() => {
    const s = search.toLowerCase();
    if (activeTab === "categories") return categories.filter((r) => Object.values(r.names).join(" ").toLowerCase().includes(s));
    if (activeTab === "types") return types.filter((r) => Object.values(r.names).join(" ").toLowerCase().includes(s));
    if (activeTab === "questions") return questions.filter((r) => `${r.text} ${r.survey_name} ${r.language_name}`.toLowerCase().includes(s));
    return responses.filter((r) => `${r.key} ${r.language_name} ${r.items}`.toLowerCase().includes(s));
  }, [activeTab, categories, types, questions, responses, search]);
  const paging = usePagedList(currentRows, PAGE_SIZE, activeTab, search);

  async function loadAll() {
    setLoading(true);
    try {
      const [cRes, tRes, qRes, rRes] = await Promise.all([
        fetch(API_ROUTES.SURVEY_CATEGORIES),
        fetch(API_ROUTES.SURVEY_TYPES),
        fetch(API_ROUTES.SURVEY_QUESTIONS),
        fetch(API_ROUTES.SURVEY_RESPONSES),
      ]);
      const c = (await cRes.json()) as { rows?: CategoryRow[] };
      const t = (await tRes.json()) as { rows?: TypeRow[] };
      const q = (await qRes.json()) as { rows?: QuestionRow[] };
      const r = (await rRes.json()) as { rows?: ResponseRow[]; languages?: ResponseLanguageOption[] };
      setCategories(c.rows ?? []);
      setTypes(t.rows ?? []);
      setQuestions(q.rows ?? []);
      setResponses(r.rows ?? []);
      setResponseLanguages(r.languages ?? []);
    } catch {
      toast({ title: "Error", description: "Failed to load survey settings.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAll(); }, []);

  const openAdd = () => {
    setEditingId(null);
    if (activeTab === "categories") {
      setCatNames(emptyNames());
      setCatLang("en");
      setCatEStatus("1");
      setCatStatus("Active");
    } else if (activeTab === "types") {
      setTypeNames(emptyNames());
      setTypeLang("en");
      setTypeStatus("Active");
    } else if (activeTab === "questions") {
      setQForm({ survey_id: "", language_id: "", response_id: "", text: "", choice_text: "", required: false, status: "Active" });
    } else {
      setResForm({ key: "", lang_id: "", required: false, status: "Active" });
      setResItems([{ id: 0, name: "", type: "text", value: "" }]);
    }
    setDialogOpen(true);
  };

  const openEdit = (id: number) => {
    setEditingId(id);
    if (activeTab === "categories") {
      const row = categories.find((r) => r.id === id);
      if (row) {
        setCatNames({ ...row.names });
        setCatLang("en");
        setCatEStatus(String(row.e_status));
        setCatStatus(row.status);
      }
    } else if (activeTab === "types") {
      const row = types.find((r) => r.id === id);
      if (row) {
        setTypeNames({ ...row.names });
        setTypeLang("en");
        setTypeStatus(row.status);
      }
    } else if (activeTab === "questions") {
      const row = questions.find((r) => r.id === id);
      if (row) {
        setQForm({
          survey_id: row.survey_id == null ? "" : String(row.survey_id),
          language_id: row.language_id == null ? "" : String(row.language_id),
          response_id: "",
          text: row.text,
          choice_text: "",
          required: row.required,
          status: row.status,
        });
      }
    } else {
      const row = responses.find((r) => r.id === id);
      if (row) {
        setResForm({
          key: row.key,
          lang_id: row.lang_id == null ? "" : String(row.lang_id),
          required: row.required,
          status: row.status,
        });
        const parsed = parseResponseItems(row.items);
        setResItems(parsed.length > 0 ? parsed : [{ id: 0, name: "", type: "text", value: "" }]);
      }
    }
    setDialogOpen(true);
  };

  async function saveCurrent() {
    try {
      if (activeTab === "categories") {
        if (!(catNames.en || "").trim()) return toast({ title: "Error", description: "English name is required.", variant: "destructive" });
        const payload = { names: catNames, e_status: Number(catEStatus), status: catStatus };
        const res = await fetch(editingId ? API_ROUTES.surveyCategory(editingId) : API_ROUTES.SURVEY_CATEGORIES, {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      } else if (activeTab === "types") {
        if (!(typeNames.en || "").trim()) return toast({ title: "Error", description: "English name is required.", variant: "destructive" });
        const payload = { names: typeNames, status: typeStatus };
        const res = await fetch(editingId ? API_ROUTES.surveyType(editingId) : API_ROUTES.SURVEY_TYPES, {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      } else if (activeTab === "questions") {
        if (!qForm.text.trim()) return toast({ title: "Error", description: "Question text is required.", variant: "destructive" });
        const payload = {
          survey_id: qForm.survey_id === "" ? null : Number(qForm.survey_id),
          language_id: qForm.language_id === "" ? null : Number(qForm.language_id),
          response_id: qForm.response_id === "" ? null : Number(qForm.response_id),
          text: qForm.text,
          choice_text: qForm.choice_text,
          required: qForm.required,
          status: qForm.status,
        };
        const res = await fetch(editingId ? API_ROUTES.surveyQuestion(editingId) : API_ROUTES.SURVEY_QUESTIONS, {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      } else {
        if (!resForm.key.trim()) return toast({ title: "Error", description: "Response key is required.", variant: "destructive" });
        if (resItems.some((item) => !item.name.trim())) {
          return toast({ title: "Error", description: "Each response item needs a name.", variant: "destructive" });
        }
        const payload = {
          key: resForm.key,
          lang_id: resForm.lang_id === "" ? null : Number(resForm.lang_id),
          items: JSON.stringify(resItems.map((item, idx) => ({ id: idx, name: item.name, type: item.type, value: item.value }))),
          required: resForm.required,
          status: resForm.status,
        };
        const res = await fetch(editingId ? API_ROUTES.surveyResponse(editingId) : API_ROUTES.SURVEY_RESPONSES, {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      }
      setDialogOpen(false);
      await loadAll();
    } catch {
      toast({ title: "Error", description: "Save failed.", variant: "destructive" });
    }
  }

  async function removeCurrent() {
    if (deleteId == null) return;
    try {
      const url =
        activeTab === "categories" ? API_ROUTES.surveyCategory(deleteId) :
          activeTab === "types" ? API_ROUTES.surveyType(deleteId) :
            activeTab === "questions" ? API_ROUTES.surveyQuestion(deleteId) :
              API_ROUTES.surveyResponse(deleteId);
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeleteId(null);
      await loadAll();
    } catch {
      toast({ title: "Error", description: "Delete failed.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Survey Settings</h1>
        <p className="text-muted-foreground">Manage categories, questions, types and responses</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{activeTab}</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 w-64" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : activeTab === "categories" ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Translations</TableHead><TableHead>Event Status</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(paging.pagedItems as CategoryRow[]).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.names.en || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {LANGUAGES.map((l) => (
                              <span key={l.code} className={`text-sm ${row.names[l.code] ? "opacity-100" : "opacity-30 grayscale"}`}>{languageFlagEmoji(l.countryCode)}</span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{row.e_status === 1 ? "Yes" : "No"}</TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(row.id)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : activeTab === "types" ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Translations</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(paging.pagedItems as TypeRow[]).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.names.en || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {LANGUAGES.map((l) => (
                              <span key={l.code} className={`text-sm ${row.names[l.code] ? "opacity-100" : "opacity-30 grayscale"}`}>{languageFlagEmoji(l.countryCode)}</span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(row.id)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : activeTab === "questions" ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Question</TableHead><TableHead>Survey</TableHead><TableHead>Language</TableHead><TableHead>Required</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(paging.pagedItems as QuestionRow[]).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium max-w-[320px] truncate">{row.text}</TableCell>
                        <TableCell>{row.survey_name || "—"}</TableCell>
                        <TableCell>{row.language_name || "—"}</TableCell>
                        <TableCell><Badge variant={row.required ? "default" : "outline"}>{row.required ? "Yes" : "No"}</Badge></TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(row.id)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Key</TableHead><TableHead>Language</TableHead><TableHead>Items</TableHead><TableHead>Required</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(paging.pagedItems as ResponseRow[]).map((row) => {
                      const items = parseResponseItems(row.items);
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium font-mono text-sm">{row.key}</TableCell>
                          <TableCell>{row.language_name || "—"}</TableCell>
                          <TableCell className="max-w-[420px]">
                            <div className="flex flex-wrap gap-1">
                              {items.slice(0, 5).map((it, idx) => (
                                <Badge key={`${row.id}-${idx}`} variant="outline" className="text-xs">
                                  {formatResponseItemBadge(it)}
                                </Badge>
                              ))}
                              {items.length > 5 && <Badge variant="outline" className="text-xs">+{items.length - 5}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant={row.required ? "default" : "outline"}>{row.required ? "Yes" : "No"}</Badge></TableCell>
                          <TableCell>{statusBadge(row.status)}</TableCell>
                          <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(row.id)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
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
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} {activeTab.slice(0, -1)}</DialogTitle></DialogHeader>
          {activeTab === "categories" ? (
            <div className="space-y-4">
              <Tabs value={catLang} onValueChange={setCatLang}>
                <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
                  {LANGUAGES.map((l) => (
                    <TabsTrigger key={l.code} value={l.code} className="gap-1.5 text-xs">
                      <span>{languageFlagEmoji(l.countryCode)}</span> {l.label}
                      {catNames[l.code]?.trim() && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent" />}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {LANGUAGES.map((l) => (
                  <TabsContent key={l.code} value={l.code} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Category Name ({l.label}) {l.code === "en" && <span className="text-destructive">*</span>}</Label>
                      <Input
                        placeholder={`Enter name in ${l.label}...`}
                        value={catNames[l.code] || ""}
                        onChange={e => setCatNames(prev => ({ ...prev, [l.code]: e.target.value }))}
                        dir={isRtlLanguage(l.code) ? "rtl" : "ltr"}
                        className={isRtlLanguage(l.code) ? "text-right" : undefined}
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              <div className="space-y-2">
                <Label>Event Status (e_status)</Label>
                <Select value={catEStatus} onValueChange={(v: "1" | "0") => setCatEStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="1">Yes</SelectItem><SelectItem value="0">No</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Status</Label><Select value={catStatus} onValueChange={(v: Status) => setCatStatus(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
            </div>
          ) : activeTab === "types" ? (
            <div className="space-y-4">
              <Tabs value={typeLang} onValueChange={setTypeLang}>
                <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
                  {LANGUAGES.map((l) => (
                    <TabsTrigger key={l.code} value={l.code} className="gap-1.5 text-xs">
                      <span>{languageFlagEmoji(l.countryCode)}</span> {l.label}
                      {typeNames[l.code]?.trim() && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent" />}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {LANGUAGES.map((l) => (
                  <TabsContent key={l.code} value={l.code} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Type Name ({l.label}) {l.code === "en" && <span className="text-destructive">*</span>}</Label>
                      <Input
                        placeholder={`Enter name in ${l.label}...`}
                        value={typeNames[l.code] || ""}
                        onChange={e => setTypeNames(prev => ({ ...prev, [l.code]: e.target.value }))}
                        dir={isRtlLanguage(l.code) ? "rtl" : "ltr"}
                        className={isRtlLanguage(l.code) ? "text-right" : undefined}
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              <div className="space-y-2"><Label>Status</Label><Select value={typeStatus} onValueChange={(v: Status) => setTypeStatus(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
            </div>
          ) : activeTab === "questions" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>survey_id</Label><Input type="number" value={qForm.survey_id} onChange={e => setQForm(prev => ({ ...prev, survey_id: e.target.value }))} /></div>
                <div className="space-y-2"><Label>language_id</Label><Input type="number" value={qForm.language_id} onChange={e => setQForm(prev => ({ ...prev, language_id: e.target.value }))} /></div>
                <div className="space-y-2"><Label>response_id</Label><Input type="number" value={qForm.response_id} onChange={e => setQForm(prev => ({ ...prev, response_id: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Text</Label><Input value={qForm.text} onChange={e => setQForm(prev => ({ ...prev, text: e.target.value }))} /></div>
              <div className="space-y-2"><Label>choice_text</Label><Input value={qForm.choice_text} onChange={e => setQForm(prev => ({ ...prev, choice_text: e.target.value }))} /></div>
              <div className="flex items-center gap-3"><Checkbox checked={qForm.required} onCheckedChange={v => setQForm(prev => ({ ...prev, required: Boolean(v) }))} /><Label>Required</Label></div>
              <div className="space-y-2"><Label>Status</Label><Select value={qForm.status} onValueChange={(v: Status) => setQForm(prev => ({ ...prev, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Key</Label><Input value={resForm.key} onChange={e => setResForm(prev => ({ ...prev, key: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={resForm.lang_id || "none"} onValueChange={(v) => setResForm(prev => ({ ...prev, lang_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {responseLanguages.map((lang) => (
                      <SelectItem key={lang.id} value={String(lang.id)}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Items</Label>
                <div className="space-y-2">
                  {resItems.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="grid grid-cols-[1fr_170px_1fr_44px] gap-2">
                      <Input placeholder="Item name" value={item.name} onChange={(e) => setResItems(prev => prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p)))} />
                      <Select value={item.type} onValueChange={(v) => setResItems(prev => prev.map((p, i) => (i === idx ? { ...p, type: v } : p)))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESPONSE_ITEM_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{responseTypeLabel(type)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {item.type === "number_rate" ? (
                        <div className="space-y-2">
                          {(() => {
                            const parsed = parseNumberRateValue(item.value);
                            return (
                              <>
                                <Input
                                  placeholder="Worst"
                                  value={parsed.worst}
                                  onChange={(e) =>
                                    setResItems(prev => prev.map((p, i) => (
                                      i === idx ? { ...p, value: buildNumberRateValue(e.target.value, parseNumberRateValue(p.value).best) } : p
                                    )))
                                  }
                                />
                                <Input
                                  placeholder="Best"
                                  value={parsed.best}
                                  onChange={(e) =>
                                    setResItems(prev => prev.map((p, i) => (
                                      i === idx ? { ...p, value: buildNumberRateValue(parseNumberRateValue(p.value).worst, e.target.value) } : p
                                    )))
                                  }
                                />
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <Input placeholder="Value" value={item.value} onChange={(e) => setResItems(prev => prev.map((p, i) => (i === idx ? { ...p, value: e.target.value } : p)))} />
                      )}
                      <Button type="button" variant="ghost" size="icon" disabled={resItems.length <= 1} onClick={() => setResItems(prev => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, id: i })))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => setResItems(prev => [...prev, { id: prev.length, name: "", type: "text", value: "" }])}>Add New Response</Button>
                </div>
              </div>
              <div className="flex items-center gap-3"><Checkbox checked={resForm.required} onCheckedChange={v => setResForm(prev => ({ ...prev, required: Boolean(v) }))} /><Label>Required</Label></div>
              <div className="space-y-2"><Label>Status</Label><Select value={resForm.status} onValueChange={(v: Status) => setResForm(prev => ({ ...prev, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveCurrent()}>{editingId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {activeTab.slice(0, -1)}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void removeCurrent()}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SurveySettings;
