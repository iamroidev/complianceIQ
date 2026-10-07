import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import * as alertsList from "@/app/api/alerts/route";
import * as alertDetail from "@/app/api/alerts/[id]/route";
import * as alertExplain from "@/app/api/alerts/[id]/explain/route";
import * as alertDraft from "@/app/api/alerts/[id]/draft/route";
import * as alertDecision from "@/app/api/alerts/[id]/decision/route";
import * as checksRun from "@/app/api/checks/run/route";
import * as eventsRoute from "@/app/api/events/route";
import * as registersKind from "@/app/api/registers/[kind]/route";
import * as obligationsRoute from "@/app/api/obligations/route";
import * as obligationsExtract from "@/app/api/obligations/extract/route";
import * as obligationsConfirm from "@/app/api/obligations/[id]/confirm/route";
import * as coverageRoute from "@/app/api/coverage/route";
import * as priorityRoute from "@/app/api/priority/route";
import * as evidenceRoute from "@/app/api/evidence/route";
import * as evidenceDetail from "@/app/api/evidence/[id]/route";
import * as ledgerRoute from "@/app/api/ledger/route";
import * as ledgerVerify from "@/app/api/ledger/verify/route";
import * as auditPackRoute from "@/app/api/reports/audit-pack/route";
import * as exportSar from "@/app/api/export/sar/[id]/route";
import * as demoScenario from "@/app/api/demo/scenario/[id]/route";
import * as demoAdvance from "@/app/api/demo/advance-time/route";
import * as demoReset from "@/app/api/demo/reset/route";
import * as responsesList from "@/app/api/responses/route";
import * as responsesDetail from "@/app/api/responses/[id]/route";
import { resetDemoState } from "@/app/api/_state";

