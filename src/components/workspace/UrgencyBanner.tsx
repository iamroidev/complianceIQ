"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AlertCircle, Clock, ChevronRight, X } from "lucide-react";
import type { Alert, Obligation } from "@/core/types";
import { computeDueInfo } from "@/components/signature/Due";

interface UrgencyState {
  mostUrgentItem: {
    title: string;
    href: string;
    dueTarget: string;
    isOverdue: boolean;
    humanText: string;
    level: "now" | "urgent" | "soon" | "calm";
  } | null;
  countDueNow: number;
}

export function UrgencyBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [asOf, setAsOf] = useState<string>("");
  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);

  useEffect(() => {
    // Check localStorage for snooze
    try {
      const saved = localStorage.getItem("ciq-urgency-snooze");
      if (saved) setSnoozedUntil(Number(saved));
    } catch {}

    // Fetch alerts & obligations to compute live urgency
    Promise.all([
      fetch("/api/alerts").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/obligations").then((r) => (r.ok ? r.json() : null)),
    ]).then(([alertsData, obligationsData]) => {
      if (alertsData) {
        setAlerts(alertsData.alerts || []);
        setAsOf(alertsData.asOf || "");
      }
      if (obligationsData) {
        setObligations(obligationsData.obligations || []);
      }
    }).catch(() => {});
  }, []);

  const urgency = useMemo<UrgencyState>(() => {
    if (!asOf) return { mostUrgentItem: null, countDueNow: 0 };

    let countDueNow = 0;
    let nearestItem: UrgencyState["mostUrgentItem"] = null;
    let minDiffMs = Infinity;

    // Check open alerts
    for (const a of alerts) {
      if (a.status !== "open") continue;
      const dueInfo = computeDueInfo(a.slaDueAt, asOf);
      const diffMs = Date.parse(a.slaDueAt) - Date.parse(asOf);

      if (dueInfo.level === "now") {
        countDueNow++;
      }

      if (diffMs < minDiffMs) {
        minDiffMs = diffMs;
        nearestItem = {
          title: a.summarySentence,
          href: `/alerts?id=${a.id}`,
          dueTarget: a.slaDueAt,
          isOverdue: dueInfo.isOverdue,
          humanText: dueInfo.humanText,
          level: dueInfo.level,
        };
      }
    }

    // Check confirmed obligations with due dates
    for (const o of obligations) {
      if (o.status !== "confirmed" || !o.dueOn || o.lastCompletedOn) continue;
      const dueInfo = computeDueInfo(o.dueOn, asOf);
      const diffMs = Date.parse(`${o.dueOn}T23:59:59Z`) - Date.parse(asOf);

      if (dueInfo.level === "now") {
        countDueNow++;
      }

      if (diffMs < minDiffMs) {
        minDiffMs = diffMs;
        nearestItem = {
          title: o.title,
          href: "/deadlines",
          dueTarget: o.dueOn,
          isOverdue: dueInfo.isOverdue,
          humanText: dueInfo.humanText,
          level: dueInfo.level,
        };
      }
    }

    return { mostUrgentItem: nearestItem, countDueNow };
  }, [alerts, obligations, asOf]);

  const snooze = () => {
    const nextSnooze = Date.now() + 30 * 60 * 1000; // 30 minutes
    setSnoozedUntil(nextSnooze);
    try {
      localStorage.setItem("ciq-urgency-snooze", String(nextSnooze));
    } catch {}
  };

  const isSnoozed = Date.now() < snoozedUntil;

  // Banner only appears when an item is at "now" level (≤ 4 hours or overdue) and not snoozed
  if (urgency.countDueNow === 0 || isSnoozed || !urgency.mostUrgentItem) {
    return null;
  }

  const { mostUrgentItem, countDueNow } = urgency;

  return (
    <div
      className="due-now-sticky-banner"
      role="alert"
      aria-live="assertive"
    >
      <div className="banner-content-wrap">
        <div className="banner-message">
          <AlertCircle size={18} className="banner-alert-icon" aria-hidden="true" />
          <span className="banner-text">
            <strong>
              {countDueNow === 1
                ? "1 deadline needs immediate attention"
                : `${countDueNow} deadlines need immediate attention`}:
            </strong>{" "}
            {mostUrgentItem.title} ({mostUrgentItem.humanText}).
          </span>
        </div>

        <div className="banner-actions">
          <Link href={mostUrgentItem.href} className="btn-banner-open">
            <span>Open it</span>
            <ChevronRight size={15} />
          </Link>

          <button
            type="button"
            className="btn-banner-snooze"
            onClick={snooze}
            title="Snooze warning for 30 minutes"
          >
            Remind me in 30 minutes
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Top bar "Next deadline" chip (§30.2):
 * Displays the nearest due item and countdown, visible when due within 7 days.
 */
export function TopbarNextDeadlineChip({ asOf }: { asOf?: string }) {
  const [nearest, setNearest] = useState<{ title: string; humanText: string; level: string } | null>(null);

  useEffect(() => {
    fetch("/api/obligations")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { obligations?: Obligation[] } | null) => {
        if (!data?.obligations) return;
        const nowMs = asOf ? Date.parse(asOf) : Date.now();
        const pending = data.obligations.filter(
          (o) => o.status === "confirmed" && o.dueOn && !o.lastCompletedOn,
        );

        let nearestItem: { title: string; humanText: string; level: string } | null = null;
        let minDiff = Infinity;

        for (const item of pending) {
          const diff = Date.parse(`${item.dueOn!}T23:59:59Z`) - nowMs;
          if (diff > 0 && diff < minDiff) {
            minDiff = diff;
            const info = computeDueInfo(item.dueOn!, asOf);
            nearestItem = {
              title: item.title,
              humanText: info.humanText,
              level: info.level,
            };
          }
        }

        // Visible only if within 7 days
        if (nearestItem && minDiff <= 7 * 24 * 60 * 60 * 1000) {
          setNearest(nearestItem);
        }
      })
      .catch(() => {});
  }, [asOf]);

  if (!nearest) return null;

  return (
    <Link
      href="/deadlines"
      className={`topbar-next-deadline-chip level-${nearest.level}`}
      title={`Next deadline: ${nearest.title} (${nearest.humanText}). Click to view.`}
    >
      <Clock size={14} className="deadline-chip-icon" aria-hidden="true" />
      <span className="deadline-chip-label">Next deadline:</span>
      <strong className="deadline-chip-time">{nearest.humanText}</strong>
    </Link>
  );
}
