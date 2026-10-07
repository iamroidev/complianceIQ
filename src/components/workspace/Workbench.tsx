"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiDraftMarking } from "@/components/signature/AiDraftMarking";
import { AuditTimeline } from "@/components/signature/AuditTimeline";
import { HeroCaseFile } from "@/components/illustration/scenes";
import { PolicyNote } from "@/components/signature/PolicyNote";
import { SeverityDot } from "@/components/signature/SeverityDot";
import { SourceLink } from "@/components/signature/SourceLink";
import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import type { Alert, AuditBlock, Draft, EvidenceItem, Explanation } from "@/core/types";
import { formatClock, formatShort, timeLeft } from "@/lib/format";
import { CaseVisual } from "./CaseVisual";
import { DecisionBar, type DecisionChoice } from "./DecisionBar";
import { WALKTHROUGH_STEPS, useDemo } from "./demo-context";
import { useRole, ROLE_PEOPLE } from "./role-context";
import {
  DOSSIER_LABELS,
  STATUS_CLOSED,
  buildActivityEntries,
  buildHistoryEntries,
  notesForAlert,
  notesForCitations,
  type ClauseMap,
  type DocumentMap,
  type RuleInfo,
} from "./case-text";

const TABS = [
  { key: "summary", label: "Summary" },
  { key: "activity", label: "Activity" },
  { key: "triggered", label: "How it was triggered" },
  { key: "policy", label: "Policy" },
  { key: "draft", label: "Report draft" },
  { key: "history", label: "History" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
type Phase = "loading" | "ready" | "missing" | "error";

function capitalized(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function camelWords(key: string): string {
  return key.replace(/([A-Z])/g, " $1").toLowerCase().trim();
}

interface WorkbenchProps {
  alertId: string;
  rules: RuleInfo[];
  clauses: ClauseMap;
  documents: DocumentMap;
}

/**
 * Case workbench (DESIGN §7): headline sentence, one visual, plain tabs, and
 * the sticky decision bar. Data arrives from the Tier 1 API; the rule and
 * policy text are passed in from the server so the screens stay honest.
 */
export function Workbench({ alertId, rules, clauses, documents }: WorkbenchProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadError, setLoadError] = useState("");
  const [alert, setAlert] = useState<Alert | null>(null);
  const [asOf, setAsOf] = useState("");
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explanationState, setExplanationState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [firstBroken, setFirstBroken] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("summary");
  const [showRule, setShowRule] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [saveResult, setSaveResult] = useState<{ time: string; entry: number } | null>(null);
  const tabRefs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});

  // Demo panel tour (DESIGN §7): after a scenario runs, the new case walks
  // through activity → rule → policy → saved record with a caption at each.
  const { walkthrough, advanceWalkthrough, endWalkthrough } = useDemo();
  const { role } = useRole();
  const tourActive = walkthrough?.alertId === alertId;

  useEffect(() => {
    if (!tourActive || !walkthrough) return;
    const step = WALKTHROUGH_STEPS[walkthrough.step];
    if (!step) return;
    setTab(step.tab as TabKey);
  }, [tourActive, walkthrough]);

  const load = useCallback(async () => {
    setPhase("loading");
    setLoadError("");
    try {
      const [caseRes, listRes, evidenceRes, ledgerRes] = await Promise.all([
        fetch(`/api/alerts/${alertId}`),
        fetch("/api/alerts"),
        fetch("/api/evidence"),
        fetch("/api/ledger"),
      ]);
      if (caseRes.status === 404) {
        setPhase("missing");
        return;
      }
      if (!caseRes.ok || !listRes.ok) throw new Error("Case unavailable");
      const caseData = (await caseRes.json()) as {
        alert: Alert;
        explanation: Explanation | null;
        drafts: Draft[];
      };
      const listData = (await listRes.json()) as { asOf: string };
      const evidenceData = evidenceRes.ok
        ? ((await evidenceRes.json()) as { evidence: EvidenceItem[] })
        : { evidence: [] };
      const ledgerData = ledgerRes.ok
        ? ((await ledgerRes.json()) as { blocks: AuditBlock[] })
        : { blocks: [] };

      setAlert(caseData.alert);
      setAsOf(listData.asOf);
      setDrafts(caseData.drafts ?? []);
      setEvidence(evidenceData.evidence ?? []);
      setBlocks(ledgerData.blocks ?? []);
      setSaveResult(null);
      setDecisionError("");
      setVerified(null);
      setFirstBroken(null);
      setPhase("ready");

      if (caseData.explanation) {
        setExplanation(caseData.explanation);
        setExplanationState("ready");
      } else {
        setExplanation(null);
        setExplanationState("loading");
        try {
          const explainRes = await fetch(`/api/alerts/${alertId}/explain`, { method: "POST" });
          if (explainRes.ok) {
            const data = (await explainRes.json()) as { explanation: Explanation };
            setExplanation(data.explanation);
            setExplanationState("ready");
          } else {
            setExplanationState("error");
          }
        } catch {
          setExplanationState("error");
        }
      }

      try {
        const verifyRes = await fetch("/api/ledger/verify");
        if (verifyRes.ok) {
          const data = (await verifyRes.json()) as {
            ok: boolean;
            chain: { ok: boolean; firstBrokenIndex?: number };
          };
          setVerified(data.ok);
          if (!data.ok) setFirstBroken(data.chain.firstBrokenIndex ?? null);
        }
      } catch {
        setVerified(null);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Case unavailable");
      setPhase("error");
    }
  }, [alertId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rule = alert ? rules.find((candidate) => candidate.id === alert.ruleId) : undefined;
  const alertNotes = useMemo(
    () => (alert ? notesForAlert(alert, clauses, documents) : []),
    [alert, clauses, documents],
  );

  const activityEntries = useMemo(
    () => (alert ? buildActivityEntries(alert, evidence, drafts, blocks) : []),
    [alert, evidence, drafts, blocks],
  );
  const historyEntries = useMemo(
    () =>
      alert
        ? buildHistoryEntries(
            blocks.filter((block) => block.alertId === alert.id),
            evidence,
          )
        : [],
    [alert, blocks, evidence],
  );

  const snapshot = alert
    ? evidence.find((item) => item.id === alert.snapshotEvidenceIds[0])
    : undefined;

  async function submit(choice: DecisionChoice, reason?: string) {
    if (!alert) return;
    setDecisionBusy(true);
    setDecisionError("");
    try {
      const response = await fetch(`/api/alerts/${alertId}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: choice, ...(reason ? { reason } : {}) }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        alert?: Alert;
        blockIndex?: number;
        error?: string;
      };
      if (!response.ok || data.alert === undefined || data.blockIndex === undefined) {
        setDecisionError(data.error ?? "This decision could not be saved.");
        return;
      }
      let time = formatClock(asOf);
      const ledgerRes = await fetch("/api/ledger");
      if (ledgerRes.ok) {
        const ledgerData = (await ledgerRes.json()) as { blocks: AuditBlock[] };
        setBlocks(ledgerData.blocks);
        const block = ledgerData.blocks.find(
          (candidate) => candidate.blockIndex === data.blockIndex,
        );
        if (block) time = formatClock(block.timestamp);
      }
      setSaveResult({ time, entry: data.blockIndex });
      setAlert(data.alert);
    } catch {
      setDecisionError("This decision could not be saved. Check the connection and try again.");
    } finally {
      setDecisionBusy(false);
    }
  }

  async function prepareDraft() {
    setDraftBusy(true);
    setDraftError("");
    try {
      const response = await fetch(`/api/alerts/${alertId}/draft`, { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { draft?: Draft; error?: string };
      if (!response.ok || !data.draft) {
        setDraftError(data.error ?? "The draft could not be prepared. Nothing was saved.");
        return;
      }
      setDrafts([data.draft]);
      const ledgerRes = await fetch("/api/ledger");
      if (ledgerRes.ok) {
        const ledgerData = (await ledgerRes.json()) as { blocks: AuditBlock[] };
        setBlocks(ledgerData.blocks);
      }
    } catch {
      setDraftError("The draft could not be prepared. Check the connection and try again.");
    } finally {
      setDraftBusy(false);
    }
  }

  async function explainAgain() {
    setExplanationState("loading");
    try {
      const response = await fetch(`/api/alerts/${alertId}/explain`, { method: "POST" });
      if (response.ok) {
        const data = (await response.json()) as { explanation: Explanation };
        setExplanation(data.explanation);
        setExplanationState("ready");
      } else {
        setExplanationState("error");
      }
    } catch {
      setExplanationState("error");
    }
  }

  function onTabKeyDown(event: React.KeyboardEvent) {
    const index = TABS.findIndex((candidate) => candidate.key === tab);
    if (index === -1) return;
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    const key = TABS[next].key;
    setTab(key);
    tabRefs.current[key]?.focus();
  }

  function sourceLabel(chunkId: string): string {
    return clauses[chunkId]?.title ?? chunkId;
  }

  function sourceDescription(chunkId: string): string {
    const clause = clauses[chunkId];
    if (!clause) return chunkId;
    const document =
      clause.regulation === "Internal policy"
        ? (documents[clause.documentId] ?? clause.regulation)
        : clause.regulation;
    return `${clause.title} · ${document} · ${clause.citation}`;
  }

  function SourceRow({ citations }: { citations: string[] }) {
    if (citations.length === 0) return null;
    return (
      <p className="prose-sources">
        Sources:{" "}
        {citations.map((chunkId) => (
          <SourceLink key={chunkId} source={sourceDescription(chunkId)} onOpen={() => setTab("policy")}>
            {sourceLabel(chunkId)}
          </SourceLink>
        ))}
      </p>
    );
  }

  if (phase === "missing") {
    return (
      <div className="page-case-room">
        <div className="state-block">
          <p>This alert could not be found. It may have been part of a demo run that was reset.</p>
          <Link href="/alerts" className="btn btn-plain" style={{ marginTop: "12px" }}>
            Back to alerts
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="page-case-room">
        <div className="error-block">
          <p>{loadError || "This case could not be opened."}</p>
          <button type="button" className="btn btn-plain" onClick={() => void load()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (phase === "loading" || !alert) {
    return (
      <div className="page-case-room" aria-busy="true">
        <div className="skeleton-block" style={{ height: "26px", maxWidth: "70%" }} />
        <div className="skeleton-block" style={{ height: "18px", maxWidth: "40%", marginTop: "10px" }} />
        <div className="wb-visual">
          <div className="skeleton-block" style={{ height: "120px" }} />
        </div>
        <div className="skeleton-block" style={{ height: "38px", marginTop: "22px" }} />
        <div className="skeleton-block" style={{ height: "140px", marginTop: "20px" }} />
      </div>
    );
  }

  const left = timeLeft(
    asOf,
    alert.slaDueAt,
    Date.parse(alert.slaDueAt) - Date.parse(alert.createdAt),
  );
  const closedLabel = STATUS_CLOSED[alert.status];
  const draft = drafts[0];
  const draftNotes = draft
    ? notesForCitations(
        draft.paragraphs.flatMap((paragraph) => paragraph.citations),
        clauses,
        documents,
      )
    : [];

  return (
    <div className="page-case-room">
      <Link href="/alerts" className="wb-back">
        ← All alerts
      </Link>

      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">{alert.summarySentence}</h1>
          <p className="page-serif-headline">
            {closedLabel
              ? "This case has been handled."
              : left.overdue
                ? "The response window for this case has passed."
                : "There is still time to respond."}
          </p>
          <div className="wb-meta">
            <SeverityDot severity={alert.severity} />
            {closedLabel ? (
              <span>{closedLabel}</span>
            ) : (
              <span className={`sla-text${left.overdue ? " is-overdue" : ""}`} title={alert.slaDueAt}>
                {left.text}
              </span>
            )}
            <span>{alert.ruleId}</span>
            <span>Assigned to {alert.assignee ?? ROLE_PEOPLE[role]}</span>
          </div>
        </div>
        <div className="page-spot" aria-hidden="true">
          <HeroCaseFile size={104} />
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="case" />

      <CaseVisual alert={alert} asOf={asOf} snapshot={snapshot} />

      {tourActive && walkthrough && WALKTHROUGH_STEPS[walkthrough.step] && (
        <div className="walkthrough" role="status">
          <p className="walkthrough-caption">
            <span className="walkthrough-title">{WALKTHROUGH_STEPS[walkthrough.step].title}</span>
            {WALKTHROUGH_STEPS[walkthrough.step].caption}
          </p>
          <div className="walkthrough-actions">
            <button type="button" className="btn btn-plain" onClick={advanceWalkthrough}>
              {walkthrough.step >= WALKTHROUGH_STEPS.length - 1 ? "Done" : "Next step"}
            </button>
            <button type="button" className="btn-quiet" onClick={endWalkthrough}>
              End tour
            </button>
          </div>
        </div>
      )}

      <div
        className="wb-tabs"
        role="tablist"
        aria-label="Case sections"
        onKeyDown={onTabKeyDown}
      >
        {TABS.map((entry) => (
          <button
            key={entry.key}
            ref={(element) => {
              tabRefs.current[entry.key] = element;
            }}
            type="button"
            role="tab"
            id={`tab-${entry.key}`}
            aria-selected={tab === entry.key}
            aria-controls={`panel-${entry.key}`}
            tabIndex={tab === entry.key ? 0 : -1}
            className="wb-tab"
            onClick={() => setTab(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <div className="wb-panel" role="tabpanel" id="panel-summary" aria-labelledby="tab-summary">
          <div className="risk-block">
            <span className="risk-level">{capitalized(alert.severity)} risk</span>
            <span className="risk-score">Score {alert.riskScore}</span>
          </div>
          {alert.riskReasons.length > 0 && (
            <ul className="risk-reasons">
              {alert.riskReasons.slice(0, 3).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}

          {explanationState === "loading" && (
            <div aria-busy="true">
              <div className="skeleton-block" style={{ height: "14px", maxWidth: "30%" }} />
              <div className="skeleton-block" style={{ height: "14px", marginTop: "12px" }} />
              <div className="skeleton-block" style={{ height: "14px", marginTop: "8px", maxWidth: "85%" }} />
              <p className="page-note">Writing the explanation…</p>
            </div>
          )}

          {explanationState === "error" && (
            <div className="error-block">
              <p>The explanation could not be generated.</p>
              <button type="button" className="btn btn-plain" onClick={() => void explainAgain()}>
                Try again
              </button>
            </div>
          )}

          {explanation && (
            <div>
              {explanation.generatedBy === "template" ? (
                <p className="ai-tag">
                  Written from template · Rules decide what gets flagged. This text explains the
                  decision.
                </p>
              ) : (
                <p className="ai-tag">
                  <span className="ai-glyph">✦</span> AI-assisted · Rules decide what gets flagged.
                  This text explains the decision.
                </p>
              )}
              <div className="prose-col">
                {explanation.paragraphs.map((paragraph) => (
                  <div key={paragraph.id}>
                    {paragraph.heading && <h2>{paragraph.heading}</h2>}
                    <p>{paragraph.text}</p>
                    <SourceRow citations={paragraph.citations} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="wb-panel" role="tabpanel" id="panel-activity" aria-labelledby="tab-activity">
          <AuditTimeline entries={activityEntries} verified={verified === true} showToggle={false} />
        </div>
      )}

      {tab === "triggered" && (
        <div
          className="wb-panel"
          role="tabpanel"
          id="panel-triggered"
          aria-labelledby="tab-triggered"
        >
          <div className="facts">
            <div className="fact">
              <span className="fact-label">What we looked for</span>
              <span className="fact-value">{rule?.description ?? rule?.name ?? alert.ruleId}</span>
            </div>
            <div className="fact">
              <span className="fact-label">What we found</span>
              <span className="fact-value">{alert.summarySentence}</span>
            </div>
            <div className="fact">
              <span className="fact-label">Why that matters</span>
              <span className="fact-value">
                {alertNotes[0] ? (
                  <>
                    {alertNotes[0].clauseName}: {alertNotes[0].summary}{" "}
                    <button
                      type="button"
                      className="btn-quiet"
                      onClick={() => setTab("policy")}
                    >
                      See all policy references
                    </button>
                  </>
                ) : (
                  "No policy reference is attached to this rule."
                )}
              </span>
            </div>
          </div>

          <div className="wb-actions">
            <button
              type="button"
              className="btn-quiet"
              aria-expanded={showRule}
              onClick={() => setShowRule((value) => !value)}
            >
              {showRule ? "Hide rule details" : "Show rule details"}
            </button>
          </div>

          {showRule && (
            <div className="rule-details">
              <dl>
                <div className="kv">
                  <dt>Rule</dt>
                  <dd>{alert.ruleId}</dd>
                </div>
                <div className="kv">
                  <dt>Version</dt>
                  <dd>{alert.ruleVersion}</dd>
                </div>
                {Object.entries(alert.result.parameters).map(([key, value]) => (
                  <div className="kv" key={key}>
                    <dt>{camelWords(key)}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}

      {tab === "policy" && (
        <div className="wb-panel" role="tabpanel" id="panel-policy" aria-labelledby="tab-policy">
          {alertNotes.length === 0 ? (
            <div className="state-block">
              <p>No policy references are attached to this alert.</p>
            </div>
          ) : (
            <div className="note-stack">
              {alertNotes.map((note) => (
                <PolicyNote key={`${note.clauseName}_${note.citation}`} {...note} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "draft" && (
        <div className="wb-panel" role="tabpanel" id="panel-draft" aria-labelledby="tab-draft">
          {!draft ? (
            <div className="state-block">
              <p>No report draft yet.</p>
              <p>Preparing one saves it to the audit record so it cannot be quietly changed.</p>
              <button
                type="button"
                className="btn btn-plain"
                disabled={draftBusy}
                onClick={() => void prepareDraft()}
              >
                {draftBusy ? "Preparing…" : "Prepare report draft"}
              </button>
              {draftError && <p className="error-inline">{draftError}</p>}
            </div>
          ) : (
            <div>
              <p className="ai-tag">
                {draft.generatedBy === "template" ? (
                  <>Written from template</>
                ) : (
                  <>
                    <span className="ai-glyph">✦</span> AI-assisted
                  </>
                )}{" "}
                · {DOSSIER_LABELS[draft.kind]} · prepared {formatShort(draft.createdAt)}
              </p>
              <div className="note-layout">
                <div className="prose-col">
                  <AiDraftMarking source={draft.generatedBy === "template" ? "template" : "ai"}>
                    {draft.paragraphs.map((paragraph) => (
                      <div key={paragraph.id}>
                        {paragraph.heading && <h2>{paragraph.heading}</h2>}
                        <p>{paragraph.text}</p>
                        <SourceRow citations={paragraph.citations} />
                      </div>
                    ))}
                  </AiDraftMarking>
                </div>
                <div className="note-margin">
                  {draftNotes.map((note) => (
                    <PolicyNote key={`${note.clauseName}_${note.citation}`} {...note} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="wb-panel" role="tabpanel" id="panel-history" aria-labelledby="tab-history">
          {verified === false && (
            <div className="error-block">
              <p>
                The audit record did not verify. Entry {firstBroken ?? 0} was altered; later
                entries can no longer be trusted.
              </p>
            </div>
          )}
          {historyEntries.length === 0 ? (
            <div className="state-block">
              <p>No entries are saved against this case yet.</p>
            </div>
          ) : (
            <AuditTimeline entries={historyEntries} verified={verified === true} />
          )}
        </div>
      )}

      <DecisionBar
        status={alert.status}
        saveResult={saveResult}
        error={decisionError}
        busy={decisionBusy}
        submit={(choice, reason) => void submit(choice, reason)}
      />
    </div>
  );
}
