import { sha256Hex } from "./sha256";

/**
 * The ledger's one hash function. Portably implemented (see ./sha256) so the
 * browser can run the real verification code on a tamper-simulation copy
 * (§7.6) while the server keeps byte-identical hashes; equivalence with
 * node:crypto is pinned by tests/unit/sha256.test.ts.
 */
export function sha256hex(input: string): string {
  return sha256Hex(input);
}
