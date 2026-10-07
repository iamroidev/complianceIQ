import type { Severity } from "../types";
import { assertIsoUtcMs } from "../clock";

/** SLA per severity, measured on the injected clock (MASTER §6.3). */
const SLA_MS: Record<Severity, number> = {
  critical: 4 * 60 * 60 * 1_000,
  high: 24 * 60 * 60 * 1_000,
  medium: 72 * 60 * 60 * 1_000,
  low: 7 * 24 * 60 * 60 * 1_000,
};

export function slaMsFor(severity: Severity): number {
  return SLA_MS[severity];
}

export function slaDueAt(severity: Severity, from: string): string {
  assertIsoUtcMs(from, "slaDueAt from");
  return new Date(Date.parse(from) + SLA_MS[severity]).toISOString();
}
