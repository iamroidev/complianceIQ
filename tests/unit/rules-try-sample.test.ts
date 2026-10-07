import { describe, expect, it } from "vitest";
import { getRule } from "../../src/core/engine/rules";
import { SEED_T0, loadSeedRegisters } from "../../src/core/engine/seed";
import { loadScenarios } from "../../src/core/pipeline/scenarios";
import { tryRuleOnSample, type SampleRun } from "../../src/core/rules/try-sample";

function run(
  ruleId: string,
  leg: "sample" | "control",
  params?: Record<string, unknown>,
): SampleRun {
  const rule = getRule(ruleId);
  if (!rule) throw new Error(`unknown rule ${ruleId}`);
  const scenario = loadScenarios().find((candidate) => candidate.ruleId === ruleId);
  if (!scenario) throw new Error(`no scenario for ${ruleId}`);
  const control = leg === "control";
  return tryRuleOnSample({
    rule,
    steps: control ? scenario.twin.steps : scenario.steps,
    leg,
    title: control ? (scenario.twin.title ?? scenario.title) : scenario.title,
    note: control ? (scenario.twin.note ?? "") : (scenario.note ?? ""),
    registers: loadSeedRegisters(),
    baseAsOf: SEED_T0,
    ...(params ? { params } : {}),
  });
}

describe("rule test harness (Rules screen)", () => {
  it("fires AML-001 on the sample at the second deposit and never on the control", () => {
    const sample = run("AML-001", "sample");
    expect(sample.total).toBe(1);
    expect(sample.firing).toBe(1);
    expect(sample.stopped).toBe(0);
    expect(sample.lines).toHaveLength(1);
    expect(sample.lines[0]).toMatchObject({
      subjectName: "Kofi Adjei-Boateng",
      firstFiresAt: 2,
      stopsAt: null,
      severity: "high",
    });
    expect(sample.lines[0].sentence).toContain("within 34 hours");

    const control = run("AML-001", "control");
    expect(control.firing).toBe(0);
    expect(control.stopped).toBe(0);
    expect(control.lines).toHaveLength(0);
  });

  it("reports VEND-001 firing on both vendors in the sample and clearing in the control", () => {
    const sample = run("VEND-001", "sample");
    expect(sample.firing).toBe(2);
    expect(sample.lines.map((line) => line.subjectName)).toEqual([
      "Cedar Analytics",
      "Meridian Freight Ltd",
    ]);

    const control = run("VEND-001", "control");
    expect(control.firing).toBe(0);
    expect(control.stopped).toBe(1);
    expect(control.lines[0]).toMatchObject({
      subjectName: "Meridian Freight Ltd",
      firstFiresAt: 1,
      stopsAt: 5,
    });
  });

  it("counts the confirmed obligations DEAD-001 sees after the 31-day jump", () => {
    const sample = run("DEAD-001", "sample");
    expect(sample.total).toBe(18);
    expect(sample.firing).toBe(8);
    expect(sample.stopped).toBe(0);

    const control = run("DEAD-001", "control");
    expect(control.firing).toBe(0);
    expect(control.stopped).toBe(1);
    expect(control.lines[0]).toMatchObject({
      subjectName: "Annual penetration test",
      firstFiresAt: 1,
      stopsAt: 3,
    });
  });

  it("uses the parameters it is given instead of the defaults", () => {
    const tightened = run("AML-001", "sample", { minCount: 3 });
    expect(tightened.firing).toBe(0);
    expect(tightened.stopped).toBe(0);
    expect(tightened.lines).toHaveLength(0);

    const widerBand = run("AML-001", "sample", { bandMin: 0 });
    expect(widerBand.firing).toBe(1);
    expect(widerBand.lines[0].sentence).toContain("9,800.00");
  });

  it("never writes to the registers it was handed", () => {
    const registers = loadSeedRegisters();
    const before = JSON.stringify(registers);
    run("CERT-001", "sample");
    run("VEND-001", "control");
    expect(JSON.stringify(registers)).toBe(before);
  });

  it("gives every Tier 1 rule a sample and a control", () => {
    for (const ruleId of [
      "AML-001",
      "FIN-001",
      "IAM-001",
      "HIPAA-001",
      "DEV-001",
      "CERT-001",
      "DEAD-001",
      "VEND-001",
    ]) {
      expect(run(ruleId, "sample").stepCount).toBeGreaterThan(0);
      expect(run(ruleId, "control").stepCount).toBeGreaterThan(0);
    }
  });
});
