# @tooka/core

Runtime and CLI for [tooka](https://github.com/1weiho/tooka) — a React-based card-carousel framework where you write cards and the framework handles the Vite/React stack, layout, navigation, hot reload, and fullscreen play mode.

## Install

```bash
pnpm add @tooka/core
```

Most users get this installed automatically by running `npx @tooka/cli init`. Use this package directly only if you're wiring up an existing workspace by hand.

## What's inside

- **Runtime** — home page, card viewer, thumbnail rail, keyboard navigation, and fullscreen presenter mode. Every card renders into a fixed **1080×1350** canvas; the framework scales it.
- **Vite plugin** — discovers `slides/<id>/index.{tsx,jsx,ts,js}`, exposes them via virtual modules, and reloads when slides are added or removed.
- **CLI** — `tooka dev | build | preview` so workspaces never need to touch Vite, React, or tsconfig directly.

## CLI

Once installed, the `tooka` bin is available in the workspace:

| Command | Description |
| --- | --- |
| `tooka dev` | Start the dev server. Flags: `-p, --port <port>`, `--host [host]`, `--open`. |
| `tooka build` | Build a static site. Flags: `--out-dir <dir>` (defaults to `dist`). |
| `tooka preview` | Preview the production build. Flags: `-p, --port <port>`, `--host [host]`, `--open`. |

## Config

Create `tooka.config.ts` in the workspace root (all fields optional):

```ts
import type { TookaConfig } from '@tooka/core';

const tookaConfig: TookaConfig = {
  slidesDir: 'slides',
  port: 5173,
};

export default tookaConfig;
```

### Hosting under a subpath

Set `base` to deploy the built site under a sub-directory (intranet folders, GitHub Pages project sites, reverse proxies). Use a leading and trailing slash:

```ts
const tookaConfig: TookaConfig = {
  base: '/my-slides/',
};
```

The value is passed straight to Vite's `base` and to React Router's `basename`, so client-side navigation matches the deployed path.

## Authoring cards

Cards live under `slides/<kebab-case-id>/index.tsx` and default-export an array of `Page` components:

```tsx
import type { Page } from '@tooka/core';

const Cover: Page = () => (
  <div className="flex h-full w-full items-center justify-center">
    <h1 className="text-[120px] font-bold">Hello, tooka</h1>
  </div>
);

const pages: Page[] = [Cover];
export default pages;

export const meta = { title: 'Hello' };
```

## Exports

```ts
import {
  CANVAS_WIDTH,   // 1080
  CANVAS_HEIGHT,  // 1350
  unstable_SharedElement, // match or fade objects across pages for shared element transitions
  type Page,
  type SlideMeta,
  type SlideModule,
  type SlideTransition,
  type TookaConfig,
} from '@tooka/core';
```

The Vite plugin is exposed under a subpath for advanced setups:

```ts
import { createViteConfig } from '@tooka/core/vite';
```

## License

MIT
