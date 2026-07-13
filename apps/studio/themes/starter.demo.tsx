import { type Page, useSlidePageNumber } from '@open-cards/core';

const BG = '#111110';
const TEXT = '#F4F2EE';
const MUTED = '#8F8A82';
const ACCENT = '#F5A623';
const SANS = "'Noto Sans TC', system-ui, sans-serif";

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

const Demo: Page = () => (
  <div
    style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: BG,
      color: TEXT,
      fontFamily: SANS,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '96px 84px 120px',
    }}
  >
    <div style={{ fontSize: 24, letterSpacing: '0.15em', color: ACCENT, fontWeight: 500 }}>
      STARTER BRAND
    </div>
    <h1
      style={{
        fontSize: 96,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        fontWeight: 700,
        margin: '28px 0 0',
      }}
    >
      一個品牌檔，
      <br />
      長出一整組輪播
    </h1>
    <p style={{ fontSize: 38, lineHeight: 1.5, color: MUTED, margin: '32px 0 0' }}>
      配色、字體、語氣、logo 位置——都從這份檔案來。
    </p>
    <Footer />
  </div>
);

export default [Demo] satisfies Page[];
