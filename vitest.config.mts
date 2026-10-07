import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    // Playwright specs live in tests/e2e and run via `pnpm test:e2e`.
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
