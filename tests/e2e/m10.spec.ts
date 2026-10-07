import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const SHOTS = "screenshots/m10";
const ADMIN = { "x-ciq-role": "admin" };
const OFFICER = { "x-ciq-role": "officer" };

/**
 * M10 acceptance (MASTER §11): E2E 1-3 pass for all Tier 1 scenarios.
 *  1. scenario → alert → case → explanation and policy notes → draft →
 *     File report → saved row → audit record entries → tamper check passes;
 *  2. simulate tampering → fails at the exact entry → Restore → passes;
 *  3. time travel: expire a certificate → alert appears → attach renewal →
 *     the alert auto-closes.
 * Screens for the DESIGN §11 review land in screenshots/m10 (§10.4).
 */

const SCENARIOS = [
  { id: "structured-deposits", ruleId: "AML-001" },
  { id: "payment-without-approver", ruleId: "FIN-001" },
  { id: "sod-breach", ruleId: "IAM-001" },
  { id: "restricted-record-access", ruleId: "HIPAA-001" },
  { id: "leaked-secret", ruleId: "DEV-001" },
  { id: "expired-certification", ruleId: "CERT-001" },
  { id: "missed-deadline", ruleId: "DEAD-001" },
  { id: "vendor-document-lapsed", ruleId: "VEND-001" },
] as const;

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

async function reset(request: APIRequestContext): Promise<string[]> {
  const response = await request.post("/api/demo/reset", { headers: ADMIN, data: {} });
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { standingAlerts: string[] };
  return body.standingAlerts;
}

async function alertsOf(request: APIRequestContext): Promise<AlertRow[]> {
  const response = await request.get("/api/alerts");
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { alerts: AlertRow[] };
  return body.alerts;
}

async function seed(
  request: APIRequestContext,
  id: string,
): Promise<{ opened: OpenedKey[] }> {
  const response = await request.post(`/api/demo/scenario/${id}`, {
    headers: ADMIN,
    data: {},
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { matchesExpected: boolean; opened: OpenedKey[] };
  expect(body.matchesExpected, `${id} matches its expected outcome`).toBe(true);
  return { opened: body.opened };
}

/**
 * The scenario's headline alert, by its id from the run's `opened` list —
 * scenarios rebuild state from a clean slate (§7.8), so id diffs against the
 * pre-run list are meaningless. Headline-rule entries first, then any open.
 */
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

async function captureFullPage(page: Page, name: string): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("page has no viewport");
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: viewport.width, height: Math.max(height, viewport.height) });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  await page.setViewportSize(viewport);
}

