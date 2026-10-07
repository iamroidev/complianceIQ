/**
 * Canonical JSON (§7.6): recursively sorted keys, no whitespace, JSON data model.
 * One function, used by every hash in the product — changing it invalidates the chain.
 */
export function canonical(value: unknown): string {
  return JSON.stringify(canonicalise(value));
}

function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => (entry === undefined ? null : canonicalise(entry)));
  }
  if (value !== null && typeof value === "object") {
    const withToJson = value as { toJSON?: () => unknown };
    if (typeof withToJson.toJSON === "function") {
      return canonicalise(withToJson.toJSON());
    }
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return Object.fromEntries(entries.map(([key, entry]) => [key, canonicalise(entry)]));
  }
  return value;
}
