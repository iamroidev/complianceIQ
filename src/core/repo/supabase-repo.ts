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
import type { DbPort } from "./db";
import type { BlockStore, Repo } from "./repo";

type Row = Record<string, unknown>;

function str(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`row.${key}: expected string, got ${String(value)}`);
  return value;
}

function strOpt(row: Row, key: string): string | undefined {
  const value = row[key];
  if (value === null || value === undefined) return undefined;
  return str(row, key);
}

function int(row: Row, key: string): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`row.${key}: expected integer, got ${String(value)}`);
  }
  return value;
}

function json<T>(row: Row, key: string): T {
  const value = row[key];
  if (value === null || value === undefined) throw new Error(`row.${key}: expected json value, got null`);
  return value as T;
}

function jsonOpt<T>(row: Row, key: string): T | undefined {
  const value = row[key];
  if (value === null || value === undefined) return undefined;
  return value as T;
}

function plain<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/* ------------------------------- rows → domain ------------------------------- */

function alertFromRow(row: Row): Alert {
  return AlertSchema.parse({
    id: str(row, "id"),
    ruleId: str(row, "rule_id"),
    ruleVersion: str(row, "rule_version"),
    domain: str(row, "domain"),
    severity: str(row, "severity"),
    riskScore: int(row, "risk_score"),
    riskReasons: json<Alert["riskReasons"]>(row, "risk_reasons"),
    summarySentence: str(row, "summary_sentence"),
    subject: json<Alert["subject"]>(row, "subject"),
    evidenceRefs: json<Alert["evidenceRefs"]>(row, "evidence_refs"),
    snapshotEvidenceIds: json<Alert["snapshotEvidenceIds"]>(row, "snapshot_evidence_ids"),
    result: json<Alert["result"]>(row, "result"),
    policyRefs: json<Alert["policyRefs"]>(row, "policy_refs"),
    status: str(row, "status"),
    resolvedReason: strOpt(row, "resolved_reason"),
    assignee: strOpt(row, "assignee"),
    createdAt: str(row, "created_at"),
    slaDueAt: str(row, "sla_due_at"),
    draftId: strOpt(row, "draft_id"),
    explanationId: strOpt(row, "explanation_id"),
  });
}

function evidenceFromRow(row: Row): EvidenceItem {
  return EvidenceItemSchema.parse({
    id: str(row, "id"),
    kind: str(row, "kind"),
    title: str(row, "title"),
    source: str(row, "source"),
    collectedAt: str(row, "collected_at"),
    contentHash: str(row, "content_hash"),
    content: jsonOpt(row, "content"),
    contentRef: strOpt(row, "content_ref"),
    subjectRef: jsonOpt<EvidenceItem["subjectRef"]>(row, "subject_ref"),
    ledgerBlockIndex: int(row, "ledger_block_index"),
  });
}

function checkRunFromRow(row: Row): CheckRun {
  return CheckRunSchema.parse({
    id: str(row, "id"),
    asOf: str(row, "as_of"),
    rulesRun: int(row, "rules_run"),
    subjectsChecked: int(row, "subjects_checked"),
    passed: int(row, "passed"),
    failed: int(row, "failed"),
    opened: int(row, "opened"),
    resolved: int(row, "resolved"),
    ledgerBlockIndex: int(row, "ledger_block_index"),
  });
}

function blockFromRow(row: Row): AuditBlock {
  return AuditBlockSchema.parse({
    blockIndex: int(row, "block_index"),
    timestamp: str(row, "timestamp"),
    eventType: str(row, "event_type"),
    actor: str(row, "actor"),
    alertId: strOpt(row, "alert_id"),
    payload: json<Record<string, unknown>>(row, "payload"),
    payloadHash: str(row, "payload_hash"),
    previousHash: str(row, "previous_hash"),
    currentHash: str(row, "current_hash"),
  });
}

function explanationFromRow(row: Row): Explanation {
  return ExplanationSchema.parse({
    id: str(row, "id"),
    alertId: str(row, "alert_id"),
    paragraphs: json<Explanation["paragraphs"]>(row, "paragraphs"),
    generatedBy: str(row, "generated_by"),
  });
}

function draftFromRow(row: Row): Draft {
  return DraftSchema.parse({
    id: str(row, "id"),
    alertId: str(row, "alert_id"),
    kind: str(row, "kind"),
    paragraphs: json<Draft["paragraphs"]>(row, "paragraphs"),
    generatedBy: str(row, "generated_by"),
    createdAt: str(row, "created_at"),
  });
}

