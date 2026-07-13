---
name: create-brand
description: Create, draft, author, or extract a reusable brand kit for open-cards. Use when the user asks to "create a brand", "make a brand called X", "build a brand kit", "建品牌", "新品牌風格", extract a brand from an existing carousel, or derive one from visual references. Produces a paired bundle under `themes/`; cards continue to link it through `meta.theme`. Do not use for editing real carousels.
---

# Create a brand

Create a reusable brand bundle with two files sharing the same id:

1. `themes/<id>.md` documents palette, typography, voice, logo, layout, fixed components, and motion.
2. `themes/<id>.demo.tsx` renders two or three self-contained preview cards for the Brands UI.

Keep the runtime contract unchanged: brand files live in `themes/`, preview files use the `.demo.tsx` suffix, and a carousel links its brand through `meta.theme`. Only write the paired files under `themes/`. Do not modify real cards, configuration, packages, or dependencies.

Read the `card-authoring` skill before writing either file so all decisions fit the 1080×1350 canvas and mobile reading scale.

## 1. Identify the source

Use any combination of:

- Image references such as card screenshots, mood boards, or brand assets.
- A written direction describing audience, tone, palette, typography, and visual character.
- An existing `slides/<id>/index.tsx` whose identity should become reusable.

If the source is unclear, ask which inputs to use. Resolve contradictions with the user before writing.

For an existing carousel, extract palette values, font stacks, type scale, spacing, recurring components, motion, wording patterns, and logo placement. For images, inspect dominant colors, hierarchy, rhythm, motifs, and repeated chrome. Do not invent replacements for supplied evidence.

## 2. Choose the brand id

Use a short kebab-case id such as `editorial-noir`, `studio-warm`, or `dev-terminal`. Check `themes/` first and do not overwrite an existing brand without approval.

## 3. Write `themes/<id>.md`

Use this exact section order and adapt the details to the brand:

````markdown
---
name: <Human-readable brand name>
description: <One-line visual and verbal promise>
---

# <Brand name>

## Palette

| Role   | Value     | Notes                          |
| ------ | --------- | ------------------------------ |
| bg     | `#0f172a` | Primary card background        |
| text   | `#f8fafc` | Primary copy                   |
| accent | `#fbbf24` | One focused emphasis per card  |
| muted  | `#94a3b8` | Secondary copy and card number |

## Typography

- Display: `<stack>` — weight and usage.
- Body: `<stack>` — weight and usage.
- Hook title: <size and line height>.
- Card heading: <size and line height>.
- Body: <size and line height>.
- Eyebrow and metadata: <size and tracking>.

## Voice

- Tone: <One sentence, for example "Professional but warm, like a senior teammate.">
- Person & address: <Person and reader address, for example "First-person plural; address the reader as you.">
- Sentence style: <For example "Short sentences, one point per card, verb-led headings.">
- Avoid: <Banned words or styles, for example "Repeated exclamation marks and promotional filler.">

## Logo

- Primary logo: `assets/<brand>/logo.svg`
- Placement: <Fixed position and size, for example "Bottom right, 96 px wide, 60 px from edges.">
- Clear space: <Minimum clear-space rule>.

## Layout

- Canvas: 1080×1350 (4:5 portrait).
- Safe area: <edge padding>; keep key information above the bottom 120 px.
- Alignment: <stacking and alignment rules>.
- Grid and panel rules: <brand-specific structure>.

## Fixed components

Provide paste-ready React for at least `Title` and `Footer`. Use `useSlidePageNumber()` for page numbers instead of props or hardcoded values. Include an Eyebrow or Logo component when the brand requires one.

```tsx
import { useSlidePageNumber } from '@open-cards/core';

const Footer = () => {
  const { current, total } = useSlidePageNumber();
  return (
    <div style={{ position: 'absolute', right: 84, bottom: 72 }}>
      {current} / {total}
    </div>
  );
};
```

## Motion

- Philosophy: static / subtle / rich — choose one and explain it in one sentence.
- Preview-only behavior: animations appear in the browser; PNG export captures the final static frame.
- Reusable keyframes: <paste-ready CSS only when useful>.

## Aesthetic

Describe one coherent direction, its references, and what to avoid.

## Example usage

Provide one paste-ready 1080×1350 Hook card using the documented tokens, voice, fixed components, and logo rule.
````

If there is no image logo, document a typographic wordmark or account handle instead of inventing an asset path.

## 4. Write `themes/<id>.demo.tsx`

Create a self-contained preview module:

- Import `type Page` and `useSlidePageNumber` from `@open-cards/core` as needed.
- Inline the same fixed components and concrete token values from the markdown.
- Export two or three `Page` components in a default array: Hook, Content, and optionally CTA.
- Keep every card at the runtime-provided 1080×1350 canvas size with no 16:9 assumptions.
- Use the documented Voice in visible copy and apply the documented Logo placement.
- Do not import from `@/`, real carousel files, or slide-only helpers.
- Do not add external assets unless the user supplied them and the markdown records their paths.

## 5. Validate

Confirm all of the following:

- Both paired files exist and share one kebab-case id.
- Frontmatter has `name` and `description`.
- Palette includes `bg`, `text`, `accent`, and `muted` with concrete values.
- Typography covers Hook, card heading, body, and metadata scales.
- Voice defines tone, person/address, sentence style, and avoid rules.
- Logo defines an asset or text fallback, placement, and clear space.
- Layout targets 1080×1350 and protects the bottom 120 px.
- Fixed components contain paste-ready React.
- The demo exports a default `Page[]` with matching tokens and components.
- No real carousel or config file changed.

Run the repository's formatting and type checks if the new demo is inside the active project.

## 6. Hand off

Report the brand id, both file paths, and a one-line summary of its visual and verbal direction. Explain that it appears in the Brands UI and can be selected by `/create-carousel`, while the underlying code contract remains `themes/` plus `meta.theme`.
