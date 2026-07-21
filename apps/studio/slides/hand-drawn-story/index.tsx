import type { DesignSystem, Page, PngExportVariant, SlideMeta } from '@tooka/core';
import type { CSSProperties, ReactNode } from 'react';

export const design: DesignSystem = {
  palette: { bg: '#FFFFFF', text: '#242424', accent: '#F2A9A9' },
  fonts: {
    display: "'Iansui', 'Noto Sans TC', system-ui, sans-serif",
    body: "'Iansui', 'Noto Sans TC', system-ui, sans-serif",
  },
  typeScale: { hero: 88, body: 40 },
  radius: 0,
};

const INK = '#242424';
const PINK = '#F2A9A9';
const PEACH = '#F8D8B4';
const BLUE = '#B9CBDD';
const FRAME = '#EBEBEB';
const HANDLE = '@tooka.studio 手繪小語';
const LINE_ID = 'line: tooka';

const FONT_ID = 'hand-drawn-story-font';
if (typeof document !== 'undefined' && !document.getElementById(FONT_ID)) {
  const link = document.createElement('link');
  link.id = FONT_ID;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Iansui&display=swap';
  document.head.appendChild(link);
}

export const pngExportVariants = [
  { id: 'original', label: '下載 IG 直式', fileSuffix: 'original', previewLabel: 'IG 直式' },
  {
    id: 'ig',
    label: '下載 IG 正方',
    fileSuffix: 'ig',
    previewLabel: 'IG 正方',
    crop: { width: 1080, height: 1080 },
  },
] satisfies PngExportVariant[];

const stroke = {
  stroke: INK,
  strokeWidth: 6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
} as const;

const Shell = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      background: 'var(--osd-bg)',
      color: 'var(--osd-text)',
      fontFamily: 'var(--osd-font-body)',
      boxShadow: `inset 0 0 0 3px ${FRAME}`,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      padding: '168px 90px 150px',
    }}
  >
    {children}
    <div
      style={{
        position: 'absolute',
        right: 90,
        bottom: 150,
        textAlign: 'right',
        fontSize: 26,
        lineHeight: 1.5,
        color: '#4A4A4A',
      }}
    >
      {HANDLE}
      <br />
      {LINE_ID}
    </div>
  </div>
);

const Quote = ({ size = 88, children }: { size?: number; children: ReactNode }) => (
  <h2
    style={{
      fontFamily: 'var(--osd-font-display)',
      fontSize: size,
      fontWeight: 400,
      lineHeight: 1.55,
      letterSpacing: '0.04em',
      margin: 0,
    }}
  >
    {children}
  </h2>
);

const Art = ({ width, children }: { width: number; children: ReactNode }) => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 40,
    }}
  >
    <div style={{ width }}>{children}</div>
  </div>
);

const Heart = ({
  x,
  y,
  size,
  fill = PINK,
}: {
  x: number;
  y: number;
  size: number;
  fill?: string;
}) => (
  <path
    transform={`translate(${x} ${y}) scale(${size / 100})`}
    d="M50 82 C20 58 8 40 10 26 C12 12 24 6 34 10 C42 13 47 20 50 26 C53 20 58 13 66 10 C76 6 88 12 90 26 C92 40 80 58 50 82 Z"
    {...stroke}
    fill={fill}
  />
);

const Cloud = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 40 Q4 16 30 18 Q38 -6 66 2 Q92 -4 96 20 Q120 22 112 40"
    {...stroke}
  />
);

const Sparkle = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} {...stroke} strokeWidth={5}>
    <path d="M0 -14 L0 14" />
    <path d="M-14 0 L14 0" />
  </g>
);

const Blush = ({ x, y }: { x: number; y: number }) => (
  <g fill={PINK} opacity={0.75}>
    <ellipse cx={x} cy={y} rx={11} ry={7} />
  </g>
);

const SeaGazer = () => (
  <svg viewBox="0 0 640 460" role="img" aria-label="小人坐在海邊看夕陽">
    <Cloud x={36} y={70} />
    <Cloud x={490} y={48} s={0.8} />
    <path d="M270 60 Q282 46 294 60" {...stroke} strokeWidth={5} />
    <path d="M318 44 Q330 30 342 44" {...stroke} strokeWidth={5} />
    <circle cx={170} cy={240} r={82} fill={PEACH} />
    <path
      d="M12 246 Q52 256 92 246 T172 246 T252 246 T332 246 T412 246"
      {...stroke}
      stroke={BLUE}
    />
    <path
      d="M40 296 Q75 306 110 296 T180 296 T250 296 T320 296"
      {...stroke}
      stroke={BLUE}
      strokeWidth={5}
    />
    <path
      d="M90 348 Q120 356 150 348 T210 348 T270 348"
      {...stroke}
      stroke={BLUE}
      strokeWidth={5}
    />
    <path d="M120 272 Q170 282 220 272" {...stroke} stroke={PEACH} strokeWidth={5} />
    <path d="M140 320 Q170 328 200 320" {...stroke} stroke={PEACH} strokeWidth={5} />
    <circle cx={470} cy={216} r={62} {...stroke} fill="#FFFFFF" />
    <circle cx={516} cy={168} r={22} {...stroke} fill="#FFFFFF" />
    <path
      d="M420 266 Q396 330 402 412 L548 412 Q554 330 526 266 Q472 242 420 266"
      {...stroke}
      fill="#FFFFFF"
    />
  </svg>
);

