export type PublishCopyLocale = 'zh-TW' | 'zh-CN' | 'en';

export type CardPageText = {
  page: number;
  text: string;
};

export type CardInsight = {
  hook: CardPageText;
  keyPoints: CardPageText[];
  cta: CardPageText & { generated: boolean };
};

export type PlatformDrafts = {
  facebook: string;
  instagram: string;
  instagramHashtags: string[];
  threads: string;
  threadsTopicTag: string;
};

const CTA_PATTERNS =
  /(?:留言|評論|评论|分享|收藏|儲存|保存|追蹤|关注|關注|私訊|私信|告訴我|告诉我|你會|你会|試試|试试|立即|開始|开始|comment|reply|share|save|follow|message|tell us|tell me|try|start)/i;
const EXTERNAL_LINK_PATTERN =
  /(?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|tw|app|dev|me|ai)(?:\/[^\s]*)?/i;
const EXTERNAL_LINK_GLOBAL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|tw|app|dev|me|ai)(?:\/[^\s]*)?/gi;
const PAGE_NUMBER_PATTERN = /^\s*\d+\s*(?:[/@|｜]\s*\d+)?\s*$/;

const COPY = {
  'zh-TW': {
    facebookIntro: '這組圖卡整理了幾個值得先掌握的重點：',
    instagramCta: '先收藏這組圖卡，也分享給正需要的人。',
    facebookCta: '你最想先試哪一點？歡迎留言分享。',
    threadsCta: '你最有感的是哪一點？',
    fallbackTags: ['內容創作', '社群經營', '實用分享', '圖卡整理', '知識分享'],
  },
  'zh-CN': {
    facebookIntro: '这组图卡整理了几个值得先掌握的重点：',
    instagramCta: '先收藏这组图卡，也分享给正需要的人。',
    facebookCta: '你最想先试哪一点？欢迎留言分享。',
    threadsCta: '你最有感的是哪一点？',
    fallbackTags: ['内容创作', '社群运营', '实用分享', '图卡整理', '知识分享'],
  },
  en: {
    facebookIntro: 'Here are the key ideas from this card deck:',
    instagramCta: 'Save this deck and share it with someone who needs it.',
    facebookCta: 'Which idea would you try first? Share it in the comments.',
    threadsCta: 'Which point resonates with you most?',
    fallbackTags: [
      'ContentCreation',
      'SocialMedia',
      'PracticalTips',
      'CarouselPost',
      'LearnTogether',
    ],
  },
} as const;

