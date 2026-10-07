import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["@electric-sql/pglite"],
  webpack: (config) => {
    // Playwright writes screenshots, traces and reports into the repo while
    // `next dev` is running for the E2E suite (MASTER §11). Without this the
    // dev watcher picks those files up, triggers Fast Refresh full reloads
    // mid-test, and can leave corrupted dev manifests behind.
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/.next/**",
        "**/test-results/**",
        "**/playwright-report/**",
        "**/screenshots/**",
        "**/.playwright-mcp/**",
        "**/*.log",
        "**/*.tsbuildinfo",
      ],
    };
    return config;
  },
};

export default nextConfig;
