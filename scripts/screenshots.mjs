// Captures review screenshots at 1440x900 and 390x844 (DESIGN.md §10.4).
// Usage: with the dev server running —
//   node scripts/screenshots.mjs /styleguide [/alerts ...]
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3100";
const routes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["/styleguide"];

const viewports = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

await mkdir("screenshots", { recursive: true });

const browser = await chromium.launch();
try {
  for (const route of routes) {
    const slug = route.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "home";
    for (const vp of viewports) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      });
      await page.goto(BASE + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      const file = `screenshots/${slug}-${vp.name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log(`saved ${file}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
