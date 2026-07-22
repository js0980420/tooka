<img width="1280" height="640" alt="tooka github cover" src="./assets/cover.jpg" />

# tooka

**The social-card framework built for agents.** Describe your cards in natural language — your coding agent writes the React. tooka handles the canvas, scaling, navigation, hot reload, and present mode so the agent can focus on content.

At its core, tooka is about three things:

1. **Reusable visual identities on fixed layouts.** Every card renders into a fixed **1080 × 1350** canvas, and brand kits under `themes/` (palette, typography, voice, recurring components) make a whole series of carousels share one consistent look.
2. **Publishing, not just exporting.** Connect the three Meta platforms — **Facebook Pages, Instagram, and Threads** — via the Graph API and post finished carousels straight from the dev server.
3. **Public image URLs via Imgbb.** Meta's publishing APIs require publicly reachable image URLs; tooka uploads exported PNGs through the **Imgbb API** so a local build can publish without your own hosting.

Pages are arbitrary React components, not a constrained DSL.

```bash
npm install @tooka/core react react-dom
npx tooka dev
```

## 繁體中文介紹

**tooka 是為 AI Agent 打造的開源社群圖文模板框架**——用中文描述需求，讓 Claude Code、Codex、Cursor 等 coding agent 生成整組 **1080×1350（4:5）IG 輪播貼文標準尺寸**的社群圖文卡片。

- **AI 圖文生成，不跑版、不失真**：文字用程式（React）渲染而不是用生圖模型「畫」，中文字不會出錯，版型由模板鎖定，整組輪播風格一致
- **品牌視覺套件**：`themes/` 內統一配色、字體、語氣與元件，所有輪播共用同一套視覺識別
- **一鍵發佈**：透過 Meta Graph API 直接發佈到 **Facebook 粉專、Instagram、Threads**，不用離開對話
- **瀏覽器內檢查器**：點擊卡片元素留言（「這裡改紅色」），`/apply-comments` 讓 agent 一次套用所有修改

適合需要大量產出**知識型輪播、懶人包、社群貼文圖卡**的內容創作者與行銷團隊。

延伸閱讀（作者部落格）：
- [IG 輪播貼文尺寸是多少？用 AI 一句話生成 1080×1350 圖文](https://aixwang.dev/blog/ig-carousel-size/)
- [AI 圖文生成工具怎麼選？我為什麼開發 Tooka](https://aixwang.dev/blog/why-i-built-tooka/)
- [如何用 AI 自動發文且不被 Meta 封鎖](https://aixwang.dev/blog/auto-posting-permissions/)

## Why tooka

Cards are visual code. Agents are great at writing code. tooka is the missing runtime that turns "make cards about X" into a polished, presentable card carousel — without you ever leaving the chat.

## Highlights

### 🤖 Agent-native authoring

Works with any coding agent (Claude Code, Codex, Cursor, …). `@tooka/core` ships with built-in skills — `npx tooka sync:skills` installs them into your project:

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

### 🎨 Reusable brand kits

Extract a visual identity from an existing carousel (or build one from references) with **`/create-brand`**. The brand lives under `themes/` as a documented style guide plus preview cards; any carousel links it through `meta.theme`, so every new deck inherits the same palette, type scale, and fixed layout components.

### 📦 Export to PNG

One click exports your card carousel as high-quality ordered PNG images, ready to be uploaded straight to Instagram.

### 📤 Publish to Facebook, Instagram & Threads

Connect the three Meta platforms once — a Facebook Page token, an Instagram account, a Threads account — and publish a finished carousel directly from the studio. tooka drives the Graph API end-to-end: it uploads the exported PNGs to **Imgbb** to get the public image URLs Meta requires, drafts a per-platform caption from the card content, and posts as a native multi-image carousel. Token validation, refresh, and connection status live in a built-in connects page with setup tutorials.

### 📁 Card manager

Organise carousels into folders with custom emoji and drag-and-drop to reorder. Useful once you've built more than three carousels and need to find anything.

### 🚀 Deploy-friendly

Outputs a plain static build — one-click deploy to Vercel, Cloudflare Pages, Zeabur, Netlify, or any static host. No server, no runtime, no lock-in.

## Get started

```bash
mkdir my-cards && cd my-cards
npm init -y
npm install @tooka/core react react-dom
npx tooka sync:skills   # install the agent skills into .agents/ + .claude/
npx tooka dev           # open the studio
```

`tooka dev` serves the studio, `tooka build` produces the static site, `tooka preview` serves the build. From there you drive the carousel through your agent — or edit `slides/<id>/index.tsx` directly.

## Origins

tooka is a heavily reworked fork of [open-slide](https://github.com/1weiho/open-slide) by [@1weiho](https://github.com/1weiho), a slide-deck framework for agents. The agent-driven authoring model is inherited from it; the product was refocused from presentations to social cards.

**Shared with open-slide:**

- The overall architecture — a React viewer runtime, a Vite plugin, and a pnpm + Turbo monorepo, with pages as arbitrary React components on a fixed canvas.
- The agent-native workflow: scaffolded skills that draft decks end-to-end and a technical authoring reference the agent reads first.
- The in-browser inspector loop — click an element, leave a comment, persist it as an `@slide-comment` marker, and let the agent apply it.
- Present mode with presenter view (current/next preview, speaker notes, timer), the assets manager with svgl logo search, and folder-based deck organisation.

**Where tooka diverges:**

- **Canvas**: 1920 × 1080 slides became **1080 × 1350 social cards** — portrait, mobile-first, sized for Instagram carousels.
- **Reusable visual styles**: brand kits under `themes/` (created with `/create-brand`) plus a template gallery give carousels fixed, repeatable layouts instead of one-off deck styling.
- **Output**: HTML/PDF deck export was replaced by **ordered PNG export** tuned for feeds.
- **Publishing pipeline**: entirely new — Graph API integrations for **Facebook Pages, Instagram, and Threads** (token validation and refresh included), **Imgbb** uploads to satisfy Meta's public-image-URL requirement, and per-platform caption drafts generated from card content.
