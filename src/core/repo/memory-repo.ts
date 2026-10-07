import type {
  Alert,
  AuditBlock,
  CheckRun,
  ComplianceEvent,
  Draft,
  EvidenceItem,
  Explanation,
  PrioritySuggestion,
} from "../types";
import {
  Alert as AlertSchema,
  AuditBlock as AuditBlockSchema,
  CheckRun as CheckRunSchema,
  ComplianceEvent as ComplianceEventSchema,
  Draft as DraftSchema,
  EvidenceItem as EvidenceItemSchema,
  Explanation as ExplanationSchema,
  PrioritySuggestion as PrioritySuggestionSchema,
} from "../types";
import type { Repo } from "./repo";

function duplicate(kind: string, id: string): never {
  throw new Error(`Duplicate ${kind} id: ${id}`);
}

function missing(kind: string, id: string): never {
  throw new Error(`Unknown ${kind}: ${id}`);
}

/** In-memory Repo (tests and DATA_MODE=memory) — zod-validated, frozen rows. */
export function createInMemoryRepo(): Repo {
  const alerts = new Map<string, Alert>();
  const evidence = new Map<string, EvidenceItem>();
  const checkRuns: CheckRun[] = [];
  const blocks: AuditBlock[] = [];
  const explanations = new Map<string, Explanation>();
  const drafts = new Map<string, Draft>();
  const prioritySuggestions = new Map<string, PrioritySuggestion>();
  const events = new Map<string, ComplianceEvent>();

  return {
    alerts: {
      list: () => [...alerts.values()],
      get: (id) => alerts.get(id),
      findByRuleSubject: (ruleId, subjectId) =>
        [...alerts.values()].filter(
          (alert) => alert.ruleId === ruleId && alert.subject.id === subjectId,
        ),
      add: (alert) => {
        const parsed = AlertSchema.parse(alert);
        if (alerts.has(parsed.id)) duplicate("alert", parsed.id);
        alerts.set(parsed.id, Object.freeze(parsed));
      },
      update: (id, patch) => {
        const current = alerts.get(id);
        if (!current) missing("alert", id);
        const next = AlertSchema.parse({ ...current, ...patch, id: current.id });
        alerts.set(id, Object.freeze(next));
        return next;
      },
    },
    evidence: {
      list: () => [...evidence.values()],
      get: (id) => evidence.get(id),
      add: (item) => {
        const parsed = EvidenceItemSchema.parse(item);
        if (evidence.has(parsed.id)) duplicate("evidence", parsed.id);
        evidence.set(parsed.id, Object.freeze(parsed));
      },
    },
    checkRuns: {
      list: () => [...checkRuns],
      add: (run) => {
        const parsed = CheckRunSchema.parse(run);
        if (checkRuns.some((existing) => existing.id === parsed.id)) {
          duplicate("check run", parsed.id);
        }
        checkRuns.push(Object.freeze(parsed));
      },
    },
    blocks: {
      list: () => [...blocks],
      get: (blockIndex) => blocks.find((block) => block.blockIndex === blockIndex),
      append: (block) => {
        const parsed = AuditBlockSchema.parse(block);
        if (blocks.some((existing) => existing.blockIndex === parsed.blockIndex)) {
          duplicate("audit block", String(parsed.blockIndex));
        }
        blocks.push(Object.freeze(parsed));
      },
    },
    explanations: {
      list: () => [...explanations.values()],
      get: (id) => explanations.get(id),
      byAlert: (alertId) =>
        [...explanations.values()].filter((item) => item.alertId === alertId),
      add: (explanation) => {
        const parsed = ExplanationSchema.parse(explanation);
        if (explanations.has(parsed.id)) duplicate("explanation", parsed.id);
        explanations.set(parsed.id, Object.freeze(parsed));
      },
    },
    drafts: {
      list: () => [...drafts.values()],
      get: (id) => drafts.get(id),
      byAlert: (alertId) => [...drafts.values()].filter((item) => item.alertId === alertId),
      add: (draft) => {
        const parsed = DraftSchema.parse(draft);
        if (drafts.has(parsed.id)) duplicate("draft", parsed.id);
        drafts.set(parsed.id, Object.freeze(parsed));
      },
      update: (id, patch) => {
        const current = drafts.get(id);
        if (!current) missing("draft", id);
        const next = DraftSchema.parse({ ...current, ...patch, id: current.id });
        drafts.set(id, Object.freeze(next));
        return next;
      },
    },
    prioritySuggestions: {
      list: () => [...prioritySuggestions.values()],
      get: (id) => prioritySuggestions.get(id),
      add: (suggestion) => {
        const parsed = PrioritySuggestionSchema.parse(suggestion);
        if (prioritySuggestions.has(parsed.id)) duplicate("priority suggestion", parsed.id);
        prioritySuggestions.set(parsed.id, Object.freeze(parsed));
      },
    },
    events: {
      list: () => [...events.values()],
      get: (id) => events.get(id),
      add: (event) => {
        const parsed = ComplianceEventSchema.parse(event);
        if (events.has(parsed.id)) duplicate("event", parsed.id);
        events.set(parsed.id, Object.freeze(parsed));
      },
    },
    flush: async () => {},
  };
}
