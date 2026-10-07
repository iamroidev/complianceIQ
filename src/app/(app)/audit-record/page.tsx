"use client";

import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { Pagination } from "@/components/workspace/Pagination";
import { RecordsVerified, TamperDetected } from "@/components/illustration/scenes/Moments";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuditTimeline } from "@/components/signature/AuditTimeline";
import { TamperCheck, type TamperCheckState } from "@/components/signature/TamperCheck";
import { buildLedgerEntries } from "@/components/workspace/case-text";
import { useDemo } from "@/components/workspace/demo-context";
import { headHash, verifyChain } from "@/core/ledger";
import type { Alert, AuditBlock, EvidenceItem } from "@/core/types";

type LoadPhase = "loading" | "ready" | "error";

export default function AuditRecordPage() {
  const { sim, setSim } = useDemo();
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [phase, setPhase] = useState<LoadPhase>("loading");
  const [check, setCheck] = useState<TamperCheckState>({ phase: "idle" });
  const [checkIndex, setCheckIndex] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const active = timers.current;
    return () => {
      for (const timer of active) window.clearInterval(timer);
    };
  }, []);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const [ledgerRes, alertsRes, evidenceRes] = await Promise.all([
        fetch("/api/ledger"),
        fetch("/api/alerts"),
        fetch("/api/evidence"),
      ]);
      if (!ledgerRes.ok || !alertsRes.ok || !evidenceRes.ok) throw new Error("fetch failed");
      const ledger = (await ledgerRes.json()) as { blocks: AuditBlock[] };
      const alertData = (await alertsRes.json()) as { alerts: Alert[] };
      const evidenceData = (await evidenceRes.json()) as { evidence: EvidenceItem[] };
      setBlocks(ledger.blocks);
      setAlerts(alertData.alerts);
      setEvidence(evidenceData.evidence);
      const result = verifyChain(ledger.blocks, evidenceData.evidence);
      setCheck(
        result.ok
          ? { phase: "ok", checked: ledger.blocks.length }
          : {
              phase: "failed",
              brokenIndex: result.firstBrokenIndex,
              later: Math.max(ledger.blocks.length - result.firstBrokenIndex - 1, 0),
            },
      );
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (sim) {
      setCheckIndex(undefined);
      setCheck({
        phase: "failed",
        brokenIndex: sim.brokenIndex,
        later: sim.later,
      });
    }
  }, [sim]);

  const viewBlocks = sim ? sim.blocks : blocks;
  const entries = useMemo(
    () => buildLedgerEntries(viewBlocks, alerts, evidence),
    [viewBlocks, alerts, evidence],
  );
  const realHead = useMemo(() => headHash(blocks), [blocks]);

  const runCheck = useCallback(
    (target: AuditBlock[], items: EvidenceItem[]) => {
      if (target.length === 0) return;
      const total = target.length;
      const frameMs = 16;
      const perFrame = Math.max(1, Math.ceil(total / (1200 / frameMs)));
      setCheck({ phase: "checking" });
      setCheckIndex(undefined);
      let done = 0;
      const timer = window.setInterval(() => {
        done = Math.min(done + perFrame, total);
        setCheckIndex(done - 1);
        if (done >= total) {
          window.clearInterval(timer);
          const result = verifyChain(target, items);
          window.setTimeout(() => {
            setCheckIndex(undefined);
            setCheck(
              result.ok
                ? { phase: "ok", checked: total }
                : {
                    phase: "failed",
                    brokenIndex: result.firstBrokenIndex,
                    later: Math.max(total - result.firstBrokenIndex - 1, 0),
                  },
            );
          }, 200);
        }
      }, frameMs);
      timers.current.push(timer);
    },
    [],
  );

  const onRun = useCallback(() => runCheck(viewBlocks, evidence), [runCheck, viewBlocks, evidence]);

  const onRestore = useCallback(() => {
    setSim(null);
    if (blocks.length > 0) runCheck(blocks, evidence);
  }, [setSim, runCheck, blocks, evidence]);

  const checking = check.phase === "checking";
  const failed = check.phase === "failed";
  const verified = check.phase === "ok" && !checking;
  const brokenIndex = failed ? check.brokenIndex : undefined;

  const paginatedEntries = useMemo(() => {
    // When check is running or failed, show all entries to see full animation/tear
    if (checking || failed || entries.length <= pageSize) return entries;
    const start = (page - 1) * pageSize;
    return entries.slice(start, start + pageSize);
  }, [entries, page, pageSize, checking, failed]);

  return (
    <div className="page-case-room">
      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">Cryptographic Audit Ledger</h1>
          <p className="page-serif-headline">
            Every decision and saved piece of evidence, in order.
          </p>
          <p className="page-note">
            Entries are hash-chained: change one and every entry after it stops verifying.{" "}
            {sim ? "You are viewing a simulated copy — the saved record is untouched." : ""}
          </p>
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="audit-record" />

      {/* Visual Summary Panel */}
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
            {failed ? <TamperDetected size={110} /> : <RecordsVerified size={110} />}
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
                  Ledger Blocks
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {viewBlocks.length}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Chained sequentially
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: failed ? "var(--critical)" : "var(--verified)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Chain Integrity
                </div>
                <div style={{ fontSize: "var(--font-lg)", fontWeight: 600, color: failed ? "var(--critical)" : "var(--verified)", marginTop: "4px" }}>
                  {checking ? "Verifying..." : failed ? "Tamper Detected" : "100% Intact"}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  {failed ? `Break at #${brokenIndex}` : "Zero byte mismatch"}
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Head Hash (SHA-256)
                </div>
                <div style={{ fontSize: "var(--font-xs)", fontFamily: "var(--font-mono)", color: "var(--text-1)", marginTop: "6px", wordBreak: "break-all" }}>
                  {realHead ? `${realHead.slice(0, 16)}…` : "None"}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", marginTop: "2px" }}>
                  Anchor fingerprint
                </div>
              </div>

              <div className="desk-item" style={{ padding: "var(--space-3)", background: "var(--surface)" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Ledger Mode
                </div>
                <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: sim ? "var(--critical)" : "var(--text-1)", marginTop: "6px" }}>
                  {sim ? "Simulated Branch" : "Canonical Live"}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", marginTop: "2px" }}>
                  {sim ? "In-memory test" : "Immutable store"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {phase === "loading" && (
        <div aria-busy="true">
          <div className="skeleton-block" style={{ height: "14px", maxWidth: "30%" }} />
          <div className="skeleton-block" style={{ height: "14px", marginTop: "12px" }} />
          <div className="skeleton-block" style={{ height: "14px", marginTop: "8px" }} />
          <p className="page-note">Loading the record…</p>
        </div>
      )}

      {phase === "error" && (
        <div className="error-block">
          <p>The audit record could not be loaded.</p>
          <button type="button" className="btn btn-plain" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {phase === "ready" && (
        <>
          <TamperCheck state={check} onRun={onRun} onRestore={onRestore} simulated={sim !== null} />
          {entries.length === 0 ? (
            <div className="state-block">
              <p>No entries are saved yet.</p>
            </div>
          ) : (
            <>
              <div style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", padding: "var(--space-4)", marginTop: "var(--space-4)" }}>
                <AuditTimeline
                  entries={paginatedEntries}
                  verified={verified}
                  checkIndex={checkIndex}
                  brokenIndex={brokenIndex}
                  headHash={realHead ?? undefined}
                />
              </div>

              {entries.length > pageSize && !checking && !failed && (
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={entries.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  sizes={[10, 15, 30, 50]}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
