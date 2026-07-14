# Canva 式 Asset 面板與拖曳插入圖片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/s/:slideId` 編輯頁提供左側 asset 面板（卡片保持可見），並支援把面板中的圖片拖進卡片、於放開位置插入 `<img>`。

**Architecture:** 新增一個 `insert-image` EditOp（後端 AST splice + 前端 union），面板縮圖以 HTML5 DnD 自訂 dataTransfer type 拖出，畫布 drop handler 把 client 座標換算為卡片座標後發出編輯。位置全由 `translate` 表達（`position:absolute; left:0; top:0` + `translate:'Xpx Ypx'`），與既有 inspect 拖曳移動共用同一屬性，插入後可直接續拖。

**Tech Stack:** React 18、babel AST splice（`packages/core/src/editing/`）、HTML5 Drag and Drop、vitest。

**Spec:** `docs/superpowers/specs/2026-07-14-asset-panel-drag-design.md`

## Global Constraints

- Biome 必須通過：每個 task 提交前跑 `pnpm check`（必要時 `pnpm check:fix`）。
- `packages/core` 有變更 → 需要 changeset（本計畫在 Task 6 加一個 `minor`）。
- 不新增任何依賴。
- 預設不寫註解；只在 WHY 非顯而易見時寫（見 repo CLAUDE.md）。
- Git commit 使用繁體中文、Conventional Commits 格式。
- 所有指令在 repo root（`/home/js0980420/projects/tooka`）執行。

## 現有程式碼關鍵事實（實作前先讀這段）

- **EditOp union 有兩份鏡像定義**：後端 `packages/core/src/editing/edit-ops.ts:4-16`（欄位名 `kind`）、前端 `packages/core/src/app/lib/inspector/use-editor.ts:3-15`。兩邊都要加 `insert-image`。
- **`planAssetImport(ast, assetPath)`**（`edit-ops.ts:1088`）回傳 `{ identifier, importSplice | null }`，已處理 import 去重與識別字衝突。直接重用。
- **`applyEdit(source, line, column, ops)`**（`edit-ops.ts:1165`）是後端進入點：`findElementForEdit` 以 line/column 找到 JSX 元素，各 op 產生 `Splice { from, to, text }`，反向排序後套用，最後 `parseSource` 驗證。asset 類 op 的 wiring 在 `edit-ops.ts:1226-1254`，import splices 會 concat 成單一 splice（同錨點）。
- **`jsString(s)`**（`edit-ops.ts:24`）產生單引號 JS 字串字面值。
- **前端 `useEditor(slideId)`**（`use-editor.ts:30`）提供 `applyEdit(line, column, ops)` → POST `/__edit`，失敗 throw。
- **元素 → 原始碼位置**：loc-tags Vite plugin 在 slide 檔案的 JSX 元素上注入 `data-slide-loc="line:column"`（見 `fiber.ts:37 findSlideSource` 的 primary path）。卡片頁面根元素也有此屬性；某元素的「卡片根」= 沿祖先鏈最外層帶 `data-slide-loc` 的元素。
- **縮放換算**：`canvasScale(renderedWidth, layoutWidth)`（`app/lib/inspector/drag.ts:22`），inspect 拖曳用法：`canvasScale(root.getBoundingClientRect().width, root.offsetWidth)`。
- **`useAssets(slideId)`**（`app/lib/assets.ts:171`）回傳 `{ assets, loading, upload, refresh, ... }`；global scope 的 slideId 是 `'@global'`。`uploadWithAutoRename(slideId, file)`（`assets.ts:71`）處理副檔名小寫與 409 改名。`AssetEntry` 有 `name/mime/url` 欄位。
- **ImagePlaceholder**（`app/components/image-placeholder.tsx`）：DEV 模式掛 dragEnter/Over/Leave/Drop，目前只認 `dataTransfer.files`；drop 後 `handleDrop` 上傳並 POST `replace-placeholder-with-image`。它從 `root.dataset.slideLoc` 解析 line/column。
- **slide.tsx**（`app/routes/slide.tsx`）：`view` 來自 `?view=assets`（line 107），控制 toolbar Tabs（536-556）、warm gate（362）、整頁 AssetView 分支（707-710）；多處 `view === 'slides' &&` 條件。layout 為 `ResizableRail | <main data-inspector-root data-slide-id> | InspectorPanel/DesignPanel`。
- **Locale**：`t.asset.scopeSlide/scopeGlobal/upload/dropToUpload/loading/noAssetsYet`、`t.slide.assetsTab`、`t.imagePlaceholder.uploadFailed` 都已存在（`src/locale/types.ts`），**不需要新增任何 locale 字串**。
- 測試風格見 `src/editing/edit-ops.test.ts`：合成原始碼字串陣列 join('\n')，JSX 開標籤都在 column 0，斷言 `r.source` 內容。

