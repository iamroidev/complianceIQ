import { describe, expect, it } from "vitest";
import { FakeClock } from "../../src/core/clock";
import { createLedger, verifyChain } from "../../src/core/ledger";
import { createInMemoryRepo } from "../../src/core/repo/memory-repo";
import { createEvidenceLocker } from "../../src/core/evidence";
import { runChecks } from "../../src/core/pipeline/run-checks";
import { loadSeedRegisters } from "../../src/core/engine/seed";
import { slaDueAt } from "../../src/core/engine/sla";
import type { Alert, Registers } from "../../src/core/types";

const T0 = "2026-03-01T09:00:00.000Z";

function setup() {
  const clock = new FakeClock(T0);
  const ledger = createLedger(clock);
  const repo = createInMemoryRepo();
  const evidence = createEvidenceLocker({ ledger, repo, source: "run-checks" });
  return { clock, ledger, repo, evidence, deps: { ledger, repo, evidence, clock } };
}

const subjectIds = (alerts: readonly Alert[]) => alerts.map((alert) => alert.subject.id);

interface SnapshotContent {
  ruleId: string;
  verdict: string;
  asOf: string;
  subject: { id: string };
  registers: {
    people: { id: string }[];
    certifications: { id: string; expiresOn?: string }[];
    requirements: { id: string }[];
    vendors: unknown[];
    accounts: unknown[];
    obligations: unknown[];
  };
  note?: string;
}

describe("runChecks on the demo seed (MASTER §7.3)", () => {
  it("opens exactly the three expected alerts and stores the CheckRun", () => {
    const { deps, ledger, repo } = setup();
    const registers = loadSeedRegisters();
    const { checkRun, opened, resolved } = runChecks({ asOf: T0, registers }, deps);

    expect(opened.map((alert) => `${alert.ruleId}:${alert.subject.id}`)).toEqual([
      "CERT-001:p_nana",
      "DEAD-001:ob_pen_test",
      "VEND-001:v_meridian",
    ]);
    expect(resolved).toEqual([]);
    expect(checkRun).toEqual({
      id: "chk_6",
      asOf: T0,
      rulesRun: 3,
      subjectsChecked: 29,
      passed: 29,
      failed: 3,
      opened: 3,
      resolved: 0,
      ledgerBlockIndex: 6,
    });
    expect(repo.checkRuns.list()).toEqual([checkRun]);
    expect(repo.alerts.list()).toHaveLength(3);

    expect(ledger.blocks.map((block) => block.eventType)).toEqual([
      "EVIDENCE_RECORDED",
      "ALERT_TRIGGERED",
      "EVIDENCE_RECORDED",
      "ALERT_TRIGGERED",
      "EVIDENCE_RECORDED",
      "ALERT_TRIGGERED",
      "CHECK_RUN",
    ]);
    expect(ledger.blocks[1].actor).toBe("scheduler@complianceiq.test");
    expect(ledger.blocks[6].actor).toBe("scheduler@complianceiq.test");
    expect(verifyChain(ledger.blocks, repo.evidence.list())).toEqual({ ok: true, checked: 7 });
  });

  it("scores, SLAs, domains and summarises each alert from its rule (§6.2/§6.3/§7.1)", () => {
    const { deps } = setup();
    const registers = loadSeedRegisters();
    const { opened } = runChecks({ asOf: T0, registers }, deps);
    const [cert, dead, vend] = opened;

    expect(cert).toMatchObject({
      id: "alrt_1",
      domain: "people",
      severity: "medium",
      riskScore: 25,
      status: "open",
      slaDueAt: "2026-03-04T09:00:00.000Z",
      summarySentence:
        "Nana Adjeiwaa has no Security awareness certificate on file. The role requires it.",
    });
    expect(cert.riskReasons).toEqual([]);
    expect(dead).toMatchObject({
      id: "alrt_3",
      domain: "regulatory",
      severity: "medium",
      riskScore: 25,
      slaDueAt: "2026-03-04T09:00:00.000Z",
      summarySentence:
        "Annual penetration test is due in 9 days, on 10 Mar 2026. No completion evidence recorded.",
    });
    expect(vend).toMatchObject({
      id: "alrt_5",
      domain: "vendor",
      severity: "high",
      riskScore: 35,
      slaDueAt: "2026-03-02T09:00:00.000Z",
      summarySentence:
        "Meridian Freight Ltd is missing a required SOC 2 report. Critical-tier vendors must hold a current SOC 2 report.",
    });

    for (const alert of opened) {
      expect(alert.riskReasons.length).toBeLessThanOrEqual(3);
      expect(alert.policyRefs.every((ref) => ref.confidence > 0 && ref.confidence <= 1)).toBe(true);
      expect(alert.result.ruleId).toBe(alert.ruleId);
      expect(alert.ruleVersion).toBe(alert.result.ruleVersion);
      expect(Array.isArray(alert.evidenceRefs)).toBe(true);
    }
  });

  it("anchors policy refs with mapped chunks first (M3)", () => {
    const { deps } = setup();
    const registers = loadSeedRegisters();
    const [cert, dead, vend] = runChecks({ asOf: T0, registers }, deps).opened;

    expect(cert.policyRefs.map((ref) => `${ref.chunkId} ${ref.reason}`)).toEqual([
      "doc_training_certification#sec-2 mapped",
      "doc_training_certification#sec-3 mapped",
    ]);
    expect(vend.policyRefs[0]).toMatchObject({
      chunkId: "cl_soc2_cc6_1",
      reason: "mapped",
      confidence: 1,
    });
    expect(vend.policyRefs.map((ref) => ref.chunkId)).toContain("doc_vendor_management#sec-2");
    expect(dead.policyRefs).toHaveLength(4);
  });

  it("snapshots the register rows the finding was based on", () => {
    const { deps, repo } = setup();
    const registers = loadSeedRegisters();
    const cert = runChecks({ asOf: T0, registers }, deps).opened[0];

    expect(cert.snapshotEvidenceIds).toHaveLength(1);
    const snapshot = repo.evidence.get(cert.snapshotEvidenceIds[0])!;
    expect(snapshot.kind).toBe("record_snapshot");
    expect(snapshot.title).toContain("Nana Adjeiwaa");
    expect(snapshot.subjectRef).toEqual({ type: "record", id: "p_nana" });

    const content = snapshot.content as SnapshotContent;
    expect(content.ruleId).toBe("CERT-001");
    expect(content.verdict).toBe("fail");
    expect(content.asOf).toBe(T0);
    expect(content.subject.id).toBe("p_nana");
    expect(content.registers.people.map((person) => person.id)).toEqual(["p_nana"]);
    expect(content.registers.certifications).toHaveLength(0);
    expect(content.registers.requirements).toHaveLength(1);
    expect(JSON.stringify(content.registers.requirements)).toContain("Security awareness");
    expect(content.registers.vendors).toHaveLength(0);
    expect(content.registers.accounts).toHaveLength(0);
    expect(content.registers.obligations).toHaveLength(0);
  });

  it("is idempotent while the condition persists — a second run opens nothing", () => {
    const { deps, ledger, repo } = setup();
    const registers = loadSeedRegisters();
    runChecks({ asOf: T0, registers }, deps);

    const second = runChecks({ asOf: T0, registers }, deps);
    expect(second.opened).toEqual([]);
    expect(second.resolved).toEqual([]);
    expect(second.checkRun.id).toBe("chk_7");
    expect(repo.alerts.list()).toHaveLength(3);
    expect(repo.checkRuns.list()).toHaveLength(2);
    expect(ledger.blocks.at(-1)!.eventType).toBe("CHECK_RUN");
    expect(verifyChain(ledger.blocks, repo.evidence.list())).toEqual({
      ok: true,
      checked: ledger.blocks.length,
    });
  });

  it("does not mutate the input registers", () => {
    const { deps } = setup();
    const registers = loadSeedRegisters();
    const before = structuredClone(registers);
    runChecks({ asOf: T0, registers }, deps);
    expect(registers).toEqual(before);
  });

  it("rejects an invalid asOf", () => {
    const { deps } = setup();
    expect(() => runChecks({ asOf: "yesterday", registers: loadSeedRegisters() }, deps)).toThrow(
      /ISO-8601/,
    );
  });
});

