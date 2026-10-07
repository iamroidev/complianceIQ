export interface AiPrompt {
  system: string;
  user: string;
}

const RETURN_SCHEMA =
  'Return JSON only: {"paragraphs": [{"heading": string, "text": string, "citations": string[], "evidenceRefs": [{"type": "event" | "record" | "evidence", "id": string}]}]}.';

const SHARED_RULES = [
  "Use only the numbers and names that appear in the fact block.",
  "Cite only policy chunk ids that appear in the fact block.",
  "Never write: guilty, committed a crime, compliant with, certified, filed with.",
  "Never state a legal conclusion unless the paragraph carries a citation.",
].join(" ");

export const EXPLAIN_SYSTEM = [
  "You write plain-language compliance explanations for a compliance officer: why the alert was flagged and why it matters.",
  "Write exactly two paragraphs, headings \"Why this was flagged\" and \"Why it matters\".",
  "Explanations must cite at least one policy chunk id.",
  RETURN_SCHEMA,
  SHARED_RULES,
].join(" ");

export const DRAFT_SYSTEM = [
  "You draft a compliance dossier for an officer to review before any submission.",
  "Use exactly the outline headings given, in order, one paragraph each.",
  RETURN_SCHEMA,
  SHARED_RULES,
].join(" ");

/** §7.4: the prompt carries only supplied facts and clause text, each with ids. */
export function buildExplainPrompt(facts: string): AiPrompt {
  return { system: EXPLAIN_SYSTEM, user: `FACTS\n${facts}` };
}

export function buildDraftPrompt(facts: string, outline: readonly string[]): AiPrompt {
  return {
    system: DRAFT_SYSTEM,
    user: `OUTLINE (headings, in order): ${outline.join(" · ")}\n\nFACTS\n${facts}`,
  };
}

export const EXTRACT_SYSTEM = [
  "You extract proposed obligations from a policy document for a compliance officer to review.",
  "Every obligation needs a short title and the exact sentence (quote) copied from the document, unchanged.",
  "kind is one of recurring, deadline, threshold, requirement, prohibition; cadence is only for recurring: monthly, quarterly, annual or once.",
  'Return JSON only: {"obligations": [{"title": string, "kind": string, "cadence"?: string, "quote": string, "suggestedRuleId"?: string}]}.',
  SHARED_RULES,
  "suggestedRuleId may only be one of the known rule ids listed in the facts; omit it when no rule applies.",
].join(" ");

export const GAP_SYSTEM = [
  "You propose what check or evidence would satisfy a policy obligation that has no automated check.",
  "Write two short sentences: text says what would satisfy the obligation and why, suggestedCheck names the concrete check or evidence to record.",
  "Copy the obligation's own sentence into citedQuote.",
  'Return JSON only: {"text": string, "citedQuote": string, "suggestedCheck": string}.',
  SHARED_RULES,
  "Mention a rule only by one of the known rule ids listed in the facts; omit rule ids when none applies.",
].join(" ");

export const PRIORITY_SYSTEM = [
  "You rank open compliance alerts for an officer: what to look at first.",
  "Return every supplied alert exactly once, each with a one-sentence reason and citedFacts copied from the facts.",
  'Return JSON only: {"order": [{"alertId": string, "reason": string, "citedFacts": string[]}]}.',
  SHARED_RULES,
].join(" ");

export function buildExtractPrompt(
  document: { id: string; text: string },
  knownRuleIds: readonly string[],
): AiPrompt {
  return {
    system: EXTRACT_SYSTEM,
    user: `KNOWN RULE IDS: ${knownRuleIds.join(", ")}\n\nDOCUMENT ${document.id}\n${document.text}`,
  };
}

export function buildGapPrompt(facts: string, knownRuleIds: readonly string[]): AiPrompt {
  return {
    system: GAP_SYSTEM,
    user: `KNOWN RULE IDS: ${knownRuleIds.join(", ")}\n\nFACTS\n${facts}`,
  };
}

export function buildPriorityPrompt(facts: string): AiPrompt {
  return { system: PRIORITY_SYSTEM, user: `FACTS\n${facts}` };
}
