import type { CheckResult } from "../types";

export interface DiffSegment {
  readonly kind: "same" | "removed" | "added";
  readonly text: string;
}

/** Split a check result into unchanged, removed, and added runs for a tracked-changes view. */
export function diffSegments(result: CheckResult): DiffSegment[] {
  const text = result.originalText;
  const segments: DiffSegment[] = [];
  let cursor = 0;
  for (const error of [...result.errors].sort((a, b) => a.offset - b.offset)) {
    const replacement = error.replacements[0];
    const end = error.offset + error.length;
    if (
      replacement === undefined ||
      error.offset < cursor ||
      text.slice(error.offset, end) !== error.original
    ) {
      continue;
    }
    if (error.offset > cursor) {
      segments.push({ kind: "same", text: text.slice(cursor, error.offset) });
    }
    if (error.original) segments.push({ kind: "removed", text: error.original });
    if (replacement) segments.push({ kind: "added", text: replacement });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ kind: "same", text: text.slice(cursor) });
  return segments;
}

/** Render segments as `<del>`/`<ins>` nodes. Text is assigned, never parsed as HTML. */
export function renderDiff(result: CheckResult, ownerDocument: Document): DocumentFragment {
  const fragment = ownerDocument.createDocumentFragment();
  for (const segment of diffSegments(result)) {
    if (segment.kind === "same") {
      fragment.append(segment.text);
      continue;
    }
    const mark = ownerDocument.createElement(segment.kind === "removed" ? "del" : "ins");
    mark.textContent = segment.text;
    fragment.append(mark);
  }
  return fragment;
}
