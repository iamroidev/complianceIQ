import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const SHOTS = "screenshots/m9";

/**
 * E2E 1 for one Tier 1 scenario (MASTER §11.1): structured deposits → alert →
 * case → explanation and policy notes → draft → File report → saved row →
 * audit record entries → tamper check passes. Screens are captured at
 * 1440x900 and 390x844 for the DESIGN §11 review (§10.4).
 */
async function seed(request: APIRequestContext) {
  const response = await request.post("/api/demo/scenario/structured-deposits", {
    headers: { "x-ciq-role": "admin" },
    data: {},
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { matchesExpected: boolean };
  expect(body.matchesExpected).toBe(true);
}

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

/**
 * Full-page capture that grows the viewport to the page height first, so the
 * sticky top bar and decision bar sit at their real positions instead of
 * floating over the middle of the stitched image (§10.4 critique).
 */
async function captureFullPage(page: Page, name: string): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("page has no viewport");
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: viewport.width, height: Math.max(height, viewport.height) });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  await page.setViewportSize(viewport);
}

test("E2E 1 — structured deposits: alert to case to filed report", async ({
  page,
  request,
  browser,
}) => {
  const errors = collectErrors(page);

  await seed(request);

  const alertsResponse = await request.get("/api/alerts");
  expect(alertsResponse.ok()).toBe(true);
  const alertsBody = (await alertsResponse.json()) as {
    alerts: Array<{ id: string; ruleId: string; status: string; summarySentence: string }>;
  };
  const alert = alertsBody.alerts.find(
    (candidate) => candidate.ruleId === "AML-001" && candidate.status === "open",
  );
  expect(alert, "the scenario opens an AML-001 alert").toBeTruthy();
  if (!alert) throw new Error("unreachable");

  // Warm the routes so the browser never races Next dev's first compile.
  for (const path of ["/alerts", `/alerts/${alert.id}`]) {
    const warm = await request.get(path);
    expect(warm.ok(), `warm-up ${path} should succeed: ${await warm.text()}`).toBe(true);
  }

  /* ---------- Alerts list ---------- */

  await page.goto("/alerts");
  expect(page.viewportSize()).toEqual({ width: 1440, height: 900 });
  await expect(page.locator(".page-serif-headline")).toContainText(/needs? attention/);
  const row = page.locator(`a.alerts-row[href="/alerts/${alert.id}"]`);
  await expect(row).toBeVisible();
  await expect(row).toContainText(alert.summarySentence);
  await expect(row).toContainText("AML-001");
  await captureFullPage(page, "alerts-desktop");

  // Suggested order: reorders without changing scores, shows the advice note.
  await page.getByRole("button", { name: /Suggested order/ }).click();
  await expect(page.locator(".advice-note")).toContainText("not changed");
  await page.getByRole("button", { name: "Score order" }).click();

  /* ---------- Case: summary ---------- */

  await row.click();
  await expect(page.locator(".page-serif-title")).toHaveText(alert.summarySentence);
  await expect(page.locator(".wb-visual")).toBeVisible();
  await expect(page.locator(".risk-level")).toContainText("risk");
  await expect(page.locator(".risk-score")).toContainText("Score");

  // The meta row is a plain line of facts, not a sentence (§10.4 critique).
  await expect(page.locator(".wb-meta")).not.toContainText("Rules calculated by rules");

  // Threshold chart: no two SVG labels may overlap (§10.4 critique).
  const overlappingLabels = await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll<SVGTextElement>(".vis-svg text"))
      .map((text) => text.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0);
    let hits = 0;
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
          hits += 1;
        }
      }
    }
    return hits;
  });
  expect(overlappingLabels, "chart labels must not overlap").toBe(0);

  // Explanation (auto-generated on first open) with source links.
  await expect(page.locator(".ai-tag").first()).toContainText("AI-assisted");
  await expect(page.locator(".prose-col p").first()).not.toHaveText("");
  await expect(page.locator(".prose-sources").first()).toContainText("Sources:");
  await captureFullPage(page, "case-summary-desktop");

  /* ---------- How it was triggered ---------- */

  await page.getByRole("tab", { name: "How it was triggered" }).click();
  await expect(page.locator(".fact-label").first()).toHaveText("What we looked for");
  await expect(page.locator(".fact-value").first()).not.toHaveText("");
  await page.getByRole("button", { name: "Show rule details" }).click();
  await expect(page.locator(".rule-details")).toContainText("AML-001");
  await page.getByRole("button", { name: "Hide rule details" }).click();

  /* ---------- Policy notes ---------- */

  await page.getByRole("tab", { name: "Policy" }).click();
  const firstNote = page.locator(".note").first();
  await expect(firstNote).toContainText("Why this applies");
  await expect(firstNote.locator(".note-summary")).not.toHaveText("");
  await expect(page.locator(".note .hl").first()).toBeVisible();
  await captureFullPage(page, "case-policy-desktop");

  /* ---------- Report draft ---------- */

  await page.getByRole("tab", { name: "Report draft" }).click();
  // The pipeline drafts on alert open (§7.2 step 7); prepare only if missing.
  const prepare = page.getByRole("button", { name: "Prepare report draft" });
  if (await prepare.isVisible().catch(() => false)) {
    await prepare.click();
  }
  await expect(page.getByText("Drafted by AI, review before filing")).toBeVisible();
  await expect(page.locator(".prose-col h2").first()).toBeVisible();
  await expect(page.locator(".note-margin .note").first()).toBeVisible();
  await captureFullPage(page, "case-draft-desktop");

  /* ---------- File report ---------- */

  await page.getByRole("button", { name: "File report" }).click();
  await expect(page.getByText("File a report for this case?")).toBeVisible();
  await page.getByRole("button", { name: "Confirm and file report" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved to audit record" })).toContainText(
    "Entry",
  );
  // A recorded decision closes the choice: the confirm prompt is gone.
  await expect(page.getByText("File a report for this case?")).not.toBeVisible();

  /* ---------- History ---------- */

  await page.getByRole("tab", { name: "History" }).click();
  await expect(
    page.locator(".tl-item").filter({ hasText: "Mara Osei filed this report" }),
  ).toBeVisible();
  await expect(page.locator(".tl-verified")).toContainText("verified");
  await page.getByLabel("Show technical details").check();
  await expect(page.locator(".tl-tech").last()).toContainText("Entry");
  await captureFullPage(page, "case-history-desktop");

  /* ---------- Tamper check from the top bar ---------- */

  await page.getByRole("button", { name: "Check now" }).click();
  await expect(page.locator(".records-text")).toContainText("entries verified");

  /* ---------- Saved row on the list ---------- */

  await page.getByRole("link", { name: "All alerts" }).click();
  await expect(row).toContainText("Report filed");

  /* ---------- Mobile captures (DESIGN §10.4: 390x844) ---------- */

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobile.newPage();
  const mobileErrors = collectErrors(mobilePage);

  await mobilePage.goto("/alerts");
  await expect(mobilePage.locator(".page-serif-headline")).toContainText("attention");

  // The 390px top bar must fit: no horizontal scroll; per §28 390 the top bar
  // is "title + verified dot only" (Check now is hidden at ≤768px), so the
  // records dot must be fully on screen and the area tabs keep a usable width
  // instead of collapsing to zero.
  const alertsNoScroll = await mobilePage.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(alertsNoScroll, "alerts list has no horizontal scroll at 390px").toBe(true);
  const recordsDotBox = await mobilePage.locator(".records-dot").boundingBox();
  expect(recordsDotBox, "the verified dot is rendered").not.toBeNull();
  expect((recordsDotBox?.x ?? 999) + (recordsDotBox?.width ?? 999)).toBeLessThanOrEqual(390);
  const tabsBox = await mobilePage.locator(".domain-tabs").boundingBox();
  expect(tabsBox, "area tabs are rendered").not.toBeNull();
  expect((tabsBox?.width ?? 0), "area tabs are not collapsed").toBeGreaterThan(40);
  // The closed row still states its status in the time column (§7).
  const mobileRow = mobilePage.locator(`a.alerts-row[href="/alerts/${alert.id}"]`);
  await expect(mobileRow).toContainText("Report filed");

  await captureFullPage(mobilePage, "alerts-mobile");

  await mobilePage.goto(`/alerts/${alert.id}`);
  await expect(mobilePage.locator(".page-serif-title")).toHaveText(alert.summarySentence);
  await expect(mobilePage.locator(".ai-tag").first()).toContainText("AI-assisted");
  await captureFullPage(mobilePage, "case-summary-mobile");

  const noHorizontalScroll = await mobilePage.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(noHorizontalScroll, "390px viewport has no horizontal scroll").toBe(true);

  await mobile.close();

  expect(errors, "no console errors").toEqual([]);
  expect(mobileErrors, "no console errors on mobile").toEqual([]);
});
