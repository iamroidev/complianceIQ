import { LEDGER_EVENT_LABELS } from "@/core/ledger/labels";
import { actorName } from "@/lib/roles";
import type {
  Alert,
  AuditBlock,
  DossierKind,
  Draft,
  EvidenceItem,
  PolicyClause,
} from "@/core/types";
import type { TimelineEntry } from "@/components/signature/AuditTimeline";

export interface RuleInfo {
  id: string;
  name: string;
  description: string;
}

export type ClauseMap = Record<string, PolicyClause>;
export type DocumentMap = Record<string, string>;

/* ---------------- policy notes (signature 2) ---------------- */

export interface NoteSpec {
  clauseName: string;
  citation: string;
  summary: string;
  highlight?: string;
  basis: string;
}

/** First sentence of a clause text, clamped so a margin note stays one line-ish. */
export function firstSentence(text: string): string {
  const match = text.match(/^(.{1,220}?[.!?])(\s|$)/);
  const sentence = match ? match[1] : text.slice(0, 220);
  return text.length > 220 && !match ? `${sentence.trimEnd()}…` : sentence;
}

/** The sentence inside the clause that contains the matched span. */
export function sentenceAt(text: string, span: [number, number]): string | undefined {
  if (span[0] >= span[1] || span[1] > text.length) return undefined;
  const before = text.lastIndexOf(".", span[0] - 1) + 1;
  const afterCandidate = text.indexOf(".", span[1]);
  const after = afterCandidate === -1 ? text.length : afterCandidate + 1;
  return text.slice(before, after).trim() || undefined;
}

export function noteFor(
  chunkId: string,
  clauses: ClauseMap,
  documents: DocumentMap,
  basis: string,
  highlightSpan?: [number, number],
): NoteSpec | null {
  const clause = clauses[chunkId];
  if (!clause) return null;
  const highlight = highlightSpan ? sentenceAt(clause.text, highlightSpan) : undefined;
  const where =
    clause.regulation === "Internal policy"
      ? `${documents[clause.documentId] ?? clause.regulation} · ${clause.citation}`
      : `${clause.regulation} · ${clause.citation}`;
  return {
    clauseName: clause.title,
    citation: where,
    summary: firstSentence(clause.text),
    ...(highlight ? { highlight } : {}),
    basis,
  };
}

export function notesForAlert(
  alert: Alert,
  clauses: ClauseMap,
  documents: DocumentMap,
): NoteSpec[] {
  const notes: NoteSpec[] = [];
  for (const ref of alert.policyRefs) {
    const basis = ref.reason === "mapped" ? "Cited by the rule" : "Matches the wording";
    const note = noteFor(ref.chunkId, clauses, documents, basis, ref.highlightSpan);
    if (note) notes.push(note);
  }
  return notes;
}

export function notesForCitations(
  citations: string[],
  clauses: ClauseMap,
  documents: DocumentMap,
): NoteSpec[] {
  const notes: NoteSpec[] = [];
  const seen = new Set<string>();
  for (const chunkId of citations) {
    if (seen.has(chunkId)) continue;
    seen.add(chunkId);
    const note = noteFor(chunkId, clauses, documents, "Referenced in this draft");
    if (note) notes.push(note);
  }
  return notes;
}

/* ---------------- plain labels ---------------- */

export const DOSSIER_LABELS: Record<DossierKind, string> = {
  sar: "Suspicious activity report",
  soc2_deficiency: "SOC 2 deficiency note",
  hipaa_4factor: "HIPAA four-factor assessment",
  te_disallowance: "Travel expense disallowance",
  secure_sdlc_finding: "Secure development finding",
  exception_memo: "Exception memo",
};

export const DOC_LABELS: Record<string, string> = {
  soc2_report: "SOC 2 report",
  dpa: "Data processing agreement",
  insurance: "Insurance certificate",
  pen_test: "Penetration test",
  contract: "Contract",
};

