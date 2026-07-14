<img width="1280" height="640" alt="tooka github cover" src="./assets/cover.jpg" />

# tooka

**The card-carousel framework built for agents.** Describe your cards in natural language — your coding agent writes the React. tooka handles the canvas, scaling, navigation, hot reload, and present mode so the agent can focus on content.

Every card renders into a fixed **1080 × 1350** canvas. Pages are arbitrary React components, not a constrained DSL.

```bash
npx @tooka/cli init my-cards
```

## Why tooka

Cards are visual code. Agents are great at writing code. tooka is the missing runtime that turns "make cards about X" into a polished, presentable card carousel — without you ever leaving the chat.

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
npx @tooka/cli init my-cards
cd my-cards
pnpm dev
```

The scaffolded workspace ships with agent skills preconfigured for Claude Code. From there you drive the carousel through your agent — or edit `slides/<id>/index.tsx` directly.
