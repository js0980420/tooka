# Inspect 模式元素拖曳 — 設計文件

日期:2026-07-13
狀態:已確認

## 目標

在 tooka 檢視器的 inspect 模式中,讓使用者以滑鼠拖曳移動已選取的元素,放開後將位移以 `translate` inline style 寫回卡片原始碼(`slides/{id}/index.tsx`)。

## 範圍

最小版本:

- 滑鼠拖曳本體(先選取、再拖曳)。
- 位移持久化為 CSS `translate` 屬性。
- 與現有 undo/redo、pending 編輯、儲存列整合。

明確不含(留待後續版本):方向鍵微調、Shift 軸向鎖定、對齊參考線/磁吸、觸控支援。

## 決策記錄

| 決策 | 選擇 | 理由 |
| --- | --- | --- |
| 持久化方式 | `translate: 'Xpx Ypx'` 偏移 | 任何元素都能拖(flex 流內或絕對定位皆可),不改變版面流、不影響其他元素;`set-style` 編輯管線已支援 |
| 觸發方式 | 先選取再拖 | 與現有「點一下選取、雙擊圖片裁切」零衝突,符合 Figma/Canva 習慣 |
| 輔助功能 | 無 | 使用者選擇最小版本 |
| 實作位置 | 擴充 `inspect-overlay.tsx` 事件層 | 重用選取、歷史、儲存管線;不加依賴、不做多餘抽象 |

## 互動流程

1. inspect 模式中點選元素(現有行為,不變)。
2. 在已選取的元素上 `pointerdown` 並移動超過 **3px** 門檻 → 進入拖曳。未超過門檻放開 → 維持原本點選語意(重新選取該點下的元素)。
3. 拖曳中:
   - 以 `setPointerCapture` 鎖定指標。
   - 即時把位移寫到元素 inline `style.translate` 做預覽。
   - 螢幕像素位移須除以卡片的 CSS 縮放比,換算成 1080×1350 畫布像素。縮放比由選取元素所屬的 `[data-inspector-root]` 之 `getBoundingClientRect().width / offsetWidth` 求得。
   - 游標顯示 `move`。
4. `pointerup`:位移四捨五入為整數,透過 inspector provider 的 `applyOps` 送出 `set-style { key: 'translate', value: 'Xpx Ypx' }`,自動進入 undo/redo 歷史與 pending 編輯;儲存時由既有 `buildStyleSplice` 合併進 JSX 的 `style={{...}}` 物件。
5. 拖曳中按 `Escape`:取消拖曳、還原預覽,不產生任何編輯。

## translate 合成規則

- 元素原本沒有 translate → 基準 `0px 0px`。
- 原本有 px 形式的 inline translate(例如先前拖曳的結果)→ 解析後與本次位移累加。
- 原本為非 px 形式(如 `-50% -50%` 置中技巧、`calc(...)`)→ 該元素首版視為**不可拖曳**,pointerdown 不進入拖曳狀態,避免覆寫破壞版面。
- 最終位移為 `0px 0px`(拖回原位)→ 送出 `value: null` 移除該 style key,保持原始碼乾淨。

## 改動範圍

| 檔案 | 變更 |
| --- | --- |
| `packages/core/src/app/lib/inspector/drag.ts`(新增) | 純函式:`parseTranslate`、`composeTranslate`、縮放換算 |
| `packages/core/src/app/lib/inspector/drag.test.ts`(新增) | 上述純函式的 vitest 單元測試 |
| `packages/core/src/app/components/inspector/inspect-overlay.tsx` | 拖曳狀態機、即時預覽、Escape 取消 |
| `.changeset/*.md`(新增) | `@tooka/core` minor |

不動 `edit-ops.ts`(`set-style` 已支援)、不加任何依賴。

## 錯誤處理

- 拖曳中元素從 DOM 卸載(`!anchor.isConnected`,如熱更新)→ 中止拖曳、不送編輯。
- `applyOps` 寫入失敗 → 走既有錯誤路徑(toast 顯示 `saveFailed`)。
- 位移換算遇到縮放比為 0 或 NaN → 中止拖曳。

## 測試策略

- **單元測試**:`drag.test.ts` 覆蓋 translate 解析(無值、px 值、非 px 值)、合成累加、歸零移除、縮放換算。
- **手動端到端**:dev server 中拖曳元素 → 預覽即時跟隨 → 放開後儲存 → 確認 `index.tsx` 落地正確的 `translate` → undo/redo → Escape 取消 → 非 px translate 元素不可拖。
