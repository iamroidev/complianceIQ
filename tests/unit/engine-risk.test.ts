import { describe, it, expect } from "vitest";
import { assessRisk, severityAfterRisk } from "../../src/core/engine/risk";
import { aml001 } from "../../src/core/engine/rules/event/aml-001";
import { cert001 } from "../../src/core/engine/rules/state/cert-001";
import type { AnyRuleModule } from "../../src/core/engine/types";
import type { RuleResult } from "../../src/core/types";
import { KOFI, makeCtx, makeEvent, registers } from "./engine-fixture";

const deposit = (amount: number, timestamp: string, id: string) =>
  makeEvent({
    id,
    action: "cash_deposit",
    actor: KOFI,
    context: { amount, currency: "USD" },
    timestamp,
  });

const pairCtx = (asOf = "2026-01-12T09:00:00.000Z") =>
  makeCtx({
    asOf,
    events: [
      deposit(9_800, "2026-01-10T09:00:00.000Z", "evt_a"),
      deposit(9_400, "2026-01-11T19:00:00.000Z", "evt_b"),
    ],
  });

describe("assessRisk", () => {
  it("returns the severity base when no factors trigger", () => {
    const ctx = pairCtx();
    const [result] = aml001.evaluate(ctx);
    expect(aml001.severityFor?.(result)).toBe("high");
    expect(assessRisk(aml001, result, ctx)).toEqual({ riskScore: 35, riskReasons: [] });
  });

  it("adds extra-deposit and doubled-sum factors with ordered reasons", () => {
    const ctx = makeCtx({
      asOf: "2026-01-13T09:00:00.000Z",
      events: [
        deposit(9_800, "2026-01-10T09:00:00.000Z", "evt_a"),
        deposit(9_700, "2026-01-11T09:00:00.000Z", "evt_b"),
        deposit(9_900, "2026-01-12T09:00:00.000Z", "evt_c"),
      ],
    });
    const [result] = aml001.evaluate(ctx);
    const assessment = assessRisk(aml001, result, ctx);
    expect(assessment).toEqual({
      riskScore: 70,
      riskReasons: [
        "Combined amount reached twice the reporting limit",
        "3 deposits in the band, above the 2 minimum",
      ],
    });
  });

  it("adds a prior-alert factor only inside the 90-day lookback", () => {
    const ctx = pairCtx();
    const [result] = aml001.evaluate(ctx);
    const recent = assessRisk(aml001, result, ctx, {
      history: { priorAlerts: [{ subjectId: KOFI.id, createdAt: "2026-01-11T09:00:00.000Z" }] },
    });
    expect(recent.riskScore).toBe(45);
    expect(recent.riskReasons).toEqual(["A prior alert for this subject in the last 90 days"]);
    const stale = assessRisk(aml001, result, ctx, {
      history: { priorAlerts: [{ subjectId: KOFI.id, createdAt: "2025-06-01T09:00:00.000Z" }] },
    });
    expect(stale.riskScore).toBe(35);
    const otherSubject = assessRisk(aml001, result, ctx, {
      history: { priorAlerts: [{ subjectId: "p_someone_else", createdAt: "2026-01-11T09:00:00.000Z" }] },
    });
    expect(otherSubject.riskScore).toBe(35);
  });

  it("combines CERT-001 factors: criticality, overdue days, privileged access", () => {
    const ctx = makeCtx({
      asOf: "2026-03-01T09:00:00.000Z",
      registers: registers({
        people: [
          {
            id: "p_nurse",
            name: "Nurse Boateng",
            role: "Clinical nurse",
            department: "Clinical",
            status: "active",
          },
        ],
        requirements: [
          {
            id: "req_firstaid",
            appliesTo: { department: "Clinical" },
            certType: "First Aid",
            criticality: "high",
            obligationId: "ob_firstaid_renewal",
          },
        ],
        certifications: [
          {
            id: "cert_1",
            personId: "p_nurse",
            type: "First Aid",
            issuedOn: "2024-01-15",
            expiresOn: "2026-01-15",
          },
        ],
        accounts: [
          {
            id: "acc_1",
            personId: "p_nurse",
            system: "Electronic health record",
            privileged: true,
            lastActiveOn: "2026-02-28",
            mfaEnabled: true,
          },
        ],
      }),
    });
    const [result] = cert001.evaluate(ctx);
    expect(result.verdict).toBe("fail");
    expect(result.observed.daysExpired).toBe(45);
    expect(assessRisk(cert001, result, ctx)).toEqual({
      riskScore: 70,
      riskReasons: [
        "The role requires a high-criticality certification",
        "Certification overdue by 45 days",
        "The person holds privileged access",
      ],
    });
  });

  it("clamps the score at 100", () => {
    const base = Date.parse("2026-01-10T00:00:00.000Z");
    const events = Array.from({ length: 10 }, (_, index) =>
      deposit(9_500, new Date(base + index * 4 * 3_600_000).toISOString(), `evt_${index}`),
    );
    const ctx = makeCtx({
      asOf: "2026-01-20T09:00:00.000Z",
      events,
    });
    const [result] = aml001.evaluate(ctx);
    expect(result.observed.depositCount).toBe(10);
    const assessment = assessRisk(aml001, result, ctx, {
      history: { priorAlerts: [{ subjectId: KOFI.id, createdAt: "2026-01-19T09:00:00.000Z" }] },
    });
    expect(assessment.riskScore).toBe(100);
    expect(assessment.riskReasons).toEqual([
      "10 deposits in the band, above the 2 minimum",
      "Combined amount reached twice the reporting limit",
      "A prior alert for this subject in the last 90 days",
    ]);
  });

  it("keeps only the top three reasons regardless of factor count", () => {
    const fakeRule: AnyRuleModule = {
      meta: {
        id: "FAKE-001",
        name: "Reason capping fixture",
        description: "Synthetic rule used to exercise reason ordering.",
        domain: "regulatory",
        severity: "medium",
        tier: 1,
        kind: "state",
        dossier: "exception_memo",
      },
      defaultParams: {},
      kind: "state",
      evaluate: () => [],
      riskFactors: () => [
        { points: 5, reason: "e" },
        { points: 4, reason: "d" },
        { points: 3, reason: "c" },
        { points: 2, reason: "b" },
        { points: 1, reason: "a" },
      ],
      summarize: () => "",
    };
    const result: RuleResult = {
      ruleId: "FAKE-001",
      ruleVersion: "1",
      verdict: "pass",
      subject: { id: "s1", name: "Subject" },
      triggeringRefs: [],
      observed: {},
      parameters: {},
    };
    expect(assessRisk(fakeRule, result, makeCtx())).toEqual({
      riskScore: 40,
      riskReasons: ["e", "d", "c"],
    });
  });
});

describe("severityAfterRisk", () => {
  it("raises severity across band edges and never lowers it", () => {
    expect(severityAfterRisk("low", 49)).toBe("low");
    expect(severityAfterRisk("low", 50)).toBe("medium");
    expect(severityAfterRisk("medium", 59)).toBe("medium");
    expect(severityAfterRisk("medium", 60)).toBe("high");
    expect(severityAfterRisk("high", 69)).toBe("high");
    expect(severityAfterRisk("high", 70)).toBe("critical");
    expect(severityAfterRisk("critical", 100)).toBe("critical");
    expect(severityAfterRisk("critical", 0)).toBe("critical");
    expect(severityAfterRisk("high", 0)).toBe("high");
    expect(severityAfterRisk("low", 100)).toBe("critical");
  });
});
