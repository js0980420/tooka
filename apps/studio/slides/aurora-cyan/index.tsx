import {
  type DesignSystem,
  type Page,
  type PngExportVariant,
  type SlideMeta,
  usePngExportVariant,
  useSlidePageNumber,
} from '@tooka/core';
import type { ReactNode } from 'react';

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
  { id: 'original', label: '下載IG直式', fileSuffix: 'original', previewLabel: 'IG直式' },
  {
    id: 'ig',
    label: '下載正方',
    fileSuffix: 'ig',
    previewLabel: '正方',
    crop: { width: 1080, height: 1080 },
  },
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
    tooka
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
        在這裡輸入引人矚目的主標題
        <br />
        <span style={{ color: 'var(--osd-accent)' }}>通常為兩行，下方為重點強調</span>
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
        輸入一句吸引讀者往右滑動的副標題文案 →
      </p>
      <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
        <TagPill>標籤名稱一</TagPill>
        <TagPill>標籤名稱二</TagPill>
        <TagPill>標籤名稱三</TagPill>
      </div>
    </div>
  </Shell>
);

const Pain: Page = () => (
  <Shell>
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 44,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--osd-accent)',
          }}
        >
          分欄標題 · SECTION TITLE
        </div>
        <h2
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 64,
            lineHeight: 1.25,
            fontWeight: 900,
            margin: '16px 0 0',
          }}
        >
          輸入這頁的副標題，<span style={{ color: 'var(--osd-accent)' }}>強調你的痛點論述</span>
        </h2>
      </div>
      <Point n="1" title="痛點論點一" sub="詳細描述第一個痛點的情境，讓讀者感同身受。" />
      <Point n="2" title="痛點論點二" sub="詳細描述第二個痛點的情境，指出其不便之處。" />
      <Point n="3" title="痛點論點三" sub="詳細描述第三個痛點的情境，說明其帶來的影響。" />
    </div>
  </Shell>
);

const Turning: Page = () => (
  <Shell>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div
        style={{
          fontSize: 25,
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: 'var(--osd-accent)',
        }}
      >
        引人深思的金句 · THE QUOTE
      </div>
      <h1
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 84,
          lineHeight: 1.28,
          letterSpacing: '-0.01em',
          fontWeight: 900,
          margin: '32px 0 0',
        }}
      >
        「在這裡輸入一句有說服力的金句，
        <br />
        或者是一段令人深思的
        <span style={{ color: 'var(--osd-accent)' }}>核心觀點</span>。」
      </h1>
      <p
        style={{
          fontSize: 'var(--osd-size-body)',
          lineHeight: 1.6,
          color: MUTED,
          fontWeight: 500,
          margin: '40px 0 0',
        }}
      >
        在這裡放一段簡短的轉折描述，
        <br />
        引導讀者到下一頁了解你的解決方案。
      </p>
    </div>
  </Shell>
);

const Solution: Page = () => (
  <Shell>
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 44,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--osd-accent)',
          }}
        >
          為讀者提供的方案 · THE SOLUTION
        </div>
        <h2
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 64,
            lineHeight: 1.25,
            fontWeight: 900,
            margin: '16px 0 0',
          }}
        >
          在此輸入你的解決方案，
          <span style={{ color: 'var(--osd-accent)' }}>或是你提供的實用核心特色</span>
        </h2>
      </div>
      <Point n="1" title="解決方案一" sub="詳細描述第一項解決方案是如何改善現有的痛點。" />
      <Point n="2" title="解決方案二" sub="詳細描述第二項解決方案是如何改善現有的痛點。" />
      <Point n="3" title="解決方案三" sub="詳細描述第三項解決方案是如何改善現有的痛點。" />
    </div>
  </Shell>
);

const BuildApi: Page = () => (
  <Shell>
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 44,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--osd-accent)',
          }}
        >
          我做了哪些 · BUILD 01
        </div>
        <h2
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 64,
            lineHeight: 1.25,
            fontWeight: 900,
            margin: '16px 0 0',
          }}
        >
          把Meta API<span style={{ color: 'var(--osd-accent)' }}>{''}</span>
          {'的'}
          <span style={{ color: '#64ffda' }}>繁瑣步驟簡化</span>
        </h2>
      </div>
      <Point n="1" title="自動幫你建立環境變數" sub="Connects 頁貼上 token，自動驗證寫入 .env" />
      <Point
        n="2"
        title="Token 自動續期"
        sub="發文前先檢查， 10 天內自動刷新，不用手動延長長期權杖"
      />
      <Point n="3" title="權限先幫你驗" sub="FB 粉專 Token 自動推導，發文權限先檢查" />
    </div>
  </Shell>
);

