"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * The signed-in role (MASTER §8): officer decides, auditor reads and verifies,
 * admin owns response modes and the demo controls. The API reads it from the
 * `x-ciq-role` header; this provider keeps the switcher's choice, mirrors it on
 * `<html data-role>` for the UI (and tests), and hands out matching headers.
 */

export type Role = "officer" | "auditor" | "admin";

export const ROLE_IDS: readonly Role[] = ["officer", "auditor", "admin"];
export const ROLE_STORAGE_KEY = "ciq-role";
export const ROLE_CHANGE_EVENT = "ciq-role-change";

export const ROLE_NAMES: Record<Role, string> = {
  officer: "Officer",
  auditor: "Auditor",
  admin: "Admin",
};

export { ROLE_PEOPLE, actorName } from "@/lib/roles";

export function isRole(value: string | null): value is Role {
  return value !== null && (ROLE_IDS as readonly string[]).includes(value);
}

/** JSON headers carrying the role (defaults to officer, like `roleOf` on the API). */
export function roleHeaders(role: Role): Record<string, string> {
  return { "x-ciq-role": role, "content-type": "application/json" };
}

interface RoleValue {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleValue | null>(null);

export function useRole(): RoleValue {
  const value = useContext(RoleContext);
  if (!value) throw new Error("useRole must be used inside <Shell>");
  return value;
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("officer");

  useEffect(() => {
    const saved = window.localStorage.getItem(ROLE_STORAGE_KEY);
    const pick: Role = isRole(saved) ? saved : "officer";
    setRoleState(pick);
    document.documentElement.dataset.role = pick;
  }, []);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    document.documentElement.dataset.role = next;
    window.localStorage.setItem(ROLE_STORAGE_KEY, next);
    document.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
  }, []);

  const value = useMemo<RoleValue>(() => ({ role, setRole }), [role, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
