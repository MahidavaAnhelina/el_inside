import pl from "./pl.json";
import en from "./en.json";
export const locales = ["pl", "en"] as const;
export type Locale = (typeof locales)[number];
export type Dictionary = typeof pl;
export const dictionaries: Record<Locale, Dictionary> = { pl, en };
export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}
