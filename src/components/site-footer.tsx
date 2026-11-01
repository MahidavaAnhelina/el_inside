import Image from "next/image";
import { dictionaries, type Locale } from "@/lib/i18n";
import { BrandName, BrandText } from "./brand-name";
export function SiteFooter({ locale }: { locale: Locale }) {
  const t = dictionaries[locale];
  return (
    <footer className="footer wrap">
      <div>
        <a
          className="brand brand-logo"
          href={`/${locale}/`}
          aria-label="El_Inside"
        >
          <Image
            src="/assets/logo.svg"
            width={64}
            height={72}
            alt=""
            loading="lazy"
          />
          <BrandName className="brand-name" />
        </a>
        <p>{t.footerText}</p>
      </div>
      <a
        href="https://www.pinterest.com/malashechka15/knittingcrocheting/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-link"
      >
        <span>{t.pinterest}</span>
        <svg aria-hidden="true">
          <use href="#arrow"></use>
        </svg>
      </a>
      <small>
        <BrandText>{t.footerDemo}</BrandText>
      </small>
    </footer>
  );
}
