import {
  type DesignSystem,
  type Page,
  type PngExportVariant,
  type SlideMeta,
  usePngExportVariant,
  useSlidePageNumber,
} from '@open-cards/core';
import type { CSSProperties, ReactNode } from 'react';

export const design: DesignSystem = {
  palette: { bg: '#0A192F', text: '#F8F9FA', accent: '#64FFDA' },
  fonts: {
    display: "'Noto Sans TC', system-ui, sans-serif",
    body: "'Noto Sans TC', system-ui, sans-serif",
  },
  typeScale: { hero: 90, body: 36 },
  radius: 20,
};

const MUTED = '#8892B0';
const PANEL_BORDER = '#172A45';
const SOFT_BLUE = '#112240';

// 長方與正方邊距規格
const EDGE_INSET_X = 72;
const EDGE_INSET_Y = 60;
const IG_SAFE_EDGE_INSET_X = 144;
const IG_SAFE_EDGE_INSET_Y = 220;
const IG_CONTENT_SCALE = 0.84;

export const pngExportVariants = [
  { id: 'original', label: '下載長方尺寸', fileSuffix: 'original', previewLabel: '長方尺寸' },
  { id: 'ig', label: '下載正方尺寸', fileSuffix: 'ig', previewLabel: '正方尺寸' },
] satisfies PngExportVariant[];

const useSquareSafeLayout = () => {
  const exportVariant = usePngExportVariant();
  return exportVariant ? exportVariant === 'ig' : false;
};

const Badge = ({ edgeInsetX, edgeInsetY }: { edgeInsetX: number; edgeInsetY: number }) => (
  <div
    style={{
      position: 'absolute',
      top: edgeInsetY,
      left: edgeInsetX,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 30px',
      border: '3px solid var(--osd-accent)',
      borderRadius: 999,
      background: '#0A192F',
      fontSize: 26,
      fontWeight: 700,
      color: 'var(--osd-text)',
      boxShadow: '0 8px 32px rgba(100, 255, 218, 0.08)',
    }}
  >
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" fill="#64FFDA" />
      <path
        d="M4.5 20c0-3.2 3.4-4.8 7.5-4.8s7.5 1.6 7.5 4.8"
        stroke="#64FFDA"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
    @test_carousel.ai
  </div>
);

const PageChip = ({ edgeInsetX, edgeInsetY }: { edgeInsetX: number; edgeInsetY: number }) => {
  const { current } = useSlidePageNumber();
  return (
    <div
      style={{
        position: 'absolute',
        right: edgeInsetX,
        bottom: edgeInsetY,
        background: '#64FFDA',
        color: '#0A192F',
        borderRadius: 20,
        padding: '10px 28px',
        fontSize: 30,
        fontWeight: 900,
        fontVariantNumeric: 'tabular-nums',
        boxShadow: '0 8px 32px rgba(100, 255, 218, 0.2)',
      }}
    >
      {String(current).padStart(2, '0')}
    </div>
  );
};

const Shell = ({ children }: { children: ReactNode }) => {
  const squareSafe = useSquareSafeLayout();
  const edgeInsetX = squareSafe ? IG_SAFE_EDGE_INSET_X : EDGE_INSET_X;
  const edgeInsetY = squareSafe ? IG_SAFE_EDGE_INSET_Y : EDGE_INSET_Y;

  return (
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
      {/* 科技感漸層背景點綴 */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(100, 255, 218, 0.12) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            left: -200,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 180, 216, 0.12) 0%, transparent 70%)',
          }}
        />
      </div>

      <div
        style={{
          position: 'relative',
          height: '100%',
          padding: squareSafe ? '320px 144px 300px' : '168px 84px 156px',
        }}
      >
        <div
          style={{
            width: squareSafe ? `${100 / IG_CONTENT_SCALE}%` : '100%',
            height: squareSafe ? `${100 / IG_CONTENT_SCALE}%` : '100%',
            display: 'flex',
            flexDirection: 'column',
            transform: squareSafe ? `scale(${IG_CONTENT_SCALE})` : undefined,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
      <Badge edgeInsetX={edgeInsetX} edgeInsetY={edgeInsetY} />
      <PageChip edgeInsetX={edgeInsetX} edgeInsetY={edgeInsetY} />
    </div>
  );
};

