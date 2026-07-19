import * as t from '@babel/types';
import { walkAll, walkJsx } from './babel-walk.ts';
import {
  buildStyleSplice,
  findJsxAttr,
  formatJsxAttrValue,
  jsString,
  type Splice,
  spliceRange,
} from './edit-ops-attrs.ts';
import {
  collectTextCandidates,
  collectTextRangeParts,
  formatOptionalText,
  isOnlyMeaningfulChild,
  meaningfulChildren,
  styleSpanForText,
  type TextCandidate,
  type TextRangePart,
  textLeafRawRange,
  textRangeContent,
} from './edit-ops-text.ts';

export function buildTextRangeStyleSplices(
  ast: t.File,
  source: string,
  element: t.JSXElement,
  start: number,
  end: number,
  op: { key: string; value: string | null },
  prevText?: string,
): Splice[] | { error: string } | null {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) {
    return { error: 'invalid text range' };
  }

  const parts: TextRangePart[] = [];
  collectTextRangeParts(element, parts);
  const current = prevText ?? textRangeContent(parts);
  if (!current) return { error: 'element has no editable text' };
  if (end > current.length) return { error: 'text range is out of bounds' };
  const renderedText = textRangeContent(parts);
  if (prevText !== undefined && renderedText !== prevText) {
    if (elementTextCandidateMatches(ast, element, prevText)) {
      const result = buildStyleSplice(source, element, [op]);
      if (result && 'error' in result) return result;
      return result ? [result] : [];
    }
    return { error: 'no text candidate matches the current value' };
  }

  const splices: Splice[] = [];
  let leafStart = 0;
  for (const leaf of parts) {
    const leafEnd = leafStart + leaf.current.length;
    if (!('raw' in leaf)) {
      leafStart = leafEnd;
      continue;
    }
    const selectedStart = Math.max(start, leafStart);
    const selectedEnd = Math.min(end, leafEnd);
    if (selectedStart >= selectedEnd) {
      leafStart = leafEnd;
      continue;
    }

    if (
      selectedStart === leafStart &&
      selectedEnd === leafEnd &&
      t.isJSXElement(leaf.parent) &&
      leaf.parent !== element &&
      isOnlyMeaningfulChild(leaf.parent, leaf.node)
    ) {
      const result = buildStyleSplice(source, leaf.parent, [op]);
      if (result && 'error' in result) return result;
      if (result) splices.push(result);
      leafStart = leafEnd;
      continue;
    }

    const localStart = selectedStart - leafStart;
    const localEnd = selectedEnd - leafStart;
    const rawRange = textLeafRawRange(leaf, localStart, localEnd);
    if (!rawRange) return { error: 'text range source mismatch' };
    const raw = leaf.raw;
    const { rawStart, rawEnd } = rawRange;
    const before = raw.slice(0, rawStart);
    const selected = leaf.current.slice(localStart, localEnd);
    const after = raw.slice(rawEnd);
    const beforeText = t.isJSXText(leaf.node) ? before : formatOptionalText(before, leaf.text);
    const afterText = t.isJSXText(leaf.node) ? after : formatOptionalText(after, leaf.text);
    splices.push(
      spliceRange(
        leaf.node,
        `${beforeText}${styleSpanForText(selected, op.key, op.value)}${afterText}`,
      ),
    );
    leafStart = leafEnd;
  }

  return splices.length > 0 ? splices : null;
}

// `<Wrap>{children}</Wrap>` and `<h2>{title}</h2>` — sole child is a
// JSXExpressionContainer wrapping a bare Identifier. Returns the identifier
// name; callers branch on `'children'` vs. a generic prop passthrough.
function propPassthroughName(element: t.JSXElement): string | null {
  const meaningful = meaningfulChildren(element);
  if (meaningful.length !== 1) return null;
  const child = meaningful[0];
  if (!t.isJSXExpressionContainer(child)) return null;
  return t.isIdentifier(child.expression) ? child.expression.name : null;
}

