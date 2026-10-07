import {
  Bell,
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  Files,
  History,
  Home,
  ListChecks,
  Plug,
  Presentation,
  Scale,
  Settings,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface NavEntry {
  label: string;
  href?: string;
  icon: LucideIcon;
  /** Screens not built yet render disabled (DESIGN §5 order: navigation for built screens first). */
  enabled: boolean;
  /** Entry types that do something other than navigate (the demo panel opens a drawer). */
  action?: "demo";
}

export interface NavGroup {
  name: string;
  items: NavEntry[];
}

/**
 * Grouped for the product lifecycle (what you do → what is watched → how it
 * checks → what it produced). Settings lives in the sidebar footer so it is
 * always visible instead of buried under a ninth Setup item.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    name: "Work",
    items: [
      { label: "Overview", href: "/overview", icon: Home, enabled: true },
      { label: "Alerts", href: "/alerts", icon: Bell, enabled: true },
      { label: "Deadlines", href: "/deadlines", icon: CalendarClock, enabled: true },
    ],
  },
  {
    name: "What we watch",
    items: [
      { label: "Policy coverage", href: "/policy-coverage", icon: ListChecks, enabled: true },
      { label: "Policies", href: "/policies", icon: BookOpen, enabled: true },
      { label: "Obligations", href: "/obligations", icon: ClipboardList, enabled: true },
      { label: "People", href: "/registers/people", icon: Users, enabled: true },
      { label: "Vendors", href: "/registers/vendors", icon: Building2, enabled: true },
    ],
  },
  {
    name: "How it checks",
    items: [
      { label: "Rules", href: "/rules", icon: Scale, enabled: true },
      { label: "Sources", href: "/sources", icon: Plug, enabled: true },
      { label: "Responses", href: "/responses", icon: Workflow, enabled: true },
    ],
  },
  {
    name: "The record",
    items: [
      { label: "Evidence", href: "/evidence", icon: Files, enabled: true },
      { label: "Audit record", href: "/audit-record", icon: History, enabled: true },
      { label: "Reports", href: "/reports", icon: FileText, enabled: true },
    ],
  },
];

/** Flattened list preserved for compatibility and full route mapping. */
export const NAV_ENTRIES: NavEntry[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  { label: "Settings", href: "/settings", icon: Settings, enabled: true },
  { label: "Demo panel", icon: Presentation, enabled: true, action: "demo" },
];

/** Plain-word titles for the top bar, keyed by section. */
export const PAGE_TITLES: Record<string, string> = {
  "/alerts": "Alerts",
  "/overview": "Overview",
  "/audit-record": "Audit record",
  "/policy-coverage": "Policy coverage",
  "/obligations": "Obligations",
  "/registers/people": "People",
  "/registers/vendors": "Vendors",
  "/deadlines": "Deadlines",
  "/evidence": "Evidence",
  "/rules": "Rules",
  "/policies": "Policies",
  "/reports": "Reports",
  "/sources": "Sources",
  "/responses": "Responses",
  "/settings": "Settings",
};

export const DOMAIN_LABELS: Record<string, string> = {
  finance: "Finance",
  people: "People",
  vendor: "Vendors",
  access: "Access",
  identity: "Identity",
  healthcare: "Healthcare",
  expense: "Expense",
  code: "Code",
  regulatory: "Regulatory",
  ai: "AI governance",
};
