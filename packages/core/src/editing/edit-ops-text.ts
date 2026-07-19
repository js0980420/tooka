import * as t from '@babel/types';
import { jsString, type Splice, spliceRange } from './edit-ops-attrs.ts';

export function formatJsxText(value: string): string {
  // JSXText can't hold `{}<>` and collapses leading/trailing whitespace,
  // so wrap the value in an expression container when it would lose info.
  if (/[{}<>]/.test(value) || /^\s|\s$/.test(value) || value === '') {
    return `{${jsString(value)}}`;
  }
  return value;
}

export type TextCandidate = {
  // Normalized current text the candidate represents — what an
  // unambiguous DOM `textContent` would render here. Used to match
  // against the client-supplied `prevText` when there's more than one.
  current: string;
  splice: (value: string) => Splice;
};

export type JsxParent = t.JSXElement | t.JSXFragment;
export type TextRangeLeaf = {
  node: t.JSXText | t.JSXExpressionContainer;
  parent: JsxParent;
  current: string;
  raw: string;
  text: (value: string) => string;
  offsets: Array<number | null>;
};
type TextRangeBreak = { node: t.JSXElement; current: '\n' };
export type TextRangePart = TextRangeLeaf | TextRangeBreak;

export function meaningfulChildren(parent: JsxParent): t.Node[] {
  return parent.children.filter((c) => {
    if (t.isJSXText(c)) return c.value.trim() !== '';
    return true;
  });
}

export function isOnlyMeaningfulChild(parent: JsxParent, child: t.Node): boolean {
  const meaningful = meaningfulChildren(parent);
  return meaningful.length === 1 && meaningful[0] === child;
}

// Wrap-style splice: rewrite the whole children span of `parent`. Used
// when the candidate is the parent's only meaningful child, so old
// surrounding whitespace nodes don't leak into the new value.
function wrapSplice(parent: JsxParent, text: string): Splice {
  const first = parent.children[0];
  const last = parent.children[parent.children.length - 1];
  return { from: first.start ?? 0, to: last.end ?? 0, text };
}

function splitLinesWithOffsets(value: string): Array<{ text: string; start: number }> {
  const lines: Array<{ text: string; start: number }> = [];
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch !== '\n' && ch !== '\r') continue;
    lines.push({ text: value.slice(start, i), start });
    if (ch === '\r' && value[i + 1] === '\n') i += 1;
    start = i + 1;
  }
  lines.push({ text: value.slice(start), start });
  return lines;
}

function cleanJsxTextWithOffsets(value: string): {
  text: string;
  offsets: Array<number | null>;
} {
  const lines = splitLinesWithOffsets(value);
  let lastNonEmptyLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].text.trim()) lastNonEmptyLine = i;
  }

  let text = '';
  const offsets: Array<number | null> = [];
  for (let i = 0; i < lines.length; i++) {
    const chars = Array.from(lines[i].text, (ch, j) => ({
      ch: ch === '\t' ? ' ' : ch,
      offset: lines[i].start + j,
    }));
    let from = 0;
    let to = chars.length;
    if (i !== 0) {
      while (from < to && chars[from].ch === ' ') from += 1;
    }
    if (i !== lines.length - 1) {
      while (to > from && chars[to - 1].ch === ' ') to -= 1;
    }
    if (from >= to) continue;
    for (const item of chars.slice(from, to)) {
      text += item.ch;
      offsets.push(item.offset);
    }
    if (i !== lastNonEmptyLine) {
      text += ' ';
      offsets.push(null);
    }
  }
  return { text, offsets };
}

function isJsxBrElement(node: t.Node): node is t.JSXElement {
  if (!t.isJSXElement(node)) return false;
  const name = node.openingElement.name;
  return t.isJSXIdentifier(name) && name.name.toLowerCase() === 'br';
}

