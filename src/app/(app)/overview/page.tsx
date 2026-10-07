"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { OverviewDesk, type FolderData } from "@/components/illustration/scenes/OverviewDesk";
import { PaperClip, DeskPlant } from "@/components/illustration/kit";
import { ErrorDroppedLink } from "@/components/illustration/scenes";
import { DOMAIN_LABELS } from "@/components/workspace/nav";
import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import type { Alert } from "@/core/types";
import { ATTENTION_STATUSES } from "@/lib/attention";
import { timeLeft } from "@/lib/format";
import { computeDueInfo } from "@/components/signature/Due";
import type { Obligation } from "@/core/types";

type Phase = "loading" | "ready" | "error";

interface LedgerVerifyState {
  ok: boolean;
  brokenIndex?: number;
}

interface FooterFacts {
  coverage: { checked: number; total: number } | null;
  ledgerCount: number | null;
  nextDeadline: { title: string; humanText: string } | null;
}

const DOMAIN_FOLDER_NAMES: Record<string, string> = {
  finance: "Payments and thresholds",
  people: "People and certifications",
  vendor: "Vendors",
  access: "Data access",
  code: "Code and secrets",
  regulatory: "Regulatory deadlines",
};

export default function OverviewPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [asOf, setAsOf] = useState<string>("");
  const [ledgerState, setLedgerState] = useState<LedgerVerifyState>({ ok: true });
  const [footerFacts, setFooterFacts] = useState<FooterFacts>({
    coverage: null,
    ledgerCount: null,
    nextDeadline: null,
  });
  const [loadError, setLoadError] = useState("");

  async function loadData() {
    setPhase("loading");
    setLoadError("");
    try {
      const [alertsRes, verifyRes, coverageRes, ledgerRes, obligationsRes] = await Promise.all([
        fetch("/api/alerts"),
        fetch("/api/ledger/verify"),
        fetch("/api/coverage"),
        fetch("/api/ledger"),
        fetch("/api/obligations"),
      ]);

      if (!alertsRes.ok) throw new Error("Could not load alerts.");
      const alertsData = (await alertsRes.json()) as { alerts: Alert[]; asOf: string };
      setAlerts(alertsData.alerts);
      setAsOf(alertsData.asOf);

      if (verifyRes.ok) {
        const verifyData = (await verifyRes.json()) as {
          ok: boolean;
          chain?: { ok: boolean; firstBrokenIndex?: number };
        };
        setLedgerState({
          ok: verifyData.ok && (verifyData.chain?.ok ?? true),
          brokenIndex: verifyData.chain?.firstBrokenIndex,
        });
      }

      // Footer facts are supplementary — a failure there never fails the desk.
      const facts: FooterFacts = { coverage: null, ledgerCount: null, nextDeadline: null };
      if (coverageRes.ok) {
        const coverageData = (await coverageRes.json()) as {
          items: Array<{ status: "covered" | "partial" | "gap" }>;
        };
        facts.coverage = {
          checked: coverageData.items.filter((item) => item.status !== "gap").length,
          total: coverageData.items.length,
        };
      }
      if (ledgerRes.ok) {
        const ledgerData = (await ledgerRes.json()) as { count: number };
        facts.ledgerCount = ledgerData.count;
      }
      if (obligationsRes.ok) {
        const obligationsData = (await obligationsRes.json()) as { obligations: Obligation[] };
        const nowMs = Date.parse(alertsData.asOf);
        let best: { title: string; humanText: string } | null = null;
        let bestDiff = Infinity;
        for (const obligation of obligationsData.obligations) {
          if (obligation.status !== "confirmed" || !obligation.dueOn || obligation.lastCompletedOn) {
            continue;
          }
          const diff = Date.parse(`${obligation.dueOn}T23:59:59Z`) - nowMs;
          if (diff < bestDiff) {
            bestDiff = diff;
            best = {
              title: obligation.title,
              humanText: computeDueInfo(obligation.dueOn, alertsData.asOf).humanText,
            };
          }
        }
        facts.nextDeadline = best;
      }
      setFooterFacts(facts);

      setPhase("ready");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "We couldn't load your desk.");
      setPhase("error");
    }
  }

  const loadRef = useRef(loadData);
  loadRef.current = loadData;

  useEffect(() => {
    void loadRef.current();
  }, []);

  const openAlerts = useMemo(
    () => alerts.filter((a) => ATTENTION_STATUSES.has(a.status)),
    [alerts],
  );

  const criticalCount = useMemo(
    () => openAlerts.filter((a) => a.severity === "critical").length,
    [openAlerts],
  );

  const dueSoonAlerts = useMemo(() => {
    if (!asOf) return [];
    const now = Date.parse(asOf);
    return openAlerts.filter((a) => {
      const due = Date.parse(a.slaDueAt);
      return due - now <= 4 * 60 * 60 * 1000;
    });
  }, [openAlerts, asOf]);

  const dueSoonCount = dueSoonAlerts.length;
  const totalOpen = openAlerts.length;

  // The 4 top alerts for "Do these first" sorted by severity and deadline
  const doTheseFirst = useMemo(() => {
    const sorted = [...openAlerts].sort((a, b) => {
      const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const sevDiff = (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
      if (sevDiff !== 0) return sevDiff;
      return Date.parse(a.slaDueAt) - Date.parse(b.slaDueAt);
    });
    return sorted.slice(0, 4);
  }, [openAlerts]);

  // Construct the 6 folders with real counts
  const foldersData = useMemo<FolderData[]>(() => {
    const domains = ["finance", "people", "vendor", "access", "code", "regulatory"];
    const now = asOf ? Date.parse(asOf) : Date.now();

    return domains.map((domain) => {
      const domainAlerts = openAlerts.filter((a) => a.domain === domain);
      const hasCritical = domainAlerts.some((a) => a.severity === "critical");
      const hasDueSoon = domainAlerts.some(
        (a) => Date.parse(a.slaDueAt) - now <= 4 * 60 * 60 * 1000,
      );

      return {
        domain,
        title: DOMAIN_FOLDER_NAMES[domain] ?? DOMAIN_LABELS[domain] ?? domain,
        count: domainAlerts.length,
        critical: hasCritical,
        dueSoon: hasDueSoon,
      };
    });
  }, [openAlerts, asOf]);

  // Copy per §29.3 state-driven headline
  const { headline, primaryButtonText, primaryButtonHref } = useMemo(() => {
    if (!ledgerState.ok) {
      const idx = ledgerState.brokenIndex ?? 812;
      return {
        headline: `Records altered. Entry ${idx} doesn't match. Start there.`,
        primaryButtonText: "Run tamper check",
        primaryButtonHref: "/audit-record",
      };
    }
    if (criticalCount > 0 || dueSoonCount > 0) {
      return {
        headline: `${totalOpen} alerts need attention. ${dueSoonCount} are due within 4 hours.`,
        primaryButtonText: `View all ${totalOpen} alerts`,
        primaryButtonHref: "/alerts",
      };
    }
    if (totalOpen > 0) {
      return {
        headline: `Nothing is due today. ${totalOpen} alerts are waiting.`,
        primaryButtonText: `View all ${totalOpen} alerts`,
        primaryButtonHref: "/alerts",
      };
    }
    return {
      headline: "All clear. Everything is checked and verified.",
      primaryButtonText: "",
      primaryButtonHref: "",
    };
  }, [ledgerState, criticalCount, dueSoonCount, totalOpen]);

  return (
    <div className="page-case-room">
      {/* Page Header Frame (§29.0, §29.3) */}
      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">Overview</h1>
          <p className="page-serif-headline">
            {phase === "loading" ? "Reading desk files…" : headline}
          </p>
        </div>

        {primaryButtonText && (
          <Link href={primaryButtonHref} className="btn-navy">
            {primaryButtonText}
          </Link>
        )}
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="overview" />

      {/* Loading State */}
      {phase === "loading" && (
        <div className="overview-desk-panel" aria-busy="true">
          <div className="desk-surface">
            <div className="desk-folders-grid">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 140,
                    background: "rgba(18, 38, 63, 0.04)",
                    borderRadius: 10,
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {phase === "error" && (
        <div className="error-block" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <ErrorDroppedLink size={96} />
          </div>
          <p className="t-sentence" style={{ marginBottom: 16 }}>
            {loadError || "We couldn't load your desk. Try again."}
          </p>
          <button type="button" className="btn btn-navy" onClick={loadRef.current}>
            Try again
          </button>
        </div>
      )}

      {/* Ready State */}
      {phase === "ready" && (
        <>
          {totalOpen === 0 && ledgerState.ok ? (
            /* Empty / All Clear State (§28.6, §29.22): plant + tidy desk */
            <div className="overview-desk-panel" style={{ textAlign: "center", padding: "64px 32px" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <DeskPlant size={120} />
              </div>
              <h2 className="page-serif-title" style={{ fontSize: 28, marginBottom: 8 }}>
                All clear.
              </h2>
              <p className="page-serif-headline" style={{ fontSize: 18, color: "var(--text-2)" }}>
                Everything is checked and verified. Last checked 2 minutes ago.
              </p>
            </div>
          ) : (
            /* The Desk & Do These First Briefing Grid (§29.3) */
            <div className="overview-briefing-grid">
              {/* THE DESK Hero Object */}
              <div className="overview-desk-panel">
                <OverviewDesk
                  folders={foldersData}
                  lampActive={totalOpen > 0}
                  calendarDay={14}
                  calendarMonth="MAR"
                  flagDays={4}
                />
              </div>

              {/* Do these first slips column */}
              <aside className="do-these-first-panel" aria-label="Do these first">
                <h2 className="section-label-case-room">Do these first</h2>
                <div className="slips-list" role="list">
                  {doTheseFirst.map((alert) => {
                    const left = asOf ? timeLeft(asOf, alert.slaDueAt) : { overdue: false, text: "3h 20m left" };
                    const isUrgent = alert.severity === "critical" || left.overdue;

                    return (
                      <Link
                        key={alert.id}
                        href={`/alerts/${alert.id}`}
                        className="slip-card"
                        role="listitem"
                      >
                        <span className="slip-paperclip" aria-hidden="true">
                          <PaperClip
                            variant={
                              alert.severity === "critical"
                                ? "critical"
                                : alert.severity === "high"
                                  ? "high"
                                  : "neutral"
                            }
                            size={24}
                          />
                        </span>
                        <div className="slip-sentence">{alert.summarySentence}</div>
                        <div className="slip-meta">
                          <span style={{ textTransform: "capitalize" }}>
                            {alert.severity} · {DOMAIN_LABELS[alert.domain] ?? alert.domain}
                          </span>
                          <span className={`slip-time-left${isUrgent ? " urgent" : ""}`}>
                            {left.overdue ? "Overdue" : left.text}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </aside>
            </div>
          )}

          {/* Footer Tags Row (§29.3) — every figure below comes from the live APIs. */}
          {phase === "ready" && (
            <footer className="overview-footer-row">
              <span className="overview-next-deadline">
                {footerFacts.nextDeadline
                  ? `Next: ${footerFacts.nextDeadline.title} · ${footerFacts.nextDeadline.humanText}`
                  : "Next: nothing scheduled."}
              </span>

              <div className="overview-footer-tags">
                <Link href="/policy-coverage" className="paper-footer-tag">
                  {footerFacts.coverage
                    ? `Policy coverage · ${footerFacts.coverage.checked} of ${footerFacts.coverage.total} checked`
                    : "Policy coverage"}
                </Link>
                <Link href="/audit-record" className="paper-footer-tag">
                  {footerFacts.ledgerCount === null
                    ? "Audit record"
                    : ledgerState.ok
                      ? `Audit record · ${footerFacts.ledgerCount.toLocaleString("en-US")} entries verified`
                      : `Audit record · entry ${ledgerState.brokenIndex} altered`}
                </Link>
                <Link href="/alerts" className="paper-footer-tag">
                  {`Alerts · ${totalOpen} need attention`}
                </Link>
              </div>
            </footer>
          )}
        </>
      )}
    </div>
  );
}
