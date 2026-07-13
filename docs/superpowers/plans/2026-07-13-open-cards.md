# open-cards 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 open-slide fork 改造成 agent 驅動的 IG 輪播圖工具 open-cards：1080×1350 畫布、品牌系統、IG 式預覽、PNG 匯出。

**Architecture:** 整份 monorepo 複製後瘦身（移除 web/cli/changesets），全域改名，把畫布尺寸單一來源化後改為 4:5，將既有 PPTX 截圖管線改造成 PNG 匯出，viewer 加 IG 式導覽，themes 機制擴充為品牌系統，skills 全面改寫為輪播工作流。

**Tech Stack:** pnpm + Turbo monorepo、React 18、Vite、Tailwind 4、html-to-image、fflate、vitest、biome。

**Spec:** `docs/superpowers/specs/2026-07-13-open-cards-design.md`

## Global Constraints

- 所有 git commit 訊息用繁體中文 + Conventional Commits（`feat:`/`fix:`/`chore:`/`docs:`），結尾加 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`。
- **專案文件一律用英文撰寫**（2026-07-13 使用者指示）：README、CLAUDE.md、AGENTS.md、所有 SKILL.md、品牌檔（`themes/*.md`）的章節結構與說明文字。示範輪播的卡片文案（IG 內容本身）維持繁體中文。
- 每個 task 結束前 `pnpm check`（biome）、`pnpm typecheck`、`pnpm test` 必須全綠才能 commit。
- **零新增 npm 依賴**。
- 畫布固定 **1080×1350**，唯一定義處是 `packages/core/src/app/lib/sdk.ts` 的 `CANVAS_WIDTH` / `CANVAS_HEIGHT`。
- 全域改名規則：`@open-slide/` → `@open-cards/`、`open-slide` → `open-cards`、`OpenSlide` → `OpenCards`。**保留** `os-` / `osd-` CSS class 與 data-attribute 前綴（內部識別字，與 open-slide 字串無關）。
- 不使用 changesets（已移除），不手動 bump 版本。
- `packages/core/src/app/components/ui` 是 shadcn 產生且被 biome 忽略 — 不要動。
- 工作目錄：`/home/js0980420/projects/open-cards`（repo 已 init，含 docs/ 兩個 commit）。來源：`/home/js0980420/projects/open-slide`。

---

### Task 1: 匯入 open-slide 原始碼作為基底

**Files:**
- Create: 整個 repo 內容（複製自 open-slide，排除 git/產物）

**Interfaces:**
- Produces: 一個 `pnpm install && pnpm typecheck && pnpm test && pnpm check` 全綠的 open-slide 副本，後續所有 task 在其上修改。

- [ ] **Step 1: 複製原始碼**

```bash
cd /home/js0980420/projects/open-slide
rsync -a --exclude .git --exclude node_modules --exclude dist --exclude .turbo \
  --exclude 'apps/demo/dist' ./ /home/js0980420/projects/open-cards/
```

- [ ] **Step 2: 安裝依賴並確認基準全綠**

```bash
cd /home/js0980420/projects/open-cards
pnpm install
pnpm typecheck && pnpm test && pnpm check
```

Expected: 三個指令都成功結束（exit 0）。若 check 有格式問題，先 `pnpm check:fix` 再確認。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: 匯入 open-slide 原始碼作為 open-cards 基底"
```

---

### Task 2: 移除 web、cli、changesets 與發佈設施

**Files:**
- Delete: `apps/web/`、`packages/cli/`、`.changeset/`、`.github/workflows/release.yml`、`apps/demo/netlify.toml`、`apps/demo/vercel.json`
- Modify: `package.json`（root）

**Interfaces:**
- Produces: workspace 只剩 `packages/core` 與 `apps/demo`；root scripts 不再引用被刪套件。

- [ ] **Step 1: 刪除目錄與檔案**

```bash
cd /home/js0980420/projects/open-cards
git rm -r -q apps/web packages/cli .changeset .github/workflows/release.yml \
  apps/demo/netlify.toml apps/demo/vercel.json
```

- [ ] **Step 2: 清理 root package.json**

從 root `package.json` 的 `scripts` 移除：`dev:web`、`cli`、`changeset`、`version-packages`、`release`。
從 `devDependencies` 移除：`@changesets/changelog-github`、`@changesets/cli`。

- [ ] **Step 3: 重新安裝並驗證**

```bash
pnpm install
pnpm typecheck && pnpm test && pnpm check
```

Expected: 全綠。`.github/workflows/ci.yml` 保留（跑 check/test，仍有用）；若 ci.yml 引用了被刪的套件路徑，把該引用移除。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: 移除 apps/web、packages/cli 與 changesets 發佈設施"
```

---

### Task 3: 全域改名 open-slide → open-cards、demo → studio

**Files:**
- Rename: `apps/demo/` → `apps/studio/`、`apps/studio/open-slide.config.ts` → `open-cards.config.ts`
- Modify: 所有含 `open-slide` / `OpenSlide` 字串的追蹤檔案（含 `packages/core` 全部、locale、skills、README、CLAUDE.md、turbo/workspace 設定）

**Interfaces:**
- Produces: 套件名 `@open-cards/core`、bin 名 `open-cards`、config 型別 `OpenCardsConfig`、設定檔名 `open-cards.config.ts`、workspace app 名 `studio`。後續 task 一律使用這些新名稱。

- [ ] **Step 1: 目錄與檔案改名**

```bash
cd /home/js0980420/projects/open-cards
git mv apps/demo apps/studio
git mv apps/studio/open-slide.config.ts apps/studio/open-cards.config.ts
```

- [ ] **Step 2: 全域字串替換**

對所有 git 追蹤檔案執行（排除 `pnpm-lock.yaml`，稍後由 pnpm 重生）：

```bash
git ls-files -z | grep -zv 'pnpm-lock.yaml' \
  | xargs -0 sh -c 'for f; do [ -L "$f" ] && continue; [ -f "$f" ] || continue; sed -i \
      -e "s/@open-slide\//@open-cards\//g" \
      -e "s/open-slide/open-cards/g" \
      -e "s/OpenSlide/OpenCards/g" "$f"; done' _
```

（repo 內有多個 tracked symlink——根目錄 `CLAUDE.md`、`.claude/skills/*`、`apps/studio/.claude|.agents/skills/*`——`sed -i` 直接碰它們會出錯或把 symlink 換成一般檔案，所以必須跳過。`apps/studio/.agents/skills/*` 的舊 symlink 目標含 `@open-slide` 路徑，改名後會暫時懸空，Task 8 Step 5 重新 sync 時解決，先不管。）

替換後人工抽查三處確認語意正確：
1. `packages/core/package.json` — `name` 為 `@open-cards/core`、`bin` 鍵為 `open-cards`；順手把 `description`、`homepage`、`repository`、`bugs`、`author`、`keywords` 改成 open-cards 自己的內容（repository 可先留空字串或移除）。
2. `apps/studio/package.json` — `name` 改為 `studio`（sed 不會替換 `demo`，手動改），scripts 為 `open-cards dev` 等。
3. root `package.json` — `name` 改為 `open-cards-monorepo`，`core` script 的 filter 為 `@open-cards/core`；若有 `dev:demo` script 改為 `dev:studio`（filter `studio`）。

- [ ] **Step 3: 重新安裝（重生 lockfile 名稱）並驗證**

```bash
pnpm install
pnpm typecheck && pnpm test && pnpm check
```

Expected: 全綠。特別注意 `packages/core/src/cli/run.test.ts` 與 vite 測試中的名稱斷言（sed 已一併改到，失敗就檢查該處遺漏）。

- [ ] **Step 4: 啟動 dev server 煙霧測試**

```bash
cd apps/studio && pnpm dev
```

Expected: dev server 啟動、瀏覽器可開首頁（此時還是 16:9 舊示範內容，正常）。確認後停掉。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: 全域改名為 open-cards，demo 應用改名 studio"
```

---

### Task 4: 畫布改為 1080×1350（4:5）

**Files:**
- Modify: `packages/core/src/app/lib/sdk.ts:36-37`、`packages/core/src/app/lib/sdk.test.ts`、`packages/core/src/app/lib/export-html.ts`、`packages/core/src/app/lib/export-pdf.ts`、`packages/core/src/app/components/themes/themes-gallery.tsx:45`、`packages/core/src/app/components/themes/theme-detail.tsx:101,229`、`packages/core/src/app/routes/home.tsx:515`

**Interfaces:**
- Consumes: `CANVAS_WIDTH` / `CANVAS_HEIGHT`（`sdk.ts`，已被 viewer/thumbnail/presenter 引用）。
- Produces: 全 app 畫布 1080×1350；`export-html.ts` / `export-pdf.ts` 改為 import 這兩個常數，不再寫死尺寸。

- [ ] **Step 1: 先改測試（TDD）**

`packages/core/src/app/lib/sdk.test.ts` 全檔改為：

```ts
import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './sdk.ts';

describe('canvas constants', () => {
  it('targets a 1080x1350 canvas', () => {
    expect(CANVAS_WIDTH).toBe(1080);
    expect(CANVAS_HEIGHT).toBe(1350);
  });

  it('preserves a 4:5 aspect ratio', () => {
    expect(CANVAS_WIDTH / CANVAS_HEIGHT).toBeCloseTo(4 / 5);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
pnpm test -- sdk.test
```

Expected: FAIL（仍是 1920/1080）。

- [ ] **Step 3: 改常數**

`packages/core/src/app/lib/sdk.ts`：

```ts
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;
```

- [ ] **Step 4: export-html.ts / export-pdf.ts 改為引用常數**

兩檔開頭加 `import { CANVAS_HEIGHT, CANVAS_WIDTH } from './sdk';`，然後把每個寫死的 `1920` / `1080` 換成模板字串插值。具體位置（行號為原始碼位置，sed/編輯時以內容為準）：

`export-html.ts`：
- L78-79 `width: '1920px'` → `` width: `${CANVAS_WIDTH}px` ``（height 同理）
- L90-91 `host.style.width = '1920px'` → `` host.style.width = `${CANVAS_WIDTH}px` ``（height 同理）
- L263 `.os-frame { width: 1920px; height: 1080px; ...` — 該 CSS 字串本身改成模板字串插值
- L280 `Math.min(window.innerWidth / 1920, window.innerHeight / 1080)` — 這段是序列化進 HTML 的 inline script 字串，改成 `${CANVAS_WIDTH}` / `${CANVAS_HEIGHT}` 插值

`export-pdf.ts`（`PRINT_STYLES` 是 const 字串，改成模板字面值插值）：
- L12 `@page { size: 1920px 1080px; ...`
- L39-40 `.os-print-frame` 的 width/height
- supersample 區塊內所有 `1920` / `1080`（含註解裡的說明尺寸一併更新為 1080×1350）

改完 grep 驗證：

```bash
grep -rn "1920" packages/core/src --include="*.ts" --include="*.tsx" | grep -v pptx
```

Expected: 無輸出（export-pptx.ts 下個 task 會整檔刪除，可忽略）。

- [ ] **Step 5: 縮圖比例改 4:5**

`themes-gallery.tsx:45`、`theme-detail.tsx:101` 與 `:229`、`home.tsx:515` 四處 className 中的 `aspect-video` → `aspect-[4/5]`（該行其餘 class 不動）。

- [ ] **Step 6: 跑測試與型別檢查**

```bash
pnpm test && pnpm typecheck && pnpm check
```

Expected: 全綠。

- [ ] **Step 7: dev server 目視驗證**

```bash
cd apps/studio && pnpm dev
```

Expected: 開任一示範 slide，畫布為直式 4:5（舊內容版面跑版是預期的，Task 9 會全部換掉）；首頁縮圖為直式。確認後停掉。

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: 畫布改為 1080×1350 並將匯出尺寸單一來源化"
```

---

### Task 5: 移除 PPTX 匯出，新增 PNG 匯出

**Files:**
- Create: `packages/core/src/app/lib/export-png.ts`、`packages/core/src/app/lib/export-png-name.ts`、`packages/core/src/app/lib/export-png-name.test.ts`、`packages/core/src/app/components/png-progress-toast.tsx`
- Delete: `packages/core/src/app/lib/export-pptx.ts`、`packages/core/src/app/components/pptx-progress-toast.tsx`
- Modify: `packages/core/src/app/routes/slide.tsx`（匯出選單區，約 L56、L63、L473-535）、`packages/core/src/locale/en.ts`、`zh-tw.ts`、`zh-cn.ts`、`ja.ts`

**Interfaces:**
- Consumes: `SlideModule`（sdk）、`designToCssVars`、`print-ready` 的等待工具、`fflate` 的 `zipSync`——全部沿用 export-pptx.ts 現有 import。
- Produces: `exportSlideAsPng(slide: SlideModule, slideId: string, onProgress?: (p: PngExportProgress) => void): Promise<void>`；`PngExportProgress = { phase: 'processing' | 'generating' | 'done'; current: number; total: number; percent: number }`；`pngFileName(index: number, total: number): string`。

- [ ] **Step 1: 先寫檔名工具的失敗測試**

`packages/core/src/app/lib/export-png-name.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { pngFileName } from './export-png-name.ts';

describe('pngFileName', () => {
  it('zero-pads to the width of the total count', () => {
    expect(pngFileName(0, 5)).toBe('card-1.png');
    expect(pngFileName(2, 12)).toBe('card-03.png');
    expect(pngFileName(11, 12)).toBe('card-12.png');
  });
});
```

（vitest 環境是 `node`，DOM 截圖流程不做單元測試，靠 Step 7 手動驗證。純函式抽到獨立檔 `export-png-name.ts`，避免 node 環境 import 到 DOM 程式碼。）

- [ ] **Step 2: 跑測試確認失敗**

```bash
pnpm test -- export-png
```

Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作 `export-png-name.ts` 與 `export-png.ts`**

`packages/core/src/app/lib/export-png-name.ts`：

```ts
export function pngFileName(index: number, total: number): string {
  const width = String(total).length;
  return `card-${String(index + 1).padStart(width, '0')}.png`;
}
```

`export-png.ts` 以 `export-pptx.ts` 為底改造（複製後修改，非從零寫）：
1. 保留：容器建立、動畫凍結 style、`designToCssVars`、每頁 render + `waitForFonts` / `waitForDataWaitfor` / `isFrameAnimationSettled` 等待、`toPng`（html-to-image）截圖迴圈、進度回報結構。
2. `SLIDE_W` / `SLIDE_H` 常數刪除，改 `import { CANVAS_HEIGHT, CANVAS_WIDTH } from './sdk';`。
3. `CAPTURE_PIXEL_RATIO` 改為 `1`（IG 需要的就是 1080×1350 實際像素）。
4. 刪除所有 EMU / pptx XML 組裝碼。截圖結果（dataURL）轉 `Uint8Array` 後：
   - 多頁：用 `fflate` 的 `zipSync` 打包成 `{ [pngFileName(i, total)]: bytes }`，下載檔名 `${slideId}.zip`。
   - 單頁：直接下載 `${slideId}.png`。
   - dataURL → bytes 與觸發下載的做法照抄 export-pptx.ts / export-html.ts 既有寫法（`atob` + `Uint8Array`、`Blob` + `URL.createObjectURL` + `<a download>`）。
5. 型別與函式名：`PptxExportProgress` → `PngExportProgress`、`exportSlideAsImagePptx` → `exportSlideAsPng`；`phase` 字面值維持 `'processing' | 'generating' | 'done'`。
6. class / id 常數 `os-pptx-capture` → `os-png-capture`、`os-pptx-capture-style` → `os-png-capture-style`。

- [ ] **Step 4: 跑測試確認通過**

```bash
pnpm test -- export-png
```

Expected: PASS。

- [ ] **Step 5: 進度 toast 與選單接線**

1. `pptx-progress-toast.tsx` 複製為 `png-progress-toast.tsx`：component 改名 `PngProgressToast`，props 型別改 `PngExportProgress`，顯示文字改用新 locale 鍵（下一步）。
2. `slide.tsx`：import 改為 `PngProgressToast` / `exportSlideAsPng`；`exportImagePptx` 函式改名 `exportPng`，toast id 改 `png-export-${slideId}`，錯誤訊息 key 改 `t.slide.pngExportFailed`；選單項改為：

```tsx
<DropdownMenuItem disabled={exporting} onClick={exportPng}>
  <ImageDown className="size-4" />
  {t.slide.exportAsPng}
</DropdownMenuItem>
```

（`ImageDown` 來自 lucide-react，加進現有 import。）
3. 刪除「Export as PPTX (coming soon)」的 disabled 選單項與 `pptxComingSoonTooltip` 相關 JSX。
4. `git rm packages/core/src/app/lib/export-pptx.ts packages/core/src/app/components/pptx-progress-toast.tsx`

- [ ] **Step 6: locale 四檔更新**

四個 locale 檔（`en.ts`、`zh-tw.ts`、`zh-cn.ts`、`ja.ts`）中，刪除 `exportAsImagePptx`、`exportAsPptx`、`pptxComingSoonTooltip`、`imagePptxExportFailed` 及其他 pptx 相關鍵（以 `grep -in pptx packages/core/src/locale` 為準，`locale/types.ts` 的型別定義同步刪改），新增：

| key | en | zh-tw | zh-cn | ja |
| --- | --- | --- | --- | --- |
| `exportAsPng` | `Export as PNG` | `匯出 PNG` | `导出 PNG` | `PNG をエクスポート` |
| `pngExportFailed` | `PNG export failed` | `PNG 匯出失敗` | `PNG 导出失败` | `PNG のエクスポートに失敗しました` |
| `pngExportProgress`（toast 標題，若原 pptx toast 有對應鍵則沿用其結構） | `Exporting PNG…` | `正在匯出 PNG…` | `正在导出 PNG…` | `PNG をエクスポート中…` |

- [ ] **Step 7: 手動驗證匯出**

```bash
pnpm typecheck && pnpm test && pnpm check
cd apps/studio && pnpm dev
```

在瀏覽器對任一 slide 執行「匯出 PNG」，下載 zip 後：

```bash
cd ~/Downloads && unzip -o <slideId>.zip -d png-check && file png-check/card-1.png
```

Expected: `PNG image data, 1080 x 1350`。（下載目錄依實際瀏覽器設定。）

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: 以 PNG 匯出取代 PPTX 匯出，輸出 1080×1350 圖檔"
```

---

### Task 6: IG 式預覽 — 水平滑動預設轉場 + 左右箭頭 + 圓點指示器

**Files:**
- Create: `packages/core/src/app/lib/transition.test.ts`、`packages/core/src/app/components/carousel-dots.tsx`
- Modify: `packages/core/src/app/lib/transition.ts`、`packages/core/src/app/routes/slide.tsx`（`SlideViewportNavigation`，約 L1001-1040；`<main>` 區塊約 L750-775）、locale 四檔（若缺箭頭 aria 標籤鍵）

**Interfaces:**
- Consumes: `resolveTransition(pages, index, moduleDefault)`（transition.ts）、轉場層已提供的 `--osd-dir` CSS 變數（forward=1 / backward=-1）、`slide.tsx` 中既有的 `goTo(index)`、`index`、`pageCount`。
- Produces: `defaultCarouselTransition: SlideTransition`（transition.ts 匯出）；`resolveTransition` 在頁面與模組都未定義時回傳它；`CarouselDots({ total, current, onSelect }: { total: number; current: number; onSelect: (i: number) => void })`。

- [ ] **Step 1: 先寫 resolveTransition 的失敗測試**

`packages/core/src/app/lib/transition.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import type { Page } from './sdk.ts';
import { defaultCarouselTransition, resolveTransition } from './transition.ts';

const page = (transition?: Page['transition']) =>
  Object.assign(() => null, { transition }) as Page;

describe('resolveTransition', () => {
  it('falls back to the IG-style horizontal slide', () => {
    expect(resolveTransition([page()], 0)).toBe(defaultCarouselTransition);
  });

  it('prefers the page transition, then the module default', () => {
    const pageT = { duration: 1 };
    const moduleT = { duration: 2 };
    expect(resolveTransition([page(pageT)], 0, moduleT)).toBe(pageT);
    expect(resolveTransition([page()], 0, moduleT)).toBe(moduleT);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
pnpm test -- transition
```

Expected: FAIL（`defaultCarouselTransition` 不存在）。

- [ ] **Step 3: 實作預設轉場**

`transition.ts` 新增並修改 `resolveTransition`：

```ts
export const defaultCarouselTransition: SlideTransition = {
  duration: 300,
  enter: {
    keyframes: [
      { transform: 'translateX(calc(var(--osd-dir, 1) * 100%))' },
      { transform: 'translateX(0)' },
    ],
  },
  exit: {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(calc(var(--osd-dir, 1) * -100%))' },
    ],
  },
};

export function resolveTransition(
  pages: Page[],
  index: number,
  moduleDefault?: SlideTransition,
): SlideTransition | undefined {
  return pages[index]?.transition ?? moduleDefault ?? defaultCarouselTransition;
}
```

（`prefers-reduced-motion` 時轉場層本來就整層停用，不需另外處理。）

- [ ] **Step 4: 跑測試確認通過**

```bash
pnpm test -- transition
```

Expected: PASS。

- [ ] **Step 5: 左右箭頭**

`slide.tsx` 的 `SlideViewportNavigation`（原本 `return null`）改為渲染 IG 式箭頭（wheel/tap hooks 全部保留）：

```tsx
const t = useLocale();
// …既有 hooks 不動…
return (
  <>
    {canPrev && (
      <button
        type="button"
        aria-label={t.slide.prevPageAria}
        onClick={onPrev}
        className="absolute left-3 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-md ring-1 ring-black/5 transition hover:bg-white md:left-5"
      >
        <ChevronLeft className="size-5" />
      </button>
    )}
    {canNext && (
      <button
        type="button"
        aria-label={t.slide.nextPageAria}
        onClick={onNext}
        className="absolute right-3 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-md ring-1 ring-black/5 transition hover:bg-white md:right-5"
      >
        <ChevronRight className="size-5" />
      </button>
    )}
  </>
);
```

`prevPageAria` / `nextPageAria` 已存在於 locale（en.ts L445-446），確認它們在 `slide` 命名空間可用；若原本掛在別的命名空間（如 presenter），在 `slide` 區塊補上同值的鍵，四個 locale 一致。`ChevronRight` 若未 import 則補上。

- [ ] **Step 6: 圓點指示器**

`packages/core/src/app/components/carousel-dots.tsx`：

```tsx
import { cn } from '../lib/utils';

export function CarouselDots({
  total,
  current,
  onSelect,
}: {
  total: number;
  current: number;
  onSelect: (index: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i + 1} / ${total}`}
          aria-current={i === current}
          onClick={() => onSelect(i)}
          className={cn(
            'size-1.5 rounded-full transition-colors',
            i === current ? 'bg-foreground/80' : 'bg-foreground/25 hover:bg-foreground/40',
          )}
        />
      ))}
    </div>
  );
}
```

（`cn` 的實際路徑以 repo 內其他 component 的 import 為準。）在 `slide.tsx` 的 `<main>` 內、`<InspectOverlay />` 之前加：

```tsx
<CarouselDots total={pageCount} current={index} onSelect={goTo} />
```

- [ ] **Step 7: 驗證**

```bash
pnpm typecheck && pnpm test && pnpm check
cd apps/studio && pnpm dev
```

目視確認：換頁時水平滑動（下一張右進、上一張左進）；左右箭頭懸浮於畫布區、第一張無左箭頭、最後一張無右箭頭；底部圓點正確反映目前頁且可點擊跳頁；有自訂 `transition` 的示範 slide（`slide-transitions`）仍走自己的轉場。

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: IG 式預覽 — 水平滑動預設轉場、左右箭頭與圓點指示器"
```

---

### Task 7: themes 機制品牌化（UI 文案 + create-brand skill）

**Files:**
- Rename: `packages/core/skills/create-theme/` → `packages/core/skills/create-brand/`
- Modify: `packages/core/skills/create-brand/SKILL.md`、locale 四檔（theme 相關顯示字串）

**Interfaces:**
- Consumes: 既有 themes 程式契約 — `themes/` 目錄、`themes/<id>.md` + `<id>.demo.tsx`、`meta.theme` 回鏈、`/themes` 路由。**程式碼識別字與路由不改名**，只改顯示文案與 skill。
- Produces: UI 顯示「品牌 / Brand」；`/create-brand` skill 產出的品牌檔含 Voice 與 Logo 章節。

- [ ] **Step 1: locale 文案品牌化**

四個 locale 檔中，凡是**顯示給使用者**的 theme 字串改為品牌用語（鍵名不變）：en 的 `Theme(s)` → `Brand(s)`、zh-tw 的 `主題` → `品牌`、zh-cn 的 `主题` → `品牌`、ja 的 `テーマ` → `ブランド`。以 `grep -in "theme" packages/core/src/locale/en.ts` 逐鍵確認，只改 value 不改 key；跟 UI 主題（深色模式 dark theme）相關的字串**不要**誤改（如 `theme-toggle` 的深淺色切換文案）。

- [ ] **Step 2: skill 改名與擴充**

```bash
git mv packages/core/skills/create-theme packages/core/skills/create-brand
```

`SKILL.md` 修改：
1. frontmatter：`name: create-brand`；description 改為品牌語境（觸發詞：「建品牌」、「新品牌風格」、"create a brand", "brand kit"），並註明檔案仍存放於 `themes/` 目錄、卡片以 `meta.theme` 回鏈（程式契約，不可改）。
2. 內文將使用者面向的 theme 用語改為 brand（保留對 `themes/` 路徑與 `meta.theme` 欄位的引用）。
3. 品牌檔模板在既有 Palette / Typography / Layout / Fixed components 章節之外，新增兩個必要章節（插在 Typography 之後）：

```md
## Voice

- Tone: <品牌語氣，一句話，例如「專業但親切，像資深同事」>
- Person & address: <人稱與稱呼方式，例如「第一人稱複數，稱讀者為『你』」>
- Sentence style: <句式偏好，例如「短句、每卡一個重點、動詞開頭」>
- Avoid: <禁用詞彙或風格，例如「驚嘆號連發、業配腔」>

## Logo

- Primary logo: `assets/<brand>/logo.svg`
- Placement: <固定位置與尺寸，例如「每卡右下角，寬 96px，距邊 60px」>
- Clear space: <最小留白規則>
```

4. skill 中示範的畫布相關數值若引用 1920×1080，改為 1080×1350。

- [ ] **Step 3: 驗證與 Commit**

```bash
pnpm typecheck && pnpm test && pnpm check
git add -A
git commit -m "feat: themes 機制品牌化 — UI 文案改品牌、create-theme 改寫為 create-brand"
```

---

### Task 8: skills 改寫為輪播工作流

**Files:**
- Rename: `packages/core/skills/create-slide/` → `create-carousel/`、`packages/core/skills/slide-authoring/` → `card-authoring/`、`packages/core/skills/current-slide/` → `current-card/`
- Modify: 三個改名 skill 的 `SKILL.md`、`packages/core/skills/apply-comments/SKILL.md`
- Modify: `apps/studio/.claude/skills/`、`apps/studio/.agents/skills/`（由 sync 重生）

**Interfaces:**
- Consumes: Task 7 的品牌檔格式（Voice/Logo 章節）；`open-cards sync`（`packages/core/src/cli/sync.ts`，把 core 的 skills 複製進 consumer 的 `.claude/skills`）。
- Produces: `/create-carousel`、`/card-authoring`、`/current-card`、`/apply-comments` 四個 skill，內容以 IG 輪播為語境。

- [ ] **Step 1: 目錄改名**

```bash
cd /home/js0980420/projects/open-cards
git mv packages/core/skills/create-slide packages/core/skills/create-carousel
git mv packages/core/skills/slide-authoring packages/core/skills/card-authoring
git mv packages/core/skills/current-slide packages/core/skills/current-card
```

- [ ] **Step 2: 改寫 create-carousel/SKILL.md**

以原 create-slide 工作流為骨架，逐節改寫（保留 AskUserQuestion 驅動的問答結構與「先讀技術參考再寫碼」的分工）：

1. frontmatter：`name: create-carousel`；description 觸發語境改為「做輪播圖」、「IG 貼文圖」、「carousel about X」，作用範圍仍是只寫 `slides/<id>/`。
2. Step 1「選 theme」→「選品牌」：列出 `themes/` 下的品牌檔，AskUserQuestion 選一個或「無品牌，自由發揮」；選了品牌就整檔讀入，Palette/Typography/Voice/Logo 全部照抄，並設 `meta.theme`。
3. Step 2 四個關鍵問題改為：
   - **視覺方向**（無品牌時才問）：依主題客製 3 個方向，規則同原版。
   - **張數**：3–5（快閃）、6–8（標準，Recommended）、9–12（深度）、自訂；註明 IG 單則上限 20 張。
   - **文字密度**：極簡（一句話一卡）、輕量（標題+2–3 點）、標準（標題+4–5 點）。
   - **動態**：預設「靜態」並註明 PNG 匯出不含動畫，動畫只影響瀏覽器預覽；仍可選 subtle/rich。
4. 結構規劃表改為輪播頁面角色：

| 角色 | 用途 |
| --- | --- |
| Hook 首圖 | 一句鉤子 + 強視覺，決定滑不滑進來 |
| 目錄/承諾 | 這組輪播會給你什麼（可省略） |
| 內容卡 | 一卡一重點：標題 + 短說明或條列 |
| 大數字 | 一個數據撐滿版面 |
| 引言/金句 | 拉引語 + 出處 |
| 對比 | 前後對照或 A vs B |
| CTA 尾卡 | 追蹤/收藏/分享行動呼籲 + 帳號名 |

5. 明確規則：首卡必為 Hook、尾卡必為 CTA；每卡自成一頁可獨立閱讀；文案語氣遵循品牌 Voice 章節。
6. 所有 `slide`（成品語意）用語改為 `carousel`/`card`；檔案契約 `slides/<id>/index.tsx` 路徑不變（程式契約），在文中註明。

- [ ] **Step 3: 改寫 card-authoring/SKILL.md**

原 slide-authoring 是畫布技術參考，結構全保留，逐節替換數值與語境：

1. frontmatter：`name: card-authoring`，description 改為「1080×1350 卡片畫布技術參考」。
2. 全文 `1920×1080` → `1080×1350`、16:9 → 4:5、橫式版面語彙改直式。
3. 型別階層（type scale）整表替換為直式手機閱讀尺度：

| 用途 | 尺寸 |
| --- | --- |
| Hook 大標 | 88–110px，行高 1.05 |
| 內容卡標題 | 56–64px |
| 內文 | 36–42px，行高 1.45 |
| 條列 | 34–38px |
| 眉標/tag | 24–26px，字距 0.15em |
| 頁碼/帳號名 | 22–24px |
| 大數字 | 160–220px |

4. 版面規則：內容安全邊距 72–90px；重要資訊避開最底部 120px（IG UI 遮擋帶）；一卡一重點、直向堆疊為主。
5. 轉場章節：說明預設即 IG 水平滑動（`defaultCarouselTransition`），自訂 `transition` 會覆蓋；`--osd-dir` 說明保留。
6. 動畫章節保留但加註：動畫僅預覽可見，PNG 匯出為靜態最終幀。
7. 品牌章節：引用品牌檔的 Palette/Typography token 用法，加 Voice/Logo 的落地規則（logo 依品牌檔指定位置放置）。

- [ ] **Step 4: 修訂 current-card 與 apply-comments**

- `current-card/SKILL.md`：frontmatter `name: current-card`；文中 deictic 說法改成「這張卡」；`node_modules/.open-cards/current.json` 路徑（Task 3 已全域改名，確認即可）。
- `apply-comments/SKILL.md`：確認 Task 3 改名後內容一致（`@slide-comment` 標記名是程式契約——先 `grep -rn "slide-comment" packages/core/src` 確認 marker 實名，skill 文件與程式一致即可，不強行改名）。

- [ ] **Step 5: 同步到 studio 並清掉舊副本**

```bash
rm -rf apps/studio/.claude/skills apps/studio/.agents/skills
cd apps/studio && pnpm exec open-cards sync && cd ../..
git status
```

Expected: `apps/studio/.claude/skills/` 出現 `apply-comments`、`card-authoring`、`create-brand`、`create-carousel`、`current-card` 五個目錄，無舊名目錄。

- [ ] **Step 6: 驗證與 Commit**

```bash
pnpm typecheck && pnpm test && pnpm check
git add -A
git commit -m "feat: skills 改寫為 IG 輪播工作流（create-carousel、card-authoring、current-card）"
```

---

### Task 9: 清空舊示範，建立示範品牌與示範輪播

**Files:**
- Delete: `apps/studio/slides/*`（全部 18 組舊 deck）、`apps/studio/themes/*`（全部舊 theme）
- Create: `apps/studio/themes/starter.md`、`apps/studio/themes/starter.demo.tsx`、`apps/studio/slides/demo-carousel/index.tsx`

**Interfaces:**
- Consumes: Task 4 的 1080×1350 畫布、Task 7 的品牌檔格式、`Page` / `SlideMeta` 型別與 `useSlidePageNumber`（`@open-cards/core`）。
- Produces: 開箱即有一個品牌 + 一組 5 卡示範輪播，dev server 首頁不再是空的。

- [ ] **Step 1: 清空舊內容**

```bash
cd /home/js0980420/projects/open-cards
git rm -r -q apps/studio/slides apps/studio/themes
mkdir -p apps/studio/slides apps/studio/themes
```

- [ ] **Step 2: 建立示範品牌 `starter`**

`apps/studio/themes/starter.md` — 完整品牌檔（做為格式範本）。**依全域約束改以英文撰寫**：frontmatter description、表格 Notes、各章節說明文字全用英文；Voice 章節的示例值可保留繁中（它描述的是繁中 IG 帳號的語氣），下方模板照此原則轉換：

```md
---
name: Starter
description: 乾淨的深色示範品牌 — 近黑底、單一琥珀強調色、大字直式排版。
---

# Starter

## Palette

| Role       | Value                       | Notes                    |
| ---------- | --------------------------- | ------------------------ |
| bg         | `#111110`                   | 近黑底                   |
| surface    | `#1C1B1A`                   | 卡片內面板               |
| border     | `#2E2C2A`                   | 髮絲線                   |
| text       | `#F4F2EE`                   | 主要文字                 |
| muted      | `#8F8A82`                   | 次要文字、頁碼           |
| accent     | `#F5A623`                   | 琥珀 — 每卡至多一處強調  |
| accentSoft | `rgba(245, 166, 35, 0.14)`  | 強調色低透明度填色       |

## Typography

- Display：`'Noto Sans TC', system-ui, sans-serif` — weight 700。
- Body：同上 — weight 400，強調 500。
- 尺度（1080×1350 直式）：
  - Hook 大標：96px，行高 1.1，字距 -0.02em。
  - 內容卡標題：60px，weight 700。
  - 內文：38px，行高 1.5。
  - 眉標：24px，大寫/字距 0.15em，accent 色。
  - 頁碼與帳號：22px，muted 色。
  - 大數字：180px，weight 700。

## Voice

- Tone: 專業但口語，像資深同事講重點。
- Person & address: 第一人稱單數，稱讀者為「你」。
- Sentence style: 短句，一卡一重點，動詞開頭。
- Avoid: 驚嘆號連發、空泛形容詞、業配腔。

## Logo

- Primary logo: 無圖檔 — 以文字帳號名 `@your.account` 代替。
- Placement: 每卡左下角，22px，muted 色，距邊 72px。
- Clear space: 帳號名周圍至少 24px 不放其他元素。

## Layout

- 內容安全邊距：左右 84px、上 96px、下 120px（避開 IG UI 遮擋帶）。
- 對齊：直向堆疊、靠左為主；Hook 卡可置中。
- 面板：surface 底、16px 圓角、1px border 髮絲線；不用實體陰影。
```

`apps/studio/themes/starter.demo.tsx` — 單頁品牌預覽（給 /themes 品牌頁縮圖用），用上表 token 寫一張 Hook 樣式卡：

```tsx
import type { Page } from '@open-cards/core';

const BG = '#111110';
const TEXT = '#F4F2EE';
const MUTED = '#8F8A82';
const ACCENT = '#F5A623';
const SANS = "'Noto Sans TC', system-ui, sans-serif";

const Demo: Page = () => (
  <div
    style={{
      width: '100%',
      height: '100%',
      background: BG,
      color: TEXT,
      fontFamily: SANS,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '96px 84px 120px',
    }}
  >
    <div style={{ fontSize: 24, letterSpacing: '0.15em', color: ACCENT, fontWeight: 500 }}>
      STARTER BRAND
    </div>
    <h1 style={{ fontSize: 96, lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 700, margin: '28px 0 0' }}>
      一個品牌檔，
      <br />
      長出一整組輪播
    </h1>
    <p style={{ fontSize: 38, lineHeight: 1.5, color: MUTED, margin: '32px 0 0' }}>
      配色、字體、語氣、logo 位置——都從這份檔案來。
    </p>
    <div style={{ position: 'absolute', left: 84, bottom: 72, fontSize: 22, color: MUTED }}>
      @your.account
    </div>
  </div>
);

export default Demo;
```

（demo 檔的實際匯出契約以刪掉前的舊 `aurora.demo.tsx` 為準——若舊檔是 `export default [Page]` 陣列或具名匯出，照舊格式寫。）

- [ ] **Step 3: 建立示範輪播 `demo-carousel`**

`apps/studio/slides/demo-carousel/index.tsx` — 5 卡：Hook、3 張內容卡、CTA，全部使用 starter 品牌 token。結構（完整檔案，token 常數同 demo.tsx）：

```tsx
import type { Page, SlideMeta } from '@open-cards/core';

export const meta: SlideMeta = { title: 'open-cards 是什麼', theme: 'starter' };

const BG = '#111110';
const SURFACE = '#1C1B1A';
const BORDER = '#2E2C2A';
const TEXT = '#F4F2EE';
const MUTED = '#8F8A82';
const ACCENT = '#F5A623';
const SANS = "'Noto Sans TC', system-ui, sans-serif";

const frame: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: BG,
  color: TEXT,
  fontFamily: SANS,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  padding: '96px 84px 120px',
};

const Handle = () => (
  <div style={{ position: 'absolute', left: 84, bottom: 72, fontSize: 22, color: MUTED }}>
    @your.account
  </div>
);

const Hook: Page = () => (
  <div style={{ ...frame, justifyContent: 'center' }}>
    <div style={{ fontSize: 24, letterSpacing: '0.15em', color: ACCENT, fontWeight: 500 }}>
      OPEN-CARDS
    </div>
    <h1 style={{ fontSize: 96, lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 700, margin: '28px 0 0' }}>
      用一句話，
      <br />
      生出整組 IG 輪播
    </h1>
    <p style={{ fontSize: 38, lineHeight: 1.5, color: MUTED, margin: '32px 0 0' }}>
      往右滑，看它怎麼運作 →
    </p>
    <Handle />
  </div>
);

const card = (eyebrow: string, title: string, body: string): Page => {
  const C: Page = () => (
    <div style={{ ...frame, justifyContent: 'center' }}>
      <div style={{ fontSize: 24, letterSpacing: '0.15em', color: ACCENT, fontWeight: 500 }}>
        {eyebrow}
      </div>
      <h2 style={{ fontSize: 60, lineHeight: 1.2, fontWeight: 700, margin: '24px 0 0' }}>{title}</h2>
      <p style={{ fontSize: 38, lineHeight: 1.5, color: MUTED, margin: '28px 0 0' }}>{body}</p>
      <Handle />
    </div>
  );
  return C;
};

const Cta: Page = () => (
  <div style={{ ...frame, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: '72px 64px',
      }}
    >
      <h2 style={{ fontSize: 60, fontWeight: 700, margin: 0 }}>覺得有用？</h2>
      <p style={{ fontSize: 38, lineHeight: 1.5, color: MUTED, margin: '24px 0 0' }}>
        收藏這則，之後照著做。
        <br />
        追蹤 <span style={{ color: ACCENT }}>@your.account</span> 看更多。
      </p>
    </div>
    <Handle />
  </div>
);

export default [
  Hook,
  card('STEP 1', '描述主題', '跟 agent 說要做什麼，選一個品牌檔，它負責寫 React。'),
  card('STEP 2', '點著改', '在預覽裡點任何區塊留提示詞，/apply-comments 一次套用。'),
  card('STEP 3', '匯出 PNG', '一鍵輸出 1080×1350 圖檔，直接上傳 IG。'),
  Cta,
];
```

（`React.CSSProperties` 需 `import type React from 'react'` 或改用 `CSSProperties` 具名匯入，以 typecheck 結果為準。）

- [ ] **Step 4: 端到端驗證**

```bash
pnpm typecheck && pnpm test && pnpm check
cd apps/studio && pnpm dev
```

目視確認：首頁出現 demo-carousel 卡片（4:5 縮圖）與 starter 品牌；輪播可用箭頭/圓點水平滑動瀏覽；匯出 PNG 得到 5 張 1080×1350 圖檔；inspector 點選區塊留言功能正常。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: 新增 starter 示範品牌與 demo-carousel 示範輪播，移除舊示範內容"
```

---

### Task 10: README、CLAUDE.md 與收尾

**Files:**
- Modify: `README.md`、`CLAUDE.md`、`AGENTS.md`、`apps/studio/README.md`、`LICENSE`（僅確認）、刪除 `CODE_OF_CONDUCT.md`、`CONTRIBUTING.md`、`SECURITY.md`（上游社群文件，個人工具不需要）

**Interfaces:**
- Consumes: 前面所有 task 的最終形態。
- Produces: 與實際行為一致的文件；最終全綠驗證。

- [ ] **Step 1: 重寫 README.md**

英文、精簡（100 行內），內容：一句話定位（agent 驅動的 IG 輪播圖工具）、快速開始（`pnpm install` → `cd apps/studio && pnpm dev`）、工作流（`/create-carousel` 產卡 → 點選區塊留提示詞 → `/apply-comments` → 匯出 PNG）、品牌系統（`themes/` 一品牌一檔）、repo 結構表（packages/core、apps/studio）。結尾註明：基於 [1weiho/open-slide](https://github.com/1weiho/open-slide)（MIT）改造。刪除原 README 的 npm badge、Vercel OSS、star history 等上游內容。

- [ ] **Step 2: 重寫 CLAUDE.md 與 AGENTS.md**

`CLAUDE.md` 以原檔為骨架改寫：
- Layout 表只剩 `packages/core`（`@open-cards/core`）與 `apps/studio`（輪播工作區）。
- Workflow 指令不變（dev/build/typecheck/check/test）。
- Hard rules：biome 必須過；**刪除 changeset 相關規則**；不隨意加依賴；shadcn ui 目錄不動；註解準則保留。
- 加一條：畫布固定 1080×1350，唯一定義在 `packages/core/src/app/lib/sdk.ts`。
- 移除 Releasing 章節。
`AGENTS.md` 若只是指到 CLAUDE.md 的薄檔則同步改名詞；若內容重複則讓它 `See CLAUDE.md`。

- [ ] **Step 3: 刪除上游社群文件、確認 LICENSE**

```bash
git rm CODE_OF_CONDUCT.md CONTRIBUTING.md SECURITY.md
git rm -r .github/ISSUE_TEMPLATE 2>/dev/null; git rm .github/pull_request_template.md 2>/dev/null || true
```

（issue/PR 模板是上游社群設施，Task 2 審查時發現仍殘留，一併刪除。）

`LICENSE` 保留 MIT 全文與原作者版權行不動（MIT 要求保留），可在其上方加一行新版權：`Copyright (c) 2026 js0980420 (modifications)`。

- [ ] **Step 4: studio README 更新**

`apps/studio/README.md` 改為兩三段：這是輪播工作區、`pnpm dev` 啟動、slides/ 放輪播、themes/ 放品牌。

- [ ] **Step 5: 最終全量驗證**

```bash
pnpm build && pnpm typecheck && pnpm test && pnpm check
cd apps/studio && pnpm dev
```

Expected: build 產物正常、全綠；dev server 完整走一遍：首頁 → 開 demo-carousel → 箭頭/圓點導覽 → inspector 留言 → 匯出 PNG（1080×1350）。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: 重寫 README 與 CLAUDE.md，移除上游社群文件"
```