function priorityFromRow(row: Row): PrioritySuggestion {
  return PrioritySuggestionSchema.parse({
    id: str(row, "id"),
    generatedAt: str(row, "generated_at"),
    order: json<PrioritySuggestion["order"]>(row, "ranked_order"),
    generatedBy: str(row, "generated_by"),
  });
}

function eventFromRow(row: Row): ComplianceEvent {
  return ComplianceEventSchema.parse({
    id: str(row, "id"),
    domain: str(row, "domain"),
    actor: json<ComplianceEvent["actor"]>(row, "actor"),
    action: str(row, "action"),
    resource: json<ComplianceEvent["resource"]>(row, "resource"),
    context: json<ComplianceEvent["context"]>(row, "context"),
    timestamp: str(row, "timestamp"),
    source: str(row, "source"),
  });
}

/* ------------------------------- domain → rows ------------------------------- */

export function alertToRow(alert: Alert): Row {
  return {
    id: alert.id,
    rule_id: alert.ruleId,
    rule_version: alert.ruleVersion,
    domain: alert.domain,
    severity: alert.severity,
    risk_score: alert.riskScore,
    risk_reasons: alert.riskReasons,
    summary_sentence: alert.summarySentence,
    subject: alert.subject,
    evidence_refs: alert.evidenceRefs,
    snapshot_evidence_ids: alert.snapshotEvidenceIds,
    result: alert.result,
    policy_refs: alert.policyRefs,
    status: alert.status,
    resolved_reason: plain(alert.resolvedReason),
    assignee: plain(alert.assignee),
    created_at: alert.createdAt,
    sla_due_at: alert.slaDueAt,
    draft_id: plain(alert.draftId),
    explanation_id: plain(alert.explanationId),
  };
}

export function evidenceToRow(item: EvidenceItem): Row {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    source: item.source,
    collected_at: item.collectedAt,
    content_hash: item.contentHash,
    content: plain(item.content),
    content_ref: plain(item.contentRef),
    subject_ref: plain(item.subjectRef),
    ledger_block_index: item.ledgerBlockIndex,
  };
}

export function checkRunToRow(run: CheckRun): Row {
  return {
    id: run.id,
    as_of: run.asOf,
    rules_run: run.rulesRun,
    subjects_checked: run.subjectsChecked,
    passed: run.passed,
    failed: run.failed,
    opened: run.opened,
    resolved: run.resolved,
    ledger_block_index: run.ledgerBlockIndex,
  };
}

export function blockToRow(block: AuditBlock): Row {
  return {
    block_index: block.blockIndex,
    timestamp: block.timestamp,
    event_type: block.eventType,
    actor: block.actor,
    alert_id: plain(block.alertId),
    payload: block.payload,
    payload_hash: block.payloadHash,
    previous_hash: block.previousHash,
    current_hash: block.currentHash,
  };
}

export function explanationToRow(item: Explanation): Row {
  return {
    id: item.id,
    alert_id: item.alertId,
    paragraphs: item.paragraphs,
    generated_by: item.generatedBy,
  };
}

export function draftToRow(draft: Draft): Row {
  return {
    id: draft.id,
    alert_id: draft.alertId,
    kind: draft.kind,
    paragraphs: draft.paragraphs,
    generated_by: draft.generatedBy,
    created_at: draft.createdAt,
  };
}

export function priorityToRow(suggestion: PrioritySuggestion): Row {
  return {
    id: suggestion.id,
    generated_at: suggestion.generatedAt,
    ranked_order: suggestion.order,
    generated_by: suggestion.generatedBy,
  };
}

export function eventToRow(event: ComplianceEvent): Row {
  return {
    id: event.id,
    domain: event.domain,
    actor: event.actor,
    action: event.action,
    resource: event.resource,
    context: event.context,
    timestamp: event.timestamp,
    source: event.source,
  };
}

/* --------------------------------- repository -------------------------------- */

function duplicate(kind: string, id: string): never {
  throw new Error(`Duplicate ${kind} id: ${id}`);
}

function missing(kind: string, id: string): never {
  throw new Error(`Unknown ${kind}: ${id}`);
}

/**
 * Supabase-backed Repo: loads every table into memory once (reads are the
 * sync contract the engine needs), writes hit the cache synchronously and
 * are queued against the DbPort in submission order. `flush()` waits for the
 * queue and throws the first write error.
 */
