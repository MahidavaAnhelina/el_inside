"use client";
import type { Dictionary } from "@/lib/i18n";
import {
  categorySubcategories,
  type Category,
  type Subcategory,
} from "@/lib/products";

export function ProductFilters({
  t,
  category,
  subcategory,
  onChange,
}: {
  t: Dictionary;
  category: Category;
  subcategory: Subcategory;
  onChange: (category: Category, subcategory: Subcategory) => void;
}) {
  const labels: Record<Subcategory, string> = {
    all: t.filterAll,
    newborns: t.filterNewborns,
    kids: t.filterKids,
    adults: t.filterAdults,
    pets: t.filterPets,
    bags: t.filterBags,
    keychains: t.filterKeychains,
    wardrobe: t.filterWardrobe,
  };
  return (
    <div className="category-filters">
      <div className="filters" role="group" aria-label={t.categories}>
        {(
          [
            ["all", t.filterAll],
            ["toys", t.filterToys],
            ["clothes", t.filterClothes],
            ["accessories", t.filterAccessories],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={category === value}
            onClick={() => onChange(value, "all")}
          >
            {label}
          </button>
        ))}
      </div>
      {categorySubcategories[category].length > 0 && (
        <div
          className="filters subcategory-filters"
          role="group"
          aria-label={t.subcategories}
        >
          {(["all", ...categorySubcategories[category]] as const).map(
            (value) => (
              <button
                key={value}
                type="button"
                aria-pressed={subcategory === value}
                onClick={() => onChange(category, value)}
              >
                {labels[value]}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