const HeartShower = () => (
  <svg viewBox="0 0 640 460" role="img" aria-label="小人高舉大愛心">
    <Sparkle x={150} y={110} />
    <Sparkle x={480} y={90} s={0.8} />
    <Sparkle x={520} y={210} s={0.7} />
    <Heart x={250} y={40} size={150} />
    <circle cx={320} cy={280} r={54} {...stroke} fill="#FFFFFF" />
    <circle cx={362} cy={238} r={18} {...stroke} fill="#FFFFFF" />
    <path d="M300 268 Q306 260 312 268" {...stroke} strokeWidth={5} />
    <path d="M332 268 Q338 260 344 268" {...stroke} strokeWidth={5} />
    <path d="M308 296 Q320 304 332 296" {...stroke} strokeWidth={5} />
    <Blush x={292} y={288} />
    <Blush x={348} y={288} />
    <path
      d="M284 328 Q262 366 268 420 L372 420 Q378 366 356 328 Q320 312 284 328"
      {...stroke}
      fill="#FFFFFF"
    />
    <path d="M284 336 Q244 300 262 232" {...stroke} />
    <path d="M356 336 Q396 300 378 232" {...stroke} />
  </svg>
);

const HeavyHeart = () => (
  <svg viewBox="0 0 640 460" role="img" aria-label="小人吃力地舉著沉重的大愛心">
    <Heart x={216} y={16} size={212} />
    <path d="M180 60 Q168 72 178 84" {...stroke} strokeWidth={5} />
    <path d="M452 56 Q464 68 454 80" {...stroke} strokeWidth={5} />
    <circle cx={320} cy={286} r={50} {...stroke} fill="#FFFFFF" />
    <circle cx={282} cy={250} r={17} {...stroke} fill="#FFFFFF" />
    <path d="M300 280 Q306 286 312 280" {...stroke} strokeWidth={5} />
    <path d="M334 280 Q340 286 346 280" {...stroke} strokeWidth={5} />
    <path d="M312 308 L334 308" {...stroke} strokeWidth={5} />
    <Blush x={292} y={300} />
    <path d="M380 244 Q392 250 394 264" {...stroke} stroke={BLUE} strokeWidth={5} />
    <path
      d="M286 330 Q262 366 268 434 L376 434 Q382 366 358 330 Q322 314 286 330"
      {...stroke}
      fill="#FFFFFF"
    />
    <path d="M288 340 Q252 300 264 212" {...stroke} />
    <path d="M354 340 Q392 300 380 212" {...stroke} />
  </svg>
);

const TeaTogether = () => (
  <svg viewBox="0 0 640 460" role="img" aria-label="兩個小人喝茶,中間有小愛心">
    <circle cx={360} cy={230} r={130} fill="#FBEEDF" opacity={0.6} />
    <Heart x={296} y={130} size={64} />
    <circle cx={180} cy={180} r={52} {...stroke} fill="#FFFFFF" />
    <circle cx={142} cy={140} r={18} {...stroke} fill="#FFFFFF" />
    <path d="M162 172 Q168 164 174 172" {...stroke} strokeWidth={5} />
    <path d="M194 172 Q200 164 206 172" {...stroke} strokeWidth={5} />
    <path d="M172 200 Q182 208 192 200" {...stroke} strokeWidth={5} />
    <Blush x={154} y={192} />
    <path
      d="M148 226 Q120 280 128 400 L240 400 Q248 280 220 226 Q184 208 148 226"
      {...stroke}
      fill="#FFFFFF"
    />
    <rect x={196} y={310} width={68} height={58} rx={12} {...stroke} fill="#C6D4E4" />
    <path d="M264 322 Q290 328 268 356" {...stroke} />
    <circle cx={480} cy={180} r={52} {...stroke} fill="#FFFFFF" />
    <path d="M432 164 Q448 122 500 130 Q524 138 528 164" {...stroke} />
    <path d="M456 172 Q462 164 468 172" {...stroke} strokeWidth={5} />
    <path d="M488 172 Q494 164 500 172" {...stroke} strokeWidth={5} />
    <path d="M466 200 Q476 208 486 200" {...stroke} strokeWidth={5} />
    <Blush x={448} y={192} />
    <path
      d="M448 226 Q420 280 428 400 L540 400 Q548 280 520 226 Q484 208 448 226"
      {...stroke}
      fill="#FFFFFF"
    />
    <rect x={392} y={310} width={68} height={58} rx={12} {...stroke} fill="#EFC2BC" />
    <path d="M392 322 Q366 328 388 356" {...stroke} />
    <path d="M110 400 L560 400" {...stroke} strokeWidth={5} />
  </svg>
);

