"use client";

import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { Pagination } from "@/components/workspace/Pagination";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "@/components/signature/SeverityDot";
import { RecordsVerified } from "@/components/illustration/scenes";
import { Seal, Thread } from "@/components/illustration/kit";
import { roleHeaders, useRole } from "@/components/workspace/role-context";
import type { Alert, EvidenceItem, Obligation } from "@/core/types";
import { EVIDENCE_KIND_LABELS } from "@/lib/evidence";
import { formatShort } from "@/lib/format";

type Phase = "loading" | "ready" | "error";

interface VerifyRow {
  id: string;
  storedHash: string;
  payloadMatches: boolean;
  rederivedMatches: boolean | null;
  ledgerBlockIndex: number;
}

interface VerifyResponse {
  ok: boolean;
  evidence: VerifyRow[];
  headHash: string;
}

export default function EvidencePage() {
  const { role } = useRole();
  const canUpload = role === "officer" || role === "admin";

  const [phase, setPhase] = useState<Phase>("loading");
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [verify, setVerify] = useState<VerifyResponse | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [showTech, setShowTech] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal State for Evidence Upload
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadKind, setUploadKind] = useState<EvidenceItem["kind"]>("document");
  const [uploadContentText, setUploadContentText] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");

  const load = useRef(async () => {
    setPhase("loading");
    setError("");
    try {
      const [evidenceRes, verifyRes, alertsRes, obligationsRes] = await Promise.all([
        fetch("/api/evidence"),
        fetch("/api/ledger/verify"),
        fetch("/api/alerts"),
        fetch("/api/obligations"),
      ]);
      if (!evidenceRes.ok || !verifyRes.ok || !alertsRes.ok || !obligationsRes.ok) {
        throw new Error("The evidence list could not be loaded.");
      }
      const evidenceData = (await evidenceRes.json()) as { evidence: EvidenceItem[] };
      const verifyData = (await verifyRes.json()) as VerifyResponse;
      const alertsData = (await alertsRes.json()) as { alerts: Alert[] };
      const obligationsData = (await obligationsRes.json()) as { obligations: Obligation[] };
      setItems(evidenceData.evidence);
      setVerify(verifyData);
      setAlerts(alertsData.alerts);
      setObligations(obligationsData.obligations);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The evidence list could not be loaded.");
      setPhase("error");
    }
  });

  useEffect(() => {
    void load.current();
  }, []);

  const verifyById = useMemo(() => {
    const map = new Map<string, VerifyRow>();
    for (const row of verify?.evidence ?? []) map.set(row.id, row);
    return map;
  }, [verify]);

  const alertByEvidence = useMemo(() => {
    const map = new Map<string, Alert>();
    for (const alert of alerts) {
      for (const id of alert.snapshotEvidenceIds) map.set(id, alert);
      for (const ref of alert.evidenceRefs) {
        if (ref.type === "evidence" && !map.has(ref.id)) map.set(ref.id, alert);
      }
    }
    return map;
  }, [alerts]);

  const obligationsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const obligation of obligations) map.set(obligation.id, obligation.title);
    return map;
  }, [obligations]);

  const summary = useMemo(() => {
    const total = items.length;
    let verifiedCount = 0;
    let alteredCount = 0;
    for (const item of items) {
      const row = verifyById.get(item.id);
      if (row?.payloadMatches) verifiedCount++;
      else if (row && !row.payloadMatches) alteredCount++;
    }
    return { total, verifiedCount, alteredCount };
  }, [items, verifyById]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setUploadContentText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || isUploading) return;

    setIsUploading(true);
    setUploadError("");

    let payloadContent: unknown = uploadContentText.trim();
    try {
      if (uploadContentText.trim().startsWith("{") || uploadContentText.trim().startsWith("[")) {
        payloadContent = JSON.parse(uploadContentText);
      }
    } catch {
      payloadContent = uploadContentText;
    }

    try {
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: roleHeaders(role),
        body: JSON.stringify({
          title: uploadTitle.trim(),
          kind: uploadKind,
          content: payloadContent || { text: uploadTitle, uploadedAt: new Date().toISOString() },
          source: uploadFileName ? `upload:${uploadFileName}` : `manual:${role}`,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { evidence?: EvidenceItem; error?: string };
      if (!res.ok || !data.evidence) throw new Error(data.error ?? "Failed to seal evidence.");

      setIsUploadModalOpen(false);
      setUploadTitle("");
      setUploadContentText("");
      setUploadFileName("");
      void load.current();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to seal evidence.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="page-case-room">
      <header className="page-header-block" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 className="page-serif-title">Cryptographic Evidence Locker</h1>
          <p className="page-serif-headline">
            {items.length} immutable evidence artifacts on file. Every record is cryptographically sealed onto the ledger.
          </p>
          <p className="page-note">
            Open any evidence artifact to inspect raw snapshot payloads, recalculate SHA-256 digests, or trace ledger entry chains.
          </p>
        </div>

        {canUpload && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsUploadModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>+ Upload Evidence</span>
          </button>
        )}
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="evidence" />

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
            <RecordsVerified size={110} />
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
                  Sealed Evidence
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {summary.total}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Immutable snapshots
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--verified)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Verified Hash Integrity
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--verified)", marginTop: "2px" }}>
                  {summary.verifiedCount}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  100% SHA-256 match
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Ledger Head Hash
                </div>
                <div style={{ fontSize: "var(--font-xs)", fontFamily: "var(--font-mono)", color: "var(--text-1)", marginTop: "6px", wordBreak: "break-all" }}>
                  {verify?.headHash ? `${verify.headHash.slice(0, 16)}…` : "Calculating…"}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", marginTop: "2px" }}>
                  Canonical anchor
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="alerts-toolbar" style={{ marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          className="btn btn-plain"
          aria-pressed={showTech}
          onClick={() => setShowTech((v) => !v)}
          style={{ fontSize: "var(--font-xs)" }}
        >
          {showTech ? "Hide Cryptographic Hashes" : "Show SHA-256 Hashes"}
        </button>
        <span className="toolbar-spacer" />
        <span className="page-note">
          Showing {paginatedItems.length} of {items.length} items (Page {page} of {totalPages})
        </span>
      </div>

      {phase === "loading" && (
        <div className="alerts-table" aria-busy="true">
          {[0, 1, 2, 3, 4].map((index) => (
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
          {items.length === 0 ? (
            <div className="state-block">
              <p>No evidence items on file.</p>
              <p>Items appear here when policies, alerts, or audit runs snapshot evidence.</p>
            </div>
          ) : (
            <>
              <div className="alerts-table" style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
                <div className="alerts-row alerts-head ev-head" style={{ background: "var(--surface-muted)", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600 }}>
                  <span>Evidence Artifact &amp; Kind</span>
                  <span>Collection Source</span>
                  <span>Ledger Block</span>
                  <span>Integrity Seal</span>
                </div>
                {paginatedItems.map((item) => {
                  const verifiedRow = verifyById.get(item.id);
                  const isVerified = verifiedRow?.payloadMatches ?? false;
                  return (
                    <Link
                      className="alerts-row ev-row"
                      href={`/evidence/${item.id}`}
                      key={item.id}
                      style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.15s ease" }}
                    >
                      <span className="reg-name" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span className="row-primary" style={{ fontWeight: 500, color: "var(--text-1)" }}>{item.title}</span>
                        <span className="row-secondary" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-3)", padding: "1px 6px", background: "var(--surface-sunken)", borderRadius: "3px" }}>
                            {EVIDENCE_KIND_LABELS[item.kind] ?? item.kind}
                          </span>
                          {showTech && (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-3)" }}>
                              {item.contentHash.slice(0, 16)}…
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="row-cell" style={{ fontSize: "var(--font-sm)", color: "var(--text-2)" }}>{item.source}</span>
                      <span className="row-cell" style={{ fontSize: "var(--font-sm)", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                        #{item.ledgerBlockIndex}
                      </span>
                      <span className="row-cell">
                        <StatusDot
                          label={isVerified ? "Verified Match" : "Unverified"}
                          tone={isVerified ? "verified" : "critical"}
                        />
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              <Pagination
                page={page}
                pageSize={pageSize}
                total={items.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                sizes={[10, 25, 50]}
              />
            </>
          )}
        </>
      )}

      {/* Upload Evidence Modal */}
      {isUploadModalOpen && (
        <div className="rs-backdrop" role="presentation" onClick={() => setIsUploadModalOpen(false)}>
          <div
            className="rs-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-evidence-title"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: "520px" }}
          >
            <h2 id="upload-evidence-title" className="rs-dialog-title">
              Upload &amp; Seal Evidence
            </h2>
            <p className="rs-dialog-body">
              Upload a compliance document, security log excerpt, or policy record. The system will compute its SHA-256 fingerprint and append an immutable block to the audit ledger.
            </p>

            {uploadError && <p className="error-inline" style={{ marginBottom: "var(--space-3)" }}>{uploadError}</p>}

            <form onSubmit={handleUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                <span style={{ fontWeight: 500 }}>Evidence Title *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q1 2026 AWS IAM Access Key Audit"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                  <span style={{ fontWeight: 500 }}>Evidence Kind *</span>
                  <select
                    value={uploadKind}
                    onChange={(e) => setUploadKind(e.target.value as EvidenceItem["kind"])}
                    style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                  >
                    <option value="document">Policy / Document</option>
                    <option value="log_excerpt">Log Excerpt</option>
                    <option value="api_snapshot">API Snapshot</option>
                    <option value="policy_reference">Policy Reference</option>
                    <option value="report_draft">Report Draft</option>
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                  <span style={{ fontWeight: 500 }}>Upload File (Optional)</span>
                  <input
                    type="file"
                    accept=".json,.txt,.csv,.md,.log"
                    onChange={handleFileSelect}
                    style={{ fontSize: "12px", marginTop: "4px" }}
                  />
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                <span style={{ fontWeight: 500 }}>Evidence Payload Content / Text</span>
                <textarea
                  rows={4}
                  placeholder="Paste JSON payload, log lines, or document markdown text here..."
                  value={uploadContentText}
                  onChange={(e) => setUploadContentText(e.target.value)}
                  style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-mono)", fontSize: "12px" }}
                />
              </label>

              <div className="rs-dialog-actions" style={{ marginTop: "var(--space-3)" }}>
                <button
                  type="button"
                  className="btn btn-plain"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUploading || !uploadTitle.trim()}
                >
                  {isUploading ? "Sealing Evidence..." : "Seal Onto Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
