import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import type { EducationRecord } from "@/models/education.model";
import type { EducationPageRow, LangDocument } from "@/types/education-page";

const LANG_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

function emptyLangStrings(): Record<string, string> {
  return LANG_CODES.reduce((acc, code) => ({ ...acc, [code]: "" }), {} as Record<string, string>);
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace("T", " ");
  return String(v);
}

function langDocFromPath(pathVal: string | null | undefined): LangDocument | undefined {
  const p = pathVal?.trim();
  if (!p) return undefined;
  const base = p.split("/").pop() || p;
  return { path: p, displayName: base, sizeLabel: "—" };
}

/** Map a DB row to the shape used by the Education admin view. */
export function educationsRowToPage(row: EducationRecord): EducationPageRow {
  const titles = emptyLangStrings();
  const descriptions = emptyLangStrings();
  const documents: Partial<Record<string, LangDocument>> = {};

  for (const code of LANG_CODES) {
    const tk = `title_${code}` as keyof EducationRecord;
    const dk = `desc_${code}` as keyof EducationRecord;
    const fk = `file_${code}` as keyof EducationRecord;
    titles[code] = toStr(row[tk]);
    descriptions[code] = toStr(row[dk]);
    const doc = langDocFromPath(row[fk] as string | null);
    if (doc) documents[code] = doc;
  }

  return {
    id: String(row.id),
    pageName: row.page?.trim() || "",
    title: titles,
    description: descriptions,
    documents,
    updatedAt: toStr(row.updatedAt),
  };
}

/** All stored document paths on a row (for unlink). */
export function collectEducationDocumentPaths(row: EducationRecord): string[] {
  const paths = new Set<string>();
  for (const code of LANG_CODES) {
    const fk = `file_${code}` as keyof EducationRecord;
    const v = row[fk];
    if (typeof v === "string" && v.trim()) paths.add(v.trim());
  }
  return [...paths];
}
