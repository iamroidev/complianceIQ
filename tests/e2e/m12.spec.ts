import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SHOTS = "screenshots/m12";

/**
 * M12 acceptance (MASTER 12): the landing page at DESIGN §19 —
 *  - structure, honest counted facts and the §1.4 copy rules;
 *  - the hero tamper interaction and the ink band's tamper check;
 *  - a reduced-motion run (no GSAP, everything readable) plus the live toggle;
 *  - axe-core clean (Lighthouse a11y ≥ 95 is measured separately);
 *  - keyboard-only use and no sideways scroll at 390px;
 *  - review screenshots at 1440x900 and 390x844 (DESIGN §10.4).
 */

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location();
    if (location.url.includes("favicon")) return;
    errors.push(`${message.text()} (${location.url})`);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`);
  });
  return errors;
}

/** Wait until the scroll height stops moving: the pin spacer and the record
 *  fetch both change the page height shortly after load. */
async function settle(page: Page): Promise<void> {
  await expect(page.locator("h1")).toContainText("prove", { timeout: 20_000 });
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        let last = -1;
        let stable = 0;
        const tick = () => {
          const height = document.documentElement.scrollHeight;
          stable = height === last ? stable + 1 : 0;
          last = height;
          if (stable >= 6) resolve(true);
          else requestAnimationFrame(tick);
        };
        tick();
      }),
    { timeout: 30_000 },
  );
}

/** Scroll through the page so every `once` ScrollTrigger fires, then return to
 *  the top: full-page captures do not scroll, so reveals would stay hidden. */
async function revealAll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += 420) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 45));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);
}

async function numbers(text: string): Promise<number[]> {
  return (text.match(/\d+/g) ?? []).map(Number);
}

test("landing — sections, honest facts and §1.4 copy rules", async ({ page, request }) => {
  const errors = collectErrors(page);

  await expect((await request.get("/")).ok()).toBe(true);
  await page.goto("/");
  await settle(page);

  /* ---------- The ten sections of DESIGN §19 ---------- */

  await expect(page.locator("h1")).toContainText("Compliance decisions you can prove");
  for (const id of ["policies", "how", "checks", "record", "ai", "pack", "compare"]) {
    await expect(page.locator(`#${id}`), `#${id} exists`).toHaveCount(1);
  }
  await expect(page.locator(".lp-statement")).toHaveCount(3);
  await expect(page.locator(".lp-tile")).toHaveCount(6);
  await expect(page.locator(".lp-table tbody tr")).toHaveCount(4);
  await expect(page.locator(".lp-footer")).toContainText("Open live demo");
  await expect(page.locator(".lp-footer")).not.toContainText(
    "Final-year project at the University of Mines and Technology",
  );
  await expect(page.getByRole("button", { name: /Reduce motion/ })).toBeVisible();

  /* ---------- Honest, counted facts: the coverage sentence matches the API ---------- */

  const coverageResponse = await request.get("/api/coverage");
  expect(coverageResponse.ok()).toBe(true);
  const coverage = (await coverageResponse.json()) as { headline: string };
  const note = (await page.locator(".lp-coverage-note").textContent()) ?? "";
  expect(
    (await numbers(note)).slice(0, 2),
    "the landing repeats the live coverage numbers",
  ).toEqual((await numbers(coverage.headline)).slice(0, 2));

  const policiesResponse = await request.get("/api/policies");
  expect(policiesResponse.ok()).toBe(true);
  const policies = (await policiesResponse.json()) as { policies: unknown[] } | unknown[];
  const policyCount = Array.isArray(policies)
    ? policies.length
    : Array.isArray(policies.policies)
      ? policies.policies.length
      : -1;
  expect(policyCount, "the facts row states the real number of demo policies").toBeGreaterThan(0);
  // CountUp settles on the real value shortly after mount.
  await expect(page.locator(".lp-fact b").first()).toHaveText(String(policyCount), {
    timeout: 15_000,
  });
  const factValues = await page.locator(".lp-fact b").allTextContents();
  expect(factValues).toHaveLength(4);
  expect(await numbers(factValues[0]), "the first fact is the policy count").toEqual([
    policyCount,
  ]);
  for (const value of factValues) expect(Number(value.replace(/,/g, ""))).toBeGreaterThan(0);

  /* ---------- §1.4 honest-claims rules and the required lines ---------- */

  const body = await page.evaluate(() => document.body.innerText);
  const banned: RegExp[] = [
    /SEC 17a-4/i,
    /FINRA/i,
    /FinCEN/i,
    /immutable/i,
    /blockchain/i,
    /hash chain/i,
    /bank-grade/i,
    /guarantee/i,
    /certified/i,
    /EU AI Act/i,
    /100%/i,
    /\bleger\b/i,
    /\bledger\b/i,
    /demo connection/i,
  ];
  for (const pattern of banned) {
    expect(body.match(pattern), `copy avoids ${pattern}`).toBeNull();
  }
  await expect(page.locator(".lp-record-note")).toContainText(
    "Designed to support tamper-evident record keeping.",
  );
  await expect(page.locator(".lp-footnote")).toContainText(
    "Based on public product information; verify before relying on it.",
  );
  await expect(page.getByText("An auditor can re-verify it themselves.")).toBeVisible();

  /* ---------- Header nav lands on its section ---------- */

  await page.getByRole("link", { name: "What it checks", exact: true }).first().click();
  await expect(page).toHaveURL(/#checks$/);
  await page.waitForTimeout(900);
  const checksTop = await page
    .locator("#checks")
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(checksTop), "#checks scrolled into view").toBeLessThan(300);

  expect(errors, "no console errors").toEqual([]);
});

