# Draft → Cards promotion flow

Date: 2026-07-15
Status: approved

## Goal

Agent-generated (or template-copied) cards always land in the Draft area first.
The user reviews a draft and promotes it via an "新增到卡片" (Add to cards)
button that assigns it to a folder. Only promoted cards appear in "All cards"
and in the Publish page. Drafts live exclusively in the Draft area.

## Data layer — no changes

- A card is a **draft** when `slides/.folders.json` `assignments` has no entry
  for its id. Promotion = the existing `PUT /__folders/assign` endpoint via
  `useFolders().assign`.
- No new fields, no Vite plugin changes, no CLI changes. Agents writing
  `slides/<id>/` today automatically produce drafts.
- Deleting a folder drops its assignments, so its cards **fall back to Draft**.
  This is the existing mechanism's natural behavior and is intended: content is
  never lost, it returns to the review queue.

## UI changes

### New component: `add-to-cards-button.tsx`

- Button + Popover listing existing folders (`FolderIconChip` + name) plus an
  inline "＋新資料夾" row (name input; icon auto-picked from `PRESET_COLORS`
  by folder count, matching the sidebar's create flow).
- Selecting a folder (or creating one) assigns the card and shows a toast
  「已加入 <folder>」. Errors surface via the existing error toast pattern.
- Rendered only in `import.meta.env.DEV` — promotion writes to disk through the
  dev server, same rule as folder editing.

### `home.tsx`

- The "All cards" branch of `visibleSlides` filters out drafts instead of
  showing every id in `slideIds`.
- Draft view: card thumbnails show the promotion button on hover.

### Sidebar

- `allCount` becomes the promoted-card count so the number matches the view.

### `slide.tsx` (editor)

- Top bar shows the same promotion button when the current card is a draft
  (DEV only).

### `publish.tsx`

- Card picker lists promoted cards only; default selection is the first
  promoted card.
- Empty state when nothing is promoted: 「還沒有正式卡片,先到草稿區按
  『新增到卡片』」 with a link back to the Draft view.

### Templates page

- The existing "新增到卡片" button on template detail actually copies into
  Draft. Rename its copy to 「加入草稿」 so "新增到卡片" refers exclusively
  to promotion.

## Copy / i18n

All new strings go through the existing locale system (`en.ts`, `zh-cn.ts`,
`zh-tw.ts`, `types.ts`), matching the components being touched.

## Edge cases

- **Static build (non-DEV):** promotion buttons are hidden everywhere; All /
  Publish filtering still works off the bundled manifest snapshot.
- **Publish page with a previously selected draft:** selection resets to the
  first promoted card (or empty state).
- **Folder deletion:** cards return to Draft (see Data layer).

## Testing & delivery

- Extract the promoted-filter as a pure function (input: `slideIds` +
  `assignments`; output: promoted ids) with a vitest unit test.
- `pnpm check` and `pnpm typecheck` must pass.
- Changeset (`@tooka/core`, patch):
  `Draft cards stay in Draft until promoted; All cards and Publish only list promoted cards.`
