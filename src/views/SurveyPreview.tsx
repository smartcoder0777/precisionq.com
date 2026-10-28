"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ROUTES } from "@/routes";

type Mode = "preview" | "submit";

type PreviewQuestion = {
  quesId: number;
  text: string;
  responseId: number | null;
  responseKey: string | null;
  responseItems: string | null;
};

type PreviewData = {
  survey?: { id: number; name: string | null; desc: string | null };
  languageId?: number;
  questions: PreviewQuestion[];
};

type ResponseItem = { id: number; name: string; type: string; value: string };

function normalizeResponseType(type: string): string {
  if (type === "rate") return "star_rate";
  if (type === "num_rate") return "number_rate";
  return type;
}

function parseNumberRateMeta(raw: string): { worst: string; best: string } {
  if (!raw) return { worst: "Worst", best: "Best" };
  try {
    const parsed = JSON.parse(raw) as { worst?: unknown; best?: unknown };
    if (typeof parsed === "object" && parsed !== null) {
      return {
        worst: typeof parsed.worst === "string" && parsed.worst.trim() ? parsed.worst : "Worst",
        best: typeof parsed.best === "string" && parsed.best.trim() ? parsed.best : "Best",
      };
    }
  } catch {
    // fallback below
  }
  const [worst = "Worst", best = "Best"] = raw.split("||");
  return { worst: worst || "Worst", best: best || "Best" };
}

function extractNumberRateMax(label: string): number {
  const m = label.match(/\d+/);
  const n = m ? Number(m[0]) : 10;
  if (!Number.isFinite(n)) return 10;
  return Math.max(2, Math.min(100, n));
}

function parseItems(items: string | null): ResponseItem[] {
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
          type: normalizeResponseType(String(o.type ?? "")),
          value: String(o.value ?? ""),
        };
      });
  } catch {
    return [];
  }
}

const SurveyPreview = () => {
  const router = useRouter();
  const params = useParams<{ surveyId: string }>();
  const search = useSearchParams();
  const surveyId = Number(params?.surveyId);
  const mode = (search.get("mode") === "submit" ? "submit" : "preview") as Mode;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<PreviewData>({ questions: [] });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(API_ROUTES.surveyPreview(surveyId), { credentials: "include" });
        const json = (await res.json()) as {
          ok?: boolean;
          survey?: PreviewData["survey"];
          languageId?: number;
          questions?: PreviewQuestion[];
          message?: string;
        };
        if (!res.ok || json.ok === false) throw new Error(json.message || "Failed to load preview");
        setData({ survey: json.survey, languageId: json.languageId, questions: json.questions || [] });
      } catch (e) {
        toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to load", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    if (Number.isFinite(surveyId) && surveyId > 0) void run();
  }, [surveyId, toast]);

  const answeredCount = useMemo(
    () => data.questions.filter((q) => (answers[String(q.quesId)] || "").trim().length > 0).length,
    [answers, data.questions],
  );

  const setAnswer = (quesId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [String(quesId)]: value }));
  };

  const handleSubmit = async () => {
    if (mode !== "submit") return;
    const payloadAnswers = data.questions
      .map((q) => ({ quesId: q.quesId, response: (answers[String(q.quesId)] || "").trim() }))
      .filter((x) => x.response.length > 0);

    if (payloadAnswers.length === 0) {
      toast({ title: "Error", description: "Please answer at least one question.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(API_ROUTES.surveyPreview(surveyId), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageId: data.languageId, answers: payloadAnswers }),
      });
      const json = (await res.json()) as { ok?: boolean; count?: number; message?: string };
      if (!res.ok || json.ok === false) throw new Error(json.message || "Submit failed");
      toast({ title: "Submitted", description: `${json.count ?? payloadAnswers.length} feedback item(s) saved.` });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Submit failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (q: PreviewQuestion) => {
    const items = parseItems(q.responseItems);
    const answer = answers[String(q.quesId)] || "";

    if (items.length === 0) {
      return <Textarea value={answer} onChange={(e) => setAnswer(q.quesId, e.target.value)} rows={4} />;
    }

    const type = items[0]?.type;
    if (type === "text") {
      return <Textarea value={answer} onChange={(e) => setAnswer(q.quesId, e.target.value)} rows={4} placeholder="Type your answer" />;
    }

    if (type === "star_rate") {
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAnswer(q.quesId, String(n))}
              className="p-1 transition-colors"
              aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
            >
              <Star
                className={`h-8 w-8 ${
                  n <= Number(answer || "0")
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>
      );
    }

    if (type === "number_rate") {
      const meta = parseNumberRateMeta(items[0]?.value || "");
      const max = extractNumberRateMax(items[0]?.name || "");
      const visibleScale = Array.from({ length: max }, (_, i) => i + 1);
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{meta.worst}</span>
          <div className="flex flex-wrap items-center gap-1">
            {visibleScale.map((v) => (
              <Button
                key={v}
                type="button"
                variant={answer === String(v) ? "default" : "outline"}
                className="h-9 min-w-9 px-2"
                onClick={() => setAnswer(q.quesId, String(v))}
              >
                {v}
              </Button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">{meta.best}</span>
        </div>
      );
    }

    return (
      <RadioGroup value={answer} onValueChange={(v) => setAnswer(q.quesId, v)} className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Label key={`${q.quesId}-${it.id}`} className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${answer === it.value ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>
            <RadioGroupItem value={it.value} className="sr-only" />
            <span className="text-sm">{it.name}</span>
          </Label>
        ))}
      </RadioGroup>
    );
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b bg-background">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-lg font-semibold">Survey Preview</h1>
            <p className="text-sm text-muted-foreground">Preview and submit survey responses</p>
          </div>
          <Badge variant={mode === "preview" ? "outline" : "default"} className="ml-auto">{mode === "preview" ? "Preview Mode" : "Submit Mode"}</Badge>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <Card className="border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="text-2xl">{data.survey?.name || "Survey"}</CardTitle>
            <p className="text-muted-foreground mt-2">{data.survey?.desc || "Please answer the following questions."}</p>
          </CardHeader>
        </Card>

        {loading ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading survey...</CardContent></Card>
        ) : data.questions.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No survey questions configured.</CardContent></Card>
        ) : (
          data.questions.map((q, idx) => (
            <Card key={q.quesId}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{idx + 1}</span>
                  <div className="flex-1 space-y-4">
                    <p className="font-medium">{q.text}</p>
                    {renderQuestionInput(q)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Answered {answeredCount} / {data.questions.length}</p>
          {mode === "submit" ? (
            <Button size="lg" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Submit Survey
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SurveyPreview;
