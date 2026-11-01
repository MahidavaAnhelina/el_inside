import assert from "node:assert/strict";
import { test } from "node:test";
import { locales } from "../src/lib/i18n";
import { isIndexableSite, siteUrl } from "../src/lib/site";
import {
  languageUrls,
  pageMetadata,
  siteRobots,
  siteSitemap,
  siteStructuredData,
  serializeJsonLd,
} from "../src/lib/seo";

const production = {
  SITE_URL: "https://el-inside.vercel.app",
  VERCEL_ENV: "production",
};

test("production locale canonicals and reciprocal alternates agree with the sitemap", () => {
  const sitemap = siteSitemap(production);
  assert.equal(sitemap.length, 3);
  const titles = new Set();
  for (const locale of locales) {
    const metadata = pageMetadata(locale, production);
    const url = `${production.SITE_URL}/${locale}/`;
    assert.equal(metadata.alternates?.canonical, url);
    assert.deepEqual(metadata.alternates?.languages, languageUrls(production));
    assert.equal(metadata.alternates?.languages?.[locale], url);
    assert.equal(
      metadata.alternates?.languages?.["x-default"],
      `${production.SITE_URL}/pl/`,
    );
    const entry = sitemap.find((item) => item.url === url);
    assert.deepEqual(
      entry?.alternates?.languages,
      metadata.alternates?.languages,
    );
    assert.equal((metadata.robots as { index: boolean }).index, true);
    titles.add(metadata.title);
  }
  assert.equal(titles.size, 3);
  assert.equal(
    siteRobots(production).sitemap,
    `${production.SITE_URL}/sitemap.xml`,
  );
});

test("previews and local builds cannot advertise indexable copies", () => {
  for (const env of [
    { ...production, VERCEL_ENV: "preview" },
    { ...production, VERCEL_ENV: "development" },
    { NODE_ENV: "production", SITE_URL: "http://localhost:3000" },
    {},
  ]) {
    assert.equal(isIndexableSite(env), false);
    assert.equal(
      (pageMetadata("pl", env).robots as { index: boolean }).index,
      false,
    );
    assert.deepEqual(siteSitemap(env), []);
    assert.equal(siteRobots(env).sitemap, undefined);
  }
});

test("production cannot publish localhost, malformed or language-prefixed canonical URLs", () => {
  for (const SITE_URL of [
    undefined,
    "http://localhost:3000",
    "https://localhost",
    "https://el-inside.vercel.app/pl/",
    "https://example.com/?x=1",
    "https://name:pass@example.com",
    "ftp://example.com",
  ]) {
    assert.throws(() => siteUrl({ VERCEL_ENV: "production", SITE_URL }));
  }
  assert.equal(siteUrl(production).href, `${production.SITE_URL}/`);
});

test("verification is optional and schema describes only known studio and page facts", () => {
  assert.equal(pageMetadata("pl", production).verification, undefined);
  assert.deepEqual(
    pageMetadata("pl", {
      ...production,
      GOOGLE_SITE_VERIFICATION: "public-code",
    }).verification,
    { google: "public-code" },
  );
  for (const locale of locales) {
    const graph = siteStructuredData(locale, production)["@graph"];
    assert.deepEqual(
      graph.map((node) => node["@type"]),
      ["Organization", "WebSite", "WebPage"],
    );
    assert.equal(graph[2].url, `${production.SITE_URL}/${locale}/`);
    assert.equal(graph[2].inLanguage, locale);
    assert.ok(!JSON.stringify(graph).includes('"offers"'));
  }
  const hostile = { name: "</script><script>alert(1)</script>" };
  assert.ok(!serializeJsonLd(hostile).includes("<"));
  assert.deepEqual(JSON.parse(serializeJsonLd(hostile)), hostile);
});
