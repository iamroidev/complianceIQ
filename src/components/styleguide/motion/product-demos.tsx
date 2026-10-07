"use client";

import { useEffect, useRef, useState } from "react";
import { ReplayCard } from "./ReplayCard";

function AlertDemo({ play }: { play: boolean }) {
  return (
    <div className="ml-alerts">
      <div className="ml-alert-row">
        <span className="ml-dot-sev is-medium" aria-hidden="true" />
        Medium · Access review overdue
        <span className="ml-alert-meta">IAM · 14 min ago</span>
      </div>
      <div className="ml-alert-new">
        <div className="ml-alert-row">
          <span className="ml-dot-sev is-critical" aria-hidden="true" />
          Critical · Payment threshold breached
          <span className="ml-alert-meta">Finance · 2 min ago</span>
        </div>
      </div>
      <p className="ml-sr" aria-live="polite">
        {play ? "Critical alert: payment threshold breached" : ""}
      </p>
    </div>
  );
}

function CaseDemo() {
  return (
    <div className="ml-case">
      <div className="ml-case-row is-active">
        <span className="ml-dot-sev is-critical" aria-hidden="true" />
        Critical · Payment threshold breached
        <span className="ml-alert-meta">case 118</span>
      </div>
      <div className="ml-case-detail">
        Policy “Spend limits” §4 — Contoso invoice USD 9,800 exceeds the 9,000
        threshold. Evidence attached, hash 9f2a…c4.
      </div>
    </div>
  );
}

const TABS = ["Alerts", "Cases", "Policies"];
const PANELS = [
  "12 open alerts · 3 critical",
  "31 cases · 4 awaiting evidence",
  "18 policies · 2 drafts",
];

function TabsDemo({ run }: { run: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (run > 0) setI(1);
  }, [run]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
      <div className="ml-tabs" role="tablist" aria-label="Workspace views">
        {TABS.map((t, k) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={i === k}
            aria-controls="ml-tabpanel"
            className="ml-tab"
            onClick={() => setI(k)}
          >
            {t}
          </button>
        ))}
        <span className="ml-tabs-ul" style={{ transform: `translateX(${i * 96}px)` }} aria-hidden="true" />
      </div>
      <div id="ml-tabpanel" className="ml-tabpanel" role="tabpanel">
        {PANELS[i]}
      </div>
    </div>
  );
}

function DrawerDemo({ run }: { run: number }) {
  const [open, setOpen] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (run === 0) return;
    setOpen(true);
    const t = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 80);
    return () => clearTimeout(t);
  }, [run]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="ml-drawer-stage">
      <div className="ml-drawer-list" aria-hidden="true">
        <div className="ml-drawer-line" style={{ width: "86%" }} />
        <div className="ml-drawer-line" style={{ width: "64%" }} />
        <div className="ml-drawer-line" style={{ width: "74%" }} />
      </div>
      <button
        ref={triggerRef}
        type="button"
        className="ml-drawer-open-btn"
        onClick={() => {
          setOpen(true);
          setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 260);
        }}
      >
        Open policy note
      </button>
      <aside
        className={`ml-drawer${open ? "" : " is-closed"}`}
        aria-label="Policy note"
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      >
        <h4>Policy note · Spend limits</h4>
        <p>Vendors may not exceed USD 9,000 per invoice without a second approval (§4.2).</p>
        <button ref={closeRef} type="button" className="ml-drawer-close" onClick={close}>
          Close note (Esc)
        </button>
      </aside>
    </div>
  );
}

