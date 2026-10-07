import type { ReactNode } from "react";
import { SeverityDot, StatusDot } from "@/components/signature/SeverityDot";
import { SourceLink } from "@/components/signature/SourceLink";
import { SavedConfirmation } from "@/components/signature/SavedConfirmation";
import { AiDraftMarking } from "@/components/signature/AiDraftMarking";
import { VerifiedStatus } from "@/components/signature/VerifiedStatus";
import { HashValue } from "@/components/signature/HashValue";
import { ThemePicker } from "@/components/styleguide/ThemePicker";
import { ThemeSwatches } from "@/components/styleguide/ThemeSwatches";
import { ThemeToggle } from "@/components/ThemeToggle";

function Section({
  title,
  sentence,
  children,
}: {
  title: string;
  sentence: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        padding: "40px 0",
        borderBottom: "1px solid var(--line)",
        maxWidth: "880px",
      }}
    >
      <h2
        style={{
          fontSize: "var(--fs-title)",
          fontWeight: 600,
          lineHeight: "28px",
          marginBottom: "4px",
        }}
      >
        {title}
      </h2>
      <p style={{ color: "var(--text-2)", marginBottom: "24px" }}>
        {sentence}
      </p>
      {children}
    </section>
  );
}

const sampleRows = [
  {
    severity: "critical" as const,
    what: "A hardcoded cloud access key was committed to the payments service.",
    who: "A. Owusu",
    left: "1h 40m left",
    status: "Open",
    rule: "DEV-001",
  },
  {
    severity: "high" as const,
    what: "Kofi Adjei-Boateng made two cash deposits just under the USD 10,000 reporting limit.",
    who: "Kofi Adjei-Boateng",
    left: "18h left",
    status: "In review",
    rule: "AML-001",
  },
  {
    severity: "medium" as const,
    what: "Ama Serwaa Owusu's First Aid certificate expired 19 days ago.",
    who: "Ama Serwaa Owusu",
    left: "2 days left",
    status: "Open",
    rule: "CERT-001",
  },
  {
    severity: "low" as const,
    what: "Vendor insurance document for Meridian Freight Ltd expires in 12 days.",
    who: "Meridian Freight Ltd",
    left: "6 days left",
    status: "Open",
    rule: "CERT-002",
  },
];

