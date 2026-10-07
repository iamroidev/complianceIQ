"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DOMAIN_LABELS,
  NAV_GROUPS,
  PAGE_TITLES,
} from "./nav";
import { DemoProvider, useDemo } from "./demo-context";
import { DemoPanel } from "./DemoPanel";
import { RoleProvider, useRole, ROLE_NAMES, type Role } from "./role-context";
import { Presentation, ShieldCheck, AlertTriangle, Compass, Settings } from "lucide-react";
import { UrgencyBanner, TopbarNextDeadlineChip } from "./UrgencyBanner";
import { GuidedTour } from "./GuidedTour";
import { CommandPalette } from "./CommandPalette";
import { OnboardingRibbon } from "./OnboardingRibbon";
import { ComplianceLogo } from "@/components/brand/ComplianceLogo";

/* ------------------------------------------------------------------ */
/* Alert list filters (domain + search) live in the shell so the top   */
/* bar can own them and screens keep their own state between routes.   */
/* ------------------------------------------------------------------ */

interface AlertFilters {
  /** null = every domain. */
  domain: string | null;
  q: string;
  /** Domains actually present in the data, registered by the Alerts page. */
  domains: string[];
  searchRef: React.RefObject<HTMLInputElement | null>;
  setDomain: (domain: string | null) => void;
  setQ: (q: string) => void;
  setDomains: (domains: string[]) => void;
  openShortcuts: () => void;
}

const AlertFiltersContext = createContext<AlertFilters | null>(null);

export function useAlertFilters(): AlertFilters {
  const value = useContext(AlertFiltersContext);
  if (!value) throw new Error("useAlertFilters must be used inside <Shell>");
  return value;
}

/* ------------------------------------------------------------------ */

type RecordsState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; checked: number }
  | { kind: "altered"; brokenIndex: number; later: number }
  | { kind: "error" };

