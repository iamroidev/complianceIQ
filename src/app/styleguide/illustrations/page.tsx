import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Paper,
  PaperStack,
  Certificate,
  Calendar,
  Receipt,
  Invoice,
  CoinStack,
  Seal,
  Thread,
  ChainLink,
  Magnifier,
  Stamp,
  Key,
  CodeCard,
  VendorBox,
} from "@/components/illustration/kit";
import {
  SpotCertificate,
  SpotPayment,
  SpotDeadline,
  SpotAccess,
  SpotVendor,
  SpotCode,
  StepDetect,
  StepExplain,
  StepDecide,
  StepProve,
  HeroCaseFile,
  PolicyToChecks,
  AuditPackFan,
  EmptyAlerts,
  EmptyEvidence,
  EmptyObligations,
  EmptySearch,
  EmptyCoverageGap,
  ErrorDroppedLink,
  EmptyNotFound,
  SealedConfirmation,
  TamperDetected,
  RecordsVerified,
} from "@/components/illustration/scenes";

type Render = { label: string; node: ReactNode };
type Spec = { name: string; note: string; renders: Render[] };

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p
        style={{
          fontSize: "var(--fs-label)",
          color: "var(--text-3)",
          marginBottom: "6px",
        }}
      >
        {label}
      </p>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "72px",
          minWidth: "72px",
          padding: "14px",
          background: "var(--ill-cream)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-container)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SpecCard({ spec }: { spec: Spec }) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-container)",
        padding: "16px",
        background: "var(--surface)",
      }}
    >
      <p style={{ fontWeight: 600 }}>{spec.name}</p>
      <p
        style={{
          fontSize: "var(--fs-label)",
          color: "var(--text-3)",
          marginBottom: "12px",
        }}
      >
        {spec.note}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {spec.renders.map((r) => (
          <Tile key={r.label} label={r.label}>
            {r.node}
          </Tile>
        ))}
      </div>
    </div>
  );
}

const SPECS: Spec[] = [
  {
    name: "Paper",
    note: "Base sheet. Props: folded corner, lines, highlight index.",
    renders: [
      { label: "1×", node: <Paper /> },
      { label: "2×", node: <Paper size={192} /> },
      { label: "folded + highlight", node: <Paper folded highlight={1} /> },
    ],
  },
  {
    name: "PaperStack",
    note: "Layered sheets for cases and packs.",
    renders: [
      { label: "1×", node: <PaperStack /> },
      { label: "2×", node: <PaperStack size={192} /> },
      { label: "two sheets", node: <PaperStack sheets={2} /> },
    ],
  },
  {
    name: "Certificate",
    note: "Credential with a teal verification seal. Prop: verified.",
    renders: [
      { label: "1×", node: <Certificate /> },
      { label: "2×", node: <Certificate size={224} /> },
      { label: "unverified", node: <Certificate verified={false} /> },
    ],
  },
  {
    name: "Calendar",
    note: "Deadlines. Props: today index, expired (turns terracotta).",
    renders: [
      { label: "1×", node: <Calendar /> },
      { label: "2×", node: <Calendar size={192} /> },
      { label: "expired", node: <Calendar expired today={11} /> },
    ],
  },
  {
    name: "Receipt",
    note: "Expense evidence. Prop: torn (dashed critical seam).",
    renders: [
      { label: "1×", node: <Receipt /> },
      { label: "2×", node: <Receipt size={144} /> },
      { label: "torn", node: <Receipt torn /> },
    ],
  },
  {
    name: "Invoice",
    note: "Amounts and totals.",
    renders: [
      { label: "1×", node: <Invoice /> },
      { label: "2×", node: <Invoice size={192} /> },
    ],
  },
  {
    name: "CoinStack",
    note: "Money amounts. Prop: count 3–5.",
    renders: [
      { label: "1×", node: <CoinStack /> },
      { label: "2×", node: <CoinStack size={192} /> },
      { label: "five", node: <CoinStack count={5} /> },
    ],
  },
  {
    name: "Seal",
    note: "Teal = verified; terracotta = broken. The stamp moment.",
    renders: [
      { label: "1×", node: <Seal /> },
      { label: "2×", node: <Seal size={128} /> },
      { label: "broken", node: <Seal variant="broken" /> },
    ],
  },
  {
    name: "Thread",
    note: "The connecting teal line. Prop: progress 0–1 draws it on.",
    renders: [
      { label: "1×", node: <Thread /> },
      { label: "2×", node: <Thread size={240} /> },
      { label: "half drawn", node: <Thread progress={0.5} /> },
    ],
  },
  {
    name: "ChainLink",
    note: "Audit record link. Prop: torn (the tear moment).",
    renders: [
      { label: "1×", node: <ChainLink /> },
      { label: "2×", node: <ChainLink size={240} /> },
      { label: "torn", node: <ChainLink torn /> },
    ],
  },
  {
    name: "Magnifier",
    note: "Looking closer. Prop: found draws the teal check.",
    renders: [
      { label: "1×", node: <Magnifier /> },
      { label: "2×", node: <Magnifier size={160} /> },
      { label: "found", node: <Magnifier found /> },
    ],
  },
  {
    name: "Stamp",
    note: "Acting on a record; teal face prints the mark.",
    renders: [
      { label: "1×", node: <Stamp /> },
      { label: "2×", node: <Stamp size={160} /> },
    ],
  },
  {
    name: "Key",
    note: "Access. Prop: leaking shows it slipping away.",
    renders: [
      { label: "1×", node: <Key /> },
      { label: "2×", node: <Key size={192} /> },
      { label: "leaking", node: <Key leaking /> },
    ],
  },
  {
    name: "CodeCard",
    note: "Code with a key leaking out (the secret-scan spot).",
    renders: [
      { label: "1×", node: <CodeCard /> },
      { label: "2×", node: <CodeCard size={256} /> },
      { label: "no leak", node: <CodeCard leaking={false} /> },
    ],
  },
  {
    name: "VendorBox",
    note: "A labelled parcel — never a handshake. Prop: missing.",
    renders: [
      { label: "1×", node: <VendorBox /> },
      { label: "2×", node: <VendorBox size={192} /> },
      { label: "missing doc", node: <VendorBox missing /> },
    ],
  },
];