---

### Task 1: 後端 `insert-image` EditOp + 前端 union 同步

**Files:**
- Modify: `packages/core/src/editing/edit-ops.ts`（union `:4-16`、`planReplacePlaceholder` 後新增 `planInsertImage`、`applyEdit` 的 asset wiring `:1226-1254`）
- Modify: `packages/core/src/app/lib/inspector/use-editor.ts:3-15`（union）
- Test: `packages/core/src/editing/edit-ops.test.ts`

**Interfaces:**
- Consumes: `planAssetImport(ast, assetPath)`、`jsString()`、`PlaceholderEditPlan`（皆為 edit-ops.ts 既有）。
- Produces: EditOp variant `{ kind: 'insert-image'; assetPath: string; x: number; y: number }`（前後端同名同欄位）。x/y 為卡片座標 px（可為小數，後端 `Math.round`）。插入結果固定為 `<img src={ident} alt="" style={{ position: 'absolute', left: 0, top: 0, translate: 'Xpx Ypx', width: 320 }} />`，接在目標元素 children 尾端（closing tag 之前）。Task 5 依賴此 variant。

- [ ] **Step 1: 寫失敗測試**

在 `packages/core/src/editing/edit-ops.test.ts` 檔案尾端加入：

```ts
describe('applyEdit / insert-image', () => {
  const src = [
    'export default [() => (',
    '<div style={{ padding: 24 }}>',
    '  <h1>Hello</h1>',
    '</div>',
    ')];',
    '',
  ].join('\n');

  it('appends an img with import, rounded translate and default width', () => {
    const r = applyEdit(src, 2, 0, [
      { kind: 'insert-image', assetPath: './assets/photo.png', x: 120.4, y: 80.6 },
    ]);
    if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
    expect(r.source).toContain("import photo from './assets/photo.png';");
    expect(r.source).toContain(
      '<img src={photo} alt="" style={{ position: \'absolute\', left: 0, top: 0, ' +
        "translate: '120px 81px', width: 320 }} />",
    );
    expect(r.source.indexOf('<img')).toBeLessThan(r.source.indexOf('</div>'));
  });

  it('reuses an existing default import for the same asset', () => {
    const withImport = `import photo from './assets/photo.png';\n${src}`;
    const r = applyEdit(withImport, 3, 0, [
      { kind: 'insert-image', assetPath: './assets/photo.png', x: 5, y: 5 },
    ]);
    if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
    expect(r.source.match(/import photo from/g)).toHaveLength(1);
    expect(r.source).toContain('<img src={photo}');
  });

  it('rejects asset paths outside the assets folders', () => {
    const r = applyEdit(src, 2, 0, [
      { kind: 'insert-image', assetPath: '../secrets/x.png', x: 0, y: 0 },
    ]);
    expect(r.ok).toBe(false);
  });

  it('rejects non-finite coordinates', () => {
    const r = applyEdit(src, 2, 0, [
      { kind: 'insert-image', assetPath: './assets/photo.png', x: Number.NaN, y: 0 },
    ]);
    expect(r.ok).toBe(false);
  });

  it('rejects inserting into a self-closing element', () => {
    const selfClosing = [
      'export default [() => (',
      '<div style={{ padding: 24 }} />',
      ')];',
      '',
    ].join('\n');
    const r = applyEdit(selfClosing, 2, 0, [
      { kind: 'insert-image', assetPath: './assets/photo.png', x: 10, y: 10 },
    ]);
    expect(r.ok).toBe(false);
  });

  it('combines with set-style on the same element in one edit', () => {
    const r = applyEdit(src, 2, 0, [
      { kind: 'set-style', key: 'position', value: 'relative' },
      { kind: 'insert-image', assetPath: './assets/photo.png', x: 10, y: 20 },
    ]);
    if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
    expect(r.source).toContain("position: 'relative'");
    expect(r.source).toContain("translate: '10px 20px'");
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm exec vitest run packages/core/src/editing/edit-ops.test.ts`
Expected: FAIL — 新 describe 內全部紅（TypeScript 對未知 kind 也會在 typecheck 報錯，vitest 執行時 op 會被忽略導致斷言失敗）。

- [ ] **Step 3: 實作**

