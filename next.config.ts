import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  trailingSlash: true,
  async redirects() {
    return [{ source: "/", destination: "/pl/", permanent: false }];
  },
};
export default config;
