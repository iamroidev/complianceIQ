"use client";

import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { SpotPayment } from "@/components/illustration/scenes/Spots";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "@/components/signature/SeverityDot";
import { timeAgo } from "@/lib/format";
import {
  SOURCE_ROWS,
  SOURCE_STATUS_LABEL,
  SOURCE_STATUS_TONE,
  lastCheckIso,
  sourceHeadline,
} from "@/lib/sources";

type Phase = "loading" | "ready" | "error";

export default function SourcesPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [asOf, setAsOf] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = useRef(async () => {
    setPhase("loading");
    setLoadError("");
    try {
      const response = await fetch("/api/alerts");
      if (!response.ok) throw new Error("Sources could not be loaded.");
      const data = (await response.json()) as { asOf: string };
      setAsOf(data.asOf);
      setPhase("ready");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Sources could not be loaded.");
      setPhase("error");
    }
  });

  useEffect(() => {
    void load.current();
  }, []);

  const stats = useMemo(() => {
    const total = SOURCE_ROWS.length;
    const ok = SOURCE_ROWS.filter((r) => r.status === "reporting").length;
    const delayed = SOURCE_ROWS.filter((r) => r.status === "delayed").length;
    const stopped = SOURCE_ROWS.filter((r) => r.status === "disconnected").length;
    return { total, ok, delayed, stopped };
  }, []);

  const headline =
    phase === "loading"
      ? "Loading sources…"
      : phase === "error"
        ? "Sources could not be loaded."
        : sourceHeadline(SOURCE_ROWS);

  return (
    <div className="page-case-room">
      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">Data Ingestion Sources &amp; Connectors</h1>
          <p className="page-serif-headline">{headline}</p>
          <p className="page-note">
            Zero data egress architecture: local connectors emit one-way SHA-256 fingerprints of records, never raw customer PII or confidential payload data.
          </p>
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="sources" />

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
            <SpotPayment size={110} />
          </div>
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "var(--space-3)",
              }}
            >
              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Connected Sources
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Enterprise integrations
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--verified)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Active Ingestion
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--verified)", marginTop: "2px" }}>
                  {stats.ok}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Healthy heartbeat
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Delayed
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--warning)", marginTop: "2px" }}>
                  {stats.delayed}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Awaiting sync
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Privacy Protocol
                </div>
                <div style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "var(--verified)", marginTop: "6px" }}>
                  Fingerprint Only
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", marginTop: "2px" }}>
                  Zero raw data egress
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {phase === "error" && (
        <div className="error-block">
          <p>{loadError}</p>
          <button type="button" className="btn btn-plain" onClick={() => void load.current()}>
            Try again
          </button>
        </div>
      )}

      {phase === "loading" && (
        <div className="alerts-table" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <div className="skeleton-row" key={index}>
              <span className="skeleton-block" />
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
          ))}
        </div>
      )}

      {phase === "ready" && (
        <>
          <h2 className="ov-title" style={{ marginTop: "var(--space-5)", fontSize: "var(--font-base)" }}>
            Zero-Egress Ingestion Architecture
          </h2>
          <div className="so-flow" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
            <div className="so-zone">
              <span className="so-zone-tag">Stays inside your secure boundary</span>
              <div className="so-zone-row">
                <div className="so-node">
                  <span className="so-node-title">Internal Enterprise Systems</span>
                  <span className="so-node-note">
                    GitHub, Okta IdP, Epic / EHR system, Netsuite / Expensify
                  </span>
                </div>
                <span className="so-arrow" aria-hidden="true">
                  &rarr;
                </span>
                <div className="so-node">
                  <span className="so-node-title">Local Ingestion Agent</span>
                  <span className="so-node-note">
                    Computes cryptographic hashes &amp; rule metrics locally.
                  </span>
                </div>
              </div>
            </div>
            <span className="so-arrow" aria-hidden="true">
              &rarr;
            </span>
            <div className="so-node so-node-out">
              <span className="so-node-title">ComplianceIQ Engine</span>
              <span className="so-node-note">Deterministic rules execute across fingerprints with zero risk.</span>
            </div>
          </div>

          <h2 className="ov-title" style={{ marginTop: "var(--space-5)", fontSize: "var(--font-base)" }}>
            Active Connectors &amp; Health
          </h2>

          {SOURCE_ROWS.length === 0 ? (
            <div className="state-block">
              <p>No source has reported anything yet.</p>
              <p>Nothing is watching records until a source is added.</p>
            </div>
          ) : (
            <div className="alerts-table" style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
              <div className="alerts-row alerts-head so-head" style={{ background: "var(--surface-muted)", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600 }}>
                <span>Connector Name</span>
                <span>Monitored Scope</span>
                <span>Health Status</span>
                <span>Last Heartbeat</span>
              </div>
              {SOURCE_ROWS.map((row) => {
                const checked = lastCheckIso(row, asOf);
                return (
                  <div className="alerts-row so-row" key={row.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <span className="row-primary" style={{ fontWeight: 500, color: "var(--text-1)" }}>{row.name}</span>
                    <span className="row-cell" style={{ color: "var(--text-2)", fontSize: "var(--font-sm)" }}>{row.watch}</span>
                    <span>
                      <StatusDot
                        label={SOURCE_STATUS_LABEL[row.status]}
                        tone={SOURCE_STATUS_TONE[row.status]}
                      />
                    </span>
                    <span className="so-last">
                      <span className="so-mobile-label">Last check</span>
                      <span title={checked ?? undefined} style={{ fontSize: "var(--font-xs)", color: "var(--text-3)" }}>
                        {checked === null ? "Never" : timeAgo(checked, asOf)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="page-note so-foot" style={{ marginTop: "var(--space-3)" }}>
            The local agent runs within customer VPC / on-premise infrastructure. A delayed status indicates a missed scheduled polling window; existing signed ledger records remain immutable.
          </p>
        </>
      )}
    </div>
  );
}
