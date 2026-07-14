---
name: card-authoring
description: Technical reference for writing or editing tooka carousel cards on the fixed 1080×1350 canvas. Use before modifying any carousel `index.tsx` under `slides/`, including from `create-carousel`, `apply-comments`, or `current-card`; also trigger for requests to edit a card, fix a carousel layout, change card copy, adjust visual style, or understand the card runtime.
---

# Author carousel cards

Use this as the source of truth whenever a workflow reaches the point of writing React under `slides/<id>/`.

- `create-carousel` owns the new-carousel interview and structure.
- `apply-comments` owns inspector-marker processing.
- `current-card` resolves "this card" and selected-element references.
- `create-brand` owns paired brand files under `themes/`.

## Hard rules

- Keep one carousel in `slides/<kebab-case-id>/index.tsx`; put its assets in `slides/<id>/assets/`.
- Do not create sibling component, helper, README, or prose files. Keep helpers inside `index.tsx`.
- Do not edit other carousels, configuration, packages, or dependencies.
- Use React and standard web APIs already available in the project.
- Keep the `slides/`, `Page`, `SlideMeta`, and `meta.theme` names because they are runtime contracts, even when visible language says carousel and card.

## File contract

```tsx
import type { Page, SlideMeta } from '@tooka/core';

const Hook: Page = () => <div>…</div>;
const Cta: Page = () => <div>…</div>;

export const meta: SlideMeta = {
  title: 'My carousel',
  theme: 'brand-id',
  createdAt: '2026-07-13T08:00:00.000Z',
};

export default [Hook, Cta] satisfies Page[];
```

- Export a non-empty array of zero-prop `Page` components in reading order.
- Use the kebab-case folder name as the carousel id.
- `meta.theme` must match a `themes/<id>.md` basename; omit it for an unregistered visual direction.
- Generate `meta.createdAt` immediately before writing with `node -e "console.log(new Date().toISOString())"`. Paste the exact ISO string literal.

When editing one card in a long file, first locate page declarations with `rg -n ": Page = " slides/<id>/index.tsx`, then read the relevant range plus its helpers.

## Canvas

Every card renders into a fixed **1080×1350** 4:5 portrait canvas. Design at those exact pixels; the framework handles scaling.

- Fill the canvas with `width: '100%'` and `height: '100%'`.
- Use pixel values for type, padding, and positioning. Do not use viewport units for type.
- Prefer vertical stacking and left alignment for content cards.
- Use inline styles; scope any CSS or keyframe names carefully.
- Never add scrolling. Cropped content is missing content.

### Safe area

- Keep left and right content padding between **72 and 90 px**.
- Keep top padding around **84–108 px**.
- Keep important information out of the bottom **120 px**, where Instagram UI can compete with the card.
- Place account handles and page numbers consistently without crowding the CTA or logo.

### Type scale

| Purpose | Size |
| --- | --- |
| Hook title | 88–110 px, line height about 1.05 |
| Content-card title | 56–64 px |
| Body | 36–42 px, line height about 1.45 |
| List | 34–38 px |
| Eyebrow / tag | 24–26 px, tracking about 0.15em |
| Page number / account | 22–24 px |
| Big number | 160–220 px |

Use one idea per card. If text no longer fits at the lower bound, split it into another card rather than shrinking type or padding.

### Vertical budget

Calculate before coding:

`usable height = 1350 - top padding - bottom safe area`

With 96 px top padding and 120 px bottom protection, the content budget is **1134 px**. Estimate each text block as `font size × line height × lines`, then add all gaps, panels, media, and fixed elements. Count wrapped lines explicitly.

Use a Hook for one large idea plus a short supporting line. A content card should contain a title plus either a short paragraph or 2–5 concise points. A CTA should have one action hierarchy, not a second content lesson.

Do not use negative margins, transforms, `overflow: auto`, or hidden overflow to conceal an over-budget layout.

## Brand application

When `themes/<id>.md` exists and the carousel uses it, read it completely before editing. It overrides generic defaults.

- Copy Palette and Typography values precisely.
- Write visible copy in the documented Voice, including person/address and sentence style.
- Respect Voice `Avoid` rules.
- Use the supplied Logo asset or documented text fallback.
- Apply Logo placement, size, and clear space consistently.
- Copy paste-ready Fixed components instead of approximating them.

Brand files remain under `themes/` and carousels keep the `meta.theme` field.

## Design system

New carousels should normally expose tweakable runtime tokens:

```tsx
import type { DesignSystem, Page } from '@tooka/core';

export const design: DesignSystem = {
  palette: { bg: '#111110', text: '#f4f2ee', accent: '#f5a623' },
  fonts: {
    display: "'Noto Sans TC', system-ui, sans-serif",
    body: "'Noto Sans TC', system-ui, sans-serif",
  },
  typeScale: { hero: 96, body: 38 },
  radius: 16,
};
```

Use CSS variables for live visual properties:

- `--osd-bg`, `--osd-text`, `--osd-accent`
- `--osd-font-display`, `--osd-font-body`
- `--osd-size-hero`, `--osd-size-body`, `--osd-radius`

Keep extra palette roles and spacing constants as module-level values. The `design` initializer must be a top-level object literal with plain values and no spreads or helper calls.

## Assets and fonts

Use carousel-local assets through module imports:

```tsx
import hero from './assets/hero.jpg';
```

Use shared brand assets through `@assets/...`. Only create an `assets/` folder when real content needs it.

Use `ImagePlaceholder` only for a specific user-owned image that cannot be responsibly invented, such as a product screenshot, original chart, or team photo. Do not use placeholders for decorative stock imagery, icons, or abstract filler.

Prefer the system font stack. If a brand requires a webfont, load its stylesheet once in `document.head`, guard it by an id, request only used weights, and subset fixed CJK copy when practical. Never render an `@import` once per card.

## Account, logo, and page numbers

Use `useSlidePageNumber()` for any visible counter:

```tsx
import { useSlidePageNumber } from '@tooka/core';

const Footer = () => {
  const { current, total } = useSlidePageNumber();
  return <span>{String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>;
};
```

Keep the account handle and logo placement consistent across the full carousel. Do not hardcode card numbers in individual components.

## Inspector-friendly repeated elements

For visually repeated panels, define one local component and instantiate it explicitly:

```tsx
const Point = ({ title }: { title: string }) => <div>{title}</div>;

<Point title="First" />
<Point title="Second" />
<Point title="Third" />
```

Do not render editable visual items from an array `.map()`. The inspector edits a source JSX location; a shared map body would cause one targeted edit to affect every rendered instance. Literal text lists can remain ordinary `<li>` elements.

## Steps and preview animation

Use `<Steps>` and direct-child `<Step>` components only when reveal order carries meaning. A Hook, quote, diagram, or static social card is usually stronger fully composed.

- Non-Step children appear immediately.
- Forward entry reveals steps in order.
- Overview jumps and backward entry show the fully composed card.
- Reduced-motion handling is automatic.

CSS and React animation only affect browser preview. PNG export freezes animations and captures the final static frame. Never hide essential meaning behind an intermediate animation state.

## Card transitions

The viewer supplies `defaultCarouselTransition`, an IG-style horizontal slide that reverses with navigation direction. Do not declare a transition merely to reproduce it.

A page-level `Page.transition` overrides the module `transition`; the module transition overrides `defaultCarouselTransition`. The incoming card chooses the transition. Reduced motion is handled automatically.

The runtime exposes `--osd-dir` (`1` forward, `-1` backward) for direction-aware keyframes:

```tsx
{ transform: 'translateX(calc(var(--osd-dir, 1) * 8px))' }
```

When custom motion is justified, use one consistent family, restrained durations, and small movement. Remember that custom transitions are preview-only and do not affect exported PNGs.

## Self-review

- [ ] `slides/<id>/index.tsx` exports a non-empty `Page[]`.
- [ ] Every root fills the 1080×1350 canvas.
- [ ] Content stays inside 72–90 px side padding and above the bottom 120 px.
- [ ] Hook/body/list/metadata sizes stay within the mobile reading scale.
- [ ] Each card contains one independently understandable idea.
- [ ] The first card is a Hook and the last is a CTA for newly created carousels.
- [ ] Brand Palette, Typography, Voice, Logo, Layout, and Fixed components are followed.
- [ ] `design` is a top-level plain object and supported values use `var(--osd-*)`.
- [ ] Page numbers come from `useSlidePageNumber()`.
- [ ] Repeated editable visuals use explicit component instances, not a data `.map()`.
- [ ] Every asset import exists and every placeholder represents required user content.
- [ ] Animation resolves to a meaningful final static PNG frame.
- [ ] No card scrolls, clips overflow to hide errors, or relies on viewport units for type.
- [ ] Nothing outside the target `slides/<id>/` changed.

Run the repository's typecheck and formatting commands after edits.