test("landing — hero tamper and the ink band's tamper check", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await settle(page);

  /* ---------- Hero: the sample chain tears and restores ---------- */

  const hero = page.locator(".lp-hero");
  const heroCaption = page.locator(".lp-tamper-caption");
  await expect(heroCaption).toHaveText("All 6 entries verified.");

  await hero.getByRole("button", { name: "Try changing a record" }).click();
  await expect(heroCaption).toHaveText(
    "Entry 3 was altered. 3 later entries can no longer be trusted.",
  );
  await expect(heroCaption).toHaveClass(/is-altered/);
  await expect(page.locator("#hero-chain")).toHaveAttribute("data-torn", "2");
  await expect(page.locator("#hero-chain .is-torn")).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/hero-torn.png` });

  await hero.getByRole("button", { name: "Restore" }).click();
  await expect(heroCaption).toHaveText("All 6 entries verified.");
  await expect(page.locator("#hero-chain .is-torn")).toHaveCount(0);

  /* ---------- Ink band: the real record verifies, then fails after tampering ---------- */

  const ink = page.locator("#record");
  const inkResult = ink.getByRole("status").filter({ hasText: /entries verified|was altered/ });
  await ink.scrollIntoViewIfNeeded();
  await expect(inkResult).toContainText(/All [\d,]+ entries verified/, { timeout: 30_000 });
  await expect(ink).toContainText("Designed to support tamper-evident record keeping.");

  await ink.getByRole("button", { name: "Try changing a record" }).click();
  await ink.getByRole("button", { name: "Run tamper check" }).click();
  await expect(inkResult).toContainText(/Entry \d+ was altered\./, { timeout: 30_000 });
  await expect(inkResult).toContainText("later entries can no longer be trusted.");
  await page.screenshot({ path: `${SHOTS}/record-altered.png` });

  await ink.getByRole("button", { name: "Restore" }).click();
  await expect(inkResult).toContainText(/All [\d,]+ entries verified/, { timeout: 30_000 });

  expect(errors, "no console errors").toEqual([]);
});

test("landing — reduced-motion run: no GSAP, everything readable, live toggle", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = collectErrors(page);

  await page.goto("/");
  await expect(page.locator("h1")).toContainText("prove", { timeout: 20_000 });
  await page.waitForTimeout(1200);

  expect(await page.locator("html").getAttribute("data-reduce-motion")).toBe("true");
  expect(await page.locator(".lp").getAttribute("data-motion")).toBeNull();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);

  const hidden = await page.locator("[data-reveal]").evaluateAll((elements) =>
    elements.filter((element) => window.getComputedStyle(element).opacity !== "1"),
  );
  expect(hidden, "no section is left hidden without GSAP").toEqual([]);

  await page.screenshot({ path: `${SHOTS}/reduced-motion.png`, fullPage: true });

  /* ---------- The footer toggle turns motion back on for this visit ---------- */

  await page.getByRole("button", { name: /Reduce motion/ }).click();
  await expect(page.locator(".lp")).toHaveAttribute("data-motion", "on", { timeout: 30_000 });
  await expect(page.locator(".pin-spacer")).toHaveCount(1, { timeout: 30_000 });
  expect(await page.locator("html").getAttribute("data-reduce-motion")).toBe("false");

  await context.close();
  expect(errors, "no console errors in the reduced run").toEqual([]);
});

test("landing — axe-core: no serious or critical violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("prove", { timeout: 20_000 });
  await page.waitForTimeout(800);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  const summary = results.violations
    .map((violation) => `${violation.impact}: ${violation.id} (${violation.nodes.length})`)
    .join("\n");
  expect(serious, `axe found no serious/critical issues:\n${summary}`).toEqual([]);
  // Minor/moderate issues are allowed only if they stay few and never grow.
  expect(results.violations.length, `axe violations:\n${summary}`).toBeLessThanOrEqual(2);
});

test("landing — keyboard-only run reaches the CTA and the how-it-works link", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("prove", { timeout: 20_000 });

  let ctaReached = false;
  for (let press = 0; press < 20 && !ctaReached; press += 1) {
    await page.keyboard.press("Tab");
    ctaReached = await page.evaluate(
      () => document.activeElement?.classList.contains("lp-btn") ?? false,
    );
  }
  expect(ctaReached, "Tab reaches the header CTA").toBe(true);
  const outline = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement;
    return window.getComputedStyle(active).outlineStyle;
  });
  expect(outline, "the focused control shows an outline").not.toBe("none");

  await page.goto("/");
  await expect(page.locator("h1")).toContainText("prove", { timeout: 20_000 });
  let secondaryReached = false;
  for (let press = 0; press < 24 && !secondaryReached; press += 1) {
    await page.keyboard.press("Tab");
    secondaryReached = await page.evaluate(
      () => document.activeElement?.getAttribute("href") === "#how",
    );
  }
  expect(secondaryReached, "Tab reaches 'See how it works'").toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#how$/);
  await page.waitForTimeout(900);
  const howTop = await page
    .locator("#how")
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(howTop), "#how scrolled into view").toBeLessThan(300);

  expect(errors, "no console errors").toEqual([]);
});

test("landing — no sideways scroll at 390px", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = collectErrors(page);

  await page.goto("/");
  await expect(page.locator("h1")).toContainText("prove", { timeout: 20_000 });
  await page.waitForTimeout(1500);

  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(fits, "the landing has no horizontal scroll at 390px").toBe(true);

  await context.close();
  expect(errors, "no console errors on mobile").toEqual([]);
});

test("screenshots — the landing at 1440x900 and 390x844", async ({ browser }) => {
  const capture = async (
    viewport: { width: number; height: number },
    suffix: string,
  ): Promise<void> => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = collectErrors(page);

    await page.goto("/");
    await settle(page);
    await revealAll(page);
    await page.screenshot({ path: `${SHOTS}/hero-${suffix}.png` });
    await page.screenshot({ path: `${SHOTS}/landing-${suffix}.png`, fullPage: true });

    if (suffix === "1440") {
      // The pinned step scene with the second step active, for the §19 review.
      // Instant jumps: scrollIntoViewIfNeeded races the pinned scene on dev.
      const jumpTo = async (selector: string): Promise<void> => {
        await page.evaluate((sel) => {
          document
            .querySelector(sel)
            ?.scrollIntoView({ behavior: "instant", block: "start" });
        }, selector);
        await page.waitForTimeout(400);
      };
      await jumpTo("#how");
      await page.waitForTimeout(700);
      await page.getByRole("button", { name: "2. Explain it" }).click();
      await page.waitForTimeout(900);
      await expect(page.locator(".how-step").nth(1)).toHaveClass(/is-on/);
      await page.screenshot({ path: `${SHOTS}/how-step2-1440.png` });

      await jumpTo("#record");
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${SHOTS}/record-1440.png` });
    }

    await context.close();
    expect(errors, `no console errors at ${suffix}`).toEqual([]);
  };

  await capture({ width: 1440, height: 900 }, "1440");
  await capture({ width: 390, height: 844 }, "390");
});