export const DISMISS_REASONS = [
  "Not a real issue",
  "Duplicate of another alert",
  "Already handled somewhere else",
  "No policy applies here",
  "Resolved outside ComplianceIQ",
];

export const STATUS_CLOSED: Record<Alert["status"], string | null> = {
  open: null,
  in_review: null,
  filed: "Report filed",
  dismissed: "Alert dismissed",
  escalated: "Escalated to a manager",
  resolved: "Closed automatically",
};

/* ---------------- timeline entries ---------------- */

const PERSON_ACTIONS: Partial<Record<AuditBlock["eventType"], (actor: string) => string>> = {
  REPORT_FILED: (actor) => `${actorName(actor)} filed this report`,
  ALERT_DISMISSED: (actor) => `${actorName(actor)} dismissed this alert`,
  ALERT_ESCALATED: (actor) => `${actorName(actor)} escalated this alert`,
};

/** Why the condition cleared, per state rule (DESIGN §15.2 auto-close line). */
const AUTO_CLOSE_WHY: Record<string, string> = {
  "CERT-001": "renewal attached",
  "DEAD-001": "deadline completed",
  "VEND-001": "document on file",
};

function payloadString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function payloadNumber(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];
  return typeof value === "number" ? value : undefined;
}

/** One sentence for a ledger entry, in the words a reader expects (DESIGN §6.3). */
function timelineSentence(block: AuditBlock): string {
  // DESIGN §15.2: "Closed automatically · renewal attached · 14:05".
  if (block.eventType === "ALERT_AUTO_RESOLVED") {
    const why = payloadString(block.payload, "ruleId");
    const label = why ? AUTO_CLOSE_WHY[why] : undefined;
    return label ? `Closed automatically · ${label}` : "Closed automatically";
  }
  const action = PERSON_ACTIONS[block.eventType];
  return action ? action(block.actor) : LEDGER_EVENT_LABELS[block.eventType];
}

function decisionSub(block: AuditBlock): string {
  const reason = payloadString(block.payload, "reason");
  const note = payloadString(block.payload, "note");
  return [reason ? `Reason: ${reason}` : null, note ? `Note: ${note}` : null]
    .filter(Boolean)
    .join(" · ");
}

function techFor(block: AuditBlock): { tech: Array<{ label: string; value: string }>; hashes: Array<{ label: string; value: string }> } {
  const hashes: Array<{ label: string; value: string }> = [
    { label: "Payload", value: block.payloadHash },
    { label: "Previous", value: block.previousHash },
    { label: "Entry", value: block.currentHash },
  ];
  // The export entry repeats the head hash the pack certifies (the record
  // grows by one block when the pack is written, so this is the earlier head).
  if (block.eventType === "AUDIT_PACK_EXPORTED") {
    const head = payloadString(block.payload, "headHashAtExport");
    if (head) hashes.push({ label: "Head at export", value: head });
  }
  return {
    tech: [{ label: "Actor", value: block.actor }],
    hashes,
  };
}

/** History tab: every audit entry saved against this case, oldest first. */
export function buildHistoryEntries(
  blocks: AuditBlock[],
  evidence: readonly EvidenceItem[] = [],
): TimelineEntry[] {
  const rows = blocks
    .filter((block) => block.alertId !== undefined)
    .sort((a, b) => a.blockIndex - b.blockIndex);
  return rows.map((block) => {
    const reasonNote = decisionSub(block);
    // The auto-close carries the evidence snapshot that proves why it closed
    // (DESIGN §15.2 "with the evidence item").
    const snapshot =
      block.eventType === "ALERT_AUTO_RESOLVED"
        ? evidence.find((item) => item.id === block.payload["evidenceId"])?.title
        : undefined;
    const sub = [reasonNote || null, snapshot ?? null].filter(Boolean).join(" · ");
    return {
      id: `blk_${block.blockIndex}`,
      sentence: timelineSentence(block),
      time: block.timestamp,
      entry: block.blockIndex,
      ...(sub ? { sub } : {}),
      ...techFor(block),
    } satisfies TimelineEntry;
  });
}

