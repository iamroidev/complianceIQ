"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Eye,
  Terminal,
  ArrowRight,
  ShieldCheck,
  FileText,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  ROLE_STORAGE_KEY,
  ROLE_CHANGE_EVENT,
  type Role,
} from "@/components/workspace/role-context";

interface TestDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES: Array<{
  role: Role;
  name: string;
  title: string;
  description: string;
  route: string;
  icon: typeof UserCheck;
  buttonLabel: string;
}> = [
  {
    role: "officer",
    name: "Mara Osei",
    title: "Compliance Officer",
    description:
      "Review open alerts, see exact policy clauses, and sign off on compliance decisions.",
    route: "/alerts",
    icon: UserCheck,
    buttonLabel: "Enter as Officer",
  },
  {
    role: "auditor",
    name: "Idris Bello",
    title: "External Auditor",
    description:
      "Verify the cryptographic chain, inspect evidence records, and export audit packs.",
    route: "/audit-record",
    icon: Eye,
    buttonLabel: "Enter as Auditor",
  },
  {
    role: "admin",
    name: "Sofia Lindqvist",
    title: "System Administrator",
    description:
      "Configure automated rules, manage company registers, and review policy coverage.",
    route: "/overview",
    icon: Terminal,
    buttonLabel: "Enter as Admin",
  },
];

const SCENARIOS = [
  {
    id: "alert-review",
    role: "officer" as Role,
    title: "Review High-Risk Alert",
    summary: "Examine cash deposits flagged under reporting thresholds (Rule AML-001).",
    route: "/alerts",
    icon: AlertTriangle,
  },
  {
    id: "tamper-proof",
    role: "auditor" as Role,
    title: "Verify Audit Ledger",
    summary: "Inspect SHA-256 dual-hash cryptographic chain integrity.",
    route: "/audit-record",
    icon: ShieldCheck,
  },
  {
    id: "policy-mapping",
    role: "admin" as Role,
    title: "Written Policy Obligations",
    summary: "Inspect policy documents mapped into automated continuous checks.",
    route: "/policies",
    icon: FileText,
  },
];

export function TestDriveModal({ isOpen, onClose }: TestDriveModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const launch = (role: Role, route: string) => {
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
    document.documentElement.dataset.role = role;
    document.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
    router.push(route);
    onClose();
  };

  return (
    <div
      className="test-drive-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="test-drive-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="test-drive-modal" ref={modalRef}>
        <button
          type="button"
          className="test-drive-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <header className="test-drive-header">
          <h2 id="test-drive-title" className="test-drive-heading">
            Choose your role
          </h2>
          <p className="test-drive-subhead">
            Explore the case room with pre-loaded demo records, open alerts, and
            cryptographic audit chains.
          </p>
        </header>

        {/* 3 Personas */}
        <div className="test-drive-roles">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.role} className={`test-drive-card test-drive-card--${r.role}`}>
                <div className="test-drive-card-top">
                  <span className="test-drive-card-icon">
                    <Icon size={18} />
                  </span>
                  <span className="test-drive-card-role-tag">{r.title}</span>
                </div>
                <h3 className="test-drive-card-title">{r.name}</h3>
                <p className="test-drive-card-desc">{r.description}</p>
                <div className="test-drive-card-actions">
                  <button
                    type="button"
                    className="btn btn-navy test-drive-btn"
                    onClick={() => launch(r.role, r.route)}
                  >
                    <span>{r.buttonLabel}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Workflows */}
        <div className="test-drive-scenarios-section">
          <div className="test-drive-scenarios-title">
            <span>Direct workflow shortcuts</span>
          </div>
          <div className="test-drive-scenarios-grid">
            {SCENARIOS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  className="test-drive-scenario-item"
                  onClick={() => launch(s.role, s.route)}
                >
                  <span className="test-drive-scenario-icon">
                    <Icon size={15} />
                  </span>
                  <div className="test-drive-scenario-text">
                    <strong>{s.title}</strong>
                    <span>{s.summary}</span>
                  </div>
                  <ArrowRight size={13} className="test-drive-scenario-arrow" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
