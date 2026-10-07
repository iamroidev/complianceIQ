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

/**
 * Storage ports (MASTER §2: storage sits behind a Repo interface).
 * `createInMemoryRepo` lives in ./memory-repo; the Supabase implementation
 * (same contract, async-backed) lives in ./supabase-repo (M7).
 */
export interface AlertStore {
  list(): Alert[];
  get(id: string): Alert | undefined;
  findByRuleSubject(ruleId: string, subjectId: string): Alert[];
  add(alert: Alert): void;
  update(id: string, patch: Partial<Alert>): Alert;
}

export interface EvidenceStore {
  list(): EvidenceItem[];
  get(id: string): EvidenceItem | undefined;
  add(item: EvidenceItem): void;
}

export interface CheckRunStore {
  list(): CheckRun[];
  add(run: CheckRun): void;
}

/** Append-only audit blocks (§7.6) — there is no update or delete by design. */
export interface BlockStore {
  list(): AuditBlock[];
  get(blockIndex: number): AuditBlock | undefined;
  append(block: AuditBlock): void;
}

export interface ExplanationStore {
  list(): Explanation[];
  get(id: string): Explanation | undefined;
  byAlert(alertId: string): Explanation[];
  add(explanation: Explanation): void;
}

export interface DraftStore {
  list(): Draft[];
  get(id: string): Draft | undefined;
  byAlert(alertId: string): Draft[];
  add(draft: Draft): void;
  update(id: string, patch: Partial<Draft>): Draft;
}

export interface PrioritySuggestionStore {
  list(): PrioritySuggestion[];
  get(id: string): PrioritySuggestion | undefined;
  add(suggestion: PrioritySuggestion): void;
}

export interface EventStore {
  list(): ComplianceEvent[];
  get(id: string): ComplianceEvent | undefined;
  add(event: ComplianceEvent): void;
}

export interface Repo {
  alerts: AlertStore;
  evidence: EvidenceStore;
  checkRuns: CheckRunStore;
  blocks: BlockStore;
  explanations: ExplanationStore;
  drafts: DraftStore;
  prioritySuggestions: PrioritySuggestionStore;
  events: EventStore;
  /**
   * Optional async barrier: the Supabase repo queues writes so the sync Repo
   * contract stays usable in-engine; tests and shutdown call flush() to
   * surface the first queued error and wait for persistence. Memory repos
   * resolve immediately.
   */
  flush?(): Promise<void>;
}
