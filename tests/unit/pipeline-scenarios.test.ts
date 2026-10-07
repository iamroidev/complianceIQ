import { describe, expect, it } from "vitest";
import { FakeClock } from "../../src/core/clock";
import { createEvidenceLocker } from "../../src/core/evidence";
import { SEED_T0, loadSeedRegisters } from "../../src/core/engine/seed";
import { createLedger } from "../../src/core/ledger";
import { createInMemoryRepo } from "../../src/core/repo/memory-repo";
import { loadScenarios, runScenario, type ScenarioRuntime } from "../../src/core/pipeline/scenarios";

function freshRuntime(): ScenarioRuntime {
  const clock = new FakeClock(SEED_T0);
  const repo = createInMemoryRepo();
  const ledger = createLedger(clock, repo.blocks);
  const evidence = createEvidenceLocker({ ledger, repo, source: "scenario" });
  return { repo, ledger, evidence, clock };
}

const scenarios = loadScenarios();

function keysOf(alerts: { ruleId: string; subjectId: string }[]): string[] {
  return alerts.map((alert) => `${alert.ruleId}::${alert.subjectId}`).sort();
}

describe("demo scenarios (MASTER §7.8, §11 pipeline acceptance)", () => {
  it("loads all eight Tier 1 scenarios", () => {
    expect(scenarios.map((scenario) => scenario.id).sort()).toEqual([
      "expired-certification",
      "leaked-secret",
      "missed-deadline",
      "payment-without-approver",
      "restricted-record-access",
      "sod-breach",
      "structured-deposits",
      "vendor-document-lapsed",
    ]);
  });

  for (const scenario of scenarios) {
    it(`${scenario.id} yields exactly its expected alerts`, async () => {
      const result = await runScenario(scenario, {}, loadSeedRegisters(), freshRuntime());
      expect(result.matchesExpected).toBe(true);
      expect(keysOf(result.opened)).toEqual(keysOf(scenario.expected.opened));
      expect(keysOf(result.resolved)).toEqual(keysOf(scenario.expected.resolved));
      expect(result.opened.length).toBe(scenario.expected.opened.length);
      expect(result.resolved.length).toBe(scenario.expected.resolved.length);
    });

    it(`${scenario.id} twin yields no alert`, async () => {
      const result = await runScenario(scenario, { twin: true }, loadSeedRegisters(), freshRuntime());
      expect(result.twin).toBe(true);
      expect(result.matchesExpected).toBe(true);
      expect(result.opened).toEqual([]);
      expect(result.resolved).toEqual([]);
    });

    it(`${scenario.id} is deterministic across fresh runs`, async () => {
      const first = await runScenario(scenario, {}, loadSeedRegisters(), freshRuntime());
      const second = await runScenario(scenario, {}, loadSeedRegisters(), freshRuntime());
      expect(keysOf(first.opened)).toEqual(keysOf(second.opened));
      expect(first.opened.map((alert) => alert.severity)).toEqual(second.opened.map((alert) => alert.severity));
      expect(keysOf(first.resolved)).toEqual(keysOf(second.resolved));
    });
  }
});
