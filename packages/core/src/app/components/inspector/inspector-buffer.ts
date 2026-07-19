import type { Edit } from '@/lib/inspector/use-editor';

export type AssetAttrOp = { assetPath: string; previewUrl: string };
export type Sequenced<T> = T & { seq: number };
export type StyleOp = { value: string | null; prevText?: string };
export type TextRangeStyleOp = {
  instanceId: string;
  start: number;
  end: number;
  key: string;
  value: string | null;
  prevText?: string;
};

export type Bucket = {
  line: number;
  column: number;
  styleOps: Map<string, Sequenced<StyleOp>>;
  rangeStyleOps: Map<string, Sequenced<TextRangeStyleOp>>;
  // Deletion previews as `display: none` (original value snapshotted in
  // `origStyle`) and only splices the source on commit.
  deleteOp: Sequenced<{ tag: string | null }> | null;
  // Text edits are scoped per DOM instance: a reused component renders
  // the same JSX `<h2>{title}</h2>` at multiple call sites with the same
  // `data-slide-loc`, but each call site's prop literal is independent.
  // Style/attr ops stay shared because they edit the JSX definition.
  textOps: Map<string /* instanceId */, Sequenced<{ value: string }>>;
  attrOps: Map<string, Sequenced<AssetAttrOp>>;
  // Pre-edit snapshot of the DOM, captured the first time we touch
  // each style key / text / attribute. Used by `cancelEdits` to revert.
  origStyle: Map<string, string>;
  origTexts: Map<string /* instanceId */, { value: string }>;
  origHtmls: Map<string /* instanceId */, string>;
  origAttrs: Map<string, string | null>;
};

export const INSTANCE_ID_ATTR = 'data-slide-instance-id';

export function readInstanceId(el: HTMLElement): string | null {
  return el.getAttribute(INSTANCE_ID_ATTR);
}

type DomTextPart = { node: Text | HTMLBRElement; current: string };

export function readEditableText(el: HTMLElement): string {
  const parts: DomTextPart[] = [];
  collectDomTextParts(el, parts);
  return parts.map((part) => part.current).join('');
}

function collectDomTextParts(node: Node, out: DomTextPart[]): void {
  const parts: DomTextPart[] = [];
  collectDomTextPartsRaw(node, parts);
  out.push(...normalizeDomTextParts(parts));
}

function collectDomTextPartsRaw(node: Node, out: DomTextPart[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child instanceof Text) {
      const current = renderedTextNodeValue(child);
      if (current) out.push({ node: child, current });
    } else if (child instanceof HTMLBRElement) {
      out.push({ node: child, current: '\n' });
    } else if (child instanceof HTMLElement) {
      collectDomTextPartsRaw(child, out);
    }
  }
}

function normalizeDomTextParts(parts: DomTextPart[]): DomTextPart[] {
  return parts.flatMap((part, index) => {
    if (part.current === '\n') return [part];
    let current = part.current;
    if (parts[index - 1]?.current === '\n') current = current.replace(/^\s+/, '');
    if (parts[index + 1]?.current === '\n') current = current.replace(/\s+$/, '');
    return current ? [{ ...part, current }] : [];
  });
}

function renderedTextNodeValue(node: Text): string {
  const whiteSpace = node.parentElement ? getComputedStyle(node.parentElement).whiteSpace : '';
  if (whiteSpace === 'pre' || whiteSpace === 'pre-wrap' || whiteSpace === 'break-spaces') {
    return node.data;
  }
  return node.data.replace(/\s+/g, ' ');
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

function textFragment(value: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const lines = value.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) fragment.append(document.createTextNode(lines[i]));
    if (i < lines.length - 1) fragment.append(document.createElement('br'));
  }
  return fragment;
}

function replaceDomTextPart(part: DomTextPart, value: string) {
  if (part.node instanceof Text && !value.includes('\n')) {
    part.node.data = value;
    return;
  }
  const fragment = textFragment(value);
  part.node.replaceWith(fragment);
}

export function setEditableText(el: HTMLElement, value: string) {
  const parts: DomTextPart[] = [];
  collectDomTextParts(el, parts);
  const current = parts.map((part) => part.current).join('');
  if (current === value) return;
  if (parts.length === 0) {
    el.replaceChildren(textFragment(value));
    return;
  }

  const diff = textDiff(current, value);
  let offset = 0;
  let inserted = false;
  for (const part of parts) {
    const partStart = offset;
    const partEnd = partStart + part.current.length;
    offset = partEnd;

    const overlaps = diff.start < partEnd && diff.end > partStart;
    const insertsHere =
      diff.start === diff.end && !inserted && diff.start >= partStart && diff.start <= partEnd;
    if (!overlaps && !insertsHere) continue;

    if (part.node instanceof Text) {
      const localStart = Math.max(diff.start, partStart) - partStart;
      const localEnd = overlaps ? Math.min(diff.end, partEnd) - partStart : localStart;
      replaceDomTextPart(
        part,
        `${part.current.slice(0, localStart)}${inserted ? '' : diff.value}${part.current.slice(localEnd)}`,
      );
    } else if (overlaps) {
      replaceDomTextPart(part, inserted ? '' : diff.value);
    } else {
      const fragment = textFragment(diff.value);
      if (diff.start === partStart) part.node.before(fragment);
      else part.node.after(fragment);
    }

    inserted = true;
  }

  if (!inserted && diff.start === diff.end && diff.start === offset) {
    el.append(textFragment(diff.value));
  }
}

export function rangeStyleKey(
  instanceId: string,
  op: { start: number; end: number; key: string },
): string {
  return `${instanceId}:${op.start}:${op.end}:${op.key}`;
}

