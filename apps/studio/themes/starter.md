---
name: Starter
description: A clean dark brand with near-black surfaces, one amber accent, and bold portrait typography.
---

# Starter

## Palette

| Role       | Value                      | Notes                                      |
| ---------- | -------------------------- | ------------------------------------------ |
| bg         | `#111110`                  | Near-black primary background              |
| surface    | `#1C1B1A`                  | Panels within a card                       |
| border     | `#2E2C2A`                  | Hairline dividers and panel borders        |
| text       | `#F4F2EE`                  | Primary copy                               |
| muted      | `#8F8A82`                  | Supporting copy and page numbers           |
| accent     | `#F5A623`                  | Amber; use for one focused accent per card |
| accentSoft | `rgba(245, 166, 35, 0.14)` | Low-emphasis accent fill                   |

## Typography

- Display: `'Noto Sans TC', system-ui, sans-serif` — weight 700.
- Body: the same stack — weight 400, with weight 500 for emphasis.
- Hook title: 96 px, line height 1.1, tracking -0.02em.
- Content-card title: 60 px, weight 700.
- Body: 38 px, line height 1.5.
- Eyebrow: 24 px, uppercase, tracking 0.15em, accent color.
- Page number and account handle: 22 px, muted color.
- Big number: 180 px, weight 700.

## Voice

- Tone: 專業但口語，像資深同事講重點。
- Person & address: 第一人稱單數，稱讀者為「你」。
- Sentence style: 短句，一卡一重點，動詞開頭。
- Avoid: 驚嘆號連發、空泛形容詞、業配腔。

## Logo

- Primary logo: No image asset; use the text handle `@your.account`.
- Placement: Bottom left on every card, 22 px in the muted color, 84 px from the left edge and 72 px from the bottom.
- Clear space: Keep at least 24 px free around the handle.

## Layout

- Canvas: 1080×1350 portrait.
- Safe area: 84 px left and right, 96 px top, and 120 px bottom to avoid Instagram UI overlap.
- Alignment: Prefer left-aligned vertical stacks; the Hook may use a centered vertical position.
- Panels: Use the surface color, 16 px corners, and a 1 px border. Do not use drop shadows.

## Fixed components

Use the same footer on every card. It applies the account-handle logo rule and reads the page number from the runtime.

```tsx
import { useSlidePageNumber } from '@open-cards/core';

const Footer = () => {
  const { current, total } = useSlidePageNumber();
  return (
    <footer
      style={{
        position: 'absolute',
        left: 84,
        right: 84,
        bottom: 72,
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 22,
        color: '#8F8A82',
      }}
    >
      <span>@your.account</span>
      <span>{String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
    </footer>
  );
};
```

## Motion

- Philosophy: Static by default; the content should feel complete in every exported frame.
- Preview-only behavior: The viewer supplies the horizontal carousel transition. PNG export captures the final static frame.

## Aesthetic

Starter feels like a focused editorial notebook built for technical ideas: near-black paper, warm amber annotation, assertive typography, and careful empty space. Avoid gradients, glossy effects, decorative emoji, multiple accent colors, and dense dashboard layouts.

## Example usage

```tsx
const Hook: Page = () => (
  <div style={{ width: '100%', height: '100%', background: '#111110', color: '#F4F2EE', padding: '96px 84px 120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <div style={{ fontSize: 24, letterSpacing: '0.15em', color: '#F5A623', fontWeight: 500 }}>STARTER BRAND</div>
    <h1 style={{ fontSize: 96, lineHeight: 1.1, letterSpacing: '-0.02em', margin: '28px 0 0' }}>一個品牌檔，<br />長出一整組輪播</h1>
    <Footer />
  </div>
);
```
