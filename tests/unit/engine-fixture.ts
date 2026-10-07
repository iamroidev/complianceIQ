import type { ComplianceEvent, RuleContext, RuleResult } from "../../src/core/types";
import type { AnyRuleModule } from "../../src/core/engine/types";

export const KOFI = { id: "p_kofi", name: "Kofi Adjei-Boateng", role: "Treasury manager" };
export const AMA = { id: "p_ama", name: "Ama Serwaa Owusu", role: "Clinical nurse" };
export const OWUSU = { id: "p_owusu", name: "A. Owusu", role: "Developer" };
export const DANIEL = { id: "p_daniel", name: "Daniel Aterah", role: "Security engineer" };

type EventOverrides = Partial<Omit<ComplianceEvent, "actor" | "resource" | "context">> & {
  actor?: Partial<ComplianceEvent["actor"]>;
  resource?: Partial<ComplianceEvent["resource"]>;
  context?: Record<string, unknown>;
};

export function makeEvent(overrides?: EventOverrides): ComplianceEvent {
  const rest = { ...overrides };
  delete rest.actor;
  delete rest.resource;
  delete rest.context;
  return {
    ...rest,
    id: rest.id ?? "evt_test",
    domain: rest.domain ?? "finance",
    action: rest.action ?? "cash_deposit",
    timestamp: rest.timestamp ?? "2026-01-10T09:00:00.000Z",
    source: rest.source ?? "test",
    actor: { ...KOFI, ...(overrides?.actor ?? {}) },
    resource: {
      type: "account",
      id: "acc_1",
      label: "Operating account",
      ...(overrides?.resource ?? {}),
    },
    context: { ...(overrides?.context ?? {}) },
  };
}

export function emptyRegisters(): RuleContext["registers"] {
  return {
    people: [],
    certifications: [],
    requirements: [],
    vendors: [],
    accounts: [],
    obligations: [],
  };
}

/** Partial registers on top of an empty baseline (state-rule fixtures). */
export function registers(partial: Partial<RuleContext["registers"]>): RuleContext["registers"] {
  return { ...emptyRegisters(), ...partial };
}

export function makeCtx(overrides?: Partial<RuleContext>): RuleContext {
  return {
    events: [],
    registers: emptyRegisters(),
    asOf: "2026-03-01T09:00:00.000Z",
    ...overrides,
  };
}

/** Determinism + no-input-mutation probe required for every rule (§11). */
export function purityProbe(
  rule: AnyRuleModule,
  ctx: RuleContext,
  params?: Record<string, unknown>,
): { first: RuleResult[]; second: RuleResult[]; ctxUnchanged: boolean } {
  const snapshot = structuredClone(ctx);
  const first = rule.evaluate(ctx, params);
  const second = rule.evaluate(ctx, params);
  return {
    first,
    second,
    ctxUnchanged: JSON.stringify(ctx) === JSON.stringify(snapshot),
  };
}
