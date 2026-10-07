import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "@/core/ledger/sha256";

/**
 * The portable hash replaces node:crypto inside the ledger (M10) so client
 * components can run the real verifyChain on a tamper-simulation copy. These
 * tests pin byte-equivalence with node:crypto plus the published FIPS vectors,
 * so a divergence can never silently re-hash the stored record.
 */
describe("sha256Hex", () => {
  it("matches the published SHA-256 vectors", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(
      sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"),
    ).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  });

  it("is byte-identical to node:crypto across the ledger's input shapes", () => {
    const corpus = [
      "",
      "0",
      "0".repeat(64),
      "genesis",
      JSON.stringify({ actor: "pipeline@complianceiq.test", eventType: "CHECK_RUN" }),
      '{"blockIndex":1285,"eventType":"REPORT_FILED"}',
      "Kofi Adjei-Boateng made 2 cash deposits of USD 9,800.00.",
      "Ünïcödé · 中文 · 🧾 — canonical JSON, no whitespace",
      "line with \u0000 null byte",
      "x".repeat(55), // one short of a block: padding boundary
      "y".repeat(56), // exactly one padding block
      "z".repeat(1000), // multi-block
      "é".repeat(400), // multi-byte UTF-8 across block boundaries
    ];
    for (const input of corpus) {
      const expected = createHash("sha256").update(input, "utf8").digest("hex");
      expect(sha256Hex(input), `input length ${input.length}`).toBe(expected);
    }
  });
});
