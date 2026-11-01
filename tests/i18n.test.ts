import assert from "node:assert/strict";
import { test } from "node:test";
import { dictionaries, isLocale } from "../src/lib/i18n";
import { products } from "../src/lib/products";

test("both languages contain all messages and product descriptions", () => {
  assert.deepEqual(
    Object.keys(dictionaries.pl).sort(),
    Object.keys(dictionaries.en).sort(),
  );
  for (const dictionary of Object.values(dictionaries)) {
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
  for (const value of ["pl", "en"]) assert.equal(isLocale(value), true);
  for (const value of ["", "ru", "PL", "contact", "../en"])
    assert.equal(isLocale(value), false);
});
