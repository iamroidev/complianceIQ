import { describe, it, expect } from "vitest";
import { fin001 } from "../../src/core/engine/rules/event/fin-001";
import type { ComplianceEvent } from "../../src/core/types";
import { KOFI, DANIEL, makeCtx, makeEvent, purityProbe } from "./engine-fixture";

const payment = (
  amount: number,
  approvers: string[],
  overrides?: { requestedBy?: string; id?: string; label?: string },
): ComplianceEvent =>
  makeEvent({
    id: overrides?.id ?? `evt_pay_${amount}_${approvers.join("-") || "none"}`,
    action: "payment_released",
    resource: { type: "payment", id: "pay_1", label: overrides?.label ?? "Invoice 4711" },
    context: { amount, approvers, requestedBy: overrides?.requestedBy ?? KOFI.id },
  });

describe("FIN-001 payment approval limit", () => {
  it("fails at USD 25,000 with a single distinct approver and summarises §7 style", () => {
    const ctx = makeCtx({ events: [payment(25_000, [DANIEL.id])] });
    const [result] = fin001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({
      requiredApprovers: 2,
      actualApprovers: 1,
      threshold: 25_000,
    });
    expect(fin001.summarize(result)).toBe(
      "Payment of USD 25,000.00 to Invoice 4711 was released with 1 distinct approver; 2 are required above USD 25,000.",
    );
  });

  it("fails at the USD 5,000 threshold with no approvers", () => {
    const ctx = makeCtx({ events: [payment(6_000, [])] });
    const [result] = fin001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({ requiredApprovers: 1, actualApprovers: 0 });
    expect(fin001.summarize(result)).toBe(
      "Payment of USD 6,000.00 to Invoice 4711 was released with 0 distinct approvers; 1 is required above USD 5,000.",
    );
  });

  it("fails when only the requester approved their own payment", () => {
    const ctx = makeCtx({ events: [payment(6_000, [KOFI.id], { requestedBy: KOFI.id })] });
    const [result] = fin001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed.actualApprovers).toBe(0);
  });

  it("passes with one non-requester approver at USD 6,000", () => {
    const ctx = makeCtx({ events: [payment(6_000, [DANIEL.id])] });
    const [result] = fin001.evaluate(ctx);
    expect(result.verdict).toBe("pass");
    expect(result.triggeringRefs).toEqual([]);
  });

  it("passes at USD 25,000 with two distinct non-requester approvers", () => {
    const ctx = makeCtx({ events: [payment(25_000, [DANIEL.id, "p_rmensah"])] });
    expect(fin001.evaluate(ctx)[0].verdict).toBe("pass");
  });

  it("passes below the low threshold", () => {
    const ctx = makeCtx({ events: [payment(4_999.99, [])] });
    const [result] = fin001.evaluate(ctx);
    expect(result.verdict).toBe("pass");
    expect(result.observed.requiredApprovers).toBe(0);
    expect(fin001.summarize(result)).toBe(
      "Payment of USD 4,999.99 to Invoice 4711 is below the approval threshold.",
    );
  });

  it("passes at USD 24,999.99 with one approver (only one required)", () => {
    const ctx = makeCtx({ events: [payment(24_999.99, [DANIEL.id])] });
    expect(fin001.evaluate(ctx)[0].verdict).toBe("pass");
  });

  it("fails at exactly USD 25,000 with duplicate approvers counted once", () => {
    const ctx = makeCtx({ events: [payment(25_000, [DANIEL.id, DANIEL.id])] });
    const [result] = fin001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed.actualApprovers).toBe(1);
  });

  it("ignores events that are not payment releases", () => {
    const ctx = makeCtx({
      events: [makeEvent({ action: "cash_deposit", context: { amount: 90_000 } })],
    });
    expect(fin001.evaluate(ctx)).toEqual([]);
  });

  it("is deterministic and never mutates the context", () => {
    const ctx = makeCtx({ events: [payment(25_000, [DANIEL.id])] });
    const probe = purityProbe(fin001, ctx);
    expect(probe.second).toEqual(probe.first);
    expect(probe.ctxUnchanged).toBe(true);
  });

  it("has no risk factors yet (spec defines none for FIN-001)", () => {
    const ctx = makeCtx({ events: [payment(25_000, [DANIEL.id])] });
    const [result] = fin001.evaluate(ctx);
    expect(fin001.riskFactors({ result, ctx, params: fin001.defaultParams })).toEqual([]);
  });
});
