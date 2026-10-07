"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeroCaseFile } from "@/components/illustration/scenes";
import { appendBlock, tamperBlocks, verifyChain } from "@/core/ledger";
import type { AuditBlock, LedgerEventType } from "@/core/types";
import { FACT_LABELS, HERO, type LandingFacts } from "./content";
import { TestDriveModal } from "./TestDriveModal";
import { Compass, AlertTriangle, ShieldCheck, FileText } from "lucide-react";

/** A small real chain: built with the same append path the demo uses (§17). */
const SAMPLE_DRAFTS: {
  eventType: LedgerEventType;
  actor: string;
  payload: Record<string, unknown>;
}[] = [
  { eventType: "CHECK_RUN", actor: "system", payload: { rulesRun: 8, passed: 7, failed: 1 } },
  { eventType: "EVIDENCE_RECORDED", actor: "system", payload: { evidenceId: "deposit-statement-mar", bytes: 48211 } },
  { eventType: "ALERT_TRIGGERED", actor: "system", payload: { ruleId: "aml-structuring", amount: 9800 } },
  { eventType: "OFFICER_REVIEWED", actor: "r.mensah@demo.test", payload: { alertId: "alert-2026-031", notes: 2 } },
  { eventType: "REPORT_FILED", actor: "r.mensah@demo.test", payload: { alertId: "alert-2026-031", reports: 1 } },
  { eventType: "AUDIT_PACK_EXPORTED", actor: "a.opoku@demo.test", payload: { packs: 1 } },
];

const SAMPLE_TIMES = [
  "2026-03-01T09:00:00.000Z",
  "2026-03-01T09:04:00.000Z",
  "2026-03-01T09:12:00.000Z",
  "2026-03-01T09:20:00.000Z",
  "2026-03-01T09:26:00.000Z",
  "2026-03-01T09:35:00.000Z",
];

function buildSample(): AuditBlock[] {
  let previous: AuditBlock | null = null;
  const blocks: AuditBlock[] = [];
  SAMPLE_DRAFTS.forEach((draft, index) => {
    const block = appendBlock(previous, draft, SAMPLE_TIMES[index]);
    blocks.push(block);
    previous = block;
  });
  return blocks;
}

const SAMPLE = buildSample();
const TAMPERED_AT = 2;

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (document.documentElement.dataset.reduceMotion === "true") return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 400);
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [value]);

  return <>{shown.toLocaleString("en-US")}</>;
}

export function Hero({ facts }: { facts: LandingFacts }) {
  const [altered, setAltered] = useState(false);
  const [testDriveOpen, setTestDriveOpen] = useState(false);

  const view = useMemo(() => (altered ? tamperBlocks(SAMPLE, "payload", { targetIndex: TAMPERED_AT }) : SAMPLE), [altered]);
  const result = useMemo(() => verifyChain(view), [view]);

  const tornAt = result.ok ? undefined : result.firstBrokenIndex;
  const caption = result.ok
    ? `All ${SAMPLE.length} entries verified.`
    : `Entry ${result.firstBrokenIndex + 1} was altered. ${SAMPLE.length - result.firstBrokenIndex - 1} later entries can no longer be trusted.`;

  const factsRow = [
    { value: facts.policies, label: FACT_LABELS.policies },
    { value: facts.obligations, label: FACT_LABELS.obligations },
    { value: facts.rules, label: FACT_LABELS.rules },
    { value: facts.entries, label: FACT_LABELS.entries },
  ];

  return (
    <>
      <section className="lp-hero">
        <div className="lp-container">
          <div className="lp-hero-grid">
            <div>
              <h1 className="lp-title">
                <span className="lp-title-line">
                  <span className="lp-title-in">Compliance decisions</span>
                </span>{" "}
                <span className="lp-title-line">
                  <span className="lp-title-in">
                    {HERO.before}
                    <em className="lp-em">
                      {HERO.italic}
                      <svg
                        className="lp-underline"
                        viewBox="0 0 120 10"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          d="M3 6.5 C 28 2, 54 9, 80 4.5 C 96 2, 110 6, 117 7.5"
                          pathLength={1}
                          strokeDasharray={1}
                        />
                      </svg>
                    </em>
                    {HERO.after}
                  </span>
                </span>
              </h1>
              <p className="lp-subhead">{HERO.subhead}</p>
              
              <div className="lp-hero-actions">
                <button
                  type="button"
                  className="lp-btn lp-btn--solid"
                  onClick={() => setTestDriveOpen(true)}
                >
                  <span>Launch Interactive Demo</span>
                </button>
                <Link className="lp-btn lp-btn--outline" href="/overview?tour=start">
                  <Compass size={16} />
                  <span>Take 60s Guided Tour</span>
                </Link>
              </div>

              {/* Direct scenario quick-launch pills */}
              <div className="lp-hero-scenarios">
                <div className="lp-hero-scenarios-label">Jump into a live workflow:</div>
                <div className="lp-hero-scenarios-chips">
                  <button
                    type="button"
                    className="lp-hero-scenario-chip"
                    onClick={() => setTestDriveOpen(true)}
                  >
                    <AlertTriangle size={14} className="text-cta" />
                    <span>Investigate Alert</span>
                  </button>
                  <button
                    type="button"
                    className="lp-hero-scenario-chip"
                    onClick={() => setTestDriveOpen(true)}
                  >
                    <ShieldCheck size={14} className="text-verified" />
                    <span>Verify Audit Chain</span>
                  </button>
                  <button
                    type="button"
                    className="lp-hero-scenario-chip"
                    onClick={() => setTestDriveOpen(true)}
                  >
                    <FileText size={14} />
                    <span>Map Policy to Rules</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="lp-hero-art" data-parallax>
              <HeroCaseFile tornAt={tornAt} />
              <div className="lp-hero-tamper">
                <div className="lp-hero-tamper-row">
                  {!altered ? (
                    <button type="button" className="lp-btn lp-btn--outline" onClick={() => setAltered(true)}>
                      Try changing a record
                    </button>
                  ) : (
                    <button type="button" className="lp-linkbtn" onClick={() => setAltered(false)}>
                      Restore
                    </button>
                  )}
                </div>
                <p className={`lp-tamper-caption${result.ok ? "" : " is-altered"}`} role="status">
                  {caption}
                </p>
              </div>
            </div>
          </div>

          <div className="lp-facts">
            {factsRow.map((fact) => (
              <span className="lp-fact" key={fact.label}>
                <b>
                  <CountUp value={fact.value} />
                </b>
                {fact.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Role & Scenario Test Drive Modal */}
      <TestDriveModal
        isOpen={testDriveOpen}
        onClose={() => setTestDriveOpen(false)}
      />
    </>
  );
}
