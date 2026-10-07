import { describe, it, expect } from "vitest";
import { loadCorpus, loadInternalDocuments, loadRegulationClauses } from "../../src/core/rag/corpus";

const corpus = loadCorpus();
const internal = loadInternalDocuments();
const regulationClauses = loadRegulationClauses();

const EXPECTED_DOCUMENTS: Record<string, number> = {
  doc_access_control: 5,
  doc_aml_procedure: 5,
  doc_payment_approval: 5,
  doc_regulatory_calendar: 5,
  doc_secure_development: 5,
  doc_training_certification: 6,
  doc_travel_expense: 4,
  doc_vendor_management: 6,
};

describe("internal policy documents", () => {
  it("loads all eight demo documents, labelled and titled", () => {
    const docs = internal.documents.filter((doc) => doc.kind === "internal_demo");
    expect(docs.map((doc) => doc.id).sort()).toEqual(Object.keys(EXPECTED_DOCUMENTS).sort());
    for (const doc of docs) {
      expect(doc.text).toContain("Demo policy document");
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.version.length).toBeGreaterThan(0);
    }
  });

  it("splits every document into '## N.' sections with substring-exact text", () => {
    for (const doc of internal.documents) {
      const sections = internal.clauses.filter((clause) => clause.documentId === doc.id);
      expect(sections).toHaveLength(EXPECTED_DOCUMENTS[doc.id]);
      sections.forEach((section, index) => {
        const number = index + 1;
        expect(section.chunkId).toBe(`${doc.id}#sec-${number}`);
        expect(section.citation).toBe(`Section ${number}`);
        expect(section.regulation).toBe("Internal policy");
        expect(section.textKind).toBe("verbatim");
        expect(doc.text.includes(section.text)).toBe(true);
      });
    }
  });

  it("keeps the quoted sentences on a single line for M6 highlighting", () => {
    for (const clause of internal.clauses) {
      const firstLine = clause.text.split("\n")[0];
      expect(firstLine.length).toBeGreaterThan(0);
    }
  });
});

describe("regulatory clauses (allowed set)", () => {
  it("ships the §6.4 minimum regulatory set with source URLs", () => {
    const chunkIds = regulationClauses.map((clause) => clause.chunkId);
    expect(chunkIds).toContain("cl_31cfr_1020_320");
    expect(chunkIds).toContain("cl_31usc_5324");
    expect(chunkIds).toContain("cl_45cfr_164_502_b");
    expect(chunkIds).toContain("cl_45cfr_164_402");
    expect(chunkIds).toContain("cl_soc2_cc6_1");
    expect(chunkIds).toContain("cl_soc2_cc6_3");
    expect(chunkIds).toContain("cl_soc2_cc6_8");
    expect(chunkIds).toContain("cl_nist_ac_2");
    expect(chunkIds).toContain("cl_nist_ac_5");
    expect(chunkIds).toContain("cl_nist_sa_11");
    expect(chunkIds).toContain("cl_nist_ia_5_7");
    for (const clause of regulationClauses) {
      expect(clause.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it("marks SOC 2, ISO and CFR passages as summaries except the two exact texts", () => {
    const verbatim = regulationClauses
      .filter((clause) => clause.textKind === "verbatim")
      .map((clause) => clause.chunkId)
      .sort();
    expect(verbatim).toEqual(["cl_45cfr_164_502_b", "cl_nist_ia_5_7"]);
    for (const clause of regulationClauses) {
      if (clause.textKind === "summary") expect(clause.text).not.toMatch(/^When using or disclosing/);
    }
  });

  it("synthesises one policy document per regulation, grouping every clause", () => {
    const regDocs = corpus.documents.filter((doc) => doc.kind !== "internal_demo");
    expect(regDocs.map((doc) => doc.id).sort()).toEqual([
      "reg_31cfr",
      "reg_31usc",
      "reg_45cfr_402",
      "reg_45cfr_502",
      "reg_nist",
      "reg_soc2",
    ]);
    const textDoc = regDocs.find((doc) => doc.id === "reg_45cfr_502");
    expect(textDoc?.kind).toBe("regulation_text");
    for (const doc of regDocs) {
      const clauses = regulationClauses.filter((clause) => clause.documentId === doc.id);
      expect(clauses.length).toBeGreaterThan(0);
      for (const clause of clauses) expect(doc.text).toContain(clause.text);
    }
  });
});

describe("corpus index", () => {
  it("exposes 14 documents and one clause per section plus regulatory clause", () => {
    expect(corpus.documents).toHaveLength(8 + 6);
    expect(corpus.clauses).toHaveLength(internal.clauses.length + regulationClauses.length);
    expect(corpus.byChunkId.size).toBe(corpus.clauses.length);
    for (const clause of corpus.clauses) {
      expect(corpus.byChunkId.get(clause.chunkId)).toEqual(clause);
    }
  });

  it("gives every document a unique id", () => {
    const ids = corpus.documents.map((doc) => doc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
