"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Compass,
  AlertTriangle,
  FileText,
  UserCheck,
  ShieldCheck,
  Download,
  ExternalLink,
} from "lucide-react";
import { useRole, ROLE_NAMES } from "./role-context";

interface TourStep {
  badge: string;
  title: string;
  story: string;
  takeaway: string;
  icon: typeof AlertTriangle;
  actionLabel?: string;
  actionRoute?: string;
}

const STORY_STEPS: TourStep[] = [
  {
    badge: "1. Automated Detection",
    title: "Continuous Background Rules Scan Everything",
    story:
      "ComplianceIQ watches transactions, code repositories, employee certifications, and vendor documents 24/7. When an anomalous event occurs—like a $9,800 cash deposit split to evade the $10,000 reporting threshold (Rule AML-001)—an alert fires immediately with zero manual scanning.",
    takeaway: "100% automated detection. No spreadsheets or manual daily logs.",
    icon: AlertTriangle,
    actionLabel: "View Open Alerts",
    actionRoute: "/alerts",
  },
  {
    badge: "2. Policy Grounding & AI",
    title: "Every Alert Cites Exact Policy Wording",
    story:
      "Unlike black-box AI tools, ComplianceIQ reads your company's actual uploaded policies. When an alert triggers, it extracts the exact clause from written documentation (e.g. Anti-Money Laundering Policy §4.2) and drafts a plain-language summary.",
    takeaway: "AI only explains and cites; it is strictly bounded by your written rules.",
    icon: FileText,
    actionLabel: "Inspect Policy Documents",
    actionRoute: "/policies",
  },
  {
    badge: "3. Human-in-the-Loop Sign-Off",
    title: "Officers Make the Legal Call",
    story:
      "Under financial and security regulations, AI cannot legally dismiss or report violations on its own. A human Compliance Officer (Mara Osei) reviews the case, adds notes, and officially decides whether to File a Suspicious Activity Report (SAR), Dismiss, or Escalate.",
    takeaway: "Full regulatory compliance with human oversight and sign-off.",
    icon: UserCheck,
    actionLabel: "Open Case Investigation Desk",
    actionRoute: "/alerts/alert-2026-031",
  },
  {
    badge: "4. Cryptographic Proof",
    title: "Dual SHA-256 Tamper-Proof Audit Ledger",
    story:
      "Every decision, evidence upload, and check run is instantly sealed into a cryptographic chain. Each block contains the SHA-256 fingerprint of the preceding block. If anyone modifies a database row afterwards, the mathematical hash breaks instantly.",
    takeaway: "Mathematical proof that audit logs have never been altered.",
    icon: ShieldCheck,
    actionLabel: "Verify Cryptographic Ledger",
    actionRoute: "/audit-record",
  },
  {
    badge: "5. Auditor Pack Export",
    title: "Self-Verifying Reports for External Auditors",
    story:
      "When external auditors (or regulators) arrive, you don't send emails or screenshots. You export a sealed, self-verifying Audit Pack containing every alert, timestamp, actor ID, and evidence file hash for the requested period.",
    takeaway: "Auditors can independently verify the cryptographic hash of every single report.",
    icon: Download,
    actionLabel: "Explore Audit Packs & Reports",
    actionRoute: "/reports",
  },
];

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDemo?: () => void;
}

export function GuidedTour({ isOpen, onClose, onOpenDemo }: GuidedTourProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const { role } = useRole();

  const handleNext = () => {
    if (stepIndex < STORY_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      onClose();
      if (onOpenDemo) onOpenDemo();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  };

  const jumpToRoute = (route: string) => {
    router.push(route);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, stepIndex, onClose]);

  if (!isOpen) return null;

  const currentStep = STORY_STEPS[stepIndex];
  const isLast = stepIndex === STORY_STEPS.length - 1;
  const StepIcon = currentStep.icon;

  return (
    <div className="guided-tour-overlay" role="dialog" aria-modal="true" aria-label="Interactive Guided Tour">
      {/* Dimmed backdrop */}
      <div className="tour-backdrop" onClick={onClose} />

      {/* Floating Paper Case-Dossier Coachmark */}
      <div className="tour-paper-note">
        {/* Header Ribbon */}
        <div className="tour-note-header">
          <div className="tour-note-badge">
            <Compass size={14} className="tour-badge-icon" />
            <span>Workflow Walkthrough · Step {stepIndex + 1} of {STORY_STEPS.length}</span>
          </div>
          <button
            type="button"
            className="tour-close-btn"
            onClick={onClose}
            aria-label="Skip tour"
            title="Close tour (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step Banner & Icon */}
        <div className="tour-step-badge-row">
          <span className="tour-step-tag">
            <StepIcon size={14} />
            <span>{currentStep.badge}</span>
          </span>
          <span className="tour-role-context">
            Exploring as <strong>{ROLE_NAMES[role]}</strong>
          </span>
        </div>

        {/* Step Content */}
        <h3 className="tour-step-title">{currentStep.title}</h3>
        <p className="tour-step-copy">{currentStep.story}</p>

        {/* Highlight takeaway pill */}
        <div className="tour-takeaway-box">
          <ShieldCheck size={14} className="text-cta" />
          <span>{currentStep.takeaway}</span>
        </div>

        {/* Optional jump-in action */}
        {currentStep.actionRoute && (
          <div className="tour-action-jump">
            <button
              type="button"
              className="tour-jump-btn"
              onClick={() => jumpToRoute(currentStep.actionRoute!)}
            >
              <span>{currentStep.actionLabel}</span>
              <ExternalLink size={12} />
            </button>
          </div>
        )}

        {/* Progress thread knots */}
        <div className="tour-progress-thread" aria-hidden="true">
          {STORY_STEPS.map((_, i) => (
            <span
              key={i}
              className={`thread-knot${i <= stepIndex ? " is-active" : ""}`}
              onClick={() => setStepIndex(i)}
              style={{ cursor: "pointer" }}
              title={`Jump to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Tour Actions */}
        <div className="tour-actions-row">
          <button
            type="button"
            className="btn btn-quiet tour-skip-btn"
            onClick={onClose}
          >
            Skip walkthrough
          </button>

          <div className="tour-nav-buttons">
            {stepIndex > 0 && (
              <button
                type="button"
                className="btn btn-plain tour-prev-btn"
                onClick={handlePrev}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-navy tour-next-btn"
              onClick={handleNext}
            >
              {isLast ? (
                <>
                  <span>Explore Scenarios</span>
                  <Check size={14} />
                </>
              ) : (
                <>
                  <span>Next Step</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
