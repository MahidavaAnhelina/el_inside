"use client";
import Image from "next/image";
import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { products } from "@/lib/products";
import { useWorkshop } from "./workshop-provider";
import { Icon } from "./icon";
export function Catalog({ t }: { t: Dictionary }) {
  const [filter, setFilter] = useState("all");
  const { select } = useWorkshop();
  const visible = products.filter(
    (product) => filter === "all" || product.category === filter,
  );
  return (
    <section id="works" className="works wrap" aria-labelledby="works-title">
      <div className="section-heading">
        <div>
          <h2 id="works-title">{t.worksTitle}</h2>
          <p>{t.worksText}</p>
        </div>
        <a
          href="#order"
          className="text-link"
          onClick={() => select({ kind: "custom", product: "" })}
        >
          <span>{t.ownIdea}</span>
          <Icon name="arrow" />
        </a>
      </div>
      <div className="filter-row">
        <div className="filters" role="group" aria-label={t.categories}>
          {(
            [
              ["all", t.filterAll],
              ["toys", t.filterToys],
              ["clothes", t.filterClothes],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="work-count" aria-live="polite">
          {t.count} {visible.length}
        </span>
      </div>
      <div className="product-grid">
        {visible.map((product) => (
          <article className="product" key={product.id}>
            <a
              href="#order"
              className="product-image"
              onClick={() => select({ kind: "catalog", product: product.id })}
            >
              <Image
                src={`/assets/${product.image}`}
                alt={t[product.alt]}
                width={474}
                height={842}
                sizes="(max-width: 800px) 45vw, 300px"
              />
              <span className="image-action">
                <span>{t.askSimilar}</span>
                <Icon name="arrow" />
              </span>
            </a>
            <div className="product-meta">
              <span>{t[product.technique]}</span>
            </div>
            <h3>{t[product.id]}</h3>
            <p>{t[product.description]}</p>
          </article>
        ))}
      </div>
      <p className="catalog-note">{t.catalogNote}</p>
    </section>
  );
}
