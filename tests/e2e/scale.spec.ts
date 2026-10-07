import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test.describe("Scale & Fill Verification (§22, §28, §29)", () => {
  test.beforeAll(() => {
    const dir = path.join(process.cwd(), "screenshots");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  test("Overview measurements and screenshots at 1440x900 and 1920x1080 and 390x844", async ({
    page,
  }) => {
    // 1. Desktop 1440×900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/overview");
    await page.waitForLoadState("networkidle");
    // The briefing grid only renders when alerts exist; the all-clear state
    // (§28.6) swaps it for the tidy desk. Either way the desk panel is there.
    await page.locator(".overview-desk-panel").waitFor({ timeout: 10000 });

    const nav = page.locator(".app-nav");
    const topbar = page.locator(".topbar");
    const search = page.locator(".topbar-search input");
    const primaryBtn = page.locator(".btn-navy").first();
    const slips = page.locator(".slip-card");

    // Measure dimensions on 1440
    const navBox1440 = await nav.boundingBox();
    const topbarBox1440 = await topbar.boundingBox();
    const searchBox1440 = await search.boundingBox();
    const primaryBtnBox1440 = (await primaryBtn.isVisible())
      ? await primaryBtn.boundingBox()
      : null;

    console.log("=== Measured Dimensions @ 1440×900 ===");
    console.log(`Sidebar Width: ${navBox1440?.width}px (target: 248px)`);
    console.log(`Topbar Height: ${topbarBox1440?.height}px (target: 64px)`);
    console.log(`Search Input Height: ${searchBox1440?.height}px (target: 44px)`);
    if (primaryBtnBox1440) {
      console.log(`Primary Button Height: ${primaryBtnBox1440.height}px (target: 48px)`);
    }

    expect(navBox1440?.width).toBeCloseTo(248, 1);
    expect(topbarBox1440?.height).toBeCloseTo(64, 1);
    expect(searchBox1440?.height).toBeCloseTo(44, 1);
    if (primaryBtnBox1440) {
      expect(primaryBtnBox1440.height).toBeGreaterThanOrEqual(44);
    }

    // Capture 1440 screenshot
    await page.screenshot({ path: "screenshots/overview-1440.png", fullPage: true });

    // 2. Desktop 1920×1080
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(300);

    const rootFontSize1920 = await page.evaluate(() =>
      window.getComputedStyle(document.documentElement).fontSize,
    );
    const navBox1920 = await nav.boundingBox();
    const topbarBox1920 = await topbar.boundingBox();
    const searchBox1920 = await search.boundingBox();

    console.log("\n=== Measured Dimensions @ 1920×1080 ===");
    console.log(`Root Font Size: ${rootFontSize1920} (target: 19px per §22.1)`);
    console.log(`Sidebar Width: ${navBox1920?.width}px (target: 248px)`);
    console.log(`Topbar Height: ${topbarBox1920?.height}px (target: 64px)`);
    console.log(`Search Input Height: ${searchBox1920?.height}px (target: 44px)`);

    expect(rootFontSize1920).toBe("19px");
    expect(navBox1920?.width).toBeCloseTo(248, 1);
    expect(topbarBox1920?.height).toBeCloseTo(64, 1);

    // Capture 1920 screenshot
    await page.screenshot({ path: "screenshots/overview-1920.png", fullPage: true });

    // 3. Mobile 390×844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);

    const navVisibleMobile = await nav.isVisible();
    const mobileTabBar = page.locator(".mobile-tab-bar");
    const mobileTabBarVisible = await mobileTabBar.isVisible();

    console.log("\n=== Measured Behavior @ 390×844 (Mobile) ===");
    console.log(`Sidebar Hidden: ${!navVisibleMobile} (expected: true)`);
    console.log(`Bottom Tab Bar Visible: ${mobileTabBarVisible} (expected: true)`);

    expect(navVisibleMobile).toBe(false);
    expect(mobileTabBarVisible).toBe(true);

    // Capture 390 screenshot
    await page.screenshot({ path: "screenshots/overview-390.png", fullPage: true });
  });
});
