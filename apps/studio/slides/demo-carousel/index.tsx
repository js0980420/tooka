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
  palette: { bg: '#F4F7FC', text: '#12224D', accent: '#2B5CE6' },
  fonts: {
    display: "'Noto Sans TC', system-ui, sans-serif",
    body: "'Noto Sans TC', system-ui, sans-serif",
  },
  typeScale: { hero: 100, body: 38 },
  radius: 24,
};

const MUTED = '#5E7392';
const PANEL_BORDER = '#B9CDF0';
const SOFT_BLUE = '#DCE8F9';
const SOFT_BLUE_2 = '#E9F0FB';
const EDGE_INSET_X = 72;
const EDGE_INSET_Y = 60;
const IG_SAFE_EDGE_INSET_X = 144;
const IG_SAFE_EDGE_INSET_Y = 220;
const IG_CONTENT_SCALE = 0.84;

export const pngExportVariants = [
  { id: 'ig', label: '下載正方尺寸', fileSuffix: 'ig', previewLabel: '正方尺寸' },
  { id: 'original', label: '下載長方尺寸', fileSuffix: 'original', previewLabel: '長方尺寸' },
] satisfies PngExportVariant[];

const usesSquareSafeLayout = () =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('safe') === 'square';

const useSquareSafeLayout = () => {
  const exportVariant = usePngExportVariant();
  return exportVariant ? exportVariant === 'ig' : usesSquareSafeLayout();
};

const DotGrid = ({ style }: { style?: CSSProperties }) => (
  <div
    style={{
      position: 'absolute',
      width: 150,
      height: 108,
      backgroundImage: 'radial-gradient(circle, #6E93E4 3.5px, transparent 4px)',
      backgroundSize: '24px 24px',
      opacity: 0.55,
      ...style,
    }}
  />
);

const Circuit = ({ style, flip = false }: { style?: CSSProperties; flip?: boolean }) => (
  <svg
    width="380"
    height="160"
    viewBox="0 0 380 160"
    fill="none"
    aria-hidden
    style={{ position: 'absolute', transform: flip ? 'scaleX(-1)' : undefined, ...style }}
  >
    <path d="M10 130 H130 L170 86 H260 L292 52 H370" stroke="#7DA0E8" strokeWidth="3" />
    <path d="M46 150 H190 L232 106 H344" stroke="#AFC7F1" strokeWidth="3" />
    <circle cx="10" cy="130" r="8" fill="#2B5CE6" />
    <circle cx="370" cy="52" r="6" fill="#7DA0E8" />
    <circle cx="344" cy="106" r="6" fill="#AFC7F1" />
  </svg>
);

const Decor = () => (
  <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    <div
      style={{
        position: 'absolute',
        top: -240,
        right: -190,
        width: 580,
        height: 580,
        borderRadius: '50%',
        background: SOFT_BLUE,
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: 260,
        right: -130,
        width: 280,
        height: 280,
        borderRadius: '50%',
        background: SOFT_BLUE_2,
      }}
    />
    <div
      style={{
        position: 'absolute',
        bottom: -280,
        left: -220,
        width: 660,
        height: 660,
        borderRadius: '50%',
        background: SOFT_BLUE,
      }}
    />
    <div
      style={{
        position: 'absolute',
        bottom: -160,
        left: 280,
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: SOFT_BLUE_2,
      }}
    />
    <DotGrid style={{ top: 150, right: 100 }} />
    <DotGrid style={{ top: 480, left: 36, opacity: 0.3 }} />
    <Circuit style={{ top: 36, right: -20 }} />
    <Circuit style={{ bottom: 96, left: -20 }} flip />
  </div>
);

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
      background: '#FFFFFF',
      fontSize: 26,
      fontWeight: 700,
    }}
  >
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" fill="#2B5CE6" />
      <path
        d="M4.5 20c0-3.2 3.4-4.8 7.5-4.8s7.5 1.6 7.5 4.8"
        stroke="#2B5CE6"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
    @alex_wang.ai
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
        background: '#12224D',
        color: '#FFFFFF',
        borderRadius: 20,
        padding: '10px 28px',
        fontSize: 30,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
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
      <Decor />
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
      background: '#FFFFFF',
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

const Point = ({
  n,
  title,
  sub,
  compact = false,
}: {
  n: string;
  title: string;
  sub: string;
  compact?: boolean;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 30,
      background: '#FFFFFF',
      border: `2.5px solid ${PANEL_BORDER}`,
      borderRadius: 28,
      padding: compact ? '26px 36px' : '34px 40px',
    }}
  >
    <div
      style={{
        width: 76,
        height: 76,
        borderRadius: '50%',
        background: 'var(--osd-accent)',
        color: '#FFFFFF',
        display: 'grid',
        placeItems: 'center',
        fontSize: 40,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {n}
    </div>
    <div style={{ width: 3, alignSelf: 'stretch', background: '#CFDDF5', borderRadius: 2 }} />
    <div>
      <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.25 }}>{title}</div>
      <div style={{ fontSize: 31, color: MUTED, marginTop: 8 }}>{sub}</div>
    </div>
  </div>
);

const Hook: Page = () => (
  <Shell style={{ lineHeight: '2' }}>
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
        我開發了一個
        <br />
        <span style={{ color: 'var(--osd-accent)' }}>開源圖文卡片工具</span>
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
        {''}

        <span
          style={{
            fontSize: '51px',
            color: 'var(--osd-accent)',
            fontWeight: 700,
            display: 'block',
            marginTop: 16,
          }}
        >
          這篇輪播圖就是用這個工具做的
        </span>
      </p>
      <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
        <TagPill style={{ fontSize: '22px' }}>Canva式拖曳</TagPill>
        <TagPill>防IG裁切</TagPill>
        <TagPill>固定視覺風格</TagPill>
      </div>
    </div>
  </Shell>
);

