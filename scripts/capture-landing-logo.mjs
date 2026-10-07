import { chromium } from "@playwright/test";
import { copyFileSync, mkdirSync } from "node:fs";

const ARTIFACTS_DIR = "C:/Users/richi/.gemini/antigravity-ide/brain/ed5bed8c-7711-4107-8928-3d99db48f1a8";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // 1. Capture App Shell with new Logo & Sidebar
  console.log("Navigating to /overview...");
  await page.goto("http://localhost:3000/overview", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  mkdirSync("screenshots", { recursive: true });
  const overviewPath = "screenshots/app-logo-sidebar-1440.png";
  await page.screenshot({ path: overviewPath });
  console.log("Captured:", overviewPath);

  // 2. Capture Landing Page Header & Hero with new Logo
  console.log("Navigating to / (landing)...");
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const landingHeroPath = "screenshots/landing-header-hero-1440.png";
  await page.screenshot({ path: landingHeroPath });
  console.log("Captured:", landingHeroPath);

  // 3. Scroll to Illustrated Statements section
  console.log("Scrolling to #statements...");
  const statementsEl = page.locator("#statements");
  if (await statementsEl.count()) {
    await statementsEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const statementsPath = "screenshots/landing-statements-illustrated-1440.png";
    await page.screenshot({ path: statementsPath });
    console.log("Captured:", statementsPath);
  }

  // 4. Scroll to AI Human Gatekeeper section
  console.log("Scrolling to #ai...");
  const aiEl = page.locator("#ai");
  if (await aiEl.count()) {
    await aiEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const aiPath = "screenshots/landing-ai-gatekeeper-1440.png";
    await page.screenshot({ path: aiPath });
    console.log("Captured:", aiPath);
  }

  // 5. Scroll to Big Footer & Closing Dossier
  console.log("Scrolling to footer...");
  const footerEl = page.locator("footer.lp-big-footer");
  if (await footerEl.count()) {
    await footerEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const footerPath = "screenshots/landing-big-footer-1440.png";
    await page.screenshot({ path: footerPath });
    console.log("Captured:", footerPath);
  }

  // Copy screenshots to artifacts directory
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  for (const name of [
    "app-logo-sidebar-1440.png",
    "landing-header-hero-1440.png",
    "landing-statements-illustrated-1440.png",
    "landing-ai-gatekeeper-1440.png",
    "landing-big-footer-1440.png",
  ]) {
    try {
      copyFileSync(`screenshots/${name}`, `${ARTIFACTS_DIR}/${name}`);
      console.log(`Copied screenshots/${name} to artifacts`);
    } catch (e) {
      console.error(`Failed to copy ${name}`, e);
    }
  }

  await browser.close();
  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
