import { z } from "zod";
import { Domain, EvidenceRef, IsoUtcMs, ObservedValue, Severity } from "./common";
import { ComplianceEvent } from "./streams";
import { Registers } from "./registers";

export const RuleContext = z.object({
  events: z.array(ComplianceEvent),
  registers: Registers,
  asOf: IsoUtcMs,
});

export const RuleResult = z.object({
  ruleId: z.string().min(1),
  ruleVersion: z.string().min(1),
  verdict: z.enum(["pass", "fail"]),
  subject: z.object({ id: z.string().min(1), name: z.string().min(1) }),
  triggeringRefs: z.array(EvidenceRef),
  observed: z.record(z.string(), ObservedValue),
  parameters: z.record(z.string(), ObservedValue),
});

export const PolicyRef = z.object({
  chunkId: z.string().min(1),
  reason: z.enum(["mapped", "semantic"]),
  confidence: z.number().min(0).max(1),
  highlightSpan: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]).optional(),
});

export const Alert = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  ruleVersion: z.string().min(1),
  domain: Domain,
  severity: Severity,
  riskScore: z.number(),
  riskReasons: z.array(z.string()),
  summarySentence: z.string().min(1),
  subject: z.object({ id: z.string().min(1), name: z.string().min(1) }),
  evidenceRefs: z.array(EvidenceRef),
  snapshotEvidenceIds: z.array(z.string()),
  result: RuleResult,
  policyRefs: z.array(PolicyRef),
  status: z.enum(["open", "in_review", "filed", "dismissed", "escalated", "resolved"]),
  resolvedReason: z.enum(["condition_cleared", "decision"]).optional(),
  assignee: z.string().optional(),
  createdAt: IsoUtcMs,
  slaDueAt: IsoUtcMs,
  draftId: z.string().optional(),
  explanationId: z.string().optional(),
});

export type RuleContext = z.infer<typeof RuleContext>;
export type RuleResult = z.infer<typeof RuleResult>;
export type PolicyRef = z.infer<typeof PolicyRef>;
export type Alert = z.infer<typeof Alert>;
