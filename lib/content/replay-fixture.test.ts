import { describe, test, expect } from "vitest";
import { replayStructuredContent } from "./structure-and-rewrite";
import emptyArrayField from "./fixtures/empty-array-field.json";
import coercionDrop from "./fixtures/coercion-drop.json";
import nearTokenCeiling from "./fixtures/near-token-ceiling-best-available.json";

// Replay mode's whole point: feed a frozen, previously-captured raw response through the
// same deterministic chain the live path uses, no network, no model call. If this suite is
// flaky, that's a real regression in resolveStructuredContent/coerceTextArray/
// normalizeStringifiedJson — not "the model was in a different mood today," since none of
// them touch the network. See docs/kondo-v2-execution.md's 0.1c entry for how these
// fixtures were sourced, and lib/content/fixtures/README.md for the format and known gaps.

describe("replayStructuredContent — determinism", () => {
  for (const fixture of [emptyArrayField, coercionDrop, nearTokenCeiling]) {
    test(`${fixture.id}: two replays are byte-identical`, () => {
      const first = replayStructuredContent(fixture.rawResponse, []);
      const second = replayStructuredContent(fixture.rawResponse, []);
      expect(first).toEqual(second);
      expect(first.ok).toBe(true);
    });
  }
});

describe("replayStructuredContent — fixture-specific expectations", () => {
  test("empty-array-field: testimonials and process really are empty, faqs/services are not", () => {
    const result = replayStructuredContent(emptyArrayField.rawResponse, []);
    if (!result.ok) throw new Error(`expected valid replay, got: ${result.reason}`);
    expect(result.value.testimonials).toHaveLength(0);
    expect(result.value.process).toHaveLength(0);
    expect(result.value.faqs.length).toBeGreaterThan(0);
    expect(result.value.services.length).toBeGreaterThan(0);
  });

  test("coercion-drop: the malformed faq is dropped, every other faq survives", () => {
    const reports: Record<string, { rawCount: number; keptCount: number; drops: unknown[] }> = {};
    const result = replayStructuredContent(coercionDrop.rawResponse, [], (report) => {
      reports[report.field] = report;
    });
    if (!result.ok) throw new Error(`expected valid replay, got: ${result.reason}`);
    expect(reports.faqs.rawCount).toBe(coercionDrop.expectedAfterReplay.faqsRaw);
    expect(reports.faqs.keptCount).toBe(coercionDrop.expectedAfterReplay.faqsKept);
    expect(reports.faqs.drops).toHaveLength(coercionDrop.expectedAfterReplay.faqsDrops);
    expect(result.value.faqs).toHaveLength(coercionDrop.expectedAfterReplay.faqsKept);
  });

  test("near-token-ceiling-best-available: replays successfully despite being the largest captured response", () => {
    const result = replayStructuredContent(nearTokenCeiling.rawResponse, []);
    expect(result.ok).toBe(true);
  });

  // No fixture exists for a response that failed validateShape on attempt 1 and needed a
  // retry — every live call made while sourcing these fixtures (and every prior entry in
  // this log) succeeded on attempt 1. See lib/content/fixtures/README.md. This stays a
  // visible todo rather than a silently absent case.
  test.todo("validateShape-retry: a response that needed a second attempt — no fixture sourced yet, see 0.1c");
});
