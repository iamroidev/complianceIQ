"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCheck, Eye, Terminal, RefreshCw, X, ArrowUpRight } from "lucide-react";
import { useRole, ROLE_NAMES, type Role } from "./role-context";
import { DEMO_ADMIN_HEADERS } from "./demo-context";

const STORAGE_KEY = "ciq_onboarding_ribbon_dismissed";

export function OnboardingRibbon() {
  const router = useRouter();
  const { role, setRole } = useRole();
  const [resetting, setResetting] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== "true") {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    window.localStorage.setItem(STORAGE_KEY, "true");
  };

  const cycleRole = () => {
    const roles: Role[] = ["officer", "auditor", "admin"];
    const nextIdx = (roles.indexOf(role) + 1) % roles.length;
    setRole(roles[nextIdx]);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/demo/reset", {
        method: "POST",
        headers: DEMO_ADMIN_HEADERS,
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // Ignored
    } finally {
      setResetting(false);
    }
  };

  if (dismissed) return null;

  const RoleIcon = role === "officer" ? UserCheck : role === "auditor" ? Eye : Terminal;

  return (
    <div className="onboarding-ribbon" role="region" aria-label="Demo Status Banner">
      <div className="onboarding-ribbon-content">
        <div className="onboarding-ribbon-badge">
          <span className="onboarding-ribbon-dot" aria-hidden="true" />
          <span>Demo Workspace</span>
        </div>

        <div className="onboarding-ribbon-text">
          <span>Signed in as </span>
          <button
            type="button"
            className="onboarding-ribbon-role-btn"
            onClick={cycleRole}
            title="Click to switch role"
          >
            <RoleIcon size={13} />
            <strong>{ROLE_NAMES[role]}</strong>
            <span className="onboarding-ribbon-switch-hint">(switch)</span>
          </button>
          <span className="onboarding-ribbon-desc">
            {role === "officer"
              ? "— reviewing open alerts and policy obligations"
              : role === "auditor"
                ? "— inspecting cryptographic proof and ledger records"
                : "— managing automated rules and company registers"}
          </span>
        </div>

        <div className="onboarding-ribbon-actions">
          <button
            type="button"
            className="onboarding-ribbon-btn"
            onClick={() => void handleReset()}
            disabled={resetting}
            title="Reset seeded demo data"
          >
            <RefreshCw size={12} className={resetting ? "spin" : ""} />
            <span>{resetting ? "Resetting…" : "Reset State"}</span>
          </button>

          <Link href="/" className="onboarding-ribbon-btn onboarding-ribbon-btn--link">
            <span>Website</span>
            <ArrowUpRight size={12} />
          </Link>

          <button
            type="button"
            className="onboarding-ribbon-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            title="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
