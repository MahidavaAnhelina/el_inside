export type SiteEnvironment = {
  SITE_URL?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

export function siteUrl(env: SiteEnvironment = process.env) {
  if (env.VERCEL_ENV === "production" && !env.SITE_URL)
    throw new Error(
      "Set SITE_URL to the permanent HTTPS site address before deploying.",
    );
  const url = new URL(env.SITE_URL || "http://localhost:3000");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "SITE_URL must be an HTTP(S) origin without credentials, path, query or fragment.",
    );
  if (
    env.VERCEL_ENV === "production" &&
    (url.protocol !== "https:" || isLocal(url))
  )
    throw new Error("Production SITE_URL must be a public HTTPS address.");
  return url;
}

function isLocal(url: URL) {
  return (
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.hostname.endsWith(".localhost")
  );
}

export function isIndexableSite(env: SiteEnvironment = process.env) {
  const url = siteUrl(env);
  const production = env.VERCEL_ENV
    ? env.VERCEL_ENV === "production"
    : env.NODE_ENV === "production";
  return production && url.protocol === "https:" && !isLocal(url);
}
