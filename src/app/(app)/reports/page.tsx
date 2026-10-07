"use client";

import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { AuditPackFan } from "@/components/illustration/scenes/ProductScenes";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "@/components/signature/SeverityDot";
import { DOMAIN_LABELS } from "@/components/workspace/nav";
import { formatDay, formatShort } from "@/lib/format";

type Phase = "loading" | "ready" | "error";
type PackState = "idle" | "working" | "done" | "failed";

interface PackResponse {
  packHash: string;
  ledgerBlockIndex: number;
  generatedAt: string;
  method: string;
  bundle: {
    scope: { from: string; to: string; domains: string[]; generatedBy: string };
    verification: {
      chainOk: boolean;
      evidenceHashesOk: boolean;
      contentHashesOk: boolean;
      headHash: string | null;
    };
    findings: unknown[];
    coverage: { headline: string };
    evidenceIndex: unknown[];
  };
  csv: string;
  pdfBase64: string;
}

const EXPORTS = [
  {
    name: "Audit pack (Full Evidence & Chain Proof)",
    includes: "Executive PDF, structured JSON bundle, and CSV evidence index.",
    proof: "Cryptographically verified with SHA-256 ledger proof.",
    href: "#generate-audit-pack",
    action: "Generate below",
    badge: "Official Pack",
  },
  {
    name: "SAR-style Regulatory Draft (FinCEN / FIU)",
    includes: "XML schema, JSON export, and PDF case report draft.",
    proof: "Signed report draft is immutably sealed in the audit record.",
    href: "/alerts",
    action: "Open a case",
    badge: "Case Specific",
  },
];

