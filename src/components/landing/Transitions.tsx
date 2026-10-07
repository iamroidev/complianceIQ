import type { ReactNode } from "react";
import {
  Certificate,
  ChainLink,
  Key,
  Magnifier,
  Paper,
  Seal,
  Stamp,
} from "@/components/illustration/kit";

/* ── Torn sheet edges ──────────────────────────────────────────────
   Each band is a sheet of paper: the previous band's colour hangs over
   the next as a ragged torn edge (DESIGN §16 paper-and-thread).
   Three hand-torn variants, cycled so no two neighbours tear alike. */

const TEAR_PATHS: Record<number, string> = {
  1: "M0 0 H1200 V19 L1152 29 L1104 22 L1050 34 L998 26 L944 37 L890 28 L834 39 L780 30 L726 42 L670 31 L614 41 L560 31 L506 43 L452 33 L398 44 L342 34 L288 45 L234 35 L180 44 L126 34 L72 43 L28 35 L0 29 Z",
  2: "M0 0 H1200 V27 L1158 20 L1110 32 L1062 24 L1010 36 L956 28 L902 39 L850 30 L796 41 L740 32 L688 42 L634 33 L580 44 L526 34 L472 44 L418 35 L364 45 L310 36 L256 45 L202 35 L148 43 L94 33 L42 41 L0 32 Z",
  3: "M0 0 H1200 V23 L1148 35 L1096 25 L1042 38 L988 28 L934 40 L880 30 L826 42 L772 32 L718 43 L662 33 L608 44 L554 34 L500 45 L446 35 L392 45 L338 36 L284 45 L230 35 L176 43 L122 33 L68 42 L22 34 L0 27 Z",
};

export function PaperTear({
  tone,
  variant = 1,
}: {
  /** The colour of the sheet this band tears away from. */
  tone: "canvas" | "white" | "ink";
  variant?: 1 | 2 | 3;
}) {
  return (
    <span className={`lp-tear lp-tear--${tone}`} aria-hidden="true">
      <svg viewBox="0 0 1200 48" preserveAspectRatio="none" focusable="false">
        <path d={TEAR_PATHS[variant]} />
      </svg>
    </span>
  );
}

/* ── Bunting ───────────────────────────────────────────────────────
   A thread swags across the band's top edge and paper artifacts hang
   from it at 20% / 50% / 80%. The drape passes exactly through each
   attach point, so every artifact's string meets the thread. Motion
   (draw + swing-in) lives in motion.ts; without JS it renders drawn. */

type BuntingVariant = "record" | "ai";

const BUNTING: Record<
  BuntingVariant,
  { thread: string; items: { left: string; top: string; art: ReactNode }[] }
> = {
  record: {
    thread:
      "M0 16 C 120 36, 180 50, 240 52 C 360 56, 480 72, 600 74 C 720 76, 860 60, 960 48 C 1060 38, 1140 30, 1200 26",
    items: [
      { left: "20%", top: "54.17%", art: <ChainLink size={44} /> },
      { left: "50%", top: "77.08%", art: <Seal size={44} /> },
      { left: "80%", top: "50%", art: <Certificate size={42} /> },
    ],
  },
  ai: {
    thread:
      "M0 30 C 100 34, 170 44, 240 56 C 350 72, 470 76, 600 70 C 730 64, 850 52, 960 50 C 1070 48, 1150 42, 1200 34",
    items: [
      { left: "20%", top: "58.33%", art: <Stamp size={44} /> },
      { left: "50%", top: "72.92%", art: <Key size={44} /> },
      { left: "80%", top: "52.08%", art: <Paper size={40} lines={3} /> },
    ],
  },
};

export function ThreadBunting({ variant }: { variant: BuntingVariant }) {
  const { thread, items } = BUNTING[variant];
  return (
    <div className="lp-bunting" aria-hidden="true">
      <svg
        className="lp-bunt-svg"
        viewBox="0 0 1200 96"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path className="lp-bunt-thread" d={thread} pathLength={1} />
      </svg>
      {items.map((item) => (
        <span
          className="lp-bunt-item"
          key={`${item.left}-${item.top}`}
          style={{ left: item.left, top: item.top }}
        >
          <span className="lp-bunt-swing">
            <span className="lp-bunt-string" />
            {item.art}
          </span>
        </span>
      ))}
    </div>
  );
}

/* ── Oversized bleed motifs ────────────────────────────────────────
   Big single artifacts that run off the right edge of the page
   (DESIGN §8: illustrations may bleed past the grid). Desktop only;
   motion.ts drifts them ≤24px, the shared reveal fades them in. */

export function BleedMotif({
  kind,
}: {
  kind: "magnifier" | "chain" | "seal" | "stamp";
}) {
  const art = {
    magnifier: <Magnifier size={280} found />,
    chain: <ChainLink size={240} />,
    seal: <Seal size={300} />,
    stamp: <Stamp size={230} />,
  }[kind];
  return (
    <span className={`lp-bleed lp-bleed--${kind}`} aria-hidden="true" data-reveal>
      <span className="lp-bleed-drift">{art}</span>
    </span>
  );
}

/* ── Section Transition Vignettes & Motion Connectors ──────────────
   Physical archival paper slips, brass grommets, and animated thread
   loops that connect one section to the next (DESIGN §16 & §30). */

export function SectionTransitionVignette({
  tag,
  tone = "canvas",
  variant = "knot",
}: {
  tag: string;
  tone?: "canvas" | "white" | "ink";
  variant?: "knot" | "seal" | "eyelet";
}) {
  return (
    <div className={`lp-section-vignette lp-section-vignette--${tone}`} aria-hidden="true">
      <div className="lp-vignette-inner">
        {/* Animated Connecting Thread */}
        <svg
          className="lp-vignette-thread-svg"
          viewBox="0 0 600 48"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            className="lp-vignette-thread"
            d="M 0 24 C 180 8, 240 40, 300 24 C 360 8, 420 40, 600 24"
            stroke="#0B5A4E"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={1}
          />
        </svg>

        {/* Centerpiece Hanging Archival Tag */}
        <div className="lp-vignette-badge" data-reveal>
          {variant === "seal" ? (
            <div className="lp-vignette-seal-pill">
              <span className="lp-vignette-eyelet" />
              <Seal size={28} />
              <span className="lp-vignette-text">{tag}</span>
            </div>
          ) : variant === "eyelet" ? (
            <div className="lp-vignette-slip">
              <span className="lp-vignette-brass-pin" />
              <span className="lp-vignette-text">{tag}</span>
            </div>
          ) : (
            <div className="lp-vignette-knot-badge">
              <span className="lp-vignette-thread-knot" />
              <span className="lp-vignette-text">{tag}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

