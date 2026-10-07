import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { inflateSync } from "node:zlib";

const SHOTS = "screenshots/m11";
const ADMIN = { "x-ciq-role": "admin" };
const OFFICER = { "x-ciq-role": "officer" };
const POLICY_FILE = "src/data/policy/documents/doc_access_control.md";

/**
 * M11 acceptance (MASTER 11): E2E 4-7 pass.
 *  4. upload a demo policy -> proposed obligations -> confirm some -> coverage
 *     updates and shows gaps;
 *  5. the suggested order appears, flags the differences and never changes a
 *     risk score;
 *  6. generate an audit pack, open the PDF, the head hash matches the audit
 *     record page;
 *  7. switching role hides the decision actions from an auditor, a
 *     keyboard-only run of Alerts opens a case, and 390px has no horizontal
 *     scroll anywhere in Tier 1.
 * Screens for the DESIGN 11 review land in screenshots/m11 (10.4).
 */

interface AlertRow {
  id: string;
  ruleId: string;
  status: string;
  summarySentence: string;
  subject: { id: string; name: string };
}

interface OpenedKey {
  ruleId: string;
  alertId?: string;
  id?: string;
  subjectId?: string;
}

interface CoverageItem {
  obligationId: string;
  status: string;
  reason: string;
}

async function reset(request: APIRequestContext): Promise<string[]> {
  const response = await request.post("/api/demo/reset", { headers: ADMIN, data: {} });
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { standingAlerts: string[] };
  return body.standingAlerts;
}

async function seed(request: APIRequestContext, id: string): Promise<{ opened: OpenedKey[] }> {
  const response = await request.post(`/api/demo/scenario/${id}`, { headers: ADMIN, data: {} });
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { matchesExpected: boolean; opened: OpenedKey[] };
  expect(body.matchesExpected, `${id} matches its expected outcome`).toBe(true);
  return { opened: body.opened };
}

async function alertsOf(request: APIRequestContext): Promise<AlertRow[]> {
  const response = await request.get("/api/alerts");
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { alerts: AlertRow[] };
  return body.alerts;
}

function pickAlert(alerts: AlertRow[], opened: OpenedKey[], ruleId: string): AlertRow {
  const byId = new Map(alerts.map((alert) => [alert.id, alert]));
  const rowsFor = (key: OpenedKey): AlertRow | undefined => {
    const id = key.alertId ?? key.id;
    return id ? byId.get(id) : undefined;
  };
  const open = (alert: AlertRow | undefined): alert is AlertRow =>
    alert !== undefined && alert.status === "open";
  const headline = opened.find((key) => key.ruleId === ruleId && open(rowsFor(key)));
  const pick = headline ? rowsFor(headline) : opened.map(rowsFor).find(open);
  expect(pick, `an open ${ruleId} alert exists`).toBeTruthy();
  if (!pick) throw new Error("unreachable");
  return pick;
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

async function warm(request: APIRequestContext, paths: string[]): Promise<void> {
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.ok(), `warm-up ${path} should succeed: ${await response.text()}`).toBe(true);
  }
}

async function coverageOf(request: APIRequestContext): Promise<{
  items: CoverageItem[];
  headline: string;
}> {
  const response = await request.get("/api/coverage");
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { items: CoverageItem[]; headline: string };
  return body;
}

async function expectNoScroll(page: Page, label: string): Promise<void> {
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(fits, `${label} has no horizontal scroll at 390px`).toBe(true);
}

/**
 * pdf-lib writes text into FlateDecode streams as hex strings, so inflate the
 * streams and decode the text back out to read what the document says.
 */
function pdfPlainText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const chunks = raw.match(/stream\r?\n[\s\S]*?\r?\nendstream/g) ?? [];
  const inflated = chunks
    .map((chunk) => {
      const body = chunk.replace(/^stream\r?\n/, "").replace(/\r?\nendstream$/, "");
      try {
        return inflateSync(Buffer.from(body, "latin1")).toString("latin1");
      } catch {
        return body;
      }
    })
    .join("\n");
  const hexText = (inflated.match(/<[0-9A-Fa-f]+>/g) ?? [])
    .map((hex) => {
      try {
        return Buffer.from(hex.slice(1, -1), "hex").toString("latin1");
      } catch {
        return "";
      }
    })
    .join("\n");
  return `${inflated}\n${hexText}`;
}

