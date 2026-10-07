import type { Alert, Draft } from "../types";
import { buildTextPdf, type PdfSection } from "./pdf";

export interface SarExportInput {
  alert: Alert;
  draft: Draft;
  generatedBy: string;
  generatedAt: string;
}

export interface SarExport {
  notice: string;
  xml: string;
  json: Record<string, unknown>;
  pdfBase64: string;
}

/** Honest demo label — this is a draft artifact, never a filed report. */
export const SAR_NOTICE =
  "SAR-style draft for the demo — not a filed report, not legal advice, not submitted to any authority.";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * §7.4 exports a SAR-style draft in XML + JSON + PDF from the stored draft.
 * Deterministic: no AI call, no state change, no ledger block (the export is
 * a rendering of already-recorded artefacts).
 */
export async function buildSarExport(input: SarExportInput): Promise<SarExport> {
  const { alert, draft } = input;

  const paragraphXml = draft.paragraphs
    .map((paragraph) => {
      const citations = paragraph.citations
        .map((citation) => `      <citation>${escapeXml(citation)}</citation>`)
        .join("\n");
      const evidenceRefs = paragraph.evidenceRefs
        .map((ref) => `      <evidenceRef type="${escapeXml(ref.type)}" id="${escapeXml(ref.id)}"/>`)
        .join("\n");
      return [
        `    <paragraph id="${escapeXml(paragraph.id)}" origin="${escapeXml(paragraph.origin)}"${paragraph.heading ? ` heading="${escapeXml(paragraph.heading)}"` : ""}>`,
        `      <text>${escapeXml(paragraph.text)}</text>`,
        citations,
        evidenceRefs,
        "    </paragraph>",
      ]
        .filter((line) => line.trim().length > 0)
        .join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<sarDraft id="${escapeXml(draft.id)}" alertId="${escapeXml(alert.id)}" notice="${escapeXml(SAR_NOTICE)}" generatedAt="${escapeXml(input.generatedAt)}" generatedBy="${escapeXml(input.generatedBy)}">`,
    `  <subject id="${escapeXml(alert.subject.id)}" name="${escapeXml(alert.subject.name)}" ruleId="${escapeXml(alert.ruleId)}" domain="${escapeXml(alert.domain)}" severity="${escapeXml(alert.severity)}" riskScore="${alert.riskScore}"/>`,
    `  <summary>${escapeXml(alert.summarySentence)}</summary>`,
    "  <paragraphs>",
    paragraphXml,
    "  </paragraphs>",
    "  <status>draft — not filed</status>",
    "</sarDraft>",
  ].join("\n");

  const json: Record<string, unknown> = {
    kind: "sar-draft",
    notice: SAR_NOTICE,
    status: "draft — not filed",
    alertId: alert.id,
    draftId: draft.id,
    generatedAt: input.generatedAt,
    generatedBy: input.generatedBy,
    subject: alert.subject,
    ruleId: alert.ruleId,
    domain: alert.domain,
    severity: alert.severity,
    riskScore: alert.riskScore,
    summarySentence: alert.summarySentence,
    paragraphs: draft.paragraphs,
  };

  const sections: PdfSection[] = [
    { heading: "Notice", lines: [SAR_NOTICE] },
    {
      heading: "Subject",
      lines: [
        `${alert.subject.name} (${alert.subject.id}) — ${alert.ruleId} — ${alert.domain}/${alert.severity} — risk ${alert.riskScore}`,
        alert.summarySentence,
        `Status: draft — not filed. Generated ${input.generatedAt} by ${input.generatedBy}.`,
      ],
    },
    ...draft.paragraphs.map((paragraph) => ({
      heading: paragraph.heading ?? paragraph.id,
      lines: [
        paragraph.text,
        paragraph.citations.length > 0 ? `Citations: ${paragraph.citations.join("; ")}` : "",
        paragraph.evidenceRefs.length > 0
          ? `Evidence: ${paragraph.evidenceRefs.map((ref) => `${ref.type}:${ref.id}`).join(", ")}`
          : "",
      ],
    })),
  ];
  const pdfBase64 = await buildTextPdf(`SAR-style draft — ${alert.subject.name}`, sections);

  return { notice: SAR_NOTICE, xml, json, pdfBase64 };
}
