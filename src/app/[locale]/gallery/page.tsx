import Link from "next/link";
import { notFound } from "next/navigation";
import { dictionaries, isLocale, locales } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { IconDefs } from "@/components/icon-defs";
import { Icon } from "@/components/icon";
import { WorkshopProvider } from "@/components/workshop-provider";
import { Gallery } from "@/components/gallery";
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return pageMetadata(locale, undefined, "gallery/");
}
export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale];
  return (
    <WorkshopProvider>
      <a href="#main" className="skip">
        {t.skip}
      </a>
      <SiteHeader locale={locale} page="gallery/" />
      <main id="main" className="gallery-page wrap">
        <header className="gallery-intro">
          <Link className="text-link" href={`/${locale}/`}>
            ← {t.backHome}
          </Link>
          <p className="gallery-eyebrow">{t.galleryEyebrow}</p>
          <h1>{t.galleryTitle}</h1>
          <p className="gallery-description">{t.galleryIntro}</p>
        </header>
        <Gallery locale={locale} />
        <p className="catalog-note">{t.catalogNote}</p>
        <section className="gallery-outro">
          <h2>{t.galleryEndTitle}</h2>
          <p>{t.galleryEndText}</p>
          <Link className="button primary" href={`/${locale}/#order`}>
            {t.navOrder}
            <Icon name="arrow" />
          </Link>
        </section>
      </main>
      <SiteFooter locale={locale} />
      <IconDefs />
    </WorkshopProvider>
  );
}
