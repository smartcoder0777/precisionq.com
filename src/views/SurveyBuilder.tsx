"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, GripVertical, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES, adminPage } from "@/routes";

type BuilderQuestionRow = {
  id: number;
  text: string;
  status: number;
  responseKey: string | null;
  responseItems: string | null;
};

type BuilderResponseRow = {
  id: number;
  key: string | null;
  status: number | null;
  items: string | null;
};

type QuestionItem = {
  id: string;
  dbId: number;
  text: string;
  status: number;
  responseKey: string | null;
  responseItems: string | null;
};

function parseItems(items: string | null): Array<{ id: number; name: string; type: string; value: string }> {
  if (!items) return [];
  try {
    const parsed = JSON.parse(items);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === "object")
      .map((x, i) => {
        const o = x as Record<string, unknown>;
        return {
          id: Number(o.id ?? i),
          name: String(o.name ?? ""),
          type: String(o.type ?? ""),
          value: String(o.value ?? ""),
        };
      });
  } catch {
    return [];
  }
}

const SurveyBuilder = () => {
  const router = useRouter();
  const params = useParams<{ surveyId: string }>();
  const surveyId = Number(params?.surveyId);
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [surveyTitle, setSurveyTitle] = useState("Survey Builder");
  const [languageId, setLanguageId] = useState(1);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [surveyViewQuestionIds, setSurveyViewQuestionIds] = useState<string[]>([]);
  const [responses, setResponses] = useState<BuilderResponseRow[]>([]);
  const [dragData, setDragData] = useState<{ type: "question" | "response"; id: string } | null>(null);

  const responseByKey = useMemo(() => {
    const m = new Map<string, BuilderResponseRow>();
    for (const r of responses) if (r.key) m.set(r.key, r);
    return m;
  }, [responses]);

  const surveyViewQuestions = useMemo(
    () => questions.filter((q) => surveyViewQuestionIds.includes(q.id)),
    [questions, surveyViewQuestionIds],
  );

  const loadBuilder = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.surveyBuilder(surveyId), { credentials: "include" });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        survey?: { name: string | null };
        languageId?: number;
        questions?: BuilderQuestionRow[];
        responses?: BuilderResponseRow[];
        savedPairs?: Array<{ quesId: number; respId: number }>;
      };
      if (!res.ok || data.ok === false) throw new Error(data.message || "Failed to load survey builder");

      setSurveyTitle(data.survey?.name || "Survey Builder");
      setLanguageId(data.languageId || 1);
      setResponses(data.responses || []);
      const responseById = new Map((data.responses || []).map((r) => [r.id, r]));
      const savedPairByQues = new Map((data.savedPairs || []).map((p) => [p.quesId, p.respId]));
      const nextQuestions = (data.questions || []).map((q) => {
        const respId = savedPairByQues.get(q.id);
        const resp = respId != null ? responseById.get(respId) : undefined;
        return {
          id: `db-${q.id}`,
          dbId: q.id,
          text: q.text,
          status: q.status ?? 1,
          responseKey: resp?.key ?? null,
          responseItems: resp?.items ?? null,
        };
      });
      setQuestions(nextQuestions);
      setSurveyViewQuestionIds((data.savedPairs || []).map((p) => `db-${p.quesId}`));
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Load failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(surveyId) || surveyId <= 0) return;
    void loadBuilder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId]);

  const assignResponse = (questionId: string, responseKey: string) => {
    const items = responseByKey.get(responseKey)?.items ?? null;
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, responseKey, responseItems: items } : q)),
    );
  };

  const handleDropQuestionToSurveyView = () => {
    if (!dragData || dragData.type !== "question") return;
    setSurveyViewQuestionIds((prev) => (prev.includes(dragData.id) ? prev : [...prev, dragData.id]));
    setDragData(null);
  };

  const handleDropOnQuestion = (questionId: string) => {
    if (!dragData || dragData.type !== "response") return;
    assignResponse(questionId, dragData.id);
    setDragData(null);
  };

  const clearResponse = (questionId: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, responseKey: null, responseItems: null } : q)));
  };

  const removeFromSurveyView = (questionId: string) => {
    setSurveyViewQuestionIds((prev) => prev.filter((id) => id !== questionId));
  };

  const handleSave = async () => {
    const payloadQuestions = surveyViewQuestions
      .filter((q) => q.text.trim())
      .map((q) => ({ id: q.dbId, text: q.text.trim(), status: q.status, responseKey: q.responseKey }));

    setSaving(true);
    try {
      const res = await fetch(API_ROUTES.surveyBuilder(surveyId), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageId, questions: payloadQuestions }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; count?: number };
      if (!res.ok || data.ok === false) throw new Error(data.message || "Save failed");
      toast({ title: "Saved", description: `${data.count ?? payloadQuestions.length} question(s) saved.` });
      await loadBuilder();
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <div className="border-b bg-background flex-shrink-0">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(adminPage("/survey"))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Survey Builder</h1>
            <p className="text-sm text-muted-foreground">{surveyTitle}</p>
          </div>
          <Button onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSurveyViewQuestionIds([]);
              setQuestions((prev) => prev.map((q) => ({ ...q, responseKey: null, responseItems: null })));
            }}
            disabled={saving || loading}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Empty
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r bg-background overflow-y-auto flex-shrink-0 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Survey Questions</h2>
          {questions.map((q) => {
            const inView = surveyViewQuestionIds.includes(q.id);
            return (
              <div
                key={q.id}
                draggable
                onDragStart={() => setDragData({ type: "question", id: q.id })}
                onDragEnd={() => setDragData(null)}
                className={`p-2 rounded-md text-xs border transition-all cursor-grab hover:border-primary ${
                  inView ? "bg-muted/40 text-muted-foreground" : "bg-background"
                }`}
              >
                <div className="flex items-start gap-1.5">
                  <GripVertical className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <span>{q.text || "(empty)"}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {inView && <Badge variant="outline" className="text-[10px] h-4">In survey view</Badge>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Survey View ({surveyViewQuestions.length} questions)</h2>
            <Card
              className="border-2 border-dashed"
              onDragOver={(e) => {
                if (dragData?.type === "question") e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropQuestionToSurveyView();
              }}
            >
              <CardContent className="py-5 text-center text-muted-foreground text-sm">
                First, drag a question then drop it here.
              </CardContent>
            </Card>

            {surveyViewQuestions.length === 0 ? (
              <Card className="border-2 border-dashed"><CardContent className="py-12 text-center text-muted-foreground">No questions in survey view yet.</CardContent></Card>
            ) : (
              surveyViewQuestions.map((q, idx) => {
                const items = parseItems(q.responseItems);
                return (
                  <Card
                    key={q.id}
                    onDragOver={(e) => {
                      if (dragData?.type === "response") e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnQuestion(q.id);
                    }}
                    className={dragData?.type === "response" ? "border-dashed border-primary/40" : undefined}
                  >
                    <CardContent className="pt-5 pb-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{idx + 1}</span>
                          <div className="flex-1 space-y-2">
                            <p className="font-medium text-sm">{q.text}</p>
                            {q.responseKey ? (
                              <>
                                <Badge variant="outline" className="text-xs">{q.responseKey}</Badge>
                                <div className="text-xs text-muted-foreground">items length: {items.length}</div>
                                <div className="flex flex-wrap gap-1">
                                  {items.map((it) => <span key={`${it.id}-${it.name}`} className="px-2 py-0.5 text-xs rounded-full border bg-muted/50">{it.name}</span>)}
                                </div>
                              </>
                            ) : (
                              <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                                Then, drag a response and drop it on this question.
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => clearResponse(q.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeFromSurveyView(q.id)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="w-80 border-l bg-background overflow-y-auto flex-shrink-0 p-4">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Response Items</h2>
          <div className="space-y-2">
            {responses.map((r) => {
              const key = r.key || `response-${r.id}`;
              const items = parseItems(r.items);
              const labels = items.map((x) => x.name).slice(0, 5);
              return (
                <div
                  key={r.id}
                  draggable
                  onDragStart={() => setDragData({ type: "response", id: key })}
                  onDragEnd={() => setDragData(null)}
                  className="p-3 rounded-md border bg-background hover:border-primary transition-all cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{key}</span>
                    <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                  </div>
                  <div className="ml-5 text-xs text-muted-foreground break-all">types: {Array.from(new Set(items.map((x) => x.type))).join(", ") || "-"}</div>
                  <div className="ml-5 mt-1 flex flex-wrap gap-1">
                    {labels.map((label, i) => <span key={`${label}-${i}`} className="px-1.5 py-0.5 rounded border bg-muted/50 text-[10px]">{label}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Drag a response item, then drop it onto a question in survey view.</p>
        </div>
      </div>
    </div>
  );
};

export default SurveyBuilder;
