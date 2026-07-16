import type { DesignSystem, Page, SlideMeta } from '@tooka/core';
import presenterPortrait from './assets/presenter-cutout.png';

export const design: DesignSystem = {
  palette: { bg: '#EEF5FF', text: '#080A0D', accent: '#1478F2' },
  fonts: {
    display: "'Noto Sans TC', 'PingFang TC', sans-serif",
    body: "'Noto Sans TC', 'PingFang TC', sans-serif",
  },
  typeScale: { hero: 174, body: 40 },
  radius: 42,
};

const BLUE = '#1478F2';
const YELLOW = '#FFE000';

const DotGrid = ({ left, top }: { left: number; top: number }) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width: 132,
      height: 74,
      opacity: 0.9,
      backgroundImage: 'radial-gradient(circle, var(--osd-accent) 0 4px, transparent 5px)',
      backgroundSize: '23px 23px',
    }}
  />
);

const Circuit = ({ left, top, width }: { left: number; top: number; width: number }) => (
  <svg
    aria-hidden
    width={width}
    height="150"
    viewBox="0 0 520 150"
    fill="none"
    style={{ position: 'absolute', left, top, opacity: 0.42 }}
  >
    <path d="M8 113h91l38-38h88l36-36h139" stroke="#4B98F6" strokeWidth="3" />
    <path d="M62 137h83l33-33h145l35-35h149" stroke="#7CB5FA" strokeWidth="2" />
    <path d="M164 22h86l26 26h99l25 25h105" stroke="#3B8EF4" strokeWidth="2" />
    <circle cx="8" cy="113" r="7" fill="#4B98F6" />
    <circle cx="400" cy="39" r="7" fill="#4B98F6" />
    <circle cx="505" cy="73" r="7" fill="#7CB5FA" />
  </svg>
);

