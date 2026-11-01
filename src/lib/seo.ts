import type { Metadata, MetadataRoute } from "next";
import { dictionaries, locales, openGraphLocales, type Locale } from "./i18n";
import { isIndexableSite, siteUrl, type SiteEnvironment } from "./site";

type SeoEnvironment = SiteEnvironment & { GOOGLE_SITE_VERIFICATION?: string };

export function languageUrls(
  env: SiteEnvironment = process.env,
  page: "" | "gallery/" = "",
) {
  const base = siteUrl(env);
  return {
    ...Object.fromEntries(
      locales.map((locale) => [
        locale,
        new URL(`/${locale}/${page}`, base).href,
      ]),
    ),
    "x-default": new URL(`/pl/${page}`, base).href,
  } as Record<Locale | "x-default", string>;
}

export function pageMetadata(
  locale: Locale,
  env: SeoEnvironment = process.env,
  page: "" | "gallery/" = "",
): Metadata {
  const t = dictionaries[locale];
  const base = siteUrl(env);
  const indexable = isIndexableSite(env);
  const title = page ? t.galleryPageTitle : t.pageTitle;
  const description = page ? t.galleryPageDescription : t.pageDescription;
  const image = {
    url: new URL(`/${locale}/share-image/`, base).href,
    width: 1200,
    height: 630,
    alt: t.pageTitle,
  };
  return {
    metadataBase: base,
    title,
    description,
    applicationName: "El_Inside",
    alternates: {
      canonical: new URL(`/${locale}/${page}`, base).href,
      languages: languageUrls(env, page),
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: { "max-image-preview": "large" },
        }
      : { index: false, follow: false },
    verification: env.GOOGLE_SITE_VERIFICATION
      ? { google: env.GOOGLE_SITE_VERIFICATION }
      : undefined,
    openGraph: {
      title,
      description,
      url: new URL(`/${locale}/${page}`, base).href,
      siteName: "El_Inside",
      locale: openGraphLocales[locale],
      alternateLocale: locales
        .filter((value) => value !== locale)
        .map((value) => openGraphLocales[value]),
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    icons: { icon: "/assets/logo.svg" },
  };
}

export function siteSitemap(
  env: SiteEnvironment = process.env,
): MetadataRoute.Sitemap {
  if (!isIndexableSite(env)) return [];
  return (["", "gallery/"] as const).flatMap((page) =>
    locales.map((locale) => ({
      url: new URL(`/${locale}/${page}`, siteUrl(env)).href,
      alternates: { languages: languageUrls(env, page) },
    })),
  );
}

export function siteRobots(
  env: SiteEnvironment = process.env,
): MetadataRoute.Robots {
  // Allow crawling of preview pages so their noindex metadata can be read.
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    ...(isIndexableSite(env)
      ? { sitemap: new URL("/sitemap.xml", siteUrl(env)).href }
      : {}),
  };
}

export function siteStructuredData(
  locale: Locale,
  env: SiteEnvironment = process.env,
) {
  const base = siteUrl(env);
  const t = dictionaries[locale];
  const websiteId = new URL("/#website", base).href;
  const studioId = new URL("/#studio", base).href;
  const pageUrl = new URL(`/${locale}/`, base).href;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": studioId,
        name: "El_Inside",
        url: base.href,
        logo: new URL("/assets/logo.svg", base).href,
        sameAs: ["https://www.pinterest.com/malashechka15/knittingcrocheting/"],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "El_Inside",
        url: base.href,
        inLanguage: [...locales],
        publisher: { "@id": studioId },
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: t.pageTitle,
        description: t.pageDescription,
        inLanguage: locale,
        isPartOf: { "@id": websiteId },
        about: { "@id": studioId },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: new URL("/assets/clothes.jpg", base).href,
        },
      },
    ],
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
