"use client";

import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { Pagination } from "@/components/workspace/Pagination";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  EmptyAlerts,
  EmptySearch,
  ErrorDroppedLink,
  SpotAccess,
  SpotCertificate,
  SpotCode,
  SpotDeadline,
  SpotPayment,
  SpotVendor,
} from "@/components/illustration/scenes";
import { Magnifier } from "@/components/illustration/kit";
import { SeverityDot } from "@/components/signature/SeverityDot";
import { DOMAIN_LABELS } from "@/components/workspace/nav";
import { useAlertFilters } from "@/components/workspace/Shell";
import type { Alert, PrioritySuggestion } from "@/core/types";
import { ATTENTION_STATUSES, headlineFor, STATUS_WORDS } from "@/lib/attention";
import { formatShort, timeLeft } from "@/lib/format";

type Phase = "loading" | "ready" | "error";
type Order = "score" | "suggested";

const CLOSED_STATUSES = new Set<Alert["status"]>(["filed", "dismissed", "resolved"]);

function byScore(a: Alert, b: Alert): number {
  return (
    b.riskScore - a.riskScore ||
    Date.parse(a.slaDueAt) - Date.parse(b.slaDueAt) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

function spotFor(rows: Alert[], attentionCount: number, filteredBySearch: boolean) {
  if (attentionCount === 0) return <EmptyAlerts size={110} />;
  if (filteredBySearch && rows.length === 0) return <EmptySearch size={110} />;
  const counts = new Map<string, number>();
  for (const alert of rows) counts.set(alert.domain, (counts.get(alert.domain) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  switch (top) {
    case "people":
      return <SpotCertificate size={110} />;
    case "regulatory":
      return <SpotDeadline size={110} />;
    case "vendor":
      return <SpotVendor size={110} />;
    case "access":
      return <SpotAccess size={110} />;
    case "code":
      return <SpotCode size={110} />;
    case "healthcare":
    case "expense":
    case "ai":
      return <Magnifier size={110} />;
    default:
      return <SpotPayment size={110} />;
  }
}

export default function AlertsPage() {
  const filters = useAlertFilters();
  const [phase, setPhase] = useState<Phase>("loading");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [asOf, setAsOf] = useState<string>("");
  const [order, setOrder] = useState<Order>("score");
  const [suggestion, setSuggestion] = useState<PrioritySuggestion | null>(null);
  const [suggestionState, setSuggestionState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    setPhase("loading");
    setLoadError("");
    try {
      const response = await fetch("/api/alerts");
      if (!response.ok) throw new Error("Could not load alerts.");
      const data = (await response.json()) as { alerts: Alert[]; asOf: string };
      setAlerts(data.alerts);
      setAsOf(data.asOf);
      const domains = [...new Set(data.alerts.map((alert) => alert.domain))].sort();
      filters.setDomains(domains);
      setPhase("ready");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load alerts.");
      setPhase("error");
    }
  }

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    loadRef.current();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "j" && event.key !== "k") return;
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }
      const rows = Array.from(document.querySelectorAll<HTMLAnchorElement>("a.alerts-row"));
      if (rows.length === 0) return;
      event.preventDefault();
      const current = rows.indexOf(document.activeElement as HTMLAnchorElement);
      const next =
        event.key === "j"
          ? Math.min(current + 1, rows.length - 1)
          : Math.max(current - 1, 0);
      rows[current === -1 ? 0 : next]?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function selectOrder(next: Order) {
    setOrder(next);
    if (next === "suggested" && suggestionState === "idle") {
      setSuggestionState("loading");
      try {
        const response = await fetch("/api/priority");
        if (!response.ok) throw new Error("Could not load the suggested order.");
        const data = (await response.json()) as { suggestion: PrioritySuggestion | null };
        setSuggestion(data.suggestion);
        setSuggestionState("ready");
      } catch {
        setSuggestionState("error");
      }
    }
  }

  const scoreOrdered = useMemo(() => [...alerts].sort(byScore), [alerts]);

  const suggestedOrdered = useMemo(() => {
    if (!suggestion) return scoreOrdered;
    const ranks = new Map(suggestion.order.map((entry, index) => [entry.alertId, index]));
    const active = scoreOrdered
      .filter((alert) => ranks.has(alert.id))
      .sort((a, b) => (ranks.get(a.id) ?? 0) - (ranks.get(b.id) ?? 0));
    const rest = scoreOrdered.filter((alert) => !ranks.has(alert.id));
    return [...active, ...rest];
  }, [suggestion, scoreOrdered]);

  const ordered = order === "suggested" ? suggestedOrdered : scoreOrdered;
  const positionInScore = useMemo(() => {
    const map = new Map<string, number>();
    scoreOrdered.forEach((alert, index) => map.set(alert.id, index));
    return map;
  }, [scoreOrdered]);

  const whyById = useMemo(() => {
    const map = new Map<string, string>();
    if (order === "suggested" && suggestion) {
      for (const entry of suggestion.order) map.set(entry.alertId, entry.reason);
    }
    return map;
  }, [order, suggestion]);

  const searching = filters.q.trim() !== "" || filters.domain !== null;
  const rows = useMemo(() => {
    const needle = filters.q.trim().toLowerCase();
    return ordered.filter((alert) => {
      if (filters.domain && alert.domain !== filters.domain) return false;
      if (!needle) return true;
      return (
        alert.summarySentence.toLowerCase().includes(needle) ||
        alert.subject.name.toLowerCase().includes(needle) ||
        alert.ruleId.toLowerCase().includes(needle)
      );
    });
  }, [ordered, filters.q, filters.domain]);

  const attention = useMemo(
    () => rows.filter((alert) => ATTENTION_STATUSES.has(alert.status)),
    [rows],
  );

  const stats = useMemo(() => {
    const total = alerts.length;
    const open = alerts.filter((a) => ATTENTION_STATUSES.has(a.status)).length;
    const critical = alerts.filter((a) => a.severity === "critical" && !CLOSED_STATUSES.has(a.status)).length;
    const resolved = alerts.filter((a) => CLOSED_STATUSES.has(a.status)).length;
    return { total, open, critical, resolved };
  }, [alerts]);

  const headline = asOf ? headlineFor(attention, asOf) : "Loading alerts…";

  useEffect(() => {
    setPage(1);
  }, [filters.q, filters.domain, order]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  return (
    <div className="page-case-room">
      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">Compliance Alert Inbox</h1>
          <p className="page-serif-headline">
            {phase === "error"
              ? "Alerts could not be loaded."
              : phase === "ready"
                ? headline
                : "Loading alerts…"}
          </p>
          <p className="page-note">
            {phase === "ready" && attention.length === 0 && asOf
              ? `Closed cases stay listed below. Time shown is the demo clock, ${formatShort(asOf)}.`
              : "Each alert details the rule violation, subject entity, and SLA timeline to respond."}
          </p>
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="alerts" />

      {/* Visual Top Panel */}
      <section className="overview-desk-panel" style={{ marginBottom: "var(--space-5)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "var(--space-5)",
            alignItems: "center",
          }}
        >
          <div style={{ flexShrink: 0 }}>
            {phase === "error" ? (
              <ErrorDroppedLink size={110} />
            ) : (
              spotFor(rows, attention.length, searching)
            )}
          </div>
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "var(--space-3)",
              }}
            >
              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => {
                  filters.setQ("");
                  filters.setDomain(null);
                }}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Active Attention
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {stats.open}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Needs investigation
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--critical)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Critical SLA
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--critical)", marginTop: "2px" }}>
                  {stats.critical}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  High risk score
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--verified)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Resolved / Filed
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--verified)", marginTop: "2px" }}>
                  {stats.resolved}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Sealed in ledger
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Sorting Mode
                </div>
                <div style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "var(--text-1)", marginTop: "6px" }}>
                  {order === "score" ? "Deterministic Score" : "AI-Assisted Priority"}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", marginTop: "2px" }}>
                  Press j / k to navigate
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {phase === "loading" && (
        <div className="alerts-table" aria-busy="true" aria-label="Loading alerts">
          {[0, 1, 2, 3, 4].map((index) => (
            <div className="skeleton-row" key={index}>
              <span className="skeleton-block" />
              <span className="skeleton-block" />
              <span className="skeleton-block hide-sm" />
              <span className="skeleton-block" />
              <span className="skeleton-block hide-sm" />
            </div>
          ))}
        </div>
      )}

      {phase === "error" && (
        <div className="error-block">
          <p>{loadError || "The alert list is unavailable right now."}</p>
          <button type="button" className="btn btn-plain" onClick={loadRef.current}>
            Try again
          </button>
        </div>
      )}

      {phase === "ready" && (
        <>
          <div className="alerts-toolbar" style={{ flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            <div className="seg" role="group" aria-label="Order of the list">
              <button
                type="button"
                className={`seg-opt${order === "score" ? " is-active" : ""}`}
                aria-pressed={order === "score"}
                onClick={() => selectOrder("score")}
              >
                Score order
              </button>
              <button
                type="button"
                className={`seg-opt${order === "suggested" ? " is-active" : ""}`}
                aria-pressed={order === "suggested"}
                onClick={() => selectOrder("suggested")}
                title="A ranked suggestion drawn up with AI. Scores do not change."
              >
                Suggested order <span className="seg-mark">✦ AI-assisted</span>
              </button>
            </div>
            <span className="toolbar-spacer" />
            <button
              type="button"
              className="btn btn-quiet"
              title="Keyboard shortcuts"
              onClick={() => filters.openShortcuts()}
            >
              ? Keyboard shortcuts
            </button>
          </div>

          {rows.length === 0 && searching ? (
            <div className="alerts-table">
              <div className="state-block" style={{ padding: "var(--space-6) 0", textAlign: "center" }}>
                <p style={{ fontWeight: 600 }}>No alerts match this filter.</p>
                <p className="page-note">
                  {DOMAIN_LABELS[filters.domain ?? ""] ?? "This area"} · search “{filters.q}”
                </p>
                <button
                  type="button"
                  className="btn btn-quiet"
                  style={{ marginTop: "var(--space-3)" }}
                  onClick={() => {
                    filters.setQ("");
                    filters.setDomain(null);
                  }}
                >
                  Clear the filter
                </button>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="alerts-table">
              <div className="state-block" style={{ padding: "var(--space-6) 0", textAlign: "center" }}>
                <p style={{ fontWeight: 600 }}>Nothing needs attention.</p>
                <p className="page-note">Every alert on file has been handled.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="alerts-table" role="table" aria-label="Alerts" style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
                <div className="alerts-row alerts-head" role="row" style={{ background: "var(--surface-muted)", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600 }}>
                  <span role="columnheader">Severity</span>
                  <span role="columnheader">Violation &amp; Rule</span>
                  <span role="columnheader" className="hide-sm">
                    Subject Entity
                  </span>
                  <span role="columnheader">Response SLA</span>
                  <span role="columnheader" className="hide-sm">
                    Status
                  </span>
                </div>
                {paginatedRows.map((alert) => {
                  const left = timeLeft(
                    asOf,
                    alert.slaDueAt,
                    Date.parse(alert.slaDueAt) - Date.parse(alert.createdAt),
                  );
                  const closed = CLOSED_STATUSES.has(alert.status);
                  const scoreIndex = positionInScore.get(alert.id) ?? 0;
                  const movedIndex = orderPosition(suggestedOrdered).get(alert.id) ?? 0;
                  const delta = scoreIndex - movedIndex;
                  const why = whyById.get(alert.id);
                  const moved =
                    order === "suggested" && delta !== 0 && why !== undefined;
                  return (
                    <Link
                      key={alert.id}
                      href={`/alerts/${alert.id}`}
                      className="alerts-row"
                      title={`${alert.summarySentence} — Enter to open`}
                      style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.15s ease" }}
                    >
                      <span>
                        <SeverityDot severity={alert.severity} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span className="row-primary" style={{ fontWeight: 500, color: "var(--text-1)" }}>{alert.summarySentence}</span>
                        <span className="row-secondary" style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-3)" }}>{alert.ruleId}</span>
                          {moved && <span className="moved" style={{ fontSize: "11px" }}>{delta > 0 ? "moved up" : "moved down"}</span>}
                          {moved && (
                            <span className="row-why" title={why} style={{ fontSize: "11px" }}>
                              Why: {why}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="row-cell hide-sm" style={{ color: "var(--text-2)", fontSize: "var(--font-sm)" }}>{alert.subject.name}</span>
                      <span className="sla-cell">
                        {closed ? (
                          <span className="sla-text only-sm">{STATUS_WORDS[alert.status]}</span>
                        ) : (
                          <>
                            <span
                              className={`sla-text${left.overdue ? " is-overdue" : ""}`}
                              title={`Respond by ${alert.slaDueAt}`}
                              style={{ fontSize: "var(--font-xs)" }}
                            >
                              {left.text}
                            </span>
                            <span
                              className="sla-bar"
                              role="img"
                              aria-label={`${Math.round(left.fraction * 100)} percent of the response time left`}
                            >
                              <span
                                className="sla-fill"
                                data-sev={alert.severity}
                                style={{ width: `${Math.max(Math.round(left.fraction * 100), 4)}%` }}
                              />
                            </span>
                          </>
                        )}
                      </span>
                      <span className={`row-status hide-sm${closed ? " is-closed" : ""}`} style={{ fontSize: "var(--font-xs)" }}>
                        {STATUS_WORDS[alert.status]}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              <Pagination
                page={page}
                pageSize={pageSize}
                total={rows.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                sizes={[10, 20, 50]}
              />
            </>
          )}

          {order === "suggested" && (
            <p className="advice-note" style={{ marginTop: "var(--space-3)" }}>
              {suggestionState === "loading" && "Drawing up the suggested order…"}
              {suggestionState === "error" &&
                "Suggested order is unavailable right now. The list stays in score order."}
              {suggestionState === "ready" && !suggestion &&
                "No open alerts to reorder. The list stays in score order."}
              {suggestionState === "ready" && suggestion && (
                <>
                  Suggested order is advice. Risk scores are calculated by rules and are not
                  changed.{" "}
                  {suggestion.generatedBy !== "score-order" && "✦ AI-assisted — a person always decides."}
                </>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function orderPosition(items: Alert[]) {
  const map = new Map<string, number>();
  items.forEach((item, index) => map.set(item.id, index));
  return map;
}
