import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for minimal Docker images
  output: "standalone",

  // Provider scrapers depend on libraries that may use dynamic require.
  // Keep them external so Node can require() them at runtime.
  serverExternalPackages: ["cheerio-without-node-native", "crypto-js", "ws"],
};

export default nextConfig;
