"use client";

import { useState } from "react";
import { formatClock } from "@/lib/format";
import { HashValue } from "./HashValue";

export interface TimelineEntry {
  id: string;
  /** One sentence: "Mara Osei filed this report" (actor resolved to a person). */
  sentence: string;
  /** ISO timestamp. */
  time?: string;
  /** Ledger entry number, shown under technical details. */
  entry?: number;
  /** Secondary plain line (what was saved, which evidence). */
  sub?: string;
  /** Label/value pairs revealed by "Show technical details". */
  tech?: Array<{ label: string; value: string }>;
  /** Values long enough to shorten on screen (hashes). */
  hashes?: Array<{ label: string; value: string }>;
}

function VerifiedMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="var(--surface)" stroke="var(--verified)" strokeWidth="1.6" />
      <path
        d="M5 8.3 7 10.2l4-4.4"
        stroke="var(--verified)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="var(--surface)" stroke="var(--text-3)" strokeWidth="1.6" />
    </svg>
  );
}

/** The torn link (DESIGN §16.3 "the tear"): the altered entry's mark rips. */
function TornMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="var(--surface)" stroke="var(--critical)" strokeWidth="1.6" />
      <path
        d="M4.5 8h2.2M9.3 8h2.2"
        stroke="var(--critical)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UntrustedMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="var(--surface)" stroke="var(--critical)" strokeWidth="1.6" />
      <path
        d="m5.6 5.6 4.8 4.8M10.4 5.6l-4.8 4.8"
        stroke="var(--critical)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Audit record timeline (DESIGN.md §6.3): sentence-like entries with a small
 * Verified tick; "Show technical details" stays OFF by default and reveals
 * entry numbers and hashes.
 *
 * Tamper check (§6.6 / §17.4): while `checkIndex` counts down the list every
 * entry ticks; on failure the altered entry tears and every later entry fades
 * to the Critical colour with a 40ms stagger (`brokenIndex`).
 */
export function AuditTimeline({
  entries,
  verified = true,
  showToggle = true,
  checkIndex,
  brokenIndex,
  headHash,
}: {
  entries: TimelineEntry[];
  verified?: boolean;
  showToggle?: boolean;
  /** Highest entry index the running check has ticked so far. */
  checkIndex?: number;
  /** First altered entry index when verification failed. */
  brokenIndex?: number | null;
  /** Head hash, revealed with the technical details (audit record page). */
  headHash?: string;
}) {
  const [showTech, setShowTech] = useState(false);
  const checking = checkIndex !== undefined && brokenIndex === undefined && !verified;

  return (
    <div>
      {(showToggle || verified || showTech) && (
        <div className="tl-toolbar">
          {showToggle && (
            <label className="tl-toggle">
              <input
                type="checkbox"
                checked={showTech}
                onChange={(event) => setShowTech(event.target.checked)}
              />
              Show technical details
            </label>
          )}
          {verified && !checking && brokenIndex === undefined && (
            <span className="tl-verified" role="status">
              All entries verified
            </span>
          )}
          {showTech && headHash && (
            <span className="tl-head">
              Head hash: <HashValue value={headHash} />
            </span>
          )}
        </div>
      )}
      <ol className="tl">
        {entries.map((entry, index) => {
          const torn = brokenIndex === index;
          const untrusted = brokenIndex !== undefined && brokenIndex !== null && index > brokenIndex;
          const ticked =
            brokenIndex !== undefined && brokenIndex !== null
              ? index < brokenIndex
              : checkIndex !== undefined
                ? index <= checkIndex
                : verified;
          const classes = [
            "tl-item",
            torn ? "is-broken" : "",
            untrusted ? "is-untrusted" : "",
            checking && ticked ? "is-ticking" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li
              className={classes}
              key={entry.id}
              style={
                untrusted
                  ? ({ "--tl-delay": index - (brokenIndex ?? 0) - 1 } as React.CSSProperties)
                  : undefined
              }
            >
              <span className="tl-mark" aria-hidden="true">
                {torn ? <TornMark /> : untrusted ? <UntrustedMark /> : ticked ? <VerifiedMark /> : <EmptyMark />}
              </span>
              <p className="tl-sentence">
                {entry.sentence}
                {entry.time && (
                  <time className="tl-time" dateTime={entry.time} title={entry.time}>
                    · {formatClock(entry.time)}
                  </time>
                )}
              </p>
              {entry.sub && <p className="tl-sub">{entry.sub}</p>}
              {showTech && (
                <div className="tl-tech">
                  {entry.entry !== undefined && <span>Entry {entry.entry}</span>}
                  {entry.tech?.map((item) => (
                    <span key={item.label}>
                      {item.label}: {item.value}
                    </span>
                  ))}
                  {entry.hashes?.map((item) => (
                    <span key={item.label}>
                      {item.label}: <HashValue value={item.value} />
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
