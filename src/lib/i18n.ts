import pl from "./pl.json";
import en from "./en.json";
import ru from "./ru.json";
import be from "./be.json";
export const locales = ["pl", "be", "ru", "en"] as const;
export type Locale = (typeof locales)[number];
export type Dictionary = typeof pl;
export const dictionaries: Record<Locale, Dictionary> = { pl, en, ru, be };
export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

export const openGraphLocales: Record<Locale, string> = {
  pl: "pl_PL",
  en: "en_GB",
  ru: "ru_RU",
  be: "be_BY",
};
