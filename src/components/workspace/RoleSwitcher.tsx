"use client";

import { ROLE_IDS, ROLE_NAMES, useRole, type Role } from "./role-context";

export const ROLE_NOTE: Record<Role, string> = {
  officer:
    "Decides what happens to an alert, edits the people and vendor records, and confirms what a policy contains.",
  auditor:
    "Reads everything, verifies the record and exports reports. Cannot decide an alert or change a setting.",
  admin:
    "Changes response modes, runs the demo controls and resets the demo. Everything else the officer can do.",
};

/**
 * The signed-in role (MASTER §8). One control, three choices, and the plain
 * sentence describing what that role may do.
 */
export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div className="st-role">
      <fieldset className="seg">
        <legend className="sr-only">Signed in as</legend>
        {ROLE_IDS.map((id) => (
          <label className={`seg-opt${role === id ? " is-on" : ""}`} key={id}>
            <input
              type="radio"
              name="st-role"
              value={id}
              checked={role === id}
              onChange={() => setRole(id)}
            />
            <span>{ROLE_NAMES[id]}</span>
          </label>
        ))}
      </fieldset>
      <p className="st-note">{ROLE_NOTE[role]}</p>
    </div>
  );
}
