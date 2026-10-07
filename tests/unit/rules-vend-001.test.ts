import { describe, it, expect } from "vitest";
import { vend001 } from "../../src/core/engine/rules/state/vend-001";
import type { Vendor, VendorDocument } from "../../src/core/types";
import { makeCtx, purityProbe, registers } from "./engine-fixture";

const doc = (
  type: VendorDocument["type"],
  expiresOn?: string,
  validFrom = "2025-01-01",
): VendorDocument => ({
  type,
  validFrom,
  ...(expiresOn ? { expiresOn } : {}),
});

const vendor = (
  tier: Vendor["tier"],
  documents: VendorDocument[],
  overrides?: Partial<Vendor>,
): Vendor => ({
  id: overrides?.id ?? `v_${tier}_test`,
  name: overrides?.name ?? "Meridian Freight Ltd",
  tier,
  ownerId: "p_efua",
  documents,
});

const ctx = (asOf: string, vendors: Vendor[]) =>
  makeCtx({ asOf, registers: registers({ vendors }) });

describe("VEND-001 vendor documents", () => {
  it("fails a critical vendor missing its SOC 2 report", () => {
    const result = vend001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [
        vendor("critical", [doc("contract"), doc("dpa", "2026-09-30"), doc("insurance", "2026-04-30")]),
      ]),
    )[0];
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({ docType: "soc2_report", state: "missing" });
    expect(vend001.summarize(result)).toBe(
      "Meridian Freight Ltd is missing a required SOC 2 report. Critical-tier vendors must hold a current SOC 2 report.",
    );
  });

  it("fails a critical vendor whose DPA expired", () => {
    const result = vend001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [
        vendor("critical", [
          doc("soc2_report", "2026-12-31"),
          doc("dpa", "2026-02-10"),
          doc("insurance", "2026-04-30"),
        ]),
      ]),
    )[0];
    expect(result.verdict).toBe("fail");
    expect(result.observed).toMatchObject({ docType: "dpa", state: "expired", expiresOn: "2026-02-10" });
    expect(vend001.summarize(result)).toBe(
      "Meridian Freight Ltd's DPA expired on 10 Feb 2026. Critical-tier vendors must hold a current DPA.",
    );
  });

  it("fails a standard vendor missing its DPA with medium severity", () => {
    const result = vend001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [vendor("standard", [doc("contract")])]),
    )[0];
    expect(result.verdict).toBe("fail");
    expect(result.observed.docType).toBe("dpa");
    expect(vend001.severityFor?.(result)).toBe("medium");
    expect(vend001.summarize(result)).toBe(
      "Meridian Freight Ltd is missing a required DPA. Standard-tier vendors must hold a current DPA.",
    );
  });

  it("passes a critical vendor holding every required document", () => {
    const result = vend001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [
        vendor("critical", [
          doc("soc2_report", "2026-12-31"),
          doc("dpa", "2026-12-31"),
          doc("insurance", "2026-10-31"),
        ]),
      ]),
    )[0];
    expect(result.verdict).toBe("pass");
    expect(vend001.severityFor?.(result)).toBe("high");
    expect(vend001.summarize(result)).toBe(
      "Meridian Freight Ltd holds every document required for the Critical tier.",
    );
  });

  it("passes a document expiring tomorrow (§6.1 boundary)", () => {
    const result = vend001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [
        vendor("critical", [
          doc("soc2_report", "2026-12-31"),
          doc("dpa", "2026-03-02"),
          doc("insurance", "2026-10-31"),
        ]),
      ]),
    )[0];
    expect(result.verdict).toBe("pass");
  });

  it("fails a document that expired yesterday", () => {
    const result = vend001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [
        vendor("critical", [
          doc("soc2_report", "2026-12-31"),
          doc("dpa", "2026-02-28"),
          doc("insurance", "2026-10-31"),
        ]),
      ]),
    )[0];
    expect(result.verdict).toBe("fail");
    expect(result.observed.state).toBe("expired");
  });

  it("passes a document expiring today (UTC day compare, inclusive)", () => {
    const result = vend001.evaluate(
      ctx("2026-03-01T23:59:00.000Z", [
        vendor("critical", [
          doc("soc2_report", "2026-12-31"),
          doc("dpa", "2026-03-01"),
          doc("insurance", "2026-10-31"),
        ]),
      ]),
    )[0];
    expect(result.verdict).toBe("pass");
  });

  it("reports the first required document missing in declared order", () => {
    const result = vend001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [
        vendor("critical", [doc("insurance", "2026-02-01")]),
      ]),
    )[0];
    expect(result.observed).toMatchObject({ docType: "soc2_report", state: "missing" });
  });

  it("treats a document without an expiry as always valid", () => {
    const result = vend001.evaluate(
      ctx("2026-03-01T09:00:00.000Z", [
        vendor("standard", [doc("dpa")]),
      ]),
    )[0];
    expect(result.verdict).toBe("pass");
  });

  it("is deterministic and never mutates the registers", () => {
    const context = ctx("2026-03-01T09:00:00.000Z", [
      vendor("critical", [doc("insurance", "2026-02-01")]),
    ]);
    const probe = purityProbe(vend001, context);
    expect(probe.second).toEqual(probe.first);
    expect(probe.ctxUnchanged).toBe(true);
  });
});
