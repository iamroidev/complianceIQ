"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { ErrorDroppedLink, SpotCertificate } from "@/components/illustration/scenes";
import { ExpiryStrip, type StripItem } from "@/components/register/ExpiryStrip";
import { SeverityDot, StatusDot } from "@/components/signature/SeverityDot";
import { roleHeaders, useRole } from "@/components/workspace/role-context";
import type { Account, Alert, Certification, Person } from "@/core/types";
import { STATUS_WORDS } from "@/lib/attention";
import { byExpiry, expiryStatus, PERSON_STATUS_WORD } from "@/lib/expiry";
import { formatDay, formatShort } from "@/lib/format";

type Phase = "loading" | "ready" | "error";

export default function PersonRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { role } = useRole();
  const canEdit = role === "officer" || role === "admin";

  const [phase, setPhase] = useState<Phase>("loading");
  const [person, setPerson] = useState<Person | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [certs, setCerts] = useState<Certification[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [asOf, setAsOf] = useState("");
  const [error, setError] = useState("");

  // Modal state for Add / Renew Certification
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isSavingCert, setIsSavingCert] = useState(false);
  const [certModalError, setCertModalError] = useState("");
  const [certType, setCertType] = useState("Security Awareness Training");
  const [certIssuer, setCertIssuer] = useState("Internal Compliance Academy");
  const [certIssuedOn, setCertIssuedOn] = useState("2026-03-01");
  const [certExpiresOn, setCertExpiresOn] = useState("2027-03-01");

  const load = useRef(async (personId: string) => {
    setPhase("loading");
    setError("");
    try {
      const [peopleRes, certsRes, accountsRes, alertsRes] = await Promise.all([
        fetch("/api/registers/people"),
        fetch("/api/registers/certifications"),
        fetch("/api/registers/accounts"),
        fetch("/api/alerts"),
      ]);
      if (!peopleRes.ok || !certsRes.ok || !accountsRes.ok || !alertsRes.ok) {
        throw new Error("This record could not be loaded.");
      }
      const peopleData = (await peopleRes.json()) as { rows: Person[] };
      const certsData = (await certsRes.json()) as { rows: Certification[] };
      const accountsData = (await accountsRes.json()) as { rows: Account[] };
      const alertsData = (await alertsRes.json()) as { alerts: Alert[]; asOf: string };
      setPeople(peopleData.rows);
      setPerson(peopleData.rows.find((row) => row.id === personId) ?? null);
      setCerts(certsData.rows.filter((row) => row.personId === personId));
      setAccounts(accountsData.rows.filter((row) => row.personId === personId));
      setAlerts(alertsData.alerts.filter((row) => row.subject.id === personId));
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

  const manager = person?.managerId
    ? people.find((row) => row.id === person.managerId)
    : undefined;
  const items: StripItem[] = certs.map((cert) => {
    const state = expiryStatus(asOf, cert.expiresOn);
    return {
      label: `${cert.type} certification`,
      ...(cert.expiresOn ? { date: cert.expiresOn } : {}),
      state: state.state,
    };
  });

  const personName = person?.name ?? "Person record";

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certType.trim() || isSavingCert) return;

    setIsSavingCert(true);
    setCertModalError("");

    const newCert: Certification = {
      id: `cert_${Date.now().toString(36)}`,
      personId: id,
      type: certType.trim(),
      issuer: certIssuer.trim() || undefined,
      issuedOn: certIssuedOn || asOf.slice(0, 10),
      expiresOn: certExpiresOn || undefined,
    };

    try {
      const res = await fetch("/api/registers/certifications", {
        method: "PATCH",
        headers: roleHeaders(role),
        body: JSON.stringify({ upsert: [newCert] }),
      });
      const data = (await res.json().catch(() => ({}))) as { rows?: Certification[]; error?: string };
      if (!res.ok || !data.rows) throw new Error(data.error ?? "Failed to log certification.");

      setCerts(data.rows.filter((r) => r.personId === id));
      setIsCertModalOpen(false);
    } catch (err) {
      setCertModalError(err instanceof Error ? err.message : "Failed to log certification.");
    } finally {
      setIsSavingCert(false);
    }
  };

  return (
    <div className="page-case-room">
      <Link className="wb-back" href="/registers/people">
        &larr; Back to people and certifications
      </Link>

      <header className="page-header-block" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 className="page-serif-title">{personName}</h1>
          <p className="page-serif-headline">
            {phase === "error"
              ? "This record could not be loaded."
              : phase === "loading"
                ? "Opening this person's record…"
                : !person
                  ? "That person is not on file."
                  : `${certs.length} certification${certs.length === 1 ? "" : "s"} on file${
                      alerts.length > 0
                        ? `, ${alerts.length} related alert${alerts.length === 1 ? "" : "s"}`
                        : ", no related alerts"
                    }.`}
          </p>
          <p className="page-note">
            {phase === "ready" && person
              ? [
                  person.role,
                  person.department,
                  PERSON_STATUS_WORD[person.status] ?? "",
                  manager ? `Reports to ${manager.name}` : "",
                  asOf ? `Today is ${formatDay(asOf)}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Who is qualified for their role today, read live from the people register."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {canEdit && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsCertModalOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <span>+ Log Certification</span>
            </button>
          )}
          <div className="page-spot" aria-hidden="true">
            {phase === "error" ? <ErrorDroppedLink size={96} /> : <SpotCertificate size={96} />}
          </div>
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="people" />

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
          <button
            type="button"
            className="btn btn-plain"
            onClick={() => void load.current(id)}
          >
            Try again
          </button>
        </div>
      )}

      {phase === "ready" && !person && (
        <div className="state-block">
          <p>That person is not on file.</p>
          <p>The people register has changed since this link was made.</p>
        </div>
      )}

      {phase === "ready" && person && (
        <>
          <div className="rec-strip">
            <ExpiryStrip items={items} today={asOf} name={`${person.name}'s certifications`} />
          </div>

          <h2 className="section-label-case-room">Related alert</h2>
          {alerts.length === 0 ? (
            <p className="page-note">No alerts name this person right now.</p>
          ) : (
            <div className="alerts-table" style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
              {alerts.map((alert) => (
                <Link className="alerts-row rec-alert-row" href={`/alerts/${alert.id}`} key={alert.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <span className="reg-name">
                    <span className="row-primary" style={{ fontWeight: 500, color: "var(--text-1)" }}>{alert.summarySentence}</span>
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

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-5)", marginBottom: "var(--space-2)" }}>
            <h2 className="section-label-case-room" style={{ margin: 0 }}>Certification history</h2>
            {canEdit && (
              <button
                type="button"
                className="btn btn-plain"
                style={{ fontSize: "var(--font-xs)", padding: "2px 8px" }}
                onClick={() => setIsCertModalOpen(true)}
              >
                + Add / Renew
              </button>
            )}
          </div>

          {certs.length === 0 ? (
            <p className="page-note">Nothing on file for this person.</p>
          ) : (
            <div className="alerts-table" style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
              {[...certs].sort((a, b) => byExpiry(asOf, a, b)).map((cert) => {
                const status = expiryStatus(asOf, cert.expiresOn);
                return (
                  <div className="alerts-row rec-certs" key={cert.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <span className="reg-name">
                      <span className="row-primary" style={{ fontWeight: 500, color: "var(--text-1)" }}>{cert.type}</span>
                      <span className="row-secondary">{cert.issuer ?? "Issuer not recorded"}</span>
                    </span>
                    <span className="row-cell" style={{ fontSize: "var(--font-sm)", color: "var(--text-2)" }}>Issued {formatDay(cert.issuedOn)}</span>
                    <span className="row-cell" style={{ fontSize: "var(--font-sm)", color: "var(--text-2)" }}>
                      {cert.expiresOn ? `Expires ${formatDay(cert.expiresOn)}` : "No expiry date"}
                    </span>
                    <span className="row-cell">
                      <StatusDot label={status.word} tone={status.tone} />
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {accounts.length > 0 && (
            <>
              <h2 className="section-label-case-room" style={{ marginTop: "var(--space-5)" }}>System Accounts &amp; Access</h2>
              <div className="alerts-table" style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
                {accounts.map((account) => (
                  <div className="alerts-row rec-accounts" key={account.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <span className="reg-name">
                      <span className="row-primary" style={{ fontWeight: 500, color: "var(--text-1)" }}>{account.system}</span>
                      <span className="row-secondary">
                        {account.privileged ? "Privileged admin access" : "Standard access"}
                      </span>
                    </span>
                    <span className="row-cell">
                      <StatusDot
                        label={account.mfaEnabled ? "MFA Enabled" : "MFA Disabled"}
                        tone={account.mfaEnabled ? "verified" : "attention"}
                      />
                    </span>
                    <span className="row-cell" style={{ fontSize: "var(--font-sm)", color: "var(--text-3)" }}>Last active {formatDay(account.lastActiveOn)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Log Certification Modal */}
      {isCertModalOpen && (
        <div className="rs-backdrop" role="presentation" onClick={() => setIsCertModalOpen(false)}>
          <div
            className="rs-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-cert-title"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: "460px" }}
          >
            <h2 id="log-cert-title" className="rs-dialog-title">
              Log / Renew Certification
            </h2>
            <p className="rs-dialog-body">
              Record a completed credential or security training for <strong>{personName}</strong>.
            </p>

            {certModalError && <p className="error-inline" style={{ marginBottom: "var(--space-3)" }}>{certModalError}</p>}

            <form onSubmit={handleAddCert} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                <span style={{ fontWeight: 500 }}>Certification Title *</span>
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value)}
                  style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                >
                  <option value="Security Awareness Training">Security Awareness Training</option>
                  <option value="Anti-Money Laundering (AML)">Anti-Money Laundering (AML)</option>
                  <option value="HIPAA Security & Privacy">HIPAA Security & Privacy</option>
                  <option value="First Aid / Health & Safety">First Aid / Health & Safety</option>
                  <option value="GDPR / Data Protection">GDPR / Data Protection</option>
                  <option value="SOC 2 Internal Controls">SOC 2 Internal Controls</option>
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                <span style={{ fontWeight: 500 }}>Issuing Body / Provider</span>
                <input
                  type="text"
                  placeholder="e.g. KnowBe4 / Internal Compliance Academy"
                  value={certIssuer}
                  onChange={(e) => setCertIssuer(e.target.value)}
                  style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                  <span style={{ fontWeight: 500 }}>Issued Date</span>
                  <input
                    type="date"
                    value={certIssuedOn}
                    onChange={(e) => setCertIssuedOn(e.target.value)}
                    style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                  <span style={{ fontWeight: 500 }}>Expires On</span>
                  <input
                    type="date"
                    value={certExpiresOn}
                    onChange={(e) => setCertExpiresOn(e.target.value)}
                    style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                  />
                </label>
              </div>

              <div className="rs-dialog-actions" style={{ marginTop: "var(--space-3)" }}>
                <button
                  type="button"
                  className="btn btn-plain"
                  onClick={() => setIsCertModalOpen(false)}
                  disabled={isSavingCert}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingCert || !certType.trim()}
                >
                  {isSavingCert ? "Saving..." : "Record Certification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
