"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { dictionaries, type Locale } from "@/lib/i18n";
import {
  filterProducts,
  type Category,
  type Subcategory,
  type Product,
} from "@/lib/products";
import { ProductFilters } from "./product-filters";
import { ProductPhoto } from "./product-photo";
import { Icon } from "./icon";

function PhotoViewer({
  product,
  locale,
  onClose,
}: {
  product: Product;
  locale: Locale;
  onClose: () => void;
}) {
  const t = dictionaries[locale];
  const [photo, setPhoto] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const move = (direction: number) =>
    setPhoto(
      (current) =>
        (current + direction + product.photos.length) % product.photos.length,
    );
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="photo-dialog"
      aria-labelledby="photo-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        }
      }}
    >
      <div className="photo-dialog-inner">
        <div className="photo-toolbar">
          <h2 id="photo-title">{t[product.id]}</h2>
          <button type="button" onClick={onClose} aria-label={t.closePhotos}>
            ×
          </button>
        </div>
        <div className="photo-stage">
          <Image
            unoptimized
            src={`/assets/${product.photos[photo]}`}
            alt={`${t[product.alt]} · ${photo + 1}`}
            width={1600}
            height={1600}
            loading="eager"
          />
          {product.photos.length > 1 && (
            <>
              <button
                type="button"
                className="photo-prev"
                onClick={() => move(-1)}
                aria-label={t.previousPhoto}
              >
                ←
              </button>
              <button
                type="button"
                className="photo-next"
                onClick={() => move(1)}
                aria-label={t.nextPhoto}
              >
                →
              </button>
            </>
          )}
        </div>
        <div className="photo-bottom">
          <span aria-live="polite">
            {t.photoCount}: {photo + 1} / {product.photos.length}
          </span>
          <Link
            className="button primary"
            href={`/${locale}/?piece=${product.id}#order`}
            onClick={onClose}
          >
            {t.askSimilar}
            <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </dialog>
  );
}
export function Gallery({ locale }: { locale: Locale }) {
  const t = dictionaries[locale];
  const [filter, setFilter] = useState<Category>("all");
  const [subcategory, setSubcategory] = useState<Subcategory>("all");
  const [opened, setOpened] = useState<Product | null>(null);
  const visible = filterProducts(filter, subcategory);
  return (
    <>
      <div className="filter-row gallery-filters">
        <ProductFilters
          t={t}
          category={filter}
          subcategory={subcategory}
          onChange={(category, subcategory) => {
            setFilter(category);
            setSubcategory(subcategory);
          }}
        />
        <span className="work-count" aria-live="polite">
          {t.count} {visible.length}
        </span>
      </div>
      <div className="full-gallery-grid">
        {visible.map((product) => (
          <article className="gallery-card" key={product.id}>
            <button
              type="button"
              className="gallery-cover"
              onClick={() => setOpened(product)}
              aria-label={`${t.openPhotos}: ${t[product.id]}`}
            >
              <ProductPhoto
                image={product.image}
                alt={t[product.alt]}
                sizes="(max-width: 540px) 100vw, (max-width: 800px) 45vw, 400px"
              />
              <span className="gallery-photo-count">
                {product.photos.length} · {t.photoCount}
              </span>
              <span className="gallery-zoom" aria-hidden="true">
                ↗
              </span>
            </button>
            <div className="product-meta">
              <span>
                {product.technique === "crochet"
                  ? t.galleryCrochet
                  : t.galleryKnitting}
              </span>
            </div>
            <h2>{t[product.id]}</h2>
            <Link
              className="text-link gallery-enquire"
              href={`/${locale}/?piece=${product.id}#order`}
            >
              {t.askSimilar}
              <Icon name="arrow" />
            </Link>
          </article>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="empty-category" role="status">
          {t.emptyCategory}
        </p>
      )}
      {opened && (
        <PhotoViewer
          key={opened.id}
          product={opened}
          locale={locale}
          onClose={() => setOpened(null)}
        />
      )}
    </>
  );
}
