"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tamperBlocks, verifyChain } from "@/core/ledger";
import type { Alert, AuditBlock } from "@/core/types";
import { formatShort } from "@/lib/format";
import {
  DEMO_ADMIN_HEADERS,
  useDemo,
  type TamperSim,
} from "./demo-context";

/**
 * Demo panel (DESIGN §7 / §15.2): a collapsible side drawer titled "Demo
 * scenarios" — scenario buttons, "Move date forward" time travel with a plain
 * caption of what changed, the demo-only tamper simulation (an in-memory copy
 * per §7.6), and the admin reset.
 */

const SCENARIOS = [
  { id: "structured-deposits", title: "Structured deposits" },
  { id: "payment-without-approver", title: "Payment without approver" },
  { id: "sod-breach", title: "Separation of duties breach" },
  { id: "restricted-record-access", title: "Restricted record access" },
  { id: "leaked-secret", title: "Leaked secret" },
  { id: "expired-certification", title: "Expired certification" },
  { id: "missed-deadline", title: "Missed deadline" },
  { id: "vendor-document-lapsed", title: "Vendor document lapsed" },
] as const;

/** What a time-travel step looks like in plain words, per state rule. */
const WHAT_CHANGED: Record<string, [singular: string, plural: string]> = {
  "CERT-001": ["certification expired", "certifications expired"],
  "DEAD-001": ["deadline missed", "deadlines missed"],
  "VEND-001": ["vendor document lapsed", "vendor documents lapsed"],
};

function changedCaption(opened: Alert[], resolved: Alert[]): string {
  const counts = new Map<string, number>();
  for (const alert of opened) {
    counts.set(alert.ruleId, (counts.get(alert.ruleId) ?? 0) + 1);
  }
  const parts: string[] = [];
  for (const [ruleId, count] of counts) {
    const phrase = WHAT_CHANGED[ruleId];
    parts.push(
      phrase ? `${count} ${count === 1 ? phrase[0] : phrase[1]}` : `${count} alerts opened`,
    );
  }
  if (resolved.length > 0) {
    parts.push(
      `${resolved.length} ${resolved.length === 1 ? "alert closed" : "alerts closed"} automatically`,
    );
  }
  return parts.length > 0 ? parts.join(", ") : "Nothing changed yet.";
}

