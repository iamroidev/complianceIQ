import { z } from "zod";
import type { Alert } from "../types";

/** §7.9 — a response is off, suggested or executed automatically. */
export const ResponseMode = z.enum(["off", "suggest", "automatic"]);
export type ResponseMode = z.infer<typeof ResponseMode>;

export const RESPONSE_CATALOG_IDS = [
  "suspend-token-on-mfa-disabled",
  "block-pipeline-on-secret",
  "request-renewal-from-owner",
] as const;
export const ResponseId = z.enum(RESPONSE_CATALOG_IDS);
export type ResponseId = z.infer<typeof ResponseId>;

export const ResponseSettings = z.record(ResponseId, ResponseMode);
export type ResponseSettings = z.infer<typeof ResponseSettings>;

export interface CatalogResponse {
  id: ResponseId;
  title: string;
  /** What the executor would do, in plain language. */
  summary: string;
  /** Tier 1 rules whose alerts this response reacts to. */
  ruleIds: readonly string[];
}

/**
 * The §7.9 catalog. `ruleIds` is the trigger map: `suspend-token-on-mfa-disabled`
 * has no Tier 1 trigger (no MFA rule in Tier 1) and stays a catalog entry only.
 */
export const RESPONSE_CATALOG: readonly CatalogResponse[] = [
  {
    id: "suspend-token-on-mfa-disabled",
    title: "Suspend access token when MFA is disabled",
    summary: "Suspend the person's access token and require a fresh sign-in with MFA enabled.",
    ruleIds: [],
  },
  {
    id: "block-pipeline-on-secret",
    title: "Block the pipeline when a secret is committed",
    summary: "Block CI for the affected repository until the exposed secret is rotated.",
    ruleIds: ["DEV-001"],
  },
  {
    id: "request-renewal-from-owner",
    title: "Request renewal from the record owner",
    summary:
      "Draft a renewal request to the record owner (certificate holder or vendor manager). No message is sent.",
    ruleIds: ["CERT-001", "VEND-001"],
  },
];

export function defaultResponseSettings(): ResponseSettings {
  const settings: Record<string, ResponseMode> = {};
  for (const entry of RESPONSE_CATALOG) settings[entry.id] = "suggest";
  return ResponseSettings.parse(settings);
}

export interface ResponseSuggestion {
  alertId: string;
  ruleId: string;
  responseId: ResponseId;
  title: string;
  summary: string;
  mode: ResponseMode;
  /** The request the executor would make; shown under "Show technical details". */
  wouldBeRequest: WouldBeRequest;
}

export interface WouldBeRequest {
  action: string;
  target: string;
  reason: string;
  [key: string]: unknown;
}

function wouldBeRequest(entry: CatalogResponse, alert: Alert): WouldBeRequest {
  const subject = alert.subject.name;
  switch (entry.id) {
    case "suspend-token-on-mfa-disabled":
      return {
        action: "suspend_access_token",
        target: alert.subject.id,
        reason: alert.summarySentence,
      };
    case "block-pipeline-on-secret":
      return {
        action: "block_ci_pipeline",
        target: subject,
        reason: alert.summarySentence,
        rotateSecret: true,
      };
    case "request-renewal-from-owner":
      return {
        action: "draft_renewal_message",
        target: subject,
        owner: subject,
        reason: alert.summarySentence,
        sends: false,
      };
  }
}

/** Response suggestions for an alert under the current settings (§7.9). */
export function evaluateResponses(
  alert: Alert,
  settings: ResponseSettings,
): ResponseSuggestion[] {
  const out: ResponseSuggestion[] = [];
  for (const entry of RESPONSE_CATALOG) {
    if (!entry.ruleIds.includes(alert.ruleId)) continue;
    const mode = settings[entry.id] ?? "suggest";
    if (mode === "off") continue;
    out.push({
      alertId: alert.id,
      ruleId: alert.ruleId,
      responseId: entry.id,
      title: entry.title,
      summary: entry.summary,
      mode,
      wouldBeRequest: wouldBeRequest(entry, alert),
    });
  }
  return out;
}

/** Mode of a single response for the current settings, defaulting to suggest. */
export function modeOf(settings: ResponseSettings, responseId: ResponseId): ResponseMode {
  return settings[responseId] ?? "suggest";
}
