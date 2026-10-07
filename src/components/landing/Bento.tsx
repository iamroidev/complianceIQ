"use client";

import { useState } from "react";
import {
  SpotAccess,
  SpotCertificate,
  SpotCode,
  SpotDeadline,
  SpotPayment,
  SpotVendor,
} from "@/components/illustration/scenes";
import { TILES } from "./content";

function spotFor(key: string, hint: boolean) {
  switch (key) {
    case "certifications":
      return <SpotCertificate size={160} hint={hint} />;
    case "payments":
      return <SpotPayment size={160} hint={hint} />;
    case "deadlines":
      return <SpotDeadline size={160} hint={hint} />;
    case "access":
      return <SpotAccess size={160} />;
    case "vendors":
      return <SpotVendor size={160} missing={false} hint={hint} />;
    case "code":
      return <SpotCode size={160} />;
    default:
      return null;
  }
}

/** Six areas as ruled ledger rows: art, serif title, one sentence each (§19.5). */
export function Bento() {
  const [hinted, setHinted] = useState<string | null>(null);

  return (
    <div className="lp-bento">
      {TILES.map((tile) => {
        const hint = hinted === tile.key;
        return (
          <div
            key={tile.key}
            className="lp-tile"
            data-hint={hint ? "true" : undefined}
            onMouseEnter={() => setHinted(tile.key)}
            onMouseLeave={() => setHinted((current) => (current === tile.key ? null : current))}
          >
            <div className="lp-tile-art">{spotFor(tile.key, hint)}</div>
            <div className="lp-tile-text">
              <h3>{tile.title}</h3>
              <p>{tile.sentence}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
