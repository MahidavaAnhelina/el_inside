import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { locales } from "@/lib/i18n";
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, new URL(`/${locale}/`, siteUrl()).href]),
  );
  return locales.map((locale) => ({
    url: languages[locale],
    alternates: { languages },
  }));
}
