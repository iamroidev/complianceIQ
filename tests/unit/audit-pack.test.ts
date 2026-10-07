import { describe, expect, it } from "vitest";
import { FakeClock } from "../../src/core/clock";
import { SEED_T0, loadSeedRegisters } from "../../src/core/engine/seed";
import { createEvidenceLocker } from "../../src/core/evidence";
import { canonical, createLedger, headHash, sha256hex, verifyChain } from "../../src/core/ledger";
import { createInMemoryRepo } from "../../src/core/repo/memory-repo";
import { runChecks } from "../../src/core/pipeline/run-checks";
import { buildAuditPack, METHOD_STATEMENT, type AuditPackDeps } from "../../src/core/reports/audit-pack";

function setup() {
  const clock = new FakeClock(SEED_T0);
  const repo = createInMemoryRepo();
  const ledger = createLedger(clock, repo.blocks);
  const evidence = createEvidenceLocker({ ledger, repo, source: "audit-pack-test" });
  const deps = { ledger, repo, evidence, clock };
  const registers = loadSeedRegisters();
  runChecks({ asOf: SEED_T0, registers }, deps);
  const packDeps: AuditPackDeps = {
    ledger,
    clock,
    alerts: repo.alerts.list(),
    checkRuns: repo.checkRuns.list(),
    evidence: repo.evidence.list(),
    obligations: registers.obligations,
  };
  return { clock, repo, ledger, evidence, registers, packDeps };
}

const input = {
  from: "1970-01-01T00:00:00.000Z",
  to: SEED_T0,
  generatedBy: "auditor",
};

describe("audit pack (MASTER §7.7, §11 acceptance)", () => {
  it("re-verifies every evidence hash in the pack and quotes the matching head hash", async () => {
    const { repo, ledger, packDeps } = setup();
    const headBefore = headHash(ledger.blocks);

    const pack = await buildAuditPack(input, packDeps);

    // Verification block: chain and every evidence hash re-check.
    expect(pack.bundle.verification.chainOk).toBe(true);
    expect(pack.bundle.verification.evidenceHashesOk).toBe(true);
    expect(pack.bundle.verification.contentHashesOk).toBe(true);
    expect(pack.bundle.verification.contentHashesRehashed).toBeGreaterThan(0);
    expect(pack.bundle.verification.failureReason).toBeNull();

    // Head hash matches the ledger at export and is carried by the pack block.
    expect(pack.bundle.verification.headHash).toBe(headBefore);
    const packBlock = ledger.blocks.find((block) => block.eventType === "AUDIT_PACK_EXPORTED");
    expect(packBlock).toBeTruthy();
    expect(packBlock!.payload["packHash"]).toBe(pack.packHash);
    expect(packBlock!.payload["headHashAtExport"]).toBe(headBefore);

    // Pack hash recorded = sha256hex(canonical(bundle)).
    expect(pack.packHash).toMatch(/^[0-9a-f]{64}$/);
    expect(pack.packHash).toBe(sha256hex(canonical(pack.bundle)));

    // Every evidence row in the pack re-derives from its stored content and
    // still matches its ledger payload after the pack block landed.
    const items = new Map(repo.evidence.list().map((item) => [item.id, item]));
    expect(pack.bundle.evidenceIndex).toHaveLength(items.size);
    for (const row of pack.bundle.evidenceIndex) {
      const item = items.get(row.id)!;
      expect(row.contentHash).toBe(item.contentHash);
      expect(sha256hex(canonical(item.content))).toBe(item.contentHash);
      expect(ledger.blocks[item.ledgerBlockIndex].payload["contentHash"]).toBe(item.contentHash);
    }
    expect(verifyChain(ledger.blocks, repo.evidence.list())).toEqual({
      ok: true,
      checked: ledger.blocks.length,
    });
  });

  it("renders the CSV index and a real PDF alongside the bundle", async () => {
    const { repo, packDeps } = setup();
    const pack = await buildAuditPack(input, packDeps);

    const csvLines = pack.csv.split("\r\n");
    expect(csvLines[0]).toBe(
      '"id","kind","title","source","collectedAt","contentHash","ledgerBlockIndex"',
    );
    expect(csvLines).toHaveLength(repo.evidence.list().length + 1);
    expect(pack.csv).toContain(repo.evidence.list()[0].contentHash);

    expect(Buffer.from(pack.pdfBase64, "base64").subarray(0, 5).toString()).toBe("%PDF-");
    expect(pack.pdfBase64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("summarises scope, checks, findings and decisions inside the period", async () => {
    const { repo, ledger, evidence, clock, packDeps } = setup();
    const pack = await buildAuditPack(input, packDeps);

    expect(pack.bundle.scope).toMatchObject({
      from: input.from,
      to: SEED_T0,
      domains: ["all"],
      generatedBy: "auditor",
      generatedAt: clock.now(),
      methodStatement: METHOD_STATEMENT,
    });
    expect(pack.bundle.checkSummary.runs).toBe(1);
    expect(pack.bundle.checkSummary.latestRun?.failed).toBe(3);
    expect(pack.bundle.checkSummary.findingsPerRule).toEqual([
      { ruleId: "CERT-001", findings: 1 },
      { ruleId: "DEAD-001", findings: 1 },
      { ruleId: "VEND-001", findings: 1 },
    ]);
    expect(pack.bundle.findings).toHaveLength(3);
    expect(pack.bundle.findings.every((finding) => finding.decision === null)).toBe(true);
    expect(pack.bundle.coverage.headline).toContain("obligations are checked automatically");

    // A decision recorded afterwards shows up in the next pack's findings.
    const alert = repo.alerts.list()[0];
    const { recordDecision } = await import("../../src/core/pipeline/decide");
    recordDecision(
      { alertId: alert.id, decision: "file", decider: "officer" },
      { ledger, repo, evidence, clock },
    );
    const second = await buildAuditPack(
      { ...input, from: SEED_T0, generatedBy: "officer" },
      { ...packDeps, alerts: repo.alerts.list() },
    );
    const filed = second.bundle.findings.find((finding) => finding.alertId === alert.id);
    expect(filed?.decision).toMatchObject({
      eventType: "REPORT_FILED",
      decider: "officer",
      reason: null,
      at: SEED_T0,
    });
  });

  it("scopes findings to the requested period and domain", async () => {
    const packDeps = setup().packDeps;
    const outside = await buildAuditPack(
      { ...input, from: "2026-03-02T00:00:00.000Z", to: "2026-03-03T00:00:00.000Z" },
      packDeps,
    );
    expect(outside.bundle.findings).toEqual([]);
    expect(outside.bundle.evidenceIndex).toEqual([]);

    const scoped = await buildAuditPack({ ...input, domains: ["ai"] }, packDeps);
    expect(scoped.bundle.scope.domains).toEqual(["ai"]);
    expect(scoped.bundle.findings).toEqual([]);
  });

  it("flags tampered evidence content in the verification block", async () => {
    const { packDeps } = setup();
    const tampered = packDeps.evidence.map((item) =>
      item.content === undefined ? item : { ...item, content: { tampered: true } },
    );
    const pack = await buildAuditPack(input, { ...packDeps, evidence: tampered });

    expect(pack.bundle.verification.contentHashesOk).toBe(false);
    expect(pack.bundle.verification.evidenceHashesOk).toBe(true);
    expect(pack.bundle.verification.chainOk).toBe(true);
  });
});