const TagPill = ({ children }: { children: string }) => (
  <div
    style={{
      alignSelf: 'flex-start',
      background: SOFT_BLUE,
      border: `2.5px solid ${PANEL_BORDER}`,
      borderRadius: 999,
      padding: '12px 30px',
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: '0.12em',
      color: 'var(--osd-accent)',
    }}
  >
    {children}
  </div>
);

const Point = ({ n, title, sub }: { n: string; title: string; sub: string }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 30,
      background: SOFT_BLUE,
      border: `2.5px solid ${PANEL_BORDER}`,
      borderRadius: 28,
      padding: '34px 40px',
    }}
  >
    <div
      style={{
        width: 76,
        height: 76,
        borderRadius: '50%',
        background: 'var(--osd-accent)',
        color: '#0A192F',
        display: 'grid',
        placeItems: 'center',
        fontSize: 40,
        fontWeight: 900,
        flexShrink: 0,
      }}
    >
      {n}
    </div>
    <div style={{ width: 3, alignSelf: 'stretch', background: '#172A45', borderRadius: 2 }} />
    <div>
      <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.25 }}>{title}</div>
      <div style={{ fontSize: 31, color: MUTED, marginTop: 8 }}>{sub}</div>
    </div>
  </div>
);

const Hook: Page = () => (
  <Shell>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h1
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 'var(--osd-size-hero)',
          lineHeight: 1.18,
          letterSpacing: '-0.01em',
          fontWeight: 900,
          margin: 0,
        }}
      >
        實測新建卡片
        <br />
        <span style={{ color: 'var(--osd-accent)' }}>IG 直式圖文卡片</span>
      </h1>
      <p
        style={{
          fontSize: 'var(--osd-size-body)',
          lineHeight: 1.5,
          color: MUTED,
          fontWeight: 500,
          margin: '40px 0 0',
        }}
      >
        測試 1080×1350 直式畫布與安全裁切邊距 →
      </p>
      <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
        <TagPill>直式畫布</TagPill>
        <TagPill>防裁切安全區</TagPill>
        <TagPill>暗色系科技風</TagPill>
      </div>
    </div>
  </Shell>
);

const Describe: Page = () => (
  <Shell>
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 40,
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 68,
            lineHeight: 1.25,
            fontWeight: 900,
            margin: 0,
          }}
        >
          安全邊距與 <span style={{ color: 'var(--osd-accent)' }}>長寬比例</span>
        </h2>
        <p style={{ fontSize: 36, lineHeight: 1.5, color: MUTED, margin: '20px 0 0' }}>
          根據您的需求對調與調整後的最佳安全規範。
        </p>
      </div>
      <Point n="1" title="預設為長方尺寸" sub="完整利用 4:5 畫面，邊距 72px / 60px" />
      <Point n="2" title="可選正方尺寸" sub="整體往中央收縮，確保 IG 預覽不被截斷" />
      <Point n="3" title="一鍵打包下載" sub="有多張卡片時依然自動打包為單一 ZIP 下載" />
    </div>
  </Shell>
);

const Cta: Page = () => (
  <Shell>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          width: '100%',
          background: '#0B1E36',
          border: `2.5px solid ${PANEL_BORDER}`,
          borderRadius: 32,
          padding: '80px 64px',
          textAlign: 'center',
          boxShadow: '0 24px 60px rgba(100, 255, 218, 0.05)',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: 'var(--osd-accent)',
            color: '#0A192F',
            borderRadius: 999,
            padding: '10px 28px',
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: '0.14em',
          }}
        >
          TEST SUCCESS
        </div>
        <h2
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 64,
            fontWeight: 900,
            margin: '32px 0 0',
          }}
        >
          測試成功！
        </h2>
        <p
          style={{
            fontSize: 'var(--osd-size-body)',
            lineHeight: 1.6,
            color: MUTED,
            margin: '24px 0 0',
          }}
        >
          請重整開發伺服器，
          <br />
          即可在首頁看見此直式測試卡片。
        </p>
      </div>
    </div>
  </Shell>
);

export const meta: SlideMeta = {
  title: 'IG 直式測試圖文',
  theme: 'starter',
  createdAt: '2026-07-14T06:27:00.000Z',
};

export default [Hook, Describe, Cta] satisfies Page[];
