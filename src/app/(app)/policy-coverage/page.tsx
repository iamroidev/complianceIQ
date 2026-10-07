"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Upload, ChevronRight, ChevronDown, Search, Filter, AlertTriangle, ShieldCheck, HelpCircle, X, FileText, Link2 } from "lucide-react";
import { getRule, TIER1_RULES } from "@/core/engine/rules";
import type { CoverageItem, GapSuggestion, Obligation } from "@/core/types";
import { formatDay } from "@/lib/format";
import { CoveragePinboard } from "@/components/illustration/scenes/CoveragePinboard";
import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { useRole, roleHeaders } from "@/components/workspace/role-context";
import { AiDraftMarking } from "@/components/signature/AiDraftMarking";
import { Seal, Thread } from "@/components/illustration/kit";

type Phase = "loading" | "ready" | "error";
type SegKey = CoverageItem["status"];
type ViewMode = "groups" | "pinboard" | "list";

interface CoveragePayload {
  items: CoverageItem[];
  headline: string;
  asOf: string;
  suggestions?: GapSuggestion[];
}

const STATUS_WORD: Record<SegKey, string> = {
  covered: "Fully checked",
  partial: "Partly checked",
  gap: "No automated check",
};

export default function PolicyCoveragePage() {
  const { role } = useRole();
  const [phase, setPhase] = useState<Phase>("loading");
  const [coverage, setCoverage] = useState<CoveragePayload | null>(null);
  const [obligations, setObligations] = useState<Map<string, Obligation>>(new Map());
  const [filter, setFilter] = useState<SegKey | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("groups");
  const [searchQ, setSearchQ] = useState("");
  const [loadError, setLoadError] = useState("");

  // Pagination state (§30.4)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Group accordion open state (document IDs)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Detail panel drawer
  const [selectedItem, setSelectedItem] = useState<{
    item: CoverageItem;
    obligation?: Obligation;
  } | null>(null);

  // Connect rule modal
  const [connectingItem, setConnectingItem] = useState<CoverageItem | null>(null);
  const [connectRuleId, setConnectRuleId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  const openConnect = (item: CoverageItem) => {
    setConnectingItem(item);
    setConnectRuleId("");
    setConnectError("");
  };

  const handleConnect = async () => {
    if (!connectingItem || !connectRuleId || isConnecting) return;
    setIsConnecting(true);
    setConnectError("");
    try {
      const res = await fetch("/api/coverage/connect", {
        method: "POST",
        headers: roleHeaders(role),
        body: JSON.stringify({
          obligationId: connectingItem.obligationId,
          ruleId: connectRuleId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "The rule could not be connected.");
      setConnectingItem(null);
      await load();
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "The rule could not be connected.");
    } finally {
      setIsConnecting(false);
    }
  };

  async function load() {
    setPhase("loading");
    setLoadError("");
    try {
      const [coverageResponse, obligationsResponse] = await Promise.all([
        fetch("/api/coverage?suggest=true"),
        fetch("/api/obligations"),
      ]);
      if (!coverageResponse.ok || !obligationsResponse.ok) throw new Error("Could not load coverage.");
      const coverageData = (await coverageResponse.json()) as CoveragePayload;
      const obligationsData = (await obligationsResponse.json()) as { obligations: Obligation[] };
      setCoverage(coverageData);

      const oblMap = new Map(obligationsData.obligations.map((o) => [o.id, o]));
      setObligations(oblMap);

      // Open groups that have gaps by default per §30.3
      const groupsWithGaps = new Set<string>();
      for (const item of coverageData.items) {
        if (item.status === "gap") {
          const obl = oblMap.get(item.obligationId);
          if (obl?.source.documentId) {
            groupsWithGaps.add(obl.source.documentId);
          }
        }
      }
      setOpenGroups(groupsWithGaps);

      setPhase("ready");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load coverage.");
      setPhase("error");
    }
  }

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    loadRef.current();
  }, []);

  const counts = useMemo(() => {
    const map: Record<SegKey, number> = { covered: 0, partial: 0, gap: 0 };
    for (const item of coverage?.items ?? []) map[item.status] += 1;
    return map;
  }, [coverage]);

  // Joined items
  const allJoined = useMemo(() => {
    if (!coverage) return [];
    return coverage.items.map((item) => ({
      item,
      obligation: obligations.get(item.obligationId),
    }));
  }, [coverage, obligations]);

  // Filtered & searched items
  const filtered = useMemo(() => {
    return allJoined.filter(({ item, obligation }) => {
      if (filter && item.status !== filter) return false;
      if (searchQ.trim()) {
        const q = searchQ.toLowerCase();
        const text = `${obligation?.title ?? ""} ${obligation?.plainDescription ?? ""} ${obligation?.source?.quote ?? ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [allJoined, filter, searchQ]);

  // Document groups per §30.3
  const documentGroups = useMemo(() => {
    const map = new Map<string, {
      documentId: string;
      documentTitle: string;
      items: typeof filtered;
      covered: number;
      partial: number;
      gap: number;
    }>();

    for (const entry of filtered) {
      const docId = entry.obligation?.source.documentId || "other";
      const docTitle = docId.replace("doc_", "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) + " Policy";

      if (!map.has(docId)) {
        map.set(docId, {
          documentId: docId,
          documentTitle: docTitle,
          items: [],
          covered: 0,
          partial: 0,
          gap: 0,
        });
      }
      const g = map.get(docId)!;
      g.items.push(entry);
      if (entry.item.status === "covered") g.covered++;
      else if (entry.item.status === "partial") g.partial++;
      else if (entry.item.status === "gap") g.gap++;
    }

    return Array.from(map.values());
  }, [filtered]);

  // Paginated slice for List view (§30.4)
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  // Toggle group accordion
  const toggleGroup = (docId: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  return (
    <div className="page-case-room">
      {/* Page Header Frame (§29.0, §30.3) */}
      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">Policy Coverage</h1>
          <p className="page-serif-headline">
            {phase === "loading" || !coverage
              ? "Calculating policy obligation checks…"
              : coverage.headline}
          </p>
        </div>

        <Link href="/obligations" className="btn btn-navy">
          <Upload size={16} />
          <span>Upload a policy</span>
        </Link>
      </header>

      {/* About this screen guidance strip (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="policy-coverage" />

      {phase === "loading" && (
        <div className="overview-desk-panel" style={{ minHeight: 380 }} aria-busy="true">
          <p className="page-serif-headline" style={{ textAlign: "center", paddingTop: 80 }}>
            Scanning policy documents and automated checks…
          </p>
        </div>
      )}

      {phase === "error" && (
        <div className="error-block" style={{ padding: "48px 24px", textAlign: "center" }}>
          <p className="t-sentence" style={{ marginBottom: 16 }}>
            {loadError || "The coverage list is unavailable right now."}
          </p>
          <button type="button" className="btn btn-navy" onClick={loadRef.current}>
            Try again
          </button>
        </div>
      )}

      {phase === "ready" && coverage && (
        <>
          {/* §30.3 Gap Banner: One sentence, one button */}
          {counts.gap > 0 && (
            <div className="coverage-gap-banner">
              <div className="gap-banner-text">
                <AlertTriangle size={18} className="gap-banner-icon" />
                <span>
                  <strong>{counts.gap} obligations have no automated check.</strong> Start with the 2 with the highest risk.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-navy gap-banner-action"
                onClick={() => {
                  setFilter("gap");
                  setViewMode("groups");
                }}
              >
                Review gaps
              </button>
            </div>
          )}

          {/* §30.3 Three Status Cards (Illustrated filter paper surfaces) */}
          <div className="coverage-status-cards-row" role="group" aria-label="Coverage status filter cards">
            {/* Card 1: Fully Checked */}
            <div
              className={`coverage-filter-card is-covered${filter === "covered" ? " is-active" : ""}`}
              onClick={() => setFilter(filter === "covered" ? null : "covered")}
              tabIndex={0}
              role="button"
              aria-pressed={filter === "covered"}
            >
              <div className="card-top-illo" aria-hidden="true">
                <Seal size={40} />
              </div>
              <div className="card-number-serif">{counts.covered}</div>
              <div className="card-label-row">
                <span className="card-label">Fully checked</span>
                <span className="card-explanation">Checked daily.</span>
              </div>
            </div>

            {/* Card 2: Partly Checked */}
            <div
              className={`coverage-filter-card is-partial${filter === "partial" ? " is-active" : ""}`}
              onClick={() => setFilter(filter === "partial" ? null : "partial")}
              tabIndex={0}
              role="button"
              aria-pressed={filter === "partial"}
            >
              <div className="card-top-illo" aria-hidden="true">
                <Thread size={40} progress={0.5} />
              </div>
              <div className="card-number-serif">{counts.partial}</div>
              <div className="card-label-row">
                <span className="card-label">Partly checked</span>
                <span className="card-explanation">Some evidence is missing.</span>
              </div>
            </div>

            {/* Card 3: No Automated Check (Gaps) */}
            <div
              className={`coverage-filter-card is-gap${filter === "gap" ? " is-active" : ""}`}
              onClick={() => setFilter(filter === "gap" ? null : "gap")}
              tabIndex={0}
              role="button"
              aria-pressed={filter === "gap"}
            >
              <div className="card-top-illo" aria-hidden="true">
                <Thread size={40} progress={0.25} />
              </div>
              <div className="card-number-serif terracotta">{counts.gap}</div>
              <div className="card-label-row">
                <span className="card-label">No automated check</span>
                <span className="card-explanation">Nothing watches these.</span>
              </div>
              <button
                type="button"
                className="card-quick-fix-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter("gap");
                }}
              >
                Fix these first
              </button>
            </div>
          </div>

          {/* Controls Bar: Search + Filter status + View Mode Toggle */}
          <div className="coverage-toolbar-row">
            <div className="coverage-search-box">
              <Search size={16} className="search-icon" aria-hidden="true" />
              <input
                type="search"
                className="coverage-search-input"
                placeholder="Search obligations or policies…"
                value={searchQ}
                onChange={(e) => {
                  setSearchQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="coverage-toolbar-actions">
              {filter && (
                <button
                  type="button"
                  className="btn btn-quiet clear-filter-btn"
                  onClick={() => setFilter(null)}
                >
                  Clear filter ({STATUS_WORD[filter]})
                </button>
              )}

              {/* View Switcher: Groups (Default) | Pinboard | List */}
              <div className="view-mode-pill-toggle" role="tablist" aria-label="Coverage View Modes">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "groups"}
                  className={`view-toggle-btn${viewMode === "groups" ? " is-active" : ""}`}
                  onClick={() => setViewMode("groups")}
                >
                  Grouped by policy
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "pinboard"}
                  className={`view-toggle-btn${viewMode === "pinboard" ? " is-active" : ""}`}
                  onClick={() => setViewMode("pinboard")}
                >
                  Pinboard
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "list"}
                  className={`view-toggle-btn${viewMode === "list" ? " is-active" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  Table List
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: Grouped by Policy Accordion (§30.3 Default) */}
          {viewMode === "groups" && (
            <div className="coverage-groups-container">
              {documentGroups.map((group) => {
                const isOpen = openGroups.has(group.documentId);
                const groupTotal = group.items.length;
                const coveredWidth = groupTotal > 0 ? (group.covered / groupTotal) * 100 : 0;
                const partialWidth = groupTotal > 0 ? (group.partial / groupTotal) * 100 : 0;
                const gapWidth = groupTotal > 0 ? (group.gap / groupTotal) * 100 : 0;

                return (
                  <div key={group.documentId} className="policy-group-accordion">
                    {/* Group Header Row */}
                    <div
                      className="group-header-row"
                      onClick={() => toggleGroup(group.documentId)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="group-title-col">
                        <span className="group-chevron" aria-hidden="true">
                          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </span>
                        <h3 className="group-doc-title">{group.documentTitle}</h3>
                        <span className="group-count-pill">{groupTotal} obligations</span>
                      </div>

                      {/* Mini Segmented Bar (12px) */}
                      <div className="group-split-bar" title={`${group.covered} checked, ${group.partial} partly, ${group.gap} gaps`}>
                        <span className="split-seg seg-covered" style={{ width: `${coveredWidth}%` }} />
                        <span className="split-seg seg-partial" style={{ width: `${partialWidth}%` }} />
                        <span className="split-seg seg-gap" style={{ width: `${gapWidth}%` }} />
                      </div>

                      <div className="group-status-summary">
                        {group.gap > 0 ? (
                          <span className="group-gap-alert">{group.gap} {group.gap === 1 ? "gap" : "gaps"}</span>
                        ) : (
                          <span className="group-ok-badge">All checked</span>
                        )}
                      </div>
                    </div>

                    {/* Group Accordion Body: 72px Obligation Rows (§30.3) */}
                    {isOpen && (
                      <div className="group-rows-list">
                        {group.items.map(({ item, obligation }) => {
                          const isGap = item.status === "gap";
                          const isCovered = item.status === "covered";
                          const ruleName = item.ruleIds.map((id) => getRule(id)?.meta.name ?? id).join(", ");

                          return (
                            <div
                              key={item.obligationId}
                              className={`obligation-row-72 status-${item.status}`}
                              onClick={() => setSelectedItem({ item, obligation })}
                            >
                              {/* 32px State Icon */}
                              <div className="obl-icon-col" aria-hidden="true">
                                {isCovered ? (
                                  <Seal size={32} />
                                ) : item.status === "partial" ? (
                                  <Thread size={32} progress={0.5} />
                                ) : (
                                  <div className="loose-end-icon">
                                    <span className="loose-dot" />
                                    <span className="loose-tail" />
                                  </div>
                                )}
                              </div>

                              {/* Obligation in plain words (17px/600 in --text) + Highlighted Quote */}
                              <div className="obl-text-col">
                                <h4 className="obl-sentence">
                                  {obligation?.plainDescription ?? item.obligationId}
                                </h4>
                                {obligation?.source?.quote && (
                                  <blockquote className="obl-quote-highlight">
                                    “<mark className="quote-mark">{obligation.source.quote}</mark>”
                                  </blockquote>
                                )}
                              </div>

                              {/* Right Action / Status Chip */}
                              <div className="obl-action-col">
                                {isGap ? (
                                  <button
                                    type="button"
                                    className="btn btn-navy connect-rule-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openConnect(item);
                                    }}
                                  >
                                    Connect to a rule
                                  </button>
                                ) : isCovered ? (
                                  <span className="checked-daily-chip">
                                    <ShieldCheck size={14} />
                                    <span>Checked daily · {ruleName}</span>
                                  </span>
                                ) : (
                                  <span className="partly-checked-chip">
                                    <span>Partly checked · {ruleName}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: The Pinboard Scene (§29.7, §30.3) */}
          {viewMode === "pinboard" && (
            <CoveragePinboard
              items={filtered.map((f) => f.item)}
              obligations={obligations}
              selectedId={selectedItem?.item.obligationId}
              onSelect={(item, obligation) => setSelectedItem({ item, obligation })}
              onConnectRule={(item) => setConnectingItem(item)}
            />
          )}

          {/* VIEW MODE 3: High-Contrast Paginated Table List (§30.3, §30.4) */}
          {viewMode === "list" && (
            <div className="coverage-table-wrapper">
              <div className="alerts-table cov-table" role="table" aria-label="Obligations and their coverage">
                <div className="alerts-row cov-row alerts-head" role="row">
                  <span role="columnheader">Obligation</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader">Checked by</span>
                  <span role="columnheader">Last passed</span>
                </div>
                {paginatedList.map(({ item, obligation }) => (
                  <div
                    key={item.obligationId}
                    className="alerts-row cov-row clickable-row"
                    role="row"
                    onClick={() => setSelectedItem({ item, obligation })}
                  >
                    <span className="cov-sentence-cell" role="cell">
                      <span className="row-primary">
                        {obligation?.plainDescription ?? item.obligationId}
                      </span>
                      {obligation?.source?.quote && (
                        <blockquote className="cov-quote-box">
                          “<mark className="quote-mark">{obligation.source.quote}</mark>”
                        </blockquote>
                      )}
                    </span>
                    <span role="cell">
                      <span className={`status-pill pill-${item.status}`}>
                        {STATUS_WORD[item.status]}
                      </span>
                    </span>
                    <span className="row-cell" role="cell">
                      {item.ruleIds.map((id) => getRule(id)?.meta.name ?? id).join(", ") || "No automated check"}
                    </span>
                    <span className="row-cell" role="cell">
                      {item.lastPassedAt ? formatDay(item.lastPassedAt) : "—"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pagination Bar (§30.4) */}
              <div className="pagination-bar-case-room">
                <span className="pagination-info">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
                </span>

                <div className="pagination-controls">
                  <button
                    type="button"
                    className="btn btn-plain btn-page"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ‹ Previous
                  </button>
                  <span className="page-indicator">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-plain btn-page"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next ›
                  </button>

                  <select
                    className="page-size-select"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    aria-label="Rows per page"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* AI-Assisted Suggestions Section for Gaps (§30.3) */}
          {coverage.suggestions && coverage.suggestions.length > 0 && (
            <section className="cov-suggestions-panel" aria-labelledby="cov-suggestions-title">
              <div className="suggestions-header">
                <span className="suggestions-icon" aria-hidden="true">
                  <FileText size={16} />
                </span>
                <div className="suggestions-heading">
                  <h3 id="cov-suggestions-title" className="suggestions-title">
                    AI-assisted gap suggestions
                  </h3>
                  <p className="suggestions-note">
                    Advisory only. A suggestion never counts as coverage until a person connects
                    it to a rule.
                  </p>
                </div>
                <span className="suggestions-count">
                  {coverage.suggestions.length}{" "}
                  {coverage.suggestions.length === 1 ? "suggestion" : "suggestions"}
                </span>
              </div>

              <div className="cov-suggestion-list">
                {coverage.suggestions.map((suggestion) => {
                  const item = coverage.items.find(
                    (i) => i.obligationId === suggestion.obligationId,
                  );
                  const obligation = suggestion.obligationId
                    ? obligations.get(suggestion.obligationId)
                    : undefined;

                  return (
                    <div className="cov-suggestion" key={suggestion.id}>
                      <AiDraftMarking
                        source={suggestion.generatedBy === "template" ? "template" : "ai"}
                      >
                        <p className="cov-suggestion-text">{suggestion.text}</p>
                        <blockquote className="cov-quote-box">
                          &ldquo;
                          <mark className="quote-mark">{suggestion.citedQuote}</mark>&rdquo;
                        </blockquote>
                        <p className="cov-suggestion-check">
                          <strong>Suggested check:</strong> {suggestion.suggestedCheck}
                        </p>

                        {item && (
                          <div className="cov-suggestion-actions">
                            {item.status === "gap" && (
                              <button
                                type="button"
                                className="btn btn-navy btn-sm"
                                onClick={() => openConnect(item)}
                              >
                                <Link2 size={14} aria-hidden="true" />
                                <span>Connect to a rule</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-plain btn-sm"
                              onClick={() => setSelectedItem({ item, obligation })}
                            >
                              <span>Open obligation</span>
                              <ChevronRight size={14} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </AiDraftMarking>
                    </div>
                  );
                })}
              </div>

              <p className="suggestions-foot">
                Suggestions quote the policy itself. Gap order follows fixed rules: obligation
                type, then policy criticality. AI never sets the order.
              </p>
            </section>
          )}
        </>
      )}

      {/* Side Detail Panel (420px) (§30.3) */}
      {selectedItem && (
        <div className="deadline-drawer-backdrop" onClick={() => setSelectedItem(null)}>
          <div
            className="deadline-drawer-panel coverage-detail-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="drawer-header-row">
              <span className="drawer-eyebrow">Obligation & Rule Coverage</span>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setSelectedItem(null)}
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>

            <h3 className="drawer-title">
              {selectedItem.obligation?.plainDescription ?? selectedItem.item.obligationId}
            </h3>

            <div className="drawer-urgency-row">
              <span className={`status-pill pill-${selectedItem.item.status}`}>
                {STATUS_WORD[selectedItem.item.status]}
              </span>
              <span className="drawer-due-date">
                Document: {selectedItem.obligation?.source.documentId?.replace("doc_", "") ?? "policy"}
              </span>
            </div>

            {/* Highlighted Quote Block */}
            <div className="drawer-quote-block">
              <span className="drawer-quote-label">Exact Policy Text</span>
              <blockquote className="drawer-quote-text">
                “<mark className="quote-mark">{selectedItem.obligation?.source.quote}</mark>”
              </blockquote>
            </div>

            {/* Mapped Rule / Gaps */}
            <div className="drawer-meta-table">
              <div className="meta-row">
                <span className="meta-key">Enforcement:</span>
                <span className="meta-val">
                  {selectedItem.item.ruleIds.map((id) => getRule(id)?.meta.name ?? id).join(", ") || "No automated rule"}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-key">Last Checked:</span>
                <span className="meta-val">
                  {selectedItem.item.lastPassedAt ? formatDay(selectedItem.item.lastPassedAt) : "Never evaluated"}
                </span>
              </div>
            </div>

            {/* Action */}
            <div className="drawer-actions-block">
              {selectedItem.item.status === "gap" ? (
                <button
                  type="button"
                  className="btn btn-navy drawer-complete-btn"
                  onClick={() => {
                    openConnect(selectedItem.item);
                    setSelectedItem(null);
                  }}
                >
                  Connect to an automated check
                </button>
              ) : (
                <div className="drawer-completed-chip">
                  <ShieldCheck size={16} />
                  <span>Actively watched by automated rule checks</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connect to Rule Modal Dialog */}
      {connectingItem && (
        <div className="modal-backdrop" onClick={() => setConnectingItem(null)}>
          <div className="modal-paper-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Connect obligation to a check</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setConnectingItem(null)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="modal-desc">
              Assign an automated rule to watch this obligation. Any detected breaches will raise alerts.
            </p>
            <div className="modal-field">
              <label htmlFor="select-rule" className="modal-label">Choose an automated rule</label>
              <select
                id="select-rule"
                className="modal-input"
                value={connectRuleId}
                onChange={(e) => setConnectRuleId(e.target.value)}
              >
                <option value="">Choose a rule…</option>
                {[...TIER1_RULES]
                  .sort((a, b) => a.meta.id.localeCompare(b.meta.id))
                  .map((rule) => (
                    <option key={rule.meta.id} value={rule.meta.id}>
                      {rule.meta.id}: {rule.meta.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="modal-actions-row">
              {connectError && (
                <p className="drawer-error-msg modal-error" role="alert">
                  {connectError}
                </p>
              )}
              <button
                type="button"
                className="btn btn-plain"
                onClick={() => setConnectingItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-navy"
                onClick={() => void handleConnect()}
                disabled={!connectRuleId || isConnecting}
              >
                {isConnecting ? "Saving…" : "Save to audit record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
