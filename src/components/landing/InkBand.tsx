"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChainLink } from "@/components/illustration/kit";
import { TamperCheck, type TamperCheckState } from "@/components/signature/TamperCheck";
import { tamperBlocks, verifyChain } from "@/core/ledger";
import type { AuditBlock, EvidenceItem } from "@/core/types";

type Phase = "loading" | "ready" | "error";

const MAX_SHOWN = 24;
const ALTER_AT = 2;

function reducedMotion(): boolean {
  return document.documentElement.dataset.reduceMotion === "true";
}

/**
 * The ink band (§19.6): the large interactive tamper check. It runs against a
 * copy of the stored record — the record itself is never written (§7.6).
 */
export function InkBand() {
  const [stored, setStored] = useState<AuditBlock[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [altered, setAltered] = useState(false);
  const [check, setCheck] = useState<TamperCheckState>({ phase: "idle" });
  const [checkedIndex, setCheckedIndex] = useState<number | undefined>(undefined);
  const [note, setNote] = useState(
    "Every entry links to the one before it. Run the check to recompute all of them from the stored bytes.",
  );
  const timers = useRef<number[]>([]);

  const runCheck = useCallback((blocks: readonly AuditBlock[], items: readonly EvidenceItem[]) => {
    if (blocks.length === 0) return;
    const total = blocks.length;
    const finish = () => {
      const result = verifyChain(blocks, items);
      setCheckedIndex(undefined);
      setCheck(
        result.ok
          ? { phase: "ok", checked: total }
          : {
              phase: "failed",
              brokenIndex: result.firstBrokenIndex,
              later: Math.max(total - result.firstBrokenIndex - 1, 0),
            },
      );
    };
    if (reducedMotion()) {
      setCheck({ phase: "checking" });
      finish();
      return;
    }
    const frameMs = 16;
    const perFrame = Math.max(1, Math.ceil(total / (1200 / frameMs)));
    setCheck({ phase: "checking" });
    setCheckedIndex(undefined);
    let done = 0;
    const timer = window.setInterval(() => {
      done = Math.min(done + perFrame, total);
      setCheckedIndex(done - 1);
      if (done >= total) {
        window.clearInterval(timer);
        window.setTimeout(finish, 200);
      }
    }, frameMs);
    timers.current.push(timer);
  }, []);

  useEffect(() => {
    const active = timers.current;
    return () => {
      for (const timer of active) window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ledgerRes, evidenceRes] = await Promise.all([
          fetch("/api/ledger"),
          fetch("/api/evidence"),
        ]);
        if (!ledgerRes.ok || !evidenceRes.ok) throw new Error("fetch failed");
        const ledger = (await ledgerRes.json()) as { blocks: AuditBlock[] };
        const items = (await evidenceRes.json()) as { evidence: EvidenceItem[] };
        if (cancelled) return;
        setStored(ledger.blocks);
        setEvidence(items.evidence);
        setPhase("ready");
        setNote("The demo record as it stands. Every entry links to the one before it.");
        runCheck(ledger.blocks, items.evidence);
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runCheck]);

  const view = altered ? tamperBlocks(stored, "payload", { targetIndex: ALTER_AT }) : stored;
  const shown = view.slice(0, MAX_SHOWN);
  const failure = check.phase === "failed" ? check : null;
  const running = check.phase === "checking";

  const onTry = () => {
    setAltered(true);
    setCheck({ phase: "idle" });
    setCheckedIndex(undefined);
    setNote(
      "One entry in this copy no longer matches what was saved. Run the check to see what an auditor would see.",
    );
  };

  const onRestore = () => {
    setAltered(false);
    setNote("The copy was thrown away. The stored record is exactly as it was.");
    if (stored.length > 0) runCheck(stored, evidence);
  };

  return (
    <div>
      <div className="lp-chain" aria-hidden="true">
        {phase === "loading" && <p className="lp-record-caption">Loading the record…</p>}
        {shown.map((block, index) => (
          <span
            key={`${block.blockIndex}-${block.currentHash.slice(0, 8)}`}
            className="lp-chain-link"
            data-state={
              failure
                ? index === failure.brokenIndex
                  ? "broken"
                  : index > failure.brokenIndex
                    ? "critical"
                    : "ok"
                : running
                  ? checkedIndex != null && index <= checkedIndex
                    ? "ok"
                    : index === (checkedIndex ?? -1) + 1
                      ? "running"
                      : undefined
                  : check.phase === "ok"
                    ? "ok"
                    : undefined
            }
          >
            <ChainLink
              size={150}
              torn={failure != null && index === failure.brokenIndex}
              critical={failure != null && index > failure.brokenIndex}
            />
          </span>
        ))}
        {view.length > MAX_SHOWN && (
          <p className="lp-record-note">and {view.length - MAX_SHOWN} more entries</p>
        )}
      </div>

      {phase === "error" && (
        <p className="lp-record-caption" role="alert">
          We couldn&apos;t read the record. Reload the page to try again.
        </p>
      )}

      {phase !== "error" && (
        <>
          <div className="lp-hero-tamper-row" style={{ marginBottom: 16 }}>
            <TamperCheck
              state={
                check.phase === "failed"
                  ? { ...check, brokenIndex: check.brokenIndex + 1 }
                  : check
              }
              onRun={() => runCheck(view, evidence)}
            />
            {!altered ? (
              <button type="button" className="lp-btn lp-btn--outline" onClick={onTry}>
                Try changing a record
              </button>
            ) : (
              <button type="button" className="lp-linkbtn" onClick={onRestore}>
                Restore
              </button>
            )}
          </div>
          <p className="lp-record-caption">{note}</p>
        </>
      )}

      <p className="lp-record-note">
        Designed to support tamper-evident record keeping.
      </p>
    </div>
  );
}
