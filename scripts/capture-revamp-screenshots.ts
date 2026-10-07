import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

async function run() {
  const artifactDir = "C:\\Users\\richi\\.gemini\\antigravity-ide\\brain\\ed5bed8c-7711-4107-8928-3d99db48f1a8";
  const screenshotsDir = path.join(process.cwd(), "screenshots");

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  console.log("1. Capturing Deadlines @ 1440...");
  await page.goto("http://localhost:3000/deadlines", { waitUntil: "networkidle" });
  await page.locator(".wall-calendar-pad").waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  const deadlinesPath = path.join(screenshotsDir, "deadlines-1440.png");
  const deadlinesArtifact = path.join(artifactDir, "deadlines-1440.png");
  await page.screenshot({ path: deadlinesPath, fullPage: false });
  fs.copyFileSync(deadlinesPath, deadlinesArtifact);

  console.log("2. Capturing Policy Coverage @ 1440 (Grouped View)...");
  await page.goto("http://localhost:3000/policy-coverage", { waitUntil: "networkidle" });
  await page.locator(".coverage-status-cards-row").waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  const covGroupsPath = path.join(screenshotsDir, "policy-coverage-groups-1440.png");
  const covGroupsArtifact = path.join(artifactDir, "policy-coverage-groups-1440.png");
  await page.screenshot({ path: covGroupsPath, fullPage: false });
  fs.copyFileSync(covGroupsPath, covGroupsArtifact);

  console.log("3. Capturing Policy Coverage @ 1440 (Pinboard View)...");
  await page.click("button:has-text('Pinboard')");
  await page.locator(".coverage-pinboard-container").waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  const covPinboardPath = path.join(screenshotsDir, "policy-coverage-pinboard-1440.png");
  const covPinboardArtifact = path.join(artifactDir, "policy-coverage-pinboard-1440.png");
  await page.screenshot({ path: covPinboardPath, fullPage: false });
  fs.copyFileSync(covPinboardPath, covPinboardArtifact);

  console.log("4. Capturing Overview @ 1440 with Topbar chip & Guide...");
  await page.goto("http://localhost:3000/overview", { waitUntil: "networkidle" });
  await page.locator(".overview-briefing-grid").waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  const overviewPath = path.join(screenshotsDir, "overview-revamped-1440.png");
  const overviewArtifact = path.join(artifactDir, "overview-revamped-1440.png");
  await page.screenshot({ path: overviewPath, fullPage: false });
  fs.copyFileSync(overviewPath, overviewArtifact);

  console.log("5. Capturing Guided Tour Walkthrough...");
  await page.click(".topbar-tour-btn");
  await page.locator(".tour-paper-note").waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  const tourPath = path.join(screenshotsDir, "guided-tour-1440.png");
  const tourArtifact = path.join(artifactDir, "guided-tour-1440.png");
  await page.screenshot({ path: tourPath, fullPage: false });
  fs.copyFileSync(tourPath, tourArtifact);

  await browser.close();
  console.log("All screenshots captured and copied to artifacts directory successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
