// Captures §17 motion-lab evidence (DESIGN.md §21.3):
//   1. Frames at 0/25/50/75/100% of every timed demo  → screenshots/motion/<slug>-<pct>.png
//   2. A still for non-timed (interactive) demos        → screenshots/motion/<slug>-100.png
//   3. Reduced-motion runs (?motion=reduce)             → screenshots/motion/reduced-*.png
//   4. One short video of a full playthrough            → screenshots/motion/lab-playthrough.webm
// Usage: with the dev server running —  node scripts/motion-frames.mjs
import { chromium } from "@playwright/test";
import { mkdir, readdir, rename } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3100";
const OUT = "screenshots/motion";
const VIDEO_TMP = join(OUT, "_video-tmp");
const PCTS = [0, 25, 50, 75, 100];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

// ── 1 + 2: frames ──
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/styleguide/motion`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const demos = await page.$$eval("[data-ml-demo]", (els) =>
    els.map((el) => ({
      slug: el.getAttribute("data-ml-demo"),
      duration: Number(el.getAttribute("data-duration") || 0),
    })),
  );
  console.log(`capturing ${demos.length} demos`);

  const PAUSE = "* { animation-play-state: paused !important; }";

  for (const d of demos) {
    const card = page.locator(`[data-ml-demo="${d.slug}"]`);
    const btn = card.locator("[data-ml-replay]");
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);

    if (d.duration > 0) {
      for (const pct of PCTS) {
        const hold = await page.addStyleTag({ content: PAUSE });
        await btn.click();
        await hold.evaluate((el) => el.remove());
        await page.waitForTimeout((d.duration * pct) / 100);
        const freeze = await page.addStyleTag({ content: PAUSE });
        await page.waitForTimeout(25);
        const file = `${OUT}/${d.slug}-${pct}.png`;
        await card.screenshot({ path: file });
        console.log(`saved ${file}`);
        await freeze.evaluate((el) => el.remove());
        await page.waitForTimeout(60);
      }
    } else {
      await btn.click();
      await page.waitForTimeout(400);
      const file = `${OUT}/${d.slug}-100.png`;
      await card.screenshot({ path: file });
      console.log(`saved ${file}`);
    }
  }
  await page.close();
}

// ── 3: reduced-motion runs ──
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/styleguide/motion?motion=reduce`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.click("text=Play all");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/reduced-1440x900.png`, fullPage: true });
  console.log(`saved ${OUT}/reduced-1440x900.png`);

  const hero = page.locator('[data-ml-demo="landing-hero"]');
  await hero.scrollIntoViewIfNeeded();
  await hero.locator("[data-ml-replay]").click();
  await page.waitForTimeout(70);
  await hero.screenshot({ path: `${OUT}/reduced-hero-fade.png` });
  console.log(`saved ${OUT}/reduced-hero-fade.png`);
  await page.close();
}

// ── 4: playthrough video ──
{
  await mkdir(VIDEO_TMP, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_TMP, size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/styleguide/motion`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  const demos = await page.$$eval("[data-ml-demo][data-duration]", (els) =>
    els.map((el) => ({
      slug: el.getAttribute("data-ml-demo"),
      duration: Number(el.getAttribute("data-duration") || 0),
    })),
  );

  for (const d of demos) {
    const card = page.locator(`[data-ml-demo="${d.slug}"]`);
    await card.scrollIntoViewIfNeeded({ behavior: "smooth" });
    await page.waitForTimeout(150);
    await card.locator("[data-ml-replay]").click();
    await page.waitForTimeout(d.duration + 350);
  }

  await ctx.close();
  const files = await readdir(VIDEO_TMP);
  const webm = files.find((f) => f.endsWith(".webm"));
  if (webm) {
    await rename(join(VIDEO_TMP, webm), join(OUT, "lab-playthrough.webm"));
    console.log(`saved ${OUT}/lab-playthrough.webm`);
  }
}

await browser.close();
console.log("done");