3a. `packages/core/src/editing/edit-ops.ts` union（line 16 `replace-placeholder-with-image` 之後）加：

```ts
  | { kind: 'insert-image'; assetPath: string; x: number; y: number };
```

（記得把原本 union 最後一行結尾的 `;` 移到新行。）

3b. `planReplacePlaceholder`（約 line 1163）之後新增：

```ts
function planInsertImage(
  ast: t.File,
  element: t.JSXElement,
  assetPath: string,
  x: number,
  y: number,
): PlaceholderEditPlan | { error: string } {
  if (!assetPath.startsWith('./assets/') && !assetPath.startsWith('@assets/')) {
    return { error: 'asset path must start with ./assets/ or @assets/' };
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { error: 'invalid insert position' };
  }
  const closing = element.closingElement;
  if (!closing) return { error: 'cannot insert into a self-closing element' };

  const { identifier, importSplice } = planAssetImport(ast, assetPath);
  const translate = `${Math.round(x)}px ${Math.round(y)}px`;
  const img =
    `<img src={${identifier}} alt="" ` +
    `style={{ position: 'absolute', left: 0, top: 0, translate: ${jsString(translate)}, width: 320 }} />`;
  const at = closing.start ?? 0;
  return { importSplice, elementSplice: { from: at, to: at, text: img } };
}
```

3c. `applyEdit` 的 asset wiring（約 line 1226-1254）改為也處理 insert：

```ts
  const assetOps = ops.flatMap((op) => (op.kind === 'set-attr-asset' ? [op] : []));
  const placeholderOps = ops.flatMap((op) =>
    op.kind === 'replace-placeholder-with-image' ? [op] : [],
  );
  const insertImageOps = ops.flatMap((op) => (op.kind === 'insert-image' ? [op] : []));
  if (assetOps.length > 0 || placeholderOps.length > 0 || insertImageOps.length > 0) {
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
    for (const op of insertImageOps) {
      const plan = planInsertImage(ast, element, op.assetPath, op.x, op.y);
      if ('error' in plan) return { ok: false, status: 422, error: plan.error };
      splices.push(plan.elementSplice);
      if (plan.importSplice) importSplices.push(plan.importSplice);
    }
```

（既有的 importSplices concat 註解與後續程式不動。）

3d. `packages/core/src/app/lib/inspector/use-editor.ts` union（line 15 之後）加同一個 variant：

```ts
  | { kind: 'insert-image'; assetPath: string; x: number; y: number };
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm exec vitest run packages/core/src/editing/edit-ops.test.ts`
Expected: PASS（既有測試 + 新 6 個全綠）。

- [ ] **Step 5: Biome + typecheck + commit**

```bash
pnpm check && pnpm typecheck
git add packages/core/src/editing/edit-ops.ts packages/core/src/editing/edit-ops.test.ts packages/core/src/app/lib/inspector/use-editor.ts
git commit -m "feat: 新增 insert-image EditOp 於卡片插入圖片元素"
```

---

### Task 2: asset 拖曳協定與座標換算純函式

**Files:**
- Create: `packages/core/src/app/lib/inspector/asset-drag.ts`
- Test: `packages/core/src/app/lib/inspector/asset-drag.test.ts`

**Interfaces:**
- Consumes: `canvasScale` from `./drag`。
- Produces（Task 3、4、5 依賴）:
  - `ASSET_DND_TYPE: string`（`'application/x-tooka-asset'`）
  - `type AssetScope = 'slide' | 'global'`
  - `type AssetDragPayload = { name: string; scope: AssetScope }`
  - `writeAssetDrag(dt: DataTransfer, payload: AssetDragPayload): void`
  - `hasAssetDrag(dt: DataTransfer | null): boolean`
  - `readAssetDrag(dt: DataTransfer): AssetDragPayload | null`
  - `assetPathForScope(name: string, scope: AssetScope): string`
  - `parseSlideLoc(loc: string | undefined): { line: number; column: number } | null`
  - `dropPointToCardCoords(rect: { left: number; top: number; width: number }, layoutWidth: number, clientX: number, clientY: number): { x: number; y: number } | null`

- [ ] **Step 1: 寫失敗測試**