export async function createSupabaseRepo(db: DbPort): Promise<Repo> {
  const [
    alertRows,
    evidenceRows,
    checkRunRows,
    blockRows,
    explanationRows,
    draftRows,
    priorityRows,
    eventRows,
  ] = await Promise.all([
    db.select("alerts", { orderBy: { column: "id" } }),
    db.select("evidence_items", { orderBy: { column: "id" } }),
    db.select("check_runs", { orderBy: { column: "id" } }),
    db.select("audit_blocks", { orderBy: { column: "block_index" } }),
    db.select("explanations", { orderBy: { column: "id" } }),
    db.select("drafts", { orderBy: { column: "id" } }),
    db.select("priority_suggestions", { orderBy: { column: "id" } }),
    db.select("events", { orderBy: { column: "id" } }),
  ]);

  const alerts = new Map(alertRows.map((row) => [str(row, "id"), Object.freeze(alertFromRow(row))]));
  const evidence = new Map(
    evidenceRows.map((row) => [str(row, "id"), Object.freeze(evidenceFromRow(row))]),
  );
  const checkRuns = checkRunRows.map((row) => Object.freeze(checkRunFromRow(row)));
  const blocks = blockRows.map((row) => Object.freeze(blockFromRow(row)));
  const blockByIndex = new Map(blocks.map((block) => [block.blockIndex, block]));
  const explanations = new Map(
    explanationRows.map((row) => [str(row, "id"), Object.freeze(explanationFromRow(row))]),
  );
  const drafts = new Map(draftRows.map((row) => [str(row, "id"), Object.freeze(draftFromRow(row))]));
  const prioritySuggestions = new Map(
    priorityRows.map((row) => [str(row, "id"), Object.freeze(priorityFromRow(row))]),
  );
  const events = new Map(eventRows.map((row) => [str(row, "id"), Object.freeze(eventFromRow(row))]));

  let chain: Promise<void> = Promise.resolve();
  let failure: { error: unknown } | null = null;
  const enqueue = (op: () => Promise<void>): void => {
    chain = chain.then(op).catch((error: unknown) => {
      failure ??= { error };
    });
  };

  const repo: Repo = {
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
        enqueue(() => db.insert("alerts", [alertToRow(parsed)]));
      },
      update: (id, patch) => {
        const current = alerts.get(id);
        if (!current) missing("alert", id);
        const next = AlertSchema.parse({ ...current, ...patch, id: current.id });
        alerts.set(id, Object.freeze(next));
        enqueue(() => db.update("alerts", alertToRow(next), { id }));
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
        enqueue(() => db.insert("evidence_items", [evidenceToRow(parsed)]));
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
        enqueue(() => db.insert("check_runs", [checkRunToRow(parsed)]));
      },
    },
    blocks: {
      list: () => [...blocks],
      get: (blockIndex) => blockByIndex.get(blockIndex),
      append: (block) => {
        const parsed = AuditBlockSchema.parse(block);
        if (blockByIndex.has(parsed.blockIndex)) {
          duplicate("audit block", String(parsed.blockIndex));
        }
        const frozen = Object.freeze(parsed);
        blocks.push(frozen);
        blockByIndex.set(frozen.blockIndex, frozen);
        enqueue(() => db.appendAuditBlock(parsed));
      },
    } satisfies BlockStore,
    explanations: {
      list: () => [...explanations.values()],
      get: (id) => explanations.get(id),
      byAlert: (alertId) =>
        [...explanations.values()].filter((item) => item.alertId === alertId),
      add: (explanation) => {
        const parsed = ExplanationSchema.parse(explanation);
        if (explanations.has(parsed.id)) duplicate("explanation", parsed.id);
        explanations.set(parsed.id, Object.freeze(parsed));
        enqueue(() => db.insert("explanations", [explanationToRow(parsed)]));
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
        enqueue(() => db.insert("drafts", [draftToRow(parsed)]));
      },
      update: (id, patch) => {
        const current = drafts.get(id);
        if (!current) missing("draft", id);
        const next = DraftSchema.parse({ ...current, ...patch, id: current.id });
        drafts.set(id, Object.freeze(next));
        enqueue(() => db.update("drafts", draftToRow(next), { id }));
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
        enqueue(() => db.insert("priority_suggestions", [priorityToRow(parsed)]));
      },
    },
    events: {
      list: () => [...events.values()],
      get: (id) => events.get(id),
      add: (event) => {
        const parsed = ComplianceEventSchema.parse(event);
        if (events.has(parsed.id)) duplicate("event", parsed.id);
        events.set(parsed.id, Object.freeze(parsed));
        enqueue(() => db.insert("events", [eventToRow(parsed)]));
      },
    },
    flush: async () => {
      await chain;
      if (failure) throw failure.error;
    },
  };

  return repo;
}
