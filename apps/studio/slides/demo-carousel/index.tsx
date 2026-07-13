import { type DesignSystem, type Page, type SlideMeta, useSlidePageNumber } from '@open-cards/core';
import type { CSSProperties } from 'react';

export const design: DesignSystem = {
  palette: { bg: '#111110', text: '#F4F2EE', accent: '#F5A623' },
  fonts: {
    display: "'Noto Sans TC', system-ui, sans-serif",
    body: "'Noto Sans TC', system-ui, sans-serif",
  },
  typeScale: { hero: 96, body: 38 },
  radius: 16,
};

const SURFACE = '#1C1B1A';
const BORDER = '#2E2C2A';
const MUTED = '#8F8A82';

const frame: CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  background: 'var(--osd-bg)',
  color: 'var(--osd-text)',
  fontFamily: 'var(--osd-font-body)',
  display: 'flex',
  flexDirection: 'column',
  padding: '96px 84px 120px',
};

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
        color: MUTED,
      }}
    >
      <span>@your.account</span>
      <span>
        {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </footer>
  );
};

const Eyebrow = ({ children }: { children: string }) => (
  <div
    style={{
      fontSize: 24,
      letterSpacing: '0.15em',
      color: 'var(--osd-accent)',
      fontWeight: 500,
    }}
  >
    {children}
  </div>
);

const Hook: Page = () => (
  <div style={{ ...frame, justifyContent: 'center' }}>
    <Eyebrow>OPEN-CARDS</Eyebrow>
    <h1
      style={{
        fontFamily: 'var(--osd-font-display)',
        fontSize: 'var(--osd-size-hero)',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        fontWeight: 700,
        margin: '28px 0 0',
      }}
    >
      用一句話，
      <br />
      生出整組 IG 輪播
    </h1>
    <p
      style={{
        fontSize: 'var(--osd-size-body)',
        lineHeight: 1.5,
        color: MUTED,
        margin: '32px 0 0',
      }}
    >
      往右滑，看它怎麼運作 →
    </p>
    <Footer />
  </div>
);

const ContentCard = ({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) => (
  <div style={{ ...frame, justifyContent: 'center' }}>
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2
      style={{
        fontFamily: 'var(--osd-font-display)',
        fontSize: 60,
        lineHeight: 1.2,
        fontWeight: 700,
        margin: '24px 0 0',
      }}
    >
      {title}
    </h2>
    <p
      style={{
        fontSize: 'var(--osd-size-body)',
        lineHeight: 1.5,
        color: MUTED,
        margin: '28px 0 0',
      }}
    >
      {body}
    </p>
    <Footer />
  </div>
);

const Describe: Page = () => (
  <ContentCard
    eyebrow="STEP 1"
    title="描述主題"
    body="跟 agent 說你要做什麼，再選一個品牌。它負責把內容寫成 React。"
  />
);

const Refine: Page = () => (
  <ContentCard
    eyebrow="STEP 2"
    title="點著改"
    body="在預覽裡點任何區塊、留下提示詞，再用 /apply-comments 一次套用。"
  />
);

const Export: Page = () => (
  <ContentCard
    eyebrow="STEP 3"
    title="匯出 PNG"
    body="一鍵輸出 1080×1350 圖檔。順序排好，直接上傳 IG。"
  />
);

const Cta: Page = () => (
  <div style={{ ...frame, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
    <div
      style={{
        width: '100%',
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 'var(--osd-radius)',
        padding: '72px 64px',
      }}
    >
      <Eyebrow>KEEP THIS</Eyebrow>
      <h2 style={{ fontSize: 60, fontWeight: 700, margin: '28px 0 0' }}>覺得有用？</h2>
      <p
        style={{
          fontSize: 'var(--osd-size-body)',
          lineHeight: 1.5,
          color: MUTED,
          margin: '24px 0 0',
        }}
      >
        收藏這則，之後照著做。
        <br />
        追蹤 <span style={{ color: 'var(--osd-accent)' }}>@your.account</span> 看更多。
      </p>
    </div>
    <Footer />
  </div>
);

export const meta: SlideMeta = {
  title: 'open-cards 是什麼',
  theme: 'starter',
  createdAt: '2026-07-13T08:03:57.683Z',
};

export default [Hook, Describe, Refine, Export, Cta] satisfies Page[];
