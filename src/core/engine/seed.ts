import { Registers } from "../types";
import type { Registers as RegistersType } from "../types";
import people from "../../data/seed/people.json";
import certifications from "../../data/seed/certifications.json";
import requirements from "../../data/seed/requirements.json";
import vendors from "../../data/seed/vendors.json";
import accounts from "../../data/seed/accounts.json";
import obligations from "../../data/seed/obligations.json";

/** Demo clock anchor: the seeded state is observed at this instant (§7.3, §7.8). */
export const SEED_T0 = "2026-03-01T09:00:00.000Z";

/** Seed registers are parsed through zod so schema drift fails loudly at load. */
export function loadSeedRegisters(): RegistersType {
  return Registers.parse({
    people,
    certifications,
    requirements,
    vendors,
    accounts,
    obligations,
  });
}