const Describe: Page = () => {
  const compact = useSquareSafeLayout();
  return (
    <Shell>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: compact ? 30 : 40,
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
            {''}
            <span style={{ color: 'var(--osd-accent)' }}>解決AI生圖隨機性太高、容易跑版痛點</span>
          </h2>
          <p style={{ fontSize: 36, lineHeight: 1.5, color: MUTED, margin: '20px 0 0' }}>
            AI 排好版面之後，剩下的手感自己補。
          </p>
        </div>
        <Point
          n="1"
          title="元素可自由拖曳，像 Canva 一樣"
          sub="直接拖動元素，微調位置與留白"
          compact={compact}
        />
        <Point
          n="2"
          title="防IG裁切，提供有安全區域的版本"
          sub="提供IG尺寸，上下左右都會適度留白"
          compact={compact}
        />
        <Point
          n="3"
          title="固定視覺風格，維持品牌一致性"
          sub="固定每次生圖的視覺風格，保持品牌一致性"
          compact={compact}
        />
      </div>
    </Shell>
  );
};

const Refine: Page = () => (
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
          用自然語言<span style={{ color: 'var(--osd-accent)' }}>修圖</span>
        </h2>
        <p style={{ fontSize: 36, lineHeight: 1.5, color: MUTED, margin: '20px 0 0' }}>
          不只拖曳，開口說就能改。
        </p>
      </div>
      <Point n="1" title="整張卡下提示詞" sub="一句話調整整體版面與風格" />
      <Point n="2" title="選取元素再下提示詞" sub="只針對選中的區塊，精準修改" />
    </div>
  </Shell>
);

const ExportMode = ({
  label,
  inset,
  body,
  accent = false,
}: {
  label: string;
  inset: string;
  body: string;
  accent?: boolean;
}) => (
  <div
    style={{
      background: '#FFFFFF',
      border: `2.5px solid ${accent ? 'var(--osd-accent)' : PANEL_BORDER}`,
      borderRadius: 26,
      padding: '28px 34px',
      boxShadow: accent ? '0 14px 34px rgba(43, 92, 230, 0.1)' : undefined,
    }}
  >
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}
    >
      <div
        style={{ fontSize: 34, fontWeight: 900, color: accent ? 'var(--osd-accent)' : undefined }}
      >
        {label}
      </div>
      <div
        style={{
          borderRadius: 999,
          padding: '8px 18px',
          background: accent ? 'var(--osd-accent)' : SOFT_BLUE_2,
          color: accent ? '#FFFFFF' : 'var(--osd-text)',
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        1080 × 1350
      </div>
    </div>
    <div style={{ fontSize: 30, fontWeight: 800, marginTop: 16 }}>{inset}</div>
    <div style={{ fontSize: 25, lineHeight: 1.45, color: MUTED, marginTop: 8 }}>{body}</div>
  </div>
);

const Export: Page = () => (
  <Shell>
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 22,
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 62,
            lineHeight: 1.2,
            fontWeight: 900,
            margin: 0,
          }}
        >
          下載時，<span style={{ color: 'var(--osd-accent)' }}>選對版型</span>
        </h2>
        <p style={{ fontSize: 29, lineHeight: 1.45, color: MUTED, margin: '14px 0 0' }}>
          兩種都是 4:5，差別在重要資訊的安全距離。
        </p>
      </div>
      <ExportMode
        label="正方尺寸"
        inset="左右至少 144px、上下 220px"
        body="整體內容往中央收，預留 IG 裁切與預覽介面的四邊安全區。"
        accent
      />
      <ExportMode
        label="長方尺寸"
        inset="左右 72px、上下 60px"
        body="完整利用 4:5 畫面，適合官網、簡報與其他不裁切的發布位置。"
      />
      <div
        style={{
          borderLeft: '6px solid var(--osd-accent)',
          padding: '4px 0 4px 20px',
          fontSize: 25,
          lineHeight: 1.45,
          fontWeight: 700,
          color: 'var(--osd-text)',
        }}
      >
        為什麼？4:5 置中裁成正方形時，上下各會少 135px。
      </div>
    </div>
  </Shell>
);

const Cta: Page = () => (
  <Shell>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          width: '100%',
          background: '#FFFFFF',
          border: `2.5px solid ${PANEL_BORDER}`,
          borderRadius: 32,
          padding: '80px 64px',
          textAlign: 'center',
          boxShadow: '0 24px 60px rgba(43, 92, 230, 0.1)',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: 'var(--osd-accent)',
            color: '#FFFFFF',
            borderRadius: 999,
            padding: '10px 28px',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '0.14em',
          }}
        >
          GET LINK
        </div>
        <h2
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 64,
            fontWeight: 900,
            margin: '32px 0 0',
          }}
        >
          底下留言圖文卡片
        </h2>
        <p
          style={{
            fontSize: 'var(--osd-size-body)',
            lineHeight: 1.6,
            color: MUTED,
            margin: '24px 0 0',
          }}
        >
          我把工具連結傳給你
        </p>
      </div>
    </div>
  </Shell>
);

export const meta: SlideMeta = {
  title: 'open-cards 是什麼',
  theme: 'starter',
  createdAt: '2026-07-13T08:03:57.683Z',
};

export default [Hook, Describe, Refine, Export, Cta] satisfies Page[];
