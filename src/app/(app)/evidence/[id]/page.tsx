"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import {
  EmptyEvidence,
  ErrorDroppedLink,
  RecordsVerified,
  TamperDetected,
} from "@/components/illustration/scenes";
import { StatusDot } from "@/components/signature/SeverityDot";
import type { EvidenceItem } from "@/core/types";
import { EVIDENCE_KIND_LABELS } from "@/lib/evidence";
import { formatShort } from "@/lib/format";

type Phase = "loading" | "ready" | "error";

interface Verification {
  payloadMatches: boolean;
  rederivedHash: string | null;
  rederivedMatches: boolean | null;
  ledgerBlockIndex: number;
}

interface DetailResponse {
  evidence: EvidenceItem;
  verification: Verification;
}

/**
 * One evidence record (MASTER §7.5): what it is, when it was collected,
 * whether the stored hash matches the audit record, a fresh re-hash of the
 * content, and the hashes themselves — this page is the technical detail.
 */
export default function EvidenceRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [phase, setPhase] = useState<Phase>("loading");
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [error, setError] = useState("");

  const load = useRef(async (evidenceId: string) => {
    setPhase("loading");
    setError("");
    try {
      const response = await fetch(`/api/evidence/${evidenceId}`);
      const data = (await response.json().catch(() => ({}))) as Partial<DetailResponse> & {
        error?: string;
      };
      if (!response.ok || !data.evidence || !data.verification) {
        throw new Error(data.error ?? "This evidence record could not be loaded.");
      }
      setDetail(data as DetailResponse);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "This evidence record could not be loaded.");
      setPhase("error");
    }
  });

  useEffect(() => {
    void load.current(id);
  }, [id]);

  const evidence = detail?.evidence;
  const verification = detail?.verification;
  const verified = verification
    ? verification.payloadMatches && verification.rederivedMatches !== false
    : false;

  return (
    <div className="page-case-room">
      <Link className="wb-back" href="/evidence">
        Back to evidence
      </Link>

      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">
            {phase === "ready" && evidence ? evidence.title : "Evidence record"}
          </h1>
          <p className="page-serif-headline">
            {phase === "error"
              ? "This evidence record could not be loaded."
              : phase === "loading"
                ? "Opening the evidence record…"
                : verification
                  ? verified
                    ? `Verified against audit record entry ${verification.ledgerBlockIndex}.`
                    : "This record does not verify against the audit record."
                  : ""}
          </p>
          <p className="page-note">
            {phase === "ready" && evidence && verification
              ? `${EVIDENCE_KIND_LABELS[evidence.kind]} · ${evidence.source} · Collected ${formatShort(evidence.collectedAt)} · Entry ${verification.ledgerBlockIndex}`
              : "Evidence keeps the hash taken at the moment it was collected, so it can be rechecked later."}
          </p>
        </div>
        <div className="page-spot" aria-hidden="true">
          {phase === "error" ? (
            <ErrorDroppedLink size={96} />
          ) : verification ? (
            verified ? (
              <RecordsVerified size={96} />
            ) : (
              <TamperDetected size={96} />
            )
          ) : (
            <EmptyEvidence size={96} />
          )}
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="evidence" />

      {phase === "loading" && (
        <div className="alerts-table" aria-busy="true" aria-label="Loading the evidence record">
          {[0, 1, 2].map((index) => (
            <div className="skeleton-row" key={index}>
              <span className="skeleton-block" />
              <span className="skeleton-block" />
              <span className="skeleton-block hide-sm" />
            </div>
          ))}
        </div>
      )}

      {phase === "error" && (
        <div className="error-block">
          <p>{error}</p>
          <button type="button" className="btn btn-plain" onClick={() => void load.current(id)}>
            Try again
          </button>
        </div>
      )}

      {phase === "ready" && evidence && verification && (
        <>
          <div className="ev-verify">
            <StatusDot
              label={verified ? "Verified" : "Failed verification"}
              tone={verified ? "verified" : "critical"}
            />
            <p>
              {verification.payloadMatches
                ? "The stored hash matches the audit record entry."
                : "The stored hash does not match the audit record entry."}
            </p>
            <p>
              {verification.rederivedMatches === null
                ? "The content itself is not stored with this item, so only the audit record entry was rechecked."
                : verification.rederivedMatches
                  ? "A fresh hash of the content matches the stored hash."
                  : "A fresh hash of the content does not match the stored hash."}
            </p>
          </div>

          <div className="detail-action-row">
            <h2 className="section-label-case-room">Technical details</h2>
            <span className="toolbar-spacer" />
            <Link className="btn btn-navy" href="/audit-record">
              Open the audit record
            </Link>
          </div>
          <div className="ev-tech">
            <div className="ev-tech-row">
              <span className="ev-tech-label">Stored hash (sha256)</span>
              <code className="ev-hash">{evidence.contentHash}</code>
            </div>
            {verification.rederivedHash && (
              <div className="ev-tech-row">
                <span className="ev-tech-label">Fresh hash of the content</span>
                <code className="ev-hash">{verification.rederivedHash}</code>
              </div>
            )}
            <div className="ev-tech-row">
              <span className="ev-tech-label">Audit record entry</span>
              <span className="row-cell">Entry {verification.ledgerBlockIndex}</span>
            </div>
            <div className="ev-tech-row">
              <span className="ev-tech-label">Evidence id</span>
              <code className="ev-hash">{evidence.id}</code>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
