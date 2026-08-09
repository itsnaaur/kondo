// Shared resilience helpers for forced tool-use calls with deeply-nested schemas.
// Extracted after `design-direction.ts` hit two real failure modes in testing: nested
// object/array fields occasionally come back double-encoded as a JSON string, and a
// generic "invalid" error with no reason makes a real, recurring bug indistinguishable
// from expected retry noise.

// Deeply-nested tool schemas occasionally come back with a nested object/array field
// double-encoded as a JSON string instead of a proper nested value — normalize
// defensively rather than fighting the schema.
//
// Confirmed live on a large/complex schema (lib/content/structure-and-rewrite.ts's
// extraction expansion): a field's string value can also come back with stray tool-call
// scaffolding leaked in ahead of the real JSON — e.g. a "services" field whose value was
// literally `\n<parameter name="value">[{"name": ...}]`. Searching for the first `[`/`{`
// instead of requiring one at position 0 recovers this case too, not just clean
// double-encoding.
export function normalizeStringifiedJson(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const start = trimmed.search(/[[{]/);
    if (start !== -1) {
      const candidate = trimmed.slice(start);
      try {
        return normalizeStringifiedJson(JSON.parse(candidate));
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeStringifiedJson);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, normalizeStringifiedJson(v)])
    );
  }
  return value;
}
