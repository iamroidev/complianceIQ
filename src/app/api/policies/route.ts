import { NextRequest } from "next/server";
import { loadCorpus } from "@/core/rag/corpus";
import type { PolicyCard } from "@/lib/policy-copy";
import mappingJson from "@/data/policy/mapping.json";
import { errorResponse, ok, roleOf } from "../_http";
import { getState } from "../_state";

/**
 * Policies list (DESIGN §7): every document in the corpus with how many
 * sections it has, how many obligations were taken from it and which checks
 * read it. The rule-to-clause mapping (MASTER §6.5) is the source of the
 * check counts - nothing here is inferred.
 */
export async function GET(request: NextRequest) {
  try {
    roleOf(request);
    const state = await getState();
    const corpus = loadCorpus();
    const mapping = mappingJson as Record<string, string[]>;

    const cards: PolicyCard[] = corpus.documents.map((document) => {
      const obligations = state.registers.obligations.filter(
        (obligation) => obligation.source.documentId === document.id,
      ).length;
      const checks = Object.entries(mapping)
        .filter(([, chunks]) =>
          chunks.some((chunk) => corpus.byChunkId.get(chunk)?.documentId === document.id),
        )
        .map(([ruleId]) => ruleId)
        .sort();
      return {
        id: document.id,
        title: document.title,
        kind: document.kind,
        version: document.version,
        sections: corpus.clauses.filter((clause) => clause.documentId === document.id).length,
        obligations,
        checks,
      };
    });

    return ok({ policies: cards });
  } catch (error) {
    return errorResponse(error);
  }
}