function packFiles(pack: PackResponse) {
  const day = pack.generatedAt.slice(0, 10);
  return [
    {
      name: `audit-pack-${day}.pdf`,
      label: "PDF Report",
      size: "Formatted Briefing",
      type: "application/pdf",
      href: `data:application/pdf;base64,${pack.pdfBase64}`,
    },
    {
      name: `audit-pack-${day}.json`,
      label: "JSON Bundle",
      size: "Full Machine Record",
      type: "application/json",
      href: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(pack.bundle, null, 2))}`,
    },
    {
      name: `evidence-index-${day}.csv`,
      label: "CSV Index",
      size: "Evidence Rows",
      type: "text/csv",
      href: `data:text/csv;charset=utf-8,${encodeURIComponent(pack.csv)}`,
    },
  ];
}

export default function ReportsPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [asOf, setAsOf] = useState("");
  const [alertCount, setAlertCount] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("");
  const [areas, setAreas] = useState<string[]>(Object.keys(DOMAIN_LABELS));
  const [packState, setPackState] = useState<PackState>("idle");
  const [pack, setPack] = useState<PackResponse | null>(null);
  const [packError, setPackError] = useState("");
  const [showTech, setShowTech] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const load = useRef(async () => {
    setPhase("loading");
    setLoadError("");
    try {
      const response = await fetch("/api/alerts");
      if (!response.ok) throw new Error("Reports could not be loaded.");
      const data = (await response.json()) as { alerts: unknown[]; asOf: string };
      setAsOf(data.asOf);
      setAlertCount(data.alerts.length);
      setTo(data.asOf.slice(0, 10));
      setPhase("ready");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Reports could not be loaded.");
      setPhase("error");
    }
  });

  useEffect(() => {
    void load.current();
  }, []);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", `${from}T00:00:00.000Z`);
    if (to) params.set("to", `${to}T23:59:59.999Z`);
    if (areas.length > 0) params.set("domains", areas.join(","));
    return params.toString();
  }, [from, to, areas]);

  async function generate() {
    setPackState("working");
    setPackError("");
    setPack(null);
    setShowTech(false);
    setShowSteps(false);
    try {
      const response = await fetch(`/api/reports/audit-pack?${query}`, { method: "POST" });
      if (!response.ok) throw new Error("The audit pack could not be generated.");
      setPack((await response.json()) as PackResponse);
      setPackState("done");
    } catch (err) {
      setPackError(err instanceof Error ? err.message : "The audit pack could not be generated.");
      setPackState("failed");
    }
  }

  const verified = pack
    ? pack.bundle.verification.chainOk &&
      pack.bundle.verification.evidenceHashesOk &&
      pack.bundle.verification.contentHashesOk
    : false;

  return (
    <div className="page-case-room">
      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">Audit Reports &amp; Filing Exports</h1>
          <p className="page-serif-headline">
            Export signed audit packages and regulatory filing packs with cryptographic verification.
          </p>
          <p className="page-note">
            Nothing here is filed or submitted to external parties automatically. Each export renders records that are
            already verified{asOf ? `, as of ${formatDay(asOf)}` : ""}.
          </p>
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="reports" />

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
            <AuditPackFan size={120} />
          </div>
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "var(--space-3)",
              }}
            >
              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Active Alerts
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {alertCount}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Ready for inclusion
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--verified)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Ledger Verification
                </div>
                <div style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "var(--verified)", marginTop: "6px" }}>
                  Chain Guaranteed
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", marginTop: "2px" }}>
                  Zero tampered blocks
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Export Formats
                </div>
                <div style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "var(--text-1)", marginTop: "6px" }}>
                  PDF · JSON · CSV
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", marginTop: "2px" }}>
                  Standard bundles
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
          {[0, 1].map((index) => (
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
          {/* Available Exports List */}
          <div style={{ marginBottom: "var(--space-6)" }}>
            <h2 className="ov-title" style={{ fontSize: "var(--font-base)", marginBottom: "var(--space-3)" }}>
              Available Export Packages
            </h2>
            <div className="alerts-table" style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
              <div className="alerts-row alerts-head rp-head" style={{ background: "var(--surface-muted)", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600 }}>
                <span>Export Package</span>
                <span>Included Artifacts</span>
                <span>Integrity Proof</span>
              </div>
              {EXPORTS.map((row) => (
                <Link className="alerts-row rp-row" href={row.href} key={row.name} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.15s ease" }}>
                  <span className="reg-name" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span className="row-primary" style={{ fontWeight: 500, color: "var(--text-1)" }}>{row.name}</span>
                    <span className="row-secondary" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "var(--brand-accent, var(--text-2))", fontWeight: 500 }}>
                        {row.action} &rarr;
                      </span>
                    </span>
                  </span>
                  <span className="row-cell" style={{ color: "var(--text-2)", fontSize: "var(--font-sm)" }}>{row.includes}</span>
                  <span className="row-cell" style={{ color: "var(--text-2)", fontSize: "var(--font-sm)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--verified)", fontWeight: 500 }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--verified)" }} />
                      {row.proof}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Audit Pack Generator Form */}
          <div
            id="generate-audit-pack"
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              padding: "var(--space-5)",
              marginBottom: "var(--space-6)",
            }}
          >
            <h2 className="ov-title" style={{ marginTop: 0, marginBottom: "var(--space-2)" }}>
              Generate Cryptographic Audit Pack
            </h2>
            <p className="page-note" style={{ marginBottom: "var(--space-4)" }}>
              Filter by date range and compliance domains. Generates a self-contained verifiable package sealed into the audit chain.
            </p>

            {alertCount === 0 ? (
              <div className="state-block rp-empty">
                <p>There is nothing to report yet.</p>
                <p>An audit pack is built from the alerts and evidence already on file.</p>
              </div>
            ) : (
              <div className="rp-form">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
                  <label className="rp-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "var(--font-xs)", fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase" }}>Start Date (From)</span>
                    <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }} />
                  </label>
                  <label className="rp-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "var(--font-xs)", fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase" }}>End Date (To)</span>
                    <input type="date" value={to} onChange={(event) => setTo(event.target.value)} style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }} />
                  </label>
                </div>

                <fieldset className="rp-areas" style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                  <legend style={{ padding: "0 6px", fontSize: "var(--font-xs)", fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase" }}>Compliance Domains</legend>
                  <div className="rp-area-list" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
                    {Object.entries(DOMAIN_LABELS).map(([value, label]) => (
                      <label className="rp-area" key={value} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "var(--font-sm)" }}>
                        <input
                          type="checkbox"
                          checked={areas.includes(value)}
                          onChange={(event) =>
                            setAreas((current) =>
                              event.target.checked
                                ? [...current, value]
                                : current.filter((item) => item !== value),
                            )
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="rp-form-actions" style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void generate()}
                    disabled={packState === "working" || areas.length === 0}
                  >
                    {packState === "working" ? "Generating Pack..." : "Generate Audit Pack"}
                  </button>
                  <span className="page-note">
                    {areas.length === 0
                      ? "Choose at least one domain area."
                      : "The pack records its own SHA-256 fingerprint into the audit ledger."}
                  </span>
                </div>
              </div>
            )}

            {packState === "working" && (
              <div className="alerts-table" aria-busy="true" style={{ marginTop: "var(--space-4)" }}>
                {[0, 1].map((index) => (
                  <div className="skeleton-row" key={index}>
                    <span className="skeleton-block" />
                    <span className="skeleton-block" />
                    <span className="skeleton-block" />
                  </div>
                ))}
              </div>
            )}

            {packState === "failed" && (
              <div className="error-block" style={{ marginTop: "var(--space-4)" }}>
                <p>{packError}</p>
                <button type="button" className="btn btn-plain" onClick={() => void generate()}>
                  Try again
                </button>
              </div>
            )}

            {packState === "done" && pack && (
              <div className="rp-card" style={{ marginTop: "var(--space-5)", background: "var(--surface-sunken)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
                <div className="rp-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="rp-card-title" style={{ fontWeight: 600, fontSize: "var(--font-base)" }}>Audit Pack Generated Successfully</span>
                  <StatusDot
                    label={verified ? "Records Verified" : "Verification Warning"}
                    tone={verified ? "verified" : "critical"}
                  />
                </div>
                <p className="rp-card-note" style={{ margin: "4px 0 var(--space-4)", fontSize: "var(--font-xs)", color: "var(--text-3)" }}>
                  3 files bundled · Generated {formatShort(pack.generatedAt)} · Ledger Block #{pack.ledgerBlockIndex}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                  {packFiles(pack).map((file) => (
                    <a
                      key={file.name}
                      className="desk-item"
                      href={file.href}
                      download={file.name}
                      style={{
                        padding: "var(--space-3)",
                        background: "var(--surface)",
                        textDecoration: "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "var(--font-sm)" }}>{file.label}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-3)" }}>{file.name}</div>
                      </div>
                      <span className="btn btn-plain" style={{ fontSize: "var(--font-xs)", padding: "2px 8px" }}>
                        Download
                      </span>
                    </a>
                  ))}
                </div>

                <div className="rp-toggles" style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button
                    type="button"
                    className="btn btn-plain"
                    aria-pressed={showTech}
                    onClick={() => setShowTech((value) => !value)}
                  >
                    {showTech ? "Hide Cryptographic Fingerprint" : "Show Cryptographic Fingerprint"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-plain"
                    aria-expanded={showSteps}
                    onClick={() => setShowSteps((value) => !value)}
                  >
                    {showSteps ? "Hide Verification Steps" : "Open Verification Guide"}
                  </button>
                </div>

                {showTech && (
                  <div className="rp-tech" style={{ marginTop: "var(--space-3)", background: "var(--surface)", padding: "var(--space-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                    <div className="rp-tech-row" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: "var(--font-xs)", color: "var(--text-3)" }}>Ledger Head Hash</span>
                      <span className="rp-hash" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)" }}>{pack.bundle.verification.headHash ?? "not recorded"}</span>
                    </div>
                    <div className="rp-tech-row" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: "var(--font-xs)", color: "var(--text-3)" }}>Pack SHA-256 Hash</span>
                      <span className="rp-hash" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)" }}>{pack.packHash}</span>
                    </div>
                    <div className="rp-tech-row" style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: "var(--font-xs)", color: "var(--text-3)" }}>Audit Block Index</span>
                      <span className="rp-hash" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)" }}>Entry #{pack.ledgerBlockIndex}</span>
                    </div>
                  </div>
                )}

                {showSteps && (
                  <div className="rp-steps" style={{ marginTop: "var(--space-3)", background: "var(--surface)", padding: "var(--space-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", fontSize: "var(--font-sm)", color: "var(--text-2)" }}>
                    <p style={{ margin: "4px 0" }}>
                      1. Open the <Link href="/audit-record" style={{ color: "var(--brand-accent)" }}>audit record</Link> and run the tamper check to verify unbroken chain integrity.
                    </p>
                    <p style={{ margin: "4px 0" }}>
                      2. Match the head hash on this package with the head hash anchor at block #{pack.ledgerBlockIndex}.
                    </p>
                    <p style={{ margin: "4px 0" }}>
                      3. Recalculate the SHA-256 hash of the evidence index CSV to verify byte-for-byte fidelity.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", padding: "var(--space-4)" }}>
            <h2 className="ov-title" style={{ marginTop: 0, fontSize: "var(--font-sm)", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-3)" }}>
              Methodology &amp; AI Integrity Guarantee
            </h2>
            <p className="rp-method" style={{ margin: "var(--space-2) 0 0", color: "var(--text-2)", fontSize: "var(--font-sm)" }}>
              {packState === "done" && pack
                ? pack.method
                : "Rules and the audit record produce the numbers and the hashes. AI is only used inside a case to draft the explanation a person signs off, and it never decides what is flagged. Generate a pack to inspect the full methodology audit trail."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