const BuildCrisis: Page = () => (
  <Shell>
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 44,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--osd-accent)',
          }}
        >
          我做了哪些 · BUILD 02
        </div>
        <h2
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 64,
            lineHeight: 1.25,
            fontWeight: 900,
            margin: '16px 0 0',
          }}
        >
          圖片自動發文不能直接發，要先存在公開網址
          <span style={{ color: 'var(--osd-accent)' }}>{''}</span>
        </h2>
      </div>
      <Point
        n="1"
        title="測試一堆工具都上傳失敗，或是太麻煩"
        sub="不是要綁定信用卡，就是步驟很多"
      />
      <Point n="2" title="FB 改二進位直傳" sub="PNG 直接上傳 Meta 伺服器，零外部依賴" />
      <Point n="3" title="IG / Threads 靠 imgbb" sub="一組免費 API key，公開圖床穩定供圖" />
    </div>
  </Shell>
);

const BuildSprint: Page = () => (
  <Shell>
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 44,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--osd-accent)',
          }}
        >
          我做了哪些 · BUILD 03
        </div>
        <h2
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 64,
            lineHeight: 1.25,
            fontWeight: 900,
            margin: '16px 0 0',
          }}
        >
          一天 <span style={{ color: 'var(--osd-accent)' }}>29 個 commit</span> 的衝刺
        </h2>
      </div>
      <Point n="1" title="Publish 發文中心" sub="各平台獨立文案，共用文案一鍵同步" />
      <Point n="2" title="怕 IG 把字裁掉？" sub="雙尺寸匯出內建安全區，4:5 與 1:1 都完整入鏡" />
      <Point n="3" title="自動發文API申請失敗？" sub="我把流程整個簡化，少掉一些麻煩步驟" />
    </div>
  </Shell>
);

const Why: Page = () => (
  <Shell>
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 44,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--osd-accent)',
          }}
        >
          為什麼這樣做 · THE WHY
        </div>
        <h2
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 64,
            lineHeight: 1.25,
            fontWeight: 900,
            margin: '16px 0 0',
          }}
        >
          為什麼堅持<span style={{ color: 'var(--osd-accent)' }}>用程式寫圖卡</span>？
        </h2>
      </div>
      <Point n="1" title="視覺風格永遠一致" sub="設計系統鎖定色彩與字型，每張卡都是同一個品牌" />
      <Point n="2" title="排版不用手動對齊" sub="版式寫在元件裡，換文案自動排好不跑版" />
      <Point n="3" title="一條龍作圖全流程" sub="從文案到整組圖卡打包下載、直接發布，一站完成" />
    </div>
  </Shell>
);

const Teaser: Page = () => (
  <Shell>
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 44,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--osd-accent)',
          }}
        >
          下一步 · COMING NEXT
        </div>
        <h2
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 64,
            lineHeight: 1.25,
            fontWeight: 900,
            margin: '16px 0 0',
          }}
        >
          想要<span style={{ color: 'var(--osd-accent)' }}>保姆級教學</span>嗎？
        </h2>
      </div>
      <Point n="1" title="Meta API 串接全教學" sub="從開發者後台到第一篇自動發文" />
      <Point n="2" title="圖卡模板設計心法" sub="1080×1350 安全區與版式系統拆解" />
      <Point n="3" title="排程自動發文" sub="寫好文案，時間到自己發（開發中）" />
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
          行動呼籲
        </div>
        <h2
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 64,
            fontWeight: 900,
            margin: '32px 0 0',
          }}
        >
          輸入吸引人的互動主題，
          <br />
          引導讀者留下特定關鍵字
        </h2>
        <p
          style={{
            fontSize: 'var(--osd-size-body)',
            lineHeight: 1.6,
            color: MUTED,
            margin: '24px 0 0',
          }}
        >
          例如：底下留言「關鍵字」，
          <br />
          我會將完整的學習指南或工具連結自動傳送給您！
        </p>
      </div>
    </div>
  </Shell>
);

export const meta: SlideMeta = {
  title: '極光青・科技暗黑',
  theme: 'starter',
  createdAt: '2026-07-14T10:27:43.264Z',
  template: true,
};

export default [Hook, Pain, Turning, Solution, Cta] satisfies Page[];
