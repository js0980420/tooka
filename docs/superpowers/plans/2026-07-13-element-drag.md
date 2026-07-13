# Inspect 模式元素拖曳 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 inspect 模式中拖曳已選取的元素,放開後把位移以 `translate: 'Xpx Ypx'` 寫回卡片原始碼。

**Architecture:** 純函式(translate 解析/合成/縮放換算)放在 `app/lib/inspector/drag.ts`,附單元測試;拖曳狀態機掛在 `inspect-overlay.tsx` 既有的 window pointer 監聽層,即時預覽直接改元素 inline style,放開時透過 `useInspector().bufferOps` 送出 `set-style` op,自動整合 undo/redo、pending 編輯與儲存列。

**Tech Stack:** React 18、TypeScript、vitest(environment: node)、biome。

## Global Constraints

- 不新增任何依賴。
- `pnpm check`(biome)提交前必須通過。
- `packages/core` 有變更 → 需要一個 `@open-cards/core` 的 `minor` changeset,描述一行、現在式。
- 預設不寫註解;只在 WHY 不明顯時寫。
- Git commit 訊息用繁體中文 + Conventional Commits,結尾加 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`。
- vitest 環境是 `node`(無 jsdom),單元測試只能測純函式。
- Spec: `docs/superpowers/specs/2026-07-13-element-drag-design.md`。

---

### Task 1: translate 純函式模組

**Files:**
- Create: `packages/core/src/app/lib/inspector/drag.ts`
- Test: `packages/core/src/app/lib/inspector/drag.test.ts`

**Interfaces:**
- Consumes: 無(純函式,零依賴)。
- Produces(Task 2 依賴這些簽名):
  - `type Translate = { x: number; y: number }`
  - `parseTranslate(value: string): Translate | null` — 解析 inline `style.translate`;空字串/`none` 回傳 `{x:0,y:0}`;px 值(1 或 2 個)回傳座標;其他形式(%、calc、3 值)回傳 `null` 表示不可拖曳。
  - `composeTranslate(x: number, y: number): string | null` — 四捨五入為整數;歸零回傳 `null`(表示移除 style key),否則 `'Xpx Ypx'`。
  - `canvasScale(renderedWidth: number, layoutWidth: number): number | null` — 回傳縮放比;非有限值或 ≤0 回傳 `null`。

- [ ] **Step 1: 寫失敗測試**

建立 `packages/core/src/app/lib/inspector/drag.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canvasScale, composeTranslate, parseTranslate } from './drag.ts';

describe('parseTranslate', () => {
  it('treats empty and none as origin', () => {
    expect(parseTranslate('')).toEqual({ x: 0, y: 0 });
    expect(parseTranslate('  ')).toEqual({ x: 0, y: 0 });
    expect(parseTranslate('none')).toEqual({ x: 0, y: 0 });
  });

  it('parses single px value with y defaulting to 0', () => {
    expect(parseTranslate('12px')).toEqual({ x: 12, y: 0 });
    expect(parseTranslate('-8.5px')).toEqual({ x: -8.5, y: 0 });
  });

  it('parses two px values', () => {
    expect(parseTranslate('24px -60px')).toEqual({ x: 24, y: -60 });
    expect(parseTranslate('0px 0px')).toEqual({ x: 0, y: 0 });
  });

  it('rejects non-px forms', () => {
    expect(parseTranslate('-50% -50%')).toBeNull();
    expect(parseTranslate('calc(100% - 10px)')).toBeNull();
    expect(parseTranslate('1px 2px 3px')).toBeNull();
    expect(parseTranslate('12')).toBeNull();
    expect(parseTranslate('12px 50%')).toBeNull();
  });
});

describe('composeTranslate', () => {
  it('returns null at origin so the style key is removed', () => {
    expect(composeTranslate(0, 0)).toBeNull();
    expect(composeTranslate(0.4, -0.4)).toBeNull();
  });

  it('rounds to integer px', () => {
    expect(composeTranslate(24.6, -59.5)).toBe('25px -59px');
    expect(composeTranslate(-1, 0)).toBe('-1px 0px');
  });
});

