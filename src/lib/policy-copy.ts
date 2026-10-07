import type { PolicyDocument } from "@/core/types";

/**
 * Plain-English copy for the Policies screen (DESIGN §7: "Rules and
 * Policies: two simple lists with search").
 */

export const POLICY_KIND_LABELS: Record<PolicyDocument["kind"], string> = {
  internal_demo: "Demo policy",
  regulation_summary: "Regulation summary",
  regulation_text: "Regulation text",
};

export interface PolicyCard {
  id: string;
  title: string;
  kind: PolicyDocument["kind"];
  version: string;
  sections: number;
  obligations: number;
  checks: string[];
}

export function kindLabel(kind: PolicyDocument["kind"]): string {
  return POLICY_KIND_LABELS[kind];
}

export function countWord(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