test("E2E 4 — upload a policy, confirm obligations, coverage updates and shows gaps", async ({
  page,
  request,
}) => {
  const errors = collectErrors(page);

  await reset(request);
  await warm(request, ["/obligations", "/policy-coverage", "/api/coverage", "/api/obligations"]);
  // Warm the POST route so the first upload never races Next dev's compile.
  const warmExtract = await request.post("/api/obligations/extract", {
    headers: OFFICER,
    data: { documentId: "doc_access_control" },
  });
  expect(warmExtract.ok(), await warmExtract.text()).toBe(true);
  await reset(request);

  const before = await coverageOf(request);

  /* ---------- Upload: the demo policy proposes obligations ---------- */

  await page.goto("/obligations");
  await page.getByLabel("Upload a policy file").setInputFiles(POLICY_FILE);
  await expect(page.locator("h2.ov-title")).toContainText(/Found in your policy: \d+ items/, {
    timeout: 20_000,
  });
  const foundText = (await page.locator("h2.ov-title").textContent()) ?? "";
  const found = Number(foundText.match(/\d+/)?.[0] ?? 0);
  expect(found, "the extract proposes at least one obligation").toBeGreaterThan(0);
  await expect(page.locator(".obl-item")).toHaveCount(found);
  await expect(page.locator(".obl-item .obl-kind").first()).toHaveText("Proposed");

  const quotes = await page.locator(".obl-item .obl-item-quote").allTextContents();
  expect(quotes).toHaveLength(found);
  for (const quote of quotes) expect(quote.trim().length).toBeGreaterThan(0);

  const afterUpload = await coverageOf(request);
  expect(
    afterUpload.items.length,
    "every proposal shows up in coverage straight away",
  ).toBeGreaterThan(before.items.length);
  const proposedIds = afterUpload.items
    .filter((item) => !before.items.some((prior) => prior.obligationId === item.obligationId))
    .map((item) => item.obligationId);
  expect(proposedIds.length).toBeGreaterThan(0);
  for (const id of proposedIds) {
    const item = afterUpload.items.find((candidate) => candidate.obligationId === id);
    expect(item?.reason, `proposal ${id} is waiting on a person`).toMatch(
      /^Awaiting confirmation/,
    );
  }

  /* ---------- Confirm some ---------- */

  const confirmCount = Math.min(2, found);
  for (let index = 0; index < confirmCount; index += 1) {
    const row = page.locator(".obl-item").nth(index);
    await row.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(row.locator(".obl-kind")).toHaveText("Confirmed");
    await expect(row.getByRole("status")).toContainText("Entry");
  }

  const afterConfirm = await coverageOf(request);
  const promoted = afterConfirm.items.filter((item) => {
    const prior = afterUpload.items.find(
      (candidate) => candidate.obligationId === item.obligationId,
    );
    return (
      prior !== undefined &&
      prior.reason.startsWith("Awaiting confirmation") &&
      !item.reason.startsWith("Awaiting confirmation")
    );
  });
  expect(
    promoted.length,
    "confirming moves the obligations out of the awaiting state in coverage",
  ).toBeGreaterThanOrEqual(confirmCount);

  /* ---------- Coverage updates and shows gaps ---------- */

  await page.goto("/policy-coverage");
  await expect(page.locator(".page-header-block .page-serif-headline")).toContainText(
    /of \d+ obligations are checked automatically/,
    { timeout: 20_000 },
  );
  const coverageHeadline = await page.locator(".page-header-block .page-serif-headline").textContent();
  expect(coverageHeadline).toMatch(/\d+ of \d+ obligations are checked automatically/);
  // §30.3 default is the grouped accordion; .cov-row is the list view's row.
  await page.getByRole("tab", { name: "Table List" }).click();
  await expect(page.locator(".cov-row")).not.toHaveCount(0);
  const gapRows = await page.locator(".cov-row").filter({ hasText: "No automated check" }).count();
  expect(gapRows, "the coverage list shows obligations with no automated check").toBeGreaterThan(
    0,
  );
  const confirmedQuote = quotes[0].trim();
  // 57 obligations paginate 25/page (§30.4) — search to reach the confirmed
  // one instead of assuming it is on page 1.
  await page.getByPlaceholder(/Search obligations/).fill(confirmedQuote);
  await expect(
    page.locator(".cov-row").filter({ hasText: confirmedQuote }),
    "the confirmed obligation is listed with its coverage status",
  ).toHaveCount(1);
  await page.getByPlaceholder(/Search obligations/).fill("");

  await page.screenshot({ path: `${SHOTS}/coverage-desktop.png`, fullPage: true });

  expect(errors, "no console errors").toEqual([]);
});