function RecordsCheck() {
  const [state, setState] = useState<RecordsState>({ kind: "idle" });

  const check = useCallback(async () => {
    setState({ kind: "checking" });
    try {
      const response = await fetch("/api/ledger/verify");
      if (!response.ok) throw new Error("verify failed");
      const data = (await response.json()) as {
        ok: boolean;
        chain: { ok: boolean; checked?: number; firstBrokenIndex?: number };
      };
      if (data.ok) {
        setState({ kind: "ok", checked: data.chain.checked ?? 0 });
        return;
      }
      const brokenIndex = data.chain.firstBrokenIndex ?? 0;
      let later = 0;
      try {
        const ledger = await fetch("/api/ledger");
        if (ledger.ok) {
          const ledgerData = (await ledger.json()) as { count: number };
          later = Math.max(ledgerData.count - brokenIndex - 1, 0);
        }
      } catch {
        // The broken index alone still tells the truth; the count is a bonus.
      }
      setState({ kind: "altered", brokenIndex, later });
    } catch {
      setState({ kind: "error" });
    }
  }, []);

  const checking = state.kind === "checking";
  const altered = state.kind === "altered";
  const error = state.kind === "error";

  const text =
    state.kind === "checking"
      ? "Checking records…"
      : state.kind === "ok"
        ? `All ${state.checked.toLocaleString("en-US")} entries verified`
        : altered
          ? `Entry ${state.brokenIndex} was altered.` +
            (state.later > 0 ? ` ${state.later} later entries can no longer be trusted.` : "")
          : error
            ? "Could not run check. Try again."
            : "Records verified";

  return (
    <span
      className={`records-check${altered ? " is-altered" : error ? " is-error" : ""}`}
      role="status"
    >
      {altered ? (
        <AlertTriangle size={15} className="records-icon altered" aria-hidden="true" />
      ) : (
        <ShieldCheck size={15} className="records-icon verified" aria-hidden="true" />
      )}
      <span className="records-dot" aria-hidden="true" />
      <span className="records-text">{text}</span>
      <button
        type="button"
        onClick={check}
        disabled={checking}
        className="records-action-btn"
        title="Verify cryptographic integrity of audit records"
      >
        {checking ? "Checking…" : "Check now"}
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */

const TITLES = Object.entries(PAGE_TITLES).sort((a, b) => b[0].length - a[0].length);

function titleFor(pathname: string): string {
  for (const [prefix, title] of TITLES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return title;
  }
  return "Workspace";
}

/* ------------------------------------------------------------------ */
/* Navigation sidebar: 248px desktop sidebar grouped into Work, What we    */
/* watch, How it checks and The record with 16px labels, 20px icons, cream  */
/* paper tab, open-count badge, and pinned Demo button (DESIGN §24.0, §28.3).  */
/* ------------------------------------------------------------------ */

function AppNav({
  pathname,
  openAlertCount,
  onOpenHelp,
}: {
  pathname: string;
  openAlertCount: number | null;
  onOpenHelp: () => void;
}) {
  const { drawerOpen, toggleDrawer } = useDemo();

  return (
    <aside className="app-nav" aria-label="Main navigation">
      {/* Brand header */}
      <div className="nav-header">
        <Link href="/" className="nav-brand-wrap" aria-label="ComplianceIQ home">
          <ComplianceLogo variant="dark" size="sm" />
        </Link>
      </div>

      {/* Grouped navigation list */}
      <nav className="nav-scrollable" aria-label="Sections">
        {NAV_GROUPS.map((group) => (
          <div key={group.name} className="nav-group">
            <div className="nav-group-title">{group.name}</div>
            <div className="nav-group-items">
              {group.items.map((entry) => {
                const Icon = entry.icon;
                const active =
                  entry.enabled &&
                  entry.href !== undefined &&
                  (pathname === entry.href || pathname.startsWith(`${entry.href}/`));

                const isAlerts = entry.label === "Alerts";

                if (!entry.enabled) {
                  return (
                    <span
                      key={entry.label}
                      className="nav-item is-disabled"
                      aria-disabled="true"
                      role="link"
                      tabIndex={-1}
                    >
                      <Icon size={20} className="nav-icon" aria-hidden="true" />
                      <span className="nav-label">{entry.label}</span>
                    </span>
                  );
                }

                return (
                  <Link
                    key={entry.label}
                    href={entry.href ?? "/"}
                    className={`nav-item${active ? " is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={20} className="nav-icon" aria-hidden="true" />
                    <span className="nav-label">{entry.label}</span>
                    {isAlerts && openAlertCount !== null && openAlertCount > 0 && (
                      <span className="nav-badge" aria-label={`${openAlertCount} open alerts`}>
                        {openAlertCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Pinned footer: Settings always visible + Demo scenarios button */}
      <div className="nav-footer">
        <Link
          href="/settings"
          className={`nav-item${pathname === "/settings" ? " is-active" : ""}`}
          aria-current={pathname === "/settings" ? "page" : undefined}
        >
          <Settings size={20} className="nav-icon" aria-hidden="true" />
          <span className="nav-label">Settings</span>
        </Link>
        <button
          type="button"
          className={`nav-demo-btn${drawerOpen ? " is-active" : ""}`}
          onClick={() => toggleDrawer()}
          aria-expanded={drawerOpen}
          aria-label="Open demo scenarios panel"
        >
          <Presentation size={20} className="nav-icon" aria-hidden="true" />
          <span className="nav-label">Demo scenarios</span>
          <span className="demo-indicator" aria-hidden="true" />
        </button>
        {/* Always-available help (§30.5.H): ? at the bottom of the sidebar */}
        <button
          type="button"
          className="nav-help-btn"
          onClick={onOpenHelp}
          aria-label="Help and shortcuts"
          title="Help and shortcuts (?)"
        >
          <span className="nav-help-glyph" aria-hidden="true">
            ?
          </span>
          <span className="nav-label">Help</span>
        </button>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Role Switcher Chip in the Top Bar                                  */
/* ------------------------------------------------------------------ */

function RoleChip() {
  const { role, setRole } = useRole();
  const roles: Role[] = ["officer", "auditor", "admin"];

  const nextRole = () => {
    const idx = roles.indexOf(role);
    const next = roles[(idx + 1) % roles.length];
    setRole(next);
  };

  return (
    <button
      type="button"
      className="role-chip"
      onClick={nextRole}
      title={`Current role: ${ROLE_NAMES[role]}. Click to switch.`}
      aria-label={`Role: ${ROLE_NAMES[role]}. Click to switch.`}
    >
      <span className="role-chip-indicator" aria-hidden="true" />
      <span className="role-chip-name">{ROLE_NAMES[role]}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile Bottom Bar (5 slots: Overview, Alerts, Evidence, Reports, More) */
/* ------------------------------------------------------------------ */

function MobileTabBar({
  pathname,
  openAlertCount,
  onOpenMore,
}: {
  pathname: string;
  openAlertCount: number | null;
  onOpenMore: () => void;
}) {
  const isOverview = pathname === "/overview";
  const isAlerts = pathname.startsWith("/alerts");
  const isEvidence = pathname.startsWith("/evidence");
  const isReports = pathname.startsWith("/reports");

  return (
    <nav className="mobile-tab-bar" aria-label="Mobile navigation">
      <Link href="/overview" className={`mobile-tab${isOverview ? " is-active" : ""}`}>
        <span className="mobile-tab-label">Overview</span>
      </Link>
      <Link href="/alerts" className={`mobile-tab${isAlerts ? " is-active" : ""}`}>
        <span className="mobile-tab-label">Alerts</span>
        {openAlertCount !== null && openAlertCount > 0 && (
          <span className="mobile-badge">{openAlertCount}</span>
        )}
      </Link>
      <Link href="/evidence" className={`mobile-tab${isEvidence ? " is-active" : ""}`}>
        <span className="mobile-tab-label">Evidence</span>
      </Link>
      <Link href="/reports" className={`mobile-tab${isReports ? " is-active" : ""}`}>
        <span className="mobile-tab-label">Reports</span>
      </Link>
      <button type="button" className="mobile-tab" onClick={onOpenMore}>
        <span className="mobile-tab-label">More</span>
      </button>
    </nav>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Mobile entry point for the demo drawer (the sidebar's `.nav-demo-btn` is
 * display:none at ≤768px). Must render inside <DemoProvider>.
 */
function SheetDemoButton({ onDone }: { onDone: () => void }) {
  const { toggleDrawer } = useDemo();

  return (
    <button
      type="button"
      className="btn btn-navy"
      style={{ width: "100%", justifyContent: "center" }}
      onClick={() => {
        onDone();
        toggleDrawer();
      }}
    >
      <Presentation size={16} />
      <span>Demo scenarios</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */

const SHORTCUTS: Array<{ keys: string[]; action: string }> = [
  { keys: ["⌘K"], action: "Search everything (alerts, people, policies, evidence)" },
  { keys: ["/"], action: "Search alerts, or open search anywhere" },
  { keys: ["j", "k"], action: "Move between alerts" },
  { keys: ["Enter"], action: "Open the focused alert" },
  { keys: ["?"], action: "Show keyboard shortcuts" },
  { keys: ["Esc"], action: "Close popover or dialog" },
];

/**
 * The guided tour's last button says "Open demo" — it must actually open the
 * demo scenarios drawer. Lives under <DemoProvider> so it can call useDemo.
 */
function TourWithDemo({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { toggleDrawer } = useDemo();
  return <GuidedTour isOpen={isOpen} onClose={onClose} onOpenDemo={() => toggleDrawer()} />;
}

/**
 * Shell component with expanded 248px sidebar, 64px top bar,
 * Newsreader serif titles, round seal records check, role switcher,
 * and anti-clutter clean page frame (§22, §24, §27, §28, §29).
 */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [domain, setDomain] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // null until the first successful fetch — no fabricated counts.
  const [openAlertCount, setOpenAlertCount] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const prevPath = useRef(pathname);

  const onAlertsList = pathname === "/alerts";

  // Check URL on mount for auto-starting tour (?tour=start)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tour") === "start") {
        setTourOpen(true);
      }
    }
  }, []);

  // Quiet refresh of the open-alert badge on mount and after each navigation.
  useEffect(() => {
    fetch("/api/alerts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { alerts?: Array<{ status: string }> } | null) => {
        if (data?.alerts) {
          const open = data.alerts.filter((a) => a.status === "open").length;
          setOpenAlertCount(open);
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Filters belong to Alerts screen; reset them when leaving it so next visit starts clean.
  useEffect(() => {
    if (prevPath.current === "/alerts" && pathname !== "/alerts") {
      setDomain(null);
      setQ("");
    }
    prevPath.current = pathname;
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // ⌘K / Ctrl+K opens the command palette even while typing (standard behavior).
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (typing) return;
      if (event.key === "?") {
        event.preventDefault();
        setSheetOpen((open) => !open);
      } else if (event.key === "Escape") {
        setSheetOpen(false);
      } else if (event.key === "/") {
        event.preventDefault();
        if (onAlertsList) {
          searchRef.current?.focus();
        } else {
          setPaletteOpen(true);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onAlertsList]);

  const filters = useMemo<AlertFilters>(
    () => ({
      domain,
      q,
      domains,
      searchRef,
      setDomain,
      setQ,
      setDomains,
      openShortcuts: () => setSheetOpen(true),
    }),
    [domain, q, domains],
  );

  return (
    <AlertFiltersContext.Provider value={filters}>
      <RoleProvider>
        <DemoProvider>
          <div className="app-shell">
            {/* Expanded 248px Navigation Sidebar */}
            <AppNav
              pathname={pathname}
              openAlertCount={openAlertCount}
              onOpenHelp={() => setSheetOpen(true)}
            />

            {/* Main Content Column */}
            <div className="main-column">
              {/* Contextual Onboarding Ribbon bridging landing and workspace */}
              <OnboardingRibbon />

              <header className="topbar">
                <span className="topbar-title">{titleFor(pathname)}</span>


                {onAlertsList && domains.length > 0 && (
                  <div className="domain-tabs" role="tablist" aria-label="Filter by area">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={domain === null}
                      className={`domain-tab${domain === null ? " is-active" : ""}`}
                      onClick={() => setDomain(null)}
                    >
                      All areas
                    </button>
                    {domains.map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={domain === value}
                        className={`domain-tab${domain === value ? " is-active" : ""}`}
                        onClick={() => setDomain(value)}
                      >
                        {DOMAIN_LABELS[value] ?? value}
                      </button>
                    ))}
                  </div>
                )}

                <span className="topbar-spacer" />

                {/* Center / Global Search Bar (44px). On /alerts it filters the
                    list inline; anywhere else it opens the command palette. */}
                <div className="topbar-search">
                  <label htmlFor="ciq-search" className="sr-only">
                    Search alerts, people, policies
                  </label>
                  <input
                    id="ciq-search"
                    ref={searchRef}
                    type="search"
                    placeholder="Search alerts, people, policies  ⌘K"
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    title="Press ⌘K or / to search"
                    readOnly={!onAlertsList}
                    onClick={(event) => {
                      if (!onAlertsList) {
                        event.currentTarget.blur();
                        setPaletteOpen(true);
                      }
                    }}
                  />
                </div>

                {/* Next Deadline Chip (§30.2) */}
                <TopbarNextDeadlineChip />

                {/* Integrity Status */}
                <RecordsCheck />

                {/* Role Switcher */}
                <RoleChip />

                {/* Guided Tour Trigger (§27.5, §29.2, §30.5) */}
                <button
                  type="button"
                  className="topbar-tour-btn"
                  onClick={() => setTourOpen(true)}
                  title="Take the guided tour"
                  aria-label="Take the tour"
                >
                  <Compass size={15} aria-hidden="true" />
                  <span>Tour</span>
                </button>

                {/* Keyboard Shortcuts Trigger */}
                <button
                  type="button"
                  className="topbar-help-btn"
                  onClick={() => setSheetOpen(true)}
                  title="Keyboard shortcuts (?)"
                  aria-label="Keyboard shortcuts"
                >
                  ?
                </button>
              </header>

              {/* Sticky Due-Now Banner under Top Bar (§30.2) */}
              <UrgencyBanner />

              <main id="main-content" className="app-main-content">
                {children}
              </main>

              {/* Mobile Tab Bar */}
              <MobileTabBar
                pathname={pathname}
                openAlertCount={openAlertCount}
                onOpenMore={() => setSheetOpen(true)}
              />
            </div>

            {/* Shortcuts / Help Sheet */}
            {sheetOpen && (
              <div
                className="sheet-backdrop"
                role="presentation"
                onClick={(event) => {
                  if (event.target === event.currentTarget) setSheetOpen(false);
                }}
              >
                <div
                  className="sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="shortcuts-title"
                >
                  <h3 id="shortcuts-title">Help & shortcuts</h3>
                  <p>Navigation shortcuts and interactive guides throughout the case room.</p>

                  {/* Always-available help entries (§30.5.H) */}
                  <ul className="sheet-help-list">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setSheetOpen(false);
                          window.dispatchEvent(new Event("ciq:about-open"));
                        }}
                      >
                        About this screen
                      </button>
                    </li>
                    <li>
                      <Link href="/styleguide" onClick={() => setSheetOpen(false)}>
                        Words explained
                      </Link>
                    </li>
                    <li>
                      <Link href="/overview" onClick={() => setSheetOpen(false)}>
                        Setup guide
                      </Link>
                    </li>
                  </ul>

                  <div style={{ marginBottom: 18 }}>
                    <SheetDemoButton onDone={() => setSheetOpen(false)} />
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <button
                      type="button"
                      className="btn btn-navy"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => {
                        setSheetOpen(false);
                        setTourOpen(true);
                      }}
                    >
                      <Compass size={16} />
                      <span>Take the guided walkthrough tour</span>
                    </button>
                  </div>

                  <ul>
                    {SHORTCUTS.map((shortcut) => (
                      <li key={shortcut.action}>
                        {shortcut.keys.map((key) => (
                          <kbd key={key}>{key}</kbd>
                        ))}
                        <span>{shortcut.action}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="sheet-close">
                    <button
                      type="button"
                      className="btn btn-plain"
                      onClick={() => setSheetOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Guided Tour (§27.5, §28.7, §29.2) */}
            <TourWithDemo
              isOpen={tourOpen}
              onClose={() => setTourOpen(false)}
            />

            {/* Global command search (⌘K / §27.5) */}
            <CommandPalette
              isOpen={paletteOpen}
              onClose={() => setPaletteOpen(false)}
            />

            <DemoPanel />
          </div>
        </DemoProvider>
      </RoleProvider>
    </AlertFiltersContext.Provider>
  );
}
