import {
  type DesignSystem,
  ImagePlaceholder,
  type Page,
  type SlideMeta,
  useSlidePageNumber,
} from '@tooka/core';
import type { ReactNode } from 'react';

export const design: DesignSystem = {
  palette: { bg: '#0F0E0C', text: '#F5F1E6', accent: '#E3A73C' },
  fonts: {
    display: "'Noto Serif TC', 'Songti TC', 'PMingLiU', serif",
    body: "'Noto Sans TC', system-ui, sans-serif",
  },
  typeScale: { hero: 92, body: 34 },
  radius: 12,
};

const MUTED = '#9B9486';
const HAIRLINE = 'rgba(227, 167, 60, 0.55)';
const PANEL_BORDER = 'rgba(245, 241, 230, 0.16)';
const PANEL_BG = 'rgba(245, 241, 230, 0.05)';
const EDGE_X = 90;

const FONT_LINK_ID = 'noir-gold-fonts';
if (typeof document !== 'undefined' && !document.getElementById(FONT_LINK_ID)) {
  const link = document.createElement('link');
  link.id = FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700;900&family=Noto+Sans+TC:wght@400;500;700&display=swap';
  document.head.appendChild(link);
}

const Eyebrow = ({ children }: { children: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
    <div
      style={{
        fontFamily: 'var(--osd-font-display)',
        fontSize: 30,
        fontWeight: 700,
        letterSpacing: '0.42em',
        textIndent: '0.42em',
        color: 'var(--osd-accent)',
      }}
    >
      {children}
    </div>
    <div style={{ width: 340, height: 1.5, background: HAIRLINE }} />
  </div>
);

const Handle = () => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 56,
      textAlign: 'center',
      fontSize: 26,
      fontWeight: 500,
      letterSpacing: '0.3em',
      textIndent: '0.3em',
      color: MUTED,
    }}
  >
    @ your.account
  </div>
);

const PageNo = () => {
  const { current, total } = useSlidePageNumber();
  return (
    <div
      style={{
        position: 'absolute',
        top: 66,
        right: EDGE_X,
        fontSize: 24,
        fontWeight: 500,
        letterSpacing: '0.12em',
        fontVariantNumeric: 'tabular-nums',
        color: MUTED,
      }}
    >
      {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </div>
  );
};

const Vignette = () => (
  <div
    aria-hidden
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background:
        'radial-gradient(ellipse 90% 70% at 50% 42%, rgba(245, 241, 230, 0.05) 0%, transparent 60%)',
    }}
  />
);

const Shell = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--osd-bg)',
      color: 'var(--osd-text)',
      fontFamily: 'var(--osd-font-body)',
    }}
  >
    <Vignette />
    {children}
    <PageNo />
    <Handle />
  </div>
);

const Hook: Page = () => (
  <Shell>
    <ImagePlaceholder
      hint="昏暗情境照，低曝光、單一光源"
      width={1080}
      height={1350}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background:
          'linear-gradient(180deg, rgba(15, 14, 12, 0.82) 0%, rgba(15, 14, 12, 0.55) 45%, rgba(15, 14, 12, 0.85) 100%)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 120,
        left: EDGE_X,
        right: EDGE_X,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 52,
      }}
    >
      <Eyebrow>系列名稱・第 1 集</Eyebrow>
      <h1
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 'var(--osd-size-hero)',
          fontWeight: 900,
          lineHeight: 1.4,
          letterSpacing: '0.02em',
          margin: 0,
        }}
      >
        主標題先鋪陳兩行
        <br />
        說出讀者最痛的點
        <br />
        <span style={{ color: 'var(--osd-accent)' }}>金色這行給出答案</span>
      </h1>
      <p style={{ fontSize: 34, lineHeight: 1.8, fontWeight: 500, margin: 0 }}>
        副標放一到兩行補充，
        <br />
        說清楚這篇能讓讀者帶走什麼
      </p>
      <div
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 30,
          fontWeight: 700,
          color: 'var(--osd-accent)',
        }}
      >
        一句引導讀者往右滑的話 →
      </div>
    </div>
  </Shell>
);

const Point = ({ n, title, sub }: { n: string; title: string; sub: string }) => (
  <div
    style={{
      display: 'flex',
      gap: 32,
      alignItems: 'baseline',
      borderBottom: `1px solid ${PANEL_BORDER}`,
      paddingBottom: 32,
    }}
  >
    <div
      style={{
        fontFamily: 'var(--osd-font-display)',
        fontSize: 48,
        fontWeight: 900,
        color: 'var(--osd-accent)',
        flexShrink: 0,
      }}
    >
      {n}
    </div>
    <div>
      <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.35 }}>{title}</div>
      <div style={{ fontSize: 30, lineHeight: 1.6, color: MUTED, marginTop: 10 }}>{sub}</div>
    </div>
  </div>
);

