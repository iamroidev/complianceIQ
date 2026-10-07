import {
  RESPONSE_CATALOG,
  type ResponseId,
  type ResponseMode,
} from "@/core/responses/response-rules";

export const RESPONSE_MODE_LABEL: Record<ResponseMode, string> = {
  off: "Off",
  suggest: "Suggest only",
  automatic: "Automatic",
};

/** Each response reads as one sentence (DESIGN §13). */
export const RESPONSE_SENTENCE: Record<ResponseId, string> = {
  "suspend-token-on-mfa-disabled": "If someone turns off two-step sign-in, suspend their access token.",
  "block-pipeline-on-secret": "If a secret is committed to a repository, block the pipeline until it is rotated.",
  "request-renewal-from-owner": "If a certificate or vendor document expires, request a renewal from the record owner.",
};

/** The plain condition behind each response, for the three-step strip. */
export const RESPONSE_TRIGGER: Record<ResponseId, string> = {
  "suspend-token-on-mfa-disabled": "A person turns off two-step sign-in.",
  "block-pipeline-on-secret": "A commit contains a secret.",
  "request-renewal-from-owner": "A certificate or a vendor document passes its expiry date.",
};

export const RESPONSE_RECORDED =
  "The request and its outcome are written to the audit record.";

export interface ResponseRow {
  id: ResponseId;
  title: string;
  summary: string;
  sentence: string;
  trigger: string;
  ruleIds: string[];
}

export function responseRows(): ResponseRow[] {
  return RESPONSE_CATALOG.map((entry) => ({
    id: entry.id,
    title: entry.title,
    summary: entry.summary,
    sentence: RESPONSE_SENTENCE[entry.id],
    trigger: RESPONSE_TRIGGER[entry.id],
    ruleIds: [...entry.ruleIds],
  }));
}

/**
 * "3 responses are on. All are set to suggest only." - counts what the
 * settings actually say, so the sentence never drifts from the controls.
 */
export function responseHeadline(settings: Record<string, ResponseMode>): string {
  const modes = Object.values(settings);
  if (modes.length === 0) return "No responses are configured.";
  const suggest = modes.filter((mode) => mode === "suggest").length;
  const automatic = modes.filter((mode) => mode === "automatic").length;
  const on = suggest + automatic;
  const first =
    on === 0 ? "No responses are on." : `${on} ${on === 1 ? "response is" : "responses are"} on.`;
  let second: string;
  if (on === 0) {
    second = modes.length === 1 ? "It is off." : "All are off.";
  } else if (suggest === on) {
    second =
      on === 1 ? "It is set to suggest only." : "All are set to suggest only.";
  } else if (automatic === on) {
    second = on === 1 ? "It runs automatically." : "All run automatically.";
  } else {
    second = `${suggest} ${suggest === 1 ? "is" : "are"} set to suggest only and ${automatic} ${
      automatic === 1 ? "runs" : "run"
    } automatically.`;
  }
  return `${first} ${second}`;
}
