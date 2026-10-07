"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ComplianceLogo } from "@/components/brand/ComplianceLogo";
import { ReduceMotionToggle } from "@/components/ReduceMotionToggle";
import { ChevronUp, ShieldCheck } from "lucide-react";

interface LedgerInfo {
  count: number;
  headHash: string | null;
}

const DIRECTORY: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Work",
    links: [
      { label: "Overview", href: "/overview" },
      { label: "Alerts", href: "/alerts" },
      { label: "Deadlines", href: "/deadlines" },
      { label: "Demo sign-in", href: "/demo" },
    ],
  },
  {
    title: "What we watch",
    links: [
      { label: "Policy coverage", href: "/policy-coverage" },
      { label: "Policies", href: "/policies" },
      { label: "People & certifications", href: "/registers/people" },
      { label: "Vendors", href: "/registers/vendors" },
    ],
  },
  {
    title: "How it checks",
    links: [
      { label: "Rules", href: "/rules" },
      { label: "Sources", href: "/sources" },
      { label: "Responses", href: "/responses" },
    ],
  },
  {
    title: "The record",
    links: [
      { label: "Audit record", href: "/audit-record" },
      { label: "Evidence", href: "/evidence" },
      { label: "Reports & audit packs", href: "/reports" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Words explained", href: "/styleguide" },
      { label: "Accessibility & contrast", href: "/styleguide" },
      { label: "Settings", href: "/settings" },
    ],
  },
];

export function LandingFooter({ onOpenDemo }: { onOpenDemo?: () => void }) {
  const [ledger, setLedger] = useState<LedgerInfo | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/ledger")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { count?: number; headHash?: string | null } | null) => {
        if (alive && data && typeof data.count === "number") {
          setLedger({ count: data.count, headHash: data.headHash ?? null });
        }
      })
      .catch(() => {
        // Static footer still works; the status line just omits the count.
      });
    return () => {
      alive = false;
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="lp-big-footer lp-footer" aria-label="ComplianceIQ footer">
      {/* Live record status bar */}
      <div className="lp-footer-ledger-bar">
        <div className="lp-container lp-footer-ledger-inner">
          <div className="lp-footer-ledger-status">
            <span className="lp-footer-pulse-dot" aria-hidden="true" />
            <span>
              Records verified
              {ledger ? ` · ${ledger.count.toLocaleString("en-US")} entries` : ""}
            </span>
          </div>
          <div className="lp-footer-ledger-actions">
            {ledger?.headHash ? (
              <span className="lp-footer-ledger-hash">head {ledger.headHash.slice(0, 12)}…</span>
            ) : null}
            <Link href="/audit-record" className="lp-footer-ledger-link">
              Open the audit record
            </Link>
          </div>
        </div>
      </div>

      <div className="lp-container lp-big-footer-content">
        {/* Brand + CTA */}
        <div className="lp-footer-top-grid">
          <div>
            <Link href="/" className="lp-footer-brand-wrap" aria-label="ComplianceIQ home">
              <ComplianceLogo variant="dark" size="md" />
            </Link>
            <p className="lp-footer-mission">
              An automated compliance monitoring and auditing system. It checks whether your
              company follows its own policies and the rules it signed up to, explains findings
              in plain words, and produces audit-ready reports.
            </p>
            <div className="lp-footer-badges">
              <span className="lp-footer-badge">Demo data · resets on demand</span>
              <span className="lp-footer-badge">Works offline</span>
              <span className="lp-footer-badge">Every decision recorded</span>
            </div>
          </div>
          <div className="lp-footer-cta-card">
            <div className="lp-footer-cta-title">Open the demo</div>
            <p className="lp-footer-cta-desc">
              No sign-up. The full workspace with seeded demo data, ready in one click.
            </p>
            <div className="lp-footer-cta-buttons">
              {onOpenDemo ? (
                <button
                  type="button"
                  onClick={onOpenDemo}
                  className="lp-btn lp-btn--solid lp-footer-cta-btn"
                >
                  Launch Interactive Demo
                </button>
              ) : (
                <Link href="/overview" className="lp-btn lp-btn--solid lp-footer-cta-btn">
                  Launch Interactive Demo
                </Link>
              )}
              <Link href="/demo" className="lp-btn lp-btn--outline lp-footer-cta-btn">
                Choose Persona & Role
              </Link>
            </div>
          </div>
        </div>

        {/* Site directory, mirroring the four sidebar lifecycle groups */}
        <nav className="lp-footer-directory" aria-label="Footer">
          {DIRECTORY.map((group) => (
            <div key={group.title}>
              <div className="lp-footer-col-title">{group.title}</div>
              <ul className="lp-footer-list">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Hallmark strip + back to top */}
        <div className="lp-footer-hallmark-strip">
          <ShieldCheck size={28} className="lp-footer-hallmark-seal" aria-hidden="true" strokeWidth={1.75} />
          <p className="lp-footer-hallmark-text">
            Every decision and every entry is written once and kept in order,{" "}
            <strong>so an auditor can check the record for themselves</strong>.
          </p>
          <button
            type="button"
            onClick={scrollToTop}
            className="lp-footer-back-to-top"
            aria-label="Back to top"
          >
            <span>Top</span>
            <ChevronUp size={14} aria-hidden="true" />
          </button>
        </div>

        {/* Bottom bar */}
        <div className="lp-footer-bottom-bar">
          <div className="lp-footer-meta-tags">
            <span className="lp-footer-meta-tag">© 2026 ComplianceIQ</span>
            <span className="lp-footer-meta-tag">Compliance decisions you can prove.</span>
          </div>
          <ReduceMotionToggle />
        </div>
      </div>
    </footer>
  );
}