test("E2E 5 — the suggested order flags differences without changing scores", async ({
  page,
  request,
}) => {
  const errors = collectErrors(page);

  // The three standing T0 alerts are enough to reorder (a scenario wipes the
  // slate, 7.8, so it would leave a single row behind).
  await reset(request);
  await warm(request, ["/alerts", "/api/alerts", "/api/priority"]);

  const alertsBefore = await request.get("/api/alerts");
  expect(alertsBefore.ok()).toBe(true);
  const payloadBefore = await alertsBefore.json();

  await page.goto("/alerts");
  const rows = page.locator("a.alerts-row");
  await expect(rows.first()).toBeVisible();
  const scoreOrder = (await rows.evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")),
  )) as (string | null)[];
  expect(scoreOrder.length).toBeGreaterThan(1);
  await expect(page.locator(".moved")).toHaveCount(0);
  await expect(page.locator(".advice-note")).toHaveCount(0);

  /* ---------- Suggested order ---------- */

  await page.getByRole("button", { name: /Suggested order/ }).click();
  await expect(page.locator(".advice-note")).toContainText(
    "Suggested order is advice. Risk scores are calculated by rules and are not changed.",
    { timeout: 20_000 },
  );
  await expect(page.locator(".advice-note")).toContainText("AI-assisted");

  await expect(page.locator(".moved").first()).toBeVisible();
  const flags = await page.locator(".moved").allTextContents();
  expect(flags.length).toBeGreaterThan(0);
  for (const flag of flags) expect(["moved up", "moved down"]).toContain(flag.trim());
  await expect(page.locator(".row-why").first()).toContainText("Why: ");
  const why = await page.locator(".row-why").first().textContent();
  expect((why ?? "").replace("Why:", "").trim().length).toBeGreaterThan(0);

  const suggestedOrder = (await rows.evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")),
  )) as (string | null)[];
  expect(suggestedOrder.slice().sort()).toEqual(scoreOrder.slice().sort());
  expect(suggestedOrder, "the list really was reordered").not.toEqual(scoreOrder);

  /* ---------- Nothing on the server changed ---------- */

  const alertsAfter = await request.get("/api/alerts");
  expect(alertsAfter.ok()).toBe(true);
  expect(await alertsAfter.json(), "scores and statuses are untouched").toEqual(payloadBefore);

  await page.screenshot({ path: `${SHOTS}/alerts-suggested-desktop.png`, fullPage: true });

  expect(errors, "no console errors").toEqual([]);
});

