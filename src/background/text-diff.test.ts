import { describe, expect, test } from "vitest";

import { changesFromTexts, correctedTextFromReport } from "./text-diff";

describe("corrected text reports", () => {
  test("accepts a complete corrected text without language-specific logic", () => {
    const original = "helo how are you what are you doing ?";
    const corrected = correctedTextFromReport(
      { correctedText: "Hello, how are you? What are you doing?" },
      original,
    );

    expect(corrected).toBe("Hello, how are you? What are you doing?");
  });

  test("accepts unchanged text as a clean result", () => {
    expect(correctedTextFromReport({ correctedText: "Already correct." }, "Already correct.")).toBe(
      "Already correct.",
    );
  });

  test("rejects malformed, unsafe, blank, and oversized corrected text", () => {
    const invalidReports = [
      null,
      {},
      { correctedText: 42 },
      { correctedText: "" },
      { correctedText: "bad\u0000value" },
      { correctedText: "x".repeat(25_001) },
    ];

    for (const report of invalidReports) {
      expect(() => correctedTextFromReport(report, "source text")).toThrow();
    }
  });

  test("derives safe right-to-left editor changes from the corrected text", () => {
    const original = "helo how are you what are you doing ?";
    const corrected = "Hello, how are you? What are you doing?";
    const changes = changesFromTexts(original, corrected);
    let applied = original;
    for (const change of [...changes].sort((a, b) => b.offset - a.offset)) {
      applied =
        applied.slice(0, change.offset) +
        change.replacements[0]! +
        applied.slice(change.offset + change.length);
    }

    expect(applied).toBe(corrected);
    expect(changes.map((change) => [change.original, change.replacements[0]])).toEqual([
      ["helo", "Hello,"],
      ["", "?"],
      ["what", "What"],
      [" ", ""],
    ]);
    expect(changes.every((change) => change.replacements.length === 1)).toBe(true);
  });

  test("uses UTF-16 offsets and classifies local diff shapes", () => {
    const changes = changesFromTexts("🙂 hello !", "🙂 Hello!");

    expect(changes).toEqual([
      expect.objectContaining({
        offset: 3,
        length: 6,
        original: "hello ",
        replacements: ["Hello"],
        shortMessage: "Text correction",
      }),
    ]);
    expect(changesFromTexts("ok ,fine", "ok, fine")[0]).toMatchObject({
      shortMessage: "Punctuation",
      type: "punctuation",
    });
    expect(changesFromTexts("paris", "Paris")[0]?.shortMessage).toBe("Capitalization");
  });

  test("reports whole words instead of character fragments", () => {
    const pairs = (original: string, corrected: string): unknown[] =>
      changesFromTexts(original, corrected).map((change) => [
        change.original,
        change.replacements[0],
      ]);

    expect(pairs("i has went to teh stroe", "I went to the store")).toEqual([
      ["i", "I"],
      ["has ", ""],
      ["teh", "the"],
      ["stroe", "store"],
    ]);
    expect(pairs("Мне кажеться что надо", "Мне кажется, что надо")).toEqual([
      ["кажеться", "кажется,"],
    ]);
    expect(pairs("He go home", "He goes home")).toEqual([["go", "goes"]]);
    expect(pairs("alot of time", "a lot of time")).toEqual([["alot", "a lot"]]);
    expect(pairs("it dont work", "it doesn't work")).toEqual([["dont", "doesn't"]]);
    expect(pairs("recieve teh mesage", "receive the message")).toEqual([
      ["recieve", "receive"],
      ["teh", "the"],
      ["mesage", "message"],
    ]);
  });

  test("every derived change set reproduces the corrected text exactly", () => {
    const cases: Array<[string, string]> = [
      ["it dont work", "it doesn't work"],
      ["i has went to teh stroe", "I went to the store"],
      ["Мне кажеться что надо", "Мне кажется, что надо"],
      ["a  b ,c", "a b, c"],
      ["their going tommorow", "They're going tomorrow."],
      ["x", "completely different"],
      [
        "Ich habe ein Buch gelesen das interesant war",
        "Ich habe ein Buch gelesen, das interessant war",
      ],
      ["🙂 hello !", "🙂 Hello!"],
    ];
    for (const [original, corrected] of cases) {
      let applied = original;
      const changes = changesFromTexts(original, corrected);
      for (const change of [...changes].sort((a, b) => b.offset - a.offset)) {
        expect(original.slice(change.offset, change.offset + change.length)).toBe(change.original);
        applied =
          applied.slice(0, change.offset) +
          change.replacements[0]! +
          applied.slice(change.offset + change.length);
      }
      expect(applied).toBe(corrected);
      const ends = changes.map((change) => change.offset + change.length);
      changes
        .slice(1)
        .forEach((change, index) => expect(change.offset).toBeGreaterThanOrEqual(ends[index]!));
    }
  });

  test("unwraps an echoed request envelope and keeps edge whitespace", () => {
    expect(
      correctedTextFromReport({ correctedText: '{"text":"He goes home"}' }, "He go home"),
    ).toBe("He goes home");
    expect(
      correctedTextFromReport({ correctedText: "<text>He goes home</text>" }, "He go home"),
    ).toBe("He goes home");
    expect(correctedTextFromReport({ correctedText: '{"a":1}' }, '{"a":1}')).toBe('{"a":1}');
    expect(correctedTextFromReport({ correctedText: "He goes home" }, "  He go home\n")).toBe(
      "  He goes home\n",
    );
  });

  test("rejects a reply that answers or rewrites instead of proofreading", () => {
    const original = "Can you explain how photosynthesis works in plants?";
    expect(() =>
      correctedTextFromReport({ correctedText: `${original} `.repeat(3) }, original),
    ).toThrow("instead of proofreading");
    expect(() => correctedTextFromReport({ correctedText: "Yes." }, original)).toThrow(
      "instead of proofreading",
    );
    expect(correctedTextFromReport({ correctedText: "Hello, world!" }, "helo")).toBe(
      "Hello, world!",
    );
  });
});