function normalizeText(text: string): string {
  const seen = new Set<string>();
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => {
      if (!line || PAGE_NUMBER_PATTERN.test(line) || seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .join('\n');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function summarizePage(text: string, maxLength = 140): string {
  const lines = normalizeText(text).split('\n').filter(Boolean);
  return truncate(lines.slice(0, 2).join(' — '), maxLength);
}

function fallbackCta(locale: PublishCopyLocale): string {
  return COPY[locale].facebookCta;
}

export function stripExternalLinks(text: string): string {
  return text
    .replace(EXTERNAL_LINK_GLOBAL_PATTERN, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function hasExternalLink(text: string): boolean {
  return EXTERNAL_LINK_PATTERN.test(text);
}

export function analyzeCardPages(
  pages: CardPageText[],
  locale: PublishCopyLocale,
  fallbackTitle = '',
): CardInsight {
  const normalizedPages = pages
    .map((page) => ({ ...page, text: normalizeText(page.text) }))
    .filter((page) => page.text.length > 0);
  const first = normalizedPages[0] ?? { page: 1, text: normalizeText(fallbackTitle) };
  const hook = { ...first, text: summarizePage(first.text, 160) || fallbackTitle };

  let detectedCta: CardPageText | undefined;
  for (let index = normalizedPages.length - 1; index >= 0; index -= 1) {
    const page = normalizedPages[index];
    if (page && CTA_PATTERNS.test(page.text)) {
      detectedCta = { ...page, text: summarizePage(page.text, 160) };
      break;
    }
  }

  const cta = detectedCta
    ? { ...detectedCta, generated: false }
    : {
        page: normalizedPages.at(-1)?.page ?? first.page,
        text: fallbackCta(locale),
        generated: true,
      };
  const excludedPages = new Set([hook.page, ...(detectedCta ? [detectedCta.page] : [])]);
  const keyPoints = normalizedPages
    .filter((page) => !excludedPages.has(page.page))
    .map((page) => ({ ...page, text: summarizePage(page.text) }))
    .filter((page) => page.text && page.text !== hook.text && page.text !== cta.text)
    .slice(0, 4);

  if (keyPoints.length === 0 && normalizedPages.length > 1) {
    const candidate = normalizedPages[1];
    if (candidate) keyPoints.push({ ...candidate, text: summarizePage(candidate.text) });
  }

  return { hook, keyPoints, cta };
}

function hashtagCandidates(insight: CardInsight, fallbackTitle: string): string[] {
  const sources = [
    fallbackTitle,
    insight.hook.text,
    ...insight.keyPoints.map((point) => point.text),
  ];
  const candidates: string[] = [];
  for (const source of sources) {
    for (const phrase of source.split(/[\n—:：,，。！？!?、|｜•·]/)) {
      const cleaned = phrase
        .replace(/[#＃]/g, '')
        .replace(/[^\p{L}\p{N}_\s]/gu, '')
        .trim()
        .replace(/\s+/g, '');
      if (cleaned.length < 2 || cleaned.length > 18 || candidates.includes(cleaned)) continue;
      candidates.push(cleaned);
    }
  }
  return candidates;
}

export function generatePlatformDrafts(
  insight: CardInsight,
  locale: PublishCopyLocale,
  fallbackTitle = '',
): PlatformDrafts {
  const copy = COPY[locale];
  const points = insight.keyPoints.map((point) => stripExternalLinks(point.text)).filter(Boolean);
  const hook = stripExternalLinks(insight.hook.text);
  const sourceCta = insight.cta.generated ? '' : stripExternalLinks(insight.cta.text);
  const facebookCta = sourceCta || copy.facebookCta;
  const instagramCta = sourceCta || copy.instagramCta;
  const threadsCta = sourceCta || copy.threadsCta;
  const bulletPoints = points.map((point) => `• ${point}`).join('\n');
  const conversationalPoints = points.slice(0, 2).join('\n\n');

  const tags = hashtagCandidates(insight, fallbackTitle);
  for (const fallback of copy.fallbackTags) {
    if (tags.length >= 5) break;
    if (!tags.includes(fallback)) tags.push(fallback);
  }
  const instagramHashtags = tags.slice(0, 5);

  return {
    facebook: [hook, copy.facebookIntro, bulletPoints, facebookCta].filter(Boolean).join('\n\n'),
    instagram: [hook, bulletPoints, instagramCta].filter(Boolean).join('\n\n'),
    instagramHashtags,
    threads: [hook, conversationalPoints, threadsCta].filter(Boolean).join('\n\n'),
    threadsTopicTag: instagramHashtags[0] ?? copy.fallbackTags[0],
  };
}

export function validateInstagramHashtags(tags: string[]): boolean {
  const normalized = tags.map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean);
  return (
    normalized.length === 5 &&
    new Set(normalized.map((tag) => tag.toLocaleLowerCase())).size === 5 &&
    normalized.every((tag) => /^[\p{L}\p{N}_]+$/u.test(tag))
  );
}

export function validateThreadsTopicTag(topicTag: string): boolean {
  const normalized = topicTag.trim();
  return (
    normalized.length > 0 &&
    normalized.length <= 50 &&
    !normalized.startsWith('#') &&
    !/[.&]/.test(normalized) &&
    !hasExternalLink(normalized)
  );
}
