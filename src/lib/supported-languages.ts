/**
 * Supported locales for multilingual admin content (labels + ISO country for flag emoji).
 */
export const SUPPORTED_LANGUAGES = [
  { code: "ar", label: "العربية", countryCode: "sa" },
  { code: "da", label: "Dansk", countryCode: "dk" },
  { code: "de", label: "Deutsch", countryCode: "de" },
  { code: "en", label: "English", countryCode: "us" },
  { code: "es", label: "Español", countryCode: "es" },
  { code: "fr", label: "Français", countryCode: "fr" },
  { code: "it", label: "Italiano", countryCode: "it" },
  { code: "ja", label: "日本語", countryCode: "jp" },
  { code: "ko", label: "한국어", countryCode: "kr" },
  { code: "nl", label: "Nederlands", countryCode: "nl" },
  { code: "pt", label: "Português", countryCode: "br" },
  { code: "ru", label: "Русский", countryCode: "ru" },
  { code: "tr", label: "Türkçe", countryCode: "tr" },
  { code: "zh", label: "中文", countryCode: "cn" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type SupportedLanguageCode = SupportedLanguage["code"];

/** Alias used across admin views */
export const LANGUAGES = SUPPORTED_LANGUAGES;

/** Arabic-only RTL mode (other supported languages stay LTR). */
export function isRtlLanguage(code: string): boolean {
  return String(code).toLowerCase() === "ar";
}

/** Regional-indicator flag emoji from a 2-letter ISO 3166-1 alpha-2 code (e.g. `us` → 🇺🇸). */
export function languageFlagEmoji(countryCode: string): string {
  const cc = countryCode.toUpperCase();
  if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) {
    return "\u{1F3F4}";
  }
  const base = 0x1f1e6;
  return String.fromCodePoint(base + cc.charCodeAt(0) - 65, base + cc.charCodeAt(1) - 65);
}
