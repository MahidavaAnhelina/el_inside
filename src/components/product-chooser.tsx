"use client";
import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import {
  filterProducts,
  type Category,
  type ProductId,
  type Subcategory,
} from "@/lib/products";
import { ProductFilters } from "./product-filters";
import { ProductPhoto } from "./product-photo";

export function ProductChooser({
  t,
  selected,
  onSelect,
  onClose,
}: {
  t: Dictionary;
  selected: ProductId | "";
  onSelect: (id: ProductId) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [category, setCategory] = useState<Category>("all");
  const [subcategory, setSubcategory] = useState<Subcategory>("all");
  const visible = filterProducts(category, subcategory);
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
      className="product-chooser"
      aria-labelledby="chooser-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="photo-toolbar">
        <h2 id="chooser-title">{t.chooseWorkTitle}</h2>
        <button type="button" onClick={onClose} aria-label={t.closeChooser}>
          ×
        </button>
      </div>
      <ProductFilters
        t={t}
        category={category}
        subcategory={subcategory}
        onChange={(category, subcategory) => {
          setCategory(category);
          setSubcategory(subcategory);
        }}
      />
      <div className="chooser-grid">
        {visible.map((product) => (
          <button
            key={product.id}
            type="button"
            className="chooser-product"
            aria-pressed={selected === product.id}
            onClick={() => {
              onSelect(product.id);
              onClose();
            }}
          >
            <ProductPhoto
              image={product.image}
              alt=""
              sizes="(max-width: 540px) 40vw, 220px"
            />
            <span>{t[product.id]}</span>
          </button>
        ))}
      </div>
      {visible.length === 0 && <p role="status">{t.emptyCategory}</p>}
    </dialog>
  );
}
