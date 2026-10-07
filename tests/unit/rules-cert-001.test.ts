import { describe, it, expect } from "vitest";
import { cert001 } from "../../src/core/engine/rules/state/cert-001";
import type { Certification, Person, Requirement } from "../../src/core/types";
import { makeCtx, purityProbe, registers } from "./engine-fixture";

const NURSE: Person = {
  id: "p_nurse",
  name: "Nurse Boateng",
  role: "Clinical nurse",
  department: "Clinical",
  status: "active",
};

const REQ: Requirement = {
  id: "req_firstaid",
  appliesTo: { department: "Clinical" },
  certType: "First Aid",
  criticality: "high",
  obligationId: "ob_firstaid_renewal",
};

const cert = (
  overrides?: Partial<Certification> & { personId?: string },
): Certification => ({
  id: overrides?.id ?? "cert_1",
  personId: overrides?.personId ?? NURSE.id,
  type: overrides?.type ?? "First Aid",
  issuedOn: overrides?.issuedOn ?? "2024-03-15",
  ...(overrides?.expiresOn ? { expiresOn: overrides.expiresOn } : {}),
});

const ctx = (asOf: string, people: Person[], certs: Certification[], reqs = [REQ]) =>
  makeCtx({
    asOf,
    registers: registers({ people, certifications: certs, requirements: reqs }),
  });

describe("CERT-001 required certification", () => {
  it("passes on the expiry day itself (UTC day compare)", () => {
    const result = cert001.evaluate(
      ctx("2026-03-12T23:30:00.000Z", [NURSE], [cert({ expiresOn: "2026-03-12" })]),
    )[0];
    expect(result.verdict).toBe("pass");
    expect(cert001.summarize(result)).toBe(
      "Nurse Boateng's First Aid certificate is valid. The role requires it.",
    );
  });

  it("fails the day after expiry and uses singular day wording", () => {
    const result = cert001.evaluate(
      ctx("2026-03-13T00:30:00.000Z", [NURSE], [cert({ expiresOn: "2026-03-12" })]),
    )[0];
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({
      expiresOn: "2026-03-12",
      daysExpired: 1,
      criticality: "high",
    });
    expect(cert001.summarize(result)).toBe(
      "Nurse Boateng's First Aid certificate expired on 12 Mar 2026, 1 day ago. The role requires it.",
    );
  });

  it("fails when the certificate is missing entirely", () => {
    const result = cert001.evaluate(ctx("2026-03-01T09:00:00.000Z", [NURSE], []))[0];
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({ expiresOn: "none", daysExpired: 0 });
    expect(cert001.summarize(result)).toBe(
      "Nurse Boateng has no First Aid certificate on file. The role requires it.",
    );
  });

  it("honours the grace period: valid one day after expiry", () => {
    const result = cert001.evaluate(
      ctx("2026-03-13T09:00:00.000Z", [NURSE], [cert({ expiresOn: "2026-03-12" })]),
      { graceDays: 1 },
    )[0];
    expect(result.verdict).toBe("pass");
  });

  it("fails two days after expiry when the grace period is one day", () => {
    const result = cert001.evaluate(
      ctx("2026-03-14T09:00:00.000Z", [NURSE], [cert({ expiresOn: "2026-03-12" })]),
      { graceDays: 1 },
    )[0];
    expect(result.verdict).toBe("fail");
    expect(result.observed.daysExpired).toBe(2);
  });

  it("handles a leap-day expiry", () => {
    const valid = cert001.evaluate(
      ctx("2028-02-29T12:00:00.000Z", [NURSE], [cert({ expiresOn: "2028-02-29" })]),
    )[0];
    expect(valid.verdict).toBe("pass");
    const expired = cert001.evaluate(
      ctx("2028-03-01T00:00:00.000Z", [NURSE], [cert({ expiresOn: "2028-02-29" })]),
    )[0];
    expect(expired.verdict).toBe("fail");
    expect(expired.observed.daysExpired).toBe(1);
  });

  it("skips people on leave", () => {
    const onLeave: Person = { ...NURSE, id: "p_leave", name: "On Leave", status: "leave" };
    expect(cert001.evaluate(ctx("2026-03-13T09:00:00.000Z", [onLeave], []))).toEqual([]);
  });

  it("skips people the requirement does not cover", () => {
    const engineer: Person = {
      id: "p_eng",
      name: "Dev Engineer",
      role: "Developer",
      department: "Engineering",
      status: "active",
    };
    expect(cert001.evaluate(ctx("2026-03-13T09:00:00.000Z", [engineer], []))).toEqual([]);
  });

  it("reports the latest expiry among expired certificates", () => {
    const result = cert001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [NURSE], [
        cert({ id: "cert_a", expiresOn: "2026-01-01" }),
        cert({ id: "cert_b", expiresOn: "2026-02-01" }),
      ]),
    )[0];
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({ expiresOn: "2026-02-01", daysExpired: 28 });
  });

  it("grades severity from requirement criticality", () => {
    const failed = cert001.evaluate(ctx("2026-03-13T09:00:00.000Z", [NURSE], []))[0];
    expect(cert001.severityFor?.(failed)).toBe("high");
    const standard = cert001.evaluate(
      makeCtx({
        asOf: "2026-03-01T09:00:00.000Z",
        registers: registers({
          people: [NURSE],
          requirements: [{ ...REQ, id: "req_sec", certType: "Security awareness", criticality: "standard" }],
        }),
      }),
    )[0];
    expect(cert001.severityFor?.(standard)).toBe("medium");
  });

  it("is deterministic and never mutates the registers", () => {
    const context = ctx("2026-03-13T09:00:00.000Z", [NURSE], [cert({ expiresOn: "2026-03-12" })]);
    const probe = purityProbe(cert001, context);
    expect(probe.second).toEqual(probe.first);
    expect(probe.ctxUnchanged).toBe(true);
  });
});
