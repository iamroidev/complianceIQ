"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReduceMotionToggle } from "@/components/ReduceMotionToggle";
import { TokenDemos } from "./tokens-demos";
import { SignatureDemos } from "./signature-demos";
import { ProductDemos } from "./product-demos";
import { LandingDemos } from "./landing-demos";

function playAll() {
  window.dispatchEvent(new Event("ciq-ml-play-all"));
}

export function MotionLab() {
  return (
    <main style={{ maxWidth: "980px", margin: "0 auto", padding: "48px 24px 96px" }}>
      <header
        style={{
          marginBottom: "8px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={{ fontSize: "var(--fs-label)", marginBottom: "4px" }}>
            <Link href="/styleguide" style={{ color: "var(--accent)" }}>
              Styleguide
            </Link>{" "}
            / Motion lab
          </p>
          <h1 style={{ fontSize: "var(--fs-title)", fontWeight: 600, lineHeight: "28px" }}>
            Motion lab — §17 choreography
          </h1>
          <p style={{ color: "var(--text-2)", maxWidth: "var(--max-prose)" }}>
            Every §17 row as a replayable demo. Each card rests in its final
            state; Replay (or Play all) re-runs the choreography from the
            start. Toggle Reduce motion to watch every demo degrade to a 150ms
            opacity fade with instant colour changes.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <ThemeToggle />
          <ReduceMotionToggle />
          <button
            type="button"
            onClick={playAll}
            style={{
              minHeight: "32px",
              padding: "0 12px",
              background: "var(--accent)",
              color: "var(--on-accent)",
              border: "none",
              borderRadius: "var(--r-control)",
              fontSize: "var(--fs-label)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Play all
          </button>
        </div>
      </header>

      <section className="ml-sec">
        <h2 className="ml-sec-h">Motion tokens</h2>
        <p className="ml-sec-p">
          The §17 easing and duration tokens exactly as declared in
          tokens.css — the only curves and times product code may use.
        </p>
        <div className="ml-grid">
          <TokenDemos />
        </div>
      </section>

      <section className="ml-sec">
        <h2 className="ml-sec-h">Signature moments</h2>
        <p className="ml-sec-p">
          The seal, the thread, the tamper tear and the time slide — the four
          moments that carry the product’s identity.
        </p>
        <div className="ml-grid">
          <SignatureDemos />
        </div>
      </section>

      <section className="ml-sec">
        <h2 className="ml-sec-h">Product transitions</h2>
        <p className="ml-sec-p">
          Everyday product choreography — all ≤ 240ms except progress
          feedback (skeleton, highlight) which §17 explicitly lengths.
        </p>
        <div className="ml-grid">
          <ProductDemos />
        </div>
      </section>

      <section className="ml-sec">
        <h2 className="ml-sec-h">Landing choreography</h2>
        <p className="ml-sec-p">
          Load sequence and scroll scenes. GSAP ScrollTrigger and the
          headline mask arrive with the landing page (M12); these demos pin
          the spec’d timings so the choreography can be critiqued frame by
          frame before any library ships.
        </p>
        <div className="ml-grid">
          <LandingDemos />
        </div>
      </section>

      <section className="ml-sec">
        <h2 className="ml-sec-h">Rules and budgets</h2>
        <p className="ml-sec-p">§17, enforced by later gates.</p>
        <ul className="ml-rules">
          <li>
            <strong>Animate only</strong> transform, opacity and SVG
            stroke-dashoffset — never width, height, top or left of large
            layouts.
          </li>
          <li>
            <strong>Product ≤ 240ms;</strong> nothing blocks input; &gt;1s
            shows progress; &gt;10s offers cancel.
          </li>
          <li>
            <strong>Stagger ≤ 80ms,</strong> max 8 staggered items; loops
            longer than 5s need a pause control.
          </li>
          <li>
            <strong>No</strong> scroll-jacking, Lenis, WebGL, custom cursors,
            magnetic buttons, marquees or autoplay video. Native scrolling
            always.
          </li>
          <li>
            <strong>Budget:</strong> compositor-only animation, 60fps on a
            mid-range laptop; landing LCP &lt; 2.5s, CLS 0, INP &lt; 200ms;
            landing JS ≤ 250KB gzipped; each inline SVG scene ≤ 30KB.
          </li>
          <li>
            <strong>Reduced motion:</strong> transforms and parallax off,
            reveals become 150ms opacity fades, threads fully drawn, seal and
            tear change instantly with colour and text; the toggle above
            overrides the OS setting both ways (?motion=reduce also works
            for headless runs).
          </li>
        </ul>
      </section>
    </main>
  );
}
