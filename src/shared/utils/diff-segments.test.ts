import { describe, expect, test } from "vitest";

import type { CheckResult, GrammarError } from "../types";
import { diffSegments, renderDiff } from "./diff-segments";

function change(offset: number, original: string, replacement: string): GrammarError {
  return {
    id: `${offset}`,
    offset,
    length: original.length,
    original,
    message: "",
    shortMessage: "",
    replacements: [replacement],
    type: "grammar",
    confidence: "high",
  };
}

function result(originalText: string, errors: GrammarError[]): CheckResult {
  return { originalText, errors, checkedAt: 0 };
}

describe("tracked-changes segments", () => {
  test("interleaves unchanged, removed, and added runs in reading order", () => {
    const checked = result("I has a apple", [
      change(8, "apple", "apple."),
      change(2, "has", "have"),
    ]);

    expect(diffSegments(checked)).toEqual([
      { kind: "same", text: "I " },
      { kind: "removed", text: "has" },
      { kind: "added", text: "have" },
      { kind: "same", text: " a " },
      { kind: "removed", text: "apple" },
      { kind: "added", text: "apple." },
    ]);
  });

  test("omits the empty side of pure insertions and deletions", () => {
    const checked = result("Hi  there", [change(2, " ", ""), change(9, "", "!")]);

    expect(diffSegments(checked)).toEqual([
      { kind: "same", text: "Hi" },
      { kind: "removed", text: " " },
      { kind: "same", text: " there" },
      { kind: "added", text: "!" },
    ]);
  });

  test("skips stale and overlapping changes instead of corrupting the text", () => {
    const checked = result("one two", [
      change(0, "one", "1"),
      change(1, "ne", "x"),
      change(4, "TWO", "2"),
    ]);

    expect(diffSegments(checked)).toEqual([
      { kind: "removed", text: "one" },
      { kind: "added", text: "1" },
      { kind: "same", text: " two" },
    ]);
  });

  test("renders model text as inert text nodes", () => {
    const checked = result("a", [change(0, "a", "<img src=x onerror=alert(1)>")]);
    const host = document.createElement("div");
    host.append(renderDiff(checked, document));

    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector("del")?.textContent).toBe("a");
    expect(host.querySelector("ins")?.textContent).toBe("<img src=x onerror=alert(1)>");
  });
});
