import { NextRequest } from "next/server";
import { z } from "zod";
import { extractObligations } from "@/core/ai/extract-obligations";
import { loadCorpus } from "@/core/rag/corpus";
import type { Obligation } from "@/core/types";
import { Obligation as ObligationSchema } from "@/core/types";
import { ApiError, errorResponse, ok, parseOr400, readJson, requireRole } from "../../_http";
import { getState, setRegisters } from "../../_state";

const Body = z.object({ documentId: z.string().min(1) });

function dedupeKey(documentId: string, quote: string): string {
  return `${documentId}::${quote.trim().replace(/\s+/g, " ").toLowerCase()}`;
}

/**
 * §7.4 C extract (officer/admin): proposed obligations with quotes copied
 * from the document. Each proposal is stored as a `proposed` row so the
 * review screen can confirm or reject it later; nothing counts until a
 * person confirms, and the same quote is never stored twice (dedupe by
 * document + normalized quote). Also returns the document text so the
 * review screen can show the quote highlighted in context (DESIGN §15.2).
 */
export async function POST(request: NextRequest) {
  try {
    requireRole(request, "officer", "admin");
    const body = parseOr400(Body, await readJson(request));
    const corpus = loadCorpus();
    const document = corpus.documents.find((candidate) => candidate.id === body.documentId);
    if (!document) throw new ApiError(404, `Unknown document: ${body.documentId}`);
    const result = await extractObligations(document);

    const state = await getState();
    const seen = new Set(
      state.registers.obligations.map((obligation) =>
        dedupeKey(obligation.source.documentId, obligation.source.quote),
      ),
    );
    const added: Obligation[] = [];
    result.obligations.forEach((item, index) => {
      const key = dedupeKey(document.id, item.quote);
      if (seen.has(key)) return;
      seen.add(key);
      const start = document.text.indexOf(item.quote);
      const from = start >= 0 ? start : 0;
      added.push(
        parseOr400(ObligationSchema, {
          id: `prop_${document.id}_${index}`,
          title: item.title,
          plainDescription: item.quote,
          kind: item.kind,
          source: {
            documentId: document.id,
            quote: item.quote,
            quoteSpan: [from, from + item.quote.length],
          },
          ...(item.cadence ? { cadence: item.cadence } : {}),
          status: "proposed",
          origin: "ai_extracted",
          ruleIds: item.suggestedRuleId ? [item.suggestedRuleId] : [],
        }),
      );
    });

    if (added.length > 0) {
      await setRegisters({
        ...state.registers,
        obligations: [...state.registers.obligations, ...added],
      });
    }

    const proposed = state.registers.obligations.filter(
      (obligation) =>
        obligation.source.documentId === document.id && obligation.status === "proposed",
    );

    return ok({
      ...result,
      proposed,
      text: document.text,
      documentTitle: document.title,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
