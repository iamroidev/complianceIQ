import { describe, it, expect } from "vitest";
import { dead001 } from "../../src/core/engine/rules/state/dead-001";
import type { Obligation } from "../../src/core/types";
import { makeCtx, purityProbe, registers } from "./engine-fixture";

const obligation = (
  overrides?: Partial<Obligation> & { dueOn?: string },
): Obligation => ({
  id: overrides?.id ?? "ob_test",
  title: overrides?.title ?? "Annual penetration test",
  plainDescription: "Commission an independent penetration test once a year.",
  kind: overrides?.kind ?? "deadline",
  source: {
    documentId: "doc_secure_development",
    quote: "Customer-facing systems must undergo an independent penetration test at least annually.",
    quoteSpan: [0, 87],
  },
  dueOn: overrides?.dueOn,
  lastCompletedOn: overrides?.lastCompletedOn,
  status: overrides?.status ?? "confirmed",
  origin: "manual",
  ruleIds: [],
});

const ctx = (asOf: string, obligations: Obligation[]) =>
  makeCtx({ asOf, registers: registers({ obligations }) });

describe("DEAD-001 obligation deadlines", () => {
  it("fails inside the warning window with days remaining", () => {
    const result = dead001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: "2026-03-10" })]),
    )[0];
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({ mode: "warning", days: 9, dueOn: "2026-03-10" });
    expect(dead001.summarize(result)).toBe(
      "Annual penetration test is due in 9 days, on 10 Mar 2026. No completion evidence recorded.",
    );
  });

  it("fails past the due date as a breach", () => {
    const result = dead001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: "2026-02-20" })]),
    )[0];
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({ mode: "breach", days: 9 });
    expect(dead001.summarize(result)).toBe(
      "Annual penetration test was due on 20 Feb 2026, 9 days ago. No completion evidence recorded.",
    );
  });

  it("passes when the deadline is still in the future", () => {
    const result = dead001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: "2026-04-15" })]),
    )[0];
    expect(result.verdict).toBe("pass");
    expect(result.observed).toMatchObject({ mode: "future", days: 45 });
    expect(result.triggeringRefs).toEqual([]);
  });

  it("passes when completion evidence exists even after the due date", () => {
    const result = dead001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [
        obligation({ dueOn: "2026-02-20", lastCompletedOn: "2026-01-12" }),
      ]),
    )[0];
    expect(result.verdict).toBe("pass");
    expect(result.observed.mode).toBe("complete");
    expect(dead001.summarize(result)).toBe(
      "Annual penetration test has completion evidence recorded. It was due on 20 Feb 2026.",
    );
  });

  it("warns at exactly warningDays before the deadline", () => {
    const result = dead001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: "2026-03-15" })]),
    )[0];
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({ mode: "warning", days: 14 });
  });

  it("passes one day beyond the warning window", () => {
    const result = dead001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: "2026-03-16" })]),
    )[0];
    expect(result.verdict).toBe("pass");
    expect(result.observed).toMatchObject({ mode: "future", days: 15 });
  });

  it("warns with due-today wording on the deadline itself", () => {
    const result = dead001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: "2026-03-01" })]),
    )[0];
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({ mode: "warning", days: 0 });
    expect(dead001.summarize(result)).toBe(
      "Annual penetration test is due today, on 1 Mar 2026. No completion evidence recorded.",
    );
  });

  it("uses singular wording one day overdue", () => {
    const result = dead001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: "2026-02-28" })]),
    )[0];
    expect(result.observed).toMatchObject({ mode: "breach", days: 1 });
    expect(dead001.summarize(result)).toBe(
      "Annual penetration test was due on 28 Feb 2026, 1 day ago. No completion evidence recorded.",
    );
  });

  it("skips proposed obligations", () => {
    expect(
      dead001.evaluate(
        ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: "2026-02-20", status: "proposed" })]),
      ),
    ).toEqual([]);
  });

  it("skips obligations without a due date", () => {
    expect(
      dead001.evaluate(ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: undefined })])),
    ).toEqual([]);
  });

  it("respects a custom warning window", () => {
    const result = dead001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: "2026-03-10" })]),
      { warningDays: 3 },
    )[0];
    expect(result.verdict).toBe("pass");
    expect(result.observed.mode).toBe("future");
  });

  it("grades breach as critical and warning as medium", () => {
    const breach = dead001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: "2026-02-20" })]),
    )[0];
    expect(dead001.severityFor?.(breach)).toBe("critical");
    const warning = dead001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: "2026-03-10" })]),
    )[0];
    expect(dead001.severityFor?.(warning)).toBe("medium");
  });

  it("is deterministic and never mutates the registers", () => {
    const context = ctx("2026-03-01T09:00:00.000Z", [obligation({ dueOn: "2026-03-10" })]);
    const probe = purityProbe(dead001, context);
    expect(probe.second).toEqual(probe.first);
    expect(probe.ctxUnchanged).toBe(true);
  });
});
