# Canva 式 Asset 面板與拖曳插入圖片 — 設計文件

日期:2026-07-14
狀態:已確認

## 目標

在 `/s/:slideId` 編輯頁提供 Canva 式體驗:

1. Assets 從「整頁切換」改為「左側面板」,開啟時卡片畫布保持可見。
2. 從面板把圖片拖進卡片,放開處直接插入 `<img>`,並可用既有 inspect 拖曳功能繼續移動。

## 範圍

最小版本:

- 左側 `AssetPanel`:縮圖網格、上傳按鈕、拖檔案進面板上傳、slide/global scope 切換。
- 面板縮圖可拖出,drop 到卡片 → 插入 `<img>` 於放開位置(新 `insert-image` EditOp)。
- drop 到既有 `ImagePlaceholder` → 沿用現有替換邏輯。
- Toolbar 的 Assets tab 改為面板開關;移除 `?view=assets` 整頁模式。

明確不含(留待後續):插入非圖片元素、拖曳中的對齊參考線、面板內 rename/delete 管理(去 `/assets` 頁做)、觸控支援。

## 決策記錄

| 決策 | 選擇 | 理由 |
| --- | --- | --- |
| 面板位置 | 左側,插在縮圖列與畫布之間 | Canva 慣例;使用者指定「切換側邊欄、右側看到卡片」 |
| 面板元件 | 新建輕量 `AssetPanel`,重用 `useAssets()`/`uploadWithAutoRename()` | `AssetView` 是 700+ 行整頁元件,塞 variant 會更肥;`/assets` 路由保留原元件 |
| 插入方式 | 新增專用 `insert-image` EditOp | 現有 5 個 EditOp 都是單一具體意圖;通用 `insert-element` YAGNI |
| 定位策略 | `position:absolute; left:0; top:0` + `translate:'Xpx Ypx'` | 位置全由 translate 表達,與 inspect 拖曳移動(2026-07-13 設計)共用同一屬性,插入後可直接續拖 |
| 拖曳協定 | HTML5 DnD,自訂 dataTransfer type | 面板與畫布是不同 DOM 子樹,HTML5 DnD 天然跨界;桌面拖檔案的既有行為不受影響 |

## 互動流程

### 面板開關

1. Toolbar `[Slides][Assets]` Tabs 改為:Assets 為 toggle,點擊展開/收合左側面板;Slides 維持現狀。
2. 面板展開時佈局為:縮圖列 | AssetPanel | 卡片畫布,畫布始終可見。
3. `slide.tsx` 中 `view === 'assets'` 整頁分支與 `?view=assets` 參數移除;`/assets` 全域路由不動。

### 拖曳插入

1. 面板縮圖 `draggable`;`dragstart` 時 `dataTransfer.setData('application/x-open-cards-asset', JSON.stringify({ name, scope }))`,並以縮圖為 drag image。
2. 卡片畫布(`<main data-inspector-root>`)掛 dragover/drop handler,只認上述自訂 type。
3. drop 落點判斷:
   - 落在 `ImagePlaceholder` 上 → placeholder 既有 handler 處理,擴充它也認自訂 type(目前只認 `dataTransfer.files`),走 `replace-placeholder-with-image`。
   - 落在其他位置 → 換算座標後發 `insert-image`。
4. 座標換算:drop client 座標 → 卡片根元素座標系,除以畫布縮放比(縮放比求法同 element-drag 設計:`getBoundingClientRect().width / offsetWidth`),四捨五入為整數 px。
5. 寫入走既有立即寫檔管線(同 placeholder 替換),存檔後 HMR 反映。
6. 找不到卡片根元素或 payload 解析失敗 → 靜默忽略 + `console.warn`。

## insert-image EditOp

- 前端 union(`use-editor.ts`)新增:`{ type: 'insert-image', name: string, scope: 'slide' | 'global', x: number, y: number }`。
- 後端(`edit-ops.ts`):重用 `planAssetImport()` 加 import(含去重),再於卡片根元素 children 尾端插入:

```jsx
<img src={ident} style={{ position: 'absolute', left: 0, top: 0, translate: 'Xpx Ypx', width: '320px' }} />
```

- 預設寬 320px,不設 height 保持比例;後續可用 DesignPanel 調整。
- 包含區塊保證:x/y 以卡片根元素為基準,故根元素必須是 positioned。drop handler 檢查根元素 computed `position`,若為 `static` 則同批次多發一個 `set-style { key: 'position', value: 'relative' }` 到根元素。
- asset 路徑慣例沿用既有:slide scope `./assets/<name>`、global scope `@assets/<name>`,名稱驗證沿用 `planAssetImport` 既有規則。

## 改動範圍

| 檔案 | 變更 |
| --- | --- |
| `packages/core/src/app/components/asset-panel/asset-panel.tsx`(新增) | 左側面板:縮圖網格(drag source)、上傳、scope 切換 |
| `packages/core/src/app/routes/slide.tsx` | 面板開關狀態、佈局插槽、移除 `?view=assets` 整頁分支、畫布 drop handler |
| `packages/core/src/app/lib/inspector/use-editor.ts` | EditOp union 加 `insert-image` |
| `packages/core/src/editing/edit-ops.ts` | `planInsertImage()`:import + 尾端插入 `<img>` |
| `packages/core/src/app/components/image-placeholder.tsx` | drop handler 加認自訂 dataTransfer type |
| `packages/core/src/editing/*.test.ts` | `insert-image` AST 插入單元測試 |
| `.changeset/*.md`(新增) | `@open-cards/core` minor |

## 錯誤處理

- 非自訂 type 的拖曳(如桌面檔案)不觸發畫布 drop,維持既有行為。
- asset 名稱不合法 → 後端 `planAssetImport` 既有驗證擋下,前端顯示既有錯誤路徑。
- 卡片根元素找不到 → 忽略 drop 並 `console.warn`。

## 測試

- vitest:`planInsertImage` 的 AST 插入(插入位置、import 去重、slide/global 路徑、translate 值格式)。
- 座標換算若抽為純函式 → 一併單元測試。
- UI(面板開關、拖曳、HMR)手動驗證。
