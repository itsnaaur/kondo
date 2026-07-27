// Shared resilience helpers for forced tool-use calls with deeply-nested schemas.
// Extracted after `design-direction.ts` hit two real failure modes in testing: nested
// object/array fields occasionally come back double-encoded as a JSON string, and a
// generic "invalid" error with no reason makes a real, recurring bug indistinguishable
// from expected retry noise.

// Deeply-nested tool schemas occasionally come back with a nested object/array field
// double-encoded as a JSON string instead of a proper nested value — normalize
// defensively rather than fighting the schema.
export function normalizeStringifiedJson(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return normalizeStringifiedJson(JSON.parse(trimmed));
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
