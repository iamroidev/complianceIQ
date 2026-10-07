import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Demo authentication for the Tier 1 API (§8 roles, documented judgment
 * call): the caller's role travels in the `x-ciq-role` header and defaults
 * to officer. Supabase JWT-to-role verification is deferred with the rest of
 * the hosted auth work; the role gate itself is enforced and tested here.
 */
export type Role = "officer" | "auditor" | "admin";

export const ROLE_HEADER = "x-ciq-role";

export function roleOf(request: NextRequest): Role {
  const raw = request.headers.get(ROLE_HEADER)?.trim().toLowerCase();
  return raw === "auditor" || raw === "admin" ? raw : "officer";
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function requireRole(request: NextRequest, ...allowed: Role[]): Role {
  const role = roleOf(request);
  if (!allowed.includes(role)) {
    throw new ApiError(403, `Role "${role}" may not perform this action.`);
  }
  return role;
}

export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
}

/** Body-optional variant: an absent or empty body counts as `{}`. */
export async function readJsonOptional(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function parseOr400<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new ApiError(400, `Invalid payload: ${issues}`);
  }
  return parsed.data;
}

export function ok(payload: unknown, status = 200): NextResponse {
  return NextResponse.json(payload, { status });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unexpected error.";
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Next 15 dynamic route params arrive as a promise. */
export type ParamContext<T extends string> = { params: Promise<Record<T, string>> };

export async function paramOf<T extends string>(context: ParamContext<T>, key: T): Promise<string> {
  const params = await context.params;
  const value = params[key];
  if (!value) throw new ApiError(400, `Missing route parameter: ${key}`);
  return value;
}