function req(url: string, options: { method?: string; role?: string; body?: unknown } = {}) {
  const headers = new Headers();
  if (options.role) headers.set("x-ciq-role", options.role);
  if (options.body !== undefined) headers.set("content-type", "application/json");
  return new NextRequest(`http://localhost${url}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const kindCtx = (kind: string) => ({ params: Promise.resolve({ kind }) });
const POST = { method: "POST" } as const;
const HEX64 = /^[0-9a-f]{64}$/;

const COMMIT_EVENT = {
  id: "evt_commit_api",
  domain: "code",
  actor: { id: "p_owusu", name: "A. Owusu", role: "Developer" },
  action: "commit_code",
  resource: { type: "service", id: "svc-payments", label: "payments-api" },
  context: {
    scannedText: 'aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";',
  },
  timestamp: "2026-02-20T10:00:00.000Z",
  source: "git",
};

beforeEach(async () => {
  process.env.DATA_MODE = "memory";
  await resetDemoState();
});

describe("Tier 1 API (MASTER §4 routes, §8 roles)", () => {
  it("GET /api/alerts returns the three standing T0 alerts for every role", async () => {
    for (const role of ["officer", "auditor", "admin"] as const) {
      const res = await alertsList.GET(req("/api/alerts", { role }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.alerts.map((alert: { id: string }) => alert.id)).toEqual([
        "alrt_1",
        "alrt_3",
        "alrt_5",
      ]);
      expect(body.asOf).toBe("2026-03-01T09:00:00.000Z");
    }
  });

  it("404s an unknown alert and filters by status", async () => {
    const missing = await alertDetail.GET(req("/api/alerts/alrt_nope"), ctx("alrt_nope"));
    expect(missing.status).toBe(404);

    const open = await alertsList.GET(req("/api/alerts?status=open"));
    const body = await open.json();
    expect(body.alerts).toHaveLength(3);

    const dismissed = await alertsList.GET(req("/api/alerts?status=dismissed"));
    expect((await dismissed.json()).alerts).toEqual([]);
  });

  it("an auditor gets 403 on decisions while officer and admin may file (§8)", async () => {
    const denied = await alertDecision.POST(
      req("/api/alerts/alrt_1/decision", { ...POST, role: "auditor", body: { decision: "file" } }),
      ctx("alrt_1"),
    );
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({
      error: 'Role "auditor" may not perform this action.',
    });

    const filed = await alertDecision.POST(
      req("/api/alerts/alrt_1/decision", { ...POST, role: "officer", body: { decision: "file" } }),
      ctx("alrt_1"),
    );
    expect(filed.status).toBe(200);
    expect((await filed.json()).alert.status).toBe("filed");
  });

  it("zod rejects bad payloads with 400", async () => {
    const missingReason = await alertDecision.POST(
      req("/api/alerts/alrt_3/decision", { ...POST, body: { decision: "dismiss" } }),
      ctx("alrt_3"),
    );
    expect(missingReason.status).toBe(400);
    expect((await missingReason.json()).error).toContain("dismissal requires a reason");

    const badDecision = await alertDecision.POST(
      req("/api/alerts/alrt_3/decision", { ...POST, body: { decision: "teleport" } }),
      ctx("alrt_3"),
    );
    expect(badDecision.status).toBe(400);

    const badAdvance = await demoAdvance.POST(
      req("/api/demo/advance-time", { ...POST, role: "admin", body: { days: 0 } }),
    );
    expect(badAdvance.status).toBe(400);

    const badEvent = await eventsRoute.POST(
      req("/api/events", { ...POST, body: { event: { id: "" } } }),
    );
    expect(badEvent.status).toBe(400);

    const badBody = await eventsRoute.POST(
      req("/api/events", { ...POST, body: { event: null } }),
    );
    expect(badBody.status).toBe(400);
  });

  it("explain and draft generate once, then return the stored artefact", async () => {
    const first = await alertExplain.POST(req("/api/alerts/alrt_1/explain", POST), ctx("alrt_1"));
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.generated).toBe(true);
    expect(firstBody.explanation.generatedBy).toBe("fixture");
    expect(firstBody.explanation.paragraphs.length).toBeGreaterThan(0);

    const second = await alertExplain.POST(req("/api/alerts/alrt_1/explain", POST), ctx("alrt_1"));
    expect((await second.json()).generated).toBe(false);

    const draft = await alertDraft.POST(req("/api/alerts/alrt_1/draft", POST), ctx("alrt_1"));
    const draftBody = await draft.json();
    expect(draftBody.generated).toBe(true);
    expect(draftBody.draft.alertId).toBe("alrt_1");

    const detail = await alertDetail.GET(req("/api/alerts/alrt_1"), ctx("alrt_1"));
    const detailBody = await detail.json();
    expect(detailBody.alert.explanationId).toBe(firstBody.explanation.id);
    expect(detailBody.alert.draftId).toBe(draftBody.draft.id);
    expect(detailBody.explanation.id).toBe(firstBody.explanation.id);
    expect(detailBody.drafts.map((entry: { id: string }) => entry.id)).toEqual([draftBody.draft.id]);

    const ledger = await (await ledgerRoute.GET(req("/api/ledger"))).json();
    const draftBlocks = ledger.blocks.filter(
      (block: { eventType: string }) => block.eventType === "DRAFT_GENERATED",
    );
    expect(draftBlocks).toHaveLength(1);
    expect(draftBlocks[0].payload.draftId).toBe(draftBody.draft.id);
  });

  it("POST /api/events runs the pipeline; a replay reports duplicate", async () => {
    const first = await eventsRoute.POST(
      req("/api/events", { ...POST, body: { event: COMMIT_EVENT } }),
    );
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.duplicate).toBe(false);
    expect(firstBody.alerts).toHaveLength(1);
    expect(firstBody.responses[0].responseId).toBe("block-pipeline-on-secret");

    const replay = await eventsRoute.POST(
      req("/api/events", { ...POST, body: { event: COMMIT_EVENT } }),
    );
    expect((await replay.json()).duplicate).toBe(true);

    const denied = await eventsRoute.POST(
      req("/api/events", { ...POST, role: "auditor", body: { event: COMMIT_EVENT } }),
    );
    expect(denied.status).toBe(403);
  });

  it("POST /api/checks/run is officer/admin only and runs the checks", async () => {
    const denied = await checksRun.POST(req("/api/checks/run", { ...POST, role: "auditor" }));
    expect(denied.status).toBe(403);

    const res = await checksRun.POST(req("/api/checks/run", { ...POST, role: "officer" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkRun.rulesRun).toBe(3);
    expect(body.opened).toEqual([]);
    expect(body.resolved).toEqual([]);
  });

  it("registers are readable by all and writable by officer/admin only", async () => {
    const read = await registersKind.GET(req("/api/registers/people"), kindCtx("people"));
    const before = (await read.json()).rows;
    expect(before.length).toBeGreaterThan(0);

    const person = {
      id: "p_api_test",
      name: "API Test Person",
      role: "Analyst",
      department: "Operations",
      status: "active",
    };
    const denied = await registersKind.PATCH(
      req("/api/registers/people", { ...POST, role: "auditor", body: { upsert: [person] } }),
      kindCtx("people"),
    );
    expect(denied.status).toBe(403);

    const allowed = await registersKind.PATCH(
      req("/api/registers/people", { ...POST, role: "officer", body: { upsert: [person] } }),
      kindCtx("people"),
    );
    expect(allowed.status).toBe(200);
    const after = (await allowed.json()).rows;
    expect(after).toHaveLength(before.length + 1);
    expect(after.map((row: { id: string }) => row.id)).toContain("p_api_test");

    const badRow = await registersKind.PATCH(
      req("/api/registers/people", { ...POST, body: { upsert: [{ id: "p_bad" }] } }),
      kindCtx("people"),
    );
    expect(badRow.status).toBe(400);

    const unknownKind = await registersKind.GET(req("/api/registers/nonsense"), kindCtx("nonsense"));
    expect(unknownKind.status).toBe(404);
  });

  it("coverage reports a headline and gap suggestions", async () => {
    const res = await coverageRoute.GET(req("/api/coverage?suggest=true"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.headline).toMatch(/^\d+ of \d+ obligations are checked automatically\. \d+ have no check\.$/);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.some((item: { status: string }) => item.status === "gap")).toBe(true);
    expect(Array.isArray(body.suggestions)).toBe(true);
    expect(body.suggestions.length).toBeGreaterThan(0);
    expect(body.suggestions[0].generatedBy).toBeDefined();
  });

  it("priority suggests an order for every open alert", async () => {
    const res = await priorityRoute.GET(req("/api/priority"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerts).toHaveLength(3);
    expect(body.suggestion.order.map((entry: { alertId: string }) => entry.alertId).sort()).toEqual(
      ["alrt_1", "alrt_3", "alrt_5"],
    );
  });

  it("evidence and ledger are readable; verification passes and re-hashes content", async () => {
    const evidence = await (await evidenceRoute.GET(req("/api/evidence"))).json();
    expect(evidence.evidence.length).toBeGreaterThanOrEqual(3);
    const id = evidence.evidence[0].id;

    const detail = await evidenceDetail.GET(req(`/api/evidence/${id}`), ctx(id));
    expect(detail.status).toBe(200);
    const detailBody = await detail.json();
    expect(detailBody.verification.payloadMatches).toBe(true);
    expect(detailBody.verification.rederivedMatches).toBe(true);

    const missing = await evidenceDetail.GET(req("/api/evidence/ev_nope"), ctx("ev_nope"));
    expect(missing.status).toBe(404);

    const ledger = await (await ledgerRoute.GET(req("/api/ledger"))).json();
    expect(ledger.count).toBeGreaterThanOrEqual(7);
    expect(ledger.headHash).toMatch(HEX64);

    const verify = await (await ledgerVerify.GET(req("/api/ledger/verify"))).json();
    expect(verify.ok).toBe(true);
    expect(verify.chain.ok).toBe(true);
    expect(verify.headHash).toBe(ledger.headHash);
    expect(verify.evidence.every((row: { payloadMatches: boolean }) => row.payloadMatches)).toBe(true);
  });

  it("obligations list, extract and confirm with a ledger block", async () => {
    const list = await (await obligationsRoute.GET(req("/api/obligations"))).json();
    expect(list.obligations.length).toBeGreaterThan(0);

    const extractDenied = await obligationsExtract.POST(
      req("/api/obligations/extract", { ...POST, role: "auditor", body: { documentId: "doc_training_certification" } }),
    );
    expect(extractDenied.status).toBe(403);

    const extracted = await obligationsExtract.POST(
      req("/api/obligations/extract", { ...POST, body: { documentId: "doc_training_certification" } }),
    );
    expect(extracted.status).toBe(200);
    const extractBody = await extracted.json();
    expect(extractBody.documentId).toBe("doc_training_certification");
    expect(extractBody.obligations.length).toBeGreaterThan(0);
    expect(extractBody.obligations[0].quote.length).toBeGreaterThan(0);
    expect(extractBody.generatedBy).toBe("fixture");

    const unknownDoc = await obligationsExtract.POST(
      req("/api/obligations/extract", { ...POST, body: { documentId: "doc_missing" } }),
    );
    expect(unknownDoc.status).toBe(404);

    const confirm = await obligationsConfirm.POST(
      req("/api/obligations/ob_firstaid_renewal/confirm", {
        ...POST,
        role: "officer",
        body: { action: "confirm", patch: { dueOn: "2026-12-31" } },
      }),
      ctx("ob_firstaid_renewal"),
    );
    expect(confirm.status).toBe(200);
    const confirmBody = await confirm.json();
    expect(confirmBody.obligation.status).toBe("confirmed");
    expect(confirmBody.obligation.dueOn).toBe("2026-12-31");

    const ledger = await (await ledgerRoute.GET(req("/api/ledger"))).json();
    const confirmedBlocks = ledger.blocks.filter(
      (block: { eventType: string }) => block.eventType === "OBLIGATION_CONFIRMED",
    );
    expect(confirmedBlocks).toHaveLength(1);

    const auditorDenied = await obligationsConfirm.POST(
      req("/api/obligations/ob_firstaid_renewal/confirm", {
        ...POST,
        role: "auditor",
        body: { action: "confirm" },
      }),
      ctx("ob_firstaid_renewal"),
    );
    expect(auditorDenied.status).toBe(403);
  });

  it("audit pack export is allowed for every role and records the pack hash", async () => {
    const res = await auditPackRoute.POST(req("/api/reports/audit-pack", { ...POST, role: "auditor" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.packHash).toMatch(HEX64);
    expect(body.bundle.findings).toHaveLength(3);
    expect(body.bundle.verification.chainOk).toBe(true);
    expect(body.csv).toContain("contentHash");
    expect(Buffer.from(body.pdfBase64, "base64").subarray(0, 5).toString()).toBe("%PDF-");

    const ledger = await (await ledgerRoute.GET(req("/api/ledger"))).json();
    const packBlocks = ledger.blocks.filter(
      (block: { eventType: string }) => block.eventType === "AUDIT_PACK_EXPORTED",
    );
    expect(packBlocks).toHaveLength(1);
    expect(packBlocks[0].payload.packHash).toBe(body.packHash);

    const verify = await (await ledgerVerify.GET(req("/api/ledger/verify"))).json();
    expect(verify.ok).toBe(true);
  });

  it("SAR export renders the stored draft and stays read-only for auditors", async () => {
    const missingDraft = await exportSar.POST(
      req("/api/export/sar/alrt_1", { ...POST, role: "officer" }),
      ctx("alrt_1"),
    );
    expect(missingDraft.status).toBe(404);

    await alertDraft.POST(req("/api/alerts/alrt_1/draft", POST), ctx("alrt_1"));

    const denied = await exportSar.POST(
      req("/api/export/sar/alrt_1", { ...POST, role: "auditor" }),
      ctx("alrt_1"),
    );
    expect(denied.status).toBe(403);

    const res = await exportSar.POST(
      req("/api/export/sar/alrt_1", { ...POST, role: "officer" }),
      ctx("alrt_1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.xml).toContain("<sarDraft");
    expect(body.notice).toContain("not a filed report");
    expect(body.json.status).toBe("draft — not filed");
    expect(Buffer.from(body.pdfBase64, "base64").subarray(0, 5).toString()).toBe("%PDF-");

    // The export changed nothing on the ledger.
    const ledger = await (await ledgerRoute.GET(req("/api/ledger"))).json();
    expect(ledger.blocks.filter((block: { eventType: string }) => block.eventType === "AUDIT_PACK_EXPORTED")).toEqual([]);
  });

  it("demo controls are admin-only: advance time, run a scenario and its twin, reset", async () => {
    const officerDenied = await demoAdvance.POST(
      req("/api/demo/advance-time", { ...POST, role: "officer", body: { days: 15 } }),
    );
    expect(officerDenied.status).toBe(403);

    const advanced = await demoAdvance.POST(
      req("/api/demo/advance-time", { ...POST, role: "admin", body: { days: 15 } }),
    );
    expect(advanced.status).toBe(200);
    const advancedBody = await advanced.json();
    expect(advancedBody.asOf).toBe("2026-03-16T09:00:00.000Z");
    const openedKeys = advancedBody.opened.map(
      (alert: { ruleId: string; subject: { id: string } }) => `${alert.ruleId}:${alert.subject.id}`,
    );
    expect(openedKeys).toContain("CERT-001:p_ama");
    expect(openedKeys).toContain("VEND-001:v_cedar");

    await resetDemoState();
    const scenarioDenied = await demoScenario.POST(
      req("/api/demo/scenario/leaked-secret", { ...POST, role: "officer" }),
      ctx("leaked-secret"),
    );
    expect(scenarioDenied.status).toBe(403);

    const scenario = await demoScenario.POST(
      req("/api/demo/scenario/leaked-secret", { ...POST, role: "admin", body: {} }),
      ctx("leaked-secret"),
    );
    expect(scenario.status).toBe(200);
    const scenarioBody = await scenario.json();
    expect(scenarioBody.matchesExpected).toBe(true);
    expect(scenarioBody.twin).toBe(false);
    expect(scenarioBody.opened).toHaveLength(1);

    const twin = await demoScenario.POST(
      req("/api/demo/scenario/leaked-secret", { ...POST, role: "admin", body: { twin: true } }),
      ctx("leaked-secret"),
    );
    const twinBody = await twin.json();
    expect(twinBody.matchesExpected).toBe(true);
    expect(twinBody.twin).toBe(true);
    expect(twinBody.opened).toEqual([]);

    const unknownScenario = await demoScenario.POST(
      req("/api/demo/scenario/nope", { ...POST, role: "admin", body: {} }),
      ctx("nope"),
    );
    expect(unknownScenario.status).toBe(404);

    const resetDenied = await demoReset.POST(req("/api/demo/reset", { ...POST, role: "officer" }));
    expect(resetDenied.status).toBe(403);

    const reset = await demoReset.POST(req("/api/demo/reset", { ...POST, role: "admin" }));
    expect(reset.status).toBe(200);
    const resetBody = await reset.json();
    expect(resetBody.ok).toBe(true);
    expect(resetBody.standingAlerts).toEqual(["alrt_1", "alrt_3", "alrt_5"]);
  });

  it("an unknown x-ciq-role header falls back to officer", async () => {
    const res = await alertsList.GET(req("/api/alerts", { role: "wizard" }));
    expect(res.status).toBe(200);
    const denied = await alertDecision.POST(
      req("/api/alerts/alrt_1/decision", { ...POST, role: "wizard", body: { decision: "file" } }),
      ctx("alrt_1"),
    );
    expect(denied.status).toBe(200);
  });
});

const PATCH = { method: "PATCH" } as const;

describe("Responses (MASTER §7.9 modes, §8 admin-only)", () => {
  it("GET /api/responses returns the catalog in suggest mode for every role", async () => {
    for (const role of ["officer", "auditor", "admin"] as const) {
      const res = await responsesList.GET(req("/api/responses", { role }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.responses).toHaveLength(3);
      expect(body.live).toBe(false);
      expect(body.responses.every((row: { mode: string }) => row.mode === "suggest")).toBe(true);
      expect(body.responses.map((row: { id: string }) => row.id)).toEqual([
        "suspend-token-on-mfa-disabled",
        "block-pipeline-on-secret",
        "request-renewal-from-owner",
      ]);
      expect(body.responses[1].sentence).toBe(
        "If a secret is committed to a repository, block the pipeline until it is rotated.",
      );
      expect(body.responses[1].trigger).toBe("A commit contains a secret.");
    }
  });

  it("only an admin may change a mode, and the change is readable afterwards", async () => {
    const id = "block-pipeline-on-secret";
    for (const role of ["officer", "auditor"] as const) {
      const denied = await responsesDetail.PATCH(
        req(`/api/responses/${id}`, { ...PATCH, role, body: { mode: "automatic" } }),
        ctx(id),
      );
      expect(denied.status).toBe(403);
    }

    const allowed = await responsesDetail.PATCH(
      req(`/api/responses/${id}`, { ...PATCH, role: "admin", body: { mode: "automatic" } }),
      ctx(id),
    );
    expect(allowed.status).toBe(200);
    expect((await allowed.json()).mode).toBe("automatic");

    const list = await responsesList.GET(req("/api/responses", { role: "officer" }));
    const body = await list.json();
    expect(body.responses.find((row: { id: string }) => row.id === id).mode).toBe("automatic");
    expect(body.responses.filter((row: { mode: string }) => row.mode !== "automatic")).toHaveLength(
      2,
    );
  });

  it("404s an unknown response and 400s an invalid mode", async () => {
    const missing = await responsesDetail.PATCH(
      req("/api/responses/nope", { ...PATCH, role: "admin", body: { mode: "off" } }),
      ctx("nope"),
    );
    expect(missing.status).toBe(404);

    const invalid = await responsesDetail.PATCH(
      req("/api/responses/block-pipeline-on-secret", {
        ...PATCH,
        role: "admin",
        body: { mode: "sometimes" },
      }),
      ctx("block-pipeline-on-secret"),
    );
    expect(invalid.status).toBe(400);
  });
});
