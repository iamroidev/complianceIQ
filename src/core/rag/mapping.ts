import { z } from "zod";
import mappingJson from "../../data/policy/mapping.json";

/** The guaranteed legal basis: every Tier 1 rule maps to ≥1 chunk id (MASTER §6.5). */
const RuleMapping = z.record(z.string(), z.array(z.string().min(1)).min(1));

const MAPPING: Record<string, string[]> = RuleMapping.parse(mappingJson);

export function ruleMapping(): Record<string, string[]> {
  return MAPPING;
}

export function mappedChunkIds(ruleId: string): string[] {
  return MAPPING[ruleId] ?? [];
}
