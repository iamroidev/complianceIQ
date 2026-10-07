import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PolicyClause, PolicyDocument } from "../types";
import clausesJson from "../../data/policy/clauses.json";
import { documentTitle, documentVersion, parseSections } from "./parse";

export type Corpus = {
  documents: PolicyDocument[];
  clauses: PolicyClause[];
  byChunkId: Map<string, PolicyClause>;
};

const DOCUMENTS_DIR = "documents";

/** Titles for the synthesised regulation documents, keyed by clause documentId. */
const REGULATION_DOCUMENTS: Record<
  string,
  { title: string; kind: "regulation_summary" | "regulation_text" }
> = {
  reg_31cfr: { title: "31 CFR — Bank Secrecy Act reporting (summary)", kind: "regulation_summary" },
  reg_31usc: { title: "31 U.S.C. § 5324 — Structuring prohibited (summary)", kind: "regulation_summary" },
  reg_45cfr_502: { title: "45 CFR § 164.502 — Uses and disclosures of PHI", kind: "regulation_text" },
  reg_45cfr_402: { title: "45 CFR § 164.402 — Definition of breach (summary)", kind: "regulation_summary" },
  reg_soc2: { title: "SOC 2 Trust Services Criteria CC6 — Summary", kind: "regulation_summary" },
  reg_nist: { title: "NIST SP 800-53 Rev. 5 — Access control and developer controls", kind: "regulation_summary" },
};

function policyRoot(): string {
  return join(process.cwd(), "src", "data", "policy");
}

/** Regulatory clauses from the allowed set (clauses.json), zod-validated. */
export function loadRegulationClauses(): PolicyClause[] {
  const clauses = clausesJson.map((clause) => PolicyClause.parse(clause));
  const seen = new Set<string>();
  for (const clause of clauses) {
    if (seen.has(clause.chunkId)) throw new Error(`Duplicate chunkId in clauses.json: ${clause.chunkId}`);
    seen.add(clause.chunkId);
  }
  return clauses;
}

/** Internal demo policy documents from markdown, split into section clauses. */
export function loadInternalDocuments(): { documents: PolicyDocument[]; clauses: PolicyClause[] } {
  const dir = join(policyRoot(), DOCUMENTS_DIR);
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort();
  if (files.length === 0) throw new Error(`No policy documents found in ${dir}`);

  const documents: PolicyDocument[] = [];
  const clauses: PolicyClause[] = [];
  for (const file of files) {
    const id = file.replace(/\.md$/, "");
    const text = readFileSync(join(dir, file), "utf8");
    documents.push(
      PolicyDocument.parse({
        id,
        title: documentTitle(text),
        kind: "internal_demo",
        version: documentVersion(text),
        text,
      }),
    );
    for (const section of parseSections(id, text)) clauses.push(PolicyClause.parse(section));
  }
  return { documents, clauses };
}

/** Synthesised PolicyDocuments for each regulation covered by clauses.json. */
function loadRegulationDocuments(clauses: PolicyClause[]): PolicyDocument[] {
  const grouped = new Map<string, PolicyClause[]>();
  for (const clause of clauses) {
    const list = grouped.get(clause.documentId) ?? [];
    list.push(clause);
    grouped.set(clause.documentId, list);
  }
  return [...grouped.entries()]
    .map(([id, group]) => {
      const meta = REGULATION_DOCUMENTS[id];
      if (!meta) throw new Error(`clauses.json references unknown regulation document: ${id}`);
      return PolicyDocument.parse({
        id,
        title: meta.title,
        kind: meta.kind,
        version: "as of 2026-03-01",
        text: group.map((clause) => clause.text).join("\n\n"),
      });
    })
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

export function loadCorpus(): Corpus {
  const regulationClauses = loadRegulationClauses();
  const internal = loadInternalDocuments();
  const clauses = [...internal.clauses, ...regulationClauses];
  const byChunkId = new Map<string, PolicyClause>();
  for (const clause of clauses) {
    if (byChunkId.has(clause.chunkId)) throw new Error(`Duplicate chunkId: ${clause.chunkId}`);
    byChunkId.set(clause.chunkId, clause);
  }
  return {
    documents: [...internal.documents, ...loadRegulationDocuments(regulationClauses)],
    clauses,
    byChunkId,
  };
}
