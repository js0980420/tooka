import * as t from '@babel/types';
import { parseSource, walkAll, walkJsx } from './babel-walk.ts';
import { planAssetAttr, planInsertImage, planReplacePlaceholder } from './edit-ops-assets.ts';
import { buildStyleSplice, type Splice, spliceRange } from './edit-ops-attrs.ts';
import {
  buildTextContentSplices,
  collectTextRangeParts,
  type TextRangePart,
  textRangeContent,
} from './edit-ops-text.ts';
import {
  buildTextRangeStyleSplices,
  buildTextSplice,
  collectElementTextCandidates,
} from './edit-ops-text-candidates.ts';

export {
  findImports,
  type ImportInfo,
  planAssetImport,
  safeAssetIdentifier,
} from './edit-ops-assets.ts';
export {
  findJsxAttr,
  formatJsxAttrValue,
  jsString,
  readJsxStringAttr,
  type Splice,
  spliceRange,
} from './edit-ops-attrs.ts';

export type EditOp =
  | { kind: 'set-style'; key: string; value: string | null; prevText?: string }
  | { kind: 'set-text'; value: string; prevText?: string }
  | {
      kind: 'set-text-range-style';
      start: number;
      end: number;
      key: string;
      value: string | null;
      prevText?: string;
    }
  | { kind: 'set-attr-asset'; attr: string; assetPath: string }
  | { kind: 'replace-placeholder-with-image'; assetPath: string }
  | { kind: 'insert-image'; assetPath: string; x: number; y: number }
  | { kind: 'delete-element'; tag?: string };

export type ApplyEditResult =
  | { ok: true; source: string }
  | { ok: false; status: number; error: string };

type JsxContainer = t.JSXElement | t.JSXFragment;

function findJsxAncestors(ast: t.Node, line: number, column: number): JsxContainer[] {
  const hits: { node: JsxContainer; size: number }[] = [];
  walkJsx(ast, (n) => {
    if (!n.loc || (!t.isJSXElement(n) && !t.isJSXFragment(n))) return;
    const s = n.loc.start;
    const e = n.loc.end;
    const afterStart = line > s.line || (line === s.line && column >= s.column);
    const beforeEnd = line < e.line || (line === e.line && column < e.column);
    if (afterStart && beforeEnd) {
      hits.push({ node: n, size: (n.end ?? 0) - (n.start ?? 0) });
    }
  });
  hits.sort((a, b) => a.size - b.size);
  return hits.map((h) => h.node);
}

function findJsxByStart(ast: t.Node, line: number, column: number): t.JSXElement | null {
  let hit: t.JSXElement | null = null;
  walkJsx(ast, (n) => {
    if (!t.isJSXElement(n) || !n.loc) return;
    const s = n.loc.start;
    if (s.line === line && s.column === column) {
      hit = n;
      return 'stop';
    }
  });
  return hit;
}

function findInnermostJsxElement(ast: t.Node, line: number, column: number): t.JSXElement | null {
  // Prefer exact `loc.start` match (what `data-slide-loc` sends) so
  // we don't accidentally hit an outer JSX whose range happens to
  // enclose the click point.
  const exact = findJsxByStart(ast, line, column);
  if (exact) return exact;

  // Fallback for fiber-walked clicks whose column may not align with
  // the opening `<`.
  for (const n of findJsxAncestors(ast, line, column)) {
    if (t.isJSXElement(n)) return n;
  }
  return null;
}

function findUniqueElementByText(ast: t.Node, prevText: string): t.JSXElement | null {
  const hits: Array<{ node: t.JSXElement; size: number }> = [];
  walkJsx(ast, (n) => {
    if (!t.isJSXElement(n)) return;
    const parts: TextRangePart[] = [];
    collectTextRangeParts(n, parts);
    if (textRangeContent(parts) !== prevText) return;
    hits.push({ node: n, size: (n.end ?? 0) - (n.start ?? 0) });
  });
  if (hits.length === 0) return null;
  hits.sort((a, b) => a.size - b.size);
  const best = hits[0];
  const bestStart = best.node.start ?? 0;
  const bestEnd = best.node.end ?? 0;
  const hasSiblingMatch = hits
    .slice(1)
    .some(({ node }) => (node.start ?? 0) > bestStart || (node.end ?? 0) < bestEnd);
  return hasSiblingMatch ? null : best.node;
}

