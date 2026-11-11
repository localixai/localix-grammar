import { diffChars } from "diff";

import type { GrammarError } from "../shared/types";
import { MAX_CHECK_TEXT_LENGTH } from "../shared/types";

const MAX_CORRECTED_TEXT_LENGTH = MAX_CHECK_TEXT_LENGTH + 5_000;
/** Below this length a proofread text may legitimately change by a large factor. */
const MIN_LENGTH_FOR_DRIFT_CHECK = 40;
const UNSAFE_CONTROL_CHARACTER = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const PUNCTUATION_OR_SPACE = /^[\p{P}\p{S}\s]*$/u;
const WORD_CHARACTER = /[\p{L}\p{N}\p{M}]/u;
const EDGE_WHITESPACE = /^(\s*)[\s\S]*?(\s*)$/u;

/**
 * Models occasionally echo the request envelope instead of the bare text. Unwrap it only when
 * the source text itself is not shaped like that envelope.
 */
function withoutEnvelope(correctedText: string, originalText: string): string {
  const trimmed = correctedText.trim();
  if (trimmed.startsWith("{") && !originalText.trim().startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        // Only the envelopes a model can echo. Any other object is a refusal or an answer,
        // and must not be offered as the corrected text.
        const entries = Object.entries(parsed);
        const [key, value] = entries[0] ?? [];
        if (
          entries.length === 1 &&
          (key === "text" || key === "correctedText") &&
          typeof value === "string"
        ) {
          return value;
        }
        throw new Error("The selected model answered instead of proofreading. Try again.");
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      // Not an envelope: the model returned prose that merely starts with a brace.
    }
  }
  const tagged = /^<text>([\s\S]*)<\/text>$/u.exec(trimmed);
  if (tagged && !/^\s*<text>/u.test(originalText)) return tagged[1]!;
  return correctedText;
}

/** Edge whitespace is never a writing error, and models routinely trim it. */
function withOriginalEdges(correctedText: string, originalText: string): string {
  const edges = EDGE_WHITESPACE.exec(originalText);
  return `${edges?.[1] ?? ""}${correctedText.trim()}${edges?.[2] ?? ""}`;
}

export function correctedTextFromReport(raw: unknown, originalText: string): string {
  if (!raw || typeof raw !== "object" || !("correctedText" in raw)) {
    throw new Error("The selected model returned an invalid corrected-text report.");
  }
  const reported = (raw as { correctedText?: unknown }).correctedText;
  if (typeof reported !== "string" || reported.length > MAX_CORRECTED_TEXT_LENGTH) {
    throw new Error("The selected model returned invalid corrected text.");
  }
  const original = originalText.trim();
  const corrected = withoutEnvelope(reported, originalText).trim();
  if (UNSAFE_CONTROL_CHARACTER.test(corrected) || (original.length > 0 && corrected.length === 0)) {
    throw new Error("The selected model returned invalid corrected text.");
  }
  // A proofread keeps roughly the same amount of text. A reply of a very different size means
  // the model answered, summarized, or continued the writing instead of correcting it.
  if (
    original.length >= MIN_LENGTH_FOR_DRIFT_CHECK &&
    (corrected.length > original.length * 2 || corrected.length < original.length / 2)
  ) {
    throw new Error("The selected model rewrote the text instead of proofreading it. Try again.");
  }
  return withOriginalEdges(corrected, originalText);
}

function changeLabel(original: string, replacement: string): string {
  if (PUNCTUATION_OR_SPACE.test(original + replacement)) return "Punctuation";
  if (!original) return "Insertion";
  if (!replacement) return "Deletion";
  if (original.toLocaleLowerCase() === replacement.toLocaleLowerCase()) return "Capitalization";
  return "Text correction";
}

/** A changed span, as half-open ranges in the original and in the corrected text. */
interface Span {
  originalStart: number;
  originalEnd: number;
  correctedStart: number;
  correctedEnd: number;
}

function isWordCharacter(text: string, index: number): boolean {
  const character = text.charAt(index);
  return character !== "" && WORD_CHARACTER.test(character);
}