建立 `packages/core/src/app/lib/inspector/asset-drag.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import {
  ASSET_DND_TYPE,
  assetPathForScope,
  dropPointToCardCoords,
  hasAssetDrag,
  parseSlideLoc,
  readAssetDrag,
} from './asset-drag';

function fakeDataTransfer(data: Record<string, string>): DataTransfer {
  return {
    types: Object.keys(data),
    getData: (type: string) => data[type] ?? '',
  } as unknown as DataTransfer;
}

describe('assetPathForScope', () => {
  it('maps slide scope to relative assets path', () => {
    expect(assetPathForScope('a.png', 'slide')).toBe('./assets/a.png');
  });
  it('maps global scope to @assets path', () => {
    expect(assetPathForScope('a.png', 'global')).toBe('@assets/a.png');
  });
});

describe('parseSlideLoc', () => {
  it('parses line:column', () => {
    expect(parseSlideLoc('12:4')).toEqual({ line: 12, column: 4 });
  });
  it('rejects malformed values', () => {
    expect(parseSlideLoc(undefined)).toBeNull();
    expect(parseSlideLoc('')).toBeNull();
    expect(parseSlideLoc('12')).toBeNull();
    expect(parseSlideLoc(':4')).toBeNull();
    expect(parseSlideLoc('a:b')).toBeNull();
  });
});

describe('hasAssetDrag / readAssetDrag', () => {
  it('detects the custom type', () => {
    expect(hasAssetDrag(fakeDataTransfer({ [ASSET_DND_TYPE]: '{}' }))).toBe(true);
    expect(hasAssetDrag(fakeDataTransfer({ Files: '' }))).toBe(false);
    expect(hasAssetDrag(null)).toBe(false);
  });
  it('reads a valid payload', () => {
    const dt = fakeDataTransfer({
      [ASSET_DND_TYPE]: JSON.stringify({ name: 'a.png', scope: 'slide' }),
    });
    expect(readAssetDrag(dt)).toEqual({ name: 'a.png', scope: 'slide' });
  });
  it('rejects invalid JSON, bad scope, and path-traversal names', () => {
    expect(readAssetDrag(fakeDataTransfer({ [ASSET_DND_TYPE]: 'not-json' }))).toBeNull();
    expect(
      readAssetDrag(
        fakeDataTransfer({ [ASSET_DND_TYPE]: JSON.stringify({ name: 'a.png', scope: 'x' }) }),
      ),
    ).toBeNull();
    expect(
      readAssetDrag(
        fakeDataTransfer({
          [ASSET_DND_TYPE]: JSON.stringify({ name: '../a.png', scope: 'slide' }),
        }),
      ),
    ).toBeNull();
    expect(
      readAssetDrag(fakeDataTransfer({ [ASSET_DND_TYPE]: JSON.stringify({ name: '' }) })),
    ).toBeNull();
  });
});

describe('dropPointToCardCoords', () => {
  it('converts client coords through the canvas scale', () => {
    const rect = { left: 150, top: 200, width: 540 };
    expect(dropPointToCardCoords(rect, 1080, 170, 230)).toEqual({ x: 40, y: 60 });
  });
  it('returns null for a degenerate rect', () => {
    expect(dropPointToCardCoords({ left: 0, top: 0, width: 0 }, 1080, 10, 10)).toBeNull();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm exec vitest run packages/core/src/app/lib/inspector/asset-drag.test.ts`
Expected: FAIL — 模組不存在。

- [ ] **Step 3: 實作**

建立 `packages/core/src/app/lib/inspector/asset-drag.ts`：

```ts
import { canvasScale } from './drag';

export const ASSET_DND_TYPE = 'application/x-tooka-asset';

export type AssetScope = 'slide' | 'global';

export type AssetDragPayload = { name: string; scope: AssetScope };

export function assetPathForScope(name: string, scope: AssetScope): string {
  return scope === 'global' ? `@assets/${name}` : `./assets/${name}`;
}

export function writeAssetDrag(dt: DataTransfer, payload: AssetDragPayload): void {
  dt.setData(ASSET_DND_TYPE, JSON.stringify(payload));
  dt.effectAllowed = 'copy';
}

export function hasAssetDrag(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  for (let i = 0; i < dt.types.length; i++) {
    if (dt.types[i] === ASSET_DND_TYPE) return true;
  }
  return false;
}

export function readAssetDrag(dt: DataTransfer): AssetDragPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(dt.getData(ASSET_DND_TYPE));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { name, scope } = parsed as { name?: unknown; scope?: unknown };
  if (typeof name !== 'string' || name.length === 0) return null;
  if (name.includes('/') || name.includes('\\') || name.includes('..')) return null;
  if (scope !== 'slide' && scope !== 'global') return null;
  return { name, scope };
}

export function parseSlideLoc(loc: string | undefined): { line: number; column: number } | null {
  if (!loc) return null;
  const idx = loc.indexOf(':');
  if (idx <= 0) return null;
  const line = Number(loc.slice(0, idx));
  const column = Number(loc.slice(idx + 1));
  if (!Number.isFinite(line) || !Number.isFinite(column)) return null;
  return { line, column };
}

export function dropPointToCardCoords(
  rect: { left: number; top: number; width: number },
  layoutWidth: number,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const scale = canvasScale(rect.width, layoutWidth);
  if (scale === null) return null;
  return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
}
```