function fallbackTextForOps(ops: EditOp[]): string | null {
  for (const op of ops) {
    if (
      (op.kind === 'set-style' || op.kind === 'set-text' || op.kind === 'set-text-range-style') &&
      op.prevText !== undefined
    ) {
      return op.prevText;
    }
  }
  return null;
}

function hasOnlyTextOps(ops: EditOp[]): boolean {
  return ops.length > 0 && ops.every((op) => op.kind === 'set-text');
}

function elementTextMatches(element: t.JSXElement, prevText: string): boolean {
  const parts: TextRangePart[] = [];
  collectTextRangeParts(element, parts);
  return textRangeContent(parts) === prevText;
}

function elementHasTextCandidate(ast: t.File, element: t.JSXElement, prevText: string): boolean {
  const norm = prevText.trim();
  return collectElementTextCandidates(ast, element).some((candidate) => candidate.current === norm);
}

function findElementForEdit(
  ast: t.File,
  line: number,
  column: number,
  ops: EditOp[],
): t.JSXElement | null {
  const element = findInnermostJsxElement(ast, line, column);
  const prevText = fallbackTextForOps(ops);
  if (prevText === null) return element;
  if (
    hasOnlyTextOps(ops) &&
    element &&
    (elementTextMatches(element, prevText) || elementHasTextCandidate(ast, element, prevText))
  ) {
    return element;
  }
  const textMatch = findUniqueElementByText(ast, prevText);
  if (element && elementTextMatches(element, prevText)) return textMatch ?? element;
  return textMatch ?? element;
}

function elementTagName(element: t.JSXElement): string | null {
  const name = element.openingElement.name;
  return t.isJSXIdentifier(name) ? name.name : null;
}

function planDeleteElement(
  ast: t.File,
  source: string,
  element: t.JSXElement,
): Splice | { error: string } {
  // Deleting is only supported where removal keeps the source valid: a
  // direct JSX child, a `{cond && <El/>}` child (the whole container goes),
  // or a conditional branch (replaced with `null`). Anything else — the
  // page root, a `.map()` body shared by every instance — is refused.
  let removed: t.Node | null = null;
  let replacement: string | null = null;
  walkAll(ast, (node) => {
    if (t.isJSXElement(node) || t.isJSXFragment(node)) {
      for (const child of node.children) {
        if (child === element) {
          removed = element;
          return 'stop';
        }
        if (
          t.isJSXExpressionContainer(child) &&
          (child.expression === element ||
            (t.isLogicalExpression(child.expression) && child.expression.right === element))
        ) {
          removed = child;
          return 'stop';
        }
      }
    } else if (t.isConditionalExpression(node)) {
      if (node.consequent === element || node.alternate === element) {
        removed = element;
        replacement = 'null';
        return 'stop';
      }
    }
    return;
  });
  if (!removed) return { error: 'cannot delete this element from its position in the source' };
  // TS can't track assignments made inside the walk callback.
  const target = removed as t.Node;
  if (replacement !== null) return spliceRange(target, replacement);

  let from = target.start ?? 0;
  let ws = from;
  while (ws > 0 && (source[ws - 1] === ' ' || source[ws - 1] === '\t')) ws--;
  if (ws > 0 && source[ws - 1] === '\n') from = ws - 1;
  return { from, to: target.end ?? 0, text: '' };
}

