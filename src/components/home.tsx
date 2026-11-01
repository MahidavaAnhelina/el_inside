import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import { dictionaries } from "@/lib/i18n";
import { WorkshopProvider } from "./workshop-provider";
import { Catalog } from "./catalog";
import { OrderForm } from "./order-form";
import { LanguageSwitcher } from "./language-switcher";

export function Home({ locale }: { locale: Locale }) {
  const t = dictionaries[locale];
  return (
    <WorkshopProvider>
      <a href="#main" className="skip">
        {t.skip}
      </a>

      <header className="header wrap">
        <a className="brand brand-logo" href="#main" aria-label="El_Inside">
          <Image src="/assets/logo.svg" width={64} height={72} alt="" preload />
          <span className="brand-name">El_Inside</span>
        </a>
        <nav aria-label="Menu">
          <a href="#works">{t.navWorks}</a>
          <a href="#about">{t.navAbout}</a>
          <a href="#how">{t.navHow}</a>
        </nav>
        <div className="header-actions">
          <LanguageSwitcher locale={locale} />
          <a className="header-cta" href="#order">
            <span>{t.navOrder}</span>
            <svg aria-hidden="true">
              <use href="#arrow"></use>
            </svg>
          </a>
        </div>
      </header>
      <main id="main">
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">
              <span>{t.heroOne}</span>
              <em>{t.heroTwo}</em>
            </h1>
            <p>{t.heroText}</p>
            <a className="button primary" href="#works">
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
              <Image
                sizes="200px"
                src="/assets/frog.jpg"
                width={474}
                height={842}
                alt={t.frogAlt}
              />
              <figcaption>{t.frogNote}</figcaption>
            </figure>
            <span className="photo-side">{t.photoSide}</span>
          </div>
        </section>
        <div className="values wrap">
          <span>{t.value1}</span>
          <svg aria-hidden="true" className="value-mark" viewBox="0 0 24 24">
            <path d="M12 4v16M4 12h16M6 6l12 12M6 18 18 6"></path>
          </svg>
          <span>{t.value2}</span>
          <svg aria-hidden="true" className="value-mark" viewBox="0 0 24 24">
            <path d="M12 4v16M4 12h16M6 6l12 12M6 18 18 6"></path>
          </svg>
          <span>{t.value3}</span>
        </div>
        <Catalog t={t} />
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
            <h2 id="about-title">{t.aboutTitle}</h2>
            <p className="about-lead">{t.aboutLead}</p>
            <p>{t.aboutText}</p>
            <p>{t.aboutStatus}</p>
            <span className="signature">El_Inside</span>
          </div>
        </section>
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
      </main>
      <footer className="footer wrap">
        <div>
          <a className="brand brand-logo" href="#main" aria-label="El_Inside">
            <Image
              src="/assets/logo.svg"
              width={64}
              height={72}
              alt=""
              loading="lazy"
            />
            <span className="brand-name">El_Inside</span>
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
        <small>{t.footerDemo}</small>
      </footer>
      <svg
        className="svg-defs"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <symbol id="arrow" viewBox="0 0 24 24">
            <path d="M4 12h15m-6-6 6 6-6 6"></path>
          </symbol>
          <symbol id="heart" viewBox="0 0 24 24">
            <path d="M20 5c-3-3-7-1-8 2C11 4 7 2 4 5c-5 5 3 11 8 15 5-4 13-10 8-15Z"></path>
          </symbol>
          <symbol id="upload" viewBox="0 0 24 24">
            <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"></path>
          </symbol>
          <symbol id="info" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 11v6m0-10v1"></path>
          </symbol>
          <symbol id="check" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="m7 12 3 3 7-7"></path>
          </symbol>
          <symbol id="thread" viewBox="0 0 48 48">
            <circle cx="24" cy="23" r="16"></circle>
            <path d="M9 17c10 0 21 7 29 16M12 11c10 1 22 9 28 17M8 23c9 1 18 7 25 15M27 7C17 15 15 25 18 38M34 10C25 18 23 24 24 34M39 34c10 5 5 12-1 10"></path>
          </symbol>
        </defs>
      </svg>
    </WorkshopProvider>
  );
}
