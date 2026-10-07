"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { ErrorDroppedLink, SpotVendor } from "@/components/illustration/scenes";
import { ExpiryStrip, type StripItem } from "@/components/register/ExpiryStrip";
import { SeverityDot, StatusDot } from "@/components/signature/SeverityDot";
import { DOC_LABELS } from "@/components/workspace/case-text";
import type { Alert, Person, Vendor } from "@/core/types";
import { STATUS_WORDS } from "@/lib/attention";
import { byExpiry, expiryStatus } from "@/lib/expiry";
import { formatDay, formatShort } from "@/lib/format";

type Phase = "loading" | "ready" | "error";

function docLabel(type: string): string {
  return DOC_LABELS[type] ?? "Vendor document";
}

/**
 * One vendor's record (DESIGN §15.2): expiry timeline, any related alert,
 * then the documents on file with their dates and status words.
 */
export default function VendorRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [phase, setPhase] = useState<Phase>("loading");
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [owner, setOwner] = useState<Person | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [asOf, setAsOf] = useState("");
  const [error, setError] = useState("");

  const load = useRef(async (vendorId: string) => {
    setPhase("loading");
    setError("");
    try {
      const [vendorsRes, peopleRes, alertsRes] = await Promise.all([
        fetch("/api/registers/vendors"),
        fetch("/api/registers/people"),
        fetch("/api/alerts"),
      ]);
      if (!vendorsRes.ok || !peopleRes.ok || !alertsRes.ok) {
        throw new Error("This record could not be loaded.");
      }
      const vendorsData = (await vendorsRes.json()) as { rows: Vendor[] };
      const peopleData = (await peopleRes.json()) as { rows: Person[] };
      const alertsData = (await alertsRes.json()) as { alerts: Alert[]; asOf: string };
      const found = vendorsData.rows.find((row) => row.id === vendorId) ?? null;
      setVendor(found);
      setOwner(found ? peopleData.rows.find((row) => row.id === found.ownerId) ?? null : null);
      setAlerts(alertsData.alerts.filter((row) => row.subject.id === vendorId));
      setAsOf(alertsData.asOf);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "This record could not be loaded.");
      setPhase("error");
    }
  });

  useEffect(() => {
    void load.current(id);
  }, [id]);

  const items: StripItem[] = vendor
    ? vendor.documents.map((doc) => {
        const state = expiryStatus(asOf, doc.expiresOn);
        return {
          label: docLabel(doc.type),
          ...(doc.expiresOn ? { date: doc.expiresOn } : {}),
          state: state.state,
        };
      })
    : [];

  const docs = vendor ? [...vendor.documents].sort((a, b) => byExpiry(asOf, a, b)) : [];
  const docsNeedAttention = docs.some((doc) => {
    const state = expiryStatus(asOf, doc.expiresOn).state;
    return state === "expired" || state === "soon";
  });

  return (
    <div className="page-case-room">
      <Link className="wb-back" href="/registers/vendors">
        Back to vendors
      </Link>

      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">{vendor?.name ?? "Vendor record"}</h1>
          <p className="page-serif-headline">
            {phase === "error"
              ? "This record could not be loaded."
              : phase === "loading"
                ? "Opening this vendor's record…"
                : !vendor
                  ? "That vendor is not on file."
                  : `${docs.length} document${docs.length === 1 ? "" : "s"} on file${
                      docsNeedAttention ? ", some need attention" : ", all in date"
                    }${alerts.length > 0 ? `, ${alerts.length} related alert${alerts.length === 1 ? "" : "s"}` : ""}.`}
          </p>
          <p className="page-note">
            {phase === "ready" && vendor
              ? [
                  vendor.tier === "critical" ? "Critical tier" : "Standard tier",
                  owner ? `Owner ${owner.name}` : "",
                  vendor.lastReviewedOn ? `Last reviewed ${formatDay(vendor.lastReviewedOn)}` : "",
                  asOf ? `Today is ${formatDay(asOf)}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Whether each vendor has the paperwork we require, read live from the register."}
          </p>
        </div>
        <div className="page-spot" aria-hidden="true">
          {phase === "error" ? (
            <ErrorDroppedLink size={96} />
          ) : (
            <SpotVendor size={96} missing={docsNeedAttention} />
          )}
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="vendors" />

      {phase === "loading" && (
        <div className="alerts-table" aria-busy="true" aria-label="Loading this record">
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

      {phase === "ready" && !vendor && (
        <div className="state-block">
          <p>That vendor is not on file.</p>
          <p>The vendor register has changed since this link was made.</p>
        </div>
      )}

      {phase === "ready" && vendor && (
        <>
          <div className="rec-strip">
            <ExpiryStrip items={items} today={asOf} name={`${vendor.name}'s documents`} />
          </div>

          <h2 className="section-label-case-room">Related alert</h2>
          {alerts.length === 0 ? (
            <p className="page-note">No alerts name this vendor right now.</p>
          ) : (
            <div className="alerts-table">
              {alerts.map((alert) => (
                <Link className="alerts-row rec-alert-row" href={`/alerts/${alert.id}`} key={alert.id}>
                  <span className="reg-name">
                    <span className="row-primary">{alert.summarySentence}</span>
                    <span className="row-secondary">
                      {alert.ruleId} · raised {formatShort(alert.createdAt)}
                    </span>
                  </span>
                  <span className="row-cell">
                    <SeverityDot severity={alert.severity} />
                  </span>
                  <span className="row-status">{STATUS_WORDS[alert.status]}</span>
                </Link>
              ))}
            </div>
          )}

          <h2 className="section-label-case-room">Documents on file</h2>
          {docs.length === 0 ? (
            <p className="page-note">Nothing on file for this vendor.</p>
          ) : (
            <div className="alerts-table">
              {docs.map((doc, index) => {
                const status = expiryStatus(asOf, doc.expiresOn);
                return (
                  <div
                    className="alerts-row rec-docs"
                    key={`${doc.type}_${doc.validFrom}_${index}`}
                  >
                    <span className="reg-name">
                      <span className="row-primary">{docLabel(doc.type)}</span>
                      <span className="row-secondary">Valid from {formatDay(doc.validFrom)}</span>
                    </span>
                    <span className="row-cell">
                      {doc.expiresOn ? `Expires ${formatDay(doc.expiresOn)}` : "No expiry date"}
                    </span>
                    <span className="row-cell">
                      <StatusDot label={status.word} tone={status.tone} />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
