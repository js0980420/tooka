---
name: create-carousel
description: Create, draft, or generate an Instagram-style carousel in open-cards. Use when the user asks to "make a carousel", "carousel about X", "做輪播圖", "IG 貼文圖", create social cards, or add new content under `slides/`. Only author files inside one new carousel folder; do not edit the framework.
---

# Create a carousel

Own the workflow for drafting a new carousel. Read `card-authoring` before writing React; it is the technical reference for the 1080×1350 file contract, type scale, layout, assets, and export behavior.

Only write under `slides/<id>/`. Keep that path even though the user-facing artifact is a carousel and each exported page is a card.

## 1. Choose a brand

List markdown files under `themes/` except `README.md`.

- If brands exist, ask the user to choose one or choose **No brand — design freely**.
- When a brand is selected, read its markdown end to end. Treat Palette, Typography, Voice, Logo, Layout, and Fixed components as authoritative. Set `meta.theme` to its id.
- Skip the visual-direction question when a brand already defines the direction, but restate the selected brand so the user can correct it.
- If no brand exists, continue without `meta.theme`.

The code contract remains `themes/<id>.md` and `meta.theme`; do not rename either.

## 2. Clarify the brief

Before writing code, confirm the topic, audience, outcome, and source material. If the initial request already answers them, state the assumptions instead of asking again.

Ask these decisions together, omitting only those already explicit:

1. **Visual direction** — only without a brand. Propose three topic-specific directions. Each combines a mood with concrete palette, typography, and motif cues. Mark the strongest fit **Recommended**.
2. **Card count** — 3–5 quick, 6–8 standard **Recommended**, 9–12 deep, or custom. Note that one Instagram carousel supports at most 20 cards.
3. **Text density** — minimal (one sentence per card), light (heading plus 2–3 points), or standard (heading plus 4–5 points).
4. **Motion** — static **Recommended**, subtle, or rich. Explain that motion only affects browser preview; PNG export captures the final static frame.

Ask follow-ups only for unresolved requirements such as mandatory claims, account handle, brand assets, or supplied images.

## 3. Pick the id

Choose a short kebab-case id such as `agent-workflow`, `pricing-mistakes`, or `taipei-coffee-guide`. Check `slides/` and do not overwrite an existing carousel without approval.

## 4. Plan card roles

Outline the full sequence before coding:

| Role | Purpose |
| --- | --- |
| Hook cover | One compelling hook and a strong visual reason to swipe |
| Promise / contents | State what the reader will get; optional |
| Content card | One point with a heading and short explanation or list |
| Big number | Let one statistic dominate the card |
| Quote | Pull quote with attribution |
| Comparison | Before/after or A versus B |
| CTA closer | Ask the reader to save, share, follow, or act; include the account name |

The first card must be a Hook and the last must be a CTA. Every card must stand alone when shared or screenshotted. Keep one idea per card and write all visible copy in the selected brand's Voice.

Use `ImagePlaceholder` only when the topic genuinely requires a user-owned image such as a product screenshot, team photo, or original chart. Prefer typography and layout for decorative needs.

## 5. Commit to one system

Without a brand, choose one coherent palette, type system, grid, and visual character. With a brand, copy its concrete tokens and fixed components rather than approximating them.

Declare a top-level `export const design: DesignSystem = { ... }` by default and consume supported values through `var(--osd-*)`. Keep unsupported brand tokens as module constants. Follow the brand's Logo placement and clear-space rules on every card where required.

Consult `frontend-design` when the request calls for a more distinctive visual direction.

## 6. Write `slides/<id>/index.tsx`

Read `card-authoring` in full immediately before writing. Follow its file contract, 1080×1350 safe area, type scale, vertical budget, assets, inspector-friendly JSX, default carousel transition, and PNG constraints.

Set metadata with a literal timestamp generated immediately before the edit:

```bash
node -e "console.log(new Date().toISOString())"
```

```tsx
export const meta: SlideMeta = {
  title: '<Carousel title>',
  theme: '<brand-id>',
  createdAt: '<exact generated timestamp>',
};
```

Omit `theme` only when no registered brand was selected.

## 7. Review and verify

Run the `card-authoring` self-review. Also confirm:

- Hook first and CTA last.
- Card count matches the brief and stays at or below 20.
- Every card communicates one independently understandable point.
- Copy follows the selected Voice and avoids its banned patterns.
- Logo or handle matches the documented placement and clear space.
- Static PNG frames contain every essential piece of meaning.
- Nothing outside `slides/<id>/` changed.

Run the project's typecheck and formatting commands. Do not start the dev server unless asked.

## 8. Hand off

Report the carousel id, file path, card count, selected brand, and the Hook-to-CTA structure. Explain that the dev server hot-reloads and that the viewer can export a single PNG or a ZIP of ordered PNG cards.
