import { BrandName, BrandText } from "./brand-name";
import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import { dictionaries } from "@/lib/i18n";
import { WorkshopProvider } from "./workshop-provider";
import { Catalog } from "./catalog";
import { OrderForm } from "./order-form";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { products } from "@/lib/products";
import { ProductPhoto } from "./product-photo";
import { IconDefs } from "./icon-defs";

export function Home({ locale }: { locale: Locale }) {
  const t = dictionaries[locale];
  return (
    <WorkshopProvider>
      <a href="#main" className="skip">
        {t.skip}
      </a>

      <SiteHeader locale={locale} />
      <main id="main">
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">
              <span>{t.heroOne}</span>
              <em>{t.heroTwo}</em>
            </h1>
            <p>{t.heroText}</p>
            <a className="button primary" href="#about">
              <span>{t.heroCta}</span>
              <svg aria-hidden="true">
                <use href="#arrow"></use>
              </svg>
            </a>
            <div className="hero-note">
              <span className="thread-line" aria-hidden="true"></span>
              <span>{t.heroNote}</span>
            </div>
          </div>
          <div className="hero-photos">
            <figure className="main-photo">
              <Image
                sizes="(max-width: 540px) 70vw, (max-width: 800px) 45vw, 560px"
                src="/assets/clothes.jpg"
                width={736}
                height={1308}
                alt={t.clothesAlt}
                preload
              />
              <figcaption>
                <span>{t.photoNote}</span>
                <svg aria-hidden="true">
                  <use href="#heart"></use>
                </svg>
              </figcaption>
            </figure>
            <figure className="little-photo">
              <ProductPhoto
                image={products.find((product) => product.id === "frog")!.image}
                alt={t.frogAlt}
                sizes="200px"
              />
              <figcaption>{t.frogNote}</figcaption>
            </figure>
            <span className="photo-side">
              <BrandText>{t.photoSide}</BrandText>
            </span>
          </div>
        </section>
        <section
          id="about"
          className="about wrap"
          aria-labelledby="about-title"
        >
          <div className="about-photo">
            <Image
              sizes="(max-width: 540px) 100vw, 550px"
              src="/assets/clothes.jpg"
              alt={t.detailAlt}
              width={736}
              height={1308}
              loading="lazy"
            />
          </div>
          <div className="about-copy">
            <h2 id="about-title">
              <BrandText>{t.aboutTitle}</BrandText>
            </h2>
            <p className="about-lead">{t.aboutLead}</p>
            <p>
              <BrandText>{t.aboutText}</BrandText>
            </p>
            <p>{t.aboutStatus}</p>
            <BrandName className="signature" />
          </div>
        </section>
        <Catalog t={t} locale={locale} />
        <section id="how" className="how wrap" aria-labelledby="how-title">
          <h2 id="how-title">{t.howTitle}</h2>
          <ol>
            <li>
              <span className="step-number">1</span>
              <h3>{t.step1Title}</h3>
              <p>{t.step1Text}</p>
            </li>
            <li>
              <span className="step-number">2</span>
              <h3>{t.step2Title}</h3>
              <p>{t.step2Text}</p>
            </li>
            <li>
              <span className="step-number">3</span>
              <h3>{t.step3Title}</h3>
              <p>{t.step3Text}</p>
            </li>
          </ol>
        </section>
        <section id="faq" className="faq wrap">
          <h2>{t.faqTitle}</h2>
          <div>
            <details>
              <summary>{t.faq1q}</summary>
              <p>{t.faq1a}</p>
            </details>
            <details>
              <summary>{t.faq2q}</summary>
              <p>{t.faq2a}</p>
            </details>
            <details>
              <summary>{t.faq3q}</summary>
              <p>{t.faq3a}</p>
            </details>
            <details>
              <summary>{t.faq4q}</summary>
              <p>{t.faq4a}</p>
            </details>
          </div>
        </section>
        <section
          id="order"
          className="order-section"
          aria-labelledby="order-title"
        >
          <div className="order-layout wrap">
            <aside className="order-intro">
              <h2 id="order-title">
                <span>{t.orderTitle1}</span>
                <em>{t.orderTitle2}</em>
              </h2>
              <p>{t.orderText}</p>
              <p>{t.orderText2}</p>
              <div className="order-expect">
                <svg aria-hidden="true">
                  <use href="#thread"></use>
                </svg>
                <p>{t.orderNote}</p>
              </div>
              <a className="text-link" href="#faq">
                <span>{t.questions}</span>
                <svg aria-hidden="true">
                  <use href="#arrow"></use>
                </svg>
              </a>
            </aside>
            <OrderForm t={t} locale={locale} />
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
      <IconDefs />
    </WorkshopProvider>
  );
}