type EnclosingComponent = {
  name: string;
  fn: t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression;
};

// Smallest top-level capitalized function whose body covers `target`.
function findEnclosingComponent(ast: t.File, target: t.Node): EnclosingComponent | null {
  let best: EnclosingComponent | null = null;
  let bestSize = Number.POSITIVE_INFINITY;
  const targetStart = target.start ?? 0;
  const targetEnd = target.end ?? 0;
  const consider = (name: string, fn: EnclosingComponent['fn']) => {
    if (!/^[A-Z]/.test(name)) return;
    const fnStart = fn.start ?? 0;
    const fnEnd = fn.end ?? 0;
    if (fnStart > targetStart || fnEnd < targetEnd) return;
    const size = fnEnd - fnStart;
    if (size < bestSize) {
      best = { name, fn };
      bestSize = size;
    }
  };
  const visitDecl = (decl: t.Statement) => {
    if (t.isFunctionDeclaration(decl) && decl.id) {
      consider(decl.id.name, decl);
    } else if (t.isVariableDeclaration(decl)) {
      for (const d of decl.declarations) {
        if (!t.isVariableDeclarator(d) || !t.isIdentifier(d.id) || !d.init) continue;
        if (t.isArrowFunctionExpression(d.init) || t.isFunctionExpression(d.init)) {
          consider(d.id.name, d.init);
        }
      }
    }
  };
  for (const decl of ast.program.body) {
    visitDecl(decl);
    if (t.isExportNamedDeclaration(decl) || t.isExportDefaultDeclaration(decl)) {
      const inner = decl.declaration;
      if (inner && (t.isStatement(inner) || t.isFunctionDeclaration(inner))) {
        visitDecl(inner as t.Statement);
      }
    }
  }
  return best;
}

function componentDestructuresProp(fn: EnclosingComponent['fn'], propName: string): boolean {
  if (fn.params.length === 0) return false;
  let first: t.Node = fn.params[0];
  // Handle `({ title }: Props = defaults)` — strip the default-value wrapper.
  if (t.isAssignmentPattern(first)) first = first.left;
  if (!t.isObjectPattern(first)) return false;
  for (const prop of first.properties) {
    if (!t.isObjectProperty(prop)) continue;
    if (t.isIdentifier(prop.key) && prop.key.name === propName) return true;
    if (t.isStringLiteral(prop.key) && prop.key.value === propName) return true;
  }
  return false;
}

function collectCallSiteCandidates(ast: t.Node, componentName: string): TextCandidate[] {
  const out: TextCandidate[] = [];
  walkJsx(ast, (n) => {
    if (!t.isJSXElement(n)) return;
    const elName = n.openingElement.name;
    if (t.isJSXIdentifier(elName) && elName.name === componentName) {
      collectTextCandidates(n, out);
    }
  });
  return out;
}

function collectPropCallSiteCandidates(
  ast: t.Node,
  componentName: string,
  propName: string,
): TextCandidate[] {
  const out: TextCandidate[] = [];
  walkJsx(ast, (n) => {
    if (!t.isJSXElement(n)) return;
    const elName = n.openingElement.name;
    if (!t.isJSXIdentifier(elName) || elName.name !== componentName) return;
    const attr = findJsxAttr(n.openingElement, propName);
    if (!attr?.value) return; // shorthand-true: not editable text.
    const v = attr.value;
    if (t.isStringLiteral(v)) {
      out.push({
        current: v.value,
        splice: (s) => spliceRange(v, formatJsxAttrValue(s)),
      });
    } else if (t.isJSXExpressionContainer(v)) {
      const expr = v.expression;
      if (t.isStringLiteral(expr) || t.isNumericLiteral(expr)) {
        out.push({
          current: String(expr.value),
          splice: (s) => spliceRange(v, formatJsxAttrValue(s)),
        });
      }
    }
  });
  return out;
}

