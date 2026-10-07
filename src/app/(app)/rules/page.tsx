"use client";

import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { Pagination } from "@/components/workspace/Pagination";
import { SpotCode } from "@/components/illustration/scenes/Spots";
import { EmptySearch } from "@/components/illustration/scenes";
import { SeverityDot } from "@/components/signature/SeverityDot";
import { DOMAIN_LABELS } from "@/components/workspace/nav";
import type { RuleCard } from "@/lib/rule-copy";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "loading" | "ready" | "error";

export default function RulesPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [rules, setRules] = useState<RuleCard[]>([]);
  const [query, setQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");

  const load = useRef(async () => {
    setPhase("loading");
    setError("");
    try {
      const response = await fetch("/api/rules");
      if (!response.ok) throw new Error("The rule list could not be loaded.");
      const data = (await response.json()) as { rules: RuleCard[] };
      setRules(data.rules);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The rule list could not be loaded.");
      setPhase("error");
    }
  });

  useEffect(() => {
    void load.current();
  }, []);

  const stats = useMemo(() => {
    const total = rules.length;
    const critical = rules.filter((r) => r.severity === "critical").length;
    const warning = rules.filter((r) => r.severity === "high").length;
    const routine = rules.filter((r) => r.severity === "medium" || r.severity === "low").length;
    const domains = Array.from(new Set(rules.map((r) => r.domain)));
    return { total, critical, warning, routine, domains };
  }, [rules]);

  const filtered = useMemo(() => {
    let list = rules;
    if (selectedDomain !== "all") {
      list = list.filter((r) => r.domain === selectedDomain);
    }
    if (selectedSeverity !== "all") {
      list = list.filter((r) => r.severity === selectedSeverity);
    }
    const needle = query.trim().toLowerCase();
    if (needle) {
      list = list.filter((rule) =>
        [rule.id, rule.name, DOMAIN_LABELS[rule.domain] ?? rule.domain]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }
    return list;
  }, [rules, selectedDomain, selectedSeverity, query]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [query, selectedDomain, selectedSeverity]);

  const paginatedRules = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="page-case-room">
      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">Deterministic Rules</h1>
          <p className="page-serif-headline">
            {rules.length} rules decide what gets flagged. AI never makes that call.
          </p>
          <p className="page-note">
            Each rule is a fixed piece of code: the same records go in, the same result comes out.
            Open one to read it in plain English and test it on a live sample.
          </p>
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="rules" />

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
            <SpotCode size={110} />
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
                onClick={() => { setSelectedDomain("all"); setSelectedSeverity("all"); }}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Total Rules
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Across {stats.domains.length} domains
                </div>
              </div>

              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => setSelectedSeverity(selectedSeverity === "critical" ? "all" : "critical")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--critical)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Critical Severity
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--critical)", marginTop: "2px" }}>
                  {stats.critical}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Immediate review
                </div>
              </div>

              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => setSelectedSeverity(selectedSeverity === "warning" ? "all" : "warning")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-1)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  High / Warning
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {stats.warning}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Standard alerts
                </div>
              </div>

              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)" }}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--verified)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Rule Execution
                </div>
                <div style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "var(--verified)", marginTop: "6px" }}>
                  100% Deterministic
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", marginTop: "2px" }}>
                  Zero hallucination
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter / Search Controls */}
      <div className="rt-toolbar" style={{ flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
        <div className="rt-search" style={{ minWidth: "240px", flex: "1" }}>
          <label htmlFor="rt-search" className="sr-only">
            Search rules
          </label>
          <input
            id="rt-search"
            type="search"
            placeholder="Search by rule code (e.g. AML-001) or title..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn ${selectedDomain === "all" ? "btn-primary" : "btn-plain"}`}
            style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
            onClick={() => setSelectedDomain("all")}
          >
            All Domains
          </button>
          {stats.domains.map((dom) => (
            <button
              key={dom}
              type="button"
              className={`btn ${selectedDomain === dom ? "btn-primary" : "btn-plain"}`}
              style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
              onClick={() => setSelectedDomain(selectedDomain === dom ? "all" : dom)}
            >
              {DOMAIN_LABELS[dom] ?? dom}
            </button>
          ))}
        </div>
      </div>

      {phase === "loading" && (
        <div className="alerts-table" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <div className="skeleton-row" key={index}>
              <span className="skeleton-block" />
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
          ))}
        </div>
      )}

      {phase === "error" && (
        <div className="error-block">
          <p>{error}</p>
          <button type="button" className="btn btn-plain" onClick={() => void load.current()}>
            Try again
          </button>
        </div>
      )}

      {phase === "ready" && (
        <>
          {filtered.length === 0 ? (
            <div className="rt-empty" style={{ padding: "var(--space-7) 0", textAlign: "center" }}>
              <EmptySearch size={132} />
              <div className="state-block" style={{ marginTop: "var(--space-4)" }}>
                <p style={{ fontWeight: 600 }}>No rule matches your filters.</p>
                <p className="page-note">Try clearing the search query or selecting &quot;All Domains&quot;.</p>
                <button
                  type="button"
                  className="btn btn-plain"
                  style={{ marginTop: "var(--space-3)" }}
                  onClick={() => {
                    setQuery("");
                    setSelectedDomain("all");
                    setSelectedSeverity("all");
                  }}
                >
                  Reset all filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="alerts-table" style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
                <div className="alerts-row alerts-head rt-head" style={{ background: "var(--surface-muted)", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600 }}>
                  <span>Rule &amp; Identifier</span>
                  <span>Domain Area</span>
                  <span>Severity</span>
                  <span>Action</span>
                </div>
                {paginatedRules.map((rule) => (
                  <Link
                    className="alerts-row rt-list-row"
                    href={`/rules/${rule.id}`}
                    key={rule.id}
                    style={{ transition: "background 0.15s ease", borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <span className="reg-name" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span className="row-primary" style={{ fontWeight: 500, color: "var(--text-1)" }}>{rule.name}</span>
                      <span className="row-secondary" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span className="rt-id" style={{ background: "var(--surface-muted)", padding: "1px 6px", borderRadius: "3px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-2)", border: "1px solid var(--border-subtle)" }}>
                          {rule.id}
                        </span>
                      </span>
                    </span>
                    <span className="row-cell" style={{ color: "var(--text-2)", fontSize: "var(--font-sm)" }}>
                      <span style={{ display: "inline-block", padding: "2px 8px", background: "var(--surface-sunken)", borderRadius: "4px" }}>
                        {DOMAIN_LABELS[rule.domain] ?? rule.domain}
                      </span>
                    </span>
                    <span className="row-cell">
                      <SeverityDot severity={rule.severity} />
                    </span>
                    <span className="row-cell" style={{ textAlign: "right", color: "var(--brand-accent, var(--text-2))", fontSize: "var(--font-xs)" }}>
                      View &amp; Test &rarr;
                    </span>
                  </Link>
                ))}
              </div>

              {/* Pagination Bar */}
              <Pagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                sizes={[10, 20, 50]}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
