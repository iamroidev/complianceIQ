"use client";

import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";
import { Pagination } from "@/components/workspace/Pagination";
import { SpotVendor } from "@/components/illustration/scenes/Spots";
import { EmptySearch } from "@/components/illustration/scenes";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExpiryStrip, type StripItem } from "@/components/register/ExpiryStrip";
import { StatusDot } from "@/components/signature/SeverityDot";
import { roleHeaders, useRole } from "@/components/workspace/role-context";
import type { Alert, Person, Vendor } from "@/core/types";
import { byExpiry, expiryStatus, riskPhrase } from "@/lib/expiry";
import { formatDay } from "@/lib/format";

type Phase = "loading" | "ready" | "error";

interface DatedDoc {
  type: string;
  expiresOn?: string;
}

function docsOf(vendor: Vendor): DatedDoc[] {
  return vendor.documents.map((doc) => ({
    type: doc.type,
    ...(doc.expiresOn ? { expiresOn: doc.expiresOn } : {}),
  }));
}

export default function VendorsPage() {
  const { role } = useRole();
  const canEdit = role === "officer" || role === "admin";

  const [phase, setPhase] = useState<Phase>("loading");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [asOf, setAsOf] = useState("");
  const [query, setQuery] = useState("");
  const [filterTier, setFilterTier] = useState<"all" | "critical" | "expired" | "soon">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");

  // Modal State for Onboard Vendor
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [newName, setNewName] = useState("");
  const [newTier, setNewTier] = useState<Vendor["tier"]>("standard");
  const [newOwnerId, setNewOwnerId] = useState("");
  const [newDocType, setNewDocType] = useState("SOC 2 Type II");
  const [newDocExpiry, setNewDocExpiry] = useState("2026-12-31");

  const load = useRef(async () => {
    setPhase("loading");
    setError("");
    try {
      const [vendorsRes, peopleRes, alertsRes] = await Promise.all([
        fetch("/api/registers/vendors"),
        fetch("/api/registers/people"),
        fetch("/api/alerts"),
      ]);
      if (!vendorsRes.ok || !peopleRes.ok || !alertsRes.ok) {
        throw new Error("The vendor register could not be loaded.");
      }
      const vendorsData = (await vendorsRes.json()) as { rows: Vendor[] };
      const peopleData = (await peopleRes.json()) as { rows: Person[] };
      const alertsData = (await alertsRes.json()) as { alerts: Alert[]; asOf: string };
      setVendors(vendorsData.rows);
      setPeople(peopleData.rows);
      if (peopleData.rows.length > 0) setNewOwnerId(peopleData.rows[0].id);
      setAsOf(alertsData.asOf);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The vendor register could not be loaded.");
      setPhase("error");
    }
  });

  useEffect(() => {
    void load.current();
  }, []);

  const docCounts = useMemo(() => {
    let total = 0;
    let soon = 0;
    let expired = 0;
    for (const vendor of vendors) {
      for (const doc of docsOf(vendor)) {
        if (!doc.expiresOn) continue;
        total += 1;
        const state = expiryStatus(asOf, doc.expiresOn).state;
        if (state === "soon") soon += 1;
        if (state === "expired") expired += 1;
      }
    }
    const criticalTier = vendors.filter((v) => v.tier === "critical").length;
    return { dated: total, soon, expired, criticalTier };
  }, [vendors, asOf]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const docs = docsOf(vendor).filter((doc) => doc.expiresOn);
      const nearest = [...docs].sort((a, b) => byExpiry(asOf, a, b))[0];
      const statusState = nearest ? expiryStatus(asOf, nearest.expiresOn).state : "none";

      if (filterTier === "critical" && vendor.tier !== "critical") return false;
      if (filterTier === "expired" && statusState !== "expired") return false;
      if (filterTier === "soon" && statusState !== "soon") return false;

      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      const owner = people.find((row) => row.id === vendor.ownerId);
      return (
        vendor.name.toLowerCase().includes(needle) ||
        vendor.tier.toLowerCase().includes(needle) ||
        (owner && owner.name.toLowerCase().includes(needle)) ||
        vendor.documents.some((d) => d.type.toLowerCase().includes(needle))
      );
    });
  }, [vendors, people, asOf, filterTier, query]);

  useEffect(() => {
    setPage(1);
  }, [query, filterTier]);

  const paginatedVendors = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVendors.slice(start, start + pageSize);
  }, [filteredVendors, page, pageSize]);

  const handleOnboardVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isSaving) return;

    setIsSaving(true);
    setModalError("");

    const defaultOwner = newOwnerId || (people[0]?.id ?? "p_kwame");
    const docTypeFormatted = (newDocType.toLowerCase().includes("soc2")
      ? "soc2_report"
      : newDocType.toLowerCase().includes("dpa")
        ? "dpa"
        : newDocType.toLowerCase().includes("insurance")
          ? "insurance"
          : "contract") as "soc2_report" | "dpa" | "insurance" | "pen_test" | "contract";

    const newVendor: Vendor = {
      id: `v_${Date.now().toString(36)}`,
      name: newName.trim(),
      tier: newTier,
      ownerId: defaultOwner,
      documents: [
        {
          type: docTypeFormatted,
          validFrom: (asOf || "2026-01-01").slice(0, 10),
          expiresOn: newDocExpiry || undefined,
        },
      ],
    };

    try {
      const res = await fetch("/api/registers/vendors", {
        method: "PATCH",
        headers: roleHeaders(role),
        body: JSON.stringify({ upsert: [newVendor] }),
      });
      const data = (await res.json().catch(() => ({}))) as { rows?: Vendor[]; error?: string };
      if (!res.ok || !data.rows) throw new Error(data.error ?? "Failed to onboard vendor.");

      setVendors(data.rows);
      setIsOnboardModalOpen(false);
      setNewName("");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to onboard vendor.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-case-room">
      <header className="page-header-block" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 className="page-serif-title">Third-Party Vendor Register</h1>
          <p className="page-serif-headline">
            {vendors.length} vendors tracked, {docCounts.dated} dated security attestations on file. {riskPhrase(docCounts.soon, docCounts.expired, { one: "document", many: "documents" })}
          </p>
          <p className="page-note">
            {asOf
              ? `Compliance and SOC2 expiries tracked against demo clock: ${formatDay(asOf)}.`
              : "Timeline reflects active vendor assessment dates."}
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsOnboardModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>+ Onboard Vendor</span>
          </button>
        )}
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="vendors" />

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
            <SpotVendor size={110} missing={docCounts.expired > 0} />
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
                onClick={() => setFilterTier("all")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Total Vendors
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {vendors.length}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  {docCounts.dated} attestations
                </div>
              </div>

              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => setFilterTier(filterTier === "critical" ? "all" : "critical")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--brand-accent, var(--text-1))", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Critical Tier
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--text-1)", marginTop: "2px" }}>
                  {docCounts.criticalTier}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Direct data access
                </div>
              </div>

              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => setFilterTier(filterTier === "expired" ? "all" : "expired")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--critical)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Expired Docs
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--critical)", marginTop: "2px" }}>
                  {docCounts.expired}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-2)", marginTop: "2px" }}>
                  Requires remediation
                </div>
              </div>

              <div
                className="desk-item"
                style={{ padding: "var(--space-3)", background: "var(--surface)", cursor: "pointer" }}
                onClick={() => setFilterTier(filterTier === "soon" ? "all" : "soon")}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Expiring Soon
                </div>
                <div style={{ fontSize: "var(--font-2xl)", fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--warning)", marginTop: "2px" }}>
                  {docCounts.soon}
                </div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-3)", marginTop: "2px" }}>
                  Within 30 days
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter / Search Controls */}
      <div className="rt-toolbar" style={{ flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
        <div className="rt-search" style={{ minWidth: "240px", flex: "1" }}>
          <label htmlFor="vendor-search" className="sr-only">
            Search vendors
          </label>
          <input
            id="vendor-search"
            type="search"
            placeholder="Search by vendor name, tier, owner or document type..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn ${filterTier === "all" ? "btn-primary" : "btn-plain"}`}
            style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
            onClick={() => setFilterTier("all")}
          >
            All Vendors
          </button>
          <button
            type="button"
            className={`btn ${filterTier === "critical" ? "btn-primary" : "btn-plain"}`}
            style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
            onClick={() => setFilterTier(filterTier === "critical" ? "all" : "critical")}
          >
            Critical Tier ({docCounts.criticalTier})
          </button>
          <button
            type="button"
            className={`btn ${filterTier === "expired" ? "btn-primary" : "btn-plain"}`}
            style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
            onClick={() => setFilterTier(filterTier === "expired" ? "all" : "expired")}
          >
            Expired ({docCounts.expired})
          </button>
          <button
            type="button"
            className={`btn ${filterTier === "soon" ? "btn-primary" : "btn-plain"}`}
            style={{ fontSize: "var(--font-xs)", padding: "4px 10px" }}
            onClick={() => setFilterTier(filterTier === "soon" ? "all" : "soon")}
          >
            Expiring ({docCounts.soon})
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
          {filteredVendors.length === 0 ? (
            <div className="rt-empty" style={{ padding: "var(--space-7) 0", textAlign: "center" }}>
              <EmptySearch size={132} />
              <div className="state-block" style={{ marginTop: "var(--space-4)" }}>
                <p style={{ fontWeight: 600 }}>No vendors match that filter.</p>
                <p className="page-note">Try clearing the search query or switching tier filter.</p>
                <button
                  type="button"
                  className="btn btn-plain"
                  style={{ marginTop: "var(--space-3)" }}
                  onClick={() => {
                    setQuery("");
                    setFilterTier("all");
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
                  <span>Vendor &amp; Tier</span>
                  <span>Compliance Status</span>
                  <span>Timeline Expiry Visual</span>
                </div>
                {paginatedVendors.map((vendor) => {
                  const docs = docsOf(vendor).filter((doc) => doc.expiresOn);
                  const nearest = [...docs].sort((a, b) => byExpiry(asOf, a, b))[0];
                  const status = nearest
                    ? expiryStatus(asOf, nearest.expiresOn)
                    : { state: "none" as const, word: "No dated documents", tone: "neutral" as const };
                  const owner = people.find((row) => row.id === vendor.ownerId);
                  const items: StripItem[] = vendor.documents.map((doc) => {
                    const state = expiryStatus(asOf, doc.expiresOn);
                    return {
                      label: doc.type,
                      ...(doc.expiresOn ? { date: doc.expiresOn } : {}),
                      state: state.state,
                    };
                  });
                  return (
                    <Link
                      className="alerts-row reg-row"
                      href={`/registers/vendors/${vendor.id}`}
                      key={vendor.id}
                      style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.15s ease" }}
                    >
                      <span className="reg-name" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span className="row-primary" style={{ fontWeight: 500, color: "var(--text-1)" }}>{vendor.name}</span>
                        <span className="row-secondary" style={{ color: "var(--text-3)", fontSize: "var(--font-xs)" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "1px 6px",
                            borderRadius: "3px",
                            background: vendor.tier === "critical" ? "var(--surface-sunken)" : "transparent",
                            fontWeight: vendor.tier === "critical" ? 600 : 400,
                            color: vendor.tier === "critical" ? "var(--critical)" : "inherit",
                          }}>
                            {vendor.tier === "critical" ? "Critical Tier" : "Standard Tier"}
                          </span>
                          {owner ? ` · Owner ${owner.name}` : ""}
                        </span>
                      </span>
                      <span className="reg-status">
                        <StatusDot label={status.word} tone={status.tone} />
                        <span className="row-secondary" style={{ fontSize: "var(--font-xs)", marginTop: "2px" }}>
                          {nearest && nearest.expiresOn
                            ? `${nearest.type} · ${formatDay(nearest.expiresOn)}`
                            : `${vendor.documents.length} documents on file`}
                        </span>
                      </span>
                      <span className="reg-strip">
                        <ExpiryStrip items={items} today={asOf} name={vendor.name} />
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              <Pagination
                page={page}
                pageSize={pageSize}
                total={filteredVendors.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                sizes={[10, 20, 50]}
              />
            </>
          )}
        </>
      )}

      {/* Onboard Vendor Modal */}
      {isOnboardModalOpen && (
        <div className="rs-backdrop" role="presentation" onClick={() => setIsOnboardModalOpen(false)}>
          <div
            className="rs-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboard-vendor-title"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: "480px" }}
          >
            <h2 id="onboard-vendor-title" className="rs-dialog-title">
              Onboard Vendor / Third Party
            </h2>
            <p className="rs-dialog-body">
              Register a third-party vendor to track risk tiers, assigned business owners, and required compliance attestations.
            </p>

            {modalError && <p className="error-inline" style={{ marginBottom: "var(--space-3)" }}>{modalError}</p>}

            <form onSubmit={handleOnboardVendor} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                <span style={{ fontWeight: 500 }}>Vendor / Organization Name *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Cloud Infrastructure"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                  <span style={{ fontWeight: 500 }}>Risk Tier *</span>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as Vendor["tier"])}
                    style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                  >
                    <option value="standard">Standard Tier</option>
                    <option value="critical">Critical (Direct Data Access)</option>
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-sm)" }}>
                  <span style={{ fontWeight: 500 }}>Internal Owner</span>
                  <select
                    value={newOwnerId}
                    onChange={(e) => setNewOwnerId(e.target.value)}
                    style={{ padding: "8px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                  >
                    <option value="">(None assigned)</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ background: "var(--surface-sunken)", padding: "var(--space-3)", borderRadius: "var(--radius-sm)", marginTop: "var(--space-2)" }}>
                <span style={{ fontSize: "var(--font-xs)", fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase" }}>Primary Security Attestation</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-xs)" }}>
                    <span>Document Type</span>
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value)}
                      style={{ padding: "6px 8px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                    >
                      <option value="SOC 2 Type II">SOC 2 Type II</option>
                      <option value="ISO 27001">ISO 27001</option>
                      <option value="DPA">Data Processing Agreement (DPA)</option>
                      <option value="Insurance">Certificate of Insurance</option>
                    </select>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-xs)" }}>
                    <span>Attestation Expiry Date</span>
                    <input
                      type="date"
                      value={newDocExpiry}
                      onChange={(e) => setNewDocExpiry(e.target.value)}
                      style={{ padding: "6px 8px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                    />
                  </label>
                </div>
              </div>

              <div className="rs-dialog-actions" style={{ marginTop: "var(--space-3)" }}>
                <button
                  type="button"
                  className="btn btn-plain"
                  onClick={() => setIsOnboardModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving || !newName.trim()}
                >
                  {isSaving ? "Onboarding..." : "Onboard Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
