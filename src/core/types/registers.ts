import { z } from "zod";
import { IsoUtcMs } from "./common";
import { Obligation } from "./policy";

const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected a calendar date (2026-01-15)");

export const Person = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  department: z.string().min(1),
  status: z.enum(["active", "leave", "terminated"]),
  managerId: z.string().optional(),
});

export const Certification = z.object({
  id: z.string().min(1),
  personId: z.string().min(1),
  type: z.string().min(1),
  issuer: z.string().optional(),
  issuedOn: DateOnly,
  expiresOn: DateOnly.optional(),
  evidenceId: z.string().optional(),
});

export const Requirement = z.object({
  id: z.string().min(1),
  appliesTo: z.object({
    role: z.string().optional(),
    department: z.string().optional(),
  }),
  certType: z.string().min(1),
  criticality: z.enum(["standard", "high"]),
  obligationId: z.string().min(1),
});

export const VendorDocument = z.object({
  type: z.enum(["soc2_report", "dpa", "insurance", "pen_test", "contract"]),
  validFrom: DateOnly,
  expiresOn: DateOnly.optional(),
  evidenceId: z.string().optional(),
});

export const Vendor = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tier: z.enum(["critical", "standard"]),
  ownerId: z.string().min(1),
  documents: z.array(VendorDocument),
  lastReviewedOn: DateOnly.optional(),
});

export const Account = z.object({
  id: z.string().min(1),
  personId: z.string().min(1),
  system: z.string().min(1),
  privileged: z.boolean(),
  lastActiveOn: DateOnly,
  mfaEnabled: z.boolean(),
});

/** Registers are compared as of a clock time, never mutated in place. */
export const Registers = z.object({
  people: z.array(Person),
  certifications: z.array(Certification),
  requirements: z.array(Requirement),
  vendors: z.array(Vendor),
  accounts: z.array(Account),
  obligations: z.array(Obligation),
  models: z.array(z.unknown()).optional(),
  datasets: z.array(z.unknown()).optional(),
});

/** Marks a register row as it existed at a point in time (evidence snapshots). */
export const AsOfStamp = IsoUtcMs;

export type Person = z.infer<typeof Person>;
export type Certification = z.infer<typeof Certification>;
export type Requirement = z.infer<typeof Requirement>;
export type VendorDocument = z.infer<typeof VendorDocument>;
export type Vendor = z.infer<typeof Vendor>;
export type Account = z.infer<typeof Account>;
export type Registers = z.infer<typeof Registers>;
