import { z } from "zod";
import { Domain, IsoUtcMs } from "./common";

export const ComplianceEvent = z.object({
  id: z.string().min(1),
  domain: Domain,
  actor: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    role: z.string().min(1),
  }),
  action: z.string().min(1),
  resource: z.object({
    type: z.string().min(1),
    id: z.string().min(1),
    label: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  }),
  context: z.record(z.string(), z.unknown()),
  timestamp: IsoUtcMs,
  source: z.string().min(1),
});

export type ComplianceEvent = z.infer<typeof ComplianceEvent>;
