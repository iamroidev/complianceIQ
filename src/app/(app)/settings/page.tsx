"use client";

import { AboutScreenPanel } from "@/components/workspace/AboutScreenPanel";

import { useEffect, useState } from "react";
import { ReduceMotionToggle } from "@/components/ReduceMotionToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RoleSwitcher } from "@/components/workspace/RoleSwitcher";
import {
  DENSITY_CHANGE_EVENT,
  DENSITY_IDS,
  DENSITY_NAMES,
  DENSITY_NOTE,
  chooseDensity,
  initDensity,
  watchDensity,
  type Density,
} from "@/lib/density";

/**
 * Settings (MASTER §10): what this browser remembers - the signed-in role,
 * the palette, row height and motion. Nothing here writes to a record.
 */
export default function SettingsPage() {
  const [density, setDensity] = useState<Density>("comfortable");

  useEffect(() => {
    setDensity(initDensity());
    const onSameTab = () => {
      const value = document.documentElement.dataset.density;
      setDensity(value === "compact" ? "compact" : "comfortable");
    };
    document.addEventListener(DENSITY_CHANGE_EVENT, onSameTab);
    const unwatch = watchDensity(setDensity);
    return () => {
      document.removeEventListener(DENSITY_CHANGE_EVENT, onSameTab);
      unwatch();
    };
  }, []);

  return (
    <div className="page-case-room">
      <header className="page-header-block">
        <div>
          <h1 className="page-serif-title">Settings</h1>
          <p className="page-serif-headline">
            These settings change how this app looks and what your role may do. They never change a
            saved record.
          </p>
          <p className="page-note">
            Saved in this browser only. The records themselves stay in the audit record, where a
            change shows up.
          </p>
        </div>
      </header>

      {/* About this screen panel (§30.5, §30.6) */}
      <AboutScreenPanel screenKey="settings" />

      <h2 className="ov-title">Who you are signed in as</h2>
      <div className="st-card">
        <RoleSwitcher />
      </div>

      <h2 className="ov-title">How it looks</h2>
      <div className="st-card">
        <div className="st-row">
          <span className="st-label">Theme</span>
          <ThemeToggle />
        </div>
        <div className="st-row">
          <span className="st-label">Row height</span>
          <fieldset className="seg">
            <legend className="sr-only">Row height</legend>
            {DENSITY_IDS.map((id) => (
              <label className={`seg-opt${density === id ? " is-on" : ""}`} key={id}>
                <input
                  type="radio"
                  name="st-density"
                  value={id}
                  checked={density === id}
                  onChange={() => {
                    setDensity(id);
                    chooseDensity(id);
                  }}
                />
                <span>{DENSITY_NAMES[id]}</span>
              </label>
            ))}
          </fieldset>
        </div>
        <p className="st-note">{DENSITY_NOTE[density]}</p>
      </div>

      <h2 className="ov-title">Motion</h2>
      <div className="st-card">
        <div className="st-row">
          <span className="st-label">Movement</span>
          <ReduceMotionToggle />
        </div>
        <p className="st-note">
          Turns off the movement across the app and keeps every state readable in colour and text.
          This overrides your system setting in both directions.
        </p>
      </div>

      <p className="page-note st-foot">
        This build runs on demo data. Nothing here connects to a real system.
      </p>
    </div>
  );
}