// Smallest enclosing `arr.map((p) => …)` callback (or `.flatMap`) that
// covers `target`. Returns the callback fn plus the array argument node.
function findEnclosingMapCallback(
  ast: t.Node,
  target: t.Node,
): { fn: t.ArrowFunctionExpression | t.FunctionExpression; arrayArg: t.Expression } | null {
  type Best = {
    fn: t.ArrowFunctionExpression | t.FunctionExpression;
    arrayArg: t.Expression;
    size: number;
  };
  let best: Best | null = null;
  const targetStart = target.start ?? 0;
  const targetEnd = target.end ?? 0;
  walkAll(ast, (node) => {
    if (!t.isCallExpression(node)) return;
    const callee = node.callee;
    if (!t.isMemberExpression(callee) || callee.computed) return;
    if (!t.isIdentifier(callee.property)) return;
    if (callee.property.name !== 'map' && callee.property.name !== 'flatMap') return;
    const fn = node.arguments[0];
    if (!fn || (!t.isArrowFunctionExpression(fn) && !t.isFunctionExpression(fn))) return;
    const fnStart = fn.start ?? 0;
    const fnEnd = fn.end ?? 0;
    if (fnStart > targetStart || fnEnd < targetEnd) return;
    if (!t.isExpression(callee.object)) return;
    const size = fnEnd - fnStart;
    if (!best || size < best.size) best = { fn, arrayArg: callee.object, size };
  });
  if (!best) return null;
  const found: Best = best;
  return { fn: found.fn, arrayArg: found.arrayArg };
}

type ArrayElement = t.Expression | t.SpreadElement;

// `[ {...}, {...} ]` literal, either inline or via a `const x = [ ... ]`
// declaration the receiver resolves to. Returns the ArrayExpression's
// element list, or null if we can't resolve to a literal.
function resolveArrayLiteralElements(ast: t.Node, expr: t.Expression): ArrayElement[] | null {
  const dropHoles = (arr: t.ArrayExpression): ArrayElement[] =>
    arr.elements.filter((e): e is ArrayElement => e != null);
  if (t.isArrayExpression(expr)) return dropHoles(expr);
  if (!t.isIdentifier(expr)) return null;
  const name = expr.name;
  const useStart = expr.start ?? 0;
  let init: t.ArrayExpression | null = null;
  walkAll(ast, (node) => {
    if (!t.isVariableDeclarator(node)) return;
    if (!t.isIdentifier(node.id) || node.id.name !== name) return;
    if (!node.init || !t.isArrayExpression(node.init)) return;
    // Must be declared before the use site; pick the most local match.
    if ((node.init.start ?? 0) > useStart) return;
    init = node.init;
  });
  return init ? dropHoles(init) : null;
}

function findObjectProperty(obj: t.Node, name: string): t.ObjectProperty | null {
  if (!t.isObjectExpression(obj)) return null;
  for (const prop of obj.properties) {
    if (!t.isObjectProperty(prop) || prop.computed) continue;
    if (t.isIdentifier(prop.key) && prop.key.name === name) return prop;
    if (t.isStringLiteral(prop.key) && prop.key.value === name) return prop;
  }
  return null;
}

