"use client";

import { useEffect, useRef, useState } from "react";
import {
  THEME_IDS,
  THEME_NAMES,
  THEME_SWATCHES,
  chooseTheme,
  initTheme,
  watchTheme,
  type ThemeId,
} from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>("mist");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(initTheme());
    const onSameTab = () => {
      const el = document.documentElement;
      const id = THEME_IDS.find((t) => t === el.dataset.theme);
      if (id) setTheme(id);
    };
    document.addEventListener("ciq-theme-change", onSameTab);
    const unwatch = watchTheme((id) => setTheme(id));
    return () => {
      document.removeEventListener("ciq-theme-change", onSameTab);
      unwatch();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { canvas, structure } = THEME_SWATCHES[theme];

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${THEME_NAMES[theme]}. Change theme`}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          minHeight: "32px",
          padding: "0 10px",
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-control)",
          fontSize: "var(--fs-label)",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <span aria-hidden="true" style={{ display: "flex", gap: "2px" }}>
          <span style={{ width: "10px", height: "14px", background: canvas, border: "1px solid var(--line)" }} />
          <span style={{ width: "10px", height: "14px", background: structure }} />
        </span>
        {THEME_NAMES[theme]}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 20,
            minWidth: "180px",
            padding: "4px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-container)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
          }}
        >
          {THEME_IDS.map((id) => {
            const selected = theme === id;
            const { canvas: c, structure: s } = THEME_SWATCHES[id];
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(id);
                  chooseTheme(id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  minHeight: "32px",
                  padding: "4px 8px",
                  background: selected ? "var(--surface-2)" : "transparent",
                  border: "none",
                  borderRadius: "var(--r-control)",
                  color: "var(--text)",
                  fontSize: "var(--fs-label)",
                  fontWeight: selected ? 600 : 400,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span aria-hidden="true" style={{ display: "flex", gap: "2px" }}>
                  <span style={{ width: "10px", height: "14px", background: c, border: "1px solid var(--line)" }} />
                  <span style={{ width: "10px", height: "14px", background: s }} />
                </span>
                {THEME_NAMES[id]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
