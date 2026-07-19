import * as t from '@babel/types';

export type Splice = { from: number; to: number; text: string };

export function jsString(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

export function spliceRange(node: t.Node, text: string): Splice {
  return { from: node.start ?? 0, to: node.end ?? 0, text };
}

// Emit a JSX attribute value: `"foo"` when the value is round-trip-safe
// inside double quotes; otherwise wrap in `{...}` so escapes work.
export function formatJsxAttrValue(value: string): string {
  if (/^[^"\\<>&{}\n\r]*$/.test(value)) return `"${value}"`;
  return `{${jsString(value)}}`;
}

function jsxAttrName(attr: t.JSXAttribute): string | null {
  return t.isJSXIdentifier(attr.name) ? attr.name.name : null;
}

export function findJsxAttr(opening: t.JSXOpeningElement, name: string): t.JSXAttribute | null {
  for (const attr of opening.attributes) {
    if (t.isJSXAttribute(attr) && jsxAttrName(attr) === name) return attr;
  }
  return null;
}

export function readJsxStringAttr(opening: t.JSXOpeningElement, name: string): string | null {
  const attr = findJsxAttr(opening, name);
  const v = attr?.value;
  if (!v) return null;
  if (t.isStringLiteral(v)) return v.value;
  if (t.isJSXExpressionContainer(v) && t.isStringLiteral(v.expression)) return v.expression.value;
  return null;
}

export function readJsxNumberAttr(opening: t.JSXOpeningElement, name: string): number | null {
  const attr = findJsxAttr(opening, name);
  const v = attr?.value;
  if (!v || !t.isJSXExpressionContainer(v)) return null;
  if (!t.isNumericLiteral(v.expression)) return null;
  const n = v.expression.value;
  return Number.isFinite(n) ? n : null;
}

export function buildStyleSplice(
  source: string,
  element: t.JSXElement,
  ops: Array<{ key: string; value: string | null }>,
): Splice | { error: string } | null {
  const opening = element.openingElement;
  const existing = findJsxAttr(opening, 'style');
  type StyleEntry =
    | { kind: 'prop'; key: string; keyText: string; valueText: string }
    | { kind: 'raw'; text: string };
  const entries: StyleEntry[] = [];
  let hasRawEntry = false;

  if (existing) {
    const value = existing.value;
    if (!value || !t.isJSXExpressionContainer(value)) {
      return { error: 'style attribute has unsupported form' };
    }
    const expr = value.expression;
    if (!t.isObjectExpression(expr)) {
      if (typeof expr.start !== 'number' || typeof expr.end !== 'number') {
        return { error: 'style value missing source range' };
      }
      entries.push({ kind: 'raw', text: `...(${source.slice(expr.start, expr.end)})` });
      hasRawEntry = true;
    } else {
      for (const prop of expr.properties) {
        if (t.isObjectProperty(prop) && !prop.computed) {
          let keyName: string | null = null;
          if (t.isIdentifier(prop.key)) keyName = prop.key.name;
          else if (t.isStringLiteral(prop.key)) keyName = prop.key.value;
          if (!keyName) return { error: 'style has unsupported key' };
          const v = prop.value;
          if (
            typeof prop.key.start !== 'number' ||
            typeof prop.key.end !== 'number' ||
            typeof v.start !== 'number' ||
            typeof v.end !== 'number'
          ) {
            return { error: 'style value missing source range' };
          }
          entries.push({
            kind: 'prop',
            key: keyName,
            keyText: source.slice(prop.key.start, prop.key.end),
            valueText: source.slice(v.start, v.end),
          });
        } else {
          if (typeof prop.start !== 'number' || typeof prop.end !== 'number') {
            return { error: 'style value missing source range' };
          }
          entries.push({ kind: 'raw', text: source.slice(prop.start, prop.end) });
          hasRawEntry = true;
        }
      }
    }
  }

  for (const op of ops) {
    const matching = entries.filter(
      (entry): entry is Extract<StyleEntry, { kind: 'prop' }> =>
        entry.kind === 'prop' && entry.key === op.key,
    );
    if (op.value === null) {
      for (const entry of matching) entries.splice(entries.indexOf(entry), 1);
      if (hasRawEntry) {
        entries.push({ kind: 'prop', key: op.key, keyText: op.key, valueText: 'undefined' });
      }
    } else if (matching.length > 0) {
      matching[matching.length - 1].valueText = jsString(op.value);
    } else {
      entries.push({ kind: 'prop', key: op.key, keyText: op.key, valueText: jsString(op.value) });
    }
  }

  if (entries.length === 0) {
    if (!existing) return null;
    let from = existing.start ?? 0;
    if (from > 0 && source[from - 1] === ' ') from -= 1;
    return { from, to: existing.end ?? 0, text: '' };
  }

  const propsText = entries
    .map((entry) => (entry.kind === 'prop' ? `${entry.keyText}: ${entry.valueText}` : entry.text))
    .join(', ');
  const newAttr = `style={{ ${propsText} }}`;

  if (existing) {
    const lastAttr = opening.attributes[opening.attributes.length - 1];
    if (lastAttr && lastAttr !== existing && typeof lastAttr.end === 'number') {
      const attrsAfterStyle = source.slice(existing.end ?? 0, lastAttr.end).replace(/^[ \t]+/, '');
      return {
        from: existing.start ?? 0,
        to: lastAttr.end,
        text: `${attrsAfterStyle} ${newAttr}`,
      };
    }
    return { from: existing.start ?? 0, to: existing.end ?? 0, text: newAttr };
  }
  const lastAttr = opening.attributes[opening.attributes.length - 1];
  const at = lastAttr?.end ?? opening.name.end ?? 0;
  return { from: at, to: at, text: ` ${newAttr}` };
}