export default function StyleguidePage() {
  return (
    <main
      style={{
        maxWidth: "880px",
        margin: "0 auto",
        padding: "48px 24px 96px",
      }}
    >
      <header
        style={{
          marginBottom: "8px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--fs-title)",
              fontWeight: 600,
              lineHeight: "28px",
            }}
          >
            Styleguide
          </h1>
          <p style={{ color: "var(--text-2)", maxWidth: "var(--max-prose)" }}>
            The building blocks for every screen: colour, type, status, and the
            components officers see. Every screen is assembled from what is on
            this page.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div style={{ marginTop: "16px" }}>
        <Section
          title="Theme"
          sentence="Pick a palette for the whole product — the choice is remembered on this device. Every palette follows the same rule: one canvas colour, one structure colour for type and navigation, one accent used sparingly. Severity and verified colours keep their meaning in all of them."
        >
          <ThemePicker />
          <p
            style={{
              marginTop: "16px",
              color: "var(--text-3)",
              fontSize: "var(--fs-label)",
            }}
          >
            The compact toggle in the top-right corner is the same logic
            shipped for the product top bar and Settings — every screen
            reconstructs instantly because all components read tokens only.
          </p>
        </Section>

        <Section
          title="Colour"
          sentence="Every palette keeps the same 60 / 30 / 10 split: one canvas colour, one structure colour for type and navigation, one accent used sparingly. The swatches below show whichever theme is selected above — the accent appears only on the one primary action of a view, badges, and critical alerts."
        >
          <ThemeSwatches />
        </Section>

        <Section
          title="Type"
          sentence="Newsreader serif for landing headlines only. Geist Sans everywhere else. Sentence case for every label."
        >
          <p
            style={{
              color: "var(--text-3)",
              fontSize: "var(--fs-label)",
              marginBottom: "8px",
            }}
          >
            Landing headline — Newsreader 400, 56px
          </p>
          <p
            style={{
              fontFamily: "var(--font-newsreader), Georgia, serif",
              fontSize: "56px",
              lineHeight: "62px",
              fontWeight: 400,
              marginBottom: "24px",
            }}
          >
            Compliance decisions you can prove.
          </p>

          <div style={{ display: "grid", gap: "16px", marginBottom: "8px" }}>
            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)" }}>
                Page title — 20px / 600
              </p>
              <p style={{ fontSize: "20px", fontWeight: 600, lineHeight: "28px" }}>
                Alerts
              </p>
            </div>
            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)" }}>
                Body — 14px / 22px
              </p>
              <p>14 alerts need attention. 3 are due within 4 hours.</p>
            </div>
            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)" }}>
                Label — 12px / 500, sentence case, in secondary text colour
              </p>
              <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-3)" }}>
                Time left
              </p>
            </div>
            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)" }}>
                Hash — Geist Mono 12px, shortened, click to copy
              </p>
              <HashValue value="9f3a6b21d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9c21e" />
            </div>
          </div>
        </Section>

        <Section
          title="Table row"
          sentence="40px rows, six columns at most, no codes in the main column. The rule ID sits as secondary grey text."
        >
          <div
            role="table"
            aria-label="Example alerts table"
            className="demo-table"
          >
            <div role="row" className="demo-head">
              <span role="columnheader">Severity</span>
              <span role="columnheader">What happened</span>
              <span role="columnheader" className="demo-hide-sm">
                Who
              </span>
              <span role="columnheader">Time left</span>
              <span role="columnheader" className="demo-hide-sm">
                Status
              </span>
            </div>
            {sampleRows.map((row) => (
              <div role="row" className="demo-row" key={row.rule}>
                <span role="cell">
                  <SeverityDot severity={row.severity} />
                </span>
                <span role="cell" style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.what}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--fs-label)",
                      color: "var(--text-3)",
                    }}
                  >
                    Rule {row.rule}
                  </span>
                </span>
                <span
                  role="cell"
                  className="demo-hide-sm"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.who}
                </span>
                <span role="cell" style={{ whiteSpace: "nowrap" }}>
                  {row.left}
                </span>
                <span
                  role="cell"
                  className="demo-hide-sm"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Status"
          sentence="Status is a small dot plus a plain word — never a filled pill. Green means verified only; red means critical or altered only."
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "24px 40px",
              marginBottom: "24px",
            }}
          >
            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)", marginBottom: "8px" }}>
                Severity
              </p>
              <div style={{ display: "grid", gap: "8px" }}>
                <SeverityDot severity="critical" />
                <SeverityDot severity="high" />
                <SeverityDot severity="medium" />
                <SeverityDot severity="low" />
              </div>
            </div>
            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)", marginBottom: "8px" }}>
                Record state
              </p>
              <div style={{ display: "grid", gap: "8px" }}>
                <StatusDot label="Records verified" tone="verified" />
                <StatusDot label="Records altered" tone="critical" />
              </div>
            </div>
            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)", marginBottom: "8px" }}>
                Everyday statuses
              </p>
              <div style={{ display: "grid", gap: "8px" }}>
                <StatusDot label="Valid" tone="verified" />
                <StatusDot label="Expires in 12 days" tone="attention" />
                <StatusDot label="Expired 19 days ago" tone="critical" />
                <StatusDot label="Reporting" tone="neutral" />
              </div>
            </div>
            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)", marginBottom: "8px" }}>
                Top bar status
              </p>
              <VerifiedStatus />
            </div>
          </div>
        </Section>

        <Section
          title="Signature components"
          sentence="Every derived number can be traced. Every action leaves a plain confirmation. AI output is marked until a person edits it."
        >
          <div style={{ display: "grid", gap: "32px" }}>
            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)", marginBottom: "8px" }}>
                Source link — hover to see where a number came from
              </p>
              <p>
                Kofi Adjei-Boateng made{" "}
                <SourceLink source="2 deposits, Rule AML-001">2 deposits</SourceLink>{" "}
                of USD 9,800.00 and USD 9,400.00 within 34 hours, each just under
                the USD 10,000 reporting limit.
              </p>
            </div>

            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)", marginBottom: "8px" }}>
                Saved confirmation — appears in place after an action
              </p>
              <SavedConfirmation time="14:05" entry={1285} />
            </div>

            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)", marginBottom: "8px" }}>
                AI-assisted marking — disappears once the officer edits the paragraph
              </p>
              <div style={{ maxWidth: "60ch" }}>
                <AiDraftMarking>
                  <p>
                    Two cash deposits were made within 34 hours, each below the
                    USD 10,000 reporting limit. The pattern matches the structuring
                    description in the AML Procedure.
                  </p>
                </AiDraftMarking>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Buttons"
          sentence="One solid accent action per view — the highest-impact step. Everything else uses the structure colour or plain text. Buttons say what the officer would say aloud."
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            <button
              type="button"
              style={{
                background: "var(--cta-solid)",
                color: "var(--on-cta)",
                border: "none",
                borderRadius: "var(--r-control)",
                minHeight: "40px",
                padding: "0 18px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              File report
            </button>
            <button
              type="button"
              style={{
                background: "var(--accent)",
                color: "var(--on-accent)",
                border: "none",
                borderRadius: "var(--r-control)",
                minHeight: "40px",
                padding: "0 18px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Escalate to manager
            </button>
            <button
              type="button"
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-control)",
                minHeight: "40px",
                padding: "0 18px",
                cursor: "pointer",
              }}
            >
              Dismiss alert
            </button>
          </div>
        </Section>

        <Section
          title="Illustration and motion tokens"
          sentence="Artwork uses only the illustration palette below, with a 2px ink outline and a hard offset shadow. Motion uses the durations and easings below — quick in the product, expressive only on the landing page."
        >
          <div
            style={{
              display: "grid",
              gap: "24px",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            }}
          >
            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)", marginBottom: "8px" }}>
                Illustration palette
              </p>
              <div style={{ display: "grid", gap: "8px" }}>
                {(
                  [
                    ["Ink", "#002B5B", "outlines and line work"],
                    ["Paper", "#FFFDF8", "sheet fills"],
                    ["Cream", "#F2EBDD", "secondary paper fills"],
                    ["Teal", "#2E9E8A", "thread, seals, verified"],
                    ["Ochre", "#E2B04A", "neutral accent"],
                    ["Terracotta", "#D4694E", "torn, altered, expired"],
                    ["Sage", "#9FBFA8", "neutral accent"],
                    ["Sky", "#B7CDE6", "neutral accent"],
                  ] as const
                ).map(([name, hex, usage]) => (
                  <span
                    key={name}
                    style={{ display: "flex", alignItems: "center", gap: "10px" }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: "20px",
                        height: "20px",
                        background: name === "Ink" ? "var(--ill-ink)" : hex,
                        border: "2px solid var(--ill-ink)",
                        borderRadius: "4px",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ minWidth: "72px" }}>{name}</span>
                    <span style={{ color: "var(--text-3)" }}>{usage}</span>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--fs-label)", marginBottom: "8px" }}>
                Motion
              </p>
              <div style={{ display: "grid", gap: "6px" }}>
                <p>Instant 90ms · Fast 160ms · Base 240ms · Slow 420ms · Scene 800ms</p>
                <p style={{ color: "var(--text-2)" }}>
                  Easing: ease-out for entrances, ease-in-out for slides, spring
                  only for seals and toggles.
                </p>
                <p style={{ color: "var(--text-2)" }}>
                  Product transitions never exceed 240ms. Reduced motion turns
                  transforms into 150ms fades.
                </p>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}
