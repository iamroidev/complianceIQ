"use client";

import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { Pagination } from "@/components/workspace/Pagination";
import { SpotCertificate } from "@/components/illustration/scenes/Spots";
import { EmptySearch } from "@/components/illustration/scenes";
import type { PolicyCard } from "@/lib/policy-copy";
import { kindLabel } from "@/lib/policy-copy";
import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "loading" | "ready" | "error";

export default function PoliciesPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [policies, setPolicies] = useState<PolicyCard[]>([]);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");

  const load = useRef(async () => {
    setPhase("loading");
    setError("");
    try {
      const response = await fetch("/api/policies");
      if (!response.ok) throw new Error("The policy list could not be loaded.");
      const data = (await response.json()) as { policies: PolicyCard[] };
      setPolicies(data.policies);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The policy list could not be loaded.");
      setPhase("error");
    }
  });

  useEffect(() => {
    void load.current();
  }, []);

  const stats = useMemo(() => {
    const total = policies.length;
    const internal = policies.filter((p) => p.kind === "internal_demo").length;
    const regulations = total - internal;
    const totalObligations = policies.reduce((acc, p) => acc + (p.obligations || 0), 0);
    const totalChecks = policies.reduce((acc, p) => acc + (p.checks?.length || 0), 0);
    return { total, internal, regulations, totalObligations, totalChecks };
  }, [policies]);

  const filtered = useMemo(() => {
    let list = policies;
    if (kindFilter !== "all") {
      list = list.filter((p) => p.kind === kindFilter);
    }
    const needle = query.trim().toLowerCase();
    if (needle) {
      list = list.filter((policy) =>
        [policy.title, kindLabel(policy.kind), policy.version].join(" ").toLowerCase().includes(needle),
      );
    }
    return list;
  }, [policies, kindFilter, query]);

  useEffect(() => {
    setPage(1);
  }, [query, kindFilter]);

  const paginatedPolicies = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="page-case-room">
      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">Policies &amp; Regulatory Standards</h1>
          <p className="page-serif-headline">
            {policies.length} policies are on file. {stats.totalObligations} obligations and {stats.totalChecks} automated checks mapped.
          </p>
          <p className="page-note">
            Obligations and deterministic checks are compiled directly from these documents.
            Changes to policy text immediately trigger regression audits across all evidence.
          </p>
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="policies" />

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
            <SpotCertificate size={110} />
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
                onClick={() => setKindFilter("all")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  All Documents
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Active standards
                </div>
              </div>

              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => setKindFilter(kindFilter === "internal_demo" ? "all" : "internal_demo")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--brand-accent, var(--text-1))", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Internal Policies
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {stats.internal}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Company procedures
                </div>
              </div>

              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => setKindFilter(kindFilter === "regulation_summary" ? "all" : "regulation_summary")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-1)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Regulations
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {stats.regulations}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Framework summaries
                </div>
              </div>

              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)" }}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--verified)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Automated Checks
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--verified)", marginTop: "2px" }}>
                  {stats.totalChecks}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", marginTop: "2px" }}>
                  Active verifications
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter / Search Controls */}
      <div className="rt-toolbar" style={{ flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
        <div className="rt-search" style={{ minWidth: "240px", flex: "1" }}>
          <label htmlFor="pl-search" className="sr-only">
            Search policies
          </label>
          <input
            id="pl-search"
            type="search"
            placeholder="Search by title, version, or framework..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn ${kindFilter === "all" ? "btn-primary" : "btn-plain"}`}
            style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
            onClick={() => setKindFilter("all")}
          >
            All Types
          </button>
          <button
            type="button"
            className={`btn ${kindFilter === "internal_demo" ? "btn-primary" : "btn-plain"}`}
            style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
            onClick={() => setKindFilter(kindFilter === "internal_demo" ? "all" : "internal_demo")}
          >
            Internal Policies
          </button>
          <button
            type="button"
            className={`btn ${kindFilter === "regulation_summary" ? "btn-primary" : "btn-plain"}`}
            style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
            onClick={() => setKindFilter(kindFilter === "regulation_summary" ? "all" : "regulation_summary")}
          >
            Regulation Summaries
          </button>
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
                <p style={{ fontWeight: 600 }}>No policy matches that search.</p>
                <p className="page-note">Try a title such as Access Control, or switch filter to All Types.</p>
                <button
                  type="button"
                  className="btn btn-plain"
                  style={{ marginTop: "var(--space-3)" }}
                  onClick={() => {
                    setQuery("");
                    setKindFilter("all");
                  }}
                >
                  Clear filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="alerts-table" style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
                <div className="alerts-row alerts-head pl-head" style={{ background: "var(--surface-muted)", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600 }}>
                  <span>Policy Title &amp; Type</span>
                  <span>Sections</span>
                  <span>Obligations</span>
                  <span>Checks Mapped</span>
                </div>
                {paginatedPolicies.map((policy) => (
                  <div className="alerts-row pl-list-row" key={policy.id} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.15s ease" }}>
                    <span className="reg-name" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span className="row-primary" style={{ fontWeight: 500, color: "var(--text-1)" }}>{policy.title}</span>
                      <span className="row-secondary" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-3)", padding: "1px 6px", background: "var(--surface-sunken)", borderRadius: "3px" }}>
                          {kindLabel(policy.kind)}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
                          v{policy.version}
                        </span>
                      </span>
                    </span>
                    <span className="row-cell" style={{ color: "var(--text-2)", fontSize: "var(--font-sm)" }}>
                      {policy.sections === 1 ? "1 section" : `${policy.sections} sections`}
                    </span>
                    <span className="row-cell" style={{ fontSize: "var(--font-sm)" }}>
                      {policy.obligations === 0 ? (
                        <span style={{ color: "var(--text-3)" }}>0 extracted</span>
                      ) : (
                        <span style={{ color: "var(--text-1)", fontWeight: 500 }}>
                          {policy.obligations} {policy.obligations === 1 ? "obligation" : "obligations"}
                        </span>
                      )}
                    </span>
                    <span className="row-cell" style={{ fontSize: "var(--font-sm)" }}>
                      {policy.checks.length === 0 ? (
                        <span style={{ color: "var(--text-3)" }}>None</span>
                      ) : (
                        <span style={{ color: "var(--verified)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--verified)" }} />
                          {policy.checks.length} {policy.checks.length === 1 ? "check" : "checks"}
                        </span>
                      )}
                    </span>
                  </div>
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
