import { defineConfig, devices } from "@playwright/test";

const PORT = 3210;

/**
 * M9 E2E (MASTER §11.1) runs against its own dev server on port 3210 so it
 * never shares state with the server the owner is reviewing.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: `http://localhost:${PORT}`,
    navigationTimeout: 90_000,
    actionTimeout: 20_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // DESIGN §10.4: desktop captures are taken at 1440×900.
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
