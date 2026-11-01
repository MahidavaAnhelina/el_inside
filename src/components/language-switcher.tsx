import Link from "next/link";
import { dictionaries, locales, type Locale } from "@/lib/i18n";
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  return (
    <nav className="language" aria-label={dictionaries[locale].languageLabel}>
      {locales.map((value) => (
        <Link
          key={value}
          href={`/${value}/`}
          hrefLang={value}
          lang={value}
          aria-current={value === locale ? "page" : undefined}
        >
          {value.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
