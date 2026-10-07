"use client";

import { useEffect, useState } from "react";
import { Seal, ChainLink } from "@/components/illustration/kit";
import { ReplayCard } from "./ReplayCard";

function SealDemo() {
  return (
    <div className="ml-seal-demo">
      <div className="ml-seal-wrap">
        <Seal size={72} />
      </div>
      <p className="ml-seal-caption">Saved to audit record</p>
    </div>
  );
}

function ThreadDemo({ replay }: { replay: () => void }) {
  return (
    <div className="ml-thread-demo">
      <span className="ml-thread-src">Figure 4.2</span>
      <svg
        className="ml-thread-svg"
        viewBox="0 0 220 48"
        width="220"
        height="48"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M6 24 C 70 46 150 2 214 24"
          stroke="var(--ill-teal)"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
        />
      </svg>
      <button type="button" className="ml-thread-row" onClick={replay}>
        Evidence 3 · SHA 9f2a…c4
      </button>
    </div>
  );
}

const ENTRIES = [
  { label: "Entry 1 · sealed 09:12", critical: false },
  { label: "Entry 2 · sealed 09:14", critical: false },
  { label: "Entry 3 · altered 09:19", critical: true },
  { label: "Entry 4 · cannot be trusted", critical: true },
];

function TamperDemo() {
  return (
    <div className="ml-tamper">
      <div className="ml-tl-wrap">
        <div className="ml-tl-progress" />
        <ol className="ml-tl">
          {ENTRIES.map((e) => (
            <li key={e.label} className={`ml-tl-item${e.critical ? " is-critical" : ""}`}>
              <span className="ml-tick" aria-hidden="true">
                ✓
              </span>
              {e.label}
            </li>
          ))}
        </ol>
      </div>
      <div className="ml-tamper-bottom">
        <div className="ml-link-rip" aria-hidden="true">
          <span className="ml-link-intact">
            <ChainLink size={56} />
          </span>
          <span className="ml-link-torn">
            <ChainLink size={56} torn critical />
          </span>
        </div>
        <p className="ml-result">
          Entry 3 was altered. 3 later entries can no longer be trusted.
        </p>
      </div>
    </div>
  );
}

const DAYS = [
  "15 Jan",
  "16 Jan",
  "17 Jan",
  "18 Jan",
  "19 Jan",
  "20 Jan",
  "21 Jan",
  "22 Jan",
];

function TimeDemo({ run }: { run: number }) {
  const [date, setDate] = useState("22 Jan 2026");

  useEffect(() => {
    if (run === 0) return;
    const reduce = document.documentElement.dataset.reduceMotion === "true";
    if (reduce) {
      setDate("22 Jan 2026");
      return;
    }
    setDate("15 Jan 2026");
    const timers = DAYS.map((d, i) =>
      setTimeout(() => setDate(`${d} 2026`), i * 112),
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [run]);

  return (
    <div className="ml-time">
      <div className="ml-time-head">
        <span className="ml-date">{date}</span>
        <span style={{ fontSize: "var(--fs-label)", color: "var(--text-3)" }}>
          date counter ticks as strips slide left
        </span>
      </div>
      <div className="ml-strip-row">
        <span className="ml-strip-label">Certificate · SHA 9f2a…c4</span>
        <div className="ml-strip-rail">
          <span className="ml-today" aria-hidden="true" />
          <span className="ml-marker is-cert" />
        </div>
        <span className="ml-exp">
          <span className="ml-exp-valid">Valid</span>
          <span className="ml-exp-fired">Expired</span>
        </span>
      </div>
      <div className="ml-strip-row">
        <span className="ml-strip-label">Response deadline · case 118</span>
        <div className="ml-strip-rail">
          <span className="ml-today" aria-hidden="true" />
          <span className="ml-marker is-deadline" />
        </div>
        <span style={{ fontSize: "var(--fs-label)", color: "var(--text-3)" }}>2 days</span>
      </div>
    </div>
  );
}

export function SignatureDemos() {
  return (
    <>
      <ReplayCard
        slug="signature-seal"
        title="The seal"
        spec="§17: seal scales 0.8→1.06→1 with --ease-spring 360ms, check stroke draws 240ms, “Saved to audit record” fades in — no toast."
        duration={600}
      >
        {() => <SealDemo />}
      </ReplayCard>

      <ReplayCard
        slug="signature-tamper"
        title="Tamper check"
        spec="§17: progress travels the timeline 60ms per entry (cap 1.2s), each entry ticks; on failure the link rips (translate + rotate 6°, 300ms), later entries fade to Critical with 40ms stagger, result sentence appears."
        duration={1200}
      >
        {() => <TamperDemo />}
      </ReplayCard>

      <ReplayCard
        slug="signature-thread"
        title="The thread"
        spec="§17: teal thread draws from the figure to the highlighted evidence row in 420ms; the row pulses once. Click the row to replay."
        duration={1000}
        wide
      >
        {({ replay }) => <ThreadDemo replay={replay} />}
      </ReplayCard>

      <ReplayCard
        slug="signature-time"
        title="Time slide"
        spec="§17: date counter ticks; certificate and deadline strips slide left proportionally over 900ms --ease-in-out; items that pass today flip to “Expired” with a 160ms colour change."
        duration={1000}
        wide
      >
        {({ run }) => <TimeDemo run={run} />}
      </ReplayCard>
    </>
  );
}