describe("auto-resolve and re-alert rules (MASTER §7.3 step 4)", () => {
  it("time travel: expiry opens a new alert, renewal clears it, re-expiry opens a fresh id", () => {
    const { clock, deps, ledger, repo } = setup();
    const registers = loadSeedRegisters();

    const first = runChecks({ asOf: T0, registers }, deps);
    expect(first.opened).toHaveLength(3);

    // 2026-03-16: Ama's First Aid expired on 2026-03-15, Cedar Analytics' DPA
    // expired on 2026-03-10, and the dependency scan (due 2026-03-27) has
    // entered its 14-day warning window.
    clock.advanceDays(15);
    const second = runChecks({ asOf: clock.now(), registers }, deps);
    expect(second.opened.map((alert) => alert.ruleId)).toEqual([
      "CERT-001",
      "DEAD-001",
      "VEND-001",
    ]);
    expect(subjectIds(second.opened)).toEqual(["p_ama", "ob_deps_scan", "v_cedar"]);
    expect(second.resolved).toEqual([]);

    const expired = second.opened[0];
    const renewed: Registers = {
      ...registers,
      certifications: registers.certifications.map((cert) =>
        cert.id === "cert_ama_firstaid" ? { ...cert, expiresOn: "2027-03-15" } : cert,
      ),
    };
    const third = runChecks({ asOf: clock.now(), registers: renewed }, deps);
    expect(third.opened).toEqual([]);
    expect(subjectIds(third.resolved)).toEqual(["p_ama"]);

    const cleared = repo.alerts.get(third.resolved[0].id)!;
    expect(cleared.id).toBe(expired.id);
    expect(cleared.status).toBe("resolved");
    expect(cleared.resolvedReason).toBe("condition_cleared");
    expect(cleared.snapshotEvidenceIds).toHaveLength(2);

    const autoBlock = ledger.blocks.find((block) => block.eventType === "ALERT_AUTO_RESOLVED")!;
    expect(autoBlock.payload).toMatchObject({ alertId: cleared.id, ruleId: "CERT-001" });
    expect(repo.evidence.get(String(autoBlock.payload.evidenceId))).toBeDefined();

    const clearing = repo.evidence.get(cleared.snapshotEvidenceIds[1])!.content as SnapshotContent;
    expect(clearing.verdict).toBe("pass");
    expect(clearing.registers.certifications.length).toBeGreaterThan(0);
    expect(
      clearing.registers.certifications.some(
        (cert) => cert.id === "cert_ama_firstaid" && cert.expiresOn === "2027-03-15",
      ),
    ).toBe(true);

    const fourth = runChecks({ asOf: clock.now(), registers }, deps);
    expect(subjectIds(fourth.opened)).toEqual(["p_ama"]);
    expect(fourth.opened[0].id).not.toBe(cleared.id);
    expect(repo.alerts.get(cleared.id)!.status).toBe("resolved");
    expect(verifyChain(ledger.blocks, repo.evidence.list())).toEqual({
      ok: true,
      checked: ledger.blocks.length,
    });
  });

  it("dismissed alerts block a new alert while the condition still fails", () => {
    const { deps, repo } = setup();
    const registers = loadSeedRegisters();
    const first = runChecks({ asOf: T0, registers }, deps);
    const cert = first.opened[0];
    repo.alerts.update(cert.id, { status: "dismissed" });

    const second = runChecks({ asOf: T0, registers }, deps);
    expect(second.opened).toEqual([]);
    expect(second.resolved).toEqual([]);
    expect(repo.alerts.get(cert.id)!.status).toBe("dismissed");
  });

  it("auto-resolves only open alerts — a filed alert whose condition clears stays filed", () => {
    const { deps, repo } = setup();
    const registers = loadSeedRegisters();
    const first = runChecks({ asOf: T0, registers }, deps);
    const cert = first.opened[0];
    repo.alerts.update(cert.id, { status: "filed" });

    const clearedRegisters: Registers = {
      ...registers,
      certifications: [
        ...registers.certifications,
        {
          id: "cert_nana_security_new",
          personId: "p_nana",
          type: "Security awareness",
          issuedOn: "2026-03-01",
        },
      ],
    };
    const second = runChecks({ asOf: T0, registers: clearedRegisters }, deps);
    expect(second.opened).toEqual([]);
    expect(second.resolved).toEqual([]);
    expect(repo.alerts.get(cert.id)!.status).toBe("filed");
    expect(repo.alerts.get(cert.id)!.resolvedReason).toBeUndefined();
  });

  it("resolves an open alert when the subject disappears from evaluation entirely", () => {
    const { deps, ledger, repo } = setup();
    const registers = loadSeedRegisters();
    const first = runChecks({ asOf: T0, registers }, deps);
    const cert = first.opened[0];

    const terminated: Registers = {
      ...registers,
      people: registers.people.map((person) =>
        person.id === "p_nana" ? { ...person, status: "terminated" } : person,
      ),
    };
    const second = runChecks({ asOf: T0, registers: terminated }, deps);
    expect(subjectIds(second.resolved)).toEqual(["p_nana"]);
    expect(second.opened).toEqual([]);

    const cleared = repo.alerts.get(cert.id)!;
    expect(cleared.resolvedReason).toBe("condition_cleared");
    const clearing = repo.evidence.get(cleared.snapshotEvidenceIds[1])!.content as SnapshotContent;
    expect(clearing.verdict).toBe("pass");
    expect(clearing.note).toBe("Subject produced no failing result in this run.");
    expect(verifyChain(ledger.blocks, repo.evidence.list())).toEqual({
      ok: true,
      checked: ledger.blocks.length,
    });
  });
});

describe("SLA windows (MASTER §6.3)", () => {
  it("measures 4h / 24h / 72h / 7d from the alert creation time", () => {
    expect(slaDueAt("critical", T0)).toBe("2026-03-01T13:00:00.000Z");
    expect(slaDueAt("high", T0)).toBe("2026-03-02T09:00:00.000Z");
    expect(slaDueAt("medium", T0)).toBe("2026-03-04T09:00:00.000Z");
    expect(slaDueAt("low", T0)).toBe("2026-03-08T09:00:00.000Z");
  });

  it("rejects a non-ISO timestamp", () => {
    expect(() => slaDueAt("high", "yesterday")).toThrow(/ISO-8601/);
  });
});
