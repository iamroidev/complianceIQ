/** Landing copy (DESIGN §19, §15.3, §8) and the honest counts the page renders. */

export interface LandingFacts {
  /** Demo policy documents in the library. */
  policies: number;
  /** Obligations in the registers. */
  obligations: number;
  /** Tier 1 rules. */
  rules: number;
  /** Entries currently in the audit record. */
  entries: number;
  /** Obligations a rule already checks automatically. */
  checked: number;
  /** Total obligations in the coverage view. */
  coverageTotal: number;
}

export const HERO = {
  before: "you can ",
  italic: "prove",
  after: ".",
  subhead:
    "An automated compliance monitoring and auditing system. Rules check internal policies and regulatory requirements, AI interprets findings and flags gaps, and every decision is saved to an audit-ready record.",
  cta: "Open live demo",
  secondary: "See how it works",
} as const;

export const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#checks", label: "What it checks" },
  { href: "#ai", label: "AI and people" },
  { href: "#compare", label: "Compare" },
] as const;

export const STATEMENTS = [
  {
    heading: "Turn your policies into checks",
    body: "Upload a policy and we list what it obliges you to do, then check those obligations for you.",
  },
  {
    heading: "See why every alert fired, with the exact policy wording",
    body: "Every alert opens with one plain sentence, the rule behind it, and the sentence from your policy that it points at.",
  },
  {
    heading: "Hand auditors a report they can verify themselves",
    body: "The audit pack carries a fingerprint of the record, so an auditor can check it without taking your word for it.",
  },
] as const;

export const STEPS = [
  {
    key: "detect",
    label: "Spot it",
    sentence:
      "Rules watch your people, certifications, deadlines and activity, and raise an alert the moment something crosses a line.",
  },
  {
    key: "explain",
    label: "Explain it",
    sentence:
      "Each alert opens with one plain sentence about what happened, the rule that fired, and the policy sentence behind it.",
  },
  {
    key: "decide",
    label: "Decide",
    sentence:
      "An officer files, dismisses or escalates, and writes down why in plain words.",
  },
  {
    key: "prove",
    label: "Prove it",
    sentence:
      "The decision is saved to an audit record nobody can quietly change, then packed for auditors.",
  },
] as const;

export const TILES = [
  {
    key: "certifications",
    title: "Certifications and training",
    sentence: "Certificates that expire, and training nobody completed.",
  },
  {
    key: "payments",
    title: "Payments and thresholds",
    sentence: "Payments and deposits that cross a line, or try not to.",
  },
  {
    key: "deadlines",
    title: "Regulatory deadlines",
    sentence: "Dates a rule says cannot move.",
  },
  {
    key: "access",
    title: "Data access",
    sentence: "Who can see what, and whether the review ran on time.",
  },
  {
    key: "vendors",
    title: "Vendors",
    sentence: "Vendor documents that lapse or go missing.",
  },
  {
    key: "code",
    title: "Code and secrets",
    sentence: "Secrets committed to code, and the checks that catch them.",
  },
] as const;

export const AI_SECTION = {
  heading: "Where AI is used",
  rulesLane: {
    title: "Rules decide",
    items: [
      "Cash deposits just under the reporting limit",
      "A certification past its expiry date",
      "A vendor document that never arrived",
      "An access review nobody ran",
    ],
  },
  helpsLane: {
    title: "AI helps",
    items: [
      "Explains why an alert fired",
      "Drafts the report a person files",
      "Suggests which obligations your policy adds",
    ],
  },
  gate: "Checked against sources",
  person: "An officer signs off",
  caption:
    "Rules decide what to flag. AI only helps draft the report, and a person always signs off.",
  limit: "AI cannot file, dismiss or escalate a finding, or change a record.",
} as const;

export const PACK_SECTION = {
  heading: "The audit pack",
  intro:
    "One export for the period and areas you choose, ready to hand over:",
  items: [
    "The period and the areas you asked for",
    "Every alert in that period, with its decision and reason",
    "Which obligations are checked automatically, and which are not",
    "The evidence used, with a fingerprint for each file",
    "A check that every entry is unaltered, plus the record's own fingerprint",
    "What is automated, what AI did, and what AI cannot do",
  ],
  closing: "An auditor can re-verify it themselves.",
} as const;

export const COMPARE_SECTION = {
  heading: "An honest comparison",
  columns: ["", "ComplianceIQ", "Checklist tools", "Transaction-monitoring tools"],
  rows: [
    {
      label: "Tells you why something happened",
      cells: [
        "A plain sentence, the rule, and the policy sentence",
        "A rule name and a status",
        "A score and a list of transactions",
      ],
    },
    {
      label: "Checks against your own written policies",
      cells: [
        "Yes: upload a policy and confirm what it obliges",
        "A template you fill in yourself",
        "Thresholds you configure",
      ],
    },
    {
      label: "Record an auditor can re-verify",
      cells: [
        "Yes: run the tamper check and export the pack",
        "Status lives inside the tool",
        "Logs kept inside the tool",
      ],
    },
    {
      label: "A person signs off every decision",
      cells: [
        "Yes: an officer files, dismisses or escalates",
        "Assigned in the tool",
        "Depends on how you configure it",
      ],
    },
  ],
  footnote: "Based on public product information; verify before relying on it.",
} as const;

export const CLOSING = {
  line: "Plain sentences, exact policy wording, and a record nobody can quietly change.",
  cta: "Open live demo",
} as const;

export const FACT_LABELS = {
  policies: "policies in the demo library",
  obligations: "obligations tracked",
  rules: "rules watching your activity",
  entries: "entries in the audit record",
} as const;
