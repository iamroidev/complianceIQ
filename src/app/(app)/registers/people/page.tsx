"use client";

import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { Pagination } from "@/components/workspace/Pagination";
import { SpotCertificate } from "@/components/illustration/scenes/Spots";
import { EmptySearch } from "@/components/illustration/scenes";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExpiryStrip, type StripItem } from "@/components/register/ExpiryStrip";
import { StatusDot } from "@/components/signature/SeverityDot";
import { roleHeaders, useRole } from "@/components/workspace/role-context";
import type { Certification, Person } from "@/core/types";
import { byExpiry, expiryStatus, PERSON_STATUS_WORD, riskPhrase } from "@/lib/expiry";
import { formatDay } from "@/lib/format";

type Phase = "loading" | "ready" | "error";

function nearestCert(asOf: string, certs: Certification[]): Certification | undefined {
  return [...certs].sort((a, b) => byExpiry(asOf, a, b))[0];
}

export default function PeoplePage() {
  const { role } = useRole();
  const canEdit = role === "officer" || role === "admin";

  const [phase, setPhase] = useState<Phase>("loading");
  const [people, setPeople] = useState<Person[]>([]);
  const [certs, setCerts] = useState<Certification[]>([]);
  const [asOf, setAsOf] = useState("");
  const [query, setQuery] = useState("");
  const [filterState, setFilterState] = useState<"all" | "valid" | "soon" | "expired">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");

  // Modal State for Add Person
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newDepartment, setNewDepartment] = useState("Engineering");
  const [newStatus, setNewStatus] = useState<Person["status"]>("active");

  const load = useRef(async () => {
    setPhase("loading");
    setError("");
    try {
      const [peopleRes, certsRes, alertsRes] = await Promise.all([
        fetch("/api/registers/people"),
        fetch("/api/registers/certifications"),
        fetch("/api/alerts"),
      ]);
      if (!peopleRes.ok || !certsRes.ok || !alertsRes.ok) {
        throw new Error("The register could not be loaded.");
      }
      const peopleData = (await peopleRes.json()) as { rows: Person[] };
      const certsData = (await certsRes.json()) as { rows: Certification[] };
      const alertsData = (await alertsRes.json()) as { asOf: string };
      setPeople(peopleData.rows);
      setCerts(certsData.rows);
      setAsOf(alertsData.asOf);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The register could not be loaded.");
      setPhase("error");
    }
  });

  useEffect(() => {
    void load.current();
  }, []);

  const certsByPerson = useMemo(() => {
    const map = new Map<string, Certification[]>();
    for (const cert of certs) {
      const list = map.get(cert.personId) ?? [];
      list.push(cert);
      map.set(cert.personId, list);
    }
    return map;
  }, [certs]);

  const stats = useMemo(() => {
    let valid = 0;
    let soon = 0;
    let expired = 0;
    for (const cert of certs) {
      const state = expiryStatus(asOf, cert.expiresOn).state;
      if (state === "valid") valid += 1;
      if (state === "soon") soon += 1;
      if (state === "expired") expired += 1;
    }
    return { valid, soon, expired, total: people.length };
  }, [certs, asOf, people]);

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const personCerts = certsByPerson.get(person.id) ?? [];
      const nearest = nearestCert(asOf, personCerts);
      const state = nearest ? expiryStatus(asOf, nearest.expiresOn).state : "none";

      if (filterState === "valid" && state !== "valid") return false;
      if (filterState === "soon" && state !== "soon") return false;
      if (filterState === "expired" && state !== "expired") return false;

      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return (
        person.name.toLowerCase().includes(needle) ||
        person.role.toLowerCase().includes(needle) ||
        person.department.toLowerCase().includes(needle) ||
        personCerts.some((c) => c.type.toLowerCase().includes(needle))
      );
    });
  }, [people, certsByPerson, asOf, filterState, query]);

  useEffect(() => {
    setPage(1);
  }, [query, filterState]);

  const paginatedPeople = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPeople.slice(start, start + pageSize);
  }, [filteredPeople, page, pageSize]);

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRole.trim() || isSaving) return;

    setIsSaving(true);
    setModalError("");

    const newPerson: Person = {
      id: `p_${Date.now().toString(36)}`,
      name: newName.trim(),
      role: newRole.trim(),
      department: newDepartment.trim(),
      status: newStatus,
    };

    try {
      const res = await fetch("/api/registers/people", {
        method: "PATCH",
        headers: roleHeaders(role),
        body: JSON.stringify({ upsert: [newPerson] }),
      });
      const data = (await res.json().catch(() => ({}))) as { rows?: Person[]; error?: string };
      if (!res.ok || !data.rows) throw new Error(data.error ?? "Failed to add person.");

      setPeople(data.rows);
      setIsAddModalOpen(false);
      setNewName("");
      setNewEmail("");
      setNewRole("");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to add person.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-case-room">
      <header className="page-header-block" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 className="page-serif-title">Personnel &amp; Certifications Register</h1>
          <p className="page-serif-headline">
            {certs.length} certifications tracked for {people.length} employees. {riskPhrase(stats.soon, stats.expired, { one: "certification", many: "certifications" })}
          </p>
          <p className="page-note">
            {asOf
              ? `Expiry timeline anchored against demo clock: ${formatDay(asOf)}.`
              : "Timeline reflects active credential status."}
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>+ Add Personnel</span>
          </button>
        )}
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="people" />

      {/* Visual Top Panel */}
      <section className="overview-desk-panel" style={{ marginBottom: "var(--space-5)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "var(--space-5)",
            alignItems: "center",
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <SpotCertificate size={110} hint={stats.expired > 0} />
          </div>
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "var(--space-3)",
              }}
            >
              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => setFilterState("all")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Total Personnel
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  {certs.length} credentials
                </div>
              </div>

              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => setFilterState(filterState === "expired" ? "all" : "expired")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--critical)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Expired
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--critical)", marginTop: "2px" }}>
                  {stats.expired}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Immediate renewal
                </div>
              </div>

              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => setFilterState(filterState === "soon" ? "all" : "soon")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Expiring Soon
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--warning)", marginTop: "2px" }}>
                  {stats.soon}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Within 30 days
                </div>
              </div>

              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => setFilterState(filterState === "valid" ? "all" : "valid")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--verified)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Active &amp; Valid
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--verified)", marginTop: "2px" }}>
                  {stats.valid}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", marginTop: "2px" }}>
                  Compliant
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter / Search Controls */}
      <div className="rt-toolbar" style={{ flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
        <div className="rt-search" style={{ minWidth: "240px", flex: "1" }}>
          <label htmlFor="people-search" className="sr-only">
            Search personnel
          </label>
          <input
            id="people-search"
            type="search"
            placeholder="Search by name, role, department or certification..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn ${filterState === "all" ? "btn-primary" : "btn-plain"}`}
            style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
            onClick={() => setFilterState("all")}
          >
            All Personnel
          </button>
          <button
            type="button"
            className={`btn ${filterState === "expired" ? "btn-primary" : "btn-plain"}`}
            style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
            onClick={() => setFilterState(filterState === "expired" ? "all" : "expired")}
          >
            Expired ({stats.expired})
          </button>
          <button
            type="button"
            className={`btn ${filterState === "soon" ? "btn-primary" : "btn-plain"}`}
            style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
            onClick={() => setFilterState(filterState === "soon" ? "all" : "soon")}
          >
            Expiring Soon ({stats.soon})
          </button>
          <button
            type="button"
            className={`btn ${filterState === "valid" ? "btn-primary" : "btn-plain"}`}
            style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
            onClick={() => setFilterState(filterState === "valid" ? "all" : "valid")}
          >
            Valid
          </button>
        </div>
      </div>

      {phase === "loading" && (
        <div className="alerts-table" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <div className="skeleton-row" key={index}>
              <span className="skeleton-block" />
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
          ))}
        </div>
      )}

      {phase === "error" && (
        <div className="error-block">
          <p>{error}</p>
          <button type="button" className="btn btn-plain" onClick={() => void load.current()}>
            Try again
          </button>
        </div>
      )}

      {phase === "ready" && (
        <>
          {filteredPeople.length === 0 ? (
            <div className="rt-empty" style={{ padding: "var(--space-7) 0", textAlign: "center" }}>
              <EmptySearch size={132} />
              <div className="state-block" style={{ marginTop: "var(--space-4)" }}>
                <p style={{ fontWeight: 600 }}>No personnel match that filter.</p>
                <p className="page-note">Try clearing the search query or reset status filter.</p>
                <button
                  type="button"
                  className="btn btn-plain"
                  style={{ marginTop: "var(--space-3)" }}
                  onClick={() => {
                    setQuery("");
                    setFilterState("all");
                  }}
                >
                  Clear filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="alerts-table reg-table" style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
                <div className="alerts-row alerts-head" style={{ background: "var(--surface-muted)", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600 }}>
                  <span>Person &amp; Position</span>
                  <span>Compliance Status</span>
                  <span>Timeline Expiry Visual</span>
                </div>
                {paginatedPeople.map((person) => {
                  const personCerts = certsByPerson.get(person.id) ?? [];
                  const nearest = nearestCert(asOf, personCerts);
                  const status = nearest
                    ? expiryStatus(asOf, nearest.expiresOn)
                    : { state: "none" as const, word: "No certifications", tone: "neutral" as const };
                  const extra = PERSON_STATUS_WORD[person.status];
                  const items: StripItem[] = personCerts.map((cert) => {
                    const state = expiryStatus(asOf, cert.expiresOn);
                    return {
                      label: `${cert.type} certification`,
                      ...(cert.expiresOn ? { date: cert.expiresOn } : {}),
                      state: state.state,
                    };
                  });
                  return (
                    <Link
                      className="alerts-row reg-row"
                      href={`/registers/people/${person.id}`}
                      key={person.id}
                      style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.15s ease" }}
                    >
                      <span className="reg-name" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span className="row-primary" style={{ fontWeight: 500, color: "var(--text-1)" }}>{person.name}</span>
                        <span className="row-secondary" style={{ color: "var(--text-3)", fontSize: "var(--font-xs)" }}>
                          {person.role} · {person.department}
                          {extra ? ` · ${extra}` : ""}
                        </span>
                      </span>
                      <span className="reg-status">
                        <StatusDot label={status.word} tone={status.tone} />
                        <span className="row-secondary" style={{ fontSize: "var(--font-xs)", marginTop: "2px" }}>
                          {nearest
                            ? `${nearest.type} · ${
                                nearest.expiresOn ? formatDay(nearest.expiresOn) : "no expiry date"
                              }`
                            : "Nothing on file"}
                        </span>
                      </span>
                      <span className="reg-strip">
                        <ExpiryStrip items={items} today={asOf} name={person.name} />
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              <Pagination
                page={page}
                pageSize={pageSize}
                total={filteredPeople.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                sizes={[10, 20, 50]}
              />
            </>
          )}
        </>
      )}

      {/* Add Person Modal */}
      {isAddModalOpen && (
        <div className="rs-backdrop" role="presentation" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="rs-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-person-title"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: "480px" }}
          >
            <h2 id="add-person-title" className="rs-dialog-title">
              Add Personnel to Register
            </h2>
            <p className="rs-dialog-body">
              Add an employee or contractor to track required compliance credentials and access controls.
            </p>

            {modalError && <p className="error-inline" style={{ marginBottom: "var(--space-3)" }}>{modalError}</p>}

            <form onSubmit={handleAddPerson} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                <span style={{ fontWeight: 500 }}>Full Name *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwaku Mensah"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                <span style={{ fontWeight: 500 }}>Email Address</span>
                <input
                  type="email"
                  placeholder="e.g. kwaku.mensah@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                  <span style={{ fontWeight: 500 }}>Role / Title *</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DevOps Engineer"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                  <span style={{ fontWeight: 500 }}>Department</span>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Legal">Legal</option>
                    <option value="Security">Security</option>
                  </select>
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                <span style={{ fontWeight: 500 }}>Employment Status</span>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as Person["status"])}
                  style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                >
                  <option value="active">Active</option>
                  <option value="leave">On Leave</option>
                  <option value="terminated">Terminated</option>
                </select>
              </label>

              <div className="rs-dialog-actions" style={{ marginTop: "var(--space-3)" }}>
                <button
                  type="button"
                  className="btn btn-plain"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving || !newName.trim() || !newRole.trim()}
                >
                  {isSaving ? "Saving..." : "Add to Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
