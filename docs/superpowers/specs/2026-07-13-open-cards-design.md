# open-cards 設計文件

日期：2026-07-13
狀態：已由使用者核准

## 目標

Fork [open-cards](https://github.com/1weiho/open-cards) monorepo，改造成 **agent 驅動的 IG 輪播圖製作工具**。使用流程：

1. 自然語言描述主題 → agent 依品牌設定寫出 React 卡片
2. 瀏覽器 dev server 預覽（1080×1350 畫布）
3. 點選卡片上的區塊、輸入提示詞註解（沿用 open-cards inspector）→ `/apply-comments` 由 agent 套用修改
4. 一鍵匯出每張卡片為 1080×1350 PNG，直接發 IG

明確排除：影片輸出（remotion / hyperframes）已取消，不在範圍內。

## 關鍵決策

| 決策 | 選擇 |
| --- | --- |
| 使用流程 | Agent 驅動（同 open-cards），非 GUI 拖拉編輯器 |
| 畫布尺寸 | 固定 1080×1350（4:5），不支援多尺寸 |
| 衍生方式 | Fork 整個 monorepo 再改造 |
| 品牌系統 | 擴充 open-cards 既有 themes 機制成品牌系統（加語氣、logo 欄位），不另建 runtime 注入層 |
| PNG 匯出 | 瀏覽器內匯出：改造既有 PPTX 截圖管線（`html-to-image`，零新依賴） |
| 專案名稱 | open-cards，位於 `~/projects/open-cards` |

## 架構

### 1. 畫布與術語

- 畫布從 1920×1080 全面改為 **1080×1350（4:5）**：viewer 縮放、inspector、print/export 樣式、skills 文件一致。
- 使用者面向術語：slide → **card（卡片）**、deck → **carousel（輪播組）**。
- npm 套件改名 `@open-cards/core`、CLI 指令改為 `open-cards`。
- 內部程式識別字（`os-` 前綴、內部變數名）不強制全改，減少改壞風險。

### 2. 瘦身（相對 open-cards）

- **刪除 `apps/web`**（行銷網站）。
- **刪除 `packages/cli`**（scaffolder）：`apps/demo` 改名為 `apps/studio`，作為日常製作輪播的工作區。
- **保留**：viewer、inspector（區塊提示詞修改核心）、carousel manager（原 slide manager）、assets 管理面板、svgl logo 搜尋、熱更新、靜態 build。
- present mode 保留不動（無害；未來可改造成手機框輪播預覽，本版不做）。
- 全新 git 歷史，不保留 upstream 歷史（改名幅度大，upstream merge 必衝突）。

### 3. 品牌系統（擴充既有 themes 機制）

- 沿用 open-cards 的 themes 機制（`themes/<id>.md` + `<id>.demo.tsx`、`meta.theme` 回鏈、themes 瀏覽頁），使用者面向改稱「品牌 brand」。
- 品牌 markdown 格式在原有 Palette / Typography / Layout / Fixed components 之外，新增「Voice（語氣）」與「Logo（資產路徑）」章節。
- skills 指示 agent：產卡前必讀品牌檔並照抄 token，不寫死顏色/字體（原 themes 工作流不變）。
- `/create-theme` skill 改寫為 `/create-brand`。
- 換品牌檔即換整體風格（social-cards-engine 的「一品牌一插件」理念）。

### 4. Skills（agent 工作流）

- **`/create-carousel`**（改寫自 `/create-slide`）：詢問主題與品牌、張數（IG 上限 20，建議 5–10）、文字密度 → 規劃 hook 首圖 → 內容頁 → CTA 尾頁 → 逐張產出。
- **`/card-authoring`**（改寫自 `/slide-authoring`）：1080×1350 版面技術規範 — 手機可讀字級、安全邊距、大標比例、品牌 token 用法。
- **`/apply-comments`** 沿用：即「區塊提示詞修改」功能。

### 5. IG 式預覽（2026-07-13 使用者補充）

- viewer 預設轉場改為 IG 式水平滑動：下一張從右滑入、上一張從左滑入（利用既有轉場層的 `--osd-dir` 方向變數）；輪播模組若自訂 `transition` 則以自訂為準。
- 畫布左右兩側加上 IG 風格的圓形左右箭頭按鈕（垂直置中、懸浮於畫布邊緣），點擊即上一張/下一張，與既有鍵盤導覽並存。第一張隱藏左箭頭、最後一張隱藏右箭頭（同 IG 行為）。
- 畫布下方（或上方）加 IG 式圓點頁數指示器。

### 6. PNG 匯出

- viewer 新增「匯出 PNG」：改造既有 PPTX 匯出的截圖管線（`html-to-image`、2x 像素密度、動畫凍結、字體等待），將每張卡片轉為 1080×1350 PNG，多張以 `fflate` 打包 zip 下載。零新依賴。
- PPTX 匯出對 IG 場景無用且其 16:9 EMU 尺寸寫死，直接移除，由 PNG 匯出取代其選單位置。
- 已知限制：極少數 CSS（特殊 filter、跨域圖片）可能有保真度誤差；若實際遇到，未來再補 Playwright CLI 截圖方案（本版不做）。

## 錯誤處理

- 匯出時字體未載入完成：沿用 open-cards print-ready 的 `waitForFonts` / `data-waitfor` 機制，確保截圖前資源就緒。
- 品牌檔為 agent 讀取的 markdown（非 runtime 載入），不存在 runtime 驗證；`/create-carousel` skill 負責在品牌檔缺章節時提醒使用者補齊。

## 驗證方式

- `pnpm typecheck`、`pnpm check`、`pnpm test` 全數通過。
- dev server 顯示 4:5 畫布，inspector 註解流程可用。
- 實際產出一組示範輪播（含品牌檔），匯出 PNG 並確認尺寸為 1080×1350。