async function jsonOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export function DemoPanel() {
  const router = useRouter();
  const { drawerOpen, closeDrawer, sim, setSim, startWalkthrough } = useDemo();
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  async function runScenario(id: string, title: string) {
    setBusy(`scenario:${id}`);
    setStatus(null);
    try {
      const response = await fetch(`/api/demo/scenario/${id}`, {
        method: "POST",
        headers: DEMO_ADMIN_HEADERS,
        body: "{}",
      });
      if (!response.ok) throw new Error(await response.text());
      const body = await jsonOf(response);
      const after = await jsonOf(await fetch("/api/alerts"));
      const rows = (after["alerts"] as Alert[] | undefined) ?? [];
      const byId = new Map(rows.map((alert) => [alert.id, alert]));
      // Scenarios rebuild state from their own run (§7.8), so the opened ids
      // are the whole story; state rules may auto-close their first alert.
      const opened = (body["opened"] as Array<{ alertId?: string }> | undefined) ?? [];
      const pick =
        opened
          .map((key) => (key.alertId ? byId.get(key.alertId) : undefined))
          .find((alert) => alert !== undefined && alert.status === "open") ??
        rows.find((alert) => alert.status === "open");
      setStatus(
        pick
          ? `Ran ${title}. The new case is open with a guided tour.`
          : `Ran ${title}. No new alerts appeared.`,
      );
      if (pick) {
        startWalkthrough(pick.id);
        closeDrawer();
        router.push(`/alerts/${pick.id}`);
      }
    } catch {
      setStatus("The scenario could not run. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function advanceTime(days: number) {
    setBusy(`advance:${days}`);
    setStatus(null);
    try {
      const response = await fetch("/api/demo/advance-time", {
        method: "POST",
        headers: DEMO_ADMIN_HEADERS,
        body: JSON.stringify({ days }),
      });
      if (!response.ok) throw new Error(await response.text());
      const body = await jsonOf(response);
      const opened = (body["opened"] as Alert[] | undefined) ?? [];
      const resolved = (body["resolved"] as Alert[] | undefined) ?? [];
      const asOf = typeof body["asOf"] === "string" ? body["asOf"] : "";
      setStatus(`Moved to ${formatShort(asOf)}. ${changedCaption(opened, resolved)}`);
    } catch {
      setStatus("The date could not move. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function simulateTampering() {
    setBusy("simulate");
    setStatus(null);
    try {
      const ledger = await jsonOf(await fetch("/api/ledger"));
      const blocks = (ledger["blocks"] as AuditBlock[] | undefined) ?? [];
      const tampered = tamperBlocks(blocks, "payload");
      const result = verifyChain(tampered);
      if (result.ok) {
        setStatus("The copy still verifies. Try again.");
        return;
      }
      const copy: TamperSim = {
        blocks: tampered,
        brokenIndex: result.firstBrokenIndex,
        later: Math.max(tampered.length - result.firstBrokenIndex - 1, 0),
        total: tampered.length,
      };
      setSim(copy);
      closeDrawer();
      router.push("/audit-record");
    } catch {
      setStatus("The simulation could not run. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function resetDemo() {
    setBusy("reset");
    setStatus(null);
    try {
      const response = await fetch("/api/demo/reset", {
        method: "POST",
        headers: DEMO_ADMIN_HEADERS,
        body: "{}",
      });
      if (!response.ok) throw new Error(await response.text());
      const body = await jsonOf(response);
      const standing = (body["standingAlerts"] as string[] | undefined) ?? [];
      setStatus(`Demo reset. ${standing.length} standing alerts are open.`);
      closeDrawer();
      router.push("/alerts");
    } catch {
      setStatus("The demo could not reset. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <aside className="demo-drawer" role="dialog" aria-modal="false" aria-labelledby="demo-title">
      <div className="demo-head">
        <h2 id="demo-title">Demo scenarios</h2>
        <button type="button" className="btn-quiet" onClick={closeDrawer}>
          Close
        </button>
      </div>

      <section className="demo-section">
        <h3>Run a scenario</h3>
        <div className="demo-list">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className="btn btn-plain demo-run"
              disabled={busy !== null}
              onClick={() => void runScenario(scenario.id, scenario.title)}
            >
              Run scenario: {scenario.title}
            </button>
          ))}
        </div>
      </section>

      <section className="demo-section">
        <h3>Move date forward</h3>
        <div className="demo-dates">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              className="btn btn-plain"
              disabled={busy !== null}
              onClick={() => void advanceTime(days)}
            >
              Move date forward by {days} days
            </button>
          ))}
        </div>
        <p className="page-note">
          Checks run as the date moves, so certificates expire and deadlines pass.
        </p>
      </section>

      <section className="demo-section">
        <h3>Tamper check</h3>
        <button
          type="button"
          className="btn btn-plain"
          disabled={busy !== null}
          onClick={() => void simulateTampering()}
        >
          Simulate tampering
        </button>
        <p className="page-note">
          Alters a copy in this browser to show the verifier catching it. The saved record is
          never touched.
          {sim ? " A simulation is active." : ""}
        </p>
      </section>

      <section className="demo-section">
        <h3>Reset</h3>
        <button
          type="button"
          className="btn btn-plain"
          disabled={busy !== null}
          onClick={() => void resetDemo()}
        >
          Reset demo
        </button>
        <p className="page-note">Restores the seeded state and a verified ledger.</p>
      </section>

      {status && (
        <p className="demo-status" role="status">
          {status}
        </p>
      )}
    </aside>
  );
}