注意 `parseSlideLoc('a:b')`：`Number('a')` 是 NaN → null,已被測試覆蓋。

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm exec vitest run packages/core/src/app/lib/inspector/asset-drag.test.ts`
Expected: PASS（12 個斷言全綠）。

- [ ] **Step 5: Biome + commit**

```bash
pnpm check
git add packages/core/src/app/lib/inspector/asset-drag.ts packages/core/src/app/lib/inspector/asset-drag.test.ts
git commit -m "feat: 新增 asset 拖曳協定與座標換算純函式"
```

---

### Task 3: AssetPanel 左側面板元件

**Files:**
- Create: `packages/core/src/app/components/asset-panel/asset-panel.tsx`

**Interfaces:**
- Consumes: `useAssets` / `uploadWithAutoRename`（`@/lib/assets`）、`writeAssetDrag` / `AssetScope`（Task 2）、`Tabs`/`Button`（`@/components/ui/*`）、`useLocale`。
- Produces: `AssetPanel({ slideId, open }: { slideId: string; open: boolean })` — `open=false` 時 render null。Task 4 依賴。

- [ ] **Step 1: 建立元件**

建立 `packages/core/src/app/components/asset-panel/asset-panel.tsx`：

```tsx
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { uploadWithAutoRename, useAssets } from '@/lib/assets';
import { type AssetScope, writeAssetDrag } from '@/lib/inspector/asset-drag';
import { useLocale } from '@/lib/use-locale';

const GLOBAL_SLIDE_ID = '@global';

export function AssetPanel({ slideId, open }: { slideId: string; open: boolean }) {
  const t = useLocale();
  const [scope, setScope] = useState<AssetScope>('slide');
  const scopeId = scope === 'global' ? GLOBAL_SLIDE_ID : slideId;
  const { assets, loading, refresh } = useAssets(scopeId);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const images = assets.filter((a) => a.mime.startsWith('image/'));

  const uploadFiles = (files: FileList) => {
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (picked.length === 0) return;
    setUploading(true);
    (async () => {
      for (const file of picked) {
        const { ok } = await uploadWithAutoRename(scopeId, file);
        if (!ok) toast.error(t.imagePlaceholder.uploadFailed);
      }
      await refresh();
    })()
      .catch(() => toast.error(t.imagePlaceholder.uploadFailed))
      .finally(() => setUploading(false));
  };

  return (
    <aside
      aria-label={t.slide.assetsTab}
      className="hidden w-60 shrink-0 flex-col border-r border-hairline bg-sidebar md:flex"
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth.current += 1;
        setDragActive(true);
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragActive(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth.current = 0;
        setDragActive(false);
        uploadFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-hairline px-3 py-2">
        <Tabs value={scope} onValueChange={(next) => setScope(next as AssetScope)}>
          <TabsList>
            <TabsTrigger value="slide">{t.asset.scopeSlide}</TabsTrigger>
            <TabsTrigger value="global">{t.asset.scopeGlobal}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={uploading}
          aria-label={t.asset.upload}
          title={t.asset.upload}
          onClick={() => fileInput.current?.click()}
        >
          <Upload className="size-4" />
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="text-[12px] text-muted-foreground">{t.asset.loading}</p>
        ) : images.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">{t.asset.noAssetsYet}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {images.map((a) => (
              <img
                key={a.name}
                src={a.url}
                alt={a.name}
                title={a.name}
                draggable
                onDragStart={(e) => writeAssetDrag(e.dataTransfer, { name: a.name, scope })}
                className="aspect-square w-full cursor-grab rounded-md border border-hairline object-cover"
              />
            ))}
          </div>
        )}
        {dragActive && (
          <div
            className="pointer-events-none absolute inset-2 grid place-items-center rounded-md text-[12px] font-medium"
            style={{
              border: '2px dashed oklch(0.62 0.18 250)',
              background: 'oklch(0.62 0.18 250 / 0.08)',
              color: 'oklch(0.45 0.16 250)',
            }}
          >
            {t.asset.dropToUpload}
          </div>
        )}
      </div>
    </aside>
  );
}

function hasFiles(e: React.DragEvent): boolean {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  for (let i = 0; i < types.length; i++) {
    if (types[i] === 'Files') return true;
  }
  return false;
}
```

實作時如遇 import 路徑不符（例如 `Tabs` 實際位置不同），以 `asset-view.tsx` 頂部的 import 為準對齊,不要自創路徑。

- [ ] **Step 2: typecheck + Biome**

Run: `pnpm typecheck && pnpm check`
Expected: 皆通過（元件尚未被引用,tsc 仍會檢查）。

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/app/components/asset-panel/asset-panel.tsx
git commit -m "feat: 新增左側 AssetPanel 元件"
```

---

### Task 4: slide.tsx 整合 — 面板開關取代整頁切換

**Files:**
- Modify: `packages/core/src/app/routes/slide.tsx`（`:21` import、`:107` view 狀態、`:109-119` hot.send、`:362` warm gate、`:536-556` toolbar Tabs、各處 `view === 'slides' &&`、`:707-711` 整頁分支、`:715` 之後插入面板）

**Interfaces:**
- Consumes: `AssetPanel`（Task 3）。
- Produces: `assetsOpen: boolean` state 與 `<main>` 佈局不變的插槽結構;Task 5 會在同檔 `<main>` 上掛 drop handlers。

- [ ] **Step 1: 修改 slide.tsx**

1a. import 區：移除 `import { AssetView } from '@/components/asset-view';`（line 21）,加入：

```ts
import { AssetPanel } from '@/components/asset-panel/asset-panel';
```

（若 `Tabs`/`TabsList`/`TabsTrigger` 因此不再被使用,一併移除該 import。）

1b. line 107 的 `const view = searchParams.get('view') === 'assets' ? 'assets' : 'slides';` 改為：

```ts
const [assetsOpen, setAssetsOpen] = useState(false);
```

1c. hot.send（line 109-119）：`view,` 改為 `view: 'slides',`,依賴陣列移除 `view`：

```ts
  useEffect(() => {
    if (!import.meta.hot) return;
    if (!slideId || !slide || pageCount === 0) return;
    import.meta.hot.send('tooka:current', {
      slideId,
      pageIndex: index,
      totalPages: pageCount,
      slideTitle: slide.meta?.title ?? slideId,
      view: 'slides',
    });
  }, [slideId, index, pageCount, slide]);
```

（`view` 欄位是 dev-agent 協定的一部分,保留欄位、固定值。）

1d. warm gate（line 362）：`if (view !== 'assets' && !isDeckWarmed(slideId))` 改為 `if (!isDeckWarmed(slideId))`。

1e. toolbar Tabs 區塊（line 536-556 的 `{import.meta.env.DEV && (<Tabs ...>...</Tabs>)}`）整塊換成：

```tsx
{import.meta.env.DEV && (
  <Button
    type="button"
    size="sm"
    variant={assetsOpen ? 'secondary' : 'ghost'}
    aria-pressed={assetsOpen}
    onClick={() => setAssetsOpen((v) => !v)}
  >
    {t.slide.assetsTab}
  </Button>
)}
```

1f. 所有 `{view === 'slides' && (...)}` 條件（copyLink、下載選單、行動版選單、DesignToggleButton、InspectToggleButton、簡報按鈕群,約 line 570/597/620/648/651/653）：拿掉 `view === 'slides' &&`,內容保留。

1g. 主體區（line 707-711）：刪除 `{view === 'assets' ? ( <div className="min-h-0 flex-1"><AssetView slideId={slideId} /></div> ) : (` 與對應的 `)}`,讓 `<DesignProvider>` 分支成為唯一內容。

1h. 在 `<ResizableRail ... />`（原 line 715-724）之後、`<main ...>` 之前插入：

```tsx
{import.meta.env.DEV && <AssetPanel slideId={slideId} open={assetsOpen} />}
```

- [ ] **Step 2: typecheck + Biome + 既有測試**

Run: `pnpm typecheck && pnpm check && pnpm test`
Expected: 全部通過（此檔沒有單元測試,靠 tsc 抓漏改的 `view` 引用 — 若 tsc 報 `view` 未定義,代表 1f/1g 有遺漏）。

- [ ] **Step 3: 手動驗證面板**

Dev server 已在跑（`http://localhost:5173`）。開 `http://localhost:5173/s/demo-carousel`：
- 點 toolbar「素材」→ 左側面板展開,卡片仍可見;再點一次收合。
- 面板內可見已上傳圖片縮圖;「此卡片/全域」切換正常;上傳按鈕可用。
- `?view=assets` 已無作用(直接顯示卡片)。

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/app/routes/slide.tsx
git commit -m "feat: slide 頁以左側 asset 面板取代整頁素材切換"
```

---

### Task 5: 拖曳插入 — 畫布 drop handler 與 placeholder 支援

**Files:**
- Create: `packages/core/src/app/components/asset-panel/use-asset-drop.ts`
- Modify: `packages/core/src/app/routes/slide.tsx`（`<main>` 掛 handlers）
- Modify: `packages/core/src/app/components/image-placeholder.tsx`（認自訂 type、抽出 `applyReplace`）

**Interfaces:**
- Consumes: Task 1 的 `insert-image` op、Task 2 的全部 exports、`useEditor`（`@/lib/inspector/use-editor`）。
- Produces: `useAssetDrop(slideId): { onDragOver, onDrop }`（掛在 `<main>` 上）。

- [ ] **Step 1: 建立 use-asset-drop.ts**

```ts
import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  assetPathForScope,
  dropPointToCardCoords,
  hasAssetDrag,
  parseSlideLoc,
  readAssetDrag,
} from '@/lib/inspector/asset-drag';
import { type EditOp, useEditor } from '@/lib/inspector/use-editor';

// elementsFromPoint 而非 e.target:inspect 模式的 overlay 元素可能蓋在
// 卡片上成為 drop target,穿透掃描才能命中卡片本體。
function findCardRoot(clientX: number, clientY: number): HTMLElement | null {
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    let tagged = el.closest<HTMLElement>('[data-slide-loc]');
    if (!tagged) continue;
    let parent = tagged.parentElement?.closest<HTMLElement>('[data-slide-loc]') ?? null;
    while (parent) {
      tagged = parent;
      parent = tagged.parentElement?.closest<HTMLElement>('[data-slide-loc]') ?? null;
    }
    return tagged;
  }
  return null;
}

export function useAssetDrop(slideId: string) {
  const { applyEdit } = useEditor(slideId);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!hasAssetDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!hasAssetDrag(e.dataTransfer)) return;
      e.preventDefault();
      const payload = readAssetDrag(e.dataTransfer);
      if (!payload) return;
      const root = findCardRoot(e.clientX, e.clientY);
      const loc = parseSlideLoc(root?.dataset.slideLoc);
      if (!root || !loc) {
        console.warn('[tooka] asset drop ignored: no slide root at drop point');
        return;
      }
      const coords = dropPointToCardCoords(
        root.getBoundingClientRect(),
        root.offsetWidth,
        e.clientX,
        e.clientY,
      );
      if (!coords) return;
      const ops: EditOp[] = [];
      if (getComputedStyle(root).position === 'static') {
        ops.push({ kind: 'set-style', key: 'position', value: 'relative' });
      }
      ops.push({
        kind: 'insert-image',
        assetPath: assetPathForScope(payload.name, payload.scope),
        x: coords.x,
        y: coords.y,
      });
      applyEdit(loc.line, loc.column, ops).catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : String(err));
      });
    },
    [applyEdit],
  );

  return { onDragOver, onDrop };
}
```

- [ ] **Step 2: slide.tsx 的 `<main>` 掛上 handlers**

在 `Slide` 元件內（其他 hooks 旁）加：

```ts
const assetDrop = useAssetDrop(slideId);
```

import：

```ts
import { useAssetDrop } from '@/components/asset-panel/use-asset-drop';
```

`<main>`（原 line 725-730）加 spread：

```tsx
<main
  ref={slideViewportRef}
  data-inspector-root
  data-slide-id={slideId}
  className="relative min-h-0 min-w-0 flex-1 bg-canvas p-2 md:p-10"
  {...(import.meta.env.DEV ? assetDrop : null)}
>
```

- [ ] **Step 3: ImagePlaceholder 認自訂 type**

`packages/core/src/app/components/image-placeholder.tsx`：

3a. import 加：

```ts
import {
  assetPathForScope,
  hasAssetDrag,
  parseSlideLoc,
  readAssetDrag,
} from '@/lib/inspector/asset-drag';
```

3b. `dndProps` 整段改為（asset drop 必須 `stopPropagation`,否則事件冒泡到 `<main>` 會再插入一張）：

```tsx
const dndProps = import.meta.env.DEV
  ? {
      onDragEnter: (e: React.DragEvent<HTMLDivElement>) => {
        if (uploading || !(hasImageFile(e) || hasAssetDrag(e.dataTransfer))) return;
        e.preventDefault();
        dragDepth.current += 1;
        setDragActive(true);
      },
      onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
        if (uploading || !(hasImageFile(e) || hasAssetDrag(e.dataTransfer))) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      },
      onDragLeave: () => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragActive(false);
      },
      onDrop: (e: React.DragEvent<HTMLDivElement>) => {
        const isAsset = hasAssetDrag(e.dataTransfer);
        if (uploading || !(isAsset || hasImageFile(e))) return;
        e.preventDefault();
        if (isAsset) e.stopPropagation();
        dragDepth.current = 0;
        setDragActive(false);
        const root = e.currentTarget;
        const slideId = root.closest<HTMLElement>('[data-slide-id]')?.dataset.slideId;
        const loc = parseSlideLoc(root.dataset.slideLoc);
        if (!slideId || !loc) return;
        const run = isAsset
          ? (() => {
              const payload = readAssetDrag(e.dataTransfer);
              if (!payload) return null;
              return applyReplace(
                slideId,
                assetPathForScope(payload.name, payload.scope),
                loc.line,
                loc.column,
              );
            })()
          : (() => {
              const file = pickImageFile(e.dataTransfer.files);
              if (!file) return null;
              return handleDrop(slideId, file, loc.line, loc.column);
            })();
        if (!run) return;
        setUploading(true);
        run
          .catch(() => toast.error(t.imagePlaceholder.uploadFailed))
          .finally(() => setUploading(false));
      },
    }
  : null;
```

3c. 檔尾的 `handleDrop` 拆出 `applyReplace`（原本行內的 loc 解析已由 `parseSlideLoc` 取代）：

```ts
async function handleDrop(slideId: string, file: File, line: number, column: number) {
  const { ok, entry } = await uploadWithAutoRename(slideId, file);
  if (!ok || !entry) throw new Error('upload failed');
  await applyReplace(slideId, `./assets/${entry.name}`, line, column);
}

async function applyReplace(slideId: string, assetPath: string, line: number, column: number) {
  const res = await fetch('/__edit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      slideId,
      line,
      column,
      ops: [{ kind: 'replace-placeholder-with-image', assetPath }],
    }),
  });
  if (!res.ok) throw new Error(`edit failed (${res.status})`);
}
```

- [ ] **Step 4: typecheck + Biome + 全部測試**

Run: `pnpm typecheck && pnpm check && pnpm test`
Expected: 全部通過。

- [ ] **Step 5: 手動驗證拖曳（核心驗收）**

開 `http://localhost:5173/s/demo-carousel`,面板展開後：

1. 從面板拖一張圖到卡片空白處放開 → 圖片出現在放開位置。
2. 檢查 `apps/studio/slides/demo-carousel/index.tsx`：多了 `import xxx from './assets/…'` 與 `<img src={xxx} alt="" style={{ position: 'absolute', left: 0, top: 0, translate: '…px …px', width: 320 }} />`;若卡片根原本無定位,根元素 style 多了 `position: 'relative'`。
3. 開 inspect 模式,選取剛插入的圖片並拖曳 → 可移動(共用 translate 管線)。
4. 拖到既有 `ImagePlaceholder` 上放開 → 走替換,且**只**替換、沒有多插入一張(驗證 stopPropagation)。
5. 從桌面拖檔案到 placeholder → 原上傳替換行為不變。
6. 切到「全域」scope 拖入 → 原始碼 import 路徑為 `@assets/…`。
7. Undo/redo 與 SaveBar 對既有功能無迴歸(插入為立即寫檔,不進 pending)。

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/app/components/asset-panel/use-asset-drop.ts packages/core/src/app/routes/slide.tsx packages/core/src/app/components/image-placeholder.tsx
git commit -m "feat: 支援從 asset 面板拖曳圖片插入卡片"
```

---

### Task 6: Changeset 與最終驗證

**Files:**
- Create: `.changeset/asset-panel-drag-insert.md`

**Interfaces:**
- Consumes: 無。
- Produces: release 用 changeset。

- [ ] **Step 1: 建立 changeset**

建立 `.changeset/asset-panel-drag-insert.md`：

```md
---
'@tooka/core': minor
---

Add a Canva-style left asset panel with drag-to-insert images onto the card.
```

- [ ] **Step 2: 全面驗證**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: 全部通過。

- [ ] **Step 3: Commit**

```bash
git add .changeset/asset-panel-drag-insert.md
git commit -m "chore: 新增 asset 面板拖曳插入功能的 changeset"
```
