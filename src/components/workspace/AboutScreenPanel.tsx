"use client";

import { useEffect, useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle, Info } from "lucide-react";

export interface AboutScreenCopy {
  screen: string;
  whatThisIs: string;
  whatYouCanDo: string[];
  whatHappensNext: string;
}

export const ABOUT_SCREENS: Record<string, AboutScreenCopy> = {
  overview: {
    screen: "Overview",
    whatThisIs: "Your desk: what needs you now.",
    whatYouCanDo: ["Open an alert", "Check what is due next", "Follow setup steps"],
    whatHappensNext: "Your decisions are saved to the audit record.",
  },
  alerts: {
    screen: "Alerts",
    whatThisIs: "Everything the checks flagged.",
    whatYouCanDo: ["Open a case", "Filter and sort", "Change the order"],
    whatHappensNext: "Open a case to read why and decide.",
  },
  case: {
    screen: "Case",
    whatThisIs: "One flagged item, explained.",
    whatYouCanDo: ["Read why it was flagged", "Check the policy", "File, escalate or dismiss"],
    whatHappensNext: "Your decision is saved and can't be edited.",
  },
  deadlines: {
    screen: "Deadlines",
    whatThisIs: "Dates that must not be missed.",
    whatYouCanDo: ["See what is due", "Mark one completed with proof", "Add a deadline"],
    whatHappensNext: "The next check run closes their alerts.",
  },
  evidence: {
    screen: "Evidence",
    whatThisIs: "Proof saved at the moment something was flagged.",
    whatYouCanDo: ["Open an item", "Show technical details", "Check it is verified"],
    whatHappensNext: "Evidence appears in your audit pack.",
  },
  "audit-record": {
    screen: "Audit record",
    whatThisIs: "A permanent log of every decision.",
    whatYouCanDo: ["Run a tamper check", "Open any entry"],
    whatHappensNext: "Auditors can verify it themselves.",
  },
  reports: {
    screen: "Reports",
    whatThisIs: "Reports an auditor can check.",
    whatYouCanDo: ["Generate an audit pack", "Open a drafted report"],
    whatHappensNext: "Each pack records its own proof.",
  },
  "policy-coverage": {
    screen: "Policy coverage",
    whatThisIs: "Which policy rules are checked automatically.",
    whatYouCanDo: ["Upload a policy", "Connect gaps to a check"],
    whatHappensNext: "Checked rules raise alerts when broken.",
  },
  policies: {
    screen: "Policies",
    whatThisIs: "The documents the checks are based on.",
    whatYouCanDo: ["Read a policy", "See which checks use it"],
    whatHappensNext: "Obligations found here feed Policy coverage.",
  },
  obligations: {
    screen: "Obligations",
    whatThisIs: "The promises in your policies, waiting for a person to confirm them.",
    whatYouCanDo: ["Read an obligation", "Confirm one you own", "Upload a policy"],
    whatHappensNext: "Confirmed obligations become checks in Policy coverage.",
  },
  people: {
    screen: "People",
    whatThisIs: "Who is qualified for their role, today.",
    whatYouCanDo: ["Add or import people", "Attach a renewal"],
    whatHappensNext: "Expiring certificates raise alerts.",
  },
  vendors: {
    screen: "Vendors",
    whatThisIs: "Whether each vendor has the paperwork we require.",
    whatYouCanDo: ["Add a vendor", "Attach a document", "Request a renewal"],
    whatHappensNext: "Missing documents raise alerts.",
  },
  rules: {
    screen: "Rules",
    whatThisIs: "What the system checks, in plain words.",
    whatYouCanDo: ["Read a rule", "Try it on a sample"],
    whatHappensNext: "Every check run evaluates them against fresh data.",
  },
  sources: {
    screen: "Sources",
    whatThisIs: "What feeds the system.",
    whatYouCanDo: ["See what is reporting", "Check delays"],
    whatHappensNext: "Activity from sources is checked by the rules.",
  },
  responses: {
    screen: "Responses",
    whatThisIs: "What happens automatically when something is flagged.",
    whatYouCanDo: ["Choose Off, Suggest only or Automatic"],
    whatHappensNext: "Every action is saved and can be undone.",
  },
  settings: {
    screen: "Settings",
    whatThisIs: "Your preferences and demo options.",
    whatYouCanDo: ["Change your role", "Switch theme and row height", "Turn movement on or off"],
    whatHappensNext: "Changes apply straight away.",
  },
};

export function AboutScreenPanel({ screenKey }: { screenKey: string }) {
  const config = ABOUT_SCREENS[screenKey];
  const storageKey = `ciq-about-panel-${screenKey}`;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // Open on first visit, collapsed afterwards
      if (saved === null) {
        setIsOpen(true);
      } else {
        setIsOpen(saved === "true");
      }
    } catch {}
  }, [storageKey]);

  // §30.5.H: the sidebar Help button can open this screen's guide directly.
  useEffect(() => {
    const onOpen = () => {
      setIsOpen(true);
      try {
        localStorage.setItem(storageKey, "true");
      } catch {}
    };
    window.addEventListener("ciq:about-open", onOpen);
    return () => window.removeEventListener("ciq:about-open", onOpen);
  }, [storageKey]);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {}
  };

  if (!config) return null;

  return (
    <div className={`about-screen-strip${isOpen ? " is-open" : " is-collapsed"}`}>
      <div className="about-strip-header">
        <button
          type="button"
          className="about-toggle-link"
          onClick={toggle}
          aria-expanded={isOpen}
          title="Click to toggle screen guide"
        >
          <Info size={16} className="about-info-icon" aria-hidden="true" />
          <span className="about-title-text">About this screen · How this works</span>
          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {isOpen && (
        <div className="about-strip-body">
          <div className="about-columns-grid">
            {/* Column 1: What this is */}
            <div className="about-col">
              <span className="about-col-label">What this is</span>
              <p className="about-col-desc">{config.whatThisIs}</p>
            </div>

            {/* Column 2: What you can do */}
            <div className="about-col">
              <span className="about-col-label">What you can do</span>
              <ul className="about-actions-list">
                {config.whatYouCanDo.map((act) => (
                  <li key={act}>
                    <span className="about-bullet">•</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: What happens next */}
            <div className="about-col">
              <span className="about-col-label">What happens next</span>
              <p className="about-col-desc next-desc">{config.whatHappensNext}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
