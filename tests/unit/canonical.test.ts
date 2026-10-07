import { describe, it, expect } from "vitest";
import { canonical } from "../../src/core/ledger/canonical";

describe("canonical JSON", () => {
  it("sorts keys recursively, arrays keep order", () => {
    expect(canonical({ b: { d: 1, c: 2 }, a: 1 })).toBe('{"a":1,"b":{"c":2,"d":1}}');
    expect(canonical([3, 1, 2])).toBe("[3,1,2]");
    expect(canonical({ items: [{ z: 1, y: 2 }] })).toBe('{"items":[{"y":2,"z":1}]}');
  });

  it("produces identical output regardless of insertion order", () => {
    const first = { alpha: 1, beta: { gamma: 2, delta: 3 }, list: [1, 2] };
    const second = { list: [1, 2], beta: { delta: 3, gamma: 2 }, alpha: 1 };
    expect(canonical(first)).toBe(canonical(second));
  });

  it("emits no whitespace", () => {
    const output = canonical({ a: 1, b: "two" });
    expect(output).toBe('{"a":1,"b":"two"}');
    expect(output).not.toMatch(/[ \n\t]/);
  });

  it("keeps unicode as UTF-8 and sorts keys by code unit", () => {
    expect(canonical({ "日本語": "café 🌊" })).toBe('{"日本語":"café 🌊"}');
    expect(canonical({ "😀": 1, a: 2 })).toBe('{"a":2,"😀":1}');
    expect(canonical({ b: "ü", a: "é" })).toBe(canonical({ a: "é", b: "ü" }));
  });

  it("is deterministic for numbers", () => {
    expect(canonical({ x: -0 })).toBe('{"x":0}');
    expect(canonical({ x: 0.1 + 0.2 })).toBe('{"x":0.30000000000000004}');
    expect(canonical({ x: 1e21 })).toBe('{"x":1e+21}');
    expect(canonical({ x: NaN })).toBe('{"x":null}');
    expect(canonical({ x: 10 })).toBe(canonical({ x: 10.0 }));
  });

  it("drops undefined object members, nulls undefined array slots", () => {
    expect(canonical({ a: 1, b: undefined })).toBe('{"a":1}');
    expect(canonical([1, undefined, 3])).toBe("[1,null,3]");
  });

  it("runs toJSON before sorting (dates become ISO strings)", () => {
    expect(canonical({ t: new Date("2026-01-15T10:00:00.000Z") })).toBe(
      '{"t":"2026-01-15T10:00:00.000Z"}',
    );
  });
});
