import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Home } from "@/components/home";
import { dictionaries, isLocale, locales } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale];
  return {
    metadataBase: siteUrl(),
    title: t.pageTitle,
    description: t.pageDescription,
    alternates: {
      canonical: `/${locale}/`,
      languages: { pl: "/pl/", en: "/en/", "x-default": "/pl/" },
    },
    openGraph: {
      title: t.pageTitle,
      description: t.pageDescription,
      url: `/${locale}/`,
      siteName: "El_Inside",
      locale: locale === "pl" ? "pl_PL" : "en_GB",
      alternateLocale: locale === "pl" ? "en_GB" : "pl_PL",
      type: "website",
      images: [
        {
          url: "/assets/clothes.jpg",
          width: 736,
          height: 1308,
          alt: t.clothesAlt,
        },
      ],
    },
    icons: { icon: "/assets/logo.svg" },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <Home locale={locale} />;
}