function applyDomTextRangeStyle(
  el: HTMLElement,
  op: Pick<TextRangeStyleOp, 'start' | 'end' | 'key' | 'value'>,
) {
  const value = op.value ?? resetValueForRangeStyle(op.key);
  if (value === null) return;
  const parts: DomTextPart[] = [];
  collectDomTextParts(el, parts);
  let offset = 0;
  for (const part of parts) {
    const partStart = offset;
    const partEnd = partStart + part.current.length;
    offset = partEnd;
    if (!(part.node instanceof Text)) continue;
    const selectedStart = Math.max(op.start, partStart);
    const selectedEnd = Math.min(op.end, partEnd);
    if (selectedStart >= selectedEnd) continue;

    const localStart = selectedStart - partStart;
    const localEnd = selectedEnd - partStart;
    const before = part.current.slice(0, localStart);
    const selected = part.current.slice(localStart, localEnd);
    const after = part.current.slice(localEnd);
    const span = document.createElement('span');
    (span.style as unknown as Record<string, string>)[op.key] = value;
    span.textContent = selected;
    part.node.replaceWith(document.createTextNode(before), span, document.createTextNode(after));
  }
}

function resetValueForRangeStyle(key: string): string | null {
  if (key === 'fontWeight') return '400';
  if (key === 'fontStyle') return 'normal';
  return null;
}

export function replayDomTextRangeStyles(el: HTMLElement, html: string, ops: TextRangeStyleOp[]) {
  const preview = document.createElement('span');
  preview.innerHTML = html;
  for (const op of ops) applyDomTextRangeStyle(preview, op);
  if (el.innerHTML !== preview.innerHTML) el.innerHTML = preview.innerHTML;
}

// Pre-edit snapshot for history: capture the *currently effective* value of
// each touched field so undo can restore exactly the prior state, including
// the case where the bucket already had a buffered edit before this op.
export type StyleSnap = {
  kind: 'style';
  key: string;
  value: Sequenced<StyleOp> | string | null;
  existed: boolean;
};
export type RangeStyleSnap = {
  kind: 'range-style';
  id: string;
  instanceId: string;
  value: Sequenced<TextRangeStyleOp> | null;
  existed: boolean;
};
export type TextSnap = {
  kind: 'text';
  instanceId: string;
  value: string | null;
  existed: boolean;
};
export type AttrSnap = {
  kind: 'attr';
  attr: string;
  value: Sequenced<AssetAttrOp> | string | null;
  source: 'op' | 'orig' | 'dom-missing' | 'dom-present';
};
export type DeleteSnap = {
  kind: 'delete';
  value: Sequenced<{ tag: string | null }> | null;
  existed: boolean;
};
export type Snap = StyleSnap | RangeStyleSnap | TextSnap | AttrSnap | DeleteSnap;

export type PendingItem = {
  key: string;
  seq: number;
  edit: Edit;
  onSuccess: (bucket: Bucket) => void;
};

export function buildPendingItems(buckets: Map<string, Bucket>): PendingItem[] {
  const pending: PendingItem[] = [];
  for (const [key, bucket] of buckets) {
    const { line, column, styleOps, rangeStyleOps, textOps, attrOps, origTexts, deleteOp } = bucket;
    if (deleteOp) {
      pending.push({
        key,
        seq: deleteOp.seq,
        edit: {
          line,
          column,
          ops: [{ kind: 'delete-element', tag: deleteOp.tag ?? undefined }],
        },
        onSuccess: (b) => {
          b.deleteOp = null;
        },
      });
    }
    for (const [k, op] of styleOps) {
      pending.push({
        key,
        seq: op.seq,
        edit: {
          line,
          column,
          ops: [{ kind: 'set-style', key: k, value: op.value, prevText: op.prevText }],
        },
        onSuccess: (b) => {
          b.styleOps.delete(k);
        },
      });
    }
    for (const [attr, op] of attrOps) {
      pending.push({
        key,
        seq: op.seq,
        edit: {
          line,
          column,
          ops: [
            {
              kind: 'set-attr-asset',
              attr,
              assetPath: op.assetPath,
              previewUrl: op.previewUrl,
            },
          ],
        },
        onSuccess: (b) => {
          b.attrOps.delete(attr);
        },
      });
    }
    for (const [id, op] of rangeStyleOps) {
      pending.push({
        key,
        seq: op.seq,
        edit: {
          line,
          column,
          ops: [
            {
              kind: 'set-text-range-style',
              start: op.start,
              end: op.end,
              key: op.key,
              value: op.value,
              prevText: op.prevText,
            },
          ],
        },
        onSuccess: (b) => {
          b.rangeStyleOps.delete(id);
        },
      });
    }
    // Per-instance text edits — one Edit per call site, each with its
    // own prevText so the server can disambiguate among siblings.
    for (const [instanceId, textOp] of textOps) {
      const orig = origTexts.get(instanceId);
      pending.push({
        key,
        seq: textOp.seq,
        edit: {
          line,
          column,
          ops: [{ kind: 'set-text', value: textOp.value, prevText: orig?.value }],
        },
        onSuccess: (b) => {
          b.textOps.delete(instanceId);
        },
      });
    }
  }
  // Deletions remove source lines, which would shift the line:column
  // targets of every edit below them — so they apply after all other
  // edits, and bottom-up so they don't shift each other.
  const isDelete = (p: PendingItem) => p.edit.ops[0]?.kind === 'delete-element';
  pending.sort((a, b) => {
    const da = isDelete(a) ? 1 : 0;
    const db = isDelete(b) ? 1 : 0;
    if (da !== db) return da - db;
    if (da === 1) return b.edit.line - a.edit.line;
    return a.seq - b.seq;
  });
  return pending;
}