const Points: Page = () => (
  <Shell>
    <div
      style={{
        position: 'absolute',
        top: 180,
        left: EDGE_X,
        right: EDGE_X,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 40,
      }}
    >
      <Eyebrow>內容重點</Eyebrow>
      <h2
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 58,
          fontWeight: 900,
          lineHeight: 1.4,
          letterSpacing: '0.02em',
          textAlign: 'center',
          margin: 0,
        }}
      >
        內頁標題放兩行，
        <br />
        一張卡只講一件事
      </h2>
      <div
        style={{
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          marginTop: 8,
        }}
      >
        <Point n="01" title="第一個重點" sub="一句話說明，讓這個重點站得住。" />
        <Point n="02" title="第二個重點" sub="補充脈絡或方法，維持一行到兩行。" />
        <Point n="03" title="第三個重點" sub="最多放五點，超過就拆成下一張卡。" />
      </div>
    </div>
  </Shell>
);

const Quote: Page = () => (
  <Shell>
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 120,
        left: EDGE_X,
        right: EDGE_X,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 48,
      }}
    >
      <Eyebrow>一句話</Eyebrow>
      <blockquote
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 62,
          fontWeight: 900,
          lineHeight: 1.6,
          letterSpacing: '0.03em',
          margin: 0,
        }}
      >
        「放一句值得被截圖的話，
        <br />讓<span style={{ color: 'var(--osd-accent)' }}>關鍵字</span>用金色跳出來，
        <br />
        其他維持白色。」
      </blockquote>
      <div style={{ width: 200, height: 1.5, background: HAIRLINE }} />
      <div style={{ fontSize: 28, letterSpacing: '0.2em', color: MUTED }}>出處或署名</div>
    </div>
  </Shell>
);

const BigNumber: Page = () => (
  <Shell>
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 120,
        left: EDGE_X,
        right: EDGE_X,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 36,
      }}
    >
      <Eyebrow>關鍵數字</Eyebrow>
      <div
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 200,
          fontWeight: 900,
          lineHeight: 1,
          color: 'var(--osd-accent)',
        }}
      >
        10×
      </div>
      <h2
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 52,
          fontWeight: 700,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        用一個大數字，
        <br />
        讓成果或差距變得有感
      </h2>
      <p style={{ fontSize: 32, lineHeight: 1.7, color: MUTED, margin: 0 }}>
        數字下方補一句說明或行動。
      </p>
    </div>
  </Shell>
);

const CompareCol = ({
  label,
  items,
  highlight = false,
}: {
  label: string;
  items: ReactNode;
  highlight?: boolean;
}) => (
  <div
    style={{
      flex: 1,
      background: PANEL_BG,
      border: `1.5px solid ${highlight ? HAIRLINE : PANEL_BORDER}`,
      borderRadius: 'var(--osd-radius)',
      padding: '44px 40px',
      textAlign: 'left',
    }}
  >
    <div
      style={{
        fontFamily: 'var(--osd-font-display)',
        fontSize: 38,
        fontWeight: 900,
        letterSpacing: '0.06em',
        color: highlight ? 'var(--osd-accent)' : MUTED,
      }}
    >
      {label}
    </div>
    <div
      style={{
        width: 48,
        height: 2,
        background: highlight ? HAIRLINE : PANEL_BORDER,
        margin: '22px 0 26px',
      }}
    />
    <div style={{ fontSize: 29, lineHeight: 2, color: 'var(--osd-text)' }}>{items}</div>
  </div>
);

const Compare: Page = () => (
  <Shell>
    <div
      style={{
        position: 'absolute',
        top: 180,
        left: EDGE_X,
        right: EDGE_X,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 40,
      }}
    >
      <Eyebrow>前後對比</Eyebrow>
      <h2
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 58,
          fontWeight: 900,
          lineHeight: 1.4,
          textAlign: 'center',
          margin: 0,
        }}
      >
        同一件事，
        <br />
        兩種做法的差別
      </h2>
      <div style={{ alignSelf: 'stretch', display: 'flex', gap: 28, marginTop: 8 }}>
        <CompareCol
          label="舊做法"
          items={
            <>
              第一個缺點
              <br />
              第二個缺點
              <br />
              第三個缺點
            </>
          }
        />
        <CompareCol
          label="新做法"
          highlight
          items={
            <>
              第一個好處
              <br />
              第二個好處
              <br />
              第三個好處
            </>
          }
        />
      </div>
    </div>
  </Shell>
);

const Cta: Page = () => (
  <Shell>
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 120,
        left: EDGE_X,
        right: EDGE_X,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 44,
      }}
    >
      <Eyebrow>下一步</Eyebrow>
      <h2
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 66,
          fontWeight: 900,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        想要完整內容？
        <br />
        <span style={{ color: 'var(--osd-accent)' }}>留言「關鍵字」傳給你</span>
      </h2>
      <p style={{ fontSize: 32, lineHeight: 1.7, color: MUTED, margin: 0 }}>
        提醒讀者收藏、分享，或追蹤帳號。
      </p>
      <div
        style={{
          border: `1.5px solid ${HAIRLINE}`,
          borderRadius: 999,
          padding: '18px 46px',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '0.24em',
          textIndent: '0.24em',
          color: 'var(--osd-accent)',
        }}
      >
        追蹤 @your.account
      </div>
    </div>
  </Shell>
);

export const meta: SlideMeta = {
  title: '暗夜金・電影感',
  createdAt: '2026-07-15T02:31:27.007Z',
  template: true,
};

export default [Hook, Points, Quote, BigNumber, Compare, Cta] satisfies Page[];
