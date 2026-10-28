/**
 * Project-wide US date formatter (MM/DD/YYYY).
 */
export function formatUsDate(value: unknown, empty = "—"): string {
  if (value === null || value === undefined) return empty;

  let date: Date | null = null;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return empty;
    date = new Date(raw);
  } else if (typeof value === "number") {
    date = new Date(value);
  }

  if (!date || Number.isNaN(date.getTime())) return empty;
  return date.toLocaleDateString("en-US");
}
