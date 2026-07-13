# open-cards workspace

Slides as React components. Each slide lives under `slides/<id>/index.tsx` and default-exports an array of page components. The `@open-cards/core` runtime handles layout, scaling, navigation, thumbnails, and fullscreen play mode — you just write the pages.

## Getting started

```bash
pnpm install
pnpm dev
```

Then open the dev server and create a new slide at `slides/<your-slide>/index.tsx`.

The workspace ships with two cards: **Blank canvas** (`slides/blank/`), an empty 1080 × 1350 page — drop an image straight onto it to place it on the canvas — and **demo-carousel**, a finished example to learn from.

Not sure whether an image fits the canvas? Open the **Assets** page, upload it, and click the preview: the *Canvas fit* view overlays it on the 1080 × 1350 frame at true relative scale and tells you if the aspect ratio matches.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server with hot reload. |
| `pnpm build` | Build a static bundle you can deploy. |
| `pnpm preview` | Preview the built bundle locally. |

## Authoring a slide

```tsx
// slides/my-slide/index.tsx
import type { Page, SlideMeta } from '@open-cards/core';

const Cover: Page = () => (
  <div style={{ width: '100%', height: '100%' }}>Hello</div>
);

export const meta: SlideMeta = { title: 'My slide' };
export default [Cover] satisfies Page[];
```

Every page renders into a fixed **1080 × 1350** canvas — design with absolute pixel values. Put images, videos, and fonts under `slides/<id>/assets/` and import them directly.

See [`CLAUDE.md`](./CLAUDE.md) for the full authoring guide.

## Navigation

- Arrow keys / PageUp / PageDown move between pages.
- `F` enters fullscreen play mode; Esc exits.
- In play mode: Space / → next, ← prev.

## Claude Code integration

This workspace ships with Claude Code skills preconfigured under `.claude/skills/` and `.agents/skills/`. Ask Claude Code to "make slides about X" and the `create-slide` skill takes over. Use `apply-comments` to iterate via inspector-style markers inside your source.

## Config

Optional `open-cards.config.ts` at the workspace root:

```ts
import type { OpenCardsConfig } from '@open-cards/core';

const openCardsConfig: OpenCardsConfig = {
  port: 5173,
};

export default openCardsConfig;
```

Supported fields: `slidesDir`, `port`.
