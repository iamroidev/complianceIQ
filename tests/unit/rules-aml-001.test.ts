import { describe, it, expect } from "vitest";
import { aml001 } from "../../src/core/engine/rules/event/aml-001";
import { assessRisk } from "../../src/core/engine/risk";
import type { ComplianceEvent } from "../../src/core/types";
import { KOFI, AMA, makeCtx, makeEvent, purityProbe } from "./engine-fixture";

const deposit = (amount: number, timestamp: string, actor = KOFI): ComplianceEvent =>
  makeEvent({
    id: `evt_${timestamp}_${amount}`,
    action: "cash_deposit",
    actor,
    context: { amount, currency: "USD" },
    timestamp,
  });

describe("AML-001 structuring", () => {
  it("fires on the §7.1 demo pair and summarises with real values", () => {
    const ctx = makeCtx({
      events: [
        deposit(9_800, "2026-01-10T09:00:00.000Z"),
        deposit(9_400, "2026-01-11T19:00:00.000Z"),
      ],
    });
    const [result] = aml001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({
      subjectName: "Kofi Adjei-Boateng",
      depositCount: 2,
      totalAmount: 19_200,
      amountsText: "USD 9,800.00 and USD 9,400.00",
      spanHours: 34,
    });
    expect(aml001.summarize(result)).toBe(
      "Kofi Adjei-Boateng made 2 cash deposits of USD 9,800.00 and USD 9,400.00 within 34 hours, each just under the USD 10,000 reporting limit.",
    );
  });

  it("fires for any actor, not just the demo person", () => {
    const ctx = makeCtx({
      events: [
        deposit(9_500, "2026-02-01T09:00:00.000Z", AMA),
        deposit(9_600, "2026-02-02T09:00:00.000Z", AMA),
      ],
    });
    const [result] = aml001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.subject.id).toBe("p_ama");
  });

  it("escalates to critical at three deposits", () => {
    const ctx = makeCtx({
      events: [
        deposit(9_100, "2026-01-10T09:00:00.000Z"),
        deposit(9_200, "2026-01-11T09:00:00.000Z"),
        deposit(9_300, "2026-01-12T09:00:00.000Z"),
      ],
    });
    const [result] = aml001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed.depositCount).toBe(3);
    expect(aml001.severityFor?.(result)).toBe("critical");
  });

  it("ignores deposits below the band (8,900)", () => {
    const ctx = makeCtx({
      events: [
        deposit(8_900, "2026-01-10T09:00:00.000Z"),
        deposit(8_900, "2026-01-11T09:00:00.000Z"),
      ],
    });
    const [result] = aml001.evaluate(ctx);
    expect(result.verdict).toBe("pass");
    expect(result.observed.depositCount).toBe(0);
  });

  it("ignores deposits 49 hours apart (window is 48h)", () => {
    const ctx = makeCtx({
      events: [
        deposit(9_800, "2026-01-10T09:00:00.000Z"),
        deposit(9_400, "2026-01-12T10:00:00.000Z"),
      ],
    });
    expect(aml001.evaluate(ctx)[0].verdict).toBe("pass");
  });

  it("fires at exactly 48 hours (inclusive edge)", () => {
    const ctx = makeCtx({
      events: [
        deposit(9_800, "2026-01-10T09:00:00.000Z"),
        deposit(9_400, "2026-01-12T09:00:00.000Z"),
      ],
    });
    expect(aml001.evaluate(ctx)[0].verdict).toBe("fail");
  });

  it("passes a single in-band deposit", () => {
    const ctx = makeCtx({ events: [deposit(9_800, "2026-01-10T09:00:00.000Z")] });
    const [result] = aml001.evaluate(ctx);
    expect(result.verdict).toBe("pass");
    expect(result.observed.depositCount).toBe(1);
  });

  it("passes when the combined total stays under the limit (custom band)", () => {
    const ctx = makeCtx({
      events: [
        deposit(4_500, "2026-01-10T09:00:00.000Z"),
        deposit(4_500, "2026-01-10T12:00:00.000Z"),
      ],
    });
    const [result] = aml001.evaluate(ctx, { bandMin: 4_000, bandMax: 4_999.99 });
    expect(result.verdict).toBe("pass");
    expect(result.observed.depositCount).toBe(2);
  });

  it("ignores non-USD deposits", () => {
    const ctx = makeCtx({
      events: [
        makeEvent({ action: "cash_deposit", context: { amount: 9_800, currency: "EUR" }, timestamp: "2026-01-10T09:00:00.000Z" }),
        makeEvent({ action: "cash_deposit", context: { amount: 9_400, currency: "EUR" }, timestamp: "2026-01-11T09:00:00.000Z" }),
      ],
    });
    expect(aml001.evaluate(ctx)).toEqual([]);
  });

  it("is deterministic and never mutates the context", () => {
    const ctx = makeCtx({
      events: [
        deposit(9_800, "2026-01-10T09:00:00.000Z"),
        deposit(9_400, "2026-01-11T19:00:00.000Z"),
      ],
    });
    const probe = purityProbe(aml001, ctx);
    expect(probe.second).toEqual(probe.first);
    expect(probe.ctxUnchanged).toBe(true);
  });

  it("scores risk from extra deposits, doubled sum and prior alerts", () => {
    const ctx = makeCtx({
      events: [
        deposit(9_800, "2026-01-10T09:00:00.000Z"),
        deposit(9_700, "2026-01-11T09:00:00.000Z"),
        deposit(9_900, "2026-01-12T09:00:00.000Z"),
      ],
      asOf: "2026-01-13T09:00:00.000Z",
    });
    const [result] = aml001.evaluate(ctx);
    expect(aml001.severityFor?.(result)).toBe("critical");
    const clean = assessRisk(aml001, result, ctx);
    expect(clean).toEqual({
      riskScore: 70,
      riskReasons: [
        "Combined amount reached twice the reporting limit",
        "3 deposits in the band, above the 2 minimum",
      ],
    });
    const withPrior = assessRisk(aml001, result, ctx, {
      history: { priorAlerts: [{ subjectId: "p_kofi", createdAt: "2026-01-05T09:00:00.000Z" }] },
    });
    expect(withPrior.riskScore).toBe(80);
    expect(withPrior.riskReasons).toHaveLength(3);
    const stalePrior = assessRisk(aml001, result, ctx, {
      history: { priorAlerts: [{ subjectId: "p_kofi", createdAt: "2025-10-01T09:00:00.000Z" }] },
    });
    expect(stalePrior.riskScore).toBe(70);
  });
});