type SceneSpec = {
  name: string;
  note: string;
  w: number;
  render: (size?: number) => ReactNode;
};

type SceneGroup = { title: string; sentence: string; scenes: SceneSpec[] };

function SceneCard({ spec }: { spec: SceneSpec }) {
  const wide = spec.w >= 480;
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-container)",
        padding: "16px",
        background: "var(--surface)",
        gridColumn: wide ? "1 / -1" : undefined,
      }}
    >
      <p style={{ fontWeight: 600 }}>{spec.name}</p>
      <p
        style={{
          fontSize: "var(--fs-label)",
          color: "var(--text-3)",
          marginBottom: "12px",
        }}
      >
        {spec.note}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ overflowX: "auto", maxWidth: "100%" }}>
          <Tile label="1×">{spec.render()}</Tile>
        </div>
        <div style={{ overflowX: "auto", maxWidth: "100%" }}>
          <Tile label="2×">{spec.render(spec.w * 2)}</Tile>
        </div>
      </div>
    </div>
  );
}

const SCENE_GROUPS: SceneGroup[] = [
  {
    title: "Hero",
    sentence:
      "HeroCaseFile: three pinned sheets in an open case file; the teal thread runs from the amount, through the policy clause, to the seal. A chain of six links below drives the tamper check — shown torn at link 3, later links turning critical.",
    scenes: [
      {
        name: "HeroCaseFile",
        note: "900×640 · layers: folder, pinned sheets, hero-thread, seal, hero-chain",
        w: 900,
        render: (size) => <HeroCaseFile size={size} />,
      },
      {
        name: "HeroCaseFile — tamper state",
        note: "tornAt=2: the link tears, every later link turns critical",
        w: 900,
        render: (size) => <HeroCaseFile size={size} tornAt={2} />,
      },
    ],
  },
  {
    title: "How it works",
    sentence:
      "Four vignettes on one shared composition — paper, thread, and a swappable object at the thread's end — so they morph into each other on scroll.",
    scenes: [
      { name: "StepDetect", note: "480×360 · Spot it", w: 480, render: (s) => <StepDetect size={s} /> },
      { name: "StepExplain", note: "480×360 · Explain it", w: 480, render: (s) => <StepExplain size={s} /> },
      { name: "StepDecide", note: "480×360 · Decide it", w: 480, render: (s) => <StepDecide size={s} /> },
      { name: "StepProve", note: "480×360 · Prove it", w: 480, render: (s) => <StepProve size={s} /> },
    ],
  },
  {
    title: "What it checks",
    sentence: "Six 160×160 spot illustrations for the landing bento tiles.",
    scenes: [
      { name: "SpotCertificate", note: "160×160 · expiring certificate", w: 160, render: (s) => <SpotCertificate size={s} /> },
      { name: "SpotPayment", note: "160×160 · structured payments", w: 160, render: (s) => <SpotPayment size={s} /> },
      { name: "SpotDeadline", note: "160×160 · approaching deadline", w: 160, render: (s) => <SpotDeadline size={s} /> },
      { name: "SpotAccess", note: "160×160 · record access", w: 160, render: (s) => <SpotAccess size={s} /> },
      { name: "SpotVendor", note: "160×160 · vendor document missing", w: 160, render: (s) => <SpotVendor size={s} /> },
      { name: "SpotCode", note: "160×160 · secret in code", w: 160, render: (s) => <SpotCode size={s} /> },
    ],
  },
  {
    title: "Product scenes",
    sentence: "The policy-to-check scroll scene and the audit pack fan.",
    scenes: [
      { name: "PolicyToChecks", note: "560×320 · highlighted clause pulls into a check card with a toggle", w: 560, render: (s) => <PolicyToChecks size={s} /> },
      { name: "AuditPackFan", note: "480×360 · fanned report pages, seal on the top page", w: 480, render: (s) => <AuditPackFan size={s} /> },
    ],
  },
  {
    title: "Empty states and errors",
    sentence: "240×160 each. Every empty state says what is good or what to do next.",
    scenes: [
      { name: "EmptyAlerts", note: "240×160 · sealed folder — nothing needs attention", w: 240, render: (s) => <EmptyAlerts size={s} /> },
      { name: "EmptyEvidence", note: "240×160 · all evidence verified", w: 240, render: (s) => <EmptyEvidence size={s} /> },
      { name: "EmptyObligations", note: "240×160 · nothing found yet", w: 240, render: (s) => <EmptyObligations size={s} /> },
      { name: "EmptySearch", note: "240×160 · no results", w: 240, render: (s) => <EmptySearch size={s} /> },
      { name: "EmptyCoverageGap", note: "240×160 · unconnected thread end — no automated check", w: 240, render: (s) => <EmptyCoverageGap size={s} /> },
      { name: "ErrorDroppedLink", note: "240×160 · a dropped paper link", w: 240, render: (s) => <ErrorDroppedLink size={s} /> },
      { name: "EmptyNotFound", note: "240×160 · page not found", w: 240, render: (s) => <EmptyNotFound size={s} /> },
    ],
  },
  {
    title: "Moments",
    sentence: "96×96 micro-moments for confirmations and alerts.",
    scenes: [
      { name: "SealedConfirmation", note: "96×96 · saved to audit record", w: 96, render: (s) => <SealedConfirmation size={s} /> },
      { name: "TamperDetected", note: "96×96 · a link tore", w: 96, render: (s) => <TamperDetected size={s} /> },
      { name: "RecordsVerified", note: "96×96 · records verified", w: 96, render: (s) => <RecordsVerified size={s} /> },
    ],
  },
];