test("E2E 6 — the audit pack PDF opens and its head hash matches the audit record", async ({
  page,
  request,
}) => {
  const errors = collectErrors(page);

  await reset(request);
  await warm(request, ["/reports", "/audit-record", "/api/ledger"]);
  const warmPack = await request.post(
    "/api/reports/audit-pack?from=2026-01-01&to=2026-03-01",
    { headers: OFFICER },
  );
  expect(warmPack.ok(), await warmPack.text()).toBe(true);
  await reset(request);

  /* ---------- The head hash the record prints right now ---------- */

  await page.goto("/audit-record");
  await expect(page.locator(".tl-item").first()).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Show technical details").check();
  const headOnRecord = await page.locator(".tl-head button").getAttribute("title");
  expect(headOnRecord, "the audit record prints a head hash").toMatch(/^[0-9a-f]{64}$/);

  /* ---------- Generate the pack ---------- */

  await page.goto("/reports");
  await expect(page.locator(".page-header-block .page-serif-headline")).not.toHaveText("", { timeout: 20_000 });
  await page.getByRole("button", { name: "Generate audit pack" }).click();
  const card = page.locator(".rp-card");
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card).toContainText("Audit pack generated");
  await expect(card).toContainText("Records verified at generation");
  await expect(card.locator(".rp-files li")).toHaveCount(3);

  await page.getByRole("button", { name: "Show technical details" }).click();
  const headOnCard = (await page.locator(".rp-hash").first().textContent()) ?? "";
  expect(headOnCard, "the card repeats the head hash").toBe(headOnRecord);
  const packHashOnCard = (await page.locator(".rp-hash").nth(1).textContent()) ?? "";
  expect(packHashOnCard).toMatch(/^[0-9a-f]{64}$/);

  /* ---------- Open the PDF ---------- */

  const pdfLink = page.getByRole("link", { name: /audit-pack-.*\.pdf/ });
  const href = await pdfLink.getAttribute("href");
  expect(href, "the PDF is offered as a data URL").toContain("data:application/pdf;base64,");
  const pdfBuffer = Buffer.from((href ?? "").split(",")[1] ?? "", "base64");
  expect(pdfBuffer.subarray(0, 4).toString("latin1"), "the file opens as a PDF").toBe("%PDF");
  expect(pdfBuffer.toString("latin1"), "the PDF is complete").toContain("%%EOF");
  const pdf = pdfPlainText(pdfBuffer);
  expect(pdf).toContain(`Head hash: ${headOnRecord}`);
  // Long lines wrap in the PDF, so the label and the hash are checked apart.
  expect(pdf).toContain("Pack hash (sha256 of this bundle):");
  expect(pdf).toContain(packHashOnCard);

  /* ---------- The record carries the same hash on the export entry ---------- */

  await page.goto("/audit-record");
  await expect(page.locator(".tl-item").first()).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Show technical details").check();
  const exportEntry = page
    .locator(".tl-item")
    .filter({ hasText: "Audit pack exported" })
    .last();
  await expect(exportEntry).toBeVisible();
  const exportedHead = await exportEntry
    .locator(".tl-tech span")
    .filter({ hasText: "Head at export" })
    .locator("button")
    .getAttribute("title");
  expect(exportedHead, "the export entry repeats the certified head hash").toBe(headOnRecord);

  await page.getByRole("button", { name: "Run tamper check" }).click();
  await expect(page.locator(".tamper-result")).toContainText("entries verified");
  await expect(page.locator(".tl-toolbar .tl-verified")).toHaveText("All entries verified");

  await page.screenshot({ path: `${SHOTS}/reports-desktop.png`, fullPage: true });

  expect(errors, "no console errors").toEqual([]);
});

