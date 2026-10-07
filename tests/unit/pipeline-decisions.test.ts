import { describe, expect, it } from "vitest";
import { FakeClock } from "../../src/core/clock";
import { SEED_T0, loadSeedRegisters } from "../../src/core/engine/seed";
import { createEvidenceLocker } from "../../src/core/evidence";
import { createLedger, type Ledger } from "../../src/core/ledger";
import { createInMemoryRepo } from "../../src/core/repo/memory-repo";
import { recordDecision } from "../../src/core/pipeline/decide";
import { runChecks } from "../../src/core/pipeline/run-checks";
import { defaultResponseSettings } from "../../src/core/responses/response-rules";
import type { Alert, Certification, Registers } from "../../src/core/types";

function setup(options: { withChecks?: boolean } = {}) {
  const clock = new FakeClock(SEED_T0);
  const repo = createInMemoryRepo();
  const ledger = createLedger(clock, repo.blocks);
  const evidence = createEvidenceLocker({ ledger, repo, source: "decide-test" });
  const deps = { ledger, repo, evidence, clock };
  const registers = loadSeedRegisters();
  if (options.withChecks !== false) runChecks({ asOf: SEED_T0, registers }, deps);
  return { clock, repo, ledger, evidence, deps, registers };
}

const blocksOf = (ledger: Ledger, eventType: string) =>
  ledger.blocks.filter((block) => block.eventType === eventType);

const alertOf = (repo: ReturnType<typeof createInMemoryRepo>, ruleId: string): Alert => {
  const alert = repo.alerts.list().find((candidate) => candidate.ruleId === ruleId);
  if (!alert) throw new Error(`No ${ruleId} alert`);
  return alert;
};

describe("recordDecision (MASTER §7.4 file/dismiss/escalate, §8)", () => {
  it("files an open alert and proves it with REPORT_FILED", () => {
    const { repo, ledger, deps } = setup();
    const alert = alertOf(repo, "CERT-001");
    const outcome = recordDecision(
      { alertId: alert.id, decision: "file", decider: "officer", note: "filed to FinCEN demo" },
      deps,
    );
    expect(outcome.alert.status).toBe("filed");
    expect(repo.alerts.get(alert.id)?.status).toBe("filed");

    const blocks = blocksOf(ledger, "REPORT_FILED");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      alertId: alert.id,
      actor: "officer",
      payload: {
        alertId: alert.id,
        ruleId: "CERT-001",
        decision: "file",
        decider: "officer",
        note: "filed to FinCEN demo",
        at: SEED_T0,
      },
    });
    expect(outcome.blockIndex).toBe(blocks[0].blockIndex);
  });

  it("refuses a dismissal without a reason", () => {
    const { repo, deps } = setup();
    const alert = alertOf(repo, "DEAD-001");
    expect(() =>
      recordDecision({ alertId: alert.id, decision: "dismiss", decider: "officer" }, deps),
    ).toThrow("A dismissal requires a reason.");
    expect(() =>
      recordDecision(
        { alertId: alert.id, decision: "dismiss", decider: "officer", reason: "   " },
        deps,
      ),
    ).toThrow("A dismissal requires a reason.");
    expect(repo.alerts.get(alert.id)?.status).toBe("open");
  });

  it("dismisses with a reason and escalates with ALERT_ESCALATED", () => {
    const { repo, ledger, deps } = setup();
    const deadline = alertOf(repo, "DEAD-001");
    const vendor = alertOf(repo, "VEND-001");

    const dismissed = recordDecision(
      { alertId: deadline.id, decision: "dismiss", decider: "auditor", reason: "risk accepted by CISO" },
      deps,
    );
    expect(dismissed.alert.status).toBe("dismissed");
    expect(blocksOf(ledger, "ALERT_DISMISSED")[0]).toMatchObject({
      alertId: deadline.id,
      actor: "auditor",
      payload: { decision: "dismiss", reason: "risk accepted by CISO" },
    });

    const escalated = recordDecision(
      { alertId: vendor.id, decision: "escalate", decider: "admin" },
      deps,
    );
    expect(escalated.alert.status).toBe("escalated");
    expect(blocksOf(ledger, "ALERT_ESCALATED")[0]).toMatchObject({
      alertId: vendor.id,
      actor: "admin",
      payload: { decision: "escalate", decider: "admin" },
    });
  });

  it("a decided case stays decided — no second decision, no reopen", () => {
    const { repo, ledger, deps, registers } = setup();
    const alert = alertOf(repo, "CERT-001");
    recordDecision({ alertId: alert.id, decision: "file", decider: "officer" }, deps);

    expect(() =>
      recordDecision({ alertId: alert.id, decision: "dismiss", decider: "officer", reason: "later" }, deps),
    ).toThrow("cannot be decided again");

    const again = runChecks({ asOf: SEED_T0, registers }, deps);
    expect(again.opened).toEqual([]);
    expect(repo.alerts.get(alert.id)?.status).toBe("filed");
    expect(blocksOf(ledger, "REPORT_FILED")).toHaveLength(1);
  });

  it("rejects an unknown alert id", () => {
    const { deps } = setup();
    expect(() =>
      recordDecision({ alertId: "alrt_nope", decision: "file", decider: "officer" }, deps),
    ).toThrow("Alert not found");
  });
});

describe("automatic responses reverse when the condition clears (§7.9)", () => {
  it("executes on open and appends RESPONSE_REVERSED on auto-resolve", () => {
    const { repo, ledger, deps } = setup({ withChecks: false });
    const settings = {
      ...defaultResponseSettings(),
      "request-renewal-from-owner": "automatic",
    } as const;

    const first = runChecks(
      { asOf: SEED_T0, registers: loadSeedRegisters(), responseSettings: settings },
      deps,
    );
    expect(first.opened).toHaveLength(3);
    const executed = blocksOf(ledger, "RESPONSE_EXECUTED");
    // CERT-001 (p_nana) and VEND-001 (v_meridian) are the catalog triggers.
    expect(executed).toHaveLength(2);
    expect(executed.map((block) => block.alertId).sort()).toEqual(
      [alertOf(repo, "CERT-001").id, alertOf(repo, "VEND-001").id].sort(),
    );

    // Renew nana's missing Security awareness certificate — the failure clears.
    const renewed: Registers = {
      ...loadSeedRegisters(),
      certifications: [
        ...loadSeedRegisters().certifications,
        {
          id: "cert_nana_security",
          personId: "p_nana",
          type: "Security awareness",
          issuedOn: "2026-03-01",
          expiresOn: "2027-03-01",
        } satisfies Certification,
      ],
    };
    const second = runChecks({ asOf: SEED_T0, registers: renewed, responseSettings: settings }, deps);
    expect(second.resolved.map((alert) => `${alert.ruleId}:${alert.subject.id}`)).toEqual([
      "CERT-001:p_nana",
    ]);

    const reversed = blocksOf(ledger, "RESPONSE_REVERSED");
    expect(reversed).toHaveLength(1);
    expect(reversed[0]).toMatchObject({
      alertId: alertOf(repo, "CERT-001").id,
      payload: { responseId: "request-renewal-from-owner" },
    });

    // The vendor response stays standing — v_meridian still fails.
    expect(blocksOf(ledger, "RESPONSE_EXECUTED")).toHaveLength(2);
    expect(repo.alerts.get(alertOf(repo, "VEND-001").id)?.status).toBe("open");
  });
});
