import type { Registers } from "../types";

/** Register rows that reference a subject — the raw facts an alert was based on. */
export interface SubjectSnapshot {
  people: Registers["people"];
  certifications: Registers["certifications"];
  requirements: Registers["requirements"];
  vendors: Registers["vendors"];
  accounts: Registers["accounts"];
  obligations: Registers["obligations"];
}

function references(value: unknown, subjectId: string): boolean {
  if (typeof value === "string") return value === subjectId;
  if (Array.isArray(value)) return value.some((entry) => references(entry, subjectId));
  if (value !== null && typeof value === "object") {
    return Object.values(value).some((entry) => references(entry, subjectId));
  }
  return false;
}

/**
 * Collects every register row that points at the subject (ids at any depth),
 * plus — for a person subject — the requirements their role and department
 * pull in, since those are what made the certification mandatory.
 */
export function subjectSnapshot(registers: Registers, subjectId: string): SubjectSnapshot {
  const rows = <T,>(list: readonly T[]): T[] => list.filter((row) => references(row, subjectId));
  const person = registers.people.find((candidate) => candidate.id === subjectId);
  const requirements = person
    ? registers.requirements.filter(
        (requirement) =>
          (requirement.appliesTo.role === undefined ||
            requirement.appliesTo.role === person.role) &&
          (requirement.appliesTo.department === undefined ||
            requirement.appliesTo.department === person.department),
      )
    : rows(registers.requirements);

  return {
    people: rows(registers.people),
    certifications: rows(registers.certifications),
    requirements,
    vendors: rows(registers.vendors),
    accounts: rows(registers.accounts),
    obligations: rows(registers.obligations),
  };
}
