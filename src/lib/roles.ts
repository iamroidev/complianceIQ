/**
 * Role identity and personas, kept JSX-free so plain modules (case-text) and
 * non-React unit tests can import them without a React transform.
 */

export type Role = "officer" | "auditor" | "admin";

/** The named person behind each role (registration personas, DESIGN §29.1). */
export const ROLE_PEOPLE: Record<Role, string> = {
  officer: "Mara Osei",
  auditor: "Idris Bello",
  admin: "Sofia Lindqvist",
};

/** Ledger actors are roles or system addresses — this is the sentence form. */
export function actorName(actor: string): string {
  const lowered = actor.trim().toLowerCase();
  if (lowered === "officer" || lowered === "auditor" || lowered === "admin") {
    return ROLE_PEOPLE[lowered];
  }
  return actor;
}
