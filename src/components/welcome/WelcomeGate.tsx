"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCheck, Eye, Terminal, ArrowRight } from "lucide-react";
import {
  ROLE_STORAGE_KEY,
  ROLE_CHANGE_EVENT,
  type Role,
} from "@/components/workspace/role-context";
import { ComplianceLogo } from "@/components/brand/ComplianceLogo";

interface Persona {
  role: Role;
  name: string;
  title: string;
  description: string;
  detail: string[];
  icon: typeof UserCheck;
  button: string;
  route: string;
}

const PERSONAS: Persona[] = [
  {
    role: "officer",
    name: "Mara Osei",
    title: "Compliance officer",
    description: "Review alerts, decide what happened, file reports.",
    detail: ["Opens and closes cases", "Files reports with the proof attached"],
    icon: UserCheck,
    button: "Continue as officer",
    route: "/alerts",
  },
  {
    role: "auditor",
    name: "Idris Bello",
    title: "External auditor",
    description: "Read everything, verify records, export reports. Cannot decide.",
    detail: ["Checks the record is unaltered", "Exports audit packs"],
    icon: Eye,
    button: "Continue as auditor",
    route: "/audit-record",
  },
  {
    role: "admin",
    name: "Sofia Lindqvist",
    title: "Administrator",
    description: "Manage checks, responses and demo settings.",
    detail: ["Turns automated responses on or off", "Resets the demo"],
    icon: Terminal,
    button: "Continue as administrator",
    route: "/overview",
  },
];

const LIFECYCLE = [
  "Spotted by a check",
  "Explained in plain words",
  "You decide",
  "Saved to the record",
];

/** Closed case folder, teal seal, thread looping off the edge (DESIGN §28.7). */
function WelcomeFolder() {
  return (
    <svg className="wg-folder" viewBox="0 0 260 176" role="img" aria-label="A sealed case folder">
      <rect x="34" y="18" width="176" height="112" rx="8" fill="var(--ill-paper)" stroke="var(--ill-ink)" strokeWidth="2" />
      <line x1="58" y1="48" x2="150" y2="48" stroke="var(--ill-sky)" strokeWidth="4" strokeLinecap="round" />
      <line x1="58" y1="66" x2="186" y2="66" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />
      <line x1="58" y1="84" x2="172" y2="84" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />
      <line x1="58" y1="102" x2="128" y2="102" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M14 54h72l14 16h132a12 12 0 0 1 12 12v68a12 12 0 0 1-12 12H14a12 12 0 0 1-12-12V66a12 12 0 0 1 12-12z"
        fill="var(--ill-cream)"
        stroke="var(--ill-ink)"
        strokeWidth="2"
      />
      <path d="M2 128c46 22 118 20 172 2" fill="none" stroke="var(--cta)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="196" cy="118" r="22" fill="var(--ill-teal)" stroke="var(--ill-ink)" strokeWidth="2" />
      <path d="M186 118l7 7 14-15" fill="none" stroke="#fffdf8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="130" r="5" fill="var(--cta)" stroke="var(--ill-ink)" strokeWidth="1.5" />
    </svg>
  );
}

export function WelcomeGate() {
  const router = useRouter();

  function enter(role: Role, route: string) {
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
    document.documentElement.dataset.role = role;
    document.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
    router.push(route);
  }

  return (
    <div className="wg">
      {/* Left: navy brand panel (DESIGN §29, 1440 spec) */}
      <section className="wg-left">
        <Link href="/" className="wg-brand" aria-label="ComplianceIQ home">
          <ComplianceLogo variant="light" size="sm" />
        </Link>

        <div className="wg-left-body">
          <WelcomeFolder />

          <h1 className="wg-headline">Compliance decisions you can prove.</h1>
          <p className="wg-lede">
            It reads your policies, watches people and vendors, and flags what needs a decision.
            Every decision is kept.
          </p>

          <ol className="wg-steps" aria-label="How a case moves through the app">
            {LIFECYCLE.map((step) => (
              <li key={step} className="wg-step">
                <span className="wg-step-dot" aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="wg-left-note">Demo workspace · Nothing you do here is sent anywhere.</p>
      </section>

      {/* Right: cream role sign-in */}
      <section className="wg-right">
        <header className="wg-right-head">
          <h2 className="wg-title">Choose your role</h2>
          <p className="wg-sub">
            Each role sees only what it needs. You can switch later in Settings.
          </p>
        </header>

        <div className="wg-cards">
          {PERSONAS.map((persona) => {
            const Icon = persona.icon;
            return (
              <div key={persona.role} className="wg-card">
                <span className="wg-card-icon" aria-hidden="true">
                  <Icon size={24} />
                </span>

                <div className="wg-card-body">
                  <h3 className="wg-card-title">{persona.title}</h3>
                  <p className="wg-card-desc">{persona.description}</p>
                  <p className="wg-card-detail">
                    {persona.detail.join(" · ")}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-navy wg-card-btn"
                  onClick={() => enter(persona.role, persona.route)}
                >
                  <span>{persona.button}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            );
          })}
          <p className="wg-signed-in">
            The demo signs you in as <strong>{PERSONAS[0].name}</strong>,{" "}
            <strong>{PERSONAS[1].name}</strong> or <strong>{PERSONAS[2].name}</strong> —
            no account needed.
          </p>
        </div>

        <footer className="wg-right-foot">
          <Link href="/" className="wg-back">
            Back to the website
          </Link>
        </footer>
      </section>
    </div>
  );
}