/**
 * Audit record page: every ledger entry in plain words, oldest first, with a
 * grounded sub line where the payload has one (counts, titles, summaries).
 */
export function buildLedgerEntries(
  blocks: readonly AuditBlock[],
  alerts: readonly Alert[] = [],
  evidence: readonly EvidenceItem[] = [],
): TimelineEntry[] {
  const alertById = new Map(alerts.map((alert) => [alert.id, alert]));
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  return blocks.map((block) => {
    let sub = decisionSub(block);
    if (!sub) {
      switch (block.eventType) {
        case "ALERT_TRIGGERED": {
          const alertId = payloadString(block.payload, "alertId") ?? block.alertId;
          const summary = alertId ? alertById.get(alertId)?.summarySentence : undefined;
          if (summary) sub = summary;
          break;
        }
        case "EVIDENCE_RECORDED": {
          const title = payloadString(block.payload, "title");
          if (title) sub = title;
          break;
        }
        case "CHECK_RUN": {
          const subjects = payloadNumber(block.payload, "subjectsChecked");
          const opened = payloadNumber(block.payload, "opened");
          if (subjects !== undefined) {
            sub = `${subjects} subjects checked${opened ? ` · ${opened} new alerts` : ""}`;
          }
          break;
        }
        case "AUDIT_PACK_EXPORTED": {
          const findings = payloadNumber(block.payload, "findings");
          if (findings !== undefined) sub = `${findings} findings included`;
          break;
        }
        case "ALERT_AUTO_RESOLVED": {
          const evidenceId = payloadString(block.payload, "evidenceId");
          const title = evidenceId ? evidenceById.get(evidenceId)?.title : undefined;
          if (title) sub = title;
          break;
        }
        default:
          break;
      }
    }
    return {
      id: `blk_${block.blockIndex}`,
      sentence: timelineSentence(block),
      time: block.timestamp,
      entry: block.blockIndex,
      ...(sub ? { sub } : {}),
      ...techFor(block),
    } satisfies TimelineEntry;
  });
}

/** Activity tab: the case's story in plain words (evidence, draft, decisions). */
export function buildActivityEntries(
  alert: Alert,
  evidence: EvidenceItem[],
  drafts: Draft[],
  blocks: AuditBlock[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    {
      id: "raised",
      sentence: "Alert raised",
      time: alert.createdAt,
      sub: alert.summarySentence,
      tech: [{ label: "Rule", value: alert.ruleId }],
    },
  ];

  const snapshots = evidence
    .filter((item) => alert.snapshotEvidenceIds.includes(item.id))
    .sort((a, b) => Date.parse(a.collectedAt) - Date.parse(b.collectedAt));
  for (const snapshot of snapshots) {
    entries.push({
      id: snapshot.id,
      sentence: "Snapshot taken when the alert was raised",
      time: snapshot.collectedAt,
      sub: snapshot.title,
    });
  }

  for (const draft of drafts) {
    entries.push({
      id: draft.id,
      sentence: "Report draft prepared",
      time: draft.createdAt,
      sub: `${DOSSIER_LABELS[draft.kind]} · ${
        draft.generatedBy === "template"
          ? "Written from template, waiting for review"
          : "AI-assisted, waiting for review"
      }`,
    });
  }

  const decisions = blocks
    .filter((block) => block.alertId === alert.id)
    .sort((a, b) => a.blockIndex - b.blockIndex);
  for (const block of decisions) {
    if (block.eventType === "ALERT_TRIGGERED" || block.eventType === "DRAFT_GENERATED") continue;
    const action = PERSON_ACTIONS[block.eventType];
    if (!action) continue;
    const reason = payloadString(block.payload, "reason");
    entries.push({
      id: `act_${block.blockIndex}`,
      sentence: action(block.actor),
      time: block.timestamp,
      ...(reason ? { sub: `Reason: ${reason}` } : {}),
    });
  }

  return entries;
}
