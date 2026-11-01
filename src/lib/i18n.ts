import pl from "./pl.json";
import en from "./en.json";
import ru from "./ru.json";
export const locales = ["pl", "en", "ru"] as const;
export type Locale = (typeof locales)[number];
export type Dictionary = typeof pl;
export const dictionaries: Record<Locale, Dictionary> = { pl, en, ru };
export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

export const openGraphLocales: Record<Locale, string> = {
  pl: "pl_PL",
  en: "en_GB",
  ru: "ru_RU",
};
