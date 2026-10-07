"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bento } from "./Bento";
import { NAV_LINKS, type LandingFacts } from "./content";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { InkBand } from "./InkBand";
import { useLandingMotion } from "./motion";
import {
  AiSection,
  Closing,
  CompareSection,
  PackSection,
  PolicySection,
  Statements,
} from "./Sections";
import { BleedMotif, PaperTear, ThreadBunting, SectionTransitionVignette } from "./Transitions";
import { ComplianceLogo } from "@/components/brand/ComplianceLogo";
import { LandingFooter } from "./LandingFooter";
import { TestDriveModal } from "./TestDriveModal";

export function Landing({ facts }: { facts: LandingFacts }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [testDriveOpen, setTestDriveOpen] = useState(false);
  useLandingMotion(rootRef);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = 0;
      headerRef.current?.setAttribute("data-shrunk", window.scrollY > 8 ? "true" : "false");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="lp" ref={rootRef}>
      <svg className="lp-spine" aria-hidden="true" focusable="false">
        <path />
      </svg>
      <header className="lp-header" ref={headerRef} data-shrunk="false">
        <div className="lp-container lp-header-in">
          <Link href="/" className="lp-wordmark" aria-label="ComplianceIQ Home">
            <ComplianceLogo variant="light" size="sm" />
          </Link>
          <nav className="lp-nav" aria-label="Landing">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            className="lp-btn lp-btn--solid"
            onClick={() => setTestDriveOpen(true)}
          >
            <span>Explore Live Demo</span>
          </button>
        </div>
      </header>

      <main>
        <Hero facts={facts} />
        <Statements />
        <PolicySection facts={facts} />
        <HowItWorks />

        <section className="lp-band" id="checks">
          <PaperTear tone="white" variant={1} />
          <BleedMotif kind="magnifier" />
          <BleedMotif kind="chain" />
          <div className="lp-container">
            <p className="lp-kicker" data-reveal>
              Six areas, one layout
            </p>
            <h2 className="lp-h2" data-reveal>
              What it checks
            </h2>
            <p className="lp-lede" data-reveal>
              The demo covers six areas, each with its own rules and the policy
              wording behind them.
            </p>
            <Bento />
          </div>
          <SectionTransitionVignette tag="CRYPTOGRAPHIC PROOF CHAIN" tone="white" variant="seal" />
        </section>

        <section className="lp-band lp-band--ink lp-band--bunt" id="record">
          <PaperTear tone="canvas" variant={2} />
          <ThreadBunting variant="record" />
          <div className="lp-container">
            <div className="lp-record-grid">
              <div data-reveal>
                <p className="lp-kicker">Proof, not promises</p>
                <h2 className="lp-h2">A record nobody can quietly change</h2>
                <p className="lp-record-caption">
                  Every entry carries a fingerprint of the one before it. Alter
                  an entry and the numbers stop adding up: the check finds it,
                  and everything recorded after it can no longer be trusted.
                </p>
              </div>
              <InkBand />
            </div>
          </div>
          <SectionTransitionVignette tag="GUARDED AI & HUMAN SIGN-OFF" tone="ink" variant="knot" />
        </section>

        <AiSection />
        <PackSection />
        <CompareSection />
        <Closing onOpenDemo={() => setTestDriveOpen(true)} />
      </main>

      {/* The Architectural Big Footer */}
      <LandingFooter onOpenDemo={() => setTestDriveOpen(true)} />

      {/* Test Drive Modal */}
      <TestDriveModal
        isOpen={testDriveOpen}
        onClose={() => setTestDriveOpen(false)}
      />
    </div>
  );
}
