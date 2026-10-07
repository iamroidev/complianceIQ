import { describe, it, expect } from "vitest";
import {
  TIER1_EVENT_RULES,
  TIER1_RULES,
  TIER1_STATE_RULES,
  getRule,
  rulesOfKind,
} from "../../src/core/engine/rules/index";
import { runEventRules, runRules, runStateRules } from "../../src/core/engine/evaluate";
import { loadSeedRegisters } from "../../src/core/engine/seed";
import type { RuleContext } from "../../src/core/types";
import { KOFI, makeCtx, makeEvent } from "./engine-fixture";

const seed = loadSeedRegisters();

const DEPOSIT_A = makeEvent({
  id: "evt_a",
  action: "cash_deposit",
  actor: KOFI,
  context: { amount: 9_800, currency: "USD" },
  timestamp: "2026-01-10T09:00:00.000Z",
});

const DEPOSIT_B = makeEvent({
  id: "evt_b",
  action: "cash_deposit",
  actor: KOFI,
  context: { amount: 9_400, currency: "USD" },
  timestamp: "2026-01-11T19:00:00.000Z",
});

describe("rule registry", () => {
  it("exposes five event rules and three state rules", () => {
    expect(TIER1_EVENT_RULES).toHaveLength(5);
    expect(TIER1_STATE_RULES).toHaveLength(3);
    expect(TIER1_RULES).toHaveLength(8);
    expect(rulesOfKind("event")).toHaveLength(5);
    expect(rulesOfKind("state")).toHaveLength(3);
  });

  it("finds a rule by id and reports unknown ids", () => {
    expect(getRule("AML-001")?.meta.name).toContain("Structuring");
    expect(getRule("CERT-001")?.kind).toBe("state");
    expect(getRule("NOPE-999")).toBeUndefined();
  });

  it("wires all rules with the §6.1 shape", () => {
    for (const rule of TIER1_RULES) {
      expect(rule.meta.tier).toBe(1);
      expect(typeof rule.defaultParams).toBe("object");
      expect(["event", "state"]).toContain(rule.kind);
      expect(typeof rule.evaluate).toBe("function");
      expect(typeof rule.riskFactors).toBe("function");
      expect(typeof rule.summarize).toBe("function");
      expect(typeof rule.meta.dossier).toBe("string");
    }
  });
});

describe("runEventRules / runStateRules", () => {
  const context = makeCtx({ events: [DEPOSIT_A, DEPOSIT_B], registers: seed });

  it("runEventRules executes only event rules", () => {
    const ids = new Set(runEventRules(TIER1_RULES, context).map((r) => r.ruleId));
    expect(ids.has("AML-001")).toBe(true);
    expect([...ids].every((id) => TIER1_EVENT_RULES.some((rule) => rule.meta.id === id))).toBe(true);
  });

  it("runStateRules executes only state rules", () => {
    const ids = new Set(runStateRules(TIER1_RULES, context).map((r) => r.ruleId));
    expect(ids).toEqual(new Set(["CERT-001", "DEAD-001", "VEND-001"]));
  });

  it("runRules honours an optional kind filter and defaults to everything", () => {
    const eventOnly = runRules(TIER1_RULES, context, "event");
    expect(eventOnly.every((r) => r.ruleId !== "CERT-001")).toBe(true);
    const all = runRules(TIER1_RULES, context);
    expect(all.length).toBeGreaterThan(eventOnly.length);
    expect(runRules(TIER1_RULES, context)).toEqual(all);
  });

  it("event run surfaces the §7.1 structuring pair", () => {
    const [aml] = runEventRules(TIER1_RULES, context).filter((r) => r.ruleId === "AML-001");
    expect(aml.verdict).toBe("fail");
    expect(aml.observed).toMatchObject({ depositCount: 2, spanHours: 34 });
  });
});

describe("seed registers", () => {
  it("parses the shipped seed through zod", () => {
    expect(seed.people).toHaveLength(9);
    expect(seed.certifications).toHaveLength(10);
    expect(seed.requirements).toHaveLength(3);
    expect(seed.vendors).toHaveLength(3);
    expect(seed.accounts).toHaveLength(6);
    expect(seed.obligations).toHaveLength(54);
  });

  it("runs the state pipeline as of the demo time with three expected alerts", () => {
    const context: RuleContext = makeCtx({ asOf: "2026-03-01T09:00:00.000Z", registers: seed });
    const results = runStateRules(TIER1_RULES, context);

    const certResults = results.filter((r) => r.ruleId === "CERT-001");
    expect(certResults).toHaveLength(11);
    const certFails = certResults.filter((r) => r.verdict === "fail");
    expect(certFails).toHaveLength(1);
    expect(certFails[0].subject.id).toBe("p_nana");
    expect(certFails[0].observed.certType).toBe("Security awareness");

    const deadFails = results
      .filter((r) => r.ruleId === "DEAD-001" && r.verdict === "fail")
      .map((r) => r.subject.id);
    expect(deadFails).toEqual(["ob_pen_test"]);

    const vendFails = results
      .filter((r) => r.ruleId === "VEND-001" && r.verdict === "fail")
      .map((r) => r.subject.id);
    expect(vendFails).toEqual(["v_meridian"]);

    expect(results.filter((r) => r.verdict === "fail")).toHaveLength(3);
  });

  it("keeps Ama's First Aid certification valid until 15 Mar 2026", () => {
    const context: RuleContext = makeCtx({ asOf: "2026-03-01T09:00:00.000Z", registers: seed });
    const ama = runStateRules(TIER1_RULES, context).find(
      (r) => r.ruleId === "CERT-001" && r.subject.id === "p_ama" && r.observed.certType === "First Aid",
    );
    expect(ama?.verdict).toBe("pass");
  });

  it("is deterministic across repeated runs and never mutates inputs", () => {
    const c = makeCtx({ events: [DEPOSIT_A, DEPOSIT_B], registers: seed });
    const snapshot = structuredClone(c);
    const first = runEventRules(TIER1_RULES, c);
    const second = runEventRules(TIER1_RULES, c);
    expect(second).toEqual(first);
    runStateRules(TIER1_RULES, c);
    expect(JSON.stringify(c)).toBe(JSON.stringify(snapshot));
  });
});
