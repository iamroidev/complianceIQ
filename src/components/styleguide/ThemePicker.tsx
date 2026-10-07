"use client";

import { useEffect, useState } from "react";
import {
  chooseTheme,
  initTheme,
  THEME_IDS,
  THEME_SWATCHES,
  type ThemeId,
} from "@/lib/theme";

const THEMES: {
  id: ThemeId;
  name: string;
  blurb: string;
}[] = [
  {
    id: "mist",
    name: "Mist blue",
    blurb: "Cool grey-blue canvas, deep navy structure, signal red. Default.",
  },
  {
    id: "butter",
    name: "Butter",
    blurb: "Butter yellow canvas, marine blue structure, bright red action.",
  },
  {
    id: "paper",
    name: "Warm paper",
    blurb: "Off-white canvas, charcoal type, navy structure, muted red.",
  },
  {
    id: "sand",
    name: "Sand",
    blurb: "Warm sand canvas, espresso structure, terracotta action.",
  },
  {
    id: "dark",
    name: "Dark",
    blurb: "For low-light rooms. Mist is the default product theme.",
  },
];

export function ThemePicker() {
  const [theme, setTheme] = useState<ThemeId>("mist");

  useEffect(() => {
    setTheme(initTheme());
    const onSameTab = () => {
      const id = THEME_IDS.find((t) => t === document.documentElement.dataset.theme);
      if (id) setTheme(id);
    };
    document.addEventListener("ciq-theme-change", onSameTab);
    return () => document.removeEventListener("ciq-theme-change", onSameTab);
  }, []);

  function choose(id: ThemeId) {
    setTheme(id);
    chooseTheme(id);
  }

  return (
    <div role="radiogroup" aria-label="Product theme"
      style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
      {THEMES.map((t) => {
        const selected = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => choose(t.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "8px",
              width: "236px",
              padding: "12px 14px",
              background: "var(--surface)",
              border: selected
                ? "2px solid var(--accent)"
                : "1px solid var(--line)",
              borderRadius: "var(--r-container)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                gap: "8px",
              }}
            >
              <span style={{ fontWeight: 600 }}>{t.name}</span>
              {selected && (
                <span
                  style={{
                    fontSize: "var(--fs-label)",
                    color: "var(--accent)",
                    fontWeight: 500,
                  }}
                >
                  Selected
                </span>
              )}
            </span>
            <span
              style={{ display: "flex", gap: "6px" }}
              aria-hidden="true"
            >
              {[
                THEME_SWATCHES[t.id].canvas,
                THEME_SWATCHES[t.id].structure,
                THEME_SWATCHES[t.id].accent,
              ].map((hex) => (
                <span
                  key={hex}
                  style={{
                    width: "28px",
                    height: "20px",
                    background: hex,
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-control)",
                  }}
                />
              ))}
            </span>
            <span
              style={{
                fontSize: "var(--fs-label)",
                lineHeight: "18px",
                color: "var(--text-3)",
              }}
            >
              {t.blurb}
            </span>
          </button>
        );
      })}
    </div>
  );
}
