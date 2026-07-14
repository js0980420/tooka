---
name: current-card
description: Resolve the carousel, current card, and optional selected element in the tooka dev viewer. Use whenever the user says "this card", "this carousel", "this element", "the card I'm on", "這張卡", or otherwise refers to visible card content without naming it. Re-read `node_modules/.tooka/current.json` at the start of every such turn because viewer position changes between turns.
---

# Resolve the current card

Before asking which carousel or card the user means, read the live viewer cursor:

```
node_modules/.tooka/current.json
```

Treat it as a live cursor, never as durable conversation context. Read it again at the start of every deictic turn, including follow-ups such as "make this bigger", "also fix this one", or "continue here".

## Data shape

```json
{
  "slideId": "agent-workflow",
  "pageIndex": 2,
  "pageNumber": 3,
  "totalPages": 7,
  "slideTitle": "Agent Workflow",
  "view": "slides",
  "pagePath": "slides/agent-workflow/index.tsx",
  "selection": {
    "line": 42,
    "column": 6,
    "tagName": "h1",
    "text": "One clear workflow"
  },
  "updatedAt": "2026-07-13T08:00:00.000Z"
}
```

The field names remain slide/page-oriented because they are runtime contracts:

- `slideId` is the carousel folder under `slides/`.
- `pageIndex` is the zero-based card index in the default export.
- `pageNumber` is the one-based card number for user messages and `?p=N`.
- `totalPages` is the carousel card count.
- `pagePath` is the source file to read or edit.
- `view` is `slides` for the card canvas or `assets` for that carousel's asset manager.
- `selection` is null or the inspector-picked JSX element. Its one-based line and zero-based column are the canonical source handle; use `tagName` and `text` as sanity checks.
- `updatedAt` records the last navigation or selection change.

## Procedure

1. Read `current.json` fresh.
2. Check `updatedAt` and compare it with any cursor read earlier in the conversation.
3. Open `pagePath` and identify the `Page` component at `pageIndex`.
4. If `selection` exists, inspect the JSX opening tag near its line and column and verify the rendered tag/text.
5. Read `card-authoring` before changing React or visible copy.
6. Edit the smallest correct source region and run the relevant checks.

## Freshness

- Under roughly five minutes old: use it.
- Older than the user's last interaction or roughly five minutes: confirm before editing.
- Hours or days old: ignore it and ask which carousel/card they mean.
- A newer timestamp than the previous turn usually means the user intentionally moved; follow the new cursor without asking.

## When to use

- "Tighten the spacing on this card."
- "Make this heading bigger."
- "Change the image I selected."
- "What am I looking at?"
- Before guessing from recent git changes or asking which card.

If `selection` is null and the user names a specific element only deictically, ask which element after resolving the card.

## When not to use

- The user explicitly names a carousel or source path.
- `apply-comments` already locates targets through `@slide-comment` markers.
- Listing or discovering all carousels; read `slides/` directly.

## Missing file

Do not create `current.json` or guess. Explain that the viewer has not published a current card and ask the user to open one or name the target.