function rawSpans(originalText: string, correctedText: string): Span[] {
  const spans: Span[] = [];
  let originalOffset = 0;
  let correctedOffset = 0;
  let open: Span | null = null;
  for (const part of diffChars(originalText, correctedText)) {
    if (!part.added && !part.removed) {
      originalOffset += part.value.length;
      correctedOffset += part.value.length;
      open = null;
      continue;
    }
    if (!open) {
      open = {
        originalStart: originalOffset,
        originalEnd: originalOffset,
        correctedStart: correctedOffset,
        correctedEnd: correctedOffset,
      };
      spans.push(open);
    }
    if (part.removed) {
      originalOffset += part.value.length;
      open.originalEnd = originalOffset;
    } else {
      correctedOffset += part.value.length;
      open.correctedEnd = correctedOffset;
    }
  }
  return spans;
}

/** Whether the change begins and ends inside a word, and so should grow to cover it. */
function wordEdges(
  span: Span,
  originalText: string,
  correctedText: string,
): { start: boolean; end: boolean } {
  const original = originalText.slice(span.originalStart, span.originalEnd);
  const corrected = correctedText.slice(span.correctedStart, span.correctedEnd);
  // A space added or removed between letters joins or splits words: show both sides.
  if (
    (original + corrected).trim() === "" &&
    isWordCharacter(originalText, span.originalStart - 1) &&
    isWordCharacter(originalText, span.originalEnd)
  ) {
    return { start: true, end: true };
  }
  return {
    start: isWordCharacter(original, 0) || isWordCharacter(corrected, 0),
    end:
      isWordCharacter(original, original.length - 1) ||
      isWordCharacter(corrected, corrected.length - 1),
  };
}

/**
 * Grow character-level changes to the whole words they touch, so a suggestion reads
 * "teh → the" instead of "eh → he". Punctuation and spacing next to a word stay minimal.
 * Growth only crosses unchanged text, where both sides advance in step; changes that meet
 * inside one word ("dont → doesn't") become a single suggestion.
 */
function wordAlignedSpans(originalText: string, correctedText: string): Span[] {
  const raw = rawSpans(originalText, correctedText);
  const aligned: Span[] = [];
  raw.forEach((next, index) => {
    const previous = aligned.at(-1);
    let unchangedBefore = next.originalStart - (previous?.originalEnd ?? 0);
    if (wordEdges(next, originalText, correctedText).start) {
      while (unchangedBefore > 0 && isWordCharacter(originalText, next.originalStart - 1)) {
        next.originalStart -= 1;
        next.correctedStart -= 1;
        unchangedBefore -= 1;
      }
    }
    let span = next;
    if (previous && unchangedBefore === 0) {
      previous.originalEnd = next.originalEnd;
      previous.correctedEnd = next.correctedEnd;
      span = previous;
    } else {
      aligned.push(next);
    }
    let unchangedAfter = (raw[index + 1]?.originalStart ?? originalText.length) - span.originalEnd;
    if (wordEdges(span, originalText, correctedText).end) {
      while (unchangedAfter > 0 && isWordCharacter(originalText, span.originalEnd)) {
        span.originalEnd += 1;
        span.correctedEnd += 1;
        unchangedAfter -= 1;
      }
    }
  });
  return aligned;
}

export function changesFromTexts(originalText: string, correctedText: string): GrammarError[] {
  const merged = wordAlignedSpans(originalText, correctedText);

  const changes: GrammarError[] = [];
  for (const span of merged) {
    const original = originalText.slice(span.originalStart, span.originalEnd);
    const replacement = correctedText.slice(span.correctedStart, span.correctedEnd);
    if (original === replacement) continue;
    const shortMessage = changeLabel(original, replacement);
    changes.push({
      id: `${span.originalStart}:${original.length}:${changes.length}`,
      offset: span.originalStart,
      length: original.length,
      original,
      message: "Review this text change.",
      shortMessage,
      replacements: [replacement],
      type: shortMessage === "Punctuation" ? "punctuation" : "grammar",
      confidence: "high",
    });
  }
  return changes;
}
