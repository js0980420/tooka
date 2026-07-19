import * as t from '@babel/types';
import {
  findJsxAttr,
  jsString,
  readJsxNumberAttr,
  readJsxStringAttr,
  type Splice,
  spliceRange,
} from './edit-ops-attrs.ts';

export type ImportInfo = {
  node: t.ImportDeclaration;
  source: string;
  defaultIdent: string | null;
};

export function findImports(ast: t.File): ImportInfo[] {
  const out: ImportInfo[] = [];
  for (const node of ast.program.body) {
    if (!t.isImportDeclaration(node)) continue;
    let def: string | null = null;
    for (const spec of node.specifiers) {
      if (t.isImportDefaultSpecifier(spec)) {
        def = spec.local.name;
        break;
      }
    }
    out.push({ node, source: node.source.value, defaultIdent: def });
  }
  return out;
}

function collectTopLevelIdentifiers(ast: t.File): Set<string> {
  // Only need to avoid colliding with anything resolvable by JSX —
  // import bindings cover the common case. Local consts/lets are
  // handled by source-level identifier scanning below.
  const names = new Set<string>();
  for (const imp of findImports(ast)) {
    if (imp.defaultIdent) names.add(imp.defaultIdent);
    for (const spec of imp.node.specifiers) {
      if (!t.isImportDefaultSpecifier(spec)) names.add(spec.local.name);
    }
  }
  return names;
}

export function safeAssetIdentifier(filename: string, taken: Set<string>): string {
  const stem = filename.replace(/\.[^.]+$/, '');
  let camel = '';
  let upper = false;
  for (const ch of stem) {
    if (/[A-Za-z0-9]/.test(ch)) {
      camel += upper ? ch.toUpperCase() : ch;
      upper = false;
    } else {
      upper = camel.length > 0;
    }
  }
  let base = camel;
  if (!base || !/^[A-Za-z_$]/.test(base)) {
    base = `asset${base.charAt(0).toUpperCase()}${base.slice(1)}` || 'asset';
  }
  base = base.charAt(0).toLowerCase() + base.slice(1);
  let candidate = base;
  let i = 2;
  while (taken.has(candidate)) {
    candidate = `${base}${i}`;
    i += 1;
  }
  return candidate;
}

type AssetEditPlan = {
  importSplice: Splice | null;
  attrSplice: Splice;
};

export function planAssetImport(
  ast: t.File,
  assetPath: string,
): { identifier: string; importSplice: Splice | null } {
  const imports = findImports(ast);
  for (const imp of imports) {
    if (imp.source === assetPath && imp.defaultIdent) {
      return { identifier: imp.defaultIdent, importSplice: null };
    }
  }
  const filename = assetPath.slice(assetPath.lastIndexOf('/') + 1);
  const identifier = safeAssetIdentifier(filename, collectTopLevelIdentifiers(ast));
  const importStmt = `import ${identifier} from '${assetPath.replace(/'/g, "\\'")}';\n`;
  const last = imports[imports.length - 1];
  const insertAt = last ? (last.node.end ?? 0) : 0;
  const prefix = last ? '\n' : '';
  return { identifier, importSplice: { from: insertAt, to: insertAt, text: prefix + importStmt } };
}

export function planAssetAttr(
  ast: t.File,
  element: t.JSXElement,
  attr: string,
  assetPath: string,
): AssetEditPlan | { error: string } {
  if (!attr || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(attr)) return { error: 'invalid attribute name' };
  if (!assetPath.startsWith('./assets/') && !assetPath.startsWith('@assets/')) {
    return { error: 'asset path must start with ./assets/ or @assets/' };
  }

  const { identifier, importSplice } = planAssetImport(ast, assetPath);
  const opening = element.openingElement;
  const newAttr = `${attr}={${identifier}}`;
  const existing = findJsxAttr(opening, attr);
  const attrSplice: Splice = existing
    ? { from: existing.start ?? 0, to: existing.end ?? 0, text: newAttr }
    : { from: opening.name.end ?? 0, to: opening.name.end ?? 0, text: ` ${newAttr}` };
  return { importSplice, attrSplice };
}

type PlaceholderEditPlan = {
  importSplice: Splice | null;
  elementSplice: Splice;
};

export function planInsertImage(
  ast: t.File,
  element: t.JSXElement,
  assetPath: string,
  x: number,
  y: number,
): PlaceholderEditPlan | { error: string } {
  if (!assetPath.startsWith('./assets/') && !assetPath.startsWith('@assets/')) {
    return { error: 'asset path must start with ./assets/ or @assets/' };
  }
  const closing = element.closingElement;
  if (!closing) return { error: 'cannot insert into a self-closing element' };

  const { identifier, importSplice } = planAssetImport(ast, assetPath);
  const translate = `'${Math.round(x)}px ${Math.round(y)}px'`;
  const img =
    `<img src={${identifier}} alt="" ` +
    `style={{ position: 'absolute', left: 0, top: 0, translate: ${translate}, width: '320px' }} />`;
  const at = closing.start ?? 0;
  return { importSplice, elementSplice: { from: at, to: at, text: img } };
}

export function planReplacePlaceholder(
  ast: t.File,
  element: t.JSXElement,
  assetPath: string,
): PlaceholderEditPlan | { error: string } {
  const opening = element.openingElement;
  if (!t.isJSXIdentifier(opening.name) || opening.name.name !== 'ImagePlaceholder') {
    return { error: 'not a placeholder' };
  }
  if (!assetPath.startsWith('./assets/') && !assetPath.startsWith('@assets/')) {
    return { error: 'asset path must start with ./assets/ or @assets/' };
  }

  const hint = readJsxStringAttr(opening, 'hint') ?? '';
  const width = readJsxNumberAttr(opening, 'width');
  const height = readJsxNumberAttr(opening, 'height');

  const { identifier, importSplice } = planAssetImport(ast, assetPath);

  const styleParts: string[] = [];
  if (width != null) styleParts.push(`width: ${width}`);
  else if (height != null) styleParts.push(`width: '100%'`);
  if (height != null) styleParts.push(`height: ${height}`);
  else if (width != null) styleParts.push(`height: '100%'`);
  styleParts.push(`objectFit: 'cover'`);
  styleParts.push(`objectPosition: '50% 50%'`);
  const replacement =
    `<img src={${identifier}} alt=${jsString(hint)} ` + `style={{ ${styleParts.join(', ')} }} />`;

  return { importSplice, elementSplice: spliceRange(element, replacement) };
}
