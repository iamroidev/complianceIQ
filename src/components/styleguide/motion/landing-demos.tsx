"use client";

import { useEffect, useRef, useState } from "react";
import { HeroCaseFile, StepDetect, StepExplain, StepDecide, StepProve, AuditPackFan } from "@/components/illustration/scenes";
import { ReplayCard } from "./ReplayCard";

function HeadlineDemo() {
  return (
    <h2 className="ml-headline">
      <span className="ml-line">
        <span className="ml-line-in">Compliance evidence</span>
      </span>
      <span className="ml-line">
        <span className="ml-line-in">
          you can actually{" "}
          <em className="ml-em">
            prove
            <svg
              className="ml-underline"
              viewBox="0 0 100 8"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M2 5 C 30 2, 70 2, 98 5"
                pathLength={1}
                strokeDasharray={1}
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </em>
        </span>
      </span>
    </h2>
  );
}

function RevealDemo() {
  return (
    <div className="ml-reveal">
      <h4>How it works</h4>
      <p>
        Capture → Explain → Decide → Prove. Production triggers this with an
        IntersectionObserver at 20% visibility (GSAP ScrollTrigger on the
        landing page), 16px up-fade over 500ms.
      </p>
    </div>
  );
}

const STEP_SCENES = [
  { key: "detect", label: "Detect", node: <StepDetect size={400} /> },
  { key: "explain", label: "Explain", node: <StepExplain size={400} /> },
  { key: "decide", label: "Decide", node: <StepDecide size={400} /> },
  { key: "prove", label: "Prove", node: <StepProve size={400} /> },
];

function StepDemo({ run }: { run: number }) {
  const [i, setI] = useState(3);

  useEffect(() => {
    if (run === 0) return;
    setI(0);
    const timers = [1, 2, 3].map((k) => setTimeout(() => setI(k), k * 450));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [run]);

  return (
    <div>
      <div className="ml-step-stack">
        {STEP_SCENES.map((s, k) => (
          <div key={s.key} className={`ml-step${i === k ? " is-on" : ""}`}>
            {s.node}
          </div>
        ))}
      </div>
      <div className="ml-step-nav">
        {STEP_SCENES.map((s, k) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={i === k}
            className="ml-step-dot"
            onClick={() => setI(k)}
          >
            {k + 1}. {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PolicyPullDemo() {
  return (
    <div className="ml-policy">
      <div className="ml-policy-doc">
        <div className="ml-doc-line" />
        <div className="ml-doc-line" />
        <div className="ml-doc-line" />
        <div className="ml-doc-line" />
        <div className="ml-strip">Access reviews every 90 days</div>
      </div>
      <svg
        className="ml-policy-thread"
        viewBox="0 0 120 40"
        width="120"
        height="40"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M4 20 C 40 38 80 2 116 20"
          stroke="var(--ill-teal)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <div className="ml-policy-card">
        <h4>Check linked</h4>
        <p>Quarterly access review · automated</p>
        <div className="ml-mini-toggle" aria-hidden="true" />
        <div className="ml-coverage-label">
          <span>Coverage</span>
          <span>64%</span>
        </div>
        <div className="ml-coverage">
          <div className="ml-coverage-fill" />
        </div>
        <div className="ml-doc-line" style={{ marginTop: 10, width: "60%" }} />
      </div>
    </div>
  );
}

function FanDemo() {
  return (
    <div className="ml-fan">
      <AuditPackFan size={360} />
    </div>
  );
}

function ParallaxDemo() {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onScroll = () => {
      if (document.documentElement.dataset.reduceMotion === "true") return;
      const y = box.scrollTop;
      const back = box.querySelector<HTMLElement>(".is-back");
      const front = box.querySelector<HTMLElement>(".is-front");
      if (back) back.style.transform = `translateY(${Math.max(-24, Math.min(24, y * 0.12 - 12))}px)`;
      if (front) front.style.transform = `translateY(${Math.max(-24, Math.min(24, -y * 0.16 + 12))}px)`;
    };
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => box.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={boxRef} className="ml-px-box" tabIndex={0} aria-label="Scrollable illustration preview">
      <div className="ml-px-inner">
        <div className="ml-px-content">
          <div className="ml-doc-line" />
          <div className="ml-doc-line" />
          <div className="ml-doc-line" />
          <div className="ml-doc-line" />
          <div className="ml-doc-line" />
          <div className="ml-doc-line" />
          <div className="ml-doc-line" />
          <div className="ml-doc-line" />
        </div>
        <span className="ml-px-layer is-back" aria-hidden="true">
          ledger
        </span>
        <span className="ml-px-layer is-front" aria-hidden="true">
          figure
        </span>
      </div>
    </div>
  );
}

export function LandingDemos() {
  return (
    <>
      <ReplayCard
        slug="landing-headline"
        title="Headline reveal"
        spec="§17 load: lines mask + rise 24px over 700ms with 80ms stagger; the underline under the italic word draws (stroke, 600ms)."
        duration={1200}
        wide
      >
        {() => <HeadlineDemo />}
      </ReplayCard>

      <ReplayCard
        slug="landing-hero"
        title="HeroCaseFile assembly"
        spec="§17 load: sheets drop and settle (stagger 90ms), thread draws (1.2s), seal stamps (spring), chain links slide in last — complete in ~1.4s, never blocking the CTA."
        duration={1400}
        wide
      >
        {() => (
          <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <HeroCaseFile size={720} />
          </div>
        )}
      </ReplayCard>

      <ReplayCard
        slug="landing-reveal"
        title="Scroll reveal"
        spec="§17 scroll: sections fade up 16px over 500ms when 20% visible (IntersectionObserver / GSAP ScrollTrigger)."
        duration={500}
      >
        {() => <RevealDemo />}
      </ReplayCard>

      <ReplayCard
        slug="landing-steps"
        title="How it works — step morph"
        spec="§17 scroll: the illustration morphs StepDetect → StepExplain → StepDecide → StepProve with the thread continuing; the indicator is clickable. Production pins ≈ 100vh per step via ScrollTrigger."
        duration={1800}
        wide
      >
        {({ run }) => <StepDemo run={run} />}
      </ReplayCard>

      <ReplayCard
        slug="landing-policy"
        title="Policy to checks"
        spec="§17 scroll: the highlighted sentence pulls along a thread into a check card; the toggle pops (spring) and the coverage bar fills."
        duration={1400}
        wide
      >
        {() => <PolicyPullDemo />}
      </ReplayCard>

      <ReplayCard
        slug="landing-fan"
        title="Audit pack fan"
        spec="§17 scroll: pages fan out as the section enters — four pages, 60ms stagger, ≤240ms product budget does not apply (landing scene)."
        duration={900}
      >
        {() => <FanDemo />}
      </ReplayCard>

      <ReplayCard
        slug="landing-parallax"
        title="Parallax layers"
        spec="§17: at most 24px on illustration layers, desktop only. Scroll inside the box; disabled entirely under reduced motion."
      >
        {() => <ParallaxDemo />}
      </ReplayCard>
    </>
  );
}