// Decode `{p.field}` (MemberExpression) or `{field}` (Identifier
// destructured from the callback param) into a single field name.
function decodeMapPassthrough(
  element: t.JSXElement,
  callbackParam: t.Node | undefined,
): string | null {
  const meaningful = meaningfulChildren(element);
  if (meaningful.length !== 1) return null;
  const child = meaningful[0];
  if (!t.isJSXExpressionContainer(child)) return null;
  const expr = child.expression;

  if (t.isMemberExpression(expr)) {
    if (expr.computed) return null;
    if (!t.isIdentifier(expr.object) || !t.isIdentifier(expr.property)) return null;
    if (!callbackParam || !t.isIdentifier(callbackParam)) return null;
    if (callbackParam.name !== expr.object.name) return null;
    return expr.property.name;
  }

  if (t.isIdentifier(expr)) {
    const fieldName = expr.name;
    // Param is `{ field, ... }` destructuring — the identifier names the
    // destructured property. Skip alias/rename forms (`{ field: alias }`).
    if (!callbackParam || !t.isObjectPattern(callbackParam)) return null;
    for (const prop of callbackParam.properties) {
      if (!t.isObjectProperty(prop) || prop.computed) continue;
      if (!t.isIdentifier(prop.key) || prop.key.name !== fieldName) continue;
      // Shorthand `{ field }` → value is also an Identifier with same name.
      // Aliased `{ field: other }` → value is a different identifier; skip.
      return t.isIdentifier(prop.value) && prop.value.name === fieldName ? fieldName : null;
    }
  }

  return null;
}

function collectArrayMapCandidates(ast: t.Node, element: t.JSXElement): TextCandidate[] {
  const ctx = findEnclosingMapCallback(ast, element);
  if (!ctx) return [];
  const fieldName = decodeMapPassthrough(element, ctx.fn.params[0]);
  if (!fieldName) return [];
  const elements = resolveArrayLiteralElements(ast, ctx.arrayArg);
  if (!elements) return [];
  const out: TextCandidate[] = [];
  for (const obj of elements) {
    const prop = findObjectProperty(obj, fieldName);
    if (!prop) continue;
    const v = prop.value;
    if (t.isStringLiteral(v)) {
      out.push({ current: v.value, splice: (s) => spliceRange(v, jsString(s)) });
    } else if (t.isNumericLiteral(v)) {
      out.push({ current: String(v.value), splice: (s) => spliceRange(v, jsString(s)) });
    }
  }
  return out;
}

export function collectElementTextCandidates(ast: t.File, element: t.JSXElement): TextCandidate[] {
  const candidates: TextCandidate[] = [];
  collectTextCandidates(element, candidates);
  if (candidates.length === 0) {
    const passthrough = propPassthroughName(element);
    const enclosing = passthrough ? findEnclosingComponent(ast, element) : null;
    if (passthrough === 'children' && enclosing) {
      candidates.push(...collectCallSiteCandidates(ast, enclosing.name));
    } else if (passthrough && enclosing && componentDestructuresProp(enclosing.fn, passthrough)) {
      candidates.push(...collectPropCallSiteCandidates(ast, enclosing.name, passthrough));
    }
  }
  if (candidates.length === 0) {
    candidates.push(...collectArrayMapCandidates(ast, element));
  }
  return candidates;
}

export function elementTextCandidateMatches(
  ast: t.File,
  element: t.JSXElement,
  prevText: string,
): boolean {
  const norm = prevText.trim();
  return collectElementTextCandidates(ast, element).some((candidate) => candidate.current === norm);
}

export function buildTextSplice(
  ast: t.File,
  element: t.JSXElement,
  value: string,
  prevText?: string,
): Splice | { error: string } {
  const candidates = collectElementTextCandidates(ast, element);
  if (candidates.length === 0) {
    return { error: 'element has no editable text' };
  }
  if (candidates.length === 1) {
    return candidates[0].splice(value);
  }
  if (prevText === undefined) {
    return { error: 'element has multiple text candidates; missing prevText' };
  }
  // Trim: JSX collapses surrounding whitespace at render time, so the
  // DOM `prevText` won't have leading/trailing space the source might.
  const norm = prevText.trim();
  const matches = candidates.filter((c) => c.current === norm);
  if (matches.length === 0) {
    return { error: 'no text candidate matches the current value' };
  }
  if (matches.length > 1) {
    return { error: 'multiple text candidates share the same value; cannot disambiguate' };
  }
  return matches[0].splice(value);
}