const LogoRow = () => (
  <div
    style={{
      position: 'absolute',
      left: 130,
      top: 72,
      display: 'flex',
      alignItems: 'center',
      gap: 48,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg
        width="104"
        height="104"
        viewBox="0 0 104 104"
        aria-label="Git 標誌"
        style={{ filter: 'drop-shadow(0 10px 12px rgba(240, 51, 22, 0.24))' }}
      >
        <rect
          x="15"
          y="15"
          width="74"
          height="74"
          rx="9"
          transform="rotate(45 52 52)"
          fill="#F4511E"
        />
        <path
          d="M34 35l36 36M46 47l18-1M64 46l1 19"
          fill="none"
          stroke="#fff"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="34" cy="35" r="7" fill="#fff" />
        <circle cx="46" cy="47" r="7" fill="#fff" />
        <circle cx="65" cy="65" r="7" fill="#fff" />
      </svg>
      <span
        style={{
          color: '#F04424',
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 88,
          fontWeight: 800,
          lineHeight: 1,
          textShadow: '0 5px 8px rgba(240, 68, 36, 0.18)',
        }}
      >
        git
      </span>
    </div>
    <svg
      width="108"
      height="108"
      viewBox="0 0 24 24"
      aria-label="GitHub 標誌"
      style={{ filter: 'drop-shadow(0 10px 12px rgba(0, 0, 0, 0.16))' }}
    >
      <path
        fill="#0B0D10"
        d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.41-1.27.74-1.56-2.57-.29-5.27-1.28-5.27-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.98 10.98 0 0 1 5.75 0c2.19-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.17c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7Z"
      />
    </svg>
  </div>
);

const Headline = () => (
  <div
    style={{
      position: 'absolute',
      left: 96,
      top: 278,
      width: 1120,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 12,
      fontFamily: 'var(--osd-font-display)',
      fontWeight: 950,
      letterSpacing: '-0.055em',
      lineHeight: 0.96,
    }}
  >
    <span
      style={{
        padding: '4px 22px 14px',
        color: '#FFFFFF',
        WebkitTextStroke: '16px #080A0D',
        paintOrder: 'stroke fill',
        fontSize: 140,
        filter: 'drop-shadow(0 9px 7px rgba(20, 120, 242, 0.35))',
      }}
    >
      開源工具：
    </span>
    <span
      style={{
        padding: '8px 22px 18px',
        color: YELLOW,
        WebkitTextStroke: '18px #080A0D',
        paintOrder: 'stroke fill',
        fontSize: 174,
        filter: 'drop-shadow(0 10px 8px rgba(20, 120, 242, 0.38))',
      }}
    >
      AI 生圖模板
    </span>
    <span
      style={{
        padding: '4px 22px 14px',
        color: '#FFFFFF',
        WebkitTextStroke: '16px #080A0D',
        paintOrder: 'stroke fill',
        fontSize: 130,
        filter: 'drop-shadow(0 9px 7px rgba(20, 120, 242, 0.35))',
      }}
    >
      工作流程快速展示
    </span>
  </div>
);

const FeatureBar = () => (
  <div
    style={{
      position: 'absolute',
      left: 76,
      bottom: 62,
      width: 1150,
      height: 118,
      display: 'flex',
      alignItems: 'center',
      gap: 28,
      padding: '0 54px',
      border: '4px solid #2AA5FF',
      borderRadius: 999,
      background: 'linear-gradient(180deg, #083D72 0%, #001D3C 100%)',
      color: '#FFFFFF',
      boxShadow: '0 12px 26px rgba(0, 73, 144, 0.32), inset 0 2px rgba(255,255,255,0.16)',
      fontFamily: 'var(--osd-font-body)',
      fontSize: 40,
      fontWeight: 800,
      letterSpacing: '0.01em',
    }}
  >
    <span
      style={{
        width: 62,
        height: 62,
        display: 'grid',
        placeItems: 'center',
        flex: '0 0 auto',
        border: `6px solid ${BLUE}`,
        borderRadius: '50%',
        color: '#58B5FF',
        fontSize: 38,
        lineHeight: 1,
      }}
    >
      ✓
    </span>
    <span>防跑版、可固定視覺風格、一鍵發布多平台</span>
  </div>
);

const VideoBannerThumbnail: Page = () => (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background:
        'radial-gradient(circle at 54% 42%, rgba(215,232,255,0.92), transparent 28%), linear-gradient(135deg, #F9FBFF 0%, var(--osd-bg) 55%, #D9EBFF 100%)',
      fontFamily: 'var(--osd-font-body)',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: -78,
        top: -72,
        width: 180,
        height: 1250,
        background: BLUE,
        transform: 'rotate(-28deg)',
        boxShadow: '52px 0 0 #68B1FF, 104px 0 0 rgba(20,120,242,0.24)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        right: -95,
        bottom: -180,
        width: 190,
        height: 1120,
        background: BLUE,
        transform: 'rotate(31deg)',
        boxShadow: '-52px 0 0 #68B1FF, -104px 0 0 rgba(20,120,242,0.24)',
      }}
    />
    <DotGrid left={146} top={30} />
    <DotGrid left={1720} top={62} />
    <Circuit left={640} top={52} width={560} />
    <Circuit left={1030} top={285} width={470} />
    <LogoRow />
    <Headline />
    <div
      style={{
        position: 'absolute',
        right: -60,
        bottom: -300,
        width: 900,
        height: 1200,
        background:
          'radial-gradient(ellipse at 50% 40%, rgba(130,185,250,0.55), rgba(20,120,242,0.14) 52%, transparent 72%)',
      }}
    />
    <img
      src={presenterPortrait}
      alt="白色襯衫的講者半身照"
      style={{
        position: 'absolute',
        right: 84,
        bottom: -170,
        width: 640,
        filter: 'drop-shadow(0 30px 46px rgba(8, 42, 86, 0.34))',
      }}
    />
    <FeatureBar />
  </div>
);

export const meta: SlideMeta = {
  title: '科技藍・開源工具影片縮圖',
  createdAt: '2026-07-16T02:30:41.295Z',
  template: true,
  templateCategory: 'video-banner-thumbnail',
  canvas: { width: 1920, height: 1080 },
};

export default [VideoBannerThumbnail] satisfies Page[];
