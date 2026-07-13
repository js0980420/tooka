<img width="1280" height="640" alt="open-cards github cover" src="./assets/cover.jpg" />

# open-cards

[![GitHub stars](https://img.shields.io/github/stars/1weiho/open-cards?style=for-the-badge)](https://github.com/1weiho/open-cards/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/1weiho/open-cards?style=for-the-badge)](https://github.com/1weiho/open-cards/network/members)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**The card-carousel framework built for agents.** Describe your cards in natural language — your coding agent writes the React. open-cards handles the canvas, scaling, navigation, hot reload, and present mode so the agent can focus on content.

Every card renders into a fixed **1080 × 1350** canvas. Pages are arbitrary React components, not a constrained DSL.

```bash
npx @open-cards/cli init my-cards
```

## Why open-cards

Cards are visual code. Agents are great at writing code. open-cards is the missing runtime that turns "make cards about X" into a polished, presentable card carousel — without you ever leaving the chat.

## Highlights

### 🤖 Agent-native authoring

Works with any coding agent (Claude Code, Codex, Cursor, …). The scaffolder ships with built-in skills:

- **`/create-carousel`** — drafts a card carousel end-to-end. Asks four scoping questions (topic & aesthetic, page count, text density, motion vs. static), picks an id, plans the structure, and writes the pages.
- **`/card-authoring`** — the technical reference for the 1080 × 1350 canvas, type scale, palette, and layout rules. The agent reads this before writing.

From a one-line prompt to a polished card carousel, no boilerplate.

### 🎯 In-browser inspector

Click any element in the dev server and attach a comment — *"make this red"*, *"change to 'Open Cards Rocks'"*, *"shrink the headline"*. Comments are persisted as `@slide-comment` markers in source. Run `/apply-comments` and the agent applies every pending edit, then clears the markers.

The loop: present → click to comment → `/apply-comments` → repeat.

### 🖼️ Assets manager + svgl logo search

Manage images, videos, and fonts per carousel through a built-in assets panel. Search and drop in any brand logo via the integrated [svgl](https://svgl.app/) catalogue — no more hunting for SVGs.

### 🎬 Professional present mode

Fullscreen playback with keyboard navigation, plus a **presenter mode** with current/next card preview, speaker notes, and a timer. Built for the stage, not just the browser tab.

### 📦 Export to PNG

One click exports your card carousel as high-quality ordered PNG images, ready to be uploaded straight to Instagram.

### 📁 Card manager

Organise carousels into folders with custom emoji and drag-and-drop to reorder. Useful once you've built more than three carousels and need to find anything.

### 🚀 Deploy-friendly

Outputs a plain static build — one-click deploy to Vercel, Cloudflare Pages, Zeabur, Netlify, or any static host. No server, no runtime, no lock-in.

## Get started

```bash
npx @open-cards/cli init my-cards
```
```bash
cd my-cards
pnpm dev
```

The scaffolded workspace ships with agent skills preconfigured for Claude Code. From there you drive the carousel through your agent — or edit `slides/<id>/index.tsx` directly. See [CLAUDE.md](CLAUDE.md) for the hard rules.

## Repo layout

This repo is a pnpm + Turbo monorepo.

| Path | Description |
| --- | --- |
| [packages/core](packages/core) | `@open-cards/core` — runtime (home page, card viewer, present mode, inspector), Vite plugin, and the `open-cards` dev/build/preview CLI. |
| [packages/cli](packages/cli) | `@open-cards/cli` — `npx @open-cards/cli init` scaffolder. Generates a minimal workspace where Vite/React/tsconfig stay hidden inside core. |
| [apps/demo](apps/demo) | Example workspace that consumes `@open-cards/core` via `workspace:*`. Used for local development of the framework. |

## Development

```bash
pnpm install
pnpm dev      # runs the demo against the local @open-cards/core
pnpm build    # builds all packages
pnpm check    # type-checks all packages
pnpm lint     # lints via biome
```

## Star history

If open-cards is useful to you, please [star the repo on GitHub](https://github.com/1weiho/open-cards) — it helps other people find the project.

[![Star History Chart](https://api.star-history.com/svg?repos=1weiho/open-cards&type=Date)](https://star-history.com/#1weiho/open-cards&Date)

## Support

If open-cards has been useful to you, consider supporting development:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/D1D11YPUP1)

## License

MIT