describe('canvasScale', () => {
  it('computes rendered/layout ratio', () => {
    expect(canvasScale(540, 1080)).toBe(0.5);
    expect(canvasScale(1080, 1080)).toBe(1);
  });

  it('rejects degenerate inputs', () => {
    expect(canvasScale(0, 1080)).toBeNull();
    expect(canvasScale(540, 0)).toBeNull();
    expect(canvasScale(Number.NaN, 1080)).toBeNull();
    expect(canvasScale(540, Number.NaN)).toBeNull();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm vitest run packages/core/src/app/lib/inspector/drag.test.ts`
Expected: FAIL(`Cannot find module './drag.ts'` 或同義錯誤)

- [ ] **Step 3: 最小實作**

建立 `packages/core/src/app/lib/inspector/drag.ts`:

```ts
export type Translate = { x: number; y: number };

const PX = /^(-?\d+(?:\.\d+)?)px$/;

export function parseTranslate(value: string): Translate | null {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'none') return { x: 0, y: 0 };
  const parts = trimmed.split(/\s+/);
  if (parts.length > 2) return null;
  const nums = parts.map((part) => PX.exec(part)?.[1]);
  if (nums.some((n) => n === undefined)) return null;
  return { x: Number(nums[0]), y: parts.length === 2 ? Number(nums[1]) : 0 };
}

export function composeTranslate(x: number, y: number): string | null {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (rx === 0 && ry === 0) return null;
  return `${rx}px ${ry}px`;
}

export function canvasScale(renderedWidth: number, layoutWidth: number): number | null {
  if (!Number.isFinite(renderedWidth) || !Number.isFinite(layoutWidth)) return null;
  if (renderedWidth <= 0 || layoutWidth <= 0) return null;
  return renderedWidth / layoutWidth;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm vitest run packages/core/src/app/lib/inspector/drag.test.ts`
Expected: PASS(3 個 describe 全綠)

- [ ] **Step 5: biome + commit**

```bash
pnpm check:fix
git add packages/core/src/app/lib/inspector/drag.ts packages/core/src/app/lib/inspector/drag.test.ts
git commit -m "feat: 新增元素拖曳的 translate 純函式

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: inspect-overlay 拖曳狀態機

**Files:**
- Modify: `packages/core/src/app/components/inspector/inspect-overlay.tsx`

**Interfaces:**
- Consumes:
  - Task 1 的 `parseTranslate` / `composeTranslate` / `canvasScale`(from `@/lib/inspector/drag`)。
  - `useInspector()` 的 `bufferOps(line: number, column: number, anchor: HTMLElement, ops: EditOp[]): void`(已存在,樂觀更新 DOM + 記錄 undo/redo + 進 pending)。
  - 既有的 `pickElement`、`isInspectableEventTarget`、`findSlideSource`。
- Produces: 無新匯出(行為變更:選取元素可拖曳)。

**關鍵不變量(實作時不可違反):**
1. `bufferOps` 第一次觸碰某 style key 時,會把「當下 DOM 值」快照為原始值 → **pointerup 必須先把 inline translate 還原成拖曳前的值,再呼叫 `bufferOps`**,否則取消/undo 會還原到拖曳後的位置。
2. 拖曳中的 Escape 必須攔在既有「Escape 退出 inspect 模式」之前:兩者在同一個 handler 裡,先檢查拖曳狀態。
3. 拖曳結束後緊接的 click 事件必須吞掉,否則會觸發既有的點選邏輯。

- [ ] **Step 1: 實作拖曳狀態機**

修改 `inspect-overlay.tsx`。新增 import:

```tsx
import { canvasScale, composeTranslate, parseTranslate } from '@/lib/inspector/drag';
```

`InspectOverlay` 內,`useInspector()` 解構加上 `bufferOps`:

```tsx
const { active, slideId, selected, setSelected, cancel, openCrop, bufferOps } = useInspector();
```

在 `hover` state 之後新增拖曳用的 refs(`selectedRef` 讓 pointer handler 讀到最新選取而不重掛監聽;`dragRef` 存進行中的拖曳;`suppressClickRef` 吞拖曳後的 click):

```tsx
type DragState = {
  pointerId: number;
  anchor: HTMLElement;
  line: number;
  column: number;
  startX: number;
  startY: number;
  base: { x: number; y: number };
  scale: number;
  origInline: string;
  dragging: boolean;
};

const selectedRef = useRef(selected);
useEffect(() => {
  selectedRef.current = selected;
});
const dragRef = useRef<DragState | null>(null);
const suppressClickRef = useRef(false);
```

(`DragState` type 宣告放在檔案頂層、`Highlight` 旁邊。)

主 effect 內新增/修改 handlers:

```tsx
const endDrag = (revert: boolean) => {
  const drag = dragRef.current;
  if (!drag) return;
  dragRef.current = null;
  document.documentElement.style.cursor = '';
  if (revert && drag.anchor.isConnected) drag.anchor.style.translate = drag.origInline;
};

const onPointerDown = (e: PointerEvent) => {
  if (e.button !== 0) return;
  const sel = selectedRef.current;
  if (!sel?.anchor.isConnected) return;
  if (!isInspectableEventTarget(e.target)) return;
  const el = pickElement(e.clientX, e.clientY);
  if (!el) return;
  const hit = findSlideSource(el, slideId, { hostOnly: true });
  if (!hit || hit.anchor !== sel.anchor) return;
  const base = parseTranslate(sel.anchor.style.translate);
  if (!base) return;
  const root = sel.anchor.closest<HTMLElement>('[data-inspector-root]');
  if (!root) return;
  const scale = canvasScale(root.getBoundingClientRect().width, root.offsetWidth);
  if (scale === null) return;
  e.preventDefault();
  dragRef.current = {
    pointerId: e.pointerId,
    anchor: sel.anchor,
    line: sel.line,
    column: sel.column,
    startX: e.clientX,
    startY: e.clientY,
    base,
    scale,
    origInline: sel.anchor.style.translate,
    dragging: false,
  };
};

const onPointerUp = (e: PointerEvent) => {
  const drag = dragRef.current;
  if (!drag || e.pointerId !== drag.pointerId) return;
  const moved = drag.dragging;
  endDrag(false);
  if (!moved) return;
  suppressClickRef.current = true;
  if (!drag.anchor.isConnected) return;
  const dx = (e.clientX - drag.startX) / drag.scale;
  const dy = (e.clientY - drag.startY) / drag.scale;
  const value = composeTranslate(drag.base.x + dx, drag.base.y + dy);
  // bufferOps 以當下 DOM 值快照原始 style;先還原預覽,快照才是拖曳前的值
  drag.anchor.style.translate = drag.origInline;
  if (value === drag.origInline || (value === null && drag.origInline === '')) return;
  bufferOps(drag.line, drag.column, drag.anchor, [{ kind: 'set-style', key: 'translate', value }]);
};

const onPointerCancel = (e: PointerEvent) => {
  const drag = dragRef.current;
  if (!drag || e.pointerId !== drag.pointerId) return;
  endDrag(true);
  suppressClickRef.current = true;
};

const onDragStart = (e: DragEvent) => {
  if (dragRef.current) e.preventDefault();
};
```

修改既有 `onMove`(拖曳進行中優先於 hover 邏輯):

```tsx
const onMove = (e: PointerEvent) => {
  const drag = dragRef.current;
  if (drag && e.pointerId === drag.pointerId) {
    if (!drag.anchor.isConnected) {
      endDrag(false);
      return;
    }
    if (!drag.dragging) {
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 3) return;
      drag.dragging = true;
      drag.anchor.setPointerCapture(drag.pointerId);
      document.documentElement.style.cursor = 'move';
      setHover(null);
    }
    const dx = (e.clientX - drag.startX) / drag.scale;
    const dy = (e.clientY - drag.startY) / drag.scale;
    drag.anchor.style.translate =
      `${Math.round(drag.base.x + dx)}px ${Math.round(drag.base.y + dy)}px`;
    return;
  }
  if (!isInspectableEventTarget(e.target)) return setHover(null);
  const el = pickElement(e.clientX, e.clientY);
  if (!el) return setHover(null);
  const hit = findSlideSource(el, slideId, { hostOnly: true });
  if (!hit) return setHover(null);
  setHover({ hit });
};
```

修改既有 `onKey`(拖曳中 Escape 只取消拖曳):

```tsx
const onKey = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  if (dragRef.current) {
    endDrag(true);
    suppressClickRef.current = true;
    return;
  }
  cancel();
};
```

修改既有 `onClick`,開頭加上:

```tsx
const onClick = (e: MouseEvent) => {
  if (suppressClickRef.current) {
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  // ……既有邏輯不變
};
```

註冊/清除監聽(與既有四個並列,全部 capture):

```tsx
window.addEventListener('pointerdown', onPointerDown, true);
window.addEventListener('pointerup', onPointerUp, true);
window.addEventListener('pointercancel', onPointerCancel, true);
window.addEventListener('dragstart', onDragStart, true);
```

cleanup 對應移除,並在 cleanup 開頭呼叫 `endDrag(true)`(effect 重跑或 inspect 關閉時不留半途拖曳)。effect 依賴陣列加上 `bufferOps`。

- [ ] **Step 2: typecheck + biome**

Run: `pnpm typecheck && pnpm check:fix`
Expected: 兩者皆通過,無錯誤。

- [ ] **Step 3: 手動端到端驗證**

dev server(`pnpm dev`,已含 `--host`)開 `http://localhost:5173/s/demo-carousel`,依序驗證:

1. inspect 模式點選一個標題 → 按住拖動 → 元素即時跟隨、游標變 `move`。
2. 放開 → 儲存列出現 pending 編輯 → 儲存 → 打開 `apps/studio/slides/demo-carousel/index.tsx` 確認該元素 style 出現 `translate: 'Xpx Ypx'`。
3. undo(Cmd/Ctrl+Z)→ 元素回到原位;redo → 回到新位。
4. 拖曳中按 Escape → 元素彈回原位、無 pending 編輯。
5. 點一下(不拖)→ 仍是純選取,行為不變;雙擊圖片 → 裁切對話框照常。
6. 給某元素手動加 `translate: '-50%'` → 該元素按住拖動無反應(不可拖曳保護)。
7. 拖回原位放開 → 不產生編輯;先存過一次 translate 再拖回原位 → 儲存後原始碼的 translate key 被移除。

Expected: 全部符合。任何一項不符 → 回頭修,不得帶病提交。

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/app/components/inspector/inspect-overlay.tsx
git commit -m "feat: inspect 模式支援拖曳移動選取元素

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: changeset 與最終驗證

**Files:**
- Create: `.changeset/<自動命名>.md`

**Interfaces:**
- Consumes: Task 1、2 的變更。
- Produces: 可發佈的 minor 版本記錄。

- [ ] **Step 1: 新增 changeset**

建立 `.changeset/` 下新檔(命名照 repo 慣例,兩個小寫單字加連字號即可),內容:

```md
---
'@open-cards/core': minor
---

Drag selected elements in inspect mode to reposition them; the offset persists as a `translate` style.
```

- [ ] **Step 2: 全量驗證**

Run: `pnpm check && pnpm typecheck && pnpm test`
Expected: 三者全部通過(既有測試 + Task 1 新測試)。

- [ ] **Step 3: Commit**

```bash
git add .changeset/
git commit -m "chore: 新增元素拖曳 changeset

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
