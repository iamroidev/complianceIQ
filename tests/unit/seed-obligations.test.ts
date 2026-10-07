import { describe, it, expect } from "vitest";
import { loadSeedRegisters } from "../../src/core/engine/seed";
import { loadCorpus } from "../../src/core/rag/corpus";
import { TIER1_RULES } from "../../src/core/engine/rules/index";

const seed = loadSeedRegisters();
const obligations = seed.obligations;
const corpus = loadCorpus();

const documents = new Map(corpus.documents.map((doc) => [doc.id, doc]));
const internalDocIds = new Set(
  corpus.documents.filter((doc) => doc.kind === "internal_demo").map((doc) => doc.id),
);
const ruleIds = new Set(TIER1_RULES.map((rule) => rule.meta.id));

const mapped = obligations.filter((obligation) => obligation.ruleIds.length > 0);
const gaps = obligations.filter((obligation) => obligation.ruleIds.length === 0);

describe("obligations register (seed)", () => {
  it("ships 54 confirmed manual obligations with unique ids", () => {
    expect(obligations).toHaveLength(54);
    expect(new Set(obligations.map((o) => o.id)).size).toBe(54);
    for (const obligation of obligations) {
      expect(obligation.status).toBe("confirmed");
      expect(obligation.origin).toBe("manual");
      expect(obligation.plainDescription.length).toBeGreaterThan(10);
    }
  });

  it("keeps 6-10 obligations in each of the eight demo documents", () => {
    const byDoc = new Map<string, number>();
    for (const obligation of obligations) {
      expect(internalDocIds.has(obligation.source.documentId), obligation.id).toBe(true);
      byDoc.set(obligation.source.documentId, (byDoc.get(obligation.source.documentId) ?? 0) + 1);
    }
    expect(byDoc.size).toBe(8);
    for (const [documentId, count] of byDoc) {
      expect(count, documentId).toBeGreaterThanOrEqual(6);
      expect(count, documentId).toBeLessThanOrEqual(10);
    }
  });

  it("stores an exact quote span into the source document, quoted once", () => {
    for (const obligation of obligations) {
      const doc = documents.get(obligation.source.documentId);
      expect(doc, obligation.id).toBeDefined();
      const [start, end] = obligation.source.quoteSpan;
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeGreaterThan(start);
      expect(doc!.text.slice(start, end)).toBe(obligation.source.quote);
      expect(doc!.text.indexOf(obligation.source.quote)).toBe(start);
      expect(doc!.text.indexOf(obligation.source.quote, start + 1)).toBe(-1);
    }
  });

  it("maps 39 of 54 obligations to a rule (roughly 75% by design), leaving 15 gaps", () => {
    expect(mapped).toHaveLength(39);
    expect(gaps).toHaveLength(15);
    expect(mapped.length / obligations.length).toBeGreaterThanOrEqual(0.7);
  });

  it("keeps the §6.4 named coverage-gap examples unmapped", () => {
    const accessReview = obligations.find((o) => o.id === "ob_access_review");
    const offboarding = obligations.find((o) => o.id === "ob_offboarding");
    expect(accessReview?.ruleIds).toEqual([]);
    expect(offboarding?.ruleIds).toEqual([]);
    expect(accessReview?.source.quote).toBe("Access reviews must be completed every January.");
    expect(offboarding?.source.quote).toBe(
      "Vendor access must be revoked within 30 days of contract termination.",
    );
  });

  it("only references Tier 1 rules, and DEAD-001 checks exactly the dated obligations", () => {
    for (const obligation of obligations) {
      for (const ruleId of obligation.ruleIds) expect(ruleIds.has(ruleId), ruleId).toBe(true);
      const hasDueDate = obligation.dueOn !== undefined;
      const hasDead = obligation.ruleIds.includes("DEAD-001");
      expect(hasDueDate, obligation.id).toBe(hasDead);
      if (hasDueDate) expect(obligation.dueOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(obligations.filter((o) => o.dueOn)).toHaveLength(18);
  });

  it("keeps undated renewals out of DEAD-001's reach (no stale due dates)", () => {
    const undatedRenewals = obligations
      .filter((o) => o.cadence === "annual" && !o.dueOn)
      .map((o) => o.id)
      .sort();
    expect(undatedRenewals).toEqual([
      "ob_access_review",
      "ob_aml_training",
      "ob_firstaid_renewal",
      "ob_security_awareness",
      "ob_vendor_insurance_renewal",
    ]);
  });
});