function NumbersDemo({ run }: { run: number }) {
  const [n, setN] = useState(37);

  useEffect(() => {
    if (run === 0) return;
    if (document.documentElement.dataset.reduceMotion === "true") {
      setN(37);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 400);
      setN(Math.round(37 * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run]);

  return (
    <div className="ml-num-block">
      <span className="ml-num">{n}</span>
      <span className="ml-num-label">open alerts · counts up once, never on refresh</span>
    </div>
  );
}

function SkeletonDemo() {
  return (
    <div className="ml-skel-panel">
      <div className="ml-skel-row">
        <span className="ml-skel is-circle ml-anim" aria-hidden="true" />
        <span className="ml-skel is-line ml-anim" style={{ flex: 1 }} aria-hidden="true" />
      </div>
      <div className="ml-skel-row">
        <span className="ml-skel is-line ml-anim" style={{ flex: 1 }} aria-hidden="true" />
        <span className="ml-skel is-line is-w40 ml-anim" aria-hidden="true" />
      </div>
      <div className="ml-skel-row">
        <span className="ml-skel is-line ml-anim" style={{ flex: 1 }} aria-hidden="true" />
        <span className="ml-skel is-line is-w40 ml-anim" aria-hidden="true" />
      </div>
      <span className="ml-sr">Loading rows</span>
    </div>
  );
}

const SEG = ["Open", "Review", "Closed"];

function TogglesDemo({ run }: { run: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (run > 0) setI(1);
  }, [run]);

  return (
    <div className="ml-seg" role="group" aria-label="Case status">
      <span className="ml-seg-thumb" style={{ transform: `translateX(${i * 76}px)` }} aria-hidden="true" />
      {SEG.map((o, k) => (
        <button
          key={o}
          type="button"
          aria-pressed={i === k}
          className="ml-seg-btn"
          onClick={() => setI(k)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function ButtonsDemo() {
  return (
    <div className="ml-btn-row">
      <div className="ml-btn-cell">
        <button type="button" className="ml-btn ml-btn-primary">
          Save record
        </button>
        <span>bg 90ms · press translateY(1px)</span>
      </div>
      <div className="ml-btn-cell">
        <button type="button" className="ml-btn ml-btn-secondary">
          Cancel
        </button>
        <span>hover --dur-instant</span>
      </div>
      <div className="ml-btn-cell">
        <button type="button" className="ml-btn ml-btn-fakefocus">
          Review evidence
        </button>
        <span>focus ring instant</span>
      </div>
    </div>
  );
}

export function ProductDemos() {
  return (
    <>
      <ReplayCard
        slug="product-alert"
        title="New alert arrives"
        spec="§17: row expands 200ms --ease-out, background highlight fades over 1.2s, announced via aria-live=polite. Does not move the selected row."
        duration={1200}
      >
        {({ play }) => <AlertDemo play={play} />}
      </ReplayCard>

      <ReplayCard
        slug="product-case"
        title="Open case"
        spec="§17: list-to-detail — detail fades and rises 8px, 160ms."
        duration={160}
      >
        {() => <CaseDemo />}
      </ReplayCard>

      <ReplayCard
        slug="product-tabs"
        title="Tabs"
        spec="§17: underline slides between tabs (shared layout), 200ms. Tabs are clickable."
        duration={200}
      >
        {({ run }) => <TabsDemo run={run} />}
      </ReplayCard>

      <ReplayCard
        slug="product-drawer"
        title="Drawer / policy note"
        spec="§17: slides 240ms --ease-out, focus moves in, Esc closes and returns focus to the trigger."
        duration={240}
      >
        {({ run }) => <DrawerDemo run={run} />}
      </ReplayCard>

      <ReplayCard
        slug="product-numbers"
        title="Numbers on Overview"
        spec="§17: count up once on first view, 400ms; never on refresh (resting value is already final)."
        duration={400}
      >
        {({ run }) => <NumbersDemo run={run} />}
      </ReplayCard>

      <ReplayCard
        slug="product-skeleton"
        title="Skeleton loaders"
        spec="§17: soft shimmer 1.4s, opacity only. Under reduced motion it stops after a 150ms fade."
        duration={1400}
      >
        {() => <SkeletonDemo />}
      </ReplayCard>

      <ReplayCard
        slug="product-toggles"
        title="Toggles and segmented controls"
        spec="§17: 160ms, --ease-spring allowed. Clickable; the thumb springs to the active segment."
        duration={160}
      >
        {({ run }) => <TogglesDemo run={run} />}
      </ReplayCard>

      <ReplayCard
        slug="product-buttons"
        title="Buttons"
        spec="§17: hover background shift 90ms, press translateY(1px), focus ring appears instantly. The solid red button is the view’s one CTA."
        duration={300}
      >
        {() => <ButtonsDemo />}
      </ReplayCard>
    </>
  );
}
