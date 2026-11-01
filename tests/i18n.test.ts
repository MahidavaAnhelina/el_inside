import assert from "node:assert/strict";
import { test } from "node:test";
import { dictionaries, isLocale, locales } from "../src/lib/i18n";
import { products } from "../src/lib/products";

test("all languages contain all messages and product descriptions", () => {
  for (const dictionary of Object.values(dictionaries)) {
    assert.deepEqual(
      Object.keys(dictionary).sort(),
      Object.keys(dictionaries.pl).sort(),
    );
    assert.ok(
      Object.values(dictionary).every((text) => text.trim().length > 0),
    );
    for (const product of products)
      for (const key of [
        product.id,
        product.alt,
        product.description,
        product.technique,
      ])
        assert.ok(dictionary[key]);
  }
});
test("locale routing accepts only supported URL prefixes", () => {
  for (const value of locales) assert.equal(isLocale(value), true);
  for (const value of ["", "be", "PL", "contact", "../en"])
    assert.equal(isLocale(value), false);
});