export function collectTextCandidates(element: JsxParent, out: TextCandidate[]): void {
  const meaningful = meaningfulChildren(element);
  const isSole = meaningful.length === 1;
  for (const child of meaningful) {
    if (t.isJSXText(child)) {
      const current = child.value.trim();
      if (!current) continue;
      out.push({
        current,
        splice: (v) =>
          isSole
            ? wrapSplice(element, formatJsxText(v))
            : { from: child.start ?? 0, to: child.end ?? 0, text: formatJsxText(v) },
      });
    } else if (t.isJSXExpressionContainer(child)) {
      const expr = child.expression;
      if (t.isStringLiteral(expr) || t.isNumericLiteral(expr)) {
        const current = String(expr.value);
        out.push({
          current,
          splice: (v) =>
            isSole
              ? wrapSplice(element, `{${jsString(v)}}`)
              : { from: child.start ?? 0, to: child.end ?? 0, text: `{${jsString(v)}}` },
        });
      }
    } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
      collectTextCandidates(child, out);
    }
  }
}

export function collectTextRangeParts(element: JsxParent, out: TextRangePart[]): void {
  const parts: TextRangePart[] = [];
  collectTextRangePartsRaw(element, parts);
  out.push(...normalizeTextRangeParts(parts));
}

function collectTextRangePartsRaw(element: JsxParent, out: TextRangePart[]): void {
  for (const child of element.children) {
    if (t.isJSXText(child)) {
      const { text: current, offsets } = cleanJsxTextWithOffsets(child.value);
      if (current) {
        out.push({
          node: child,
          parent: element,
          current,
          raw: child.value,
          text: formatJsxText,
          offsets,
        });
      }
    } else if (t.isJSXExpressionContainer(child)) {
      const expression = child.expression;
      if (t.isStringLiteral(expression) || t.isNumericLiteral(expression)) {
        const raw = String(expression.value);
        const current = raw;
        if (current) {
          out.push({
            node: child,
            parent: element,
            current,
            raw,
            text: (value) => `{${jsString(value)}}`,
            offsets: Array.from({ length: current.length }, (_, i) => i),
          });
        }
      }
    } else if (isJsxBrElement(child)) {
      out.push({ node: child, current: '\n' });
    } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
      collectTextRangePartsRaw(child, out);
    }
  }
}

function normalizeTextRangeParts(parts: TextRangePart[]): TextRangePart[] {
  return parts.flatMap((part, index): TextRangePart[] => {
    if (!('raw' in part)) return [part];
    let start = 0;
    let end = part.current.length;
    if (parts[index - 1]?.current === '\n') {
      while (start < end && /\s/.test(part.current[start] ?? '')) start++;
    }
    if (parts[index + 1]?.current === '\n') {
      while (end > start && /\s/.test(part.current[end - 1] ?? '')) end--;
    }
    if (start === 0 && end === part.current.length) return [part];
    if (start >= end) return [];
    return [
      {
        ...part,
        current: part.current.slice(start, end),
        offsets: part.offsets.slice(start, end),
      },
    ];
  });
}

function resetValueForRangeStyle(key: string): string | null {
  if (key === 'fontWeight') return '400';
  if (key === 'fontStyle') return 'normal';
  return null;
}

export function styleSpanForText(text: string, key: string, value: string | null): string {
  const styleValue = value ?? resetValueForRangeStyle(key);
  if (styleValue === null) return formatJsxText(text);
  return `<span style={{ ${key}: ${jsString(styleValue)} }}>${formatJsxText(text)}</span>`;
}

export function textRangeContent(parts: TextRangePart[]): string {
  return parts.map((part) => part.current).join('');
}

function compactText(value: string): string {
  return value.replace(/\s+/g, '');
}

function textMatchesExpected(current: string, expected: string): boolean {
  return current === expected || compactText(current) === compactText(expected);
}

function formatRichText(value: string, formatText = formatJsxText): string {
  return value
    .split('\n')
    .map((part) => formatText(part))
    .join('<br />');
}

