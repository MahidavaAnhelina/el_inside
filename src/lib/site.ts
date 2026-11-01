export function siteUrl() {
  return new URL(process.env.SITE_URL || "http://localhost:3000");
}