export default function IllustrationsPage() {
  return (
    <main
      style={{
        maxWidth: "980px",
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
          <p style={{ fontSize: "var(--fs-label)", marginBottom: "4px" }}>
            <Link href="/styleguide" style={{ color: "var(--accent)" }}>
              Styleguide
            </Link>{" "}
            / Illustration kit
          </p>
          <h1
            style={{
              fontSize: "var(--fs-title)",
              fontWeight: 600,
              lineHeight: "28px",
            }}
          >
            Illustration kit — “Paper and thread”
          </h1>
          <p style={{ color: "var(--text-2)", maxWidth: "var(--max-prose)" }}>
            Kit parts and scenes, each rendered at 1× and 2×. Parts are drawn
            only from the illustration palette with a uniform 2px ink outline
            and a hard offset shadow; every layer has a name for animation.
            Scenes are composed from kit parts on an 8px grid.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          marginTop: "32px",
        }}
      >
        {SPECS.map((spec) => (
          <SpecCard key={spec.name} spec={spec} />
        ))}
      </div>

      <div style={{ marginTop: "56px" }}>
        <h2
          style={{
            fontSize: "var(--fs-title)",
            fontWeight: 600,
            lineHeight: "28px",
            marginBottom: "24px",
          }}
        >
          Scene library
        </h2>
        {SCENE_GROUPS.map((group) => (
          <section
            key={group.title}
            style={{
              padding: "32px 0",
              borderTop: "1px solid var(--line)",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              {group.title}
            </h3>
            <p
              style={{
                color: "var(--text-2)",
                maxWidth: "var(--max-prose)",
                marginBottom: "20px",
              }}
            >
              {group.sentence}
            </p>
            <div
              style={{
                display: "grid",
                gap: "16px",
                gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
              }}
            >
              {group.scenes.map((spec) => (
                <SceneCard key={spec.name} spec={spec} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