export function formatOptionalText(value: string, formatText = formatJsxText): string {
  return value ? formatText(value) : '';
}

function textDiff(prevText: string, nextText: string) {
  let start = 0;
  while (
    start < prevText.length &&
    start < nextText.length &&
    prevText[start] === nextText[start]
  ) {
    start += 1;
  }

  let prevEnd = prevText.length;
  let nextEnd = nextText.length;
  while (prevEnd > start && nextEnd > start && prevText[prevEnd - 1] === nextText[nextEnd - 1]) {
    prevEnd -= 1;
    nextEnd -= 1;
  }

  return { start, end: prevEnd, value: nextText.slice(start, nextEnd) };
}

function textLeafSplice(part: TextRangeLeaf, value: string): Splice {
  const rawRange = textLeafRawRange(part, 0, part.current.length);
  if (!rawRange) return spliceRange(part.node, part.text(value));
  const { rawStart, rawEnd } = rawRange;
  return {
    from: part.node.start ?? 0,
    to: part.node.end ?? 0,
    text: `${part.raw.slice(0, rawStart)}${formatRichText(value, part.text)}${part.raw.slice(rawEnd)}`,
  };
}

export function textLeafRawRange(
  part: TextRangeLeaf,
  start: number,
  end: number,
): { rawStart: number; rawEnd: number } | null {
  if (start >= end) return null;
  let first: number | null = null;
  let last: number | null = null;
  for (let i = start; i < end; i++) {
    const offset = part.offsets[i];
    if (offset === undefined) return null;
    if (offset === null) continue;
    first ??= offset;
    last = offset;
  }
  if (first === null || last === null) return null;
  return { rawStart: first, rawEnd: last + 1 };
}

function buildTextRangeReplaceSplices(
  parts: TextRangePart[],
  start: number,
  end: number,
  value: string,
): Splice[] | { error: string } {
  const splices: Splice[] = [];
  let offset = 0;
  let inserted = false;

  for (const part of parts) {
    const partStart = offset;
    const partEnd = partStart + part.current.length;
    offset = partEnd;

    const overlaps = start < partEnd && end > partStart;
    const insertsHere = start === end && !inserted && start >= partStart && start <= partEnd;
    if (!overlaps && !insertsHere) continue;

    if ('raw' in part) {
      const localStart = Math.max(start, partStart) - partStart;
      const localEnd = overlaps ? Math.min(end, partEnd) - partStart : localStart;
      const nextText = `${part.current.slice(0, localStart)}${inserted ? '' : value}${part.current.slice(localEnd)}`;
      splices.push(textLeafSplice(part, nextText));
    } else if (overlaps) {
      splices.push(spliceRange(part.node, inserted ? '' : formatRichText(value)));
    } else if (insertsHere) {
      const at = start === partStart ? (part.node.start ?? 0) : (part.node.end ?? 0);
      splices.push({ from: at, to: at, text: formatRichText(value) });
    }

    inserted = true;
  }

  if (!inserted && start === end && start === offset) {
    const last = parts[parts.length - 1];
    if (!last) return { error: 'element has no editable text' };
    if ('raw' in last) {
      splices.push(textLeafSplice(last, `${last.current}${value}`));
    } else {
      splices.push({
        from: last.node.end ?? 0,
        to: last.node.end ?? 0,
        text: formatRichText(value),
      });
    }
  }

  return splices;
}

export function buildTextContentSplices(
  element: t.JSXElement,
  value: string,
  prevText: string,
): Splice[] | { error: string } {
  const parts: TextRangePart[] = [];
  collectTextRangeParts(element, parts);
  const current = textRangeContent(parts);
  if (!textMatchesExpected(current, prevText)) {
    return { error: 'no text candidate matches the current value' };
  }
  const diff = textDiff(current, value);
  if (diff.start === diff.end && diff.value === '') return [];
  return buildTextRangeReplaceSplices(parts, diff.start, diff.end, diff.value);
}