for (const scenario of SCENARIOS) {
  test(`E2E 1 — ${scenario.id}: alert to case to filed report`, async ({ page, request }) => {
    const errors = collectErrors(page);

    await reset(request);
    const { opened } = await seed(request, scenario.id);
    const alert = pickAlert(await alertsOf(request), opened, scenario.ruleId);

    // Warm the routes so the browser never races Next dev's first compile.
    for (const path of ["/alerts", `/alerts/${alert.id}`, "/audit-record"]) {
      const warm = await request.get(path);
      expect(warm.ok(), `warm-up ${path} should succeed: ${await warm.text()}`).toBe(true);
    }

    /* ---------- Alerts list ---------- */

    await page.goto("/alerts");
    const row = page.locator(`a.alerts-row[href="/alerts/${alert.id}"]`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(alert.summarySentence);

    /* ---------- Case: explanation and policy notes ---------- */

    await row.click();
    await expect(page.locator(".page-serif-title")).toHaveText(alert.summarySentence);
    await expect(page.locator(".ai-tag").first()).toContainText(
      /AI-assisted|Written from template/,
    );

    await page.getByRole("tab", { name: "Policy" }).click();
    const firstNote = page.locator(".note").first();
    await expect(firstNote).toBeVisible();
    await expect(firstNote).toContainText("Why this applies");

    /* ---------- Report draft (AI or template labelling) ---------- */

    await page.getByRole("tab", { name: "Report draft" }).click();
    const prepare = page.getByRole("button", { name: "Prepare report draft" });
    if (await prepare.isVisible().catch(() => false)) {
      await prepare.click();
    }
    await expect(
      page
        .locator(".prose-col p")
        .filter({ hasText: /^(Drafted by AI, review before filing|Written from template)$/ })
        .first(),
    ).toBeVisible();

    /* ---------- File report ---------- */

    await page.getByRole("button", { name: "File report" }).click();
    await page.getByRole("button", { name: "Confirm and file report" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved to audit record" })).toContainText(
      "Entry",
    );

    /* ---------- History ---------- */

    await page.getByRole("tab", { name: "History" }).click();
    await expect(
      page.locator(".tl-item").filter({ hasText: "Mara Osei filed this report" }),
    ).toBeVisible();
    await expect(page.locator(".tl-verified")).toContainText("verified");

    /* ---------- Audit record: tamper check passes ---------- */

    await page.goto("/audit-record");
    await page.getByRole("button", { name: "Run tamper check" }).click();
    await expect(page.locator(".tamper-result")).toContainText("entries verified");
    await expect(page.locator(".tl-item").first()).toBeVisible();

    if (scenario.id === "structured-deposits") {
      await captureFullPage(page, "audit-desktop");
    }

    expect(errors, "no console errors").toEqual([]);
  });
}

test("E2E 2 — simulate tampering fails at the entry; Restore passes", async ({
  page,
  request,
}) => {
  const errors = collectErrors(page);

  await reset(request);
  for (const path of ["/audit-record", "/api/ledger", "/api/alerts", "/api/evidence"]) {
    const warm = await request.get(path);
    expect(warm.ok(), `warm-up ${path} should succeed: ${await warm.text()}`).toBe(true);
  }

  await page.goto("/audit-record");
  await page.getByRole("button", { name: "Run tamper check" }).click();
  await expect(page.locator(".tamper-result")).toContainText("entries verified");
  await expect(page.locator(".tl-toolbar .tl-verified")).toHaveText("All entries verified");
  await captureFullPage(page, "audit-desktop");

  await expect(page.locator(".tl-head")).toBeHidden();
  await page.getByLabel("Show technical details").check();
  await expect(page.locator(".tl-head")).toBeVisible();
  await page.getByLabel("Show technical details").uncheck();
  await expect(page.locator(".tl-head")).toBeHidden();

  /* ---------- Demo panel ---------- */

  await page.getByRole("button", { name: "Demo scenarios" }).click();
  await expect(page.getByRole("heading", { name: "Demo scenarios" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run scenario: Structured deposits" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Move date forward by 30 days" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/demo-desktop.png` });

  /* ---------- Simulate: fails at the exact entry ---------- */

  await page.getByRole("button", { name: "Simulate tampering" }).click();
  await expect(page).toHaveURL(/\/audit-record/);
  await expect(page.locator(".tamper-result")).toContainText(/Entry \d+ was altered\./);
  await expect(page.locator(".tamper-result")).toContainText(
    "later entries can no longer be trusted",
  );
  await expect(page.locator(".tl-item.is-broken")).toHaveCount(1);
  expect(await page.locator(".tl-item.is-untrusted").count()).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();
  await expect(page.locator(".tl-toolbar .tl-verified")).toBeHidden();
  await captureFullPage(page, "tamper-failure-desktop");

  /* ---------- Restore: the real record passes again ---------- */

  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.locator(".tamper-result")).toContainText("entries verified");
  await expect(page.locator(".tl-item.is-broken")).toHaveCount(0);
  await expect(page.locator(".tl-item.is-untrusted")).toHaveCount(0);
  await expect(page.locator(".tl-toolbar .tl-verified")).toHaveText("All entries verified");

  expect(errors, "no console errors").toEqual([]);
});

test("E2E 3 — time travel expires a certificate; the renewal auto-closes it", async ({
  page,
  request,
}) => {
  const errors = collectErrors(page);

  // Warm the state-changing routes, then reset so the baseline is untouched.
  const warmAdvance = await request.post("/api/demo/advance-time", {
    headers: ADMIN,
    data: { days: 1 },
  });
  expect(warmAdvance.ok(), await warmAdvance.text()).toBe(true);
  const warmChecks = await request.post("/api/checks/run", { headers: OFFICER, data: {} });
  expect(warmChecks.ok(), await warmChecks.text()).toBe(true);
  const warmPatch = await request.patch("/api/registers/certifications", {
    headers: OFFICER,
    data: { upsert: [] },
  });
  expect(warmPatch.ok(), await warmPatch.text()).toBe(true);

  await reset(request);
  for (const path of ["/alerts", "/audit-record", "/api/alerts"]) {
    const warm = await request.get(path);
    expect(warm.ok(), `warm-up ${path} should succeed: ${await warm.text()}`).toBe(true);
  }

  /* ---------- Move date forward from the demo panel ---------- */

  await page.goto("/alerts");
  await page.getByRole("button", { name: "Demo scenarios" }).click();
  await expect(page.getByRole("heading", { name: "Demo scenarios" })).toBeVisible();
  await page.getByRole("button", { name: "Move date forward by 30 days" }).click();
  await expect(page.locator(".demo-status")).toContainText("Moved to");
  await expect(page.locator(".demo-status")).toContainText("certification expired");

  // Esc closes drawers (DESIGN §17.5).
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Demo scenarios" })).not.toBeVisible();

  const after = await alertsOf(request);
  const picked = after.find(
    (candidate) =>
      candidate.ruleId === "CERT-001" &&
      candidate.status === "open" &&
      candidate.subject.id === "p_ama",
  );
  expect(picked, "the jump expires Ama's certificate").toBeTruthy();
  if (!picked) throw new Error("unreachable");
  const alert = picked;

  /* ---------- Attach the renewal, then run checks ---------- */

  const patch = await request.patch("/api/registers/certifications", {
    headers: OFFICER,
    data: {
      upsert: [
        {
          id: "cert_ama_firstaid_renewal",
          personId: "p_ama",
          type: "First Aid",
          issuer: "St John Ambulance",
          issuedOn: "2026-03-31",
          expiresOn: "2027-03-31",
        },
      ],
    },
  });
  expect(patch.ok(), await patch.text()).toBe(true);

  const run = await request.post("/api/checks/run", { headers: OFFICER, data: {} });
  expect(run.ok(), await run.text()).toBe(true);
  const outcome = (await run.json()) as {
    resolved: Array<{ ruleId: string; subject?: { id: string } }>;
  };
  expect(
    outcome.resolved.some((entry) => entry.ruleId === "CERT-001" && entry.subject?.id === "p_ama"),
    "the renewed certificate auto-closes the alert",
  ).toBe(true);

  const caseResponse = await request.get(`/api/alerts/${alert.id}`);
  expect(caseResponse.ok()).toBe(true);
  const caseBody = (await caseResponse.json()) as { alert: { status: string } };
  expect(caseBody.alert.status).toBe("resolved");

  /* ---------- History shows the auto-close line with the evidence item ---------- */

  await page.goto(`/alerts/${alert.id}`);
  await expect(page.locator(".page-serif-title")).not.toHaveText("");
  await expect(page.locator(".wb-meta")).toContainText("Closed automatically");

  /* ---------- The date chart drops the close pair (expiry vs today)
       onto a second row so the labels never overlap ---------- */

  await expect(page.locator(".dt.is-staggered")).toHaveCount(1);
  await expect(page.locator(".dt-mark.is-low")).not.toHaveCount(0);
  const labelBoxes = await page.locator(".dt-mark .dt-label").evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }),
  );
  expect(labelBoxes.length).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < labelBoxes.length; i += 1) {
    for (let j = i + 1; j < labelBoxes.length; j += 1) {
      const a = labelBoxes[i];
      const b = labelBoxes[j];
      expect(
        a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
        `timeline labels ${i} and ${j} must not overlap`,
      ).toBe(false);
    }
  }

  await page.getByRole("tab", { name: "History" }).click();
  const autoClose = page.locator(".tl-item").filter({ hasText: "Closed automatically" });
  await expect(autoClose).toContainText("renewal attached");
  await expect(autoClose).toContainText("Condition cleared");
  await captureFullPage(page, "history-autoclose-desktop");

  expect(errors, "no console errors").toEqual([]);
});

test("walkthrough — a demo scenario opens the case tour", async ({ page, request }) => {
  const errors = collectErrors(page);

  await reset(request);
  for (const path of ["/alerts", "/api/alerts"]) {
    const warm = await request.get(path);
    expect(warm.ok(), `warm-up ${path} should succeed: ${await warm.text()}`).toBe(true);
  }

  await page.goto("/alerts");
  await page.getByRole("button", { name: "Demo scenarios" }).click();
  await expect(page.getByRole("heading", { name: "Demo scenarios" })).toBeVisible();
  await page.getByRole("button", { name: "Run scenario: Leaked secret" }).click();

  /* ---------- The tour: activity → rule → policy → saved record ---------- */

  await expect(page.locator(".walkthrough")).toBeVisible();
  await expect(page.locator(".walkthrough")).toContainText("What happened, in order");
  await expect(page.getByRole("tab", { name: "Activity" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await captureFullPage(page, "walkthrough-desktop");

  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("tab", { name: "How it was triggered" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".walkthrough")).toContainText("Why it fired");

  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("tab", { name: "Policy" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".walkthrough")).toContainText("exact policy wording");

  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("tab", { name: "History" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".walkthrough")).toContainText("audit record");

  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".walkthrough")).toHaveCount(0);

  expect(errors, "no console errors").toEqual([]);
});

test("screenshots — audit record and demo panel at 390x844", async ({ browser, request }) => {
  await reset(request);
  const warm = await request.get("/audit-record");
  expect(warm.ok()).toBe(true);

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = collectErrors(page);

  await page.goto("/audit-record");
  await page.getByRole("button", { name: "Run tamper check" }).click();
  await expect(page.locator(".tamper-result")).toContainText("entries verified");
  const noScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(noScroll, "audit record has no horizontal scroll at 390px").toBe(true);
  await captureFullPage(page, "audit-mobile");

  // The desktop sidebar is display:none at 390px — the demo drawer opens
  // from the mobile tab bar's "More" sheet.
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Demo scenarios" }).click();
  await expect(page.getByRole("heading", { name: "Demo scenarios" })).toBeVisible();
  const drawerNoScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(drawerNoScroll, "the demo drawer has no horizontal scroll at 390px").toBe(true);
  await page.screenshot({ path: `${SHOTS}/demo-mobile.png` });

  await context.close();
  expect(errors, "no console errors on mobile").toEqual([]);
});
