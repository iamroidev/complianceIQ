import type { DossierKind } from "../types";

/** Dossier outlines, exactly as listed in MASTER §7.4 B. */
export const DOSSIER_OUTLINES: Record<DossierKind, readonly string[]> = {
  sar: ["Subject", "Chronology", "Deviation from baseline", "Evidence attached", "Recommendation"],
  soc2_deficiency: ["Control", "Impact", "Compensating controls", "Remediation plan"],
  hipaa_4factor: [
    "Nature of information",
    "Who accessed",
    "Mitigation",
    "Likelihood of compromise",
  ],
  te_disallowance: ["Expense and category", "Policy breach", "Manager justification needed"],
  secure_sdlc_finding: ["Found", "Exposure", "Fix", "Prevention"],
  exception_memo: [
    "Finding",
    "Requirement",
    "Impact",
    "Corrective action",
    "Owner and due date",
  ],
};
