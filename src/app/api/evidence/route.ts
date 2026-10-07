import { NextRequest } from "next/server";
import { z } from "zod";
import { EvidenceItem } from "@/core/types";
import { EvidenceRef } from "@/core/types/common";
import { errorResponse, ok, parseOr400, readJson, requireRole } from "../_http";
import { getState, persistAppState } from "../_state";

const UploadEvidenceBody = z.object({
  title: z.string().min(1),
  kind: EvidenceItem.shape.kind,
  content: z.unknown(),
  source: z.string().optional(),
  subjectRef: EvidenceRef.optional(),
});

/** §8: every role reads the evidence index. */
export async function GET(request: NextRequest) {
  try {
    const state = await getState();
    return ok({ evidence: state.repo.evidence.list() });
  } catch (error) {
    return errorResponse(error);
  }
}

/** §8: officers and admins can upload and seal new evidence onto the ledger. */
export async function POST(request: NextRequest) {
  try {
    const role = requireRole(request, "officer", "admin");
    const body = parseOr400(UploadEvidenceBody, await readJson(request));
    const state = await getState();

    const item = state.evidence.record(
      body.kind,
      body.title,
      body.content,
      body.subjectRef,
      body.source ?? `upload:${role}`,
    );

    await persistAppState();
    return ok({ evidence: item }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