const HeartHug = () => (
  <svg viewBox="0 0 640 460" role="img" aria-label="小人抱著愛心微笑">
    <Sparkle x={170} y={120} s={0.8} />
    <Sparkle x={470} y={100} />
    <Sparkle x={500} y={260} s={0.7} />
    <circle cx={320} cy={190} r={56} {...stroke} fill="#FFFFFF" />
    <circle cx={276} cy={150} r={18} {...stroke} fill="#FFFFFF" />
    <path d="M298 182 Q306 174 314 182" {...stroke} strokeWidth={5} />
    <path d="M334 182 Q342 174 350 182" {...stroke} strokeWidth={5} />
    <path d="M310 210 Q322 220 334 210" {...stroke} strokeWidth={5} />
    <Blush x={290} y={202} />
    <Blush x={352} y={202} />
    <path
      d="M286 240 Q256 292 264 420 L380 420 Q388 292 358 240 Q322 222 286 240"
      {...stroke}
      fill="#FFFFFF"
    />
    <Heart x={272} y={266} size={100} />
    <path d="M282 300 Q302 330 326 336" {...stroke} />
    <path d="M362 300 Q346 330 326 336" {...stroke} />
  </svg>
);

const HeartBalloon = () => (
  <svg viewBox="0 0 640 460" role="img" aria-label="小人牽著愛心氣球揮手">
    <Cloud x={80} y={70} s={0.9} />
    <Sparkle x={500} y={140} s={0.8} />
    <Heart x={360} y={30} size={130} />
    <path d="M424 152 Q414 220 400 300" {...stroke} strokeWidth={5} />
    <circle cx={300} cy={280} r={52} {...stroke} fill="#FFFFFF" />
    <circle cx={340} cy={240} r={18} {...stroke} fill="#FFFFFF" />
    <path d="M280 272 Q286 264 292 272" {...stroke} strokeWidth={5} />
    <path d="M312 272 Q318 264 324 272" {...stroke} strokeWidth={5} />
    <path d="M288 300 Q300 308 312 300" {...stroke} strokeWidth={5} />
    <Blush x={272} y={292} />
    <path
      d="M266 328 Q244 366 250 430 L354 430 Q360 366 338 328 Q302 312 266 328"
      {...stroke}
      fill="#FFFFFF"
    />
    <path d="M336 336 Q374 316 398 300" {...stroke} />
    <path d="M266 336 Q230 314 224 280" {...stroke} />
  </svg>
);

const Hook: Page = () => (
  <Shell>
    <Quote>
      觸動人心的標題，
      <br />
      在這裡最多輸入兩行字。
    </Quote>
    <Art width={860}>
      <SeaGazer />
    </Art>
  </Shell>
);

const Beginning: Page = () => (
  <Shell>
    <Quote size={76}>
      第一步的引導，
      <br />
      描述你遇到的第一個狀態，
      <br />
      或者是一項起點陳述。
    </Quote>
    <Art width={800}>
      <HeartShower />
    </Art>
  </Shell>
);

const Weight: Page = () => (
  <Shell>
    <Quote size={76}>
      第二步的轉折，
      <br />
      指出讀者面臨的痛點情境，
      <br />
      或者遇到的瓶頸。
    </Quote>
    <Art width={800}>
      <HeavyHeart />
    </Art>
  </Shell>
);

const Ease: Page = () => (
  <Shell>
    <Quote size={76}>
      第三步的發展，
      <br />
      引出豁然開朗的思維，
      <br />
      或者實質的解決方式。
    </Quote>
    <Art width={820}>
      <TeaTogether />
    </Art>
  </Shell>
);

const BeYourself: Page = () => (
  <Shell>
    <Quote>
      最後的核心結語，
      <br />
      給讀者最溫暖的一句核心提醒。
    </Quote>
    <Art width={800}>
      <HeartHug />
    </Art>
  </Shell>
);

const Cta: Page = () => (
  <Shell>
    <Quote size={76}>
      最後一頁的呼籲行動
      <br />
      （Call to Action）
    </Quote>
    <p
      style={{
        fontSize: 'var(--osd-size-body)',
        lineHeight: 1.6,
        letterSpacing: '0.04em',
        color: '#4A4A4A',
        margin: '36px 0 0',
      }}
    >
      收藏這篇圖卡並分享給需要的朋友。
      <br />
      追蹤帳號 @your.account，獲取更多風格資訊。
    </p>
    <Art width={700}>
      <HeartBalloon />
    </Art>
  </Shell>
);

export const meta: SlideMeta = {
  title: '溫潤粉・手繪線稿',
  createdAt: '2026-07-15T02:30:23.198Z',
  template: true,
};

export default [Hook, Beginning, Weight, Ease, BeYourself, Cta] satisfies Page[];
