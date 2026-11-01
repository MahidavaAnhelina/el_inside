import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { products, featuredProductIds, isProductId } from "../src/lib/products";
import { orderSchema } from "../src/lib/order-schema";
import { emailText } from "../src/lib/order-delivery";
import { dictionaries, locales } from "../src/lib/i18n";

test("every gallery work can be selected for an enquiry in every language", () => {
  for (const product of products)
    for (const locale of locales) {
      const order = orderSchema.parse({
        locale,
        kind: "catalog",
        product: product.id,
        version: "same",
        name: "Test",
        email: "test@example.com",
        details: "",
        links: "",
        date: "",
        website: "",
        requestId: "cf9af5ab-41a2-4970-ae21-76050885f28b",
      });
      assert.ok(emailText(order).includes(dictionaries[locale][product.id]));
    }
  for (const value of ["unknown", "../secret", "", "FROG"])
    assert.equal(isProductId(value), false);
});
test("the homepage is a curated subset and every gallery image has a local thumbnail", () => {
  assert.equal(
    new Set(products.map((product) => product.id)).size,
    products.length,
  );
  assert.ok(featuredProductIds.length < products.length);
  for (const id of featuredProductIds) assert.equal(isProductId(id), true);
  for (const product of products) {
    assert.equal(product.image, product.photos[0]);
    for (const photo of product.photos) {
      assert.ok(existsSync(`public/assets/${photo}`), photo);
      assert.ok(
        existsSync(`public/assets/${photo.replace(".webp", "-thumb.webp")}`),
        photo,
      );
    }
  }
});
