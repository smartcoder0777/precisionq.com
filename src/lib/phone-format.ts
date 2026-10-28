/**
 * Canonical US phone format used across this project.
 */
export const US_PHONE_PATTERN = "+1 (xxx)-xxx-xxxx" as const;

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normalize any US-like input into `+1 (xxx)-xxx-xxxx`.
 * Returns null if input is empty/invalid.
 */
export function normalizeUsPhone(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  let digits = onlyDigits(raw);
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  return `+1 (${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Best-effort display formatting. If invalid, returns trimmed original.
 */
export function formatUsPhoneDisplay(value: unknown, empty = "—"): string {
  if (value === null || value === undefined) return empty;
  const raw = String(value).trim();
  if (!raw) return empty;
  return normalizeUsPhone(raw) ?? raw;
}
