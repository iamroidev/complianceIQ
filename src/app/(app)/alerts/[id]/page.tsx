import { Workbench } from "@/components/workspace/Workbench";
import type { ClauseMap, DocumentMap, RuleInfo } from "@/components/workspace/case-text";
import { TIER1_RULES } from "@/core/engine/rules";
import { loadCorpus } from "@/core/rag/corpus";

/**
 * Case workbench route. The rule metas and policy text are fixed data, so
 * they are resolved once on the server; all case data is fetched from the
 * Tier 1 API inside the client workbench.
 */
let data: { rules: RuleInfo[]; clauses: ClauseMap; documents: DocumentMap } | null = null;

function workbenchData(): { rules: RuleInfo[]; clauses: ClauseMap; documents: DocumentMap } {
  if (data) return data;
  const corpus = loadCorpus();
  const clauses: ClauseMap = {};
  for (const clause of corpus.clauses) clauses[clause.chunkId] = clause;
  const documents: DocumentMap = {};
  for (const document of corpus.documents) documents[document.id] = document.title;
  const rules: RuleInfo[] = TIER1_RULES.map((module) => ({
    id: module.meta.id,
    name: module.meta.name,
    description: module.meta.description,
  }));
  data = { rules, clauses, documents };
  return data;
}

export default async function AlertCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rules, clauses, documents } = workbenchData();
  return <Workbench alertId={id} rules={rules} clauses={clauses} documents={documents} />;
}
