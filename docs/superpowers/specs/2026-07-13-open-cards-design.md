# open-cards 設計文件

日期：2026-07-13
狀態：已由使用者核准

## 目標

Fork [open-slide](https://github.com/1weiho/open-slide) monorepo，改造成 **agent 驅動的 IG 輪播圖製作工具**。使用流程：

1. 自然語言描述主題 → agent 依品牌設定寫出 React 卡片
2. 瀏覽器 dev server 預覽（1080×1350 畫布）
3. 點選卡片上的區塊、輸入提示詞註解（沿用 open-slide inspector）→ `/apply-comments` 由 agent 套用修改
4. 一鍵匯出每張卡片為 1080×1350 PNG，直接發 IG

明確排除：影片輸出（remotion / hyperframes）已取消，不在範圍內。

## 關鍵決策

| 決策 | 選擇 |
| --- | --- |
| 使用流程 | Agent 驅動（同 open-slide），非 GUI 拖拉編輯器 |
| 畫布尺寸 | 固定 1080×1350（4:5），不支援多尺寸 |
| 衍生方式 | Fork 整個 monorepo 再改造 |
| 品牌系統 | 整合 social-cards-engine 理念：品牌設定檔驅動風格 |
| PNG 匯出 | 方案 A：瀏覽器內以 `modern-screenshot` 匯出 |
| 專案名稱 | open-cards，位於 `~/projects/open-cards` |

## 架構

### 1. 畫布與術語

- 畫布從 1920×1080 全面改為 **1080×1350（4:5）**：viewer 縮放、inspector、print/export 樣式、skills 文件一致。
- 使用者面向術語：slide → **card（卡片）**、deck → **carousel（輪播組）**。
- npm 套件改名 `@open-cards/core`、CLI 指令改為 `open-cards`。
- 內部程式識別字（`os-` 前綴、內部變數名）不強制全改，減少改壞風險。

### 2. 瘦身（相對 open-slide）

- **刪除 `apps/web`**（行銷網站）。
- **刪除 `packages/cli`**（scaffolder）：`apps/demo` 改名為 `apps/studio`，作為日常製作輪播的工作區。
- **保留**：viewer、inspector（區塊提示詞修改核心）、carousel manager（原 slide manager）、assets 管理面板、svgl logo 搜尋、熱更新、靜態 build。
- present mode 保留不動（無害；未來可改造成手機框輪播預覽，本版不做）。
- 全新 git 歷史，不保留 upstream 歷史（改名幅度大，upstream merge 必衝突）。

### 3. 品牌系統

- 工作區新增 `brands/<品牌名>/brand.ts`：配色 token、字體、語氣描述、logo 資產路徑。
- 每組輪播的設定指定所屬 `brand`；runtime 以 React context + CSS 變數把品牌 token 注入卡片。
- skills 指示 agent：產卡前必讀品牌檔，一律使用 token，不寫死顏色/字體。
- 換品牌設定檔即換整體風格（social-cards-engine 的「一品牌一插件」理念）。

### 4. Skills（agent 工作流）

- **`/create-carousel`**（改寫自 `/create-slide`）：詢問主題與品牌、張數（IG 上限 20，建議 5–10）、文字密度 → 規劃 hook 首圖 → 內容頁 → CTA 尾頁 → 逐張產出。
- **`/card-authoring`**（改寫自 `/slide-authoring`）：1080×1350 版面技術規範 — 手機可讀字級、安全邊距、大標比例、品牌 token 用法。
- **`/apply-comments`** 沿用：即「區塊提示詞修改」功能。

### 5. PNG 匯出

- viewer 新增「匯出 PNG」：以 `modern-screenshot`（輕量依賴）將每張卡片 DOM 轉為 1080×1350 PNG，多張打包 zip 下載。
- 已知限制：極少數 CSS（特殊 filter、跨域圖片）可能有保真度誤差；若實際遇到，未來再補 Playwright CLI 截圖方案（本版不做）。

## 錯誤處理

- 匯出時字體未載入完成：沿用 open-slide print-ready 的 `waitForFonts` / `data-waitfor` 機制，確保截圖前資源就緒。
- 品牌檔缺失或欄位不全：dev server 啟動時明確報錯指出缺哪個欄位，不 fallback 靜默出錯圖。

## 驗證方式

- `pnpm typecheck`、`pnpm check`、`pnpm test` 全數通過。
- dev server 顯示 4:5 畫布，inspector 註解流程可用。
- 實際產出一組示範輪播（含品牌檔），匯出 PNG 並確認尺寸為 1080×1350。
