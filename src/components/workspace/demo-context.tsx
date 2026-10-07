"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AuditBlock } from "@/core/types";

/**
 * Demo panel state (DESIGN §7): the drawer, the in-memory tamper simulation
 * (§7.6 — a copy the stored ledger never touches), and the walkthrough caption
 * that opens after a scenario runs ("activity, rule, policy, saved record,
 * with a small caption at each step"). Lives in the shell so it survives
 * navigation between the panel and the audit record page.
 */

export interface TamperSim {
  /** The tampered copy of the ledger this browser is showing. */
  blocks: AuditBlock[];
  brokenIndex: number;
  later: number;
  total: number;
}

export interface Walkthrough {
  alertId: string;
  /** Index into WALKTHROUGH_STEPS. */
  step: number;
}

export const WALKTHROUGH_STEPS = [
  {
    tab: "activity",
    title: "Activity",
    caption: "What happened, in order — from the first event to the decision.",
  },
  {
    tab: "triggered",
    title: "The rule",
    caption: "Why it fired: what we looked for, what we found, and why it matters.",
  },
  {
    tab: "policy",
    title: "Policy",
    caption: "The exact policy wording this case relies on.",
  },
  {
    tab: "history",
    title: "Saved record",
    caption: "Every action is written to the audit record, where anyone can verify it.",
  },
] as const;

interface DemoValue {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  sim: TamperSim | null;
  setSim: (sim: TamperSim | null) => void;
  walkthrough: Walkthrough | null;
  startWalkthrough: (alertId: string) => void;
  advanceWalkthrough: () => void;
  endWalkthrough: () => void;
}

const DemoContext = createContext<DemoValue | null>(null);

export function useDemo(): DemoValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside <Shell>");
  return value;
}

/** The demo controls are admin-only routes (§8); role arrives by header until M11's switcher. */
export const DEMO_ADMIN_HEADERS = {
  "x-ciq-role": "admin",
  "content-type": "application/json",
} as const;

export function DemoProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sim, setSim] = useState<TamperSim | null>(null);
  const [walkthrough, setWalkthrough] = useState<Walkthrough | null>(null);

  const startWalkthrough = useCallback((alertId: string) => {
    setWalkthrough({ alertId, step: 0 });
  }, []);
  const advanceWalkthrough = useCallback(() => {
    setWalkthrough((current) => {
      if (!current) return current;
      const next = current.step + 1;
      if (next >= WALKTHROUGH_STEPS.length) return null;
      return { ...current, step: next };
    });
  }, []);
  const endWalkthrough = useCallback(() => setWalkthrough(null), []);

  const value = useMemo<DemoValue>(
    () => ({
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      toggleDrawer: () => setDrawerOpen((open) => !open),
      sim,
      setSim,
      walkthrough,
      startWalkthrough,
      advanceWalkthrough,
      endWalkthrough,
    }),
    [drawerOpen, sim, walkthrough, startWalkthrough, advanceWalkthrough, endWalkthrough],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
