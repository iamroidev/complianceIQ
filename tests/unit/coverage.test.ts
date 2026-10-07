import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHECK_RECENCY_MS,
  computeCoverage,
  coverageHeadline,
} from "../../src/core/coverage/compute";
import { loadSeedRegisters } from "../../src/core/engine/seed";
import type { Obligation } from "../../src/core/types";

const AS_OF = "2026-03-01T09:00:00.000Z";

describe("computeCoverage (§7.4 D)", () => {
  const obligations = loadSeedRegisters().obligations;
  const byId = new Map(obligations.map((obligation) => [obligation.id, obligation]));
  const one = (id: string): Obligation => structuredClone(byId.get(id)!);

  it("maps the seed into partial and gap, never covered without a check", () => {
    const items = computeCoverage({ obligations, asOf: AS_OF });
    expect(items).toHaveLength(54);
    expect(items.filter((item) => item.status === "gap")).toHaveLength(15);
    expect(items.filter((item) => item.status === "partial")).toHaveLength(39);
    expect(items.filter((item) => item.status === "covered")).toHaveLength(0);

    const firstAid = items.find((item) => item.obligationId === "ob_firstaid_renewal")!;
    expect(firstAid).toMatchObject({ status: "partial", ruleIds: ["CERT-001"] });
    expect(firstAid.reason).toBe("Checked by CERT-001 but no passing check recorded.");
    expect(firstAid.lastPassedAt).toBeUndefined();

    const gap = items.find((item) => item.obligationId === "ob_access_review")!;
    expect(gap.status).toBe("gap");
    expect(gap.ruleIds).toEqual([]);
    expect(gap.reason).toBe("No automated check maps to this obligation.");
  });

  it("headline follows the DESIGN wording with the real seed numbers", () => {
    const items = computeCoverage({ obligations, asOf: AS_OF });
    expect(coverageHeadline(items)).toBe(
      "39 of 54 obligations are checked automatically. 15 have no check.",
    );
  });

  it("headline counts any non-gap item as checked", () => {
    const items = computeCoverage({ obligations: [one("ob_firstaid_renewal"), one("ob_access_review")], asOf: AS_OF });
    expect(coverageHeadline(items)).toBe("1 of 2 obligations are checked automatically. 1 have no check.");
  });

  it("a recent passing check makes an obligation covered", () => {
    const items = computeCoverage({
      obligations,
      asOf: AS_OF,
      passingChecks: { ob_firstaid_renewal: "2026-02-28T09:00:00.000Z" },
    });
    const firstAid = items.find((item) => item.obligationId === "ob_firstaid_renewal")!;
    expect(firstAid.status).toBe("covered");
    expect(firstAid.lastPassedAt).toBe("2026-02-28T09:00:00.000Z");
    expect(firstAid.reason).toBe(
      "Confirmed and checked by CERT-001; last passed 2026-02-28T09:00:00.000Z.",
    );
  });

  it("recency boundary: exactly recencyMs old is covered, one ms older is stale", () => {
    const recencyMs = 1000;
    const fresh = new Date(Date.parse(AS_OF) - 1000).toISOString();
    const stale = new Date(Date.parse(AS_OF) - 1001).toISOString();

    const covered = computeCoverage({
      obligations: [one("ob_firstaid_renewal")],
      passingChecks: { ob_firstaid_renewal: fresh },
      asOf: AS_OF,
      recencyMs,
    });
    expect(covered[0].status).toBe("covered");

    const expired = computeCoverage({
      obligations: [one("ob_firstaid_renewal")],
      passingChecks: { ob_firstaid_renewal: stale },
      asOf: AS_OF,
      recencyMs,
    });
    expect(expired[0].status).toBe("partial");
    expect(expired[0].lastPassedAt).toBe(stale);
    expect(expired[0].reason).toBe(
      "Checked by CERT-001; the last passing check is outside the recent window.",
    );
  });

  it("the default recency window is 90 days", () => {
    expect(DEFAULT_CHECK_RECENCY_MS).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it("a passing check dated after asOf counts as no passing check", () => {
    const items = computeCoverage({
      obligations: [one("ob_firstaid_renewal")],
      passingChecks: { ob_firstaid_renewal: "2026-03-02T09:00:00.000Z" },
      asOf: AS_OF,
    });
    expect(items[0].status).toBe("partial");
    expect(items[0].lastPassedAt).toBeUndefined();
  });

  it("rejected obligations drop out of the report", () => {
    const rejected = one("ob_firstaid_renewal");
    rejected.status = "rejected";
    const items = computeCoverage({ obligations: [rejected, one("ob_access_review")], asOf: AS_OF });
    expect(items).toHaveLength(1);
    expect(items[0].obligationId).toBe("ob_access_review");
  });

  it("awaiting confirmation reads as partial for ruled obligations and gap for unruled", () => {
    const proposed = one("ob_firstaid_renewal");
    proposed.status = "proposed";
    const proposedGap = one("ob_access_review");
    proposedGap.status = "proposed";
    const items = computeCoverage({ obligations: [proposed, proposedGap], asOf: AS_OF });
    expect(items[0].status).toBe("partial");
    expect(items[0].reason).toBe("Awaiting confirmation; checked by CERT-001 once confirmed.");
    expect(items[1].status).toBe("gap");
    expect(items[1].reason).toBe(
      "Awaiting confirmation; no automated check maps to this obligation.",
    );
  });

  it("a gap obligation keeps a recorded lastPassedAt when one exists", () => {
    const items = computeCoverage({
      obligations: [one("ob_access_review")],
      passingChecks: { ob_access_review: "2026-02-20T09:00:00.000Z" },
      asOf: AS_OF,
    });
    expect(items[0].status).toBe("gap");
    expect(items[0].lastPassedAt).toBe("2026-02-20T09:00:00.000Z");
  });
});
