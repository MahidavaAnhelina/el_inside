import Image from "next/image";
import { dictionaries, type Locale } from "@/lib/i18n";
import { BrandName } from "./brand-name";
import { LanguageSwitcher } from "./language-switcher";
export function SiteHeader({
  locale,
  page = "",
}: {
  locale: Locale;
  page?: "" | "gallery/";
}) {
  const t = dictionaries[locale];
  return (
    <header className="site-header">
      <div className="header wrap">
        <a
          className="brand brand-logo"
          href={`/${locale}/`}
          aria-label="El_Inside"
        >
          <Image src="/assets/logo.svg" width={64} height={72} alt="" preload />
          <BrandName className="brand-name" />
        </a>
        <nav aria-label="Menu">
          <a href={`/${locale}/gallery/`}>{t.navWorks}</a>
          <a href={`/${locale}/#about`}>{t.navAbout}</a>
          <a href={`/${locale}/#how`}>{t.navHow}</a>
        </nav>
        <div className="header-actions">
          <LanguageSwitcher locale={locale} page={page} />
          <a className="header-cta" href={`/${locale}/#order`}>
            <span>{t.navOrder}</span>
            <svg aria-hidden="true">
              <use href="#arrow"></use>
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
