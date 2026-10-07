import { NextRequest } from "next/server";
import { z } from "zod";
import {
  Account,
  Certification,
  Obligation,
  Person,
  Requirement,
  Vendor,
} from "@/core/types";
import { ApiError, errorResponse, ok, paramOf, parseOr400, readJson, requireRole, type ParamContext } from "../../_http";
import { getState, setRegisters } from "../../_state";

const KINDS = ["people", "certifications", "requirements", "vendors", "accounts", "obligations"] as const;
type Kind = (typeof KINDS)[number];

const KIND_SCHEMAS = {
  people: Person,
  certifications: Certification,
  requirements: Requirement,
  vendors: Vendor,
  accounts: Account,
  obligations: Obligation,
} as const;

const PatchBody = z.object({
  upsert: z.array(z.unknown()).optional(),
  remove: z.array(z.string()).optional(),
});

function isKind(value: string): value is Kind {
  return (KINDS as readonly string[]).includes(value);
}

/** §8: everyone reads registers; officers and admins edit them (writes replace the register). */
export async function GET(request: NextRequest, context: ParamContext<"kind">) {
  try {
    const kind = await paramOf(context, "kind");
    if (!isKind(kind)) throw new ApiError(404, `Unknown register: ${kind}`);
    const state = await getState();
    return ok({ kind, rows: state.registers[kind] });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: ParamContext<"kind">) {
  try {
    const role = requireRole(request, "officer", "admin");
    const kind = await paramOf(context, "kind");
    if (!isKind(kind)) throw new ApiError(404, `Unknown register: ${kind}`);
    const body = parseOr400(PatchBody, await readJson(request));
    const rows = body.upsert ? parseOr400(z.array(KIND_SCHEMAS[kind]), body.upsert) : [];
    const remove = body.remove ?? [];

    const state = await getState();
    const current = state.registers[kind] as unknown as { id: string }[];
    const byId = new Map(current.map((row) => [row.id, row]));
    const existingIds = new Set(byId.keys());
    for (const row of rows) byId.set(row.id, row);
    for (const id of remove) byId.delete(id);
    const next = { ...state.registers, [kind]: [...byId.values()] } as typeof state.registers;
    await setRegisters(next);

    // DESIGN §15.2: a manually added obligation that lands already confirmed
    // still has to enter the record — one ledger block per new row.
    if (kind === "obligations" && body.upsert) {
      for (const row of rows as { id: string; status?: string; origin?: string }[]) {
        if (!existingIds.has(row.id) && row.status === "confirmed") {
          state.ledger.append({
            eventType: "OBLIGATION_CONFIRMED",
            actor: role,
            payload: { obligationId: row.id, action: "confirm", origin: row.origin, at: state.clock.now() },
          });
        }
      }
    }

    return ok({ kind, rows: next[kind] });
  } catch (error) {
    return errorResponse(error);
  }
}