export function applyEdit(
  source: string,
  line: number,
  column: number,
  ops: EditOp[],
): ApplyEditResult {
  if (ops.length === 0) return { ok: true, source };

  const ast = parseSource(source);
  if (!ast) return { ok: false, status: 422, error: 'could not parse source' };
  const element = findElementForEdit(ast, line, column, ops);
  if (!element) return { ok: false, status: 422, error: 'no JSX element at location' };

  const splices: Splice[] = [];

  const deleteOp = ops.find(
    (op): op is Extract<EditOp, { kind: 'delete-element' }> => op.kind === 'delete-element',
  );
  if (deleteOp) {
    if (ops.length > 1) {
      return { ok: false, status: 422, error: 'delete-element cannot be combined with other ops' };
    }
    // The client sends the DOM tag it sees; a mismatch means the source
    // location went stale (lines shifted) and points at a different element.
    const tag = elementTagName(element);
    if (deleteOp.tag && tag && tag.toLowerCase() !== deleteOp.tag.toLowerCase()) {
      return {
        ok: false,
        status: 422,
        error: `element at location is <${tag}>, expected <${deleteOp.tag}>`,
      };
    }
    const plan = planDeleteElement(ast, source, element);
    if ('error' in plan) return { ok: false, status: 422, error: plan.error };
    splices.push(plan);
  }

  const styleOps = ops.flatMap((op) =>
    op.kind === 'set-style' ? [{ key: op.key, value: op.value }] : [],
  );
  if (styleOps.length > 0) {
    const result = buildStyleSplice(source, element, styleOps);
    if (result && 'error' in result) {
      return { ok: false, status: 422, error: result.error };
    }
    if (result) splices.push(result);
  }

  for (const op of ops) {
    if (op.kind !== 'set-text-range-style') continue;
    const result = buildTextRangeStyleSplices(
      ast,
      source,
      element,
      op.start,
      op.end,
      { key: op.key, value: op.value },
      op.prevText,
    );
    if (result && 'error' in result) return { ok: false, status: 422, error: result.error };
    if (result) splices.push(...result);
  }

  for (const op of ops) {
    if (op.kind !== 'set-text') continue;
    if (op.prevText !== undefined && (op.value.includes('\n') || op.prevText.includes('\n'))) {
      const richResult = buildTextContentSplices(element, op.value, op.prevText);
      if (!('error' in richResult)) {
        splices.push(...richResult);
        continue;
      }
    }
    const result = buildTextSplice(ast, element, op.value, op.prevText);
    if ('error' in result) {
      if (op.prevText === undefined) return { ok: false, status: 422, error: result.error };
      const richResult = buildTextContentSplices(element, op.value, op.prevText);
      if ('error' in richResult) return { ok: false, status: 422, error: result.error };
      splices.push(...richResult);
    } else {
      splices.push(result);
    }
  }

  const assetOps = ops.flatMap((op) => (op.kind === 'set-attr-asset' ? [op] : []));
  const placeholderOps = ops.flatMap((op) =>
    op.kind === 'replace-placeholder-with-image' ? [op] : [],
  );
  const insertOps = ops.flatMap((op) => (op.kind === 'insert-image' ? [op] : []));
  if (assetOps.length > 0 || placeholderOps.length > 0 || insertOps.length > 0) {
    const importSplices: Splice[] = [];
    for (const op of assetOps) {
      const plan = planAssetAttr(ast, element, op.attr, op.assetPath);
      if ('error' in plan) return { ok: false, status: 422, error: plan.error };
      splices.push(plan.attrSplice);
      if (plan.importSplice) importSplices.push(plan.importSplice);
    }
    for (const op of placeholderOps) {
      const plan = planReplacePlaceholder(ast, element, op.assetPath);
      if ('error' in plan) return { ok: false, status: 422, error: plan.error };
      splices.push(plan.elementSplice);
      if (plan.importSplice) importSplices.push(plan.importSplice);
    }
    for (const op of insertOps) {
      const plan = planInsertImage(ast, element, op.assetPath, op.x, op.y);
      if ('error' in plan) return { ok: false, status: 422, error: plan.error };
      splices.push(plan.elementSplice);
      if (plan.importSplice) importSplices.push(plan.importSplice);
    }
    // Multiple new imports for the same edit must not overlap, but they
    // all anchor to the same offset (end of last existing import). When
    // applied in reverse-`from` order they would land at the same point,
    // so concat their text into a single splice to keep ordering stable.
    if (importSplices.length > 0) {
      const from = importSplices[0].from;
      const to = importSplices[0].to;
      const text = importSplices.map((s) => s.text).join('');
      splices.push({ from, to, text });
    }
  }

  if (splices.length === 0) return { ok: true, source };

  splices.sort((a, b) => b.from - a.from);
  let next = source;
  for (const sp of splices) {
    next = next.slice(0, sp.from) + sp.text + next.slice(sp.to);
  }
  if (!parseSource(next)) {
    return { ok: false, status: 422, error: 'edit would produce invalid source' };
  }
  return { ok: true, source: next };
}