test("E2E 7 — role switch hides the decision actions from an auditor", async ({
  page,
  request,
}) => {
  const errors = collectErrors(page);

  await reset(request);
  const { opened } = await seed(request, "structured-deposits");
  const alert = pickAlert(await alertsOf(request), opened, "AML-001");
  await warm(request, ["/settings", "/obligations", `/alerts/${alert.id}`]);

  /* ---------- Switch to auditor on Settings ---------- */

  await page.goto("/settings");
  await expect(page.locator(".page-header-block .page-serif-headline")).not.toHaveText("", { timeout: 20_000 });
  await page.locator('label.seg-opt:has(input[value="auditor"])').click();
  await expect(page.locator("html")).toHaveAttribute("data-role", "auditor");
  await expect(page.locator(".st-role .st-note")).toContainText("Reads everything");
  expect(
    await page.evaluate(() => localStorage.getItem("ciq-role")),
    "the choice persists",
  ).toBe("auditor");

  /* ---------- The case offers no decisions ---------- */

  await page.goto(`/alerts/${alert.id}`);
  await expect(page.locator(".page-serif-title")).toHaveText(alert.summarySentence, {
    timeout: 20_000,
  });
  await expect(page.locator(".wb-bar")).toContainText(
    "An auditor reads and verifies this case",
  );
  await expect(page.getByRole("button", { name: "File report" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dismiss alert" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Escalate to manager" })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/case-auditor-desktop.png`, fullPage: true });

  /* ---------- Obligations are read-only too ---------- */

  await page.goto("/obligations");
  await expect(page.locator(".page-note").filter({ hasText: "reading as an auditor" })).toBeVisible(
    { timeout: 20_000 },
  );
  await expect(page.getByLabel("Upload a policy file")).toHaveCount(0);

  /* ---------- Back to officer: the decisions return ---------- */

  await page.goto("/settings");
  await page.locator('label.seg-opt:has(input[value="officer"])').click();
  await expect(page.locator("html")).toHaveAttribute("data-role", "officer");
  await page.goto(`/alerts/${alert.id}`);
  await expect(page.getByRole("button", { name: "File report" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: "Dismiss alert" })).toBeVisible();

  expect(errors, "no console errors").toEqual([]);
});

test("E2E 7 — keyboard-only run of Alerts opens a case", async ({ page, request }) => {
  const errors = collectErrors(page);

  await reset(request);
  await warm(request, ["/alerts"]);

  await page.goto("/alerts");
  const rows = page.locator("a.alerts-row");
  await expect(rows.first()).toBeVisible({ timeout: 20_000 });

  let reached = false;
  for (let press = 0; press < 80 && !reached; press += 1) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() =>
      document.activeElement?.classList.contains("alerts-row") ?? false,
    );
  }
  expect(reached, "Tab reaches an alert row").toBe(true);

  // j/k move between rows (DESIGN 7); Enter opens the focused row.
  await page.keyboard.press("j");
  const focusedIndex = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a.alerts-row")).indexOf(
      document.activeElement as HTMLAnchorElement,
    ),
  );
  expect(focusedIndex).toBeGreaterThan(0);

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/alerts\/[^/]+$/);
  await expect(page.locator(".page-serif-title")).not.toHaveText("", { timeout: 20_000 });

  expect(errors, "no console errors").toEqual([]);
});

test("E2E 7 — no screen scrolls sideways at 390px", async ({ browser, request }) => {
  await reset(request);
  const { opened } = await seed(request, "structured-deposits");
  const alert = pickAlert(await alertsOf(request), opened, "AML-001");

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = collectErrors(page);

  const paths = [
    "/overview",
    "/alerts",
    `/alerts/${alert.id}`,
    "/policy-coverage",
    "/obligations",
    "/registers/people",
    "/registers/vendors",
    "/deadlines",
    "/evidence",
    "/rules",
    "/policies",
    "/reports",
    "/sources",
    "/responses",
    "/settings",
  ];

  for (const path of paths) {
    await page.goto(path);
    await settle(page);
    await expectNoScroll(page, path);
  }

  await page.goto("/reports");
  await settle(page);
  await page.screenshot({ path: `${SHOTS}/reports-mobile.png`, fullPage: true });

  await context.close();
  expect(errors, "no console errors on mobile").toEqual([]);
});

/** Wait until the page has finished loading its rows: the headline is real copy
 *  and the scroll height stops moving across a few frames. */
async function settle(page: Page): Promise<void> {
  await expect(page.locator("h1").first()).not.toHaveText("", { timeout: 20_000 });
  await expect(page.locator("h1").first()).not.toContainText(/Loading/i, { timeout: 20_000 });
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        let last = -1;
        let stable = 0;
        const tick = () => {
          const height = document.documentElement.scrollHeight;
          stable = height === last ? stable + 1 : 0;
          last = height;
          if (stable >= 4) resolve(true);
          else requestAnimationFrame(tick);
        };
        tick();
      }),
    { timeout: 20_000 },
  );
}

/** DESIGN 10.4 review shots: every M11 screen at both review sizes. */
const SHOT_PATHS: ReadonlyArray<readonly [string, string]> = [
  ["/overview", "overview"],
  ["/alerts", "alerts"],
  ["/policy-coverage", "coverage"],
  ["/obligations", "obligations"],
  ["/registers/people", "people"],
  ["/registers/vendors", "vendors"],
  ["/deadlines", "deadlines"],
  ["/evidence", "evidence"],
  ["/rules", "rules"],
  ["/policies", "policies"],
  ["/reports", "reports"],
  ["/sources", "sources"],
  ["/responses", "responses"],
  ["/settings", "settings"],
];

test("screenshots — every M11 screen at 1440x900 and 390x844", async ({ browser, request }) => {
  await reset(request);
  await warm(request, SHOT_PATHS.map(([path]) => path));

  const capture = async (viewport: { width: number; height: number }, suffix: string) => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = collectErrors(page);
    for (const [path, name] of SHOT_PATHS) {
      await page.goto(path);
      await settle(page);
      // Swap the viewport to the full scroll height so sticky bars land where
      // they sit in the flow (M9 captureFullPage).
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: viewport.width, height: Math.max(height, viewport.height) });
      await page.screenshot({ path: `${SHOTS}/${name}-${suffix}.png`, fullPage: true });
      await page.setViewportSize(viewport);
    }
    await context.close();
    expect(errors, `no console errors at ${suffix}`).toEqual([]);
  };

  await capture({ width: 1440, height: 900 }, "1440");
  await capture({ width: 390, height: 844 }, "390");
});
